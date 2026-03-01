// Tipos de entidades principales
export type Rango = { rangoId: number; abreviacion: string; nombreCompleto: string };
export type Bateria = { bateriaId: number; nombre: string };
export type Item = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
export type Talla = { tallaTipo: { nombre: string }; tallaValor: string };

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

// Tipos de formularios
export type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  fechaIngreso: string;
  rangoId: string;
  bateriaId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

export type ItemForm = {
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

// Tipos de autenticación y permisos
export type Role = "ADMIN" | "EDITOR";

export type CurrentUser = {
  usuarioId: string;
  username: string;
  rol: Role;
};

// Tipos de vistas
export type MainView = "personal" | "hoja_matrix" | "tallas_resumen" | "grados" | "baterias" | "items" | "firmas" | "usuarios" | "auditoria";

// Tipos de registros
export type RegistroTipo = "ENTREGA" | "DEVOLUCION";
export type RegistroViewTipo = RegistroTipo | "AJUSTE";

export type RegistroDraftItem = {
  itemId: string;
  cantidad: string;
};

export type RegistroDraft = {
  modo: "crear" | "rectificar";
  registroId: string | null;
  ci: string;
  tipo: RegistroTipo;
  fecha: string;
  comentarios: string;
  items: RegistroDraftItem[];
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
  fecha: string;
  tipo: RegistroViewTipo;
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

// Tipos de estado de la base de datos
export type DbStatus = {
  ok: true;
  database: string | null;
  dbUser: string | null;
  host: string | null;
};

// Tipos de hojas
export type HojaMatrixItem = {
  itemId: string;
  nombre: string;
};

export type HojaMatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  grado: string;
  totales: number[];
  totalGeneral: number;
};

export type HojaMatrixData = {
  generatedAt: string;
  items: HojaMatrixItem[];
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
