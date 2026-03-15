"use client";

import { useMemo, useState } from "react";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { RecordatorioTarea } from "@/types/entities";

type RecordatorioCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
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

function sortPendingTasks(a: RecordatorioTarea, b: RecordatorioTarea) {
  if (a.prioridad !== b.prioridad) return a.prioridad === "URGENTE" ? -1 : 1;
  if (!a.fechaLimite && !b.fechaLimite) return 0;
  if (!a.fechaLimite) return 1;
  if (!b.fechaLimite) return -1;
  if (a.fechaLimite < b.fechaLimite) return -1;
  if (a.fechaLimite > b.fechaLimite) return 1;
  return 0;
}

function MiniSoldadoAvatar({ urgent }: { urgent: boolean }) {
  return (
    <span
      className={`soldier-avatar soldier-float relative inline-flex h-16 w-16 items-end justify-center ${
        urgent ? "soldier-urgent" : ""
      }`}
      aria-hidden="true"
    >
      <span className="absolute bottom-[3px] h-[8px] w-10 rounded-full bg-black/18 blur-[2px]" />
      <svg viewBox="0 0 120 120" className="relative h-[60px] w-[60px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]">
        <g className="soldier-arm-left soldier-svg-part">
          <rect x="19" y="56" width="14" height="30" rx="7" fill="#76855a" stroke="#51613b" strokeWidth="3" />
        </g>
        <g className="soldier-arm-right soldier-svg-part">
          <rect x="87" y="56" width="14" height="30" rx="7" fill="#76855a" stroke="#51613b" strokeWidth="3" />
        </g>
        <circle cx="26" cy="87" r="6" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="2.5" />
        <circle cx="94" cy="87" r="6" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="2.5" />

        <rect x="45" y="86" width="12" height="19" rx="6" fill="#76855a" stroke="#51613b" strokeWidth="3" className="soldier-leg-left soldier-svg-part" />
        <rect x="63" y="86" width="12" height="19" rx="6" fill="#76855a" stroke="#51613b" strokeWidth="3" className="soldier-leg-right soldier-svg-part" />
        <rect x="39" y="101" width="22" height="9" rx="4.5" fill="#2f2c29" />
        <rect x="61" y="101" width="22" height="9" rx="4.5" fill="#2f2c29" />

        <rect x="36" y="47" width="48" height="44" rx="14" fill="#7d8a61" stroke="#51613b" strokeWidth="3" />
        <rect x="41" y="60" width="14" height="15" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
        <rect x="65" y="60" width="14" height="15" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
        <rect x="58" y="52" width="4" height="36" rx="2" fill="#4f4336" />
        <circle cx="60" cy="66" r="2.4" fill="#d9c46b" />
        <circle cx="60" cy="74" r="2.4" fill="#d9c46b" />

        <rect x="53" y="41" width="14" height="8" rx="4" fill="#e1b490" />
        <ellipse cx="60" cy="31" rx="18" ry="15" fill="#f0c6a3" stroke="#c89e7e" strokeWidth="3" />
        <circle cx="52.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
        <circle cx="67.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
        <path d="M54 38 Q60 42 66 38" fill="none" stroke="#865f4b" strokeWidth="2.3" strokeLinecap="round" />
        <ellipse cx="47" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />
        <ellipse cx="73" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />

        <path d="M41 23 C43 13, 53 8, 60 8 C67 8, 77 13, 79 23 L79 26 L41 26 Z" fill="#66704d" stroke="#4f5839" strokeWidth="3" />
        <rect x="49" y="19" width="22" height="6" rx="3" fill="#738159" />
        <circle cx="60" cy="22" r="3" fill="#d9c46b" />
      </svg>
    </span>
  );
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
  const [showComposer, setShowComposer] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [prioridad, setPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completada).sort(sortPendingTasks),
    [tasks],
  );
  const completedCount = tasks.length - pendingTasks.length;
  const todayKey = todayIsoDate();
  const urgentCount = useMemo(
    () => pendingTasks.filter((task) => task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey)).length,
    [pendingTasks, todayKey],
  );

  const visibleTasks = pendingTasks.slice(0, 4);

  const submit = async () => {
    const titleTrimmed = titulo.trim();
    if (titleTrimmed.length < 2) return;

    await onCreateTask({
      titulo: titleTrimmed,
      nota: nota.trim(),
      fechaLimite: fechaLimite.trim() === "" ? null : fechaLimite.trim(),
      prioridad,
    });

    setTitulo("");
    setNota("");
    setFechaLimite("");
    setPrioridad("NORMAL");
    setShowComposer(false);
  };

  return (
    <div className="fixed bottom-4 left-3 z-[360] md:bottom-6 md:left-6">
      <style>{`
        @keyframes soldier-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes soldier-eye-blink {
          0%, 45%, 47%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.15); }
        }

        @keyframes soldier-arm-left {
          0%, 100% { transform: rotate(14deg); }
          50% { transform: rotate(22deg); }
        }

        @keyframes soldier-arm-right {
          0%, 100% { transform: rotate(-14deg); }
          50% { transform: rotate(-22deg); }
        }

        @keyframes soldier-leg-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg); }
        }

        @keyframes soldier-leg-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-6deg); }
        }

        @keyframes urgent-pulse {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(190, 18, 60, 0)); }
          50% { filter: drop-shadow(0 0 6px rgba(190, 18, 60, 0.55)); }
        }

        .soldier-avatar {
          transform-origin: center bottom;
        }

        .soldier-svg-part {
          transform-box: fill-box;
        }

        .soldier-float {
          animation: soldier-float 2.1s ease-in-out infinite;
        }

        .soldier-eye {
          transform-origin: center center;
          animation: soldier-eye-blink 4.8s ease-in-out infinite;
        }

        .soldier-arm-left {
          transform-origin: top center;
          animation: soldier-arm-left 1.8s ease-in-out infinite;
        }

        .soldier-arm-right {
          transform-origin: top center;
          animation: soldier-arm-right 1.8s ease-in-out infinite;
        }

        .soldier-leg-left {
          transform-origin: top center;
          animation: soldier-leg-left 1.8s ease-in-out infinite;
        }

        .soldier-leg-right {
          transform-origin: top center;
          animation: soldier-leg-right 1.8s ease-in-out infinite;
        }

        .soldier-urgent {
          animation: soldier-float 2.1s ease-in-out infinite, urgent-pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="group relative inline-flex items-end bg-transparent px-0 py-0 text-xs font-semibold text-stone-800 transition"
          title="Recordatorios del soldado"
        >
          <span className="relative inline-flex items-end">
            <MiniSoldadoAvatar urgent={urgentCount > 0} />
            <span className="absolute bottom-0 -right-1 inline-flex min-w-[1.2rem] items-center justify-center rounded-full bg-stone-800 px-1 text-[10px] font-bold text-white shadow">
              {pendingTasks.length}
            </span>
            {urgentCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-700 px-1 text-[10px] font-bold text-white">
                !
              </span>
            ) : null}
          </span>
        </button>

        {!open && (urgentCount > 0 || pendingTasks.length > 0) ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`hidden max-w-[13rem] items-center rounded-2xl border px-3 py-2 text-left text-xs shadow-md sm:inline-flex ${
              urgentCount > 0
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-stone-300 bg-white/90 text-stone-700"
            }`}
          >
            {urgentCount > 0
              ? `${urgentCount} tarea(s) vencida(s).`
              : pendingTasks.length > 0
                ? "Soldado: revisa tus tareas."
                : "Sin tareas pendientes."}
          </button>
        ) : null}
      </div>

      {open ? (
        <aside className="relative mt-2 max-h-[70vh] w-[min(23.5rem,calc(100vw-1rem))] overflow-auto rounded-2xl border border-stone-300 bg-white p-3 shadow-2xl">
          <div className="absolute -top-2 left-8 h-4 w-4 rotate-45 border-l border-t border-stone-300 bg-white" />

          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-stone-900">Recordatorios</p>
              <p className="mt-1 text-xs text-stone-600">
                {urgentCount > 0
                  ? `${urgentCount} tarea(s) vencida(s) o para hoy.`
                  : "Panel compacto para no tapar la vista principal."}
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

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Pendientes</p>
              <p className="text-sm font-bold text-stone-900">{pendingTasks.length}</p>
            </div>
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-stone-500">Hechas</p>
              <p className="text-sm font-bold text-stone-900">{completedCount}</p>
            </div>
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-rose-600">Urgentes</p>
              <p className="text-sm font-bold text-rose-700">{urgentCount}</p>
            </div>
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
                  const isUrgent = task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey);
                  return (
                    <article
                      key={task.tareaId}
                      className={`rounded-lg border px-2 py-2 ${
                        isUrgent ? "border-rose-300 bg-rose-50/60" : "border-stone-200 bg-stone-50"
                      }`}
                    >
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
                          <div className="flex flex-wrap items-center gap-1">
                            <p className={`text-xs font-semibold ${isUrgent ? "text-rose-700" : "text-stone-900"}`}>
                              {task.titulo}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                task.prioridad === "URGENTE" ? "bg-rose-100 text-rose-700" : "bg-stone-200 text-stone-600"
                              }`}
                            >
                              {task.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                            </span>
                          </div>
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
              <p className="text-[11px] text-stone-500">{`+${pendingTasks.length - visibleTasks.length} tarea(s) mas en Config.`}</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowComposer((current) => !current)}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              {showComposer ? "Ocultar bloc" : "Abrir bloc"}
            </button>
            <button
              type="button"
              onClick={onOpenConfig}
              className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Ver todas
            </button>
          </div>

          {showComposer ? (
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
                <select
                  value={prioridad}
                  onChange={(event) => setPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                  className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="NORMAL">Prioridad: Normal</option>
                  <option value="URGENTE">Prioridad: Urgente</option>
                </select>
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
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
