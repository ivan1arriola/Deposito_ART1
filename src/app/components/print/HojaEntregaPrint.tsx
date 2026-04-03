import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { buildFirmasHojaEntregaLineas } from "@/lib/firma-lineas";
import {
  formatHojaEntregaDisplayDate,
  getHojaEntregaDatePart,
  type HojaEntregaSheetData,
} from "@/lib/hoja-entrega-data";

export const HOJA_ENTREGA_PRINT_STYLES = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    width: 100%;
    height: 100%;
  }

  body {
    font-family: "Courier New", "Liberation Mono", monospace;
    font-size: 9px;
    line-height: 1.1;
    color: #000;
    background: white;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .page {
    --table-font-size: 7.5px;
    --table-line-height: 1.2;
    --table-padding-y: 2px;
    --table-padding-x: 3px;
    --header-row-font-size: 9px;
    --section-title-font-size: 8px;
    --item-name-font-size: 7px;
    --obs-title-font-size: 8px;
    --obs-item-font-size: 8px;
    --obs-item-line-height: 1.2;
    --obs-item-gap: 2px;
    --info-grid-font-size: 11.5px;
    --info-grid-padding-y: 4px;
    --info-grid-padding-x: 10px;
    --info-grid-compact-padding-y: 1px;
    --info-grid-compact-padding-x: 6px;
    --firma-tab-size: 8mm;
    --firma-font-size: 8px;
    --firma-line-height: 1.5;
    width: 210mm;
    height: 297mm;
    min-height: 297mm;
    padding: 3.5mm 6mm 7mm 6mm;
    background: white;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 2mm;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }

  .page.page-compact {
    --table-font-size: 7px;
    --table-line-height: 1.1;
    --table-padding-y: 1.5px;
    --table-padding-x: 2.5px;
    --header-row-font-size: 8px;
    --section-title-font-size: 7.3px;
    --item-name-font-size: 6.4px;
    --obs-title-font-size: 7.3px;
    --obs-item-font-size: 7.1px;
    --obs-item-line-height: 1.1;
    --obs-item-gap: 1px;
    --info-grid-font-size: 10.8px;
    --info-grid-padding-y: 3px;
    --info-grid-padding-x: 7px;
    --info-grid-compact-padding-y: 1px;
    --info-grid-compact-padding-x: 5px;
    --firma-tab-size: 7mm;
    --firma-font-size: 7.4px;
    --firma-line-height: 1.5;
  }

  .page.page-dense {
    --table-font-size: 6.4px;
    --table-line-height: 1.05;
    --table-padding-y: 1px;
    --table-padding-x: 2px;
    --header-row-font-size: 7.2px;
    --section-title-font-size: 6.8px;
    --item-name-font-size: 5.9px;
    --obs-title-font-size: 6.8px;
    --obs-item-font-size: 6.4px;
    --obs-item-line-height: 1.05;
    --obs-item-gap: 0;
    --info-grid-font-size: 9.9px;
    --info-grid-padding-y: 2px;
    --info-grid-padding-x: 5px;
    --info-grid-compact-padding-y: 0.8px;
    --info-grid-compact-padding-x: 4px;
    --firma-tab-size: 6mm;
    --firma-font-size: 6.8px;
    --firma-line-height: 1.5;
  }

  .page.page-ultra {
    --table-font-size: 6px;
    --table-line-height: 1;
    --table-padding-y: 0.8px;
    --table-padding-x: 1.5px;
    --header-row-font-size: 6.8px;
    --section-title-font-size: 6.2px;
    --item-name-font-size: 5.5px;
    --obs-title-font-size: 6.2px;
    --obs-item-font-size: 5.9px;
    --obs-item-line-height: 1;
    --obs-item-gap: 0;
    --info-grid-font-size: 9.1px;
    --info-grid-padding-y: 1px;
    --info-grid-padding-x: 4px;
    --info-grid-compact-padding-y: 0.6px;
    --info-grid-compact-padding-x: 3px;
    --firma-tab-size: 5mm;
    --firma-font-size: 6.3px;
    --firma-line-height: 1.5;
  }

  .page + .page {
    margin-top: 6mm;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #000;
    margin: 0;
    flex: 1 1 auto;
    background: white;
    table-layout: fixed;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }

  th, td {
    border: 0.8px solid #000;
    padding: var(--table-padding-y) var(--table-padding-x);
    text-align: center;
    vertical-align: middle;
    font-size: var(--table-font-size);
    line-height: var(--table-line-height);
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
  }

  th {
    font-weight: bold;
    background: #e8e8e8;
  }

  td[colspan="15"] {
    padding: 4px 6px;
  }

  td[colspan="15"].center.bold {
    background: #f8f8f8;
    font-size: var(--header-row-font-size);
    padding: 5px 6px;
    font-weight: bold;
  }

  td[colspan="15"].left.bold {
    background: #fafafa;
    padding: 4px 8px;
    border-top: 2px solid #000;
    border-bottom: 1px solid #666;
  }

  tr:has(.bold) td {
    padding: 3px 4px;
  }

  tr:has(td[rowspan]) {
    border-top: 2px solid #000;
  }

  .bold[rowspan],
  .bold[colspan="6"] {
    background: #d4d4d4;
    font-weight: bold;
    padding: 4px 3px;
    font-size: var(--section-title-font-size);
  }

  .date-label {
    background: #e3e3e3;
    font-weight: bold;
    text-align: center;
    font-size: var(--section-title-font-size);
    padding: 2px;
  }

  .date-row td {
    background: #e3e3e3;
  }

  .center {
    text-align: center;
  }

  .left {
    text-align: left;
  }

  .header-info-label {
    font-weight: bold;
    white-space: nowrap;
  }

  .info-grid-shell {
    padding: 0 !important;
    background: #fff;
  }

  .info-grid-shell-top {
    border-top: 2px solid #000;
  }

  .info-grid-shell-bottom {
    border-bottom: 1px solid #666;
  }

  .info-grid {
    display: grid;
    width: 100%;
  }

  .info-grid-3 {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.05fr) minmax(0, 1.05fr);
  }

  .info-grid-4 {
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.15fr);
  }

  .info-grid-5 {
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 0.95fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.25fr);
  }

  .info-grid-item {
    min-width: 0;
    padding: var(--info-grid-padding-y) var(--info-grid-padding-x);
    text-align: left;
    background: #fff;
    border-right: 0.8px solid #000;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px;
    font-size: var(--info-grid-font-size);
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
    line-height: 1.1;
    overflow-wrap: break-word;
  }

  .info-grid-item-compact {
    padding: var(--info-grid-compact-padding-y) var(--info-grid-compact-padding-x);
  }

  .info-grid-item:last-child {
    border-right: none;
  }

  .bold {
    font-weight: bold;
  }

  .item-row td {
    background: #fff;
  }

  .item-row td:first-child {
    background: #fff;
    text-align: left;
    padding-left: 6px;
    font-weight: 500;
    font-size: var(--item-name-font-size);
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.15;
  }

  .item-row td.bold {
    background: #dcdcdc;
  }

  td.bold {
    background: #f0f0f0;
    font-weight: bold;
  }

  td.bold[style*="font-size: 7px"] {
    background: #e8e8e8;
    font-weight: bold;
  }

  .obs-title {
    font-weight: bold;
    font-size: var(--obs-title-font-size);
    margin-bottom: 3px;
  }

  .obs-cell {
    padding: 4px !important;
  }

  .page.page-compact .obs-cell {
    padding: 3px 4px !important;
  }

  .page.page-dense .obs-cell {
    padding: 2px 3px !important;
  }

  .page.page-ultra .obs-cell {
    padding: 1px 2px !important;
  }

  .obs-item {
    font-size: var(--obs-item-font-size);
    line-height: var(--obs-item-line-height);
    margin-bottom: var(--obs-item-gap);
  }

  .firma-section {
    display: flex;
    flex-direction: column;
    margin-top: auto;
    padding: 0 1mm 1.5mm 1mm;
    gap: 0;
    page-break-inside: avoid;
    break-inside: avoid-page;
  }

  .firma-line {
    font-size: var(--firma-font-size);
    font-family: "Courier New", monospace;
    line-height: var(--firma-line-height);
    page-break-inside: avoid;
    break-inside: avoid-page;
    margin: 0;
  }

  .firma-strong {
    font-weight: bold;
  }

  .hoja-entrega-empty {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 18mm 10mm;
    background: #fff;
    font-size: 11px;
  }

  @media print {
    @page {
      size: A4;
      margin: 0;
    }

    body {
      margin: 0;
      padding: 0;
    }

    .page {
      margin: 0;
      height: 297mm;
      min-height: 297mm;
      padding: 3.5mm 6mm 7mm 6mm;
      page-break-after: avoid;
    }

    .page + .page {
      margin-top: 0;
      break-before: page;
      page-break-before: always;
    }
  }
