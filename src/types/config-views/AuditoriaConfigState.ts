import type { AuditoriaRecord } from "../entities/AuditoriaRecord";

export interface AuditoriaConfigState {
  auditFilter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";
  auditPage: number;
  auditPageSize: number;
  auditoriaFiltradaPaginada: AuditoriaRecord[];
  auditoriaFiltrada: AuditoriaRecord[];
}
