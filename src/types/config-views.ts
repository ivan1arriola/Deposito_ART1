/**
 * Tipos organizados para ConfigViews - Separa responsabilidades por feature
 */

import { ReactNode, FormEvent } from "react";

export type Role = "ADMIN" | "EDITOR";
export type RangoConfig = { rangoId: number; abreviacion: string; nombreCompleto: string; orden: number };
export type BateriaConfig = { bateriaId: number; nombre: string; orden: number };
export type EquipoCodigoConfig = { itemCodigoId: string; codigo: string; aclaracion: string | null; orden: number };
export type EquipoConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number; codigos: EquipoCodigoConfig[] };
export type ItemConfig = EquipoConfig;
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
export type FirmaConfig = {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
  updatedAt: string | null;
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

/**
 * Props agrupados por feature area
 */

// Grados / Rangos
export interface RangoConfigState {
  rangos: RangoConfig[];
  newAbreviacion: string;
  newNombreCompleto: string;
  newOrden: string;
  editId: number | null;
  editAbreviacion: string;
  editNombreCompleto: string;
  editOrden: string;
}

export interface RangoConfigCallbacks {
  onNewAbreviacionChange: (value: string) => void;
  onNewNombreCompletoChange: (value: string) => void;
  onNewOrdenChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditAbreviacionChange: (value: string) => void;
  onEditNombreCompletoChange: (value: string) => void;
  onEditOrdenChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (rangoId: number) => void;
  onDelete: (rangoId: number) => void;
}

// Baterías
export interface BateriaConfigState {
  baterias: BateriaConfig[];
  newNombre: string;
  newOrden: string;
  editId: number | null;
  editNombre: string;
  editOrden: string;
}

export interface BateriaConfigCallbacks {
  onNewNombreChange: (value: string) => void;
  onNewOrdenChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditNombreChange: (value: string) => void;
  onEditOrdenChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (bateriaId: number) => void;
  onDelete: (bateriaId: number) => void;
}

// Equipos
export interface EquipoConfigState {
  equipos: EquipoConfig[];
  newEquipo: { nombre: string; activo: boolean; ordenPdf: number; codigos: Array<{ codigo: string; aclaracion: string }> };
  editEquipoId: string | null;
  editEquipo: { nombre: string; activo: boolean; ordenPdf: number; codigos: Array<{ codigo: string; aclaracion: string }> };
  equiposActivos: EquipoConfig[];
  equiposInactivos: EquipoConfig[];
  equiposActivosEnPantalla: EquipoConfig[];
  draggedEquipoId: string | null;
}

export interface EquipoConfigCallbacks {
  onNewEquipoChange: (value: string | boolean, key: keyof Pick<EquipoConfig, "nombre" | "activo">) => void;
  onNewEquipoCodigoChange: (index: number, key: "codigo" | "aclaracion", value: string) => void;
  onAddNewEquipoCodigo: () => void;
  onRemoveNewEquipoCodigo: (index: number) => void;
  onEditEquipoIdChange: (id: string | null) => void;
  onEditEquipoChange: (
    value: string | boolean | number,
    key: keyof Pick<EquipoConfig, "nombre" | "activo" | "ordenPdf">
  ) => void;
  onCreateEquipo: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEquipo: (itemId: string) => void;
  onToggleEquipoActivo: (item: EquipoConfig) => void;
  onDeleteEquipo: (itemId: string) => void;
  onStartEquipoDrag: (itemId: string) => void;
  renderEquipoCard: (item: EquipoConfig, options?: { draggableInActiveList?: boolean }) => ReactNode;
}

// Usuarios Admin
export interface UsuarioConfigState {
  usuarios: UsuarioAdmin[];
  newGrado: string;
  newNombre: string;
  newApellido: string;
  newUsername: string;
  newPassword: string;
  newPasswordConfirm: string;
  newMailReferencia: string;
  newRole: Role;
}

export interface UsuarioConfigCallbacks {
  onNewGradoChange: (value: string) => void;
  onNewNombreChange: (value: string) => void;
  onNewApellidoChange: (value: string) => void;
  onNewUsernameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewPasswordConfirmChange: (value: string) => void;
  onNewMailReferenciaChange: (value: string) => void;
  onNewRoleChange: (role: Role) => void;
  onCreateUsuario: (event: FormEvent<HTMLFormElement>) => void;
  onEditUsuario: (usuario: UsuarioAdmin) => void;
  onChangeUserRole: (usuario: UsuarioAdmin) => void;
  onChangeUserPassword: (usuario: UsuarioAdmin) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
  onDeleteUsuario: (usuario: UsuarioAdmin) => void;
}

// Firma Config
export interface FirmaConfigState {
  firmaConfig: FirmaConfig | null;
  firmaConfigDraft: Omit<FirmaConfig, "updatedAt">;
  firmaConfigLoading: boolean;
  firmaConfigSaving: boolean;
  firmaConfigError: string | null;
}

export interface FirmaConfigCallbacks {
  onFirmaConfigDraftChange: (key: keyof Omit<FirmaConfig, "updatedAt">, value: string) => void;
  onSaveFirmaConfig: (event: FormEvent<HTMLFormElement>) => void;
}

// Auditoría
export interface AuditoriaConfigState {
  auditFilter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";
  auditPage: number;
  auditPageSize: number;
  auditoriaFiltradaPaginada: AuditoriaRecord[];
  auditoriaFiltrada: AuditoriaRecord[];
}

export interface AuditoriaConfigCallbacks {
  onAuditFilterChange: (filter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION") => void;
  onAuditPageChange: (page: number) => void;
  onAuditPageSizeChange: (size: number) => void;
}

// Utilidades compartidas
export interface UtilityFunctions {
  roleLabel: (role: Role | null | undefined) => string;
  roleDescription: (role: Role | null | undefined) => string;
  roleScope: (role: Role | null | undefined) => string;
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown) => ReactNode;
}

/**
 * Props principales del componente ConfigViews
 */
export interface ConfigViewsProps {
  activeView: "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria";
  isAdmin: boolean;
  canWrite: boolean;

  // Feature states
  rango: RangoConfigState;
  rangCallbacks: RangoConfigCallbacks;

  bateria: BateriaConfigState;
  bateriaCallbacks: BateriaConfigCallbacks;

  items: EquipoConfigState;
  itemCallbacks: EquipoConfigCallbacks;

  usuario: UsuarioConfigState;
  usuarioCallbacks: UsuarioConfigCallbacks;

  firmaConfig: FirmaConfigState;
  firmaConfigCallbacks: FirmaConfigCallbacks;

  auditoria: AuditoriaConfigState;
  auditoriaCallbacks: AuditoriaConfigCallbacks;

  // Utilities
  utils: UtilityFunctions;
}
