import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
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
    width: 210mm;
    min-height: 297mm;
    padding: 4mm 8mm 4mm 8mm;
    background: white;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 3mm;
  }

  .page + .page {
    margin-top: 6mm;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    border: 2px solid #000;
    margin: 0;
    background: white;
    table-layout: fixed;
  }

  th, td {
    border: 0.8px solid #000;
    padding: 2px 3px;
    text-align: center;
    vertical-align: middle;
    font-size: 7.5px;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
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
    font-size: 9px;
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
    font-size: 8px;
  }

  .date-label {
    background: #e3e3e3;
    font-weight: bold;
    text-align: center;
    font-size: 7px;
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .info-grid-4 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .info-grid-5 {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }

  .info-grid-item {
    min-width: 0;
    padding: 4px 10px;
    text-align: left;
    background: #fff;
    border-right: 0.8px solid #000;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .info-grid-item-compact {
    padding: 3px 8px;
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
    font-size: 7px;
    white-space: nowrap;
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
    font-size: 8px;
    margin-bottom: 3px;
  }

  .obs-item {
    font-size: 8px;
    margin-bottom: 2px;
  }

  .firma-section {
    display: flex;
    flex-direction: column;
    margin-top: 0;
    padding: 0 1mm;
    gap: 4.5mm;
  }

  .firma-block {
    font-size: 8px;
    font-family: "Courier New", monospace;
    line-height: 1.25;
  }

  .firma-level-0 {
    margin-left: 0;
  }

  .firma-level-1 {
    margin-left: 8mm;
  }

  .firma-level-2 {
    margin-left: 16mm;
  }

  .firma-title {
    margin-bottom: 1px;
  }

  .firma-role {
    font-weight: bold;
  }

  .firma-name {
    font-size: 8px;
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
      padding: 4mm 8mm 4mm 8mm;
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

export function HojaEntregaPrintSheet({
  data,
  fechaEmision,
}: {
  data: HojaEntregaSheetData;
  fechaEmision: string;
}) {
  const nombreCompleto = `${data.persona.apellido1} ${data.persona.apellido2 || ""}`.trim();
  const nombresCompleto = `${data.persona.nombre1} ${data.persona.nombre2 || ""}`.trim();
  const ciFormateado = formatUruguayanCi(data.persona.ci);
  const ciWarningPrefix = isValidUruguayanCi(data.persona.ci) ? "" : "\u26a0 ";
  const firmaAlistadoNombre = [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim();

  return (
    <div className="page">
      <table>
        <colgroup>
          <col style={{ width: "26%" }} />
          {Array.from({ length: 14 }, (_, idx) => (
            <col key={idx} style={{ width: "5.2857%" }} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={15} className="center bold" style={{ fontSize: "9px" }}>
              Grupo &quot;Brig.Gral.Manuel Oribe&quot; de Artillería 105mm No.1.-
            </td>
          </tr>
          <tr>
            <td colSpan={15} className="center bold" style={{ fontSize: "9px" }}>
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
              <div className="info-grid info-grid-5">
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
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Fecha ingreso original:</span>{" "}
                  {data.persona.fechaIngresoOriginal
                    ? `${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "day")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "month")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "year")}`
                    : ""}
                </div>
                <div className="info-grid-item info-grid-item-compact">
                  <span className="header-info-label">Fecha de emisión:</span> {fechaEmision}
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
            <td colSpan={15} className="left" style={{ padding: "4px" }}>
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
        <div className="firma-block firma-level-0">
          <div className="firma-title">Firma del alistado:</div>
          <div className="firma-role firma-level-1">{data.persona.rangoAbreviacion}</div>
          <div className="firma-name firma-level-2">{firmaAlistadoNombre}</div>
        </div>
        <div className="firma-block firma-level-1">
          <div className="firma-title">{data.firmas.encargadoTexto}</div>
          <div className="firma-role firma-level-1">{data.firmas.encargadoRango}</div>
          <div className="firma-name firma-level-2">{data.firmas.encargadoNombre}</div>
        </div>
        <div className="firma-block firma-level-2">
          <div className="firma-title">{data.firmas.oficialTexto}</div>
          <div className="firma-role firma-level-1">{data.firmas.oficialRango}</div>
          <div className="firma-name firma-level-2">{data.firmas.oficialNombre}</div>
        </div>
      </div>
    </div>
  );
}

export function getCurrentHojaEntregaEmissionDate() {
  return formatHojaEntregaDisplayDate(new Date());
}