`;

export function HojaEntregaPrintStyles() {
  return <style>{HOJA_ENTREGA_PRINT_STYLES}</style>;
}

export function HojaEntregaPrintEmptyState({ message }: { message: string }) {
  return <main className="hoja-entrega-empty">{message}</main>;
}

function getHojaCompactClass(data: HojaEntregaSheetData) {
  if (data.observaciones.length === 0) {
    return "";
  }

  const longestObsChars = data.observaciones.reduce((maxChars, observacion) => {
    return Math.max(maxChars, observacion.texto.length);
  }, 0);

  const totalObsChars = data.observaciones.reduce((totalChars, observacion) => {
    return totalChars + observacion.texto.length;
  }, 0);

  const estimatedObsLines = data.observaciones.reduce((totalLines, observacion) => {
    const datePrefixChars = 14;
    return totalLines + Math.ceil((observacion.texto.length + datePrefixChars) / 105);
  }, 0);

  if (estimatedObsLines >= 14 || totalObsChars >= 2800 || longestObsChars >= 620) {
    return "page-ultra";
  }

  if (estimatedObsLines >= 10 || totalObsChars >= 1800 || longestObsChars >= 420) {
    return "page-dense";
  }

  if (estimatedObsLines >= 6 || totalObsChars >= 900 || longestObsChars >= 200) {
    return "page-compact";
  }

  return "";
}

export function HojaEntregaPrintSheet({
  data,
  fechaImpresion,
}: {
  data: HojaEntregaSheetData;
  fechaImpresion: string;
}) {
  const nombreCompleto = `${data.persona.apellido1} ${data.persona.apellido2 || ""}`.trim();
  const nombresCompleto = `${data.persona.nombre1} ${data.persona.nombre2 || ""}`.trim();
  const ciFormateado = formatUruguayanCi(data.persona.ci);
  const ciWarningPrefix = isValidUruguayanCi(data.persona.ci) ? "" : "\u26a0 ";
  const firmaAlistadoNombre = [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim();
  const firmaLineas = buildFirmasHojaEntregaLineas({
    alistadoRango: data.persona.rangoAbreviacion,
    alistadoNombre: firmaAlistadoNombre,
    encargadoTexto: data.firmas.encargadoTexto,
    encargadoRango: data.firmas.encargadoRango,
    encargadoNombre: data.firmas.encargadoNombre,
    oficialTexto: data.firmas.oficialTexto,
    oficialRango: data.firmas.oficialRango,
    oficialNombre: data.firmas.oficialNombre,
    encargadoStartIndentLevel: 1,
  });
  const bottomInfoGridClassName = data.persona.esReingreso ? "info-grid info-grid-5" : "info-grid info-grid-4";
  const compactClassName = getHojaCompactClass(data);
  const pageClassName = compactClassName ? `page ${compactClassName}` : "page";

  return (
    <div className={pageClassName}>
      <table>
        <colgroup>
          <col style={{ width: "26%" }} />
          {Array.from({ length: 14 }, (_, idx) => (
            <col key={idx} style={{ width: "5.2857%" }} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={15} className="center bold">
              Grupo &quot;Brig.Gral.Manuel Oribe&quot; de Artillería 105mm No.1.-
            </td>
          </tr>
          <tr>
            <td colSpan={15} className="center bold">
              {"ADMINISTRACION - S4"}
            </td>
          </tr>

          <tr>
            <td colSpan={15} className="info-grid-shell info-grid-shell-top">
              <div className="info-grid info-grid-3">
                <div className="info-grid-item">
                  <span className="header-info-label">Grado:</span> {data.persona.rango}
                </div>
                <div className="info-grid-item">
                  <span className="header-info-label">Apellidos:</span> {nombreCompleto}
                </div>
                <div className="info-grid-item">
                  <span className="header-info-label">Nombres:</span> {nombresCompleto}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={15} className="info-grid-shell">
              <div className="info-grid info-grid-5">
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Parka:</span> {data.persona.tallas.PARKA}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Camisaco:</span> {data.persona.tallas.CAMISACO}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Pantalón:</span> {data.persona.tallas.PANTALON}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Kepi:</span> {data.persona.tallas.KEPI}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Calzado:</span> {data.persona.tallas.CALZADO}
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={15} className="info-grid-shell info-grid-shell-bottom">
              <div className={bottomInfoGridClassName}>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">C.I:</span> {ciWarningPrefix}
                  {ciFormateado}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Batería:</span> {data.persona.bateria || "Cdo. y Serv."}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">
                    {data.persona.esReingreso ? "Fecha Re-ingreso:" : "Fecha Ingreso:"}
                  </span>{" "}
                  {data.persona.fechaIngreso
                    ? `${getHojaEntregaDatePart(data.persona.fechaIngreso, "day")}/${getHojaEntregaDatePart(data.persona.fechaIngreso, "month")}/${getHojaEntregaDatePart(data.persona.fechaIngreso, "year")}`
                    : "-"}
                </div>
                {data.persona.esReingreso ? (
                  <div className="info-grid-item info-grid-item-compact">
                    <span className="header-info-label">Fecha ingreso:</span>
                    {data.persona.fechaIngresoOriginal
                      ? `${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "day")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "month")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "year")}`
                      : "-"}
                  </div>
                ) : null}
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Fecha de impresion:</span> {fechaImpresion}
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td className="center bold">EQUIPO</td>
            <td colSpan={6} className="center bold">ENTREGAS</td>
            <td className="center bold" rowSpan={4}>T</td>
            <td colSpan={6} className="center bold">DEVOLUCIONES</td>
            <td className="center bold" rowSpan={4}>T</td>
          </tr>
          <tr className="date-row">
            <td className="date-label">DIA</td>
            {data.entregas.map((col, i) => (
              <td key={`edia-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "day") : ""}
              </td>
            ))}
            {data.devoluciones.map((col, i) => (
              <td key={`ddia-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "day") : ""}
              </td>
            ))}
          </tr>
          <tr className="date-row">
            <td className="date-label">MES</td>
            {data.entregas.map((col, i) => (
              <td key={`emes-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "month") : ""}
              </td>
            ))}
            {data.devoluciones.map((col, i) => (
              <td key={`dmes-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "month") : ""}
              </td>
            ))}
          </tr>
          <tr className="date-row">
            <td className="date-label">ANO</td>
            {data.entregas.map((col, i) => (
              <td key={`eano-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "year") : ""}
              </td>
            ))}
            {data.devoluciones.map((col, i) => (
              <td key={`dano-${data.persona.ci}-${i}`} className="date-label">
                {col.fecha ? getHojaEntregaDatePart(col.fecha, "year") : ""}
              </td>
            ))}
          </tr>

          {data.matrix.map((row) => (
            <tr key={`${data.persona.ci}-${row.item}`} className="item-row">
              <td className="left">{row.item}</td>
              {row.entrega.slice(0, 6).map((qty, i) => (
                <td key={`e-${data.persona.ci}-${row.item}-${i}`}>{qty || ""}</td>
              ))}
              <td className="bold">{row.entregaTotal}</td>
              {row.devolucion.slice(0, 6).map((qty, i) => (
                <td key={`d-${data.persona.ci}-${row.item}-${i}`}>{qty || ""}</td>
              ))}
              <td className="bold">{row.devolucionTotal}</td>
            </tr>
          ))}

          <tr>
            <td colSpan={15} className="left obs-cell">
              <div className="obs-title">OBSERVACIONES</div>
              {data.observaciones.map((obs, idx) => (
                <div key={`${data.persona.ci}-${obs.fecha}-${idx}`} className="obs-item">
                  {getHojaEntregaDatePart(obs.fecha, "day")}/{getHojaEntregaDatePart(obs.fecha, "month")}/{getHojaEntregaDatePart(obs.fecha, "year")} - {obs.texto}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="firma-section">
        <FirmaLineasHtml
          lineas={firmaLineas}
          lineClassName="firma-line"
          lineStrongClassName="firma-strong"
          keyPrefix={data.persona.ci}
        />
      </div>
    </div>
  );
}

export function getCurrentHojaEntregaPrintDate() {
  return formatHojaEntregaDisplayDate(new Date());
}
