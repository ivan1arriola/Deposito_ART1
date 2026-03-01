"use client";

import { FormEvent, ReactNode } from "react";
import { SmallActionButton, CatalogCard, PaginationControls } from "../shared";

type Role = "ADMIN" | "EDITOR" | "VIEWER";
type RangoConfig = { rangoId: number; abreviacion: string; nombreCompleto: string };
type BateriaConfig = { bateriaId: number; nombre: string };
type ItemConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
type UsuarioAdmin = { usuarioId: string; username: string; email: string; rol: Role; activo: boolean; createdAt: string; updatedAt: string };
type FirmaConfig = { encargadoRango: string; encargadoNombre: string; oficialRango: string; oficialNombre: string; updatedAt: string | null };
type AuditoriaRecord = {
  auditoriaId: string;
  usuarioId: string | null;
  usuario: { usuarioId: string; username: string; rol: Role } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  createdAt: string;
};

interface ConfigViewsProps {
  activeView: "grados" | "baterias" | "items" | "admin";
  isAdmin: boolean;
  canWrite: boolean;
  // Grados state
  rangos: RangoConfig[];
  newRangoAbreviacion: string;
  newRangoNombreCompleto: string;
  editRangoId: number | null;
  editRangoAbreviacion: string;
  editRangoNombreCompleto: string;
  // Baterias state
  baterias: BateriaConfig[];
  newBateria: string;
  editBateriaId: number | null;
  editBateriaNombre: string;
  // Items state
  items: ItemConfig[];
  newItem: { nombre: string; activo: boolean; ordenPdf: number };
  editItemId: string | null;
  editItem: { nombre: string; activo: boolean; ordenPdf: number };
  itemsActivos: ItemConfig[];
  itemsInactivos: ItemConfig[];
  itemsActivosEnPantalla: ItemConfig[];
  draggedItemId: string | null;
  // Usuarios state
  usuarios: UsuarioAdmin[];
  newUsername: string;
  newPassword: string;
  newEmail: string;
  newRole: Role;
  // Firma config state
  firmaConfig: FirmaConfig | null;
  firmaConfigDraft: Omit<FirmaConfig, "updatedAt">;
  firmaConfigLoading: boolean;
  firmaConfigSaving: boolean;
  firmaConfigError: string | null;
  // Auditoria state
  auditFilter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";
  auditPage: number;
  auditPageSize: number;
  auditoriaFiltradaPaginada: AuditoriaRecord[];
  auditoriaFiltrada: AuditoriaRecord[];
  // Callbacks
  onNewRangoAbreviacionChange: (value: string) => void;
  onNewRangoNombreCompletoChange: (value: string) => void;
  onEditRangoIdChange: (id: number | null) => void;
  onEditRangoAbreviacionChange: (value: string) => void;
  onEditRangoNombreCompletoChange: (value: string) => void;
  onCreateRango: () => void;
  onUpdateRango: (rangoId: number) => void;
  onDeleteRango: (rangoId: number) => void;
  // Baterias callbacks
  onNewBateriaChange: (value: string) => void;
  onEditBateriaIdChange: (id: number | null) => void;
  onEditBateriaNombreChange: (value: string) => void;
  onCreateBateria: () => void;
  onUpdateBateria: (bateriaId: number) => void;
  onDeleteBateria: (bateriaId: number) => void;
  // Items callbacks
  onNewItemChange: (value: Partial<ItemConfig["nombre" | "activo"]>, key: keyof Omit<ItemConfig, "itemId" | "ordenPdf">) => void;
  onEditItemIdChange: (id: string | null) => void;
  onEditItemChange: (value: Partial<ItemConfig>, key: keyof Omit<ItemConfig, "itemId">) => void;
  onCreateItem: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateItem: (itemId: string) => void;
  onToggleItemActivo: (item: ItemConfig) => void;
  onDeleteItem: (itemId: string) => void;
  onStartItemDrag: (itemId: string) => void;
  renderItemCard: (item: ItemConfig, options?: { draggableInActiveList?: boolean }) => ReactNode;
  // Usuarios callbacks
  onNewUsernameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewEmailChange: (value: string) => void;
  onNewRoleChange: (role: Role) => void;
  onCreateUsuario: (event: FormEvent<HTMLFormElement>) => void;
  onChangeUserRole: (usuarioId: string, currentRole: Role) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
  onResetUserPassword: (usuario: UsuarioAdmin) => void;
  onDeleteUsuario: (usuario: UsuarioAdmin) => void;
  // Firma config callbacks
  onFirmaConfigDraftChange: (key: keyof Omit<FirmaConfig, "updatedAt">, value: string) => void;
  onSaveFirmaConfig: (event: FormEvent<HTMLFormElement>) => void;
  // Auditoria callbacks
  onAuditFilterChange: (filter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION") => void;
  onAuditPageChange: (page: number) => void;
  onAuditPageSizeChange: (size: number) => void;
  // Utility functions
  roleLabel: (role: Role | null | undefined) => string;
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown) => ReactNode;
}

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

