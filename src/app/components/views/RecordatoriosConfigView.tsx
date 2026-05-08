"use client";

import { useMemo, useState } from "react";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { RecordatorioConfig, RecordatorioTarea, SoldadoWidgetVariant, UsuarioAdmin } from "@/types/entities";

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
  soldadoVariant: SoldadoWidgetVariant;
  onToggleSoldadoVariant: () => void;
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
  soldadoVariant,
  onToggleSoldadoVariant,
  onReload,
}: RecordatoriosConfigViewProps) {
  const [newTitulo, setNewTitulo] = useState("");
  const [newNota, setNewNota] = useState("");
  const [newFechaLimite, setNewFechaLimite] = useState("");
  const [newPrioridad, setNewPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");
  const [newUsuarioId, setNewUsuarioId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
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
    setShowCreateForm(false);
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
    <section className="mt-6 flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-stone-900">Recordatorios</h2>
          <p className="mt-1 text-sm font-medium text-stone-600">
            Gestiona tus tareas personales. Las alertas urgentes se destacan automáticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onReload()}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300/60 bg-white/50 px-4 py-2.5 text-sm font-bold text-stone-700 shadow-sm backdrop-blur-md transition-all hover:bg-stone-50 hover:shadow"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Sincronizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="ej-surface relative overflow-hidden p-5">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-5">
            <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">Total</p>
          <p className="mt-2 text-4xl font-black text-stone-900">{tasks.length}</p>
        </div>
        
        <div className="ej-surface relative overflow-hidden p-5 border-l-4 border-l-amber-500">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 text-amber-500 opacity-5">
            <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M11 7h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Pendientes</p>
          <p className="mt-2 text-4xl font-black text-amber-600">{pendingCount}</p>
        </div>

        <div className="ej-surface relative overflow-hidden p-5 border-l-4 border-l-rose-500 bg-rose-50/30">
          <div className="absolute right-0 top-0 -mr-4 -mt-4 text-rose-500 opacity-5">
            <svg className="h-32 w-32" fill="currentColor" viewBox="0 0 24 24">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-rose-600">Urgentes</p>
          <p className="mt-2 text-4xl font-black text-rose-600">{urgentCount}</p>
        </div>
      </div>

      {/* Widget Settings */}
      <section className="ej-surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between bg-white/50 backdrop-blur-md">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-stone-800">Widget Flotante</h3>
          <p className="text-xs font-medium text-stone-500">Configura el asistente visual en pantalla</p>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm font-bold text-stone-700">Mostrar muñeco</span>
            <div className="relative">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={config.mostrarMuneco}
                onChange={(event) => void onToggleWidget(event.target.checked)}
              />
              <div className="h-7 w-12 rounded-full bg-stone-300 transition-colors peer-checked:bg-[var(--color-ejercito-gold)]"></div>
              <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"></div>
            </div>
          </label>
          
          <div className="hidden h-8 w-px bg-stone-200 sm:block"></div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-stone-700">Modelo</span>
            <button
              type="button"
              onClick={onToggleSoldadoVariant}
              className="rounded-lg border border-stone-300/80 bg-stone-50 px-3 py-1.5 text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-100 transition-colors"
            >
              {soldadoVariant === "CLASICO" ? "Clásico" : "Táctico"}
            </button>
          </div>
        </div>
      </section>

      {/* Formulario Nueva Tarea */}
      <section className="ej-surface overflow-hidden transition-all shadow-sm">
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          aria-expanded={showCreateForm}
          className="flex w-full items-center justify-between bg-stone-100/50 p-4 transition-colors hover:bg-stone-100/80"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-ejercito-blue)] text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wide text-stone-800">Nueva Tarea</p>
          </div>
          <svg
            className={`h-5 w-5 text-stone-400 transition-transform duration-300 ${showCreateForm ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCreateForm && (
          <div className="border-t border-stone-200/60 p-5 bg-white/40">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {isAdmin && (
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 ml-1">Asignar a</label>
                  <select
                    value={selectedNewUsuarioId}
                    onChange={(event) => setNewUsuarioId(event.target.value)}
                    className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-2.5 text-sm font-medium shadow-sm focus:border-[var(--color-ejercito-blue)] focus:ring-2 focus:ring-[var(--color-ejercito-blue)]/20"
                  >
                    {assignableUsers.map((usuario) => (
                      <option key={`target-user-${usuario.usuarioId}`} value={usuario.usuarioId}>
                        {`${usuario.apellido}, ${usuario.nombre} (${usuario.username})`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 ml-1">Título</label>
                <input
                  value={newTitulo}
                  onChange={(event) => setNewTitulo(event.target.value)}
                  placeholder="Ej. Revisar reportes semanales"
                  maxLength={140}
                  className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-2.5 text-sm font-medium shadow-sm focus:border-[var(--color-ejercito-blue)] focus:ring-2 focus:ring-[var(--color-ejercito-blue)]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 ml-1">Prioridad</label>
                <select
                  value={newPrioridad}
                  onChange={(event) => setNewPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                  className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-2.5 text-sm font-medium shadow-sm focus:border-[var(--color-ejercito-blue)] focus:ring-2 focus:ring-[var(--color-ejercito-blue)]/20"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 ml-1">Fecha Límite</label>
                <input
                  type="date"
                  value={newFechaLimite}
                  onChange={(event) => setNewFechaLimite(event.target.value)}
                  className="w-full rounded-xl border border-stone-300/80 bg-white px-4 py-2.5 text-sm font-medium shadow-sm focus:border-[var(--color-ejercito-blue)] focus:ring-2 focus:ring-[var(--color-ejercito-blue)]/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-500 ml-1">Detalles (Opcional)</label>
                <textarea
                  value={newNota}
                  onChange={(event) => setNewNota(event.target.value)}
                  placeholder="Información adicional sobre la tarea..."
                  maxLength={2500}
                  rows={3}
                  className="w-full resize-y rounded-xl border border-stone-300/80 bg-white px-4 py-3 text-sm font-medium shadow-sm focus:border-[var(--color-ejercito-blue)] focus:ring-2 focus:ring-[var(--color-ejercito-blue)]/20"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={saving || newTitulo.trim().length < 2 || (isAdmin && selectedNewUsuarioId.trim() === "")}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-ejercito-blue)] px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-800 disabled:opacity-50 disabled:shadow-none"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                      <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Tarea
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Task List */}
      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="ej-surface flex items-center justify-center p-8">
            <p className="animate-pulse text-sm font-bold uppercase tracking-widest text-stone-400">Cargando tareas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="ej-surface flex flex-col items-center justify-center p-10 text-center border-dashed border-2">
            <div className="mb-3 rounded-full bg-stone-100 p-4">
              <svg className="h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-stone-600">No hay tareas pendientes</p>
            <p className="mt-1 text-xs text-stone-400">Las tareas que crees aparecerán aquí.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isUrgent =
              !task.completada && (task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey));
            const isEditing = editingId === task.tareaId;

            return (
              <article 
                key={task.tareaId} 
                className={`ej-surface relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${task.completada ? 'opacity-70' : ''} ${isUrgent ? 'border-rose-300 bg-rose-50/40' : ''}`}
              >
                {/* Indicador de urgencia */}
                {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500" />}

                {isEditing ? (
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                         <input
                          value={editTitulo}
                          onChange={(event) => setEditTitulo(event.target.value)}
                          maxLength={140}
                          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-inner focus:border-[var(--color-ejercito-blue)]"
                        />
                      </div>
                      <input
                        type="date"
                        value={editFechaLimite}
                        onChange={(event) => setEditFechaLimite(event.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-inner"
                      />
                      <select
                        value={editPrioridad}
                        onChange={(event) => setEditPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-inner"
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="URGENTE">Urgente</option>
                      </select>
                      <div className="sm:col-span-2">
                         <textarea
                          value={editNota}
                          onChange={(event) => setEditNota(event.target.value)}
                          rows={3}
                          maxLength={2500}
                          className="w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-medium shadow-inner"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-stone-200/60 pt-4">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-xl border border-stone-300 bg-stone-100 px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => void submitEdit()}
                        disabled={saving || editTitulo.trim().length < 2}
                        className="rounded-xl bg-[var(--color-ejercito-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-800 disabled:opacity-50"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 sm:p-5">
                    {/* Botón de completar visualmente prioritario en móviles */}
                    <div className="flex sm:flex-col sm:items-center justify-between sm:justify-start gap-3 border-b sm:border-b-0 border-stone-100 pb-3 sm:pb-0 sm:pr-4 sm:border-r">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative flex items-center justify-center">
                          <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={task.completada}
                            onChange={(event) => void onUpdateTask(task.tareaId, { completada: event.target.checked })}
                          />
                          <div className="h-6 w-6 rounded-md border-2 border-stone-300 bg-white transition-all peer-checked:border-[var(--color-ejercito-green)] peer-checked:bg-[var(--color-ejercito-green)] group-hover:border-stone-400"></div>
                          <svg className="absolute h-4 w-4 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 sm:hidden">Marcar Completada</span>
                      </label>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-base font-black truncate ${task.completada ? 'text-stone-500 line-through' : isUrgent ? 'text-rose-800' : 'text-stone-800'}`}>
                          {task.titulo}
                        </h4>
                        {!task.completada && task.prioridad === "URGENTE" && (
                          <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700">
                            Urgente
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center gap-3">
                        {task.fechaLimite ? (
                          <div className={`flex items-center gap-1 text-xs font-bold ${isUrgent ? 'text-rose-600' : 'text-stone-500'}`}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDateOnlyForDisplay(task.fechaLimite)}
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-stone-400">Sin fecha límite</span>
                        )}
                      </div>

                      {task.nota && (
                        <div className="mt-3 rounded-lg bg-stone-50/50 p-3 border border-stone-100">
                          <p className={`text-sm leading-relaxed ${task.completada ? 'text-stone-400' : 'text-stone-600'} whitespace-pre-wrap`}>
                            {task.nota}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex sm:mt-0 sm:flex-col justify-end gap-2 border-t sm:border-t-0 border-stone-100 pt-3 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => beginEdit(task)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-stone-600 shadow-sm transition-colors hover:bg-stone-50 hover:text-stone-900"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteTask(task.tareaId)}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 shadow-sm transition-colors hover:bg-rose-100 hover:text-rose-800"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-sm font-bold text-rose-700">{error}</p>
        </div>
      )}
    </section>
  );
}
