import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MainView } from "@/types/views";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";
import { api } from "@/lib/api";
import { createEquipoHandler } from "@/lib/handlers-catalog";
import { GENERAL_TIPO_EQUIPO_CLAVE } from "@/lib/equipo-tipos";

export type EtiquetadoSection = "codigos_sie" | "listado_cajas" | "imprimir_todas";

type UseEtiquetadoParams = {
  activeView: MainView;
  canWrite: boolean;
  loadData: (showSpinner?: boolean) => Promise<void>;
  onStatusChange: (message: string) => void;
};

type CreateEtiquetadoCajaInput = {
  estanteria: string;
  piso: number;
  equipos: Array<{
    equipoId: string;
    cantidad: number;
  }>;
  codigosSIEIds: string[];
};

type PrintCajaInput = {
  codigoDepositoGeneral: number;
  orientacion: "horizontal" | "vertical";
};

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;

  const err = error as Record<string, unknown>;

  return (
    err.name === "AbortError" ||
    err.code === 20 ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("aborted")) ||
    (typeof err.message === "string" && err.message === "signal is aborted without reason")
  );
}

export function getEtiquetadoSection(view: MainView): EtiquetadoSection | null {
  if (view === "etiquetado_codigos_sie") return "codigos_sie";
  if (view === "etiquetado_registrar_caja") return "listado_cajas";
  if (view === "etiquetado_listado_cajas") return "listado_cajas";
  if (view === "etiquetado_imprimir_todas") return "imprimir_todas";
  return null;
}

