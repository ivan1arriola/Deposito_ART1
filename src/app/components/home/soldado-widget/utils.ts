import type { RecordatorioTarea } from "@/types/entities";
import type {
  SoldierDialogueDefinition,
  SoldierDialogueKind,
  WidgetCorner,
} from "./types";

export const WIDGET_CORNER_STORAGE_KEY = "soldado-recordatorio-widget-corner";
export const WIDGET_DRAG_THRESHOLD_PX = 10;

export function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function offsetIsoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskUrgent(task: RecordatorioTarea, todayKey: string) {
  return task.prioridad === "URGENTE" || Boolean(task.fechaLimite && task.fechaLimite <= todayKey);
}

export function sortPendingTasks(a: RecordatorioTarea, b: RecordatorioTarea) {
  if (a.prioridad !== b.prioridad) return a.prioridad === "URGENTE" ? -1 : 1;
  if (!a.fechaLimite && !b.fechaLimite) return 0;
  if (!a.fechaLimite) return 1;
  if (!b.fechaLimite) return -1;
  if (a.fechaLimite < b.fechaLimite) return -1;
  if (a.fechaLimite > b.fechaLimite) return 1;
  return 0;
}

export function sortCompletedTasks(a: RecordatorioTarea, b: RecordatorioTarea) {
  if (a.updatedAt > b.updatedAt) return -1;
  if (a.updatedAt < b.updatedAt) return 1;
  return 0;
}

export function isWidgetCorner(value: string | null): value is WidgetCorner {
  return value === "TOP_LEFT" || value === "TOP_RIGHT" || value === "BOTTOM_LEFT" || value === "BOTTOM_RIGHT";
}

export function resolveCornerFromPoint(clientX: number, clientY: number, viewportWidth: number, viewportHeight: number): WidgetCorner {
  const vertical = clientY <= viewportHeight / 2 ? "TOP" : "BOTTOM";
  const horizontal = clientX <= viewportWidth / 2 ? "LEFT" : "RIGHT";
  return `${vertical}_${horizontal}` as WidgetCorner;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function clampWidgetPosition(
  position: { left: number; top: number },
  widgetSize: { width: number; height: number },
  viewportSize: { width: number; height: number },
  viewportPadding: number,
  bounds?: {
    minLeft?: number;
    minTop?: number;
  },
) {
  const maxLeft = viewportSize.width - widgetSize.width - viewportPadding;
  const maxTop = viewportSize.height - widgetSize.height - viewportPadding;
  const minLeft = Math.max(viewportPadding, bounds?.minLeft ?? viewportPadding);
  const minTop = Math.max(viewportPadding, bounds?.minTop ?? viewportPadding);
  return {
    left: clamp(position.left, minLeft, Math.max(minLeft, maxLeft)),
    top: clamp(position.top, minTop, Math.max(minTop, maxTop)),
  };
}

export function normalizeFirstName(displayName: string | null | undefined) {
  if (typeof displayName !== "string") return "";
  const normalized = displayName.replace(/\s+/g, " ").trim();
  if (normalized === "") return "";
  const [firstToken] = normalized.split(" ");
  return firstToken ?? normalized;
}

export function resolveGreetingByHour(now: Date) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Buenos dias";
  if (hour >= 12 && hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

function tasksLabel(count: number) {
  return count === 1 ? "tarea" : "tareas";
}

export const SOLDIER_DIALOGUES: Record<SoldierDialogueKind, SoldierDialogueDefinition> = {
  TIME_GREETING: {
    kind: "TIME_GREETING",
    buildMessage: ({ displayName, now }) => {
      const greeting = resolveGreetingByHour(now);
      return displayName ? `${greeting}, ${displayName}.` : `${greeting}.`;
    },
  },
  TASKS_TO_DO: {
    kind: "TASKS_TO_DO",
    buildMessage: ({ pendingCount, urgentCount }) => {
      if (pendingCount <= 0) return "Sin tareas pendientes por ahora.";
      if (urgentCount > 0) {
        return `${pendingCount} ${tasksLabel(pendingCount)} por hacer, ${urgentCount} urgente(s).`;
      }
      return `${pendingCount} ${tasksLabel(pendingCount)} por hacer.`;
    },
  },
};
