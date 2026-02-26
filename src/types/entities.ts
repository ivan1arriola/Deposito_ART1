/**
 * Tipos de entidades de dominio - Datos principales de la aplicación
 */

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

export type Rango = {
  rangoId: number;
  abreviacion: string;
  nombreCompleto: string;
};

export type Bateria = {
  bateriaId: number;
  nombre: string;
};

export type Item = {
  itemId: string;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

export type Talla = {
  tallaTipo: { nombre: string };
  tallaValor: string;
};

export type Personal = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  fechaIngreso: string | null;
  rangoId: number;
  bateriaId: number | null;
  rango: Rango;
  bateria: Bateria | null;
  tallas: Talla[];
};

export type CurrentUser = {
  usuarioId: string;
  username: string;
  rol: Role;
};

export type FirmaConfig = {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
  updatedAt: string | null;
};

export type UsuarioAdmin = {
  usuarioId: string;
  username: string;
  rol: Role;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuditoriaRecord = {
  auditoriaId: string;
  usuarioId: string | null;
  usuario: { usuarioId: string; username: string; rol: Role } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  createdAt: string;
};

export type DbStatus = {
  ok: true;
  database: string | null;
  dbUser: string | null;
  host: string | null;
};
