import type { Role } from "./Role";

export type AuditoriaRecord = {
  auditoriaId: string;
  usuarioId: string | null;
  usuario: {
    usuarioId: string;
    username: string;
    rol: Role;
    nombre?: string;
    apellido?: string;
    rango?: { abreviacion: string } | null;
  } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  ciReferencias?: Record<string, string>;
  createdAt: string;
};
