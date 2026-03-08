/**
 * Tipos de entidades de dominio - Datos principales de la aplicación
 */

export type Role = "ADMIN" | "EDITOR" | "READ_ONLY";

export const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "READ_ONLY"];

export type Rango = {
  rangoId: number;
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
};

export type Bateria = {
  bateriaId: number;
  nombre: string;
  orden: number;
};

export type Equipo = {
  itemId: string;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

export type StockResumen = {
  itemId: string;
  nombre: string;
  ordenPdf: number;
  apareceEnHoja: boolean;
  stockDeposito: number;
  stockPersonal: number;
  stockTotal: number;
  // Alias legado para compatibilidad con código existente.
  stockActual: number;
};

export type Item = Equipo;

export type Talla = {
  tallaTipo: { nombre: string };
  tallaValor: string;
};

export type TipoOficialSuboficial = "OFICIAL" | "SUBOFICIAL";
export type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL_SUBOFICIAL";

export type GradoMando = {
  gradoMandoId: number;
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
};

export type Personal = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  esReingreso: boolean;
  fechaIngreso: string | null;
  fechaIngresoOriginal: string | null;
  rangoId: number;
  bateriaId: number | null;
  rango: Rango;
  bateria: Bateria | null;
  tallas: Talla[];
};

export type OficialSuboficial = {
  ci: string;
  nombre: string;
  apellido: string;
  tipo: TipoOficialSuboficial;
  gradoMandoId: number;
  gradoMando: GradoMando;
  tallas: Talla[];
};

export type PrestamoItem = {
  itemId: string;
  nombre: string;
  cantidad: number;
};

export type PrestamoRecord = {
  prestamoId: string;
  reciboNumero: string;
  destinatarioTipo: PrestamoDestinatarioTipo;
  destinatarioCi: string;
  destinatarioNombre: string;
  destinatarioEtiqueta: string;
  usuarioEntregaId: string;
  usuarioEntregaNombre: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  usuarioRecibeDevolucionId: string | null;
  usuarioRecibeDevolucionNombre: string | null;
  comentarios: string | null;
  estado: "PENDIENTE" | "DEVUELTO";
  items: PrestamoItem[];
};

export type PersonalObservacion = {
  observacionId: string;
  ci: string;
  fecha: string;
  texto: string;
  createdAt: string;
};

export type CurrentUser = {
  usuarioId: string;
  grado: string;
  nombre: string;
  apellido: string;
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
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
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
  ciReferencias?: Record<string, string>;
  createdAt: string;
};

export type DbStatus = {
  ok: true;
  database: string | null;
  dbUser: string | null;
  host: string | null;
};
