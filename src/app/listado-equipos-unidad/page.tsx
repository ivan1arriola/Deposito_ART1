import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { compareEquiposByTipoAndName, compareEquiposByTipoAndOrder, groupEquiposByTipo } from "@/lib/equipo-sort";
import { serializeEquipoTipoData, tipoEquipoRelationSelect } from "@/lib/equipo-tipos-data";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { prisma } from "@/lib/prisma";
import { buildStockSummaryMaps } from "@/lib/stock";

export const revalidate = 0;
export const metadata = {
  title: "Listado de Equipos de la Unidad",
};

type ItemResumen = {
  itemId: string;
  nombre: string;
  tipo: string;
  tipoEquipoId: number | null;
  tipoLabel: string;
  tipoOrden: number;
  ordenPdf: number;
  stockSubalternos: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
  existenciaSie: number;
};

function buildStyles() {
  return `
    ${INSTITUTIONAL_PRINT_HEADER_STYLES}

    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #e7e7e7;
      color: #000;
      font-family: "Times New Roman", serif;
    }

    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 8mm;
      background: #f4f4f4;
    }

    .title {
      margin: 0;
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .subtitle {
      margin: 1.6mm 0 0;
      font-size: 10pt;
      color: #2f2f2f;
      font-weight: 600;
    }

    .meta {
      margin: 2mm 0 0;
      font-size: 9pt;
    }

    .totals {
      margin: 3.2mm 0 0;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2mm;
    }

    .totals-item {
      border: 1px solid #000;
      background: #ececec;
      padding: 1.8mm 2mm;
      font-size: 9pt;
    }

    .totals-label {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 8pt;
    }

    .totals-value {
      margin-top: 0.8mm;
      font-size: 12pt;
      font-weight: 700;
    }

    .table-wrap {
      margin-top: 3.6mm;
      border: 1px solid #000;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    col.col-equipo { width: 46%; }
    col.col-numeric { width: 10.8%; }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #000;
      padding: 1.8mm 1.2mm;
      vertical-align: middle;
    }

    thead th {
      background: #e7e7e7;
      font-size: 9pt;
      font-weight: 700;
      text-align: left;
    }

    tbody td {
      font-size: 9pt;
    }

    .numeric {
      text-align: right;
      font-weight: 700;
    }

    .empty-state {
      margin-top: 6mm;
      border: 1px dashed #8a8a8a;
      padding: 10mm 8mm;
      text-align: center;
      font-size: 12pt;
      font-weight: 600;
      color: #404040;
    }

    .firma-section {
      margin-top: 10mm;
      --firma-tab-size: 8mm;
      display: grid;
      gap: 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .firma-line {
      font-size: 8pt;
      line-height: 1.5;
      margin: 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .firma-strong {
      font-weight: 700;
    }

    @media screen {
      body {
        padding: 12px;
      }

      .sheet {
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      }
    }

    @media print {
      html, body {
        background: #f4f4f4;
      }

      .sheet {
        max-width: none;
        box-shadow: none;
        padding: 0;
      }
    }
  `;
}

