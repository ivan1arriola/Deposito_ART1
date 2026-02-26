"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatUruguayanCi } from "@/lib/ci";
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

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvio una respuesta invalida.");
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
    throw new Error("El servidor no devolvio datos.");
  }

  return data as T;
}

function getDatePart(value: string | null | undefined, part: "day" | "month" | "year") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (part === "day") return String(date.getDate());
  if (part === "month") return String(date.getMonth() + 1);
  return String(date.getFullYear());
}

export default function FichaPage() {
  const params = useParams<{ ci: string }>();
  const ci = decodeURIComponent(params.ci ?? "");
  const [data, setData] = useState<FichaData | null>(null);
  const [status, setStatus] = useState("Cargando ficha...");

  useEffect(() => {
    const timerId = window.setTimeout(async () => {
      try {
        const result = await api<FichaData>(`/api/ficha/${encodeURIComponent(ci)}`);
        setData(result);
        setStatus("Ficha cargada.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo cargar la ficha.";
        setStatus(message);
        if (message === "No autenticado.") {
          window.location.href = "/login";
        }
      }
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [ci]);

  const observacionesTexto = useMemo(() => {
    if (!data) return [];
    return data.observaciones.slice(0, 6).map((obs) => {
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

  function exportPdf() {
    window.print();
  }

  const entregaCols = Array.from({ length: 6 }, (_, idx) => data?.entregas[idx]?.fecha);
  const devolCols = Array.from({ length: 6 }, (_, idx) => data?.devoluciones[idx]?.fecha);
  const colLabels = ["1", "2", "3", "4", "5", "6"];

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/" className={styles.buttonSecondary}>
          Volver
        </Link>
        <button type="button" className={styles.button} onClick={exportPdf} disabled={!data}>
          Imprimir / Guardar PDF
        </button>
      </div>

      <p className={styles.statusLine}>{status}</p>

      {data ? (
        <div className={styles.sheet}>
          <div className={styles.frame}>
            <table className={styles.table}>
            <colgroup>
              <col className={styles.colItem} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colTotal} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colSlot} />
              <col className={styles.colTotal} />
            </colgroup>
            <tbody>
              <tr>
                <td colSpan={15} className={styles.topSectionCell}>
                  <table className={styles.topTable}>
                    <tbody>
                      <tr>
                        <td colSpan={4} className={`${styles.center} ${styles.bold}`}>
                          {'Grupo "Brig.Gral.Manuel Oribe " de Artilleria 105mm No.1.-'}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className={styles.bold}>
                          ADMINISTRACION.-
                        </td>
                        <td className={`${styles.bold} ${styles.center}`}>S-4</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className={`${styles.center} ${styles.bold}`}>
                          APELLIDOS
                        </td>
                        <td colSpan={2} className={`${styles.center} ${styles.bold}`}>
                          NOMBRES
                        </td>
                      </tr>
                      <tr>
                        <td className={`${styles.bold} ${styles.topOrdCell}`}>1&deg;</td>
                        <td className={styles.topValueCell}>{data.persona.apellido1}</td>
                        <td className={`${styles.bold} ${styles.topOrdCell}`}>1&deg;</td>
                        <td className={styles.topValueCell}>{data.persona.nombre1}</td>
                      </tr>
                      <tr>
                        <td className={`${styles.bold} ${styles.topOrdCell}`}>2&deg;</td>
                        <td className={styles.topValueCell}>{data.persona.apellido2 ?? ""}</td>
                        <td className={`${styles.bold} ${styles.topOrdCell}`}>2&deg;</td>
                        <td className={styles.topValueCell}>{data.persona.nombre2 ?? ""}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className={`${styles.center} ${styles.bold}`}>
                          Talle
                        </td>
                        <td colSpan={2} className={`${styles.center} ${styles.bold}`}>
                          Numero de Orden
                        </td>
                      </tr>
                      <tr>
                        <td className={styles.bold}>Parka:</td>
                        <td>{data.persona.tallas.PARKA}</td>
                        <td className={`${styles.bold} ${styles.topOrderLabel}`}>C.I :</td>
                        <td className={styles.topOrderValue}>{formatUruguayanCi(data.persona.ci)}</td>
                      </tr>
                      <tr>
                        <td className={styles.bold}>Camisaco:</td>
                        <td>{data.persona.tallas.CAMISACO}</td>
                        <td className={`${styles.bold} ${styles.topOrderLabel}`}>Ba.:</td>
                        <td className={styles.topOrderValue}>{data.persona.bateria ?? "Pendiente"}</td>
                      </tr>
                      <tr>
                        <td className={styles.bold}>Pantalon:</td>
                        <td>{data.persona.tallas.PANTALON}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td className={styles.bold}>Kepi:</td>
                        <td>{data.persona.tallas.KEPI}</td>
                        <td></td>
                        <td></td>
                      </tr>
                      <tr>
                        <td className={styles.bold}>Calzado:</td>
                        <td>{data.persona.tallas.CALZADO}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
              <tr>
                <td className={styles.bold}>
                  FECHA DE INGRESO:{" "}
                  {data.persona.fechaIngreso ? new Date(data.persona.fechaIngreso).toLocaleDateString("es-UY") : ""}
                </td>
                <td colSpan={6} className={`${styles.center} ${styles.bold}`}>
                  DISTRIBUCION
                </td>
                <td className={styles.tCol}>T</td>
                <td colSpan={6} className={`${styles.center} ${styles.bold} ${styles.verticalDivider}`}>
                  ENTREGA / DEVOLUCION
                </td>
                <td className={styles.tCol}>T</td>
              </tr>
              <tr>
                <td className={styles.bold}>
                  DIA
                </td>
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
              <tr>
                <td className={styles.bold}>
                  MES
                </td>
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
              <tr>
                <td className={styles.bold}>
                  ANO
                </td>
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
              <tr>
                <td className={styles.vestuarioHeaderCell}>
                  VESTUARIO
                </td>
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

              {data.matrix.map((row) => (
                <tr key={row.item}>
                  <td className={`${styles.small} ${styles.itemCell}`}>
                    {row.item}
                  </td>
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
