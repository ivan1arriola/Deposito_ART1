import type { HojaMatrixEquipo } from "./HojaMatrixEquipo";
import type { HojaMatrixRow } from "./HojaMatrixRow";

export type HojaMatrixData = {
  generatedAt: string;
  items: HojaMatrixEquipo[];
  rows: HojaMatrixRow[];
};
