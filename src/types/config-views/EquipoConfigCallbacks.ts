import type { FormEvent, ReactNode } from "react";
import type { TipoEquipo } from "../entities/TipoEquipo";
import type { EquipoConfig } from "./EquipoConfig";

export interface EquipoConfigCallbacks {
  onNewEquipoChange: (value: string | boolean, key: keyof Pick<EquipoConfig, "nombre" | "tipo" | "activo">) => void;
  onEditEquipoIdChange: (id: string | null) => void;
  onEditEquipoChange: (
    value: string | boolean | number,
    key: keyof Pick<EquipoConfig, "nombre" | "tipo" | "activo" | "ordenPdf">
  ) => void;
  onCreateEquipo: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEquipo: (itemId: string) => void;
  onToggleEquipoActivo: (item: EquipoConfig) => void;
  onDeleteEquipo: (itemId: string) => void;
  onSaveEquipoOrder: () => void;
  onResetEquipoOrderDraft: () => void;
  renderEquipoCard: (
    item: EquipoConfig,
    options?: {
      reorderableInActiveList?: boolean;
      reorderableInInactiveList?: boolean;
      orderIndex?: number;
      orderCount?: number;
      orderGroupType?: TipoEquipo;
    }
  ) => ReactNode;
}