export default async function ListadoEquiposUnidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; sort?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const isAlphaSort = resolvedSearchParams?.sort === "alpha";

  const [items, stockSummaryMaps, firmas] = await Promise.all([
    prisma.item.findMany({
      select: {
        itemId: true,
        nombre: true,
        tipoEquipoId: true,
        tipoEquipo: {
          select: tipoEquipoRelationSelect,
        },
        ordenPdf: true,
        existenciaSie: true,
      },
    }),
    buildStockSummaryMaps(prisma),
    getFirmaConfig(),
  ]);

  const resumen: ItemResumen[] = items.map((item) => {
    const itemKey = item.itemId.toString();
    const stockUnidad = stockSummaryMaps.unidadByItem.get(itemKey) ?? 0;
    const stockSubalternos = stockSummaryMaps.personalByItem.get(itemKey) ?? 0;
    const stockAsignacion = stockSummaryMaps.asignacionByItem.get(itemKey) ?? 0;
    const stockPrestamo = stockSummaryMaps.prestamoByItem.get(itemKey) ?? 0;
    const stockDeposito = stockUnidad - stockSubalternos - stockAsignacion - stockPrestamo;
    const tipo = serializeEquipoTipoData(item);

    return {
      itemId: itemKey,
      nombre: item.nombre,
      ...tipo,
      ordenPdf: item.ordenPdf,
      stockSubalternos,
      stockPrestamo,
      stockDeposito,
      stockUnidad,
      existenciaSie: item.existenciaSie,
    };
  });
  const resumenOrdenado = [...resumen].sort(isAlphaSort ? compareEquiposByTipoAndName : compareEquiposByTipoAndOrder);
  const resumenPorTipo = groupEquiposByTipo(resumenOrdenado).map((section) => ({
    ...section,
    title: isAlphaSort ? `Equipos ${section.label} (A-Z)` : `Equipos ${section.label}`,
  }));

  const totalSubalternos = resumen.reduce((total, item) => total + item.stockSubalternos, 0);
  const totalPrestamo = resumen.reduce((total, item) => total + item.stockPrestamo, 0);
  const totalDeposito = resumen.reduce((total, item) => total + item.stockDeposito, 0);
  const totalUnidad = resumen.reduce((total, item) => total + item.stockUnidad, 0);

  const printedAt = new Date();
  const generatedAt = formatDateTimeForDisplay(printedAt);
  const institutionalPrintDate = formatInstitutionalPrintDate(printedAt);
  const firmaLineas = buildFirmasInstitucionalesLineas({
    encargadoTexto: TEXTO_ENCARGADO,
    encargadoRango: firmas.encargadoRango,
    encargadoNombre: firmas.encargadoNombre,
    oficialTexto: TEXTO_OFICIAL,
    oficialRango: firmas.oficialRango,
    oficialNombre: firmas.oficialNombre,
  });

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{buildStyles()}</style>
      <main className="sheet">
        <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
        <h1 className="title">Listado de Equipos de la Unidad</h1>
        <p className="subtitle">{`Totales por item (subalternos + prestamo + deposito) ${isAlphaSort ? "· Categorías separadas en orden alfabético" : "· Categorías separadas respetando el orden asignado"}`}</p>
        <p className="meta">{`Generado: ${generatedAt} | Equipos listados: ${resumen.length}`}</p>

        <section className="totals">
          <article className="totals-item">
            <p className="totals-label">Total subalternos</p>
            <p className="totals-value">{totalSubalternos}</p>
          </article>
          <article className="totals-item">
            <p className="totals-label">Total prestamo</p>
            <p className="totals-value">{totalPrestamo}</p>
          </article>
          <article className="totals-item">
            <p className="totals-label">Total deposito</p>
            <p className="totals-value">{totalDeposito}</p>
          </article>
          <article className="totals-item">
            <p className="totals-label">Total unidad</p>
            <p className="totals-value">{totalUnidad}</p>
          </article>
        </section>

        {resumenOrdenado.length === 0 ? (
          <section className="empty-state">No hay equipos registrados para imprimir.</section>
        ) : (
          <section className="space-y-4">
            {resumenPorTipo.map((section) => (
              <section key={section.key}>
                <p className="subtitle">{`${section.title} · ${section.items.length} equipos`}</p>
                {section.items.length === 0 ? (
                  <section className="empty-state">{`No hay equipos de la categoría ${section.label} registrados.`}</section>
                ) : (
                  <section className="table-wrap">
                    <table>
                      <colgroup>
                        <col className="col-equipo" />
                        <col className="col-numeric" />
                        <col className="col-numeric" />
                        <col className="col-numeric" />
                        <col className="col-numeric" />
                        <col className="col-numeric" />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Equipo</th>
                          <th className="numeric">Subalternos</th>
                          <th className="numeric">Prestamo</th>
                          <th className="numeric">Deposito</th>
                          <th className="numeric">Unidad</th>
                          <th className="numeric">Existencia SIE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.items.map((item) => (
                          <tr key={`item-print-${section.key}-${item.itemId}`}>
                            <td>{item.nombre}</td>
                            <td className="numeric">{item.stockSubalternos}</td>
                            <td className="numeric">{item.stockPrestamo}</td>
                            <td className="numeric">{item.stockDeposito}</td>
                            <td className="numeric">{item.stockUnidad}</td>
                            <td className="numeric">{item.existenciaSie}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
              </section>
            ))}
          </section>
        )}

        <section className="firma-section">
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="listado-equipos-unidad"
          />
        </section>
      </main>
    </>
  );
}
