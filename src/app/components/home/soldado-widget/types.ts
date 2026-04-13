import type { RecordatorioTarea, SoldadoWidgetVariant } from "@/types/entities";

export type RecordatorioCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
};

export type TaskFilter = "PENDIENTES" | "URGENTES" | "HECHAS";
export type WidgetCorner = "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT";
export type SoldierDialogueKind = "TIME_GREETING" | "TASKS_TO_DO";

export type SoldierDialogueContext = {
  displayName: string;
  now: Date;
  pendingCount: number;
  urgentCount: number;
};

export type SoldierDialogueDefinition = {
  kind: SoldierDialogueKind;
  buildMessage: (context: SoldierDialogueContext) => string;
};

export type ActiveSoldierDialogue = {
  kind: SoldierDialogueKind;
  message: string;
};

export type SoldadoRecordatorioWidgetProps = {
  tasks: RecordatorioTarea[];
  loading: boolean;
  saving: boolean;
  displayName?: string | null;
  variant?: SoldadoWidgetVariant;
  onCreateTask: (input: RecordatorioCreateInput) => Promise<void> | void;
  onToggleTask: (tareaId: string, completada: boolean) => Promise<void> | void;
  onOpenConfig: () => void;
};
