import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay, formatDateTimeForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { buildStockEquipoTraceData, parseStockTraceColumn, parseStockTraceItemId } from "@/lib/stock-equipo-trace";

export const revalidate = 0;
export const metadata = {
  title: "Trazabilidad de Equipos",
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

    .summary {
      margin-top: 3.2mm;
      border: 1px solid #000;
      background: #ececec;
      padding: 2mm;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 2mm;
    }

    .summary-equipo {
      font-size: 11pt;
      font-weight: 700;
    }

    .section-title {
      margin: 4mm 0 0;
      font-size: 10.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #3d3d3d;
    }

    .empty-state {
      margin-top: 2.8mm;
      border: 1px dashed #8a8a8a;
      padding: 8mm 6mm;
      text-align: center;
      font-size: 11pt;
      font-weight: 600;
      color: #404040;
    }

    .trace-list {
      margin-top: 2.4mm;
      display: grid;
      gap: 2.4mm;
    }

    .trace-card {
      border: 1px solid #000;
      background: #f7f7f7;
      padding: 2.2mm 2.4mm;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .trace-card-header {
      display: flex;
      justify-content: space-between;
      align-equipos: flex-start;
      gap: 2mm;
    }

    .trace-persona {
      margin: 0;
      font-size: 11pt;
      font-weight: 700;
    }

    .trace-line {
      margin: 0.5mm 0 0;
      font-size: 9.5pt;
      color: #2d2d2d;
    }

    .trace-total {
      margin: 0;
      text-align: right;
      font-size: 12pt;
      font-weight: 700;
      min-width: 24mm;
    }

    .trace-badge {
      margin-top: 0.8mm;
      text-align: right;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #3f3f3f;
      text-transform: uppercase;
    }

    .movement-list {
      margin-top: 1.6mm;
      border-top: 1px solid #b8b8b8;
      padding-top: 1.4mm;
      display: grid;
      gap: 1mm;
    }

    .movement-line {
      margin: 0;
      font-size: 9.2pt;
    }

    .movement-delta {
      font-weight: 700;
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

export default async function TrazabilidadEquiposPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; equipoId?: string; column?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = params?.autoprint === "1";
  const equipoId = parseStockTraceItemId(params?.equipoId);
  const column = parseStockTraceColumn(params?.column);
  const printedAt = new Date();
  const generatedAt = formatDateTimeForDisplay(printedAt);
  const institutionalPrintDate = formatInstitutionalPrintDate(printedAt);

  if (!equipoId || !column) {
    return (
      <>
        {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
        <style>{buildStyles()}</style>
        <main className="sheet">
          <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
          <h1 className="title">Trazabilidad de Equipos</h1>
          <p className="empty-state">Parámetros inválidos para la impresión. Volvé a abrir desde el detalle de trazabilidad.</p>
        </main>
      </>
    );
  }

  const [traceData, firmas] = await Promise.all([
    buildStockEquipoTraceData(equipoId),
    getFirmaConfig(),
  ]);

  if (!traceData) {
    return (
      <>
        {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
        <style>{buildStyles()}</style>
        <main className="sheet">
          <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
          <h1 className="title">Trazabilidad de Equipos</h1>
          <p className="empty-state">El equipo solicitado no existe o fue eliminado.</p>
        </main>
      </>
    );
  }

  const firmaLineas = buildFirmasInstitucionalesLineas({
    encargadoTexto: TEXTO_ENCARGADO,
    encargadoRango: firmas.encargadoRango,
    encargadoNombre: firmas.encargadoNombre,
    oficialTexto: TEXTO_OFICIAL,
    oficialRango: firmas.oficialRango,
    oficialNombre: firmas.oficialNombre,
  });

  const columnLabel = column === "SUBALTERNOS" ? "Subalternos" : column === "RECINTO" ? "Recintos" : "Préstamos";
  const totalEnColumna =
    column === "SUBALTERNOS"
      ? traceData.totals.subalternos
      : column === "RECINTO"
        ? traceData.totals.recinto
        : traceData.totals.prestamo;

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{buildStyles()}</style>
      <main className="sheet">
        <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
        <h1 className="title">{`Trazabilidad de ${columnLabel}`}</h1>
        <p className="subtitle">{traceData.itemNombre}</p>
        <p className="meta">{`Generado: ${generatedAt} | Columna: ${columnLabel}`}</p>

        <section className="summary">
          <div className="summary-equipo">{`Equipo ID: ${traceData.equipoId}`}</div>
          <div className="summary-equipo">{`Total en columna: ${totalEnColumna}`}</div>
        </section>

        <h2 className="section-title">
          {column === "SUBALTERNOS"
            ? "Personal con tenencia neta del equipo"
            : column === "RECINTO"
              ? "Recintos con asignaciones activas"
              : "Préstamos activos del equipo"}
        </h2>

        {column === "SUBALTERNOS" ? (
          traceData.subalternos.length === 0 ? (
            <p className="empty-state">No hay tenencias activas de subalternos para este equipo.</p>
          ) : (
            <section className="trace-list">
              {traceData.subalternos.map((entry) => (
                <article key={`print-trace-subalterno-${entry.ci}`} className="trace-card">
                  <div className="trace-card-header">
                    <div>
                      <p className="trace-persona">{entry.persona}</p>
                      <p className="trace-line">{`CI ${formatUruguayanCi(entry.ci)}`}</p>
                      <p className="trace-line">{`${entry.tipoPersonal}${entry.bateria ? ` | Batería ${entry.bateria}` : ""}`}</p>
                    </div>
                    <div>
                      <p className="trace-total">{entry.cantidadNeta > 0 ? `+${entry.cantidadNeta}` : entry.cantidadNeta}</p>
                    </div>
                  </div>
                  <div className="movement-list">
                    {entry.movimientos.map((movimiento) => (
                      <p key={`print-trace-subalterno-mov-${entry.ci}-${movimiento.movimientoId}-${movimiento.tipo}`} className="movement-line">
                        <span className="movement-delta">
                          {movimiento.delta > 0 ? `+${movimiento.delta}` : movimiento.delta}
                        </span>{" "}
                        ({movimiento.cantidad}) | {movimiento.tipo} | Mov. #{movimiento.movimientoId} |{" "}
                        {formatDateOnlyForDisplay(movimiento.fecha)}
                        {movimiento.observaciones ? ` | Obs: ${movimiento.observaciones}` : ""}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )
        ) : column === "RECINTO" ? (
          (!traceData.recintos || traceData.recintos.length === 0) ? (
            <p className="empty-state">No hay asignaciones activas a recintos para este equipo.</p>
          ) : (
            <section className="trace-list">
              {(traceData.recintos || []).map((entry) => (
                <article key={`print-trace-recinto-${entry.recintoNombre}`} className="trace-card">
                  <div className="trace-card-header">
                    <div>
                      <p className="trace-persona">{entry.recintoNombre}</p>
                    </div>
                    <div>
                      <p className="trace-total">{entry.cantidadNeta > 0 ? `+${entry.cantidadNeta}` : entry.cantidadNeta}</p>
                    </div>
                  </div>
                  <div className="movement-list">
                    {entry.movimientos.map((movimiento) => (
                      <p key={`print-trace-recinto-mov-${entry.recintoNombre}-${movimiento.movimientoId}`} className="movement-line">
                        <span className="movement-delta">
                          {movimiento.delta > 0 ? `+${movimiento.delta}` : movimiento.delta}
                        </span>{" "}
                        ({movimiento.cantidad}) | Mov. #{movimiento.movimientoId} |{" "}
                        {formatDateOnlyForDisplay(movimiento.fecha)}
                        {movimiento.observaciones ? ` | Obs: ${movimiento.observaciones}` : ""}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          )
        ) : traceData.prestamos.length === 0 ? (
          <p className="empty-state">No hay préstamos activos para este equipo.</p>
        ) : (
          <section className="trace-list">
            {traceData.prestamos.map((entry) => (
              <article key={`print-trace-prestamo-${entry.prestamoId}`} className="trace-card">
                <div className="trace-card-header">
                  <div>
                    <p className="trace-persona">{entry.destinatarioEtiqueta}</p>
                    <p className="trace-line">
                      {entry.destinatarioCi ? `CI ${formatUruguayanCi(entry.destinatarioCi)}` : "CI pendiente"}
                    </p>
                    <p className="trace-line">{`Clase: ${entry.clasePrestamo}`}</p>
                    <p className="trace-line">{`Recibo: ${entry.reciboNumero} | Préstamo #${entry.prestamoId} | Mov. #${entry.movimientoId}`}</p>
                    <p className="trace-line">{`Fecha: ${formatDateOnlyForDisplay(entry.fechaPrestamo)}`}</p>
                    {entry.observaciones ? <p className="trace-line">{`Obs: ${entry.observaciones}`}</p> : null}
                  </div>
                  <div>
                    <p className="trace-total">{`+${entry.cantidad}`}</p>
                    <p className="trace-badge">{entry.estado}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="firma-section">
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="trazabilidad-equipos"
          />
        </section>
      </main>
    </>
  );
}
