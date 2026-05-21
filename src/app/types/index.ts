// Tipos de entidades principales
export type Rango = {
  rangoId: number;
  tipo?: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
};
export type Bateria = { bateriaId: number; nombre: string; orden: number };
export type Equipo = { itemId: string; nombre: string; activo: boolean; ordenPdf: number; existenciaSie?: number };
export type Item = Equipo;
export type Talla = { tallaTipo: { nombre: string }; tallaValor: string };

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

// Tipos de formularios
export type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  telefonoContacto: string;
  esReingreso: boolean;
  fechaIngreso: string;
  fechaIngresoOriginal: string;
  rangoId: string;
  bateriaId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export type EquipoForm = {
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};
export type ItemForm = EquipoForm;

// Tipos de autenticación y permisos
export type Role = "ADMIN" | "EDITOR" | "READ_ONLY";
export type AccountType = "SISTEMA" | "PERSONAL";

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

// Tipos de vistas
export type MainView = "personal" | "oficiales" | "suboficiales" | "personal_nuevo" | "oficial_nuevo" | "suboficial_nuevo" | "equipo_nuevo" | "articulo_nuevo" | "articulo_stock_ingreso" | "bateria_nueva" | "grado_nuevo" | "usuario_nuevo" | "formularios" | "prestamos_registrar" | "prestamos_vigentes" | "prestamos_historial" | "stock" | "stock_total" | "stock_actual" | "stock_alta" | "stock_baja" | "stock_historial" | "stock_prestamos" | "hoja_matrix" | "equipo_resumen" | "tallas_resumen" | "tallas_resumen_subalternos_unidad" | "tallas_resumen_subalternos_bateria" | "tallas_resumen_oficiales_suboficiales" | "grados" | "baterias" | "articulos" | "equipos" | "firmas" | "usuarios" | "auditoria";

// Tipos de registros
export type RegistroTipo = "ENTREGA" | "DEVOLUCION";
export type RegistroViewTipo = RegistroTipo | "AJUSTE";

export type RegistroDraftEquipo = {
  itemId: string;
  cantidad: string;
};
export type RegistroDraftItem = RegistroDraftEquipo;

export type RegistroDraft = {
  modo: "crear" | "rectificar";
  registroId: string | null;
  ci: string;
  ciList: string[];
  tipo: RegistroTipo;
  afectaStock: boolean;
  fecha: string;
  comentarios: string;
  items: RegistroDraftEquipo[];
};

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
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
  }>;
};

export type RegistroViewerState = {
  ci: string;
  nombre: string;
  loading: boolean;
  error: string | null;
  registros: RegistroView[];
};

// Tipos de configuración
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

// Tipos de estado de la base de datos
export type DbStatus = {
  ok: true;
  database: string | null;
  dbUser: string | null;
  host: string | null;
};

// Tipos de hojas
export type HojaMatrixEquipo = {
  itemId: string;
  nombre: string;
};
export type HojaMatrixItem = HojaMatrixEquipo;

export type HojaMatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  bateriaOrden: number | null;
  grado: string;
  gradoOrden: number;
  gradoAbreviacion: string;
  totales: number[];
  totalGeneral: number;
};

export type HojaMatrixData = {
  generatedAt: string;
  items: HojaMatrixEquipo[];
  rows: HojaMatrixRow[];
};

// Tipos de diálogos
export type ConfirmDialogState = {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: "danger" | "neutral";
  onConfirm: () => Promise<void> | void;
};

// Constantes de filtros
export type AuditFilter = "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";
