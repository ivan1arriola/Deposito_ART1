"use client";

import { ListChecks, ListPlus, Move } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { RenderSoldadoAvatar } from "./soldado-avatar/RenderSoldadoAvatar";
import type {
  ActiveSoldierDialogue,
  SoldierDialogueKind,
  SoldadoRecordatorioWidgetProps,
  TaskFilter,
  WidgetCorner,
} from "./soldado-widget/types";
import {
  clamp,
  clampWidgetPosition,
  isTaskUrgent,
  isWidgetCorner,
  normalizeFirstName,
  offsetIsoDate,
  resolveCornerFromPoint,
  SOLDIER_DIALOGUES,
  sortCompletedTasks,
  sortPendingTasks,
  todayIsoDate,
  WIDGET_CORNER_STORAGE_KEY,
  WIDGET_DRAG_THRESHOLD_PX,
} from "./soldado-widget/utils";

export function SoldadoRecordatorioWidget({
  tasks,
  loading,
  saving,
  displayName,
  variant = "CLASICO",
  onCreateTask,
  onToggleTask,
  onOpenConfig,
}: SoldadoRecordatorioWidgetProps) {
  const isMobile = useMediaQuery("(max-width: 599.95px)");
  const isDesktop = useMediaQuery("(min-width: 900px)");
  const isLargeDesktop = useMediaQuery("(min-width: 1200px)");
  const isExtraLargeDesktop = useMediaQuery("(min-width: 1536px)");

  const [open, setOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ left: number; top: number } | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [filter, setFilter] = useState<TaskFilter>("PENDIENTES");
  const [activeDialogue, setActiveDialogue] = useState<ActiveSoldierDialogue | null>(null);
  const [corner, setCorner] = useState<WidgetCorner>(() => {
    if (typeof window === "undefined") return "BOTTOM_LEFT";
    const storedCorner = window.localStorage.getItem(WIDGET_CORNER_STORAGE_KEY);
    return isWidgetCorner(storedCorner) ? storedCorner : "BOTTOM_LEFT";
  });
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [prioridad, setPrioridad] = useState<"NORMAL" | "URGENTE">("NORMAL");
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const initialDialogueShownRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    offsetX: number;
    offsetY: number;
    widgetWidth: number;
    widgetHeight: number;
  } | null>(null);

  const todayKey = todayIsoDate();

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completada).sort(sortPendingTasks),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completada).sort(sortCompletedTasks),
    [tasks]
  );
  const urgentPendingTasks = useMemo(
    () => pendingTasks.filter((task) => isTaskUrgent(task, todayKey)),
    [pendingTasks, todayKey]
  );

  const urgentCount = urgentPendingTasks.length;
  const completedCount = completedTasks.length;
  const hasPendingTasks = pendingTasks.length > 0;
  const statusHeadline =
    urgentCount > 0
      ? `${urgentCount} urgente(s)`
      : hasPendingTasks
        ? `${pendingTasks.length} pendiente(s)`
        : "Sin pendientes";
  const statusCaption =
    urgentCount > 0
      ? "Requiere atencion hoy"
      : hasPendingTasks
        ? "Hay tareas en seguimiento"
        : "Todo al dia";
  const statusSurface =
    urgentCount > 0
      ? {
          backgroundImage: "linear-gradient(138deg, #7f1d1d 0%, #b91c1c 100%)",
          borderColor: "rgba(127, 29, 29, 0.74)",
          color: "#fff1f2",
          mutedColor: "rgba(255, 241, 242, 0.84)",
        }
      : hasPendingTasks
        ? {
            backgroundImage: "linear-gradient(138deg, #3f5038 0%, #5f704f 100%)",
            borderColor: "rgba(63, 80, 56, 0.72)",
            color: "#f5f2e7",
            mutedColor: "rgba(245, 242, 231, 0.84)",
          }
        : {
            backgroundImage: "linear-gradient(138deg, #f3f4ef 0%, #e5e7dc 100%)",
            borderColor: "rgba(120, 128, 104, 0.36)",
            color: "#2f3a2d",
            mutedColor: "rgba(47, 58, 45, 0.72)",
          };

  const activeList = useMemo(() => {
    if (filter === "HECHAS") return completedTasks;
    if (filter === "URGENTES") return urgentPendingTasks;
    return pendingTasks;
  }, [filter, completedTasks, urgentPendingTasks, pendingTasks]);

  const visibleTasks = activeList.slice(0, isMobile ? 8 : 6);
  const hiddenCount = Math.max(0, activeList.length - visibleTasks.length);
  const isRightCorner = corner === "TOP_RIGHT" || corner === "BOTTOM_RIGHT";
  const isTopCorner = corner === "TOP_LEFT" || corner === "TOP_RIGHT";
  const avatarSize = isMobile
    ? 82
    : isExtraLargeDesktop
      ? 132
      : isLargeDesktop
        ? 120
        : isDesktop
          ? 108
          : 96;
  const badgeSize = Math.max(20, Math.round(avatarSize * 0.24));
  const badgeFontSize = Math.max(11, Math.round(avatarSize * 0.13));
  const urgentPillHeight = Math.max(18, Math.round(avatarSize * 0.22));
  const urgentPillFontSize = Math.max(9, Math.round(avatarSize * 0.1));
  const urgentPillMinWidth = Math.max(40, Math.round(avatarSize * 0.52));
  const urgentIndicatorLabel = urgentCount > 99 ? "Urg 99+" : `Urg ${urgentCount}`;
  const dragHandleSize = Math.max(20, Math.round(avatarSize * 0.24));
  const dragHandleIconSize = Math.max(14, Math.round(avatarSize * 0.17));

  const resolveLeftBoundary = useCallback(
    (viewportPadding: number) => {
      if (typeof window === "undefined") return viewportPadding;
      const sidebar = document.querySelector<HTMLElement>('[data-home-sidebar="true"]');
      if (!sidebar) return viewportPadding;

      const sidebarStyles = window.getComputedStyle(sidebar);
      if (sidebarStyles.display === "none" || sidebarStyles.visibility === "hidden") {
        return viewportPadding;
      }

      const sidebarRect = sidebar.getBoundingClientRect();
      if (sidebarRect.width <= 0 || sidebarRect.right <= 0) {
        return viewportPadding;
      }

      const gapToSidebar = isMobile ? viewportPadding : 10;
      return Math.max(viewportPadding, Math.ceil(sidebarRect.right + gapToSidebar));
    },
    [isMobile]
  );

  const sideOffset = isMobile ? 10 : 24;
  const verticalOffset = isMobile ? 14 : 24;
  const [leftBoundary, setLeftBoundary] = useState(sideOffset);

  useEffect(() => {
    const syncLeftBoundary = () => {
      setLeftBoundary(resolveLeftBoundary(sideOffset));
    };

    syncLeftBoundary();
    window.addEventListener("resize", syncLeftBoundary);

    const sidebar = document.querySelector<HTMLElement>('[data-home-sidebar="true"]');
    const observer =
      typeof ResizeObserver !== "undefined" && sidebar
        ? new ResizeObserver(syncLeftBoundary)
        : null;
    if (observer && sidebar) {
      observer.observe(sidebar);
    }

    return () => {
      window.removeEventListener("resize", syncLeftBoundary);
      observer?.disconnect();
    };
  }, [sideOffset, resolveLeftBoundary]);

  const widgetPositionStyle = useMemo(
    () => ({
      ...(corner === "TOP_LEFT" || corner === "TOP_RIGHT"
        ? { top: verticalOffset }
        : { bottom: verticalOffset }),
      ...(corner === "TOP_LEFT" || corner === "BOTTOM_LEFT"
        ? { left: leftBoundary }
        : { right: sideOffset }),
    }),
    [corner, leftBoundary, sideOffset, verticalOffset]
  );

  const widgetRuntimePositionStyle = dragPreview
    ? {
        top: dragPreview.top,
        left: dragPreview.left,
        right: "auto" as const,
        bottom: "auto" as const,
      }
    : widgetPositionStyle;
  const displayFirstName = normalizeFirstName(displayName);

  const canSubmit = !saving && titulo.trim().length >= 2;

  const triggerDialogue = useCallback(
    (kind: SoldierDialogueKind) => {
      const definition = SOLDIER_DIALOGUES[kind];
      const message = definition.buildMessage({
        displayName: displayFirstName,
        now: new Date(),
        pendingCount: pendingTasks.length,
        urgentCount,
      });
      if (!message) return;

      setActiveDialogue({
        kind,
        message,
      });
    },
    [displayFirstName, pendingTasks.length, urgentCount]
  );

  const dismissDialogue = useCallback(() => {
    setActiveDialogue(null);
  }, []);

  useEffect(() => {
    if (initialDialogueShownRef.current) return;
    initialDialogueShownRef.current = true;
    const greetingTimerId = window.setTimeout(() => {
      triggerDialogue(pendingTasks.length > 0 ? "TASKS_TO_DO" : "TIME_GREETING");
    }, 80);
    return () => window.clearTimeout(greetingTimerId);
  }, [pendingTasks.length, triggerDialogue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WIDGET_CORNER_STORAGE_KEY, corner);
  }, [corner]);

  const closePanel = () => {
    setOpen(false);
    setShowComposer(false);
    setFilter("PENDIENTES");
  };

  const openPanel = (initialComposer: boolean) => {
    setOpen(true);
    setShowComposer(initialComposer);
    setControlsOpen(false);
  };

  const openComposer = () => {
    openPanel(true);
  };

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
    setFilter("PENDIENTES");
  };

  const handleSoldierPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    dismissDialogue();
    const widgetRect = widgetContainerRef.current?.getBoundingClientRect();
    if (!widgetRect) return;
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      offsetX: event.clientX - widgetRect.left,
      offsetY: event.clientY - widgetRect.top,
      widgetWidth: widgetRect.width,
      widgetHeight: widgetRect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSoldierPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const movedDistance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
    if (movedDistance >= WIDGET_DRAG_THRESHOLD_PX) {
      state.moved = true;
      setIsDragging(true);
      const viewportPadding = isMobile ? 8 : 12;
      const minLeft = resolveLeftBoundary(viewportPadding);
      const maxLeft = window.innerWidth - state.widgetWidth - viewportPadding;
      const maxTop = window.innerHeight - state.widgetHeight - viewportPadding;
      const nextLeft = clamp(event.clientX - state.offsetX, minLeft, Math.max(minLeft, maxLeft));
      const nextTop = clamp(
        event.clientY - state.offsetY,
        viewportPadding,
        Math.max(viewportPadding, maxTop)
      );
      setDragPreview({ left: nextLeft, top: nextTop });
    }
  };

  const handleSoldierPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (state.moved) {
      const viewportPadding = isMobile ? 8 : 12;
      const minLeft = resolveLeftBoundary(viewportPadding);
      const droppedPosition = clampWidgetPosition(
        {
          left: event.clientX - state.offsetX,
          top: event.clientY - state.offsetY,
        },
        {
          width: state.widgetWidth,
          height: state.widgetHeight,
        },
        {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        viewportPadding,
        {
          minLeft,
        }
      );
      const nextCorner = resolveCornerFromPoint(
        droppedPosition.left + state.widgetWidth / 2,
        droppedPosition.top + state.widgetHeight / 2,
        window.innerWidth,
        window.innerHeight
      );
      setCorner(nextCorner);
      setControlsOpen(false);
      setDragPreview(null);
      setIsDragging(false);
    } else {
      if (open) {
        closePanel();
        setControlsOpen(false);
      } else {
        setControlsOpen((current) => !current);
      }
    }
    setDragPreview(null);
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStateRef.current = null;
  };

  const handleSoldierPointerCancel = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragPreview(null);
    setIsDragging(false);
    dragStateRef.current = null;
  };

  const handleSoldierClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    dismissDialogue();
    // Accesibilidad por teclado: Space/Enter generan click con detail=0.
    if (event.detail === 0) {
      if (open) {
        closePanel();
        setControlsOpen(false);
      } else {
        setControlsOpen((current) => !current);
      }
    }
  };

  const smallBtnClass =
    "inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--color-neutral-400)] bg-white/80 px-3 py-1 text-xs font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-ejercito-blue)] hover:bg-[rgb(0_56_133/6%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]";

  const panelContent = (
    <div className="bg-[linear-gradient(180deg,rgba(250,251,247,0.98)_0%,rgba(240,244,235,0.95)_100%)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="inline-flex h-5 items-center rounded-full border border-[rgba(15,25,18,0.35)] bg-[#2a3d2f] px-2 text-[9.5px] font-extrabold uppercase tracking-[0.42px] text-[#f0f5ed]">
            Widget institucional
          </span>
          <h3 className="mt-1.5 text-base font-black leading-tight text-[#253027]">
            Recordatorios
          </h3>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">
            {urgentCount > 0
              ? `${urgentCount} urgente(s) para resolver hoy.`
              : `${pendingTasks.length} pendiente(s) en seguimiento.`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={onOpenConfig} className={smallBtnClass}>
            Config
          </button>
          <button type="button" onClick={closePanel} className={smallBtnClass}>
            Cerrar
          </button>
        </div>
      </div>

      {!showComposer ? (
        <>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter("PENDIENTES")}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                filter === "PENDIENTES"
                  ? "border-[var(--color-ejercito-blue)] bg-[var(--color-ejercito-blue)] text-white"
                  : "border-[var(--color-neutral-400)] bg-white/80 text-[var(--color-text-primary)] hover:bg-stone-100"
              }`}
            >
              {`Pendientes (${pendingTasks.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("URGENTES")}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                filter === "URGENTES"
                  ? "border-[var(--color-ejercito-red)] bg-[var(--color-ejercito-red)] text-white"
                  : "border-[var(--color-neutral-400)] bg-white/80 text-[var(--color-text-primary)] hover:bg-stone-100"
              }`}
            >
              {`Urgentes (${urgentCount})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("HECHAS")}
              className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                filter === "HECHAS"
                  ? "border-[var(--color-ejercito-green)] bg-[var(--color-ejercito-green)] text-white"
                  : "border-[var(--color-neutral-400)] bg-white/80 text-[var(--color-text-primary)] hover:bg-stone-100"
              }`}
            >
              {`Hechas (${completedCount})`}
            </button>
          </div>

          <div
            className={`mt-2.5 overflow-y-auto pr-0.5 ${isMobile ? "max-h-[46vh]" : "max-h-[38vh]"}`}
          >
            <div className="flex flex-col gap-2">
              {loading ? (
                <p className="text-xs text-[var(--color-text-secondary)]">Cargando tareas...</p>
              ) : null}
              {!loading && visibleTasks.length === 0 ? (
                <p className="rounded-md border border-[var(--color-neutral-300)] bg-[rgb(0_56_133/4%)] px-2.5 py-2 text-xs text-[var(--color-text-secondary)]">
                  {filter === "HECHAS"
                    ? "No hay tareas hechas."
                    : filter === "URGENTES"
                      ? "No hay tareas urgentes."
                      : "No hay tareas pendientes."}
                </p>
              ) : null}

              {!loading
                ? visibleTasks.map((task) => {
                    const taskUrgent = isTaskUrgent(task, todayKey);
                    const isDone = task.completada;

                    return (
                      <div
                        key={task.tareaId}
                        className={`rounded-md border px-2.5 py-2 ${
                          taskUrgent && !isDone
                            ? "border-rose-300 bg-[rgba(179,38,30,0.06)]"
                            : "border-[var(--color-neutral-300)] bg-[rgb(0_56_133/4%)]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-xs font-bold ${
                                  taskUrgent && !isDone
                                    ? "text-[var(--color-ejercito-red)]"
                                    : "text-[var(--color-text-primary)]"
                                } ${isDone ? "line-through opacity-80" : ""}`}
                              >
                                {task.titulo}
                              </span>
                              <span
                                className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold uppercase ${
                                  task.prioridad === "URGENTE"
                                    ? "bg-[var(--color-ejercito-red)] text-white"
                                    : "border border-[var(--color-neutral-300)] bg-[var(--color-neutral-100)] text-[var(--color-text-primary)]"
                                }`}
                              >
                                {task.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                              </span>
                              {task.fechaLimite ? (
                                <span
                                  className={`inline-flex h-5 items-center rounded-full border px-2 text-[10px] font-semibold ${
                                    taskUrgent && !isDone
                                      ? "border-[var(--color-ejercito-red)] text-[var(--color-ejercito-red)]"
                                      : "border-[var(--color-neutral-400)] text-[var(--color-text-secondary)]"
                                  }`}
                                >
                                  {`Limite ${formatDateOnlyForDisplay(task.fechaLimite)}`}
                                </span>
                              ) : null}
                            </div>
                            {task.nota ? (
                              <p
                                className={`mt-1 text-xs text-[var(--color-text-secondary)] ${
                                  isDone ? "line-through opacity-80" : ""
                                }`}
                              >
                                {task.nota}
                              </p>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => void onToggleTask(task.tareaId, !isDone)}
                            className={`inline-flex min-h-8 min-w-[88px] shrink-0 items-center justify-center rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                              isDone
                                ? "border border-[var(--color-neutral-400)] bg-white text-[var(--color-text-primary)] hover:bg-stone-100"
                                : "bg-[var(--color-ejercito-green)] text-white hover:bg-[#174f1e]"
                            }`}
                          >
                            {isDone ? "Reabrir" : "Hecha"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                : null}

              {!loading && hiddenCount > 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {`Mostrando ${visibleTasks.length} de ${activeList.length}. Ver el resto en Config.`}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className={`${smallBtnClass} w-full`}
            >
              Nueva tarea rapida
            </button>
            <button type="button" onClick={onOpenConfig} className={`${smallBtnClass} w-full`}>
              Ir a Recordatorios
            </button>
          </div>
        </>
      ) : null}

      {showComposer ? (
        <div className="mt-2.5 rounded-lg border border-[var(--color-neutral-300)] bg-white p-2.5">
          <p className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--color-text-secondary)]">
            Carga rapida
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <input
              type="text"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Titulo"
              maxLength={140}
              aria-label="Título de tarea"
              className="w-full rounded-md border border-[var(--color-neutral-400)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
            <textarea
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              placeholder="Nota breve"
              maxLength={2500}
              rows={2}
              aria-label="Nota breve"
              className="w-full rounded-md border border-[var(--color-neutral-400)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
            <input
              type="date"
              value={fechaLimite}
              onChange={(event) => setFechaLimite(event.target.value)}
              aria-label="Fecha límite"
              className="w-full rounded-md border border-[var(--color-neutral-400)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFechaLimite(todayIsoDate())}
                className={smallBtnClass}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setFechaLimite(offsetIsoDate(1))}
                className={smallBtnClass}
              >
                Manana
              </button>
              <button
                type="button"
                onClick={() => setFechaLimite(offsetIsoDate(7))}
                className={smallBtnClass}
              >
                +7 dias
              </button>
              <button type="button" onClick={() => setFechaLimite("")} className={smallBtnClass}>
                Sin fecha
              </button>
            </div>
            <select
              aria-label="Prioridad de tarea"
              value={prioridad}
              onChange={(event) =>
                setPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")
              }
              className="w-full rounded-md border border-[var(--color-neutral-400)] bg-white px-2.5 py-1.5 text-sm text-[var(--color-text-primary)]"
            >
              <option value="NORMAL">Prioridad: Normal</option>
              <option value="URGENTE">Prioridad: Urgente</option>
            </select>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit()}
                className="inline-flex min-h-9 w-full items-center justify-center rounded-md bg-[var(--color-ejercito-blue)] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#002f70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] disabled:pointer-events-none disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar tarea"}
              </button>
              <button
                type="button"
                onClick={() => setShowComposer(false)}
                className={`${smallBtnClass} w-full`}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      ref={widgetContainerRef}
      style={{
        position: "fixed",
        zIndex: 360,
        ...widgetRuntimePositionStyle,
        transition: isDragging
          ? "none"
          : "top 0.2s ease, right 0.2s ease, bottom 0.2s ease, left 0.2s ease",
      }}
    >
      <style>{`
        @keyframes soldier-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        @keyframes soldier-shadow-sway {
          0%, 100% { transform: scaleX(1); opacity: 0.78; }
          50% { transform: scaleX(0.9); opacity: 0.52; }
        }

        @keyframes soldier-eye-blink {
          0%, 44%, 47%, 74%, 77%, 100% { transform: scaleY(1); }
          45% { transform: scaleY(0.7); }
          46% { transform: scaleY(0.45); }
          75% { transform: scaleY(0.72); }
          76% { transform: scaleY(0.5); }
        }

        @keyframes soldier-breath {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.02); }
        }

        @keyframes soldier-head-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.8px); }
        }

        @keyframes soldier-arm-left {
          0%, 100% { transform: rotate(2deg); }
          50% { transform: rotate(8deg) translateY(-1px); }
        }

        @keyframes soldier-arm-right {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(-8deg) translateY(-1px); }
        }

        @keyframes soldier-leg-left {
          0%, 100% { transform: rotate(1deg); }
          50% { transform: rotate(-2deg) translateY(-1px); }
        }

        @keyframes soldier-leg-right {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(2deg) translateY(-1px); }
        }

        .soldier-avatar {
          transform-origin: center bottom;
        }

        .soldier-float {
          animation: soldier-float 2.1s ease-in-out infinite;
        }

        .soldier-shadow {
          animation: soldier-shadow-sway 2.1s ease-in-out infinite;
        }

        .soldier-eye {
          transform-box: fill-box;
          transform-origin: center center;
          animation: soldier-eye-blink 4.8s ease-in-out infinite;
        }

        .soldier-body-wrap {
          transform-box: fill-box;
          transform-origin: center center;
          transform: translateY(6px) scale(0.9, 0.99);
        }

        .soldier-body {
          transform-origin: center center;
          animation: soldier-breath 2.3s ease-in-out infinite;
        }

        .soldier-head-wrap {
          transform-box: fill-box;
          transform-origin: center center;
          transform: translateY(-6px) scale(1.02);
        }

        .soldier-head {
          transform-origin: center 110px;
          animation: soldier-head-bob 2.3s ease-in-out infinite;
        }

        .soldier-arm-left {
          transform-box: fill-box;
          transform-origin: top center;
          animation: soldier-arm-left 2.2s ease-in-out infinite;
        }

        .soldier-arm-right {
          transform-box: fill-box;
          transform-origin: top center;
          animation: soldier-arm-right 2.2s ease-in-out infinite;
        }

        .soldier-leg-left {
          transform-box: fill-box;
          transform-origin: top center;
          animation: soldier-leg-left 2.1s ease-in-out infinite;
        }

        .soldier-leg-right {
          transform-box: fill-box;
          transform-origin: top center;
          animation: soldier-leg-right 2.1s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .soldier-float,
          .soldier-shadow,
          .soldier-eye,
          .soldier-body-wrap,
          .soldier-body,
          .soldier-head-wrap,
          .soldier-head,
          .soldier-arm-left,
          .soldier-arm-right,
          .soldier-leg-left,
          .soldier-leg-right {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className={`flex ${isMobile ? "flex-row gap-2" : "flex-col gap-[7px]"} ${
          isRightCorner ? "items-end" : "items-start"
        }`}
      >
        <div className={`relative inline-flex ${isRightCorner ? "self-end" : "self-start"}`}>
          <button
            type="button"
            onClick={handleSoldierClick}
            onPointerDown={handleSoldierPointerDown}
            onPointerMove={handleSoldierPointerMove}
            onPointerUp={handleSoldierPointerUp}
            onPointerCancel={handleSoldierPointerCancel}
            aria-expanded={controlsOpen}
            aria-label="Recordatorios del soldado"
            title="Recordatorios del soldado (toque para acciones, arrastre para mover)"
            style={{
              touchAction: "none",
              ...(isDragging
                ? {
                    transform: "scale(1.03)",
                    filter: "drop-shadow(0 0 10px rgba(16, 94, 255, 0.35))",
                  }
                : {}),
            }}
            className="inline-flex cursor-grab items-center justify-center rounded-xl bg-transparent p-0 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ejercito-blue)]"
          >
            <span className="relative inline-flex items-end">
              <span className="relative inline-flex">
                <RenderSoldadoAvatar size={avatarSize} variant={variant} />
                {pendingTasks.length > 0 ? (
                  <span
                    style={{
                      fontSize: badgeFontSize,
                      minWidth: badgeSize,
                      height: badgeSize,
                    }}
                    className={`absolute bottom-[6%] right-[6%] inline-flex items-center justify-center rounded-full px-1 font-extrabold leading-none text-white shadow-[0_0_0_2px_rgba(240,244,234,0.97),0_6px_14px_rgba(17,31,20,0.22)] ${
                      urgentCount > 0
                        ? "bg-[var(--color-ejercito-red)]"
                        : "bg-[var(--color-ejercito-blue)]"
                    }`}
                  >
                    {pendingTasks.length}
                  </span>
                ) : null}
              </span>
              {urgentCount > 0 ? (
                <span
                  style={{
                    top: Math.round(-avatarSize * 0.02),
                    right: Math.round(-avatarSize * 0.08),
                    height: urgentPillHeight,
                    minWidth: urgentPillMinWidth,
                    fontSize: urgentPillFontSize,
                    borderRadius: Math.round(urgentPillHeight / 2),
                  }}
                  className="absolute inline-flex items-center justify-center border border-[rgba(153,27,27,0.42)] bg-[rgba(255,245,245,0.96)] px-1.5 font-extrabold leading-none text-[#7f1d1d]"
                >
                  {urgentIndicatorLabel}
                </span>
              ) : null}
              {isDragging || controlsOpen ? (
                <span
                  style={{
                    left: Math.round(-avatarSize * 0.07),
                    bottom: Math.round(-avatarSize * 0.05),
                    width: dragHandleSize,
                    height: dragHandleSize,
                  }}
                  className="absolute inline-flex items-center justify-center rounded-full border border-white/30 bg-[rgba(18,22,16,0.78)] text-white/90"
                  aria-hidden="true"
                >
                  <Move size={dragHandleIconSize} aria-hidden="true" />
                </span>
              ) : null}
            </span>
          </button>

          {activeDialogue && !isDragging ? (
            <div
              style={{
                ...(isTopCorner
                  ? { top: `calc(100% + ${isMobile ? 8 : 10}px)` }
                  : { bottom: `calc(100% + ${isMobile ? 8 : 10}px)` }),
                ...(isRightCorner ? { right: 0 } : { left: 0 }),
              }}
              className="pointer-events-none absolute z-[2] max-w-[190px] rounded-[11px] border border-[rgba(102,114,88,0.34)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(244,248,238,0.98)_100%)] px-2.5 py-2 text-[#1f261e] shadow-[0_12px_26px_rgba(20,28,19,0.22)] backdrop-blur-[1.5px] sm:max-w-[230px]"
              aria-live="polite"
            >
              <span
                aria-hidden="true"
                style={{
                  ...(isTopCorner ? { top: -6 } : { bottom: -6 }),
                  ...(isRightCorner ? { right: 20 } : { left: 20 }),
                }}
                className={`absolute h-3 w-3 rotate-45 bg-[rgba(250,252,246,0.98)] ${
                  isTopCorner
                    ? "border-l border-t border-[rgba(102,114,88,0.34)]"
                    : "border-b border-r border-[rgba(102,114,88,0.34)]"
                }`}
              />
              <p className="text-[13px] font-bold leading-[1.28]">{activeDialogue.message}</p>
            </div>
          ) : null}
        </div>

        {isDragging ? (
          <span className="inline-flex h-6 items-center rounded-full bg-[var(--color-ejercito-blue)] px-2.5 text-[11px] font-bold text-white shadow-[0_8px_20px_rgba(0,56,133,0.25)]">
            Arrastra a una esquina
          </span>
        ) : null}

        {controlsOpen ? (
          <div
            className={`flex flex-col gap-2.5 rounded-2xl border border-[rgba(130,142,115,0.4)] bg-[rgba(250,252,248,0.96)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(240,244,236,0.6)_100%)] p-2.5 shadow-[0_16px_36px_rgba(10,15,8,0.4),0_0_0_1px_rgba(255,255,255,0.6)_inset] backdrop-blur-md ${
              isMobile ? "min-w-[186px]" : "min-w-[220px]"
            }`}
          >
            <div className="px-1 pb-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.8px] text-[#8a9e7f]">
                Panel Rápido
              </p>
              <p className="text-[13px] font-extrabold leading-tight text-[#2c362a]">
                Acciones del widget
              </p>
            </div>
            <button
              type="button"
              onClick={() => openPanel(false)}
              style={{
                borderColor: statusSurface.borderColor,
                backgroundImage: statusSurface.backgroundImage,
                color: statusSurface.color,
              }}
              className="flex min-h-14 items-stretch justify-start gap-2.5 rounded-[10px] border px-3 py-2 text-left shadow-[0_6px_14px_rgba(20,28,19,0.15)] transition-all duration-200 ease-out hover:-translate-y-px hover:brightness-105 hover:shadow-[0_8px_18px_rgba(20,28,19,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <ListChecks className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="flex flex-col items-start gap-px text-left">
                <span className="text-[15px] font-extrabold leading-[1.14] tracking-[0.08px]">
                  {statusHeadline}
                </span>
                <span
                  style={{ color: statusSurface.mutedColor }}
                  className="text-[11px] font-semibold leading-[1.18]"
                >
                  {statusCaption}
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={openComposer}
              className="flex min-h-12 items-center justify-start gap-2.5 rounded-[10px] border border-white/15 bg-[linear-gradient(135deg,#40605c_0%,#5b877a_100%)] px-3 py-2 text-xs font-bold text-white shadow-[0_6px_14px_rgba(36,61,54,0.2)] transition-all duration-200 ease-out hover:-translate-y-px hover:bg-[linear-gradient(135deg,#476c67_0%,#659587_100%)] hover:shadow-[0_8px_18px_rgba(36,61,54,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <ListPlus className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span>Nueva tarea rápida</span>
            </button>
          </div>
        ) : null}
      </div>

      {!isMobile && open ? (
        <div className="relative mt-2 max-h-[72vh] w-[min(26rem,calc(100vw-1.4rem))] overflow-hidden rounded-2xl border border-[rgba(107,119,93,0.32)] bg-[linear-gradient(180deg,rgba(253,254,251,0.98)_0%,rgba(238,244,232,0.96)_100%)] shadow-[0_20px_46px_rgba(26,33,23,0.25)] backdrop-blur-[2px]">
          {panelContent}
        </div>
      ) : null}

      {isMobile ? (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) closePanel();
          }}
        >
          <DialogContent variant="drawer-bottom" aria-label="Recordatorios">
            <DialogTitle className="sr-only">Recordatorios</DialogTitle>
            <DialogDescription className="sr-only">
              Panel de tareas pendientes, urgentes y carga rápida
            </DialogDescription>
            <div className="flex justify-center py-1.5" aria-hidden="true">
              <div className="h-1 w-11 rounded-full bg-stone-400/60" />
            </div>
            {panelContent}
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
