import type { EquipoResumenEquipo } from "./EquipoResumenEquipo";
import type { EquipoResumenRow } from "./EquipoResumenRow";

export type EquipoResumenData = {
  generatedAt: string;
  equipos: EquipoResumenEquipo[];
  unidad: EquipoResumenRow;
  baterias: EquipoResumenRow[];
};
