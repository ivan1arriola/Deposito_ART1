import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { TipoMovimiento } from "@/generated/prisma/client";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { fetchPrestamoActuanteByMovimientoIds } from "@/lib/prestamo-actuante";
import { prestamoInclude, serializePrestamoWithActuante } from "@/lib/prestamos";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export const metadata = {
  title: "Resumen de Prestamos Vigentes",
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

    .filter {
      margin: 2.5mm 0 0;
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

    col.col-recibo {
      width: 13%;
    }

    col.col-destinatario {
      width: 20%;
    }

    col.col-fechas {
      width: 14%;
    }

    col.col-responsables {
      width: 22%;
    }

    col.col-equipos {
      width: 23%;
    }

    col.col-unidades {
      width: 8%;
    }

    thead {
      display: table-header-group;
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

    .recibo {
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

export default async function ResumenPrestamosVigentesPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; prestamoId?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = params?.autoprint === "1";
  const normalizedPrestamoIdFilter = String(params?.prestamoId ?? "").trim();

  const [prestamosRaw, firmas] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        tipo: TipoMovimiento.PRESTAMO,
        prestamoActivo: { isNot: null },
      },
      include: prestamoInclude,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    }),
    getFirmaConfig(),
  ]);

  const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds(
    prestamosRaw.map((prestamo) => prestamo.movimientoId),
  );

  const prestamos = prestamosRaw
    .map((prestamo) => serializePrestamoWithActuante(prestamo, actuanteByMovimientoId))
    .filter((prestamo) =>
      normalizedPrestamoIdFilter === "" ? true : prestamo.prestamoId.includes(normalizedPrestamoIdFilter),
    );

  const totalUnidades = prestamos.reduce(
    (total, prestamo) => total + prestamo.equipos.reduce((subtotal, equipo) => subtotal + equipo.cantidad, 0),
    0,
  );
  const totalEquiposDistintos = new Set(prestamos.flatMap((prestamo) => prestamo.equipos.map((equipo) => equipo.equipoId))).size;
  const totalTiposPrestados = prestamos.reduce((total, prestamo) => total + prestamo.equipos.length, 0);

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
        <h1 className="title">Resumen de prestamos vigentes</h1>
        <p className="subtitle">Prestamos pendientes de devolucion al momento de la impresion.</p>
        <p className="meta">{`Generado: ${generatedAt}`}</p>
        {normalizedPrestamoIdFilter ? <p className="filter">{`Filtro por ID: ${normalizedPrestamoIdFilter}`}</p> : null}

        <section className="totals">
          <article className="totals-equipo">
            <p className="totals-label">Prestamos vigentes</p>
            <p className="totals-value">{prestamos.length}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Unidades prestadas</p>
            <p className="totals-value">{totalUnidades}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Tipos por prestamos</p>
            <p className="totals-value">{totalTiposPrestados}</p>
          </article>
          <article className="totals-equipo">
            <p className="totals-label">Equipos distintos</p>
            <p className="totals-value">{totalEquiposDistintos}</p>
          </article>
        </section>

        {prestamos.length === 0 ? (
          <section className="empty-state">No hay prestamos vigentes para imprimir.</section>
        ) : (
          <section className="table-wrap">
            <table>
              <colgroup>
                <col className="col-recibo" />
                <col className="col-destinatario" />
                <col className="col-fechas" />
                <col className="col-responsables" />
                <col className="col-equipos" />
                <col className="col-unidades" />
              </colgroup>
              <thead>
                <tr>
                  <th>Recibo</th>
                  <th>Destinatario</th>
                  <th>Fechas</th>
                  <th>Responsables</th>
                  <th>Equipos</th>
                  <th>Unid.</th>
                </tr>
              </thead>
              <tbody>
                {prestamos.map((prestamo) => {
                  const totalUnidadesPrestamo = prestamo.equipos.reduce((total, equipo) => total + equipo.cantidad, 0);
                  return (
                    <tr key={`print-prestamo-vigente-${prestamo.prestamoId}`}>
                      <td>
                        <p className="recibo">{prestamo.reciboNumero}</p>
                        <p className="subline">{`ID ${prestamo.prestamoId}`}</p>
                      </td>
                      <td>
                        <div className="stack">
                          <p>{prestamo.destinatarioEtiqueta}</p>
                          <p className="subline">
                            {prestamo.destinatarioCi ? `CI ${formatUruguayanCi(prestamo.destinatarioCi)}` : "CI pendiente"}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="stack">
                          <p>
                            <span className="label">Prestado:</span> {formatDateOnlyForDisplay(prestamo.fechaPrestamo)}
                          </p>
                          <p>
                            <span className="label">Estimado:</span>{" "}
                            {prestamo.fechaEstimadaDevolucionTexto?.trim()
                              ? prestamo.fechaEstimadaDevolucionTexto
                              : "No definido"}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="stack">
                          <p>
                            <span className="label">Por orden de:</span> {prestamo.actuanteNombre ?? "No registrado"}
                          </p>
                          <p>
                            <span className="label">Registrado por:</span> {prestamo.usuarioEntregaNombre || "No registrado"}
                          </p>
                          <p>
                            <span className="label">Comentario:</span>{" "}
                            {prestamo.comentarios?.trim() ? prestamo.comentarios : "Sin comentario"}
                          </p>
                        </div>
                      </td>
                      <td>
                        <div className="stack equipos-cell">
                          <p>
                            <span className="label">{`${prestamo.equipos.length} tipos:`}</span>
                          </p>
                          {prestamo.equipos.length === 0 ? (
                            <p>Sin equipos</p>
                          ) : (
                            <ul className="equipo-list">
                              {prestamo.equipos.map((equipo) => (
                                <li key={`prestamo-equipo-${prestamo.prestamoId}-${equipo.equipoId}`} className="equipo-line">
                                  {`${equipo.nombre} x${equipo.cantidad} (${equipo.estadoEntrega})`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                      <td className="unidades">{totalUnidadesPrestamo}</td>
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
            keyPrefix="resumen-prestamos-vigentes"
          />
        </section>
      </main>
    </>
  );
}
