"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { isValidUruguayanCi, formatUruguayanCi } from "@/lib/ci";
import styles from "./ficha.module.css";

type FichaData = {
  persona: {
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    fechaIngreso: string | null;
    gradoPersonal: string;
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

export interface FichaViewProps {
  ci: string;
  onClose: () => void;
}

function getDatePart(value: string | null | undefined, part: "day" | "month" | "year") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (part === "day") return String(date.getDate());
  if (part === "month") return String(date.getMonth() + 1);
  return String(date.getFullYear());
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

export function FichaView({ ci, onClose }: FichaViewProps) {
  const [data, setData] = useState<FichaData | null>(null);
  const [status, setStatus] = useState("Cargando ficha...");
  const fichaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const result = await api<FichaData>(`/api/ficha/${encodeURIComponent(ci)}`);
        if (isMounted) {
          setData(result);
          setStatus("Ficha cargada.");
        }
      } catch (error: unknown) {
        if (isMounted) {
          const message = error instanceof Error ? error.message : "No se pudo cargar la ficha.";
          setStatus(message);
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [ci]);

  const observacionesTexto = useMemo(() => {
    if (!data) return [];
    return data.observaciones.slice(0, 5).map((obs) => {
      const fecha = new Date(obs.fecha).toLocaleDateString("es-UY");
      return `${fecha}: ${obs.texto}`;
    });
  }, [data]);

  const nombreFirmaAlistado = useMemo(() => {
    if (!data) return "";
    return [data.persona.nombre1, data.persona.apellido1]
      .filter((value): value is string => Boolean(value && value.trim()))
      .join(" ");
  }, [data]);

  const entregaCols = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => data?.entregas[idx]?.fecha),
    [data]
  );
  const devolCols = useMemo(
    () => Array.from({ length: 6 }, (_, idx) => data?.devoluciones[idx]?.fecha),
    [data]
  );
  const colLabels = ["1", "2", "3", "4", "5", "6"];

  const exportPdf = useCallback(async () => {
    if (!data) return;

    try {
      setStatus("Generando PDF...");

      const response = await fetch("/api/pdf-ficha", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Error al generar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const ciFormatted = formatUruguayanCi(ci);
      const nombreCompleto = [data.persona.nombre1, data.persona.apellido1]
        .filter(Boolean)
        .join("_")
        .replace(/\s+/g, "_");
      const fecha = new Date().toISOString().split("T")[0];
      a.download = `Ficha_${ciFormatted}_${nombreCompleto}_${fecha}.pdf`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus("PDF descargado exitosamente.");
      setTimeout(() => setStatus("Ficha cargada."), 2000);
    } catch (error) {
      console.error("Error generando PDF:", error);
      setStatus("Error al generar PDF.");
      setTimeout(() => setStatus("Ficha cargada."), 2000);
    }
  }, [data, ci]);

  const ciValida = isValidUruguayanCi(ci);

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.buttonSecondary} onClick={onClose}>
          ← Volver
        </button>
        <button
          type="button"
          className={styles.button}
          onClick={exportPdf}
          disabled={!data}
          aria-label="Descargar ficha en PDF"
        >
          📄 Descargar PDF
        </button>
      </div>

      <p className={styles.statusLine} role="status">
        {status}
      </p>

      {data ? (
        <div className={styles.sheet} ref={fichaRef}>
          <div className={styles.frame}>
            <table className={styles.table}>
              <tbody>
                {/* ENCABEZADO PRINCIPAL */}
                <tr>
                  <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
                    Grupo &quot;Brig.Gral.Manuel Oribe&quot; de Artillería 105mm No.1.-
                  </td>
                </tr>
                <tr>
                  <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
                    ADMINISTRACIÓN.-
                  </td>
                </tr>

                {/* DATOS PERSONALES */}
                <tr>
                  <td colSpan={15} className={`${styles.bold}`}>
                    Apellidos: {data.persona.apellido1} {data.persona.apellido2 ?? ""} | Nombres: {data.persona.nombre1}{" "}
                    {data.persona.nombre2 ?? ""} | Grado: {data.persona.gradoPersonal}
                  </td>
                </tr>

                {/* TALLES */}
                <tr>
                  <td className={`${styles.bold}`}>Parka:</td>
                  <td>{data.persona.tallas.PARKA}</td>
                  <td className={`${styles.bold}`}>Camisaco:</td>
                  <td>{data.persona.tallas.CAMISACO}</td>
                  <td className={`${styles.bold}`}>Pantalón:</td>
                  <td>{data.persona.tallas.PANTALON}</td>
                  <td className={`${styles.bold}`}>Kepi:</td>
                  <td>{data.persona.tallas.KEPI}</td>
                  <td className={`${styles.bold}`}>Calzado:</td>
                  <td>{data.persona.tallas.CALZADO}</td>
                  <td colSpan={5}></td>
                </tr>

                {/* INFORMACIÓN ADMINISTRATIVA */}
                <tr>
                  <td colSpan={5} className={`${styles.bold}`}>
                    C.I: {ciValida ? "" : "⚠ "}{formatUruguayanCi(data.persona.ci)}
                  </td>
                  <td colSpan={5} className={`${styles.bold}`}>
                    Batería: {data.persona.bateria ?? "Pendiente"}
                  </td>
                  <td colSpan={5} className={`${styles.bold}`}>
                    Fecha Ingreso: {data.persona.fechaIngreso ? new Date(data.persona.fechaIngreso).toLocaleDateString("es-UY") : ""}
                  </td>
                </tr>

                {/* ENCABEZADO DE DISTRIBUCIÓN Y ENTREGA */}
                <tr>
                  <td className={styles.bold}>VESTUARIO</td>
                  <td colSpan={6} className={`${styles.center} ${styles.bold}`}>
                    DISTRIBUCIÓN
                  </td>
                  <td className={styles.bold}>T</td>
                  <td colSpan={6} className={`${styles.center} ${styles.bold} ${styles.verticalDivider}`}>
                    ENTREGA / DEVOLUCIÓN
                  </td>
                  <td className={styles.bold}>T</td>
                </tr>

                {/* FECHAS: DÍA */}
                <tr>
                  <td className={styles.center}>DÍA</td>
                  {entregaCols.map((value, idx) => (
                    <td key={`edia-${idx}`} className={styles.center}>
                      {getDatePart(value, "day")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                  {devolCols.map((value, idx) => (
                    <td key={`ddia-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                      {getDatePart(value, "day")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                </tr>

                {/* FECHAS: MES */}
                <tr>
                  <td className={styles.center}>MES</td>
                  {entregaCols.map((value, idx) => (
                    <td key={`emes-${idx}`} className={styles.center}>
                      {getDatePart(value, "month")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                  {devolCols.map((value, idx) => (
                    <td key={`dmes-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                      {getDatePart(value, "month")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                </tr>

                {/* FECHAS: AÑO */}
                <tr>
                  <td className={styles.center}>AÑO</td>
                  {entregaCols.map((value, idx) => (
                    <td key={`eanio-${idx}`} className={styles.center}>
                      {getDatePart(value, "year")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                  {devolCols.map((value, idx) => (
                    <td key={`danio-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                      {getDatePart(value, "year")}
                    </td>
                  ))}
                  <td className={styles.tCol}></td>
                </tr>

                {/* ENCABEZADO COLUMNAS */}
                <tr>
                  <td className={styles.vestuarioHeaderCell}>VESTUARIO</td>
                  {colLabels.map((label) => (
                    <td key={`hn-e-${label}`} className={styles.vestuarioHeaderCell}>
                      {label}
                    </td>
                  ))}
                  <td className={`${styles.vestuarioHeaderCell} ${styles.tCol}`}>T</td>
                  {colLabels.map((label) => (
                    <td key={`hn-d-${label}`} className={`${styles.vestuarioHeaderCell} ${styles.verticalDivider}`}>
                      {label}
                    </td>
                  ))}
                  <td className={`${styles.vestuarioHeaderCell} ${styles.tCol}`}>T</td>
                </tr>

                {/* ITEMS */}
                {data.matrix.map((row) => (
                  <tr key={row.item}>
                    <td className={`${styles.small} ${styles.itemCell}`}>{row.item}</td>
                    {row.entrega.map((value, idx) => (
                      <td key={`${row.item}-e-${idx}`} className={styles.center}>
                        {value || ""}
                      </td>
                    ))}
                    <td className={styles.tCol}>{row.entregaTotal}</td>
                    {row.devolucion.map((value, idx) => (
                      <td key={`${row.item}-d-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                        {value || ""}
                      </td>
                    ))}
                    <td className={styles.tCol}>{row.devolucionTotal}</td>
                  </tr>
                ))}

                {/* OBSERVACIONES */}
                <tr>
                  <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
                    OBSERVACIONES
                  </td>
                </tr>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`obs-${idx}`}>
                    <td colSpan={15} className={styles.obsLine}>
                      <span className={styles.small}>{observacionesTexto[idx] ?? ""}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* SECCIÓN DE FIRMAS */}
          <div className={styles.sign}>
            <div className={`${styles.signBlock} ${styles.signBlockA}`}>
              <div className={styles.signTitle}>Firma del alistado:</div>
              <div className={styles.signRank}>{data.persona.gradoPersonal}</div>
              <div className={styles.signName}>{nombreFirmaAlistado}</div>
            </div>

            <div className={`${styles.signBlock} ${styles.signBlockB}`}>
              <div className={styles.signTitle}>{data.firmas.encargadoTexto}</div>
              <div className={styles.signRank}>{data.firmas.encargadoRango}</div>
              <div className={styles.signName}>{data.firmas.encargadoNombre}</div>
            </div>

            <div className={`${styles.signBlock} ${styles.signBlockC}`}>
              <div className={styles.signTitle}>{data.firmas.oficialTexto}</div>
              <div className={styles.signRank}>{data.firmas.oficialRango}</div>
              <div className={styles.signName}>{data.firmas.oficialNombre}</div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}