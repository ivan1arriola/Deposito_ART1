import type { EquipoResumenItem } from "./EquipoResumenItem";
import type { EquipoResumenRow } from "./EquipoResumenRow";

export type EquipoResumenData = {
  generatedAt: string;
  items: EquipoResumenItem[];
  unidad: EquipoResumenRow;
  baterias: EquipoResumenRow[];
};
