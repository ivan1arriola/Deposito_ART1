import type { EtiquetaCajaPrintData } from "@/lib/etiquetado-data";

export type EtiquetaOrientacion = "horizontal" | "vertical";

function buildPrintStyles(orientacion: EtiquetaOrientacion) {
  const pageOrientation = orientacion === "horizontal" ? "landscape" : "portrait";
  const pageWidth = orientacion === "horizontal" ? "297mm" : "210mm";
  const pageHeight = orientacion === "horizontal" ? "210mm" : "297mm";
  const sheetPadding = orientacion === "horizontal" ? "8mm 7mm" : "9mm 7mm";
  const contentColumns = orientacion === "horizontal" ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))";
  const identificadorSize = orientacion === "horizontal" ? "64px" : "52px";
  const metaValueSize = orientacion === "horizontal" ? "48px" : "42px";
  const equipoNameSize = orientacion === "horizontal" ? "24px" : "20px";
  const equipoCantidadSize = orientacion === "horizontal" ? "30px" : "26px";
  const codigoFontSize = orientacion === "horizontal" ? "14px" : "13px";
  const rowGap = orientacion === "horizontal" ? "4mm" : "3.2mm";

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      min-height: 100%;
    }

    body {
      font-family: "Times New Roman", "Liberation Serif", serif;
      color: #111;
      background: #fff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .etiqueta-sheet {
      width: ${pageWidth};
      min-height: ${pageHeight};
      margin: 0 auto;
      padding: ${sheetPadding};
      display: flex;
      align-items: stretch;
      justify-content: center;
      background: #fff;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }

    .etiqueta-sheet + .etiqueta-sheet {
      break-before: page;
      page-break-before: always;
    }

    .etiqueta-frame {
      position: relative;
      width: 100%;
      border: 1.2mm solid #2e2e2e;
      padding: 4mm;
      background: linear-gradient(145deg, #ffffff 0%, #f7f5eb 100%);
      overflow: hidden;
    }

    .etiqueta-frame::before {
      content: "";
      position: absolute;
      inset: 1.6mm;
      border: 0.4mm solid #8d845b;
      pointer-events: none;
    }

    .etiqueta-frame::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 0 0, #8d845b 0 1.2mm, transparent 1.2mm),
        radial-gradient(circle at 100% 0, #8d845b 0 1.2mm, transparent 1.2mm),
        radial-gradient(circle at 0 100%, #8d845b 0 1.2mm, transparent 1.2mm),
        radial-gradient(circle at 100% 100%, #8d845b 0 1.2mm, transparent 1.2mm);
      background-repeat: no-repeat;
      opacity: 0.85;
      pointer-events: none;
    }

    .etiqueta-inner {
      position: relative;
      z-index: 1;
      border: 0.5mm solid #7a7a7a;
      padding: 5.5mm 6mm;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: ${rowGap};
    }

    .etiqueta-header {
      display: grid;
      grid-template-columns: ${orientacion === "horizontal" ? "1.2fr 1fr" : "1fr"};
      gap: 4mm;
      border-bottom: 0.6mm solid #8a8a8a;
      padding-bottom: 4mm;
    }

    .etiqueta-title-block {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2mm;
    }

    .etiqueta-kicker {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .etiqueta-identificador {
      font-size: ${identificadorSize};
      font-weight: 700;
      line-height: 0.95;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      word-break: break-word;
    }

    .etiqueta-meta-grid {
      display: flex;
      border-left: 0.5mm solid #8a8a8a;
      padding-left: 4mm;
      gap: 4mm;
    }

    .etiqueta-sheet--vertical .etiqueta-meta-grid {
      border-left: 0;
      border-top: 0.5mm solid #8a8a8a;
      padding-left: 0;
      padding-top: 3.4mm;
    }

    .etiqueta-meta-box {
      flex: 1;
      border: 0.45mm solid #8a8a8a;
      background: rgb(255 255 255 / 86%);
      padding: 2.4mm 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.2mm;
    }

    .etiqueta-meta-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .etiqueta-meta-value {
      font-size: ${metaValueSize};
      font-weight: 700;
      line-height: 0.94;
      text-transform: uppercase;
    }

    .etiqueta-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: 0.45mm solid #8a8a8a;
    }

    .summary-box {
      border-right: 0.45mm solid #8a8a8a;
      padding: 2.5mm 2.7mm;
      background: rgb(255 255 255 / 86%);
      display: flex;
      flex-direction: column;
      gap: 1mm;
    }

    .summary-box:last-child {
      border-right: 0;
    }

    .summary-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .summary-value {
      font-size: 32px;
      line-height: 0.95;
      font-weight: 700;
    }

    .etiqueta-content {
      display: flex;
      flex-direction: column;
      min-height: 0;
      flex: 1;
      gap: 2.4mm;
    }

    .etiqueta-content-title {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 0.45mm solid #8a8a8a;
      padding-bottom: 2mm;
    }

    .etiqueta-equipos-grid {
      display: grid;
      grid-template-columns: ${contentColumns};
      gap: 2.5mm;
      min-height: 0;
      align-content: start;
      overflow: hidden;
    }

    .equipo-card {
      border: 0.45mm solid #8a8a8a;
      background: #fff;
      padding: 2.2mm;
      display: flex;
      flex-direction: column;
      min-height: 0;
      gap: 2mm;
    }

    .equipo-head {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
      gap: 2.2mm;
      padding-bottom: 2mm;
      border-bottom: 0.35mm solid #b5b5b5;
    }

    .equipo-nombre {
      font-size: ${equipoNameSize};
      font-weight: 700;
      line-height: 0.95;
      text-transform: uppercase;
      word-break: break-word;
    }

    .equipo-cantidad {
      border-left: 0.35mm solid #b5b5b5;
      padding-left: 2.2mm;
      text-align: right;
      min-width: 19mm;
    }

    .equipo-cantidad-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .equipo-cantidad-value {
      font-size: ${equipoCantidadSize};
      font-weight: 700;
      line-height: 0.95;
    }

    .equipo-codigos {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: ${codigoFontSize};
    }

    .equipo-codigos th {
      border-bottom: 0.35mm solid #b5b5b5;
      background: #f0efe7;
      text-align: left;
      padding: 1.3mm 1.4mm;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.06em;
    }

    .equipo-codigos td {
      border-bottom: 0.3mm solid #d3d3d3;
      padding: 1.1mm 1.4mm;
      font-weight: 600;
      line-height: 1.18;
      word-break: break-word;
    }

    .equipo-codigos tr:last-child td {
      border-bottom: 0;
    }

    .etiqueta-sin-equipos {
      grid-column: 1 / -1;
      border: 0.4mm dashed #9b9b9b;
      padding: 6mm;
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #3b3b3b;
    }

    .etiqueta-footer {
      border-top: 0.6mm solid #8a8a8a;
      padding-top: 2.5mm;
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 4mm;
    }

    .etiqueta-footer-block {
      display: flex;
      flex-direction: column;
      gap: 0.8mm;
    }

    .etiqueta-footer-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .etiqueta-footer-value {
      font-size: 31px;
      font-weight: 700;
      line-height: 0.95;
      text-transform: uppercase;
    }

    .etiqueta-empty {
      width: ${pageWidth};
      min-height: ${pageHeight};
      margin: 0 auto;
      padding: 20mm 14mm;
      font-size: 18px;
      font-weight: 600;
    }

    @page {
      size: A4 ${pageOrientation};
      margin: 0;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }

      .etiqueta-sheet {
        margin: 0;
      }
    }
  `;
}

export function EtiquetasCajaPrintStyles({ orientacion }: { orientacion: EtiquetaOrientacion }) {
  return <style>{buildPrintStyles(orientacion)}</style>;
}

function normalizeTalla(value: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "-";
}

function buildCodigoRows(equipo: EtiquetaCajaPrintData["equipos"][number]) {
  const rows = equipo.codigosSIE.map((codigo) => ({
    codigo: codigo.codigo,
    talla: normalizeTalla(codigo.talla),
  }));

  const expectedRows = Math.max(rows.length, equipo.cantidad);
  while (rows.length < expectedRows) {
    rows.push({ codigo: "S/Codigo", talla: "-" });
  }

  if (rows.length === 0) {
    rows.push({ codigo: "-", talla: "-" });
  }

  return rows;
}

export function EtiquetasCajaPrintEmptyState({ message }: { message: string }) {
  return <main className="etiqueta-empty">{message}</main>;
}

export function EtiquetaCajaPrintSheet({
  caja,
  orientacion,
}: {
  caja: EtiquetaCajaPrintData;
  orientacion: EtiquetaOrientacion;
}) {
  const totalEquipos = caja.equipos.length;
  const totalUnidades = caja.equipos.reduce((acumulado, equipo) => acumulado + equipo.cantidad, 0);
  const totalCodigosRegistrados = caja.equipos.reduce((acumulado, equipo) => acumulado + equipo.codigosSIE.length, 0);

  return (
    <section className={`etiqueta-sheet etiqueta-sheet--${orientacion}`}>
      <article className="etiqueta-frame">
        <div className="etiqueta-inner">
          <header className="etiqueta-header">
            <div className="etiqueta-title-block">
              <p className="etiqueta-kicker">Etiqueta de caja</p>
              <p className="etiqueta-identificador">Caja N.º {caja.codigoDepositoGeneral}</p>
            </div>
            <div className="etiqueta-meta-grid">
              <div className="etiqueta-meta-box">
                <p className="etiqueta-meta-label">Dep. Gral.</p>
                <p className="etiqueta-meta-value">{caja.codigoDepositoGeneral}</p>
              </div>
              <div className="etiqueta-meta-box">
                <p className="etiqueta-meta-label">Estante</p>
                <p className="etiqueta-meta-value">{caja.estanteria}</p>
              </div>
            </div>
          </header>

          <section className="etiqueta-summary">
            <div className="summary-box">
              <p className="summary-label">Equipos distintos</p>
              <p className="summary-value">{totalEquipos}</p>
            </div>
            <div className="summary-box">
              <p className="summary-label">Unidades totales</p>
              <p className="summary-value">{totalUnidades}</p>
            </div>
            <div className="summary-box">
              <p className="summary-label">Codigos registrados</p>
              <p className="summary-value">{totalCodigosRegistrados}</p>
            </div>
          </section>

          <section className="etiqueta-content">
            <p className="etiqueta-content-title">Contenido de la caja</p>
            <div className="etiqueta-equipos-grid">
              {caja.equipos.length === 0 ? <p className="etiqueta-sin-equipos">Sin equipos registrados.</p> : null}
              {caja.equipos.map((equipo, index) => {
                const codigoRows = buildCodigoRows(equipo);
                return (
                  <article key={`${caja.codigoDepositoGeneral}-${equipo.itemId}-${index}`} className="equipo-card">
                    <div className="equipo-head">
                      <p className="equipo-nombre">{equipo.itemNombre}</p>
                      <div className="equipo-cantidad">
                        <p className="equipo-cantidad-label">Cantidad</p>
                        <p className="equipo-cantidad-value">{equipo.cantidad}</p>
                      </div>
                    </div>

                    <table className="equipo-codigos">
                      <thead>
                        <tr>
                          <th style={{ width: "68%" }}>Codigo</th>
                          <th style={{ width: "32%" }}>Talle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codigoRows.map((row, rowIndex) => (
                          <tr key={`${equipo.itemId}-${row.codigo}-${row.talla}-${rowIndex}`}>
                            <td>{row.codigo}</td>
                            <td>{row.talla}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                );
              })}
            </div>
          </section>

          <footer className="etiqueta-footer">
            <div className="etiqueta-footer-block">
              <p className="etiqueta-footer-label">Ubicacion corta</p>
              <p className="etiqueta-footer-value">E{caja.estanteria}</p>
            </div>
            <div className="etiqueta-footer-block" style={{ textAlign: "right" }}>
              <p className="etiqueta-footer-label">Destino</p>
              <p className="etiqueta-footer-value">Deposito General</p>
            </div>
          </footer>
        </div>
      </article>
    </section>
  );
}
