import type { ReactNode } from "react";
import type { RecordatorioConfig, RecordatorioTarea, SoldadoWidgetVariant } from "@/types/entities";
import type { MainView } from "@/types/views";

export type SoldadoRecordatorioWidgetCreateInput = {
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
};

export type SoldadoRecordatorioWidgetRenderContext = {
  activeView: MainView;
  config: RecordatorioConfig;
  tasks: RecordatorioTarea[];
  loading: boolean;
  saving: boolean;
  displayName: string;
  soldadoVariant: SoldadoWidgetVariant;
  onCreateTask: (input: SoldadoRecordatorioWidgetCreateInput) => Promise<void> | void;
  onToggleTask: (tareaId: string, completada: boolean) => Promise<void> | void;
  onOpenConfig: () => void;
};

export interface SoldadoWidgetRenderStrategy {
  canHandle: (context: SoldadoRecordatorioWidgetRenderContext) => boolean;
  render: (context: SoldadoRecordatorioWidgetRenderContext) => ReactNode;
}
