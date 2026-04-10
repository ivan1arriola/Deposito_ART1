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
import type { RecordatorioTarea } from "@/types/entities";

type RecordatorioCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
};

type TaskFilter = "PENDIENTES" | "URGENTES" | "HECHAS";
type WidgetCorner = "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT";
type SoldierDialogueKind = "TIME_GREETING";

type SoldierDialogueContext = {
  displayName: string;
  now: Date;
};

type SoldierDialogueDefinition = {
  kind: SoldierDialogueKind;
  buildMessage: (context: SoldierDialogueContext) => string;
};

type ActiveSoldierDialogue = {
  kind: SoldierDialogueKind;
  message: string;
};

const WIDGET_CORNER_STORAGE_KEY = "soldado-recordatorio-widget-corner";
const WIDGET_DRAG_THRESHOLD_PX = 10;

type SoldadoRecordatorioWidgetProps = {
  tasks: RecordatorioTarea[];
  loading: boolean;
  saving: boolean;
  displayName?: string | null;
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

function offsetIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTaskUrgent(task: RecordatorioTarea, todayKey: string) {
  return task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey);
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

function sortCompletedTasks(a: RecordatorioTarea, b: RecordatorioTarea) {
  if (a.updatedAt > b.updatedAt) return -1;
  if (a.updatedAt < b.updatedAt) return 1;
  return 0;
}

function isWidgetCorner(value: string | null): value is WidgetCorner {
  return value === "TOP_LEFT" || value === "TOP_RIGHT" || value === "BOTTOM_LEFT" || value === "BOTTOM_RIGHT";
}

function resolveCornerFromPoint(clientX: number, clientY: number, viewportWidth: number, viewportHeight: number): WidgetCorner {
  const vertical = clientY <= viewportHeight / 2 ? "TOP" : "BOTTOM";
  const horizontal = clientX <= viewportWidth / 2 ? "LEFT" : "RIGHT";
  return `${vertical}_${horizontal}` as WidgetCorner;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFirstName(displayName: string | null | undefined) {
  if (typeof displayName !== "string") return "";
  const normalized = displayName.replace(/\s+/g, " ").trim();
  if (normalized === "") return "";
  const [firstToken] = normalized.split(" ");
  return firstToken ?? normalized;
}

function resolveGreetingByHour(now: Date) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Buenos dias";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

const SOLDIER_DIALOGUES: Record<SoldierDialogueKind, SoldierDialogueDefinition> = {
  TIME_GREETING: {
    kind: "TIME_GREETING",
    buildMessage: ({ displayName, now }) => {
      const greeting = resolveGreetingByHour(now);
      return displayName ? `${greeting}, ${displayName}.` : `${greeting}.`;
    },
  },
};

function MiniSoldadoAvatar({ urgent, size }: { urgent: boolean; size: number }) {
  const scale = size / 82;
  return (
    <span
      className={`soldier-avatar soldier-float relative inline-flex items-end justify-center ${
        urgent ? "soldier-urgent" : ""
      }`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-hidden="true"
    >
      <span
        className="soldier-shadow absolute rounded-full bg-black/20 blur-[2px]"
        style={{ bottom: `${4 * scale}px`, height: `${10 * scale}px`, width: `${48 * scale}px` }}
      />
      <span
        className="absolute rounded-full bg-emerald-200/15 blur-[8px]"
        style={{ bottom: `${28 * scale}px`, height: `${36 * scale}px`, width: `${36 * scale}px` }}
      />
      <svg
        viewBox="0 0 120 120"
        className="relative drop-shadow-[0_3px_4px_rgba(0,0,0,0.24)]"
        style={{ width: `${76 * scale}px`, height: `${76 * scale}px` }}
      >
        <defs>
          <linearGradient id="soldier-cloth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#869465" />
            <stop offset="100%" stopColor="#5f6d49" />
          </linearGradient>
          <linearGradient id="soldier-pack" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#667551" />
            <stop offset="100%" stopColor="#46553a" />
          </linearGradient>
          <linearGradient id="soldier-helmet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#74815a" />
            <stop offset="100%" stopColor="#556340" />
          </linearGradient>
          <linearGradient id="soldier-skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4ccb0" />
            <stop offset="100%" stopColor="#ddb08d" />
          </linearGradient>
          <linearGradient id="soldier-boot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3632" />
            <stop offset="100%" stopColor="#1f1d1b" />
          </linearGradient>
        </defs>

        <g className="soldier-pack soldier-svg-part">
          <rect x="33" y="51" width="54" height="37" rx="13" fill="url(#soldier-pack)" stroke="#3b4632" strokeWidth="3" />
          <rect x="39" y="56" width="11" height="22" rx="3.2" fill="#6e7d57" />
          <rect x="70" y="56" width="11" height="22" rx="3.2" fill="#6e7d57" />
          <rect x="57.4" y="54" width="5.2" height="31" rx="2.6" fill="#35422e" />
          <rect x="79.4" y="57" width="6.3" height="15" rx="2.2" fill="#3e4a34" />
          <line x1="82.5" y1="57" x2="84.5" y2="42" stroke="#2f3b2a" strokeWidth="2" className="soldier-radio-antenna" />
        </g>

        <g className="soldier-rifle soldier-svg-part">
          <rect x="95.5" y="58" width="7" height="35" rx="3" fill="#3f3932" stroke="#2c2824" strokeWidth="2" />
          <rect x="101.8" y="56" width="2.8" height="30" rx="1.2" fill="#1f1d1a" />
          <rect x="92.8" y="84.6" width="12.4" height="6.4" rx="2.3" fill="#4a4138" />
          <circle cx="99.2" cy="72" r="1.6" fill="#9d8f70" />
        </g>

        <g className="soldier-arm-left soldier-svg-part">
          <rect x="18" y="56" width="14" height="31" rx="7" fill="url(#soldier-cloth)" stroke="#51613b" strokeWidth="3" />
          <circle cx="25" cy="74" r="3.2" fill="#6b7a4f" />
          <rect x="20.8" y="69" width="8.6" height="5.2" rx="2.4" fill="#4f5c3d" />
        </g>
        <g className="soldier-arm-right soldier-svg-part">
          <rect x="88" y="56" width="14" height="31" rx="7" fill="url(#soldier-cloth)" stroke="#51613b" strokeWidth="3" />
          <circle cx="95" cy="74" r="3.2" fill="#6b7a4f" />
          <rect x="90.8" y="69" width="8.6" height="5.2" rx="2.4" fill="#4f5c3d" />
        </g>
        <circle cx="26" cy="88" r="6" fill="url(#soldier-skin)" stroke="#c89e7e" strokeWidth="2.5" />
        <circle cx="94" cy="88" r="6" fill="url(#soldier-skin)" stroke="#c89e7e" strokeWidth="2.5" />

        <g className="soldier-torso soldier-svg-part">
          <rect x="35.5" y="47" width="49" height="44" rx="14" fill="url(#soldier-cloth)" stroke="#51613b" strokeWidth="3" />
          <path d="M37.5 64 H82.5" stroke="#5a6842" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 50 L57.5 86" stroke="#47543a" strokeWidth="3.2" strokeLinecap="round" className="soldier-strap" />
          <path d="M78 50 L62.5 86" stroke="#47543a" strokeWidth="3.2" strokeLinecap="round" className="soldier-strap" />
          <rect x="40.5" y="60" width="14" height="15.5" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
          <rect x="65.5" y="60" width="14" height="15.5" rx="4" fill="#6a7650" stroke="#51613b" strokeWidth="2" />
          <path d="M40.5 60 L54.5 60 L52.4 64 L42.6 64 Z" fill="#5e6c45" />
          <path d="M65.5 60 L79.5 60 L77.4 64 L67.6 64 Z" fill="#5e6c45" />
          <rect x="57.8" y="52" width="4.4" height="37" rx="2.2" fill="#4f4336" />
          <circle cx="60" cy="66" r="2.4" fill="#d9c46b" />
          <circle cx="60" cy="73.7" r="2.4" fill="#d9c46b" />
          <circle cx="60" cy="81.4" r="2.4" fill="#d9c46b" />
          <circle cx="60" cy="71.8" r="2.5" fill="#dcc978" stroke="#6c5c3f" strokeWidth="1.2" />
          <rect x="47" y="79.2" width="26" height="7.6" rx="3.6" fill="#58473b" />
          <rect x="56.8" y="80" width="6.4" height="5.4" rx="2" fill="#d1b763" />
        </g>

        <rect x="44.8" y="86" width="12.4" height="19" rx="6" fill="url(#soldier-cloth)" stroke="#51613b" strokeWidth="3" className="soldier-leg-left soldier-svg-part" />
        <rect x="62.8" y="86" width="12.4" height="19" rx="6" fill="url(#soldier-cloth)" stroke="#51613b" strokeWidth="3" className="soldier-leg-right soldier-svg-part" />
        <rect x="46.8" y="93.2" width="8.3" height="4.2" rx="2" fill="#4f5f3d" />
        <rect x="64.8" y="93.2" width="8.3" height="4.2" rx="2" fill="#4f5f3d" />
        <rect x="38.4" y="101" width="22.8" height="9" rx="4.5" fill="url(#soldier-boot)" />
        <rect x="60.8" y="101" width="22.8" height="9" rx="4.5" fill="url(#soldier-boot)" />
        <rect x="40.2" y="105.5" width="19.2" height="1.6" rx="0.8" fill="#5d5750" />
        <rect x="62.6" y="105.5" width="19.2" height="1.6" rx="0.8" fill="#5d5750" />

        <g className="soldier-head soldier-svg-part">
          <rect x="53" y="41" width="14" height="8.6" rx="4.2" fill="#dfb28f" />
          <ellipse cx="60" cy="31" rx="18.2" ry="15.2" fill="url(#soldier-skin)" stroke="#c89e7e" strokeWidth="3" />
          <circle cx="52.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
          <circle cx="67.5" cy="30.5" r="2.4" fill="#1f2a1b" className="soldier-eye soldier-svg-part" />
          <path d="M49 26.7 Q52 24.8 55.3 26.7" stroke="#5b4031" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M64.7 26.7 Q68 24.8 71 26.7" stroke="#5b4031" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M54.3 35.5 L60 32.8 L65.7 35.5" fill="none" stroke="#b58367" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M53.5 37.5 Q60 42.3 66.5 37.5" fill="none" stroke="#865f4b" strokeWidth="2.3" strokeLinecap="round" />
          <path d="M53.8 34.9 Q60 39 66.2 34.9" fill="none" stroke="#6d4938" strokeWidth="1.4" strokeLinecap="round" />
          <ellipse cx="47" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />
          <ellipse cx="73" cy="36" rx="3.8" ry="2.2" fill="rgba(228,145,132,0.45)" />
          <path d="M44.8 41.4 Q60 46.2 75.2 41.4" fill="none" stroke="#8b684f" strokeWidth="1.8" className="soldier-chinstrap" />
        </g>

        <g className="soldier-helmet soldier-svg-part">
          <path d="M41 23 C43 13, 53 8, 60 8 C67 8, 77 13, 79 23 L79 26 L41 26 Z" fill="url(#soldier-helmet)" stroke="#4f5839" strokeWidth="3" />
          <path d="M41 25 C52 29, 68 29, 79 25" fill="#4f5839" />
          <path d="M49 17.7 C52.2 15.8, 56.8 15.2, 60.3 17.2 C57.7 19.8, 54.2 21.2, 50.2 21.2 Z" fill="#61704c" />
          <path d="M68 18.5 C71.6 20.1, 73.5 22.5, 72.9 24.8 C69.5 24.2, 66.6 22.5, 64.6 20 Z" fill="#647252" />
          <rect x="49" y="19" width="22" height="6" rx="3" fill="#738159" />
          <circle cx="60" cy="22" r="3" fill="#d9c46b" />
          <path className="soldier-helmet-glint" d="M45 16 L52 16 L46 26 L40 26 Z" fill="rgba(255,255,255,0.28)" />
        </g>
      </svg>
    </span>
  );
}

export function SoldadoRecordatorioWidget({
  tasks,
  loading,
  saving,
  displayName,
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
  const avatarSize = isMobile ? 82 : isExtraLargeDesktop ? 132 : isLargeDesktop ? 120 : isDesktop ? 108 : 96;
  const badgeSize = Math.max(20, Math.round(avatarSize * 0.24));
  const badgeFontSize = Math.max(11, Math.round(avatarSize * 0.13));
  const urgentChipSize = Math.max(17, Math.round(avatarSize * 0.21));
  const urgentChipFontSize = Math.max(10, Math.round(avatarSize * 0.12));
  const dragHandleSize = Math.max(20, Math.round(avatarSize * 0.24));
  const dragHandleIconSize = Math.max(14, Math.round(avatarSize * 0.17));
  const widgetPositionSx = useMemo(() => {
    const sideOffset = isMobile ? 10 : 24;
    const verticalOffset = isMobile ? 14 : 24;
    return {
      ...(corner === "TOP_LEFT" || corner === "TOP_RIGHT" ? { top: verticalOffset } : { bottom: verticalOffset }),
      ...(corner === "TOP_LEFT" || corner === "BOTTOM_LEFT" ? { left: sideOffset } : { right: sideOffset }),
    };
  }, [corner, isMobile]);
  const widgetRuntimePositionSx = dragPreview
    ? { top: dragPreview.top, left: dragPreview.left, right: "auto", bottom: "auto" }
    : widgetPositionSx;
  const displayFirstName = normalizeFirstName(displayName);

  const canSubmit = !saving && titulo.trim().length >= 2;

  const triggerDialogue = useCallback(
    (kind: SoldierDialogueKind) => {
      const definition = SOLDIER_DIALOGUES[kind];
      const message = definition.buildMessage({ displayName: displayFirstName, now: new Date() });
      if (!message) return;

      setActiveDialogue({
        kind,
        message,
      });
    },
    [displayFirstName],
  );

  const dismissDialogue = useCallback(() => {
    setActiveDialogue(null);
  }, []);

  useEffect(() => {
    const greetingTimerId = window.setTimeout(() => {
      triggerDialogue("TIME_GREETING");
    }, 80);
    return () => window.clearTimeout(greetingTimerId);
  }, [triggerDialogue]);

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
      const maxLeft = window.innerWidth - state.widgetWidth - viewportPadding;
      const maxTop = window.innerHeight - state.widgetHeight - viewportPadding;
      const nextLeft = clamp(event.clientX - state.offsetX, viewportPadding, Math.max(viewportPadding, maxLeft));
      const nextTop = clamp(event.clientY - state.offsetY, viewportPadding, Math.max(viewportPadding, maxTop));
      setDragPreview({ left: nextLeft, top: nextTop });
    }
  };

  const handleSoldierPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (state.moved) {
      const nextCorner = resolveCornerFromPoint(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
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
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
            Recordatorios
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {urgentCount > 0
              ? `${urgentCount} urgente(s) para resolver hoy.`
              : `${pendingTasks.length} pendiente(s) en seguimiento.`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75}>
          <Button type="button" onClick={onOpenConfig} size="small" variant="outlined" color="inherit">
            Config
          </Button>
          <Button type="button" onClick={closePanel} size="small" variant="outlined" color="inherit">
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
              sx={{ textTransform: "none" }}
            >
              {`Pendientes (${pendingTasks.length})`}
            </Button>
            <Button
              type="button"
              size="small"
              variant={filter === "URGENTES" ? "contained" : "outlined"}
              color={filter === "URGENTES" ? "error" : "inherit"}
              onClick={() => setFilter("URGENTES")}
              sx={{ textTransform: "none" }}
            >
              {`Urgentes (${urgentCount})`}
            </Button>
            <Button
              type="button"
              size="small"
              variant={filter === "HECHAS" ? "contained" : "outlined"}
              color={filter === "HECHAS" ? "success" : "inherit"}
              onClick={() => setFilter("HECHAS")}
              sx={{ textTransform: "none" }}
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
          50% { transform: translateY(-4px); }
        }

        @keyframes soldier-shadow-sway {
          0%, 100% { transform: scaleX(1); opacity: 0.75; }
          50% { transform: scaleX(0.88); opacity: 0.52; }
        }

        @keyframes soldier-eye-blink {
          0%, 44%, 47%, 74%, 77%, 100% { transform: scaleY(1); }
          46% { transform: scaleY(0.15); }
          76% { transform: scaleY(0.2); }
        }

        @keyframes soldier-arm-left {
          0%, 100% { transform: rotate(12deg); }
          50% { transform: rotate(21deg); }
        }

        @keyframes soldier-arm-right {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(-21deg); }
        }

        @keyframes soldier-leg-left {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(5deg); }
        }

        @keyframes soldier-leg-right {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg); }
        }

        @keyframes soldier-breath {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.03); }
        }

        @keyframes soldier-head-bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-0.8px) rotate(-1.1deg); }
        }

        @keyframes soldier-pack-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(1deg); }
        }

        @keyframes soldier-rifle-sway {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(1.7deg) translateY(-0.7px); }
        }

        @keyframes soldier-antenna-bounce {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(2.2deg); }
        }

        @keyframes soldier-chinstrap-sway {
          0%, 100% { transform: translateY(0); opacity: 0.85; }
          50% { transform: translateY(0.45px); opacity: 1; }
        }

        @keyframes soldier-helmet-glint {
          0%, 100% { opacity: 0; transform: translateX(-5px); }
          22% { opacity: 0; transform: translateX(-5px); }
          35% { opacity: 0.9; transform: translateX(3px); }
          45% { opacity: 0; transform: translateX(7px); }
        }

        @keyframes urgent-jitter {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-1.2deg); }
          75% { transform: rotate(1.2deg); }
        }

        @keyframes urgent-pulse {
          0%, 100% { filter: drop-shadow(0 0 0 rgba(190, 18, 60, 0)); }
          50% { filter: drop-shadow(0 0 8px rgba(190, 18, 60, 0.62)); }
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

        .soldier-shadow {
          animation: soldier-shadow-sway 2.1s ease-in-out infinite;
        }

        .soldier-eye {
          transform-origin: center center;
          animation: soldier-eye-blink 4.8s ease-in-out infinite;
        }

        .soldier-pack {
          transform-origin: center center;
          animation: soldier-pack-sway 2.1s ease-in-out infinite;
        }

        .soldier-rifle {
          transform-origin: center bottom;
          animation: soldier-rifle-sway 2.2s ease-in-out infinite;
        }

        .soldier-radio-antenna {
          transform-box: fill-box;
          transform-origin: bottom center;
          animation: soldier-antenna-bounce 2.2s ease-in-out infinite;
        }

        .soldier-strap {
          transform-origin: center center;
          animation: soldier-breath 2.4s ease-in-out infinite;
        }

        .soldier-torso {
          transform-origin: center center;
          animation: soldier-breath 2.4s ease-in-out infinite;
        }

        .soldier-head {
          transform-origin: center bottom;
          animation: soldier-head-bob 2.4s ease-in-out infinite;
        }

        .soldier-helmet {
          transform-origin: center center;
          animation: soldier-head-bob 2.4s ease-in-out infinite;
        }

        .soldier-helmet-glint {
          animation: soldier-helmet-glint 4.2s ease-in-out infinite;
        }

        .soldier-chinstrap {
          animation: soldier-chinstrap-sway 2.4s ease-in-out infinite;
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
          animation: soldier-float 2.1s ease-in-out infinite, urgent-pulse 1.5s ease-in-out infinite, urgent-jitter 0.9s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .soldier-avatar,
          .soldier-shadow,
          .soldier-float,
          .soldier-eye,
          .soldier-pack,
          .soldier-rifle,
          .soldier-radio-antenna,
          .soldier-strap,
          .soldier-torso,
          .soldier-head,
          .soldier-helmet,
          .soldier-helmet-glint,
          .soldier-chinstrap,
          .soldier-arm-left,
          .soldier-arm-right,
          .soldier-leg-left,
          .soldier-leg-right,
          .soldier-urgent {
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
                color="primary"
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: badgeFontSize,
                    minWidth: badgeSize,
                    height: badgeSize,
                    fontWeight: 700,
                  },
                }}
              >
                <MiniSoldadoAvatar urgent={urgentCount > 0} size={avatarSize} />
              </Badge>
              {urgentCount > 0 ? (
                <Chip
                  label="!"
                  color="error"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: Math.round(-avatarSize * 0.04),
                    right: Math.round(-avatarSize * 0.1),
                    height: urgentChipSize,
                    minWidth: urgentChipSize,
                    fontSize: urgentChipFontSize,
                    fontWeight: 800,
                    borderRadius: Math.round(urgentChipSize / 2),
                    "& .MuiChip-label": { px: 0.5, lineHeight: 1 },
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
                bottom: `calc(100% + ${isMobile ? 8 : 10}px)`,
                ...(isRightCorner ? { right: 0 } : { left: 0 }),
                maxWidth: { xs: 190, sm: 230 },
                borderRadius: 2.25,
                px: 1.1,
                py: 0.85,
                bgcolor: "rgba(255,255,255,0.97)",
                color: "#1f261e",
                border: "1px solid rgba(123, 116, 96, 0.35)",
                boxShadow: "0 8px 20px rgba(20, 28, 19, 0.2)",
                pointerEvents: "none",
                zIndex: 2,
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -6,
                  width: 12,
                  height: 12,
                  bgcolor: "rgba(255,255,255,0.97)",
                  borderRight: "1px solid rgba(123, 116, 96, 0.35)",
                  borderBottom: "1px solid rgba(123, 116, 96, 0.35)",
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
            spacing={1}
            sx={{
              minWidth: isMobile ? 178 : 196,
              p: 0.75,
              borderRadius: 3,
              bgcolor: "rgba(255, 255, 255, 0.42)",
              border: "1px solid",
              borderColor: "rgba(126, 121, 102, 0.2)",
              boxShadow: "0 8px 22px rgba(28, 33, 24, 0.14)",
              backdropFilter: "blur(1.5px)",
            }}
          >
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
                px: 1.35,
                py: 0.85,
                borderRadius: 2.25,
                border: "1px solid",
                borderColor: statusSurface.borderColor,
                backgroundImage: statusSurface.backgroundImage,
                color: statusSurface.color,
                boxShadow: "0 8px 18px rgba(20, 28, 19, 0.2)",
                "&:hover": {
                  borderColor: statusSurface.borderColor,
                  backgroundImage: statusSurface.backgroundImage,
                  filter: "brightness(0.97)",
                },
                "& .MuiButton-startIcon": {
                  mt: 0.1,
                  mr: 1,
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
                px: 1.35,
                py: 0.7,
                borderRadius: 2.25,
                color: "#f4f7f5",
                backgroundImage: "linear-gradient(135deg, #36524f 0%, #4f7469 100%)",
                boxShadow: "0 9px 18px rgba(18, 41, 36, 0.24)",
                "&:hover": {
                  backgroundImage: "linear-gradient(135deg, #2f4744 0%, #44655b 100%)",
                  boxShadow: "0 11px 20px rgba(18, 41, 36, 0.29)",
                },
                "& .MuiButton-startIcon": {
                  mr: 0.95,
                },
              }}
            >
              Nueva tarea rapida
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
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: 10,
          }}
        >
          <CardContent sx={{ p: 0 }}>{panelContent}</CardContent>
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
              borderColor: "divider",
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