export function useEtiquetado({
  activeView,
  canWrite,
  loadData,
  onStatusChange,
}: UseEtiquetadoParams) {
  const [data, setData] = useState<EtiquetadoDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef<{ id: number; controller: AbortController | null }>({
    id: 0,
    controller: null,
  });

  const activeSection = useMemo(() => getEtiquetadoSection(activeView), [activeView]);

  const load = useCallback(async () => {
    requestRef.current.controller?.abort();

    const controller = new AbortController();
    const requestId = requestRef.current.id + 1;

    requestRef.current = { id: requestId, controller };

    setLoading(true);
    setError(null);

    try {
      const nextData = await api<EtiquetadoDashboardData>("/api/etiquetado/dashboard", {
        signal: controller.signal,
      });

      if (requestRef.current.id !== requestId) return;

      setData(nextData);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      if (requestRef.current.id !== requestId) return;

      setError(err instanceof Error ? err.message : "No se pudo cargar el modulo de etiquetado.");
    } finally {
      if (requestRef.current.id !== requestId) return;

      setLoading(false);
    }
  }, []);

  const reload = useCallback(async () => {
    await load();
  }, [load]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    requestRef.current.controller?.abort();
    requestRef.current.controller = null;

    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      requestRef.current.controller?.abort();
    };
  }, []);

  useEffect(() => {
    if (!activeSection) return;
    if (loading) return;
    if (data) return;
    if (error) return;

    void load();
  }, [activeSection, data, error, loading, load]);

  useEffect(() => {
    if (activeSection) return;

    requestRef.current.controller?.abort();
    requestRef.current.controller = null;
  }, [activeSection]);

  const createItem = useCallback(
    async (input: { nombre: string }) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para crear.");
        return;
      }

      try {
        await createEquipoHandler(input.nombre, GENERAL_TIPO_EQUIPO_CLAVE, false, {
          onSuccess: async () => {
            onStatusChange("Equipo creado oculto de hoja de entrega.");
            await Promise.all([loadData(), load()]);
          },
          onError: (message) => onStatusChange(message),
        });
      } catch {
        // Error manejado en el handler.
      }
    },
    [canWrite, load, loadData, onStatusChange],
  );

  const createEstanteria = useCallback(
    async (nombreEstanteria: string, piso: number) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para crear.");
        return;
      }

      onStatusChange("Registrando estantería...");

      try {
        await api("/api/etiquetado/estanterias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombreEstanteria, piso }),
        });

        onStatusChange("Estanteria registrada.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo registrar la estantería.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const deleteEstanteria = useCallback(
    async (codigo: string, piso: number) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para eliminar.");
        return;
      }

      onStatusChange("Eliminando estantería...");

      try {
        await api(`/api/etiquetado/estanterias/${encodeURIComponent(codigo)}/${encodeURIComponent(String(piso))}`, {
          method: "DELETE",
        });

        onStatusChange("Estanteria eliminada.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo eliminar la estantería.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const createCodigoSIE = useCallback(
    async (input: { codigo: string; talla: string; equipoId: string; allowDuplicateCodigo?: boolean }) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para crear.");
        return;
      }

      onStatusChange("Registrando código SIE...");

      try {
        await api("/api/etiquetado/codigos-sie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        onStatusChange("Código SIE registrado.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo registrar el código SIE.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const updateCodigoSIE = useCallback(
    async (input: {
      originalCodigoSIEId: string;
      originalCodigo: string;
      codigo: string;
      talla: string;
      equipoId: string;
    }) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para editar.");
        return;
      }

      onStatusChange("Actualizando código SIE...");

      try {
        await api(
          `/api/etiquetado/codigos-sie/${encodeURIComponent(input.originalCodigo)}?id=${encodeURIComponent(
            input.originalCodigoSIEId,
          )}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codigo: input.codigo,
              talla: input.talla,
              equipoId: input.equipoId,
            }),
          },
        );

        onStatusChange("Código SIE actualizado.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo actualizar el código SIE.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const deleteCodigoSIE = useCallback(
    async (codigoSIEId: string, codigo: string) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para eliminar.");
        return;
      }

      onStatusChange("Eliminando código SIE...");

      try {
        await api(`/api/etiquetado/codigos-sie/${encodeURIComponent(codigo)}?id=${encodeURIComponent(codigoSIEId)}`, {
          method: "DELETE",
        });

        onStatusChange("Código SIE eliminado.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo eliminar el código SIE.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const createCaja = useCallback(
    async (input: CreateEtiquetadoCajaInput) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para crear.");
        return;
      }

      onStatusChange("Registrando caja...");

      try {
        const response = await api<{ ok: true; codigoDepositoGeneral: number }>("/api/etiquetado/cajas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        onStatusChange(`Caja ${response.codigoDepositoGeneral} registrada.`);
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo registrar la caja.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const deleteCaja = useCallback(
    async (codigoDepositoGeneral: number) => {
      if (!canWrite) {
        onStatusChange("No tienes permisos para eliminar.");
        return;
      }

      onStatusChange("Eliminando caja...");

      try {
        await api(`/api/etiquetado/cajas/${encodeURIComponent(String(codigoDepositoGeneral))}`, {
          method: "DELETE",
        });

        onStatusChange("Caja eliminada.");
        await load();
      } catch (err: unknown) {
        onStatusChange(err instanceof Error ? err.message : "No se pudo eliminar la caja.");
      }
    },
    [canWrite, load, onStatusChange],
  );

  const openEtiquetasPrint = useCallback(
    (options: {
      codigos?: number[];
      orientacion?: "horizontal" | "vertical";
    }) => {
      const params = new URLSearchParams();

      params.set("autoprint", "1");
      params.set("orientacion", options.orientacion ?? "horizontal");

      if (options.codigos && options.codigos.length > 0) {
        params.set("cajas", options.codigos.join(","));
      }

      const popup = window.open(`/etiquetas-cajas?${params.toString()}`, "_blank", "noopener,noreferrer");

      if (!popup) {
        onStatusChange("Permite ventanas emergentes para imprimir las etiquetas.");
        return false;
      }

      return true;
    },
    [onStatusChange],
  );

  const printEtiquetaCaja = useCallback(
    (codigoDepositoGeneral: number, orientacion: "horizontal" | "vertical") => {
      openEtiquetasPrint({ codigos: [codigoDepositoGeneral], orientacion });
    },
    [openEtiquetasPrint],
  );

  const printTodasEtiquetas = useCallback(
    (cajas: PrintCajaInput[]) => {
      const cajasNormalizadas = Array.isArray(cajas)
        ? cajas.filter(
            (entry) =>
              Number.isInteger(entry.codigoDepositoGeneral) &&
              entry.codigoDepositoGeneral > 0 &&
              (entry.orientacion === "horizontal" || entry.orientacion === "vertical"),
          )
        : [];

      const codigosHorizontal = cajasNormalizadas
        .filter((entry) => entry.orientacion === "horizontal")
        .map((entry) => entry.codigoDepositoGeneral);

      const codigosVertical = cajasNormalizadas
        .filter((entry) => entry.orientacion === "vertical")
        .map((entry) => entry.codigoDepositoGeneral);

      const openedHorizontal =
        codigosHorizontal.length > 0
          ? openEtiquetasPrint({ orientacion: "horizontal", codigos: codigosHorizontal })
          : true;

      const openedVertical =
        codigosVertical.length > 0
          ? openEtiquetasPrint({ orientacion: "vertical", codigos: codigosVertical })
          : true;

      if (!openedHorizontal || !openedVertical) return;

      if (codigosHorizontal.length > 0 && codigosVertical.length > 0) {
        onStatusChange(
          `Se abrieron 2 impresiones: ${codigosHorizontal.length} horizontal(es) y ${codigosVertical.length} vertical(es).`,
        );
      }
    },
    [openEtiquetasPrint, onStatusChange],
  );

  const printListadoCajas = useCallback(() => {
    const params = new URLSearchParams();

    params.set("autoprint", "1");

    const popup = window.open(`/listado-cajas?${params.toString()}`, "_blank", "noopener,noreferrer");

    if (!popup) {
      onStatusChange("Permite ventanas emergentes para imprimir el listado de cajas.");
    }
  }, [onStatusChange]);

  return {
    activeSection,
    data,
    loading,
    error,
    load,
    reload,
    clearError,
    reset,
    createItem,
    createEstanteria,
    deleteEstanteria,
    createCodigoSIE,
    updateCodigoSIE,
    deleteCodigoSIE,
    createCaja,
    deleteCaja,
    printEtiquetaCaja,
    printListadoCajas,
    printTodasEtiquetas,
  };
}
