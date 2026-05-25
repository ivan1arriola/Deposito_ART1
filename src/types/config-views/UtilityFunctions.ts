import type { ReactNode } from "react";
import type { Role } from "../entities/Role";
import type { RangoConfig } from "./RangoConfig";

export interface UtilityFunctions {
  roleLabel: (role: Role | null | undefined) => string;
  roleDescription: (role: Role | null | undefined) => string;
  roleScope: (role: Role | null | undefined) => string;
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown, ciReferences?: Record<string, string>, accion?: string) => ReactNode;
}
