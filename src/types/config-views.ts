/**
 * Tipos organizados para ConfigViews - Separa responsabilidades por feature
 */

import { ReactNode, FormEvent } from "react";

export type Role = "ADMIN" | "EDITOR" | "VIEWER";
export type RangoConfig = { rangoId: number; abreviacion: string; nombreCompleto: string };
export type BateriaConfig = { bateriaId: number; nombre: string };
export type ItemConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
export type UsuarioAdmin = {
  usuarioId: string;
  username: string;
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
  editId: number | null;
  editAbreviacion: string;
  editNombreCompleto: string;
}

export interface RangoConfigCallbacks {
  onNewAbreviacionChange: (value: string) => void;
  onNewNombreCompletoChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditAbreviacionChange: (value: string) => void;
  onEditNombreCompletoChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (rangoId: number) => void;
  onDelete: (rangoId: number) => void;
}

// Baterías
export interface BateriaConfigState {
  baterias: BateriaConfig[];
  newNombre: string;
  editId: number | null;
  editNombre: string;
}

export interface BateriaConfigCallbacks {
  onNewNombreChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditNombreChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (bateriaId: number) => void;
  onDelete: (bateriaId: number) => void;
}

// Items
export interface ItemConfigState {
  items: ItemConfig[];
  newItem: { nombre: string; activo: boolean; ordenPdf: number };
  editItemId: string | null;
  editItem: { nombre: string; activo: boolean; ordenPdf: number };
  itemsActivos: ItemConfig[];
  itemsInactivos: ItemConfig[];
  itemsActivosEnPantalla: ItemConfig[];
  draggedItemId: string | null;
}

export interface ItemConfigCallbacks {
  onNewItemChange: (value: Partial<ItemConfig>, key: keyof Omit<ItemConfig, "itemId" | "ordenPdf">) => void;
  onEditItemIdChange: (id: string | null) => void;
  onEditItemChange: (value: Partial<ItemConfig>, key: keyof Omit<ItemConfig, "itemId">) => void;
  onCreateItem: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateItem: (itemId: string) => void;
  onToggleItemActivo: (item: ItemConfig) => void;
  onDeleteItem: (itemId: string) => void;
  onStartItemDrag: (itemId: string) => void;
  renderItemCard: (item: ItemConfig, options?: { draggableInActiveList?: boolean }) => ReactNode;
}

// Usuarios Admin
export interface UsuarioConfigState {
  usuarios: UsuarioAdmin[];
  newUsername: string;
  newPassword: string;
  newRole: Role;
}

export interface UsuarioConfigCallbacks {
  onNewUsernameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewRoleChange: (role: Role) => void;
  onCreateUsuario: (event: FormEvent<HTMLFormElement>) => void;
  onChangeUserRole: (usuarioId: string, currentRole: Role) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
  onResetUserPassword: (usuario: UsuarioAdmin) => void;
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
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown) => ReactNode;
}

/**
 * Props principales del componente ConfigViews
 */
export interface ConfigViewsProps {
  activeView: "grados" | "baterias" | "items" | "admin";
  isAdmin: boolean;
  canWrite: boolean;

  // Feature states
  rango: RangoConfigState;
  rangCallbacks: RangoConfigCallbacks;

  bateria: BateriaConfigState;
  bateriaCallbacks: BateriaConfigCallbacks;

  items: ItemConfigState;
  itemCallbacks: ItemConfigCallbacks;

  usuario: UsuarioConfigState;
  usuarioCallbacks: UsuarioConfigCallbacks;

  firmaConfig: FirmaConfigState;
  firmaConfigCallbacks: FirmaConfigCallbacks;

  auditoria: AuditoriaConfigState;
  auditoriaCallbacks: AuditoriaConfigCallbacks;

  // Utilities
  utils: UtilityFunctions;
}
