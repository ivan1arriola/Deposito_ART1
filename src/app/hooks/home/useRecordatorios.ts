import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CurrentUser,
  RecordatorioConfig,
  RecordatorioTarea,
  SoldadoWidgetVariant,
} from "@/types/entities";
import { api } from "@/lib/api";
import { toast } from "@/app/components/shared";

const SOLDADO_WIDGET_VARIANT_STORAGE_KEY = "soldado-recordatorio-widget-variant";

type RecordatorioTaskInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
  usuarioId?: string;
};

type RecordatorioTaskUpdateInput = Partial<{
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
}> & {
  completada?: boolean;
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

function isSoldadoWidgetVariant(value: string | null): value is SoldadoWidgetVariant {
  return value === "CLASICO" || value === "TACTICO";
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}

export function useRecordatorios(currentUser: CurrentUser | null | undefined) {
  const [tasks, setTasks] = useState<RecordatorioTarea[]>([]);
  const [config, setConfig] = useState<RecordatorioConfig>({ mostrarMuneco: true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soldadoWidgetVariant, setSoldadoWidgetVariant] = useState<SoldadoWidgetVariant>(() => {
    if (typeof window === "undefined") return "CLASICO";

    const stored = window.localStorage.getItem(SOLDADO_WIDGET_VARIANT_STORAGE_KEY);

    return isSoldadoWidgetVariant(stored) ? stored : "CLASICO";
  });

  const toastShownRef = useRef<string | null>(null);
  const requestRef = useRef<{ id: number; controller: AbortController | null }>({
    id: 0,
    controller: null,
  });

  const reset = useCallback(() => {
    requestRef.current.controller?.abort();
    requestRef.current.controller = null;
    setTasks([]);
    setConfig({ mostrarMuneco: true });
    setError(null);
  }, []);

  const load = useCallback(async () => {
    if (!currentUser || currentUser.accountType !== "SISTEMA") {
      reset();
      return;
    }

    requestRef.current.controller?.abort();

    const controller = new AbortController();
    const requestId = requestRef.current.id + 1;

    requestRef.current = { id: requestId, controller };

    setLoading(true);
    setError(null);

    try {
      const [tasksData, configData] = await Promise.all([
        api<RecordatorioTarea[]>("/api/tareas", { signal: controller.signal }),
        api<RecordatorioConfig>("/api/tareas/config", { signal: controller.signal }),
      ]);

      if (requestRef.current.id !== requestId) return;

      setTasks(tasksData);
      setConfig(configData);
    } catch (unknownError) {
      if (isAbortError(unknownError)) return;
      if (requestRef.current.id !== requestId) return;

      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "No se pudieron cargar los recordatorios.";

      setError(message);
    } finally {
      if (requestRef.current.id !== requestId) return;
      setLoading(false);
    }
  }, [currentUser, reset]);

  const create = useCallback(
    async (input: RecordatorioTaskInput) => {
      setSaving(true);
      setError(null);

      try {
        await api<RecordatorioTarea>("/api/tareas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        await load();
      } catch (unknownError) {
        const message =
          unknownError instanceof Error ? unknownError.message : "No se pudo crear la tarea.";

        setError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const update = useCallback(
    async (tareaId: string, input: RecordatorioTaskUpdateInput) => {
      setSaving(true);
      setError(null);

      try {
        await api<RecordatorioTarea>(`/api/tareas/${encodeURIComponent(tareaId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });

        await load();
      } catch (unknownError) {
        const message =
          unknownError instanceof Error ? unknownError.message : "No se pudo actualizar la tarea.";

        setError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const remove = useCallback(
    async (tareaId: string) => {
      setSaving(true);
      setError(null);

      try {
        await api<{ ok: boolean }>(`/api/tareas/${encodeURIComponent(tareaId)}`, {
          method: "DELETE",
        });

        await load();
      } catch (unknownError) {
        const message =
          unknownError instanceof Error ? unknownError.message : "No se pudo eliminar la tarea.";

        setError(message);
        toast.error(message);
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const updateConfig = useCallback(async (mostrarMuneco: boolean) => {
    setSaving(true);
    setError(null);

    try {
      const result = await api<RecordatorioConfig>("/api/tareas/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mostrarMuneco }),
      });

      setConfig(result);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "No se pudo actualizar la configuración del recordatorio.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, []);

  const toggleSoldadoWidgetVariant = useCallback(() => {
    setSoldadoWidgetVariant((current) => (current === "CLASICO" ? "TACTICO" : "CLASICO"));
  }, []);

  const pendingTasks = useMemo(() => tasks.filter((task) => !task.completada), [tasks]);

  const urgentPendingCount = useMemo(() => {
    const todayKey = getTodayKey();

    return pendingTasks.filter(
      (task) => task.prioridad === "URGENTE" || (task.fechaLimite && task.fechaLimite <= todayKey)
    ).length;
  }, [pendingTasks]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(SOLDADO_WIDGET_VARIANT_STORAGE_KEY, soldadoWidgetVariant);
  }, [soldadoWidgetVariant]);

  useEffect(() => {
    if (!currentUser) {
      reset();
      toastShownRef.current = null;
      return;
    }

    void load();
  }, [currentUser, load, reset]);

  useEffect(() => {
    return () => {
      requestRef.current.controller?.abort();
    };
  }, []);

  useEffect(() => {
    if (!currentUser || loading) return;
    if (toastShownRef.current === currentUser.usuarioId) return;

    toastShownRef.current = currentUser.usuarioId;

    if (pendingTasks.length <= 0) return;

    if (urgentPendingCount > 0) {
      toast.error(`Tenes ${urgentPendingCount} tarea(s) urgente(s) en tu recordatorio.`);
      return;
    }

    toast.info(`Tenes ${pendingTasks.length} tarea(s) pendiente(s) en tu recordatorio.`);
  }, [currentUser, loading, pendingTasks.length, urgentPendingCount]);

  return {
    tasks,
    config,
    loading,
    saving,
    error,
    soldadoWidgetVariant,
    pendingTasks,
    urgentPendingCount,
    load,
    create,
    update,
    remove,
    updateConfig,
    toggleSoldadoWidgetVariant,
  };
}
