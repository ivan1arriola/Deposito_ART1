"use client";

import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import ChecklistRoundedIcon from "@mui/icons-material/ChecklistRounded";
import OpenWithRoundedIcon from "@mui/icons-material/OpenWithRounded";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const isExtraLargeDesktop = useMediaQuery(theme.breakpoints.up("xl"));

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
    [tasks],
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => task.completada).sort(sortCompletedTasks),
    [tasks],
  );
  const urgentPendingTasks = useMemo(
    () => pendingTasks.filter((task) => isTaskUrgent(task, todayKey)),
    [pendingTasks, todayKey],
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
    urgentCount > 0 ? "Requiere atencion hoy" : hasPendingTasks ? "Hay tareas en seguimiento" : "Todo al dia";
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
  const avatarSize = isMobile ? 82 : isExtraLargeDesktop ? 132 : isLargeDesktop ? 120 : isDesktop ? 108 : 96;
  const badgeSize = Math.max(20, Math.round(avatarSize * 0.24));
  const badgeFontSize = Math.max(11, Math.round(avatarSize * 0.13));
  const urgentPillHeight = Math.max(18, Math.round(avatarSize * 0.22));
  const urgentPillFontSize = Math.max(9, Math.round(avatarSize * 0.1));
  const urgentPillMinWidth = Math.max(40, Math.round(avatarSize * 0.52));
  const urgentIndicatorLabel = urgentCount > 99 ? "Urg 99+" : `Urg ${urgentCount}`;
  const dragHandleSize = Math.max(20, Math.round(avatarSize * 0.24));
  const dragHandleIconSize = Math.max(14, Math.round(avatarSize * 0.17));
  const resolveLeftBoundary = useCallback((viewportPadding: number) => {
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
  }, [isMobile]);
  const widgetPositionSx = useMemo(() => {
    const sideOffset = isMobile ? 10 : 24;
    const verticalOffset = isMobile ? 14 : 24;
    const leftBoundary = resolveLeftBoundary(sideOffset);
    return {
      ...(corner === "TOP_LEFT" || corner === "TOP_RIGHT" ? { top: verticalOffset } : { bottom: verticalOffset }),
      ...(corner === "TOP_LEFT" || corner === "BOTTOM_LEFT" ? { left: leftBoundary } : { right: sideOffset }),
    };
  }, [corner, isMobile, resolveLeftBoundary]);
  const widgetRuntimePositionSx = dragPreview
    ? { top: dragPreview.top, left: dragPreview.left, right: "auto", bottom: "auto" }
    : widgetPositionSx;
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
    [displayFirstName, pendingTasks.length, urgentCount],
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
      const nextTop = clamp(event.clientY - state.offsetY, viewportPadding, Math.max(viewportPadding, maxTop));
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
        },
      );
      const nextCorner = resolveCornerFromPoint(
        droppedPosition.left + state.widgetWidth / 2,
        droppedPosition.top + state.widgetHeight / 2,
        window.innerWidth,
        window.innerHeight,
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

  const panelContent = (
    <Box
      sx={{
        p: 1.5,
        backgroundImage: "linear-gradient(180deg, rgba(250,251,247,0.98) 0%, rgba(240,244,235,0.95) 100%)",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Chip
            label="Widget institucional"
            size="small"
            sx={{
              height: 20,
              borderRadius: 999,
              fontSize: 9.5,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.42,
              color: "#f0f5ed",
              bgcolor: "#2a3d2f",
              border: "1px solid rgba(15, 25, 18, 0.35)",
            }}
          />
          <Typography variant="subtitle1" sx={{ mt: 0.75, fontWeight: 900, lineHeight: 1.2, color: "#253027" }}>
            Recordatorios
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {urgentCount > 0
              ? `${urgentCount} urgente(s) para resolver hoy.`
              : `${pendingTasks.length} pendiente(s) en seguimiento.`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          <Button
            type="button"
            onClick={onOpenConfig}
            size="small"
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
          >
            Config
          </Button>
          <Button
            type="button"
            onClick={closePanel}
            size="small"
            variant="outlined"
            color="inherit"
            sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
          >
            Cerrar
          </Button>
        </Stack>
      </Stack>

      {!showComposer ? (
        <>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 1.2 }}>
            <Button
              type="button"
              size="small"
              variant={filter === "PENDIENTES" ? "contained" : "outlined"}
              color={filter === "PENDIENTES" ? "primary" : "inherit"}
              onClick={() => setFilter("PENDIENTES")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
            >
              {`Pendientes (${pendingTasks.length})`}
            </Button>
            <Button
              type="button"
              size="small"
              variant={filter === "URGENTES" ? "contained" : "outlined"}
              color={filter === "URGENTES" ? "error" : "inherit"}
              onClick={() => setFilter("URGENTES")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
            >
              {`Urgentes (${urgentCount})`}
            </Button>
            <Button
              type="button"
              size="small"
              variant={filter === "HECHAS" ? "contained" : "outlined"}
              color={filter === "HECHAS" ? "success" : "inherit"}
              onClick={() => setFilter("HECHAS")}
              sx={{ textTransform: "none", borderRadius: 999, fontWeight: 700 }}
            >
              {`Hechas (${completedCount})`}
            </Button>
          </Stack>

          <Box
            sx={{
              mt: 1.2,
              maxHeight: isMobile ? "46vh" : "38vh",
              overflowY: "auto",
              pr: 0.2,
            }}
          >
            <Stack spacing={1}>
              {loading ? <Typography variant="caption" color="text.secondary">Cargando tareas...</Typography> : null}
              {!loading && visibleTasks.length === 0 ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ border: "1px solid", borderColor: "divider", bgcolor: "action.hover", borderRadius: 1.5, px: 1, py: 1 }}
                >
                  {filter === "HECHAS"
                    ? "No hay tareas hechas."
                    : filter === "URGENTES"
                      ? "No hay tareas urgentes."
                      : "No hay tareas pendientes."}
                </Typography>
              ) : null}

              {!loading
                ? visibleTasks.map((task) => {
                    const taskUrgent = isTaskUrgent(task, todayKey);
                    const isDone = task.completada;

                    return (
                      <Box
                        key={task.tareaId}
                        sx={{
                          borderRadius: 1.5,
                          border: "1px solid",
                          borderColor: taskUrgent && !isDone ? "error.light" : "divider",
                          bgcolor: taskUrgent && !isDone ? "rgba(179,38,30,0.06)" : "action.hover",
                          px: 1,
                          py: 1,
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 700,
                                  color: taskUrgent && !isDone ? "error.main" : "text.primary",
                                  textDecoration: isDone ? "line-through" : "none",
                                  opacity: isDone ? 0.8 : 1,
                                }}
                              >
                                {task.titulo}
                              </Typography>
                              <Chip
                                label={task.prioridad === "URGENTE" ? "Urgente" : "Normal"}
                                size="small"
                                color={task.prioridad === "URGENTE" ? "error" : "default"}
                                sx={{ height: 20, fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}
                              />
                              {task.fechaLimite ? (
                                <Chip
                                  label={`Limite ${formatDateOnlyForDisplay(task.fechaLimite)}`}
                                  size="small"
                                  variant="outlined"
                                  color={taskUrgent && !isDone ? "error" : "default"}
                                  sx={{ height: 20, fontSize: 10 }}
                                />
                              ) : null}
                            </Stack>
                            {task.nota ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 0.4, display: "block", textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.8 : 1 }}
                              >
                                {task.nota}
                              </Typography>
                            ) : null}
                          </Box>
                          <Button
                            type="button"
                            size="small"
                            variant={isDone ? "outlined" : "contained"}
                            color={isDone ? "inherit" : "success"}
                            onClick={() => void onToggleTask(task.tareaId, !isDone)}
                            sx={{ minWidth: 88, textTransform: "none" }}
                          >
                            {isDone ? "Reabrir" : "Hecha"}
                          </Button>
                        </Stack>
                      </Box>
                    );
                  })
                : null}

              {!loading && hiddenCount > 0 ? (
                <Typography variant="caption" color="text.secondary">
                  {`Mostrando ${visibleTasks.length} de ${activeList.length}. Ver el resto en Config.`}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.3 }}>
            <Button
              type="button"
              onClick={() => setShowComposer(true)}
              size="small"
              variant="outlined"
              color="inherit"
              fullWidth
              sx={{ textTransform: "none" }}
            >
              Nueva tarea rapida
            </Button>
            <Button
              type="button"
              onClick={onOpenConfig}
              size="small"
              variant="outlined"
              color="inherit"
              fullWidth
              sx={{ textTransform: "none" }}
            >
              Ir a Recordatorios
            </Button>
          </Stack>
        </>
      ) : null}

      {showComposer ? (
        <Box sx={{ mt: 1.2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 1.2 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6, color: "text.secondary" }}>
            Carga rapida
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            <TextField
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Titulo"
              inputProps={{ maxLength: 140 }}
              size="small"
              fullWidth
            />
            <TextField
              value={nota}
              onChange={(event) => setNota(event.target.value)}
              placeholder="Nota breve"
              inputProps={{ maxLength: 2500 }}
              multiline
              minRows={2}
              size="small"
              fullWidth
            />
            <TextField
              type="date"
              value={fechaLimite}
              onChange={(event) => setFechaLimite(event.target.value)}
              size="small"
              fullWidth
            />
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
              <Button type="button" size="small" variant="outlined" color="inherit" onClick={() => setFechaLimite(todayIsoDate())}>
                Hoy
              </Button>
              <Button type="button" size="small" variant="outlined" color="inherit" onClick={() => setFechaLimite(offsetIsoDate(1))}>
                Manana
              </Button>
              <Button type="button" size="small" variant="outlined" color="inherit" onClick={() => setFechaLimite(offsetIsoDate(7))}>
                +7 dias
              </Button>
              <Button type="button" size="small" variant="outlined" color="inherit" onClick={() => setFechaLimite("")}>
                Sin fecha
              </Button>
            </Stack>
            <TextField
              select
              SelectProps={{ native: true }}
              value={prioridad}
              onChange={(event) => setPrioridad(event.target.value === "URGENTE" ? "URGENTE" : "NORMAL")}
              size="small"
              fullWidth
            >
              <option value="NORMAL">Prioridad: Normal</option>
              <option value="URGENTE">Prioridad: Urgente</option>
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submit()}
                variant="contained"
                size="small"
                fullWidth
                sx={{ textTransform: "none" }}
              >
                {saving ? "Guardando..." : "Guardar tarea"}
              </Button>
              <Button
                type="button"
                onClick={() => setShowComposer(false)}
                variant="outlined"
                size="small"
                color="inherit"
                fullWidth
                sx={{ textTransform: "none" }}
              >
                Cancelar
              </Button>
            </Stack>
          </Stack>
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Box
      ref={widgetContainerRef}
      sx={{
        position: "fixed",
        zIndex: 360,
        ...widgetRuntimePositionSx,
        transition: isDragging ? "none" : "top 0.2s ease, right 0.2s ease, bottom 0.2s ease, left 0.2s ease",
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

      <Stack
        direction={isMobile ? "row" : "column"}
        alignItems={isRightCorner ? "flex-end" : "flex-start"}
        spacing={isMobile ? 1 : 0.85}
      >
        <Box sx={{ position: "relative", display: "inline-flex", alignSelf: isRightCorner ? "flex-end" : "flex-start" }}>
          <IconButton
            type="button"
            onClick={handleSoldierClick}
            onPointerDown={handleSoldierPointerDown}
            onPointerMove={handleSoldierPointerMove}
            onPointerUp={handleSoldierPointerUp}
            onPointerCancel={handleSoldierPointerCancel}
            aria-expanded={controlsOpen}
            sx={{
              p: 0,
              borderRadius: 3,
              bgcolor: "transparent",
              touchAction: "none",
              cursor: "grab",
              "&:hover": { bgcolor: "transparent" },
              "&:active": { cursor: "grabbing" },
              ...(isDragging ? { transform: "scale(1.03)", filter: "drop-shadow(0 0 10px rgba(16, 94, 255, 0.35))" } : {}),
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
            title="Recordatorios del soldado (toque para acciones, arrastre para mover)"
          >
            <Box sx={{ position: "relative", display: "inline-flex", alignItems: "flex-end" }}>
              <Badge
                badgeContent={pendingTasks.length}
                color={urgentCount > 0 ? "error" : "primary"}
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: badgeFontSize,
                    minWidth: badgeSize,
                    height: badgeSize,
                    fontWeight: 800,
                    boxShadow: "0 0 0 2px rgba(240, 244, 234, 0.97), 0 6px 14px rgba(17, 31, 20, 0.22)",
                  },
                }}
              >
                <RenderSoldadoAvatar size={avatarSize} variant={variant} />
              </Badge>
              {urgentCount > 0 ? (
                <Chip
                  label={urgentIndicatorLabel}
                  color="default"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: Math.round(-avatarSize * 0.02),
                    right: Math.round(-avatarSize * 0.08),
                    height: urgentPillHeight,
                    minWidth: urgentPillMinWidth,
                    fontSize: urgentPillFontSize,
                    fontWeight: 800,
                    borderRadius: Math.round(urgentPillHeight / 2),
                    color: "#7f1d1d",
                    bgcolor: "rgba(255, 245, 245, 0.96)",
                    border: "1px solid rgba(153, 27, 27, 0.42)",
                    "& .MuiChip-label": { px: 0.85, lineHeight: 1 },
                  }}
                />
              ) : null}
              {isDragging || controlsOpen ? (
                <Box
                  sx={{
                    position: "absolute",
                    left: Math.round(-avatarSize * 0.07),
                    bottom: Math.round(-avatarSize * 0.05),
                    width: dragHandleSize,
                    height: dragHandleSize,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(18,22,16,0.78)",
                    color: "rgba(255,255,255,0.92)",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                  aria-hidden
                >
                  <OpenWithRoundedIcon sx={{ fontSize: dragHandleIconSize }} />
                </Box>
              ) : null}
            </Box>
          </IconButton>

          {activeDialogue && !isDragging ? (
            <Box
              sx={{
                position: "absolute",
                ...(isTopCorner
                  ? { top: `calc(100% + ${isMobile ? 8 : 10}px)` }
                  : { bottom: `calc(100% + ${isMobile ? 8 : 10}px)` }),
                ...(isRightCorner ? { right: 0 } : { left: 0 }),
                maxWidth: { xs: 190, sm: 230 },
                borderRadius: 2.75,
                px: 1.2,
                py: 0.95,
                backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,238,0.98) 100%)",
                color: "#1f261e",
                border: "1px solid rgba(102, 114, 88, 0.34)",
                boxShadow: "0 12px 26px rgba(20, 28, 19, 0.22)",
                backdropFilter: "blur(1.5px)",
                pointerEvents: "none",
                zIndex: 2,
                "&::after": {
                  content: '""',
                  position: "absolute",
                  width: 12,
                  height: 12,
                  bgcolor: "rgba(250,252,246,0.98)",
                  ...(isTopCorner
                    ? {
                        top: -6,
                        borderLeft: "1px solid rgba(102, 114, 88, 0.34)",
                        borderTop: "1px solid rgba(102, 114, 88, 0.34)",
                      }
                    : {
                        bottom: -6,
                        borderRight: "1px solid rgba(102, 114, 88, 0.34)",
                        borderBottom: "1px solid rgba(102, 114, 88, 0.34)",
                      }),
                  transform: "rotate(45deg)",
                  ...(isRightCorner ? { right: 20 } : { left: 20 }),
                },
              }}
              aria-live="polite"
            >
              <Typography sx={{ fontSize: 13, lineHeight: 1.28, fontWeight: 700 }}>
                {activeDialogue.message}
              </Typography>
            </Box>
          ) : null}
        </Box>

        {isDragging ? (
          <Chip
            size="small"
            label="Arrastra a una esquina"
            color="primary"
            sx={{
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 8px 20px rgba(0, 56, 133, 0.25)",
            }}
          />
        ) : null}

        {controlsOpen ? (
          <Stack
            spacing={1.25}
            sx={{
              minWidth: isMobile ? 186 : 220,
              p: 1.25,
              borderRadius: 4,
              bgcolor: "rgba(250, 252, 248, 0.96)",
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(240,244,236,0.6) 100%)",
              border: "1px solid rgba(130, 142, 115, 0.4)",
              boxShadow: "0 16px 36px rgba(10, 15, 8, 0.4), 0 0 0 1px rgba(255,255,255,0.6) inset",
              backdropFilter: "blur(12px) saturate(140%)",
            }}
          >
            <Box sx={{ px: 0.5, pb: 0.25 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: "#8a9e7f" }}>
                Panel Rápido
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2, color: "#2c362a" }}>
                Acciones del widget
              </Typography>
            </Box>
            <Button
              type="button"
              onClick={() => openPanel(false)}
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<ChecklistRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: "none",
                justifyContent: "flex-start",
                alignItems: "stretch",
                minHeight: 56,
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: statusSurface.borderColor,
                backgroundImage: statusSurface.backgroundImage,
                color: statusSurface.color,
                boxShadow: "0 6px 14px rgba(20, 28, 19, 0.15)",
                "&:hover": {
                  borderColor: statusSurface.borderColor,
                  backgroundImage: statusSurface.backgroundImage,
                  filter: "brightness(1.05)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 8px 18px rgba(20, 28, 19, 0.22)",
                },
                transition: "all 0.2s ease-out",
                "& .MuiButton-startIcon": {
                  mt: 0.1,
                  mr: 1.25,
                },
              }}
            >
              <Stack spacing={0.1} sx={{ textAlign: "left", alignItems: "flex-start" }}>
                <Typography component="span" sx={{ fontSize: 15, fontWeight: 800, lineHeight: 1.14, letterSpacing: 0.08 }}>
                  {statusHeadline}
                </Typography>
                <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, color: statusSurface.mutedColor, lineHeight: 1.18 }}>
                  {statusCaption}
                </Typography>
              </Stack>
            </Button>
            <Button
              type="button"
              onClick={openComposer}
              variant="contained"
              color="inherit"
              size="small"
              startIcon={<AddTaskRoundedIcon sx={{ fontSize: 18 }} />}
              sx={{
                textTransform: "none",
                justifyContent: "flex-start",
                minHeight: 48,
                px: 1.5,
                py: 1,
                borderRadius: 2.5,
                color: "#ffffff",
                backgroundImage: "linear-gradient(135deg, #40605c 0%, #5b877a 100%)",
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 6px 14px rgba(36, 61, 54, 0.2)",
                fontWeight: 700,
                "&:hover": {
                  backgroundImage: "linear-gradient(135deg, #476c67 0%, #659587 100%)",
                  boxShadow: "0 8px 18px rgba(36, 61, 54, 0.3)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s ease-out",
                "& .MuiButton-startIcon": {
                  mr: 1.25,
                },
              }}
            >
              Nueva tarea rápida
            </Button>
          </Stack>
        ) : null}
      </Stack>

      {!isMobile && open ? (
        <Card
          sx={{
            position: "relative",
            mt: 1,
            maxHeight: "72vh",
            width: "min(26rem, calc(100vw - 1.4rem))",
            overflow: "hidden",
            borderRadius: 4,
            border: "1px solid",
            borderColor: "rgba(107, 119, 93, 0.32)",
            backgroundImage: "linear-gradient(180deg, rgba(253,254,251,0.98) 0%, rgba(238,244,232,0.96) 100%)",
            boxShadow: "0 20px 46px rgba(26, 33, 23, 0.25)",
          }}
        >
          <CardContent sx={{ p: 0, backdropFilter: "blur(2px)" }}>{panelContent}</CardContent>
        </Card>
      ) : null}

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={closePanel}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              border: "1px solid",
              borderColor: "rgba(107, 119, 93, 0.3)",
              backgroundImage: "linear-gradient(180deg, rgba(252,254,249,0.98) 0%, rgba(236,242,228,0.96) 100%)",
              boxShadow: "0 -10px 30px rgba(20, 28, 19, 0.2)",
              maxHeight: "82vh",
              overflow: "hidden",
            },
          }}
        >
          <Box sx={{ py: 0.75, display: "flex", justifyContent: "center" }}>
            <Box sx={{ width: 44, height: 4, borderRadius: 10, bgcolor: "text.disabled" }} />
          </Box>
          {panelContent}
        </Drawer>
      ) : null}
    </Box>
  );
}