export function ConfigViews(props: ConfigViewsProps) {
  if (props.activeView === "grados") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Grado del Personal</h2>
          {!props.isAdmin ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: solo el administrador puede crear, editar o eliminar grados.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
            <input
              value={props.newRangoAbreviacion}
              onChange={(event) => props.onNewRangoAbreviacionChange(event.target.value)}
              placeholder="Abreviacion"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={!props.isAdmin}
            />
            <input
              value={props.newRangoNombreCompleto}
              onChange={(event) => props.onNewRangoNombreCompletoChange(event.target.value)}
              placeholder="Nombre completo"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={!props.isAdmin}
            />
            <button
              type="button"
              onClick={() => props.onCreateRango()}
              disabled={!props.isAdmin}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Crear
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {props.rangos.map((rango) => (
              <div key={rango.rangoId} className="rounded-lg bg-stone-100/80 p-2">
                {props.editRangoId === rango.rangoId ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                    <input
                      value={props.editRangoAbreviacion}
                      onChange={(event) => props.onEditRangoAbreviacionChange(event.target.value)}
                      className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                    />
                    <input
                      value={props.editRangoNombreCompleto}
                      onChange={(event) => props.onEditRangoNombreCompletoChange(event.target.value)}
                      className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                    />
                    {props.isAdmin ? (
                      <div className="flex gap-2">
                        <SmallActionButton text="Ok" tone="ok" onClick={() => props.onUpdateRango(rango.rangoId)} />
                        <SmallActionButton
                          text="Cancelar"
                          tone="neutral"
                          onClick={() => {
                            props.onEditRangoIdChange(null);
                            props.onEditRangoAbreviacionChange("");
                            props.onEditRangoNombreCompletoChange("");
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm font-medium text-stone-800">{props.rangoLabel(rango)}</span>
                    {props.isAdmin ? (
                      <div className="flex gap-2">
                        <SmallActionButton
                          text="Editar"
                          tone="edit"
                          onClick={() => {
                            props.onEditRangoIdChange(rango.rangoId);
                            props.onEditRangoAbreviacionChange(rango.abreviacion);
                            props.onEditRangoNombreCompletoChange(rango.nombreCompleto);
                          }}
                        />
                        <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteRango(rango.rangoId)} />
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "baterias") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <CatalogCard
          title="Baterías"
          placeholder="Nueva bateria"
          newValue={props.newBateria}
          onNewValueChange={props.onNewBateriaChange}
          onCreate={() => props.onCreateBateria()}
          createDisabled={!props.isAdmin}
        >
          {props.baterias.map((bateria) => (
            <div key={bateria.bateriaId} className="rounded-lg bg-stone-100/80 p-2">
              {props.editBateriaId === bateria.bateriaId ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={props.editBateriaNombre}
                    onChange={(event) => props.onEditBateriaNombreChange(event.target.value)}
                    className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    <SmallActionButton text="Ok" tone="ok" onClick={() => props.onUpdateBateria(bateria.bateriaId)} />
                    <SmallActionButton
                      text="Cancelar"
                      tone="neutral"
                      onClick={() => {
                        props.onEditBateriaIdChange(null);
                        props.onEditBateriaNombreChange("");
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-medium text-stone-800">{bateria.nombre}</span>
                  <div className="flex gap-2">
                    <SmallActionButton
                      text="Editar"
                      tone="edit"
                      onClick={() => {
                        props.onEditBateriaIdChange(bateria.bateriaId);
                        props.onEditBateriaNombreChange(bateria.nombre);
                      }}
                    />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteBateria(bateria.bateriaId)} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </CatalogCard>
      </section>
    );
  }

  if (props.activeView === "items") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Items</h2>
          <form onSubmit={props.onCreateItem} className="mt-3 space-y-2">
            <input
              value={props.newItem.nombre}
              onChange={(event) => props.onNewItemChange(event.target.value, "nombre")}
              placeholder="Nuevo item"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={props.newItem.activo}
                  onChange={(event) => props.onNewItemChange(event.target.checked, "activo")}
                />
                Activo
              </label>
            </div>
            <button
              type="submit"
              disabled={!props.canWrite}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Crear item
            </button>
          </form>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-stone-900">Items activos</h3>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {props.itemsActivosEnPantalla.length}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                  </svg>
                  Arrastra los items para cambiar su orden en el PDF
                </span>
              </p>
            </div>
            {props.itemsActivosEnPantalla.length > 0 ? (
              <div className="space-y-2">
                {props.itemsActivosEnPantalla.map((item) => props.renderItemCard(item, { draggableInActiveList: true }))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">Sin items activos.</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-stone-900">Items inactivos</h3>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {props.itemsInactivos.length}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                Los items inactivos no aparecen en la Ficha de Personal ni en el formulario de registrar movimientos.
              </p>
            </div>
            {props.itemsInactivos.length > 0 ? (
              <div className="space-y-2">
                {props.itemsInactivos.map((item) => props.renderItemCard(item))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">Sin items inactivos.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "admin" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="ej-card rounded-2xl p-4 lg:col-span-2">
          <h2 className="text-base font-semibold text-stone-900">Firmas institucionales (solo administrador)</h2>
          <p className="mt-1 text-xs text-stone-600">
            Esta seccion controla los datos de quienes firman la hoja de entrega. Los textos institucionales son fijos.
          </p>
          <div className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold text-stone-700">Textos institucionales (fijos):</p>
            <p className="text-xs text-stone-600">
              • Encargado: El Encargado del Deposito General del Grp. &quot;Brig. Gral. Manuel Oribe&quot; de Artilleria 105mm No. 1.
            </p>
            <p className="text-xs text-stone-600">
              • Oficial: El Oficial de Administracion del Grp. &quot;Brig. Gral. Manuel Oribe&quot; de Artilleria 105mm No. 1.
            </p>
          </div>
          {props.firmaConfigLoading ? (
            <p className="mt-3 text-sm text-stone-600">Cargando configuracion de firmas...</p>
          ) : (
            <form onSubmit={props.onSaveFirmaConfig} className="mt-3 space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-stone-800">Datos del Encargado</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Rango</span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.encargadoRango}
                      onChange={(event) => props.onFirmaConfigDraftChange("encargadoRango", event.target.value)}
                      placeholder="Ej: Sgto."
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Nombre</span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.encargadoNombre}
                      onChange={(event) => props.onFirmaConfigDraftChange("encargadoNombre", event.target.value)}
                      placeholder="Ej: Wilson Lara"
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-stone-800">Datos del Oficial</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Rango</span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.oficialRango}
                      onChange={(event) => props.onFirmaConfigDraftChange("oficialRango", event.target.value)}
                      placeholder="Ej: -Tte.2º"
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Nombre</span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.oficialNombre}
                      onChange={(event) => props.onFirmaConfigDraftChange("oficialNombre", event.target.value)}
                      placeholder="Ej: Gerardo Otero"
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-stone-600">
                  {props.firmaConfig?.updatedAt
                    ? `Ultima actualizacion: ${new Date(props.firmaConfig.updatedAt).toLocaleString("es-UY")}`
                    : "Sin actualizaciones registradas todavia."}
                </p>
                <button
                  type="submit"
                  disabled={props.firmaConfigSaving}
                  className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {props.firmaConfigSaving ? "Guardando..." : "Guardar firmas"}
                </button>
              </div>
              {props.firmaConfigError ? <p className="text-xs font-medium text-rose-700">{props.firmaConfigError}</p> : null}
            </form>
          )}
        </article>

        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Usuarios y privilegios</h2>
          <form onSubmit={props.onCreateUsuario} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={props.newUsername}
              onChange={(event) => props.onNewUsernameChange(event.target.value)}
              placeholder="Nombre de usuario"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={props.newEmail}
              onChange={(event) => props.onNewEmailChange(event.target.value)}
              placeholder="Email"
              type="email"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={props.newPassword}
              onChange={(event) => props.onNewPasswordChange(event.target.value)}
              placeholder="Contraseña (min 8)"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              type="password"
            />
            <select
              value={props.newRole}
              onChange={(event) => props.onNewRoleChange(event.target.value as Role)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>
                  {props.roleLabel(role)}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!props.isAdmin}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Crear usuario
            </button>
          </form>

          <div className="mt-3 space-y-2">
            {props.usuarios.map((usuario) => (
              <div key={usuario.usuarioId} className="rounded-lg bg-stone-100/80 p-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {usuario.username} ({props.roleLabel(usuario.rol)})
                    </p>
                    <p className="text-xs text-stone-600">{usuario.email}</p>
                    <p className="text-xs text-stone-600">{usuario.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SmallActionButton
                      text="Rol"
                      tone="edit"
                      onClick={() => props.onChangeUserRole(usuario.usuarioId, usuario.rol)}
                    />
                    <SmallActionButton
                      text={usuario.activo ? "Desactivar" : "Activar"}
                      tone="neutral"
                      onClick={() => props.onToggleUserActive(usuario)}
                    />
                    <SmallActionButton text="Codigo" tone="ok" onClick={() => props.onResetUserPassword(usuario)} />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteUsuario(usuario)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Auditoria detallada (interfaz y base de datos)</h2>
          <p className="mt-1 text-xs text-stone-600">
            Cada registro muestra quien hizo la accion, sobre que entidad y el detalle guardado en la tabla de auditoria.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => props.onAuditFilterChange("TODOS")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                props.auditFilter === "TODOS" ? "bg-stone-800 text-white" : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Todo
            </button>
            <button
              type="button"
              onClick={() => props.onAuditFilterChange("MOVIMIENTOS")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                props.auditFilter === "MOVIMIENTOS"
                  ? "bg-stone-800 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Solo movimientos
            </button>
            <button
              type="button"
              onClick={() => props.onAuditFilterChange("AUTENTICACION")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                props.auditFilter === "AUTENTICACION"
                  ? "bg-stone-800 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Solo autenticacion
            </button>
          </div>
          <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
            {props.auditoriaFiltradaPaginada.map((log) => (
              <div key={log.auditoriaId} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                <p className="text-xs text-stone-600">{new Date(log.createdAt).toLocaleString("es-UY")}</p>
                <p className="text-sm font-medium text-stone-900">
                  {`${log.usuario?.username ?? "Sistema"} (${props.roleLabel(log.usuario?.rol ?? null)}) - ${props.auditActionLabel(log.accion)} ${props.auditEntityLabel(log.entidad)}`}
                </p>
                <p className="text-xs text-stone-600">{`Auditoria BD #${log.auditoriaId}`}</p>
                <p className="text-xs text-stone-600">{log.entidadId ? `Entidad ID: ${log.entidadId}` : "Entidad sin ID"}</p>
                {props.renderAuditDetalle(log.detalle)}
              </div>
            ))}
            {props.auditoriaFiltrada.length === 0 ? (
              <p className="text-sm text-stone-600">No hay eventos para este filtro.</p>
            ) : null}
          </div>
          {props.auditoriaFiltrada.length > 0 ? (
            <PaginationControls
              page={props.auditPage}
              pageSize={props.auditPageSize}
              totalItems={props.auditoriaFiltrada.length}
              itemLabel="eventos"
              onPageChange={props.onAuditPageChange}
              onPageSizeChange={props.onAuditPageSizeChange}
              className="mt-3"
            />
          ) : null}
        </article>
      </section>
    );
  }

  return null;
}
