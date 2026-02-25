"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
    bateria: string;
    tallas: {
      PARKA: string;
      CAMISACO: string;
      PANTALON: string;
      KEPI: string;
      CALZADO: string;
    };
  };
  entregas: Array<{ fecha: string }>;
  devoluciones: Array<{ fecha: string }>;
  matrix: Array<{
    item: string;
    entrega: number[];
    entregaTotal: number;
    devolucion: number[];
    devolucionTotal: number;
  }>;
  observaciones: Array<{ fecha: string; texto: string }>;
};

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : "Error";
    throw new Error(message || "Error");
  }
  return data as T;
}

function getDatePart(value: string | undefined, part: "day" | "month" | "year") {
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
  const [isExporting, setIsExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

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

  async function exportPdf() {
    if (!sheetRef.current || !data) return;

    setIsExporting(true);
    try {
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("landscape", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`ficha-${data.persona.ci}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  const entregaCols = Array.from({ length: 6 }, (_, idx) => data?.entregas[idx]?.fecha);
  const devolCols = Array.from({ length: 6 }, (_, idx) => data?.devoluciones[idx]?.fecha);

  return (
    <main className={styles.page}>
      <div className={styles.toolbar}>
        <Link href="/" className={styles.buttonSecondary}>
          Volver
        </Link>
        <button type="button" className={styles.button} onClick={() => void exportPdf()} disabled={isExporting || !data}>
          {isExporting ? "Generando PDF..." : "Crear PDF"}
        </button>
      </div>

      <p className={styles.small}>{status}</p>

      {data ? (
        <div ref={sheetRef} className={styles.sheet}>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
                  {'Grupo "Brig.Gral.Manuel Oribe " de Artilleria 105mm No.1.-'}
                </td>
              </tr>
              <tr>
                <td colSpan={10} className={styles.bold}>
                  ADMINISTRACION.-
                </td>
                <td colSpan={5} className={`${styles.bold} ${styles.center}`}>
                  S-4
                </td>
              </tr>
              <tr>
                <td colSpan={7} className={`${styles.center} ${styles.bold}`}>
                  APELLIDOS
                </td>
                <td colSpan={8} className={`${styles.center} ${styles.bold}`}>
                  NOMBRES
                </td>
              </tr>
              <tr>
                <td className={styles.bold}>1&deg;.</td>
                <td colSpan={6}>{data.persona.apellido1}</td>
                <td className={styles.bold}>1&deg;</td>
                <td colSpan={7}>{data.persona.nombre1}</td>
              </tr>
              <tr>
                <td className={styles.bold}>2&deg;</td>
                <td colSpan={6}>{data.persona.apellido2 ?? ""}</td>
                <td className={styles.bold}>2&deg;</td>
                <td colSpan={7}>{data.persona.nombre2 ?? ""}</td>
              </tr>
              <tr>
                <td colSpan={7} className={`${styles.center} ${styles.bold}`}>
                  Talle
                </td>
                <td colSpan={8} className={`${styles.center} ${styles.bold}`}>
                  Numero de Orden
                </td>
              </tr>
              <tr>
                <td>Parka:</td>
                <td colSpan={6}>{data.persona.tallas.PARKA}</td>
                <td className={styles.bold}>C.I :</td>
                <td colSpan={7}>{data.persona.ci}</td>
              </tr>
              <tr>
                <td>Camisaco:</td>
                <td colSpan={6}>{data.persona.tallas.CAMISACO}</td>
                <td className={styles.bold}>Ba.:</td>
                <td colSpan={7}>{data.persona.bateria}</td>
              </tr>
              <tr>
                <td>Pantalon:</td>
                <td colSpan={6}>{data.persona.tallas.PANTALON}</td>
                <td colSpan={8}></td>
              </tr>
              <tr>
                <td>Kepi:</td>
                <td colSpan={6}>{data.persona.tallas.KEPI}</td>
                <td colSpan={8}></td>
              </tr>
              <tr>
                <td>Calzado:</td>
                <td colSpan={6}>{data.persona.tallas.CALZADO}</td>
                <td colSpan={8}></td>
              </tr>
              <tr>
                <td colSpan={4} className={styles.bold}>
                  FECHA DE INGRESO:
                </td>
                <td colSpan={3}>{data.persona.fechaIngreso ? new Date(data.persona.fechaIngreso).toLocaleDateString("es-UY") : ""}</td>
                <td colSpan={6} className={`${styles.center} ${styles.bold}`}>
                  ENTREGA
                </td>
                <td className={`${styles.center} ${styles.bold}`}>T</td>
                <td colSpan={6} className={`${styles.center} ${styles.bold} ${styles.verticalDivider}`}>
                  DEVOLUCION
                </td>
                <td className={`${styles.center} ${styles.bold}`}>T</td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.bold}>
                  DIA
                </td>
                {entregaCols.map((value, idx) => (
                  <td key={`edia-${idx}`} className={styles.center}>
                    {getDatePart(value, "day")}
                  </td>
                ))}
                <td></td>
                {devolCols.map((value, idx) => (
                  <td key={`ddia-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                    {getDatePart(value, "day")}
                  </td>
                ))}
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.bold}>
                  MES
                </td>
                {entregaCols.map((value, idx) => (
                  <td key={`emes-${idx}`} className={styles.center}>
                    {getDatePart(value, "month")}
                  </td>
                ))}
                <td></td>
                {devolCols.map((value, idx) => (
                  <td key={`dmes-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                    {getDatePart(value, "month")}
                  </td>
                ))}
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.bold}>
                  ANO
                </td>
                {entregaCols.map((value, idx) => (
                  <td key={`eanio-${idx}`} className={styles.center}>
                    {getDatePart(value, "year")}
                  </td>
                ))}
                <td></td>
                {devolCols.map((value, idx) => (
                  <td key={`danio-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                    {getDatePart(value, "year")}
                  </td>
                ))}
                <td></td>
              </tr>
              <tr>
                <td colSpan={3} className={`${styles.bold} ${styles.thickTop}`}>
                  VESTUARIO
                </td>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <td key={`hn-e-${n}`} className={`${styles.center} ${styles.thickTop}`}>
                    {n}
                  </td>
                ))}
                <td className={`${styles.center} ${styles.bold} ${styles.thickTop}`}>T</td>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <td key={`hn-d-${n}`} className={`${styles.center} ${styles.thickTop} ${styles.verticalDivider}`}>
                    {n}
                  </td>
                ))}
                <td className={`${styles.center} ${styles.bold} ${styles.thickTop}`}>T</td>
              </tr>

              {data.matrix.map((row) => (
                <tr key={row.item}>
                  <td colSpan={3} className={styles.small}>
                    {row.item}
                  </td>
                  {row.entrega.map((value, idx) => (
                    <td key={`${row.item}-e-${idx}`} className={styles.center}>
                      {value}
                    </td>
                  ))}
                  <td className={styles.center}>{row.entregaTotal}</td>
                  {row.devolucion.map((value, idx) => (
                    <td key={`${row.item}-d-${idx}`} className={`${styles.center} ${styles.verticalDivider}`}>
                      {value}
                    </td>
                  ))}
                  <td className={styles.center}>{row.devolucionTotal}</td>
                </tr>
              ))}

              <tr>
                <td colSpan={15} className={`${styles.center} ${styles.bold}`}>
                  OBSERVACIONES
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.obsBox}>
                  {observacionesTexto.length > 0 ? (
                    <ul>
                      {observacionesTexto.map((line) => (
                        <li key={line} className={styles.small}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.firmaSpace}></td>
              </tr>
              <tr>
                <td colSpan={7} className={styles.small}>
                  Firma del alistado:
                </td>
                <td colSpan={8} className={styles.small}>
                  {data.persona.gradoPersonal}
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.center}>
                  {'El Encargado del Deposito General del Grp. "Brig. Gral. Manuel Oribe" de Artilleria 105mm No. 1.'}
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.center}>
                  Sgto. Esteban Martins - Wilson Lara
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.center}>
                  {'El Oficial de Administracion del Grp."Brig. "Gral. Manuel Oribe" de Artilleria 105mm No. 1.'}
                </td>
              </tr>
              <tr>
                <td colSpan={15} className={styles.center}>
                  Tte.2&ordm; Lucas Perez - Gerardo Otero
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
