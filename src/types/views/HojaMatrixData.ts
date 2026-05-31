import type { HojaMatrixEquipo } from "./HojaMatrixEquipo";
import type { HojaMatrixRow } from "./HojaMatrixRow";

export type HojaMatrixData = {
  generatedAt: string;
  equipos: HojaMatrixEquipo[];
  rows: HojaMatrixRow[];
};
