import type { EtiquetaCajaPrintData } from "@/lib/etiquetado-data";

export type EtiquetaOrientacion = "horizontal" | "vertical";

function buildPrintStyles(orientacion: EtiquetaOrientacion) {
  const pageOrientation = orientacion === "horizontal" ? "landscape" : "portrait";
  const pageWidth = orientacion === "horizontal" ? "297mm" : "210mm";
  const pageHeight = orientacion === "horizontal" ? "210mm" : "297mm";
  const outerPadding = orientacion === "horizontal" ? "12mm 10mm" : "14mm 10mm";
  const itemFontSize = orientacion === "horizontal" ? "62px" : "58px";

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
      padding: ${outerPadding};
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
      width: 100%;
      border: 1.8mm double #494949;
      padding: 4.5mm;
    }

    .etiqueta-inner {
      border: 0.8mm solid #666;
      padding: 6mm 7mm 7mm;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 5mm;
    }

    .etiqueta-top {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      border-bottom: 0.7mm solid #8a8a8a;
      padding-bottom: 4mm;
      min-height: ${orientacion === "horizontal" ? "74mm" : "88mm"};
    }

    .etiqueta-top-left {
      border-right: 0.7mm solid #8a8a8a;
      padding-right: 4mm;
      display: flex;
      flex-direction: column;
      gap: 2.5mm;
    }

    .etiqueta-top-right {
      padding-left: 3mm;
      display: flex;
      flex-direction: column;
      gap: 2.5mm;
      justify-content: center;
    }

    .heading {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .codigo-lines {
      display: flex;
      flex-direction: column;
      gap: 1.8mm;
      font-size: 42px;
      line-height: 1.05;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .codigo-line {
      white-space: nowrap;
    }

    .item-value {
      font-size: ${itemFontSize};
      line-height: 0.98;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      word-break: break-word;
    }

    .detail-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: center;
      border-bottom: 0.6mm solid #b0b0b0;
      padding-bottom: 2.8mm;
      min-height: 16mm;
    }

    .detail-row:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .detail-left {
      border-right: 0.6mm solid #b0b0b0;
      padding-right: 4mm;
      font-size: 19px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .detail-right {
      padding-left: 4mm;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      word-break: break-word;
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

function formatCodigoLine(codigo: { codigo: string; talla: string | null }) {
  if (!codigo.talla || codigo.talla.trim() === "") return codigo.codigo;
  return `${codigo.codigo} ${codigo.talla}`;
}

export function EtiquetasCajaPrintEmptyState({ message }: { message: string }) {
  return <main className="etiqueta-empty">{message}</main>;
}

export function EtiquetaCajaPrintSheet({
  caja,
}: {
  caja: EtiquetaCajaPrintData;
}) {
  const codigos = caja.codigosSIE.length > 0 ? caja.codigosSIE : [{ codigo: "-", talla: null }];
  const talles = caja.tallas.length > 0 ? caja.tallas.join(", ") : "-";
  const equipos = caja.itemNombres.length > 0 ? caja.itemNombres.join(", ") : "-";
  const equiposLabel = caja.itemNombres.length === 1 ? "EQUIPO:" : "EQUIPOS:";

  return (
    <section className="etiqueta-sheet">
      <article className="etiqueta-frame">
        <div className="etiqueta-inner">
          <div className="etiqueta-top">
            <div className="etiqueta-top-left">
              <p className="heading">COD. S.I.E:</p>
              <div className="codigo-lines">
                {codigos.map((codigo) => (
                  <p key={`${caja.codigoDepositoGeneral}-${codigo.codigo}-${codigo.talla ?? "-"}`} className="codigo-line">
                    {formatCodigoLine(codigo)}
                  </p>
                ))}
              </div>
            </div>
            <div className="etiqueta-top-right">
              <p className="heading">{equiposLabel}</p>
              <p className="item-value">{equipos}</p>
            </div>
          </div>

          <div className="detail-row">
            <p className="detail-left">TALLES:</p>
            <p className="detail-right">{talles}</p>
          </div>

          <div className="detail-row">
            <p className="detail-left">CANTIDAD:</p>
            <p className="detail-right">{caja.cantidad}</p>
          </div>

          <div className="detail-row">
            <p className="detail-left">DEP. GRAL:</p>
            <p className="detail-right">{caja.codigoDepositoGeneral}</p>
          </div>

          <div className="detail-row">
            <p className="detail-left">ESTANTERIA:</p>
            <p className="detail-right">{caja.estanteria}</p>
          </div>
        </div>
      </article>
    </section>
  );
}
