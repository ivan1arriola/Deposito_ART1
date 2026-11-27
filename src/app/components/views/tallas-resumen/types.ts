import type { TallaKey } from "@/lib/tallas";
import type { Bateria, OficialSuboficial, Personal } from "@/types/entities";

export type ResumenTalla = {
  key: TallaKey;
  label: string;
  values: Array<{ talla: string; cantidad: number }>;
};
export type ResumenBateria = { key: string; nombre: string; total: number; tallas: ResumenTalla[] };

export type SectionId = "subalternos_unidad" | "subalternos_bateria" | "oficiales_suboficiales";
export type TallasResumenSubView = "general" | SectionId;

export type MissingTallasEntry = {
  id: string;
  label: string;
  missing: TallaKey[];
};

export interface TallasResumenViewProps {
  personal: Personal[];
  baterias: Bateria[];
  oficialesSuboficiales: OficialSuboficial[];
  subView?: TallasResumenSubView;
}
