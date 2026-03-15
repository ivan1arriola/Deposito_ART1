"use client";

import { useMemo, useState } from "react";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { RecordatorioTarea } from "@/types/entities";

type RecordatorioCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
};

type SoldadoRecordatorioWidgetProps = {
  tasks: RecordatorioTarea[];
  loading: boolean;
  saving: boolean;
  onCreateTask: (input: RecordatorioCreateInput) => Promise<void> | void;
  onToggleTask: (tareaId: string, completada: boolean) => Promise<void> | void;
  onOpenConfig: () => void;
};

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function SoldadoRecordatorioWidget({
  tasks,
  loading,
  saving,
  onCreateTask,
  onToggleTask,
  onOpenConfig,
}: SoldadoRecordatorioWidgetProps) {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");

  const pendingTasks = useMemo(() => tasks.filter((task) => !task.completada), [tasks]);
  const todayKey = todayIsoDate();
  const urgentCount = useMemo(
    () => pendingTasks.filter((task) => task.fechaLimite && task.fechaLimite <= todayKey).length,
    [pendingTasks, todayKey],
  );

  const visibleTasks = pendingTasks.slice(0, 6);

  const submit = async () => {
    const titleTrimmed = titulo.trim();
    if (titleTrimmed.length < 2) return;

    await onCreateTask({
      titulo: titleTrimmed,
      nota: nota.trim(),
      fechaLimite: fechaLimite.trim() === "" ? null : fechaLimite.trim(),
    });

    setTitulo("");
    setNota("");
    setFechaLimite("");
  };

  return (
    <div className="fixed bottom-4 left-3 z-[210] md:bottom-6 md:left-6">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group relative inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/95 px-3 py-2 text-xs font-semibold text-stone-800 shadow-lg transition hover:bg-white"
        title="Recordatorios del soldado"
      >
        <span className="loading-pulse inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-900">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11V9a6 6 0 1112 0v2m-8 4h4m-6 0h8a2 2 0 002-2v-2H6v2a2 2 0 002 2z" />
          </svg>
        </span>
        <span className="hidden sm:inline">Soldado</span>
        <span className="rounded-full bg-stone-800 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingTasks.length}</span>
        {urgentCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-700 px-1 text-[10px] font-bold text-white">
            !
          </span>
        ) : null}
      </button>

      {open ? (
        <aside className="mt-2 w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border border-stone-300 bg-white p-3 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-stone-900">Recordatorios</p>
              <p className="mt-1 text-xs text-stone-600">
                {urgentCount > 0
                  ? `${urgentCount} tarea(s) con fecha vencida o para hoy.`
                  : "Tus tareas pendientes, sin tapar la vista principal."}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenConfig}
              className="rounded-lg border border-stone-300 px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100"
            >
              Config
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {loading ? <p className="text-xs text-stone-500">Cargando tareas...</p> : null}
            {!loading && visibleTasks.length === 0 ? (
              <p className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2 text-xs text-stone-500">
                No hay tareas pendientes.
              </p>
            ) : null}
            {!loading
              ? visibleTasks.map((task) => {
                  const isUrgent = Boolean(task.fechaLimite && task.fechaLimite <= todayKey);
                  return (
                    <article key={task.tareaId} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-2">
                      <div className="flex items-start gap-2">
                        <button
                          type="button"
                          onClick={() => void onToggleTask(task.tareaId, !task.completada)}
                          className="mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-stone-400 bg-white text-stone-700 hover:bg-stone-100"
                          aria-label="Marcar como completada"
                        >
                          {task.completada ? "x" : ""}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold ${isUrgent ? "text-rose-700" : "text-stone-900"}`}>
                            {task.titulo}
                          </p>
                          {task.nota ? <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-600">{task.nota}</p> : null}
                          {task.fechaLimite ? (
                            <p className={`mt-0.5 text-[11px] ${isUrgent ? "font-semibold text-rose-700" : "text-stone-500"}`}>
                              {`Limite: ${formatDateOnlyForDisplay(task.fechaLimite)}`}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })
              : null}
            {!loading && pendingTasks.length > visibleTasks.length ? (
              <p className="text-[11px] text-stone-500">{`+${pendingTasks.length - visibleTasks.length} tarea(s) mas en Configuracion.`}</p>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-stone-200 bg-white p-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nueva tarea</p>
            <div className="mt-2 space-y-2">
              <input
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                placeholder="Titulo"
                maxLength={140}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              />
              <input
                type="date"
                value={fechaLimite}
                onChange={(event) => setFechaLimite(event.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              />
              <textarea
                value={nota}
                onChange={(event) => setNota(event.target.value)}
                placeholder="Nota breve"
                maxLength={2500}
                rows={2}
                className="w-full resize-y rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
              />
              <button
                type="button"
                disabled={saving || titulo.trim().length < 2}
                onClick={() => void submit()}
                className="ej-button w-full rounded-lg px-2 py-1.5 text-xs font-semibold disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Agregar tarea"}
              </button>
            </div>
          </div>
        </aside>
      ) : null}
    </div>
  );
}
