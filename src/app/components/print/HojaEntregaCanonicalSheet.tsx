import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { buildFirmasHojaEntregaLineas } from "@/lib/firma-lineas";
import {
  getHojaEntregaDatePart,
  type HojaEntregaSheetData,
} from "@/lib/hoja-entrega-data";
import styles from "@/app/components/views/hoja-de-entrega.module.css";

type HojaEntregaCanonicalSheetProps = {
  data: HojaEntregaSheetData;
  fechaImpresion: string;
};

function getSheetDensity(data: HojaEntregaSheetData) {
  const rowCount = data.matrix.length;
  const obsCount = data.observaciones.length;

  if (rowCount >= 25 || obsCount >= 3) return "tight";
  if (rowCount >= 21 || obsCount >= 2) return "compact";
  return "normal";
}

export function HojaEntregaCanonicalSheet({ data, fechaImpresion }: HojaEntregaCanonicalSheetProps) {
  const density = getSheetDensity(data);
  const densityClassName =
    density === "tight" ? styles.sheetTight : density === "compact" ? styles.sheetCompact : "";
  const maxObservaciones = density === "tight" ? 2 : 3;
  const observacionesVisibles = data.observaciones.slice(0, maxObservaciones);

  const nombreCompleto = `${data.persona.apellido1} ${data.persona.apellido2 || ""}`.trim();
  const nombresCompleto = `${data.persona.nombre1} ${data.persona.nombre2 || ""}`.trim();
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
  });
  const ciValida = isValidUruguayanCi(data.persona.ci);
  const ciWarningPrefix = ciValida ? "" : "\u26a0 ";
  const entregaCols = Array.from({ length: 6 }, (_, idx) => data.entregas[idx]?.fecha ?? null);
  const devolCols = Array.from({ length: 6 }, (_, idx) => data.devoluciones[idx]?.fecha ?? null);
  const bottomInfoGridClassName =
    data.persona.esReingreso ? `${styles.infoGrid} ${styles.infoGrid5}` : `${styles.infoGrid} ${styles.infoGrid4}`;

  return (
    <div className={`${styles.sheet}${densityClassName ? ` ${densityClassName}` : ""}`}>
      <table className={styles.table}>
        <colgroup>
          <col className={styles.itemColumn} />
          {Array.from({ length: 14 }, (_, idx) => (
            <col key={idx} className={styles.dataColumn} />
          ))}
        </colgroup>
        <tbody>
          <tr>
            <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
              Grupo &quot;Brig.Gral.Manuel Oribe&quot; de Artillería 105mm No.1.-
            </td>
          </tr>
          <tr>
            <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
              {"ADMINISTRACIÓN - S4"}
            </td>
          </tr>

          <tr>
            <td colSpan={15} className={`${styles.infoGridShell} ${styles.infoGridShellTop}`}>
              <div className={`${styles.infoGrid} ${styles.infoGrid3}`}>
                <div className={styles.infoGridItem}>
                  <span className={styles.headerInfoLabel}>Grado:</span>
                  <span className={styles.headerInfoValue}>{data.persona.rango}</span>
                </div>
                <div className={styles.infoGridItem}>
                  <span className={styles.headerInfoLabel}>Apellidos:</span>
                  <span className={styles.headerInfoValue}>{nombreCompleto}</span>
                </div>
                <div className={styles.infoGridItem}>
                  <span className={styles.headerInfoLabel}>Nombres:</span>
                  <span className={styles.headerInfoValue}>{nombresCompleto}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={15} className={styles.infoGridShell}>
              <div className={`${styles.infoGrid} ${styles.infoGrid5}`}>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>Parka:</span>
                  <span className={styles.headerInfoValue}>{data.persona.tallas.PARKA}</span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>Camisaco:</span>
                  <span className={styles.headerInfoValue}>{data.persona.tallas.CAMISACO}</span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>{"Pantalón:"}</span>
                  <span className={styles.headerInfoValue}>{data.persona.tallas.PANTALON}</span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>{"Kepí:"}</span>
                  <span className={styles.headerInfoValue}>{data.persona.tallas.KEPI}</span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>Calzado:</span>
                  <span className={styles.headerInfoValue}>{data.persona.tallas.CALZADO}</span>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={15} className={`${styles.infoGridShell} ${styles.infoGridShellBottom}`}>
              <div className={bottomInfoGridClassName}>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>C.I:</span>
                  <span className={styles.headerInfoValue}>
                    {ciWarningPrefix}
                    {formatUruguayanCi(data.persona.ci)}
                  </span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>{"Batería:"}</span>
                  <span className={styles.headerInfoValue}>{data.persona.bateria || "Cdo. y Serv."}</span>
                </div>
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>{data.persona.esReingreso ? "Fecha Re-ingreso:" : "Fecha Ingreso:"}</span>
                  <span className={styles.headerInfoValue}>
                    {data.persona.fechaIngreso
                      ? `${getHojaEntregaDatePart(data.persona.fechaIngreso, "day")}/${getHojaEntregaDatePart(data.persona.fechaIngreso, "month")}/${getHojaEntregaDatePart(data.persona.fechaIngreso, "year")}`
                      : "-"}
                  </span>
                </div>
                {data.persona.esReingreso ? (
                  <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                    <span className={styles.headerInfoLabel}>Fecha ingreso:</span>
                    <span className={styles.headerInfoValue}>
                      {data.persona.fechaIngresoOriginal
                        ? `${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "day")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "month")}/${getHojaEntregaDatePart(data.persona.fechaIngresoOriginal, "year")}`
                        : "-"}
                    </span>
                  </div>
                ) : null}
                <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                  <span className={styles.headerInfoLabel}>Fecha de impresion:</span>
                  <span className={styles.headerInfoValue}>{fechaImpresion}</span>
                </div>
              </div>
            </td>
          </tr>

          <tr>
            <td className={`${styles.center} ${styles.bold}`}>EQUIPO</td>
            <td colSpan={6} className={`${styles.center} ${styles.bold}`}>ENTREGAS</td>
            <td className={`${styles.center} ${styles.bold}`} rowSpan={4}>T</td>
            <td colSpan={6} className={`${styles.center} ${styles.bold}`}>DEVOLUCIONES</td>
            <td className={`${styles.center} ${styles.bold}`} rowSpan={4}>T</td>
          </tr>
          <tr className={styles.dateRow}>
            <td className={styles.dateLabel}>{"DÍA"}</td>
            {entregaCols.map((fecha, i) => (
              <td key={`edia-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "day") : ""}
              </td>
            ))}
            {devolCols.map((fecha, i) => (
              <td key={`ddia-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "day") : ""}
              </td>
            ))}
          </tr>
          <tr className={styles.dateRow}>
            <td className={styles.dateLabel}>MES</td>
            {entregaCols.map((fecha, i) => (
              <td key={`emes-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "month") : ""}
              </td>
            ))}
            {devolCols.map((fecha, i) => (
              <td key={`dmes-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "month") : ""}
              </td>
            ))}
          </tr>
          <tr className={styles.dateRow}>
            <td className={styles.dateLabel}>{"AÑO"}</td>
            {entregaCols.map((fecha, i) => (
              <td key={`eano-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "year") : ""}
              </td>
            ))}
            {devolCols.map((fecha, i) => (
              <td key={`dano-${data.persona.ci}-${i}`} className={styles.dateLabel}>
                {fecha ? getHojaEntregaDatePart(fecha, "year") : ""}
              </td>
            ))}
          </tr>

          {data.matrix.map((row) => (
            <tr key={`${data.persona.ci}-${row.item}`} className={styles.itemRow}>
              <td className={styles.left}>{row.item}</td>
              {row.entrega.slice(0, 6).map((qty, i) => (
                <td key={`e-${data.persona.ci}-${row.item}-${i}`}>{qty || ""}</td>
              ))}
              <td className={styles.bold}>{row.entregaTotal}</td>
              {row.devolucion.slice(0, 6).map((qty, i) => (
                <td key={`d-${data.persona.ci}-${row.item}-${i}`}>{qty || ""}</td>
              ))}
              <td className={styles.bold}>{row.devolucionTotal}</td>
            </tr>
          ))}

          <tr>
            <td colSpan={15} className={styles.observacionesCell}>
              <div>OBSERVACIONES</div>
              {observacionesVisibles.length === 0 ? <div> </div> : null}
              {observacionesVisibles.map((obs, idx) => (
                <div key={`${data.persona.ci}-${obs.fecha}-${idx}`}>
                  {getHojaEntregaDatePart(obs.fecha, "day")}/{getHojaEntregaDatePart(obs.fecha, "month")}/{getHojaEntregaDatePart(obs.fecha, "year")} - {obs.texto}
                </div>
              ))}
            </td>
          </tr>
        </tbody>
      </table>

      <div className={styles.firmaSection}>
        {firmaLineas.map((linea) => (
          <div
            key={`${data.persona.ci}-${linea.key}`}
            className={`${styles.firmaLine}${linea.isBold ? ` ${styles.firmaLineStrong}` : ""}`}
            style={{ marginLeft: `calc(${linea.indentLevel} * var(--firma-tab-size))` }}
          >
            {linea.text}
          </div>
        ))}
      </div>
    </div>
  );
}
