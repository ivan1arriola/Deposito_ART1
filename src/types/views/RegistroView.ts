import type { Role } from "../entities/Role";
import type { RegistroViewTipo } from "./RegistroViewTipo";

export type RegistroView = {
  registroId: string;
  auditoria: {
    auditoriaId: string;
    createdAt: string;
    accion: string;
    usuarioId: string | null;
    usuario: { usuarioId: string; username: string; rol: Role } | null;
    detalle: unknown;
  } | null;
  ci: string;
  usuarioEntregaId: string;
  usuarioEntregaNombre: string;
  fecha: string;
  tipo: RegistroViewTipo;
  afectaStock: boolean;
  comentarios: string | null;
  createdAt: string;
  equipos: Array<{
    equipoId: string;
    nombre: string;
    cantidad: number;
  }>;
};
