import type { BateriaConfig } from "./BateriaConfig";

export interface BateriaConfigState {
  baterias: BateriaConfig[];
  newNombre: string;
  newOrden: string;
  editId: number | null;
  editNombre: string;
  editOrden: string;
}
