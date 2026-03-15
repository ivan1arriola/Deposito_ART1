"use client";

import { useMemo, useState } from "react";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { RecordatorioConfig, RecordatorioTarea, UsuarioAdmin } from "@/types/entities";

type TaskInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
  usuarioId?: string;
};

type RecordatoriosConfigViewProps = {
  tasks: RecordatorioTarea[];
  config: RecordatorioConfig;
  isAdmin: boolean;
  currentUserId: string | null;
  userOptions: UsuarioAdmin[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  onCreateTask: (input: TaskInput) => Promise<void> | void;
  onUpdateTask: (tareaId: string, input: Partial<Omit<TaskInput, "usuarioId">> & { completada?: boolean }) => Promise<void> | void;
  onDeleteTask: (tareaId: string) => Promise<void> | void;
  onToggleWidget: (mostrar: boolean) => Promise<void> | void;
  onReload: () => Promise<void> | void;
};

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RecordatoriosConfigView({
  tasks,
  config,
  isAdmin,
  currentUserId,
  userOptions,
  loading,
  saving,
  error,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleWidget,
  onReload,
}: RecordatoriosConfigViewProps) {
  const [newTitulo, setNewTitulo] = useState("");
  const [newNota, setNewNota] = useState("");
  const [newFechaLimite, setNewFechaLimite] = useState("");
  const [newPrioridad, setNewPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");
  const [newUsuarioId, setNewUsuarioId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editNota, setEditNota] = useState("");
  const [editFechaLimite, setEditFechaLimite] = useState("");
  const [editPrioridad, setEditPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");
  const selectedNewUsuarioId = newUsuarioId === "" ? (currentUserId ?? "") : newUsuarioId;

  const todayKey = todayIsoDate();
  const assignableUsers = useMemo(() => userOptions.filter((usuario) => usuario.activo), [userOptions]);
  const pendingCount = useMemo(() => tasks.filter((task) => !task.completada).length, [tasks]);
  const urgentCount = useMemo(
    () =>
      tasks.filter(
        (task) =>
          !task.completada && (task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey)),
      ).length,
    [tasks, todayKey],
  );

  const beginEdit = (task: RecordatorioTarea) => {
    setEditingId(task.tareaId);
    setEditTitulo(task.titulo);
    setEditNota(task.nota);
    setEditFechaLimite(task.fechaLimite ?? "");
    setEditPrioridad(task.prioridad);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitulo("");
    setEditNota("");
    setEditFechaLimite("");
    setEditPrioridad("NORMAL");
  };

  const submitCreate = async () => {
    const title = newTitulo.trim();
    if (title.length < 2) return;
    const targetUsuarioId = isAdmin ? selectedNewUsuarioId.trim() : "";
    if (isAdmin && targetUsuarioId === "") return;
    await onCreateTask({
      titulo: title,
      nota: newNota.trim(),
      fechaLimite: newFechaLimite.trim() === "" ? null : newFechaLimite.trim(),
      prioridad: newPrioridad,
      usuarioId: targetUsuarioId === "" ? undefined : targetUsuarioId,
    });
    setNewTitulo("");
    setNewNota("");
    setNewFechaLimite("");
    setNewPrioridad("NORMAL");
  };

  const submitEdit = async () => {
    if (!editingId) return;
    const title = editTitulo.trim();
    if (title.length < 2) return;
    await onUpdateTask(editingId, {
      titulo: title,
      nota: editNota.trim(),
      fechaLimite: editFechaLimite.trim() === "" ? null : editFechaLimite.trim(),
      prioridad: editPrioridad,
    });
    cancelEdit();
  };

  return (
    <section className="mt-6 grid grid-cols-1 gap-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Recordatorios del soldado</h2>
            <p className="mt-1 text-xs text-stone-600">
              Tareas personales con fecha limite. Si una tarea vence hoy o esta vencida, se marca con alerta roja.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onReload()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Recargar
          </button>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Total</p>
            <p className="text-lg font-bold text-stone-900">{tasks.length}</p>
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-stone-500">Pendientes</p>
            <p className="text-lg font-bold text-stone-900">{pendingCount}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-rose-600">Urgentes</p>
            <p className="text-lg font-bold text-rose-700">{urgentCount}</p>
          </div>
        </div>

        <label className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2">
          <span className="text-sm font-semibold text-stone-800">Mostrar muñeco recordatorio</span>
          <input
            type="checkbox"
            checked={config.mostrarMuneco}
            onChange={(event) => void onToggleWidget(event.target.checked)}
          />
        </label>

        <section className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            aria-expanded={showCreateForm}
            aria-controls="recordatorios-create-panel"
            className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nueva tarea</p>
            <svg
              className={`h-4 w-4 text-stone-500 transition-transform ${showCreateForm ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showCreateForm ? (
            <div id="recordatorios-create-panel" className="mt-2 space-y-2">
              {isAdmin ? (
                <select
                  value={selectedNewUsuarioId}
                  onChange={(event) => setNewUsuarioId(event.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  {assignableUsers.map((usuario) => (
                    <option key={`target-user-${usuario.usuarioId}`} value={usuario.usuarioId}>
                      {`${usuario.apellido}, ${usuario.nombre} (${usuario.username})`}
                    </option>
                  ))}
                </select>
              ) : null}
              <input
                value={newTitulo}
                onChange={(event) => setNewTitulo(event.target.value)}
                placeholder="Titulo"
                maxLength={140}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
              <select
                value={newPrioridad}
                onChange={(event) => setNewPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="NORMAL">Prioridad: Normal</option>
                <option value="URGENTE">Prioridad: Urgente</option>
              </select>
              <input
                type="date"
                value={newFechaLimite}
                onChange={(event) => setNewFechaLimite(event.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
              <textarea
                value={newNota}
                onChange={(event) => setNewNota(event.target.value)}
                placeholder="Nota o detalle"
                maxLength={2500}
                rows={3}
                className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              />
                <button
                  type="button"
                  onClick={() => void submitCreate()}
                  disabled={saving || newTitulo.trim().length < 2 || (isAdmin && selectedNewUsuarioId.trim() === "")}
                  className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                >
                {saving ? "Guardando..." : "Agregar tarea"}
              </button>
            </div>
          ) : null}
        </section>

        <section className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-stone-600">Cargando tareas...</p>
          ) : tasks.length === 0 ? (
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">No hay tareas registradas.</p>
          ) : (
            tasks.map((task) => {
              const isUrgent =
                !task.completada && (task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey));
              const isEditing = editingId === task.tareaId;

              return (
                <article key={task.tareaId} className={`rounded-xl border p-3 ${isUrgent ? "border-rose-300 bg-rose-50/60" : "border-stone-200 bg-white"}`}>
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editTitulo}
                        onChange={(event) => setEditTitulo(event.target.value)}
                        maxLength={140}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                      />
                      <input
                        type="date"
                        value={editFechaLimite}
                        onChange={(event) => setEditFechaLimite(event.target.value)}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                      />
                      <select
                        value={editPrioridad}
                        onChange={(event) => setEditPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="NORMAL">Prioridad: Normal</option>
                        <option value="URGENTE">Prioridad: Urgente</option>
                      </select>
                      <textarea
                        value={editNota}
                        onChange={(event) => setEditNota(event.target.value)}
                        rows={3}
                        maxLength={2500}
                        className="w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void submitEdit()}
                          disabled={saving || editTitulo.trim().length < 2}
                          className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`text-sm font-semibold ${isUrgent ? "text-rose-700" : "text-stone-900"}`}>
                              {task.titulo}
                              {isUrgent ? " !" : ""}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                task.prioridad === "URGENTE" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {task.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                            </span>
                          </div>
                          {task.fechaLimite ? (
                            <p className={`text-xs ${isUrgent ? "font-semibold text-rose-700" : "text-stone-500"}`}>
                              {`Limite: ${formatDateOnlyForDisplay(task.fechaLimite)}`}
                            </p>
                          ) : (
                            <p className="text-xs text-stone-500">Sin fecha limite</p>
                          )}
                        </div>
                        <label className="inline-flex items-center gap-1 text-xs font-semibold text-stone-700">
                          <input
                            type="checkbox"
                            checked={task.completada}
                            onChange={(event) => void onUpdateTask(task.tareaId, { completada: event.target.checked })}
                          />
                          Completada
                        </label>
                      </div>
                      {task.nota ? <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{task.nota}</p> : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(task)}
                          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteTask(task.tareaId)}
                          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })
          )}
        </section>

        {error ? <p className="mt-3 text-xs font-medium text-rose-700">{error}</p> : null}
      </article>
    </section>
  );
}
