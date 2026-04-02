"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { HojaEntregaSheetData } from "@/lib/hoja-entrega-data";
import { HojaEntregaCanonicalSheet } from "@/app/components/print/HojaEntregaCanonicalSheet";
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

function toCanonicalData(data: FichaData): HojaEntregaSheetData {
  return {
    persona: {
      ci: data.persona.ci,
      apellido1: data.persona.apellido1,
      apellido2: data.persona.apellido2,
      nombre1: data.persona.nombre1,
      nombre2: data.persona.nombre2,
      esReingreso: data.persona.esReingreso,
      fechaIngreso: data.persona.fechaIngreso,
      fechaIngresoOriginal: data.persona.fechaIngresoOriginal,
      rango: data.persona.gradoPersonal,
      rangoAbreviacion: data.persona.gradoPersonalAbreviado,
      bateria: data.persona.bateria,
      tallas: data.persona.tallas,
    },
    entregas: data.entregas,
    devoluciones: data.devoluciones,
    matrix: data.matrix,
    firmas: data.firmas,
    observaciones: data.observaciones,
  };
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

  const exportPdf = useCallback(async () => {
    if (!data) return;

    try {
      setStatus("Generando PDF A4...");
      const url = `/api/hoja-de-entrega/${encodeURIComponent(ci)}/pdf`;
      const link = document.createElement("a");
      link.href = url;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setStatus("Descarga iniciada.");
      window.setTimeout(() => setStatus("Hoja de entrega cargada."), 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      setStatus(`Error: ${message}`);
      window.setTimeout(() => setStatus("Hoja de entrega cargada."), 2000);
    }
  }, [ci, data]);

  const fechaImpresion = formatDisplayDate(new Date());
  const canonicalData = useMemo(() => (data ? toCanonicalData(data) : null), [data]);

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
          disabled={!canonicalData}
          aria-label="Imprimir o guardar hoja de entrega como PDF"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className={styles.statusLine} role="status" aria-live="polite">
        {loading ? <span>{status}</span> : status}
      </div>

      {canonicalData ? <HojaEntregaCanonicalSheet data={canonicalData} fechaImpresion={fechaImpresion} /> : null}
    </main>
  );
}
