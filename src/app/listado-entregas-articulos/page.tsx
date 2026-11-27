import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { filterArticuloEntregasHistorial } from "@/lib/articulo-entregas-history";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { listArticuloEntregasHistorial } from "@/lib/server/articulo-entregas-history-data";

export const revalidate = 0;

export const metadata = {
  title: "Listado de Entregas de Articulos",
};

function formatGeneratedAt(date = new Date()) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

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

    html,
    body {
      margin: 0;
      padding: 0;
      background: #e7e7e7;
      color: #000;
      font-family: "Times New Roman", serif;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
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
      font-size: 17pt;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .subtitle {
      margin: 1.8mm 0 0;
      font-size: 10pt;
      color: #2f2f2f;
      font-weight: 600;
    }

    .meta {
      margin: 2mm 0 0;
      font-size: 9pt;
      color: #242424;
    }

    .filters {
      margin: 2.5mm 0 0;
      display: flex;
      flex-wrap: wrap;
      gap: 1.5mm;
    }

    .filter {
      display: inline-block;
      border: 1px solid #4a4a4a;
      border-radius: 999px;
      padding: 1mm 2.4mm;
      font-size: 8.5pt;
      font-weight: 700;
      background: #ececec;
    }

    .totals {
      margin: 3.4mm 0 0;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 2mm;
    }

    .totals-equipo {
      border: 1px solid #000;
      background: #ececec;
      padding: 1.8mm 2mm;
      min-height: 16mm;
    }

    .totals-label {
      margin: 0;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .totals-value {
      margin: 1.1mm 0 0;
      font-size: 13pt;
      font-weight: 700;
    }

    .table-wrap {
      margin-top: 4mm;
      border: 1px solid #000;
      background: #f4f4f4;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    col.col-entrega {
      width: 12%;
    }

    col.col-destinatario {
      width: 19%;
    }

    col.col-responsables {
      width: 21%;
    }

    col.col-articulos {
      width: 27%;
    }

    col.col-observaciones {
      width: 13%;
    }

    col.col-unidades {
      width: 8%;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #000;
      padding: 1.5mm 1.3mm;
      text-align: left;
      vertical-align: top;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    th {
      background: #e9e9e9;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 700;
    }

    td {
      font-size: 8.7pt;
      line-height: 1.25;
    }

    .entrega-id {
      font-size: 10pt;
      font-weight: 700;
      line-height: 1.15;
    }

    .subline {
      margin-top: 0.8mm;
      font-size: 8pt;
      color: #2f2f2f;
    }

    .stack {
      display: grid;
      gap: 0.8mm;
    }

    .label {
      font-weight: 700;
    }

    .unidades {
      text-align: center;
      font-size: 11pt;
      font-weight: 700;
      vertical-align: top;
      padding-top: 2mm;
    }

    .equipos-cell {
      gap: 0.7mm;
    }

    .equipo-list {
      margin: 0;
      padding-left: 3.7mm;
      display: grid;
      gap: 0.5mm;
    }

    .equipo-line {
      margin: 0;
    }

    .comment-cell {
      font-style: italic;
    }

    .empty-state {
      margin-top: 6mm;
      border: 1px dashed #8a8a8a;
      padding: 11mm 8mm;
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
      html,
      body {
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

export default async function ListadoEntregasArticulosPage({
  searchParams,
}: {
  searchParams?: Promise<{
    autoprint?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = params?.autoprint === "1";
  const normalizedSearchTerm = String(params?.search ?? "").trim();
  const normalizedStartDate = String(params?.startDate ?? "").trim();
  const normalizedEndDate = String(params?.endDate ?? "").trim();

  const [entregasRaw, firmas] = await Promise.all([
    listArticuloEntregasHistorial(),
    getFirmaConfig(),
  ]);
  const entregas = filterArticuloEntregasHistorial(entregasRaw, {
    searchTerm: normalizedSearchTerm,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
  });

  const totalUnidades = entregas.reduce(
    (total, entrega) =>
      total + entrega.equipos.reduce((subtotal, equipo) => subtotal + equipo.cantidad, 0),
    0
  );
  const totalPersonas = new Set(entregas.map((entrega) => entrega.personalCi)).size;
  const totalArticulosDistintos = new Set(
    entregas.flatMap((entrega) => entrega.equipos.map((equipo) => equipo.articuloId))
  ).size;

  const now = new Date();
  const generatedAt = formatGeneratedAt(now);
  const institutionalPrintDate = formatInstitutionalPrintDate(now);
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
        <h1 className="title">Listado de entregas de artículos</h1>
        <p className="subtitle">
          Historial imprimible de entregas de artículos registradas en el sistema.
        </p>
        <p className="meta">{`Generado: ${generatedAt}`}</p>

        {normalizedSearchTerm || normalizedStartDate || normalizedEndDate ? (
          <section className="filters">
            {normalizedSearchTerm ? (
              <p className="filter">{`Texto: ${normalizedSearchTerm}`}</p>
            ) : null}
            {normalizedStartDate ? (
              <p className="filter">{`Desde: ${formatDateOnlyForDisplay(normalizedStartDate)}`}</p>
            ) : null}
            {normalizedEndDate ? (
              <p className="filter">{`Hasta: ${formatDateOnlyForDisplay(normalizedEndDate)}`}</p>
            ) : null}
          </section>
        ) : null}

        <section className="totals">
          <article className="totals-equipo">
            <p className="totals-label">Entregas</p>
            <p className="totals-value">{entregas.length}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Unidades entregadas</p>
            <p className="totals-value">{totalUnidades}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Personal beneficiario</p>
            <p className="totals-value">{totalPersonas}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Artículos distintos</p>
            <p className="totals-value">{totalArticulosDistintos}</p>
          </article>
        </section>

        {entregas.length === 0 ? (
          <section className="empty-state">
            {normalizedSearchTerm || normalizedStartDate || normalizedEndDate
              ? "No hay entregas que coincidan con los filtros seleccionados."
              : "No hay entregas registradas para imprimir."}
          </section>
        ) : (
          <section className="table-wrap">
            <table>
              <colgroup>
                <col className="col-entrega" />
                <col className="col-destinatario" />
                <col className="col-responsables" />
                <col className="col-articulos" />
                <col className="col-observaciones" />
                <col className="col-unidades" />
              </colgroup>
              <thead>
                <tr>
                  <th>Entrega</th>
                  <th>Destinatario</th>
                  <th>Responsables</th>
                  <th>Artículos</th>
                  <th>Observ.</th>
                  <th>Unid.</th>
                </tr>
              </thead>
              <tbody>
                {entregas.map((entrega) => {
                  const totalUnidadesEntrega = entrega.equipos.reduce(
                    (total, equipo) => total + equipo.cantidad,
                    0
                  );
                  return (
                    <tr key={`print-entrega-articulos-${entrega.articuloEntregaPersonalId}`}>
                      <td>
                        <p className="entrega-id">{`#${entrega.articuloEntregaPersonalId}`}</p>
                        <p className="subline">{formatDateOnlyForDisplay(entrega.fecha)}</p>
                      </td>
                      <td>
                        <div className="stack">
                          <p>{entrega.personalLabel}</p>
                          <p className="subline">{`CI ${formatUruguayanCi(entrega.personalCi)}`}</p>
                        </div>
                      </td>
                      <td>
                        <div className="stack">
                          <p>
                            <span className="label">Ordenado por:</span> {entrega.ordenanteLabel}
                          </p>
                          <p>
                            <span className="label">Registrado por:</span>{" "}
                            {entrega.usuarioEntregaLabel}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="stack equipos-cell">
                          <p>
                            <span className="label">{`${entrega.equipos.length} tipos:`}</span>
                          </p>
                          <ul className="equipo-list">
                            {entrega.equipos.map((equipo) => (
                              <li
                                key={`listado-entrega-articulo-${entrega.articuloEntregaPersonalId}-${equipo.articuloId}`}
                                className="equipo-line"
                              >
                                {`${equipo.nombre} x${equipo.cantidad} (${equipo.tipo})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </td>
                      <td className="comment-cell">
                        {entrega.comentario?.trim() ? entrega.comentario : "Sin comentario"}
                      </td>
                      <td className="unidades">{totalUnidadesEntrega}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        <section className="firma-section">
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="listado-entregas-articulos"
          />
        </section>
      </main>
    </>
  );
}
