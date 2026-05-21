/**
 * Tipos de entidades de dominio - Datos principales de la aplicacion
 */

export type Role = "ADMIN" | "EDITOR" | "READ_ONLY";
export type AccountType = "SISTEMA" | "PERSONAL";

export const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "READ_ONLY"];

export type Rango = {
  rangoId: number;
  tipo?: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
};

export type Bateria = {
  bateriaId: number;
  nombre: string;
  orden: number;
};

export type TipoArticulo = "OFICINA" | "LIMPIEZA";

export type Articulo = {
  articuloId: number;
  nombre: string;
  tipo: TipoArticulo;
  stockActual: number;
};

export type Equipo = {
  itemId: string;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
  existenciaSie?: number;
};

export type StockResumen = {
  itemId: string;
  nombre: string;
  ordenPdf: number;
  apareceEnHoja: boolean;
  existenciaSie: number;
  stockSubalternos: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
  stockPersonal: number;
  stockTotal: number;
  // Alias legado para compatibilidad con codigo existente.
  stockActual: number;
};

export type Item = Equipo;

export type Talla = {
  tallaTipo: { nombre: string };
  tallaValor: string;
};

export type TipoOficialSuboficial = "OFICIAL" | "SUBOFICIAL";
export type PrestamoDestinatarioTipo = "PERSONAL" | "OFICIAL" | "SUBOFICIAL";

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
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
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
  actuanteCi: string | null;
  actuanteNombre: string | null;
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

export type RecordatorioTarea = {
  tareaId: string;
  usuarioId: string;
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
  completada: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SoldadoWidgetVariant = "CLASICO" | "TACTICO";

export type RecordatorioConfig = {
  mostrarMuneco: boolean;
};

export type CurrentUser = {
  usuarioId: string;
  rangoId: number;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  rol: Role;
  accountType: AccountType;
  personalCi: string | null;
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
  rangoId: number;
  rango: Rango;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  mailVerificadaAt: string | null;
  rol: Role;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  accountType: AccountType;
  personalCi: string | null;
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
