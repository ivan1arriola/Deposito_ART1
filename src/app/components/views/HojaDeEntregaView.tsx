"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { extractDateParts, formatDateOnlyForDisplay } from "@/lib/date-helpers";
import styles from "./hoja-de-entrega.module.css";

type FichaData = {
  persona: {
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    esReingreso: boolean;
    fechaIngreso: string | null;
    fechaIngresoOriginal: string | null;
    gradoPersonal: string;
    gradoPersonalAbreviado: string;
    bateria: string | null;
    tallas: {
      PARKA: string;
      CAMISACO: string;
      PANTALON: string;
      KEPI: string;
      CALZADO: string;
    };
  };
  entregas: Array<{ fecha: string | null }>;
  devoluciones: Array<{ fecha: string | null }>;
  matrix: Array<{
    item: string;
    entrega: number[];
    entregaTotal: number;
    devolucion: number[];
    devolucionTotal: number;
  }>;
  firmas: {
    encargadoTexto: string;
    encargadoRango: string;
    encargadoNombre: string;
    oficialTexto: string;
    oficialRango: string;
    oficialNombre: string;
  };
  observaciones: Array<{ fecha: string; texto: string }>;
};

export interface HojaDeEntregaViewProps {
  ci: string;
  onClose: () => void;
}

function getDatePart(value: string | null | undefined, part: "day" | "month" | "year") {
  const parts = extractDateParts(value);
  if (!parts) return "";
  return parts[part];
}

function formatDisplayDate(value: string | Date | null | undefined) {
  return formatDateOnlyForDisplay(value, "-");
}

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvió una respuesta inválida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Error";
    throw new Error(message || "Error");
  }

  if (data === null) {
    throw new Error("El servidor no devolvió datos.");
  }

  return data as T;
}

export function HojaDeEntregaView({ ci, onClose }: HojaDeEntregaViewProps) {
  const [data, setData] = useState<FichaData | null>(null);
  const [status, setStatus] = useState("Cargando hoja de entrega...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api<FichaData>(`/api/hoja-de-entrega/${encodeURIComponent(ci)}`);
        if (!isMounted) return;
        setData(result);
        setStatus("Hoja de entrega cargada.");
      } catch (error: unknown) {
        if (!isMounted) return;
        setStatus(error instanceof Error ? error.message : "No se pudo cargar la hoja de entrega.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();
    return () => {
      isMounted = false;
    };
  }, [ci]);

  const entregaCols = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => data?.entregas[idx]?.fecha ?? null),
    [data],
  );
  const devolCols = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => data?.devoluciones[idx]?.fecha ?? null),
    [data],
  );

  const exportPdf = useCallback(async () => {
    if (!data) return;

    try {
      setStatus("Abriendo vista de impresion...");
      const printUrl = `/hoja-de-entrega/${encodeURIComponent(ci)}?autoprint=1`;
      const popup = window.open(printUrl, "_blank");

      if (popup) {
        try {
          popup.opener = null;
        } catch {
          // Algunos navegadores restringen esta asignacion; no bloquear flujo.
        }
        setStatus("Vista de impresion abierta.");
        window.setTimeout(() => setStatus("Hoja de entrega cargada."), 2000);
        return;
      }

      setStatus("Ventana emergente bloqueada. Abriendo impresion en esta pestaña...");
      window.setTimeout(() => {
        window.location.assign(printUrl);
      }, 120);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setStatus(`Error: ${message}`);
      window.setTimeout(() => setStatus("Hoja de entrega cargada."), 2000);
    }
  }, [ci, data]);

  const nombreCompleto = data ? `${data.persona.apellido1} ${data.persona.apellido2 || ""}`.trim() : "";
  const nombresCompleto = data ? `${data.persona.nombre1} ${data.persona.nombre2 || ""}`.trim() : "";
  const fechaImpresion = formatDisplayDate(new Date());
  const ciValida = isValidUruguayanCi(ci);
  const ciWarningPrefix = ciValida ? "" : "\u26a0 ";
  const firmaAlistadoNombre = data ? [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim() : "";
  const bottomInfoGridClassName =
    data && data.persona.esReingreso ? `${styles.infoGrid} ${styles.infoGrid5}` : `${styles.infoGrid} ${styles.infoGrid4}`;

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.buttonSecondary} onClick={onClose}>
          Volver
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={exportPdf}
          disabled={!data}
          aria-label="Imprimir o guardar hoja de entrega como PDF"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className={styles.statusLine} role="status" aria-live="polite">
        {loading ? <span>{status}</span> : status}
      </div>

      {data ? (
        <div className={styles.sheet}>
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
                      <span className={styles.headerInfoValue}>{data.persona.gradoPersonal}</span>
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
                          ? `${getDatePart(data.persona.fechaIngreso, "day")}/${getDatePart(data.persona.fechaIngreso, "month")}/${getDatePart(data.persona.fechaIngreso, "year")}`
                          : "-"}
                      </span>
                    </div>
                    {data.persona.esReingreso ? (
                      <div className={`${styles.infoGridItem} ${styles.infoGridItemCompact}`}>
                        <span className={styles.headerInfoLabel}>Fecha ingreso:</span>
                        <span className={styles.headerInfoValue}>
                          {data.persona.fechaIngresoOriginal
                            ? `${getDatePart(data.persona.fechaIngresoOriginal, "day")}/${getDatePart(data.persona.fechaIngresoOriginal, "month")}/${getDatePart(data.persona.fechaIngresoOriginal, "year")}`
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
                  <td key={`edia-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "day") : ""}
                  </td>
                ))}
                {devolCols.map((fecha, i) => (
                  <td key={`ddia-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "day") : ""}
                  </td>
                ))}
              </tr>
              <tr className={styles.dateRow}>
                <td className={styles.dateLabel}>MES</td>
                {entregaCols.map((fecha, i) => (
                  <td key={`emes-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "month") : ""}
                  </td>
                ))}
                {devolCols.map((fecha, i) => (
                  <td key={`dmes-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "month") : ""}
                  </td>
                ))}
              </tr>
              <tr className={styles.dateRow}>
                <td className={styles.dateLabel}>{"AÑO"}</td>
                {entregaCols.map((fecha, i) => (
                  <td key={`eano-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "year") : ""}
                  </td>
                ))}
                {devolCols.map((fecha, i) => (
                  <td key={`dano-${i}`} className={styles.dateLabel}>
                    {fecha ? getDatePart(fecha, "year") : ""}
                  </td>
                ))}
              </tr>

              {data.matrix.map((row) => (
                <tr key={row.item} className={styles.itemRow}>
                  <td className={styles.left}>{row.item}</td>
                  {row.entrega.slice(0, 6).map((qty, i) => (
                    <td key={`e-${row.item}-${i}`}>{qty || ""}</td>
                  ))}
                  <td className={styles.bold}>{row.entregaTotal}</td>
                  {row.devolucion.slice(0, 6).map((qty, i) => (
                    <td key={`d-${row.item}-${i}`}>{qty || ""}</td>
                  ))}
                  <td className={styles.bold}>{row.devolucionTotal}</td>
                </tr>
              ))}

              <tr>
                <td colSpan={15} className={styles.observacionesCell}>
                  <div>OBSERVACIONES</div>
                  {data.observaciones.map((obs, idx) => (
                    <div key={`${obs.fecha}-${idx}`}>
                      {getDatePart(obs.fecha, "day")}/{getDatePart(obs.fecha, "month")}/{getDatePart(obs.fecha, "year")} - {obs.texto}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          <div className={styles.firmaSection}>
            <div className={`${styles.firmaBlock} ${styles.firmaLevel0}`}>
              <div className={styles.firmaTitle}>Firma del alistado:</div>
              <div className={`${styles.firmaRole} ${styles.firmaLevel1}`}>{data.persona.gradoPersonalAbreviado}</div>
              <div className={`${styles.firmaName} ${styles.firmaLevel2}`}>{firmaAlistadoNombre}</div>
            </div>
            <div className={`${styles.firmaBlock} ${styles.firmaLevel1}`}>
              <div className={styles.firmaTitle}>{data.firmas.encargadoTexto}</div>
              <div className={`${styles.firmaRole} ${styles.firmaLevel1}`}>{data.firmas.encargadoRango}</div>
              <div className={`${styles.firmaName} ${styles.firmaLevel2}`}>{data.firmas.encargadoNombre}</div>
            </div>
            <div className={`${styles.firmaBlock} ${styles.firmaLevel2}`}>
              <div className={styles.firmaTitle}>{data.firmas.oficialTexto}</div>
              <div className={`${styles.firmaRole} ${styles.firmaLevel1}`}>{data.firmas.oficialRango}</div>
              <div className={`${styles.firmaName} ${styles.firmaLevel2}`}>{data.firmas.oficialNombre}</div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
