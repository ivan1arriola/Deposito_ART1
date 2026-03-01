"use client";

import { FormEvent, ReactNode } from "react";
import { SmallActionButton, PaginationControls } from "../shared";

type Role = "ADMIN" | "EDITOR";
type RangoConfig = { rangoId: number; abreviacion: string; nombreCompleto: string; orden: number };
type BateriaConfig = { bateriaId: number; nombre: string; orden: number };
type EquipoConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
type UsuarioAdmin = { usuarioId: string; username: string; rol: Role; activo: boolean; createdAt: string; updatedAt: string };
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
  activeView: "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria";
  isAdmin: boolean;
  canWrite: boolean;
  // Grados state
  rangos: RangoConfig[];
  newRangoAbreviacion: string;
  newRangoNombreCompleto: string;
  newRangoOrden: string;
  editRangoId: number | null;
  editRangoAbreviacion: string;
  editRangoNombreCompleto: string;
  editRangoOrden: string;
  // Baterias state
  baterias: BateriaConfig[];
  newBateria: string;
  newBateriaOrden: string;
  editBateriaId: number | null;
  editBateriaNombre: string;
  editBateriaOrden: string;
  // Equipos state
  equipos: EquipoConfig[];
  newEquipo: { nombre: string; activo: boolean; ordenPdf: number };
  editEquipoId: string | null;
  editEquipo: { nombre: string; activo: boolean; ordenPdf: number };
  equiposActivos: EquipoConfig[];
  equiposInactivos: EquipoConfig[];
  equiposActivosEnPantalla: EquipoConfig[];
  draggedEquipoId: string | null;
  // Usuarios state
  usuarios: UsuarioAdmin[];
  newUsername: string;
  newPassword: string;
  newPasswordConfirm: string;
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
  onNewRangoOrdenChange: (value: string) => void;
  onEditRangoIdChange: (id: number | null) => void;
  onEditRangoAbreviacionChange: (value: string) => void;
  onEditRangoNombreCompletoChange: (value: string) => void;
  onEditRangoOrdenChange: (value: string) => void;
  onCreateRango: () => void;
  onUpdateRango: (rangoId: number) => void;
  onDeleteRango: (rangoId: number) => void;
  // Baterias callbacks
  onNewBateriaChange: (value: string) => void;
  onNewBateriaOrdenChange: (value: string) => void;
  onEditBateriaIdChange: (id: number | null) => void;
  onEditBateriaNombreChange: (value: string) => void;
  onEditBateriaOrdenChange: (value: string) => void;
  onCreateBateria: () => void;
  onUpdateBateria: (bateriaId: number) => void;
  onDeleteBateria: (bateriaId: number) => void;
  // Equipos callbacks
  onNewEquipoChange: (value: string | boolean, key: keyof Pick<EquipoConfig, "nombre" | "activo">) => void;
  onEditEquipoIdChange: (id: string | null) => void;
  onEditEquipoChange: (
    value: string | boolean | number,
    key: keyof Pick<EquipoConfig, "nombre" | "activo" | "ordenPdf">
  ) => void;
  onCreateEquipo: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEquipo: (itemId: string) => void;
  onToggleEquipoActivo: (equipo: EquipoConfig) => void;
  onDeleteEquipo: (itemId: string) => void;
  onStartEquipoDrag: (itemId: string) => void;
  renderEquipoCard: (equipo: EquipoConfig, options?: { draggableInActiveList?: boolean }) => ReactNode;
  // Usuarios callbacks
  onNewUsernameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewPasswordConfirmChange: (value: string) => void;
  onNewRoleChange: (role: Role) => void;
  onCreateUsuario: (event: FormEvent<HTMLFormElement>) => void;
  onChangeUsername: (usuario: UsuarioAdmin) => void;
  onChangeUserRole: (usuario: UsuarioAdmin) => void;
  onChangeUserPassword: (usuario: UsuarioAdmin) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
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
  roleDescription: (role: Role | null | undefined) => string;
  roleScope: (role: Role | null | undefined) => string;
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown) => ReactNode;
}

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR"];

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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_96px_auto]">
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
            <input
              type="number"
              min="1"
              value={props.newRangoOrden}
              onChange={(event) => props.onNewRangoOrdenChange(event.target.value)}
              placeholder={String(props.rangos.length + 1)}
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_96px_auto]">
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
                    <input
                      type="number"
                      min="1"
                      value={props.editRangoOrden}
                      onChange={(event) => props.onEditRangoOrdenChange(event.target.value)}
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
                            props.onEditRangoOrdenChange("");
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-sm font-medium text-stone-800">{props.rangoLabel(rango)}</span>
                      <p className="mt-1 text-xs text-stone-500">{`Orden ${rango.orden}`}</p>
                    </div>
                    {props.isAdmin ? (
                      <div className="flex gap-2">
                        <SmallActionButton
                          text="Editar"
                          tone="edit"
                          onClick={() => {
                            props.onEditRangoIdChange(rango.rangoId);
                            props.onEditRangoAbreviacionChange(rango.abreviacion);
                            props.onEditRangoNombreCompletoChange(rango.nombreCompleto);
                            props.onEditRangoOrdenChange(String(rango.orden));
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
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Baterias</h2>
          {!props.isAdmin ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: solo el administrador puede crear, editar o eliminar baterias.
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
            <input
              value={props.newBateria}
              onChange={(event) => props.onNewBateriaChange(event.target.value)}
              placeholder="Nueva bateria"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={!props.isAdmin}
            />
            <input
              type="number"
              min="1"
              value={props.newBateriaOrden}
              onChange={(event) => props.onNewBateriaOrdenChange(event.target.value)}
              placeholder={String(props.baterias.length + 1)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={!props.isAdmin}
            />
            <button
              type="button"
              onClick={() => props.onCreateBateria()}
              disabled={!props.isAdmin}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Crear
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {props.baterias.map((bateria) => (
            <div key={bateria.bateriaId} className="rounded-lg bg-stone-100/80 p-2">
              {props.editBateriaId === bateria.bateriaId ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
                  <input
                    value={props.editBateriaNombre}
                    onChange={(event) => props.onEditBateriaNombreChange(event.target.value)}
                    className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={props.editBateriaOrden}
                    onChange={(event) => props.onEditBateriaOrdenChange(event.target.value)}
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
                        props.onEditBateriaOrdenChange("");
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="text-sm font-medium text-stone-800">{bateria.nombre}</span>
                    <p className="mt-1 text-xs text-stone-500">{`Orden ${bateria.orden}`}</p>
                  </div>
                  <div className="flex gap-2">
                    <SmallActionButton
                      text="Editar"
                      tone="edit"
                      onClick={() => {
                        props.onEditBateriaIdChange(bateria.bateriaId);
                        props.onEditBateriaNombreChange(bateria.nombre);
                        props.onEditBateriaOrdenChange(String(bateria.orden));
                      }}
                    />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteBateria(bateria.bateriaId)} />
                  </div>
                </div>
              )}
            </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "equipos") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Equipos</h2>
          <form onSubmit={props.onCreateEquipo} className="mt-3 space-y-2">
            <input
              value={props.newEquipo.nombre}
              onChange={(event) => props.onNewEquipoChange(event.target.value, "nombre")}
              placeholder="Nuevo equipo"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={props.newEquipo.activo}
                  onChange={(event) => props.onNewEquipoChange(event.target.checked, "activo")}
                />
                Activo
              </label>
            </div>
            <button
              type="submit"
              disabled={!props.canWrite}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Crear equipo
            </button>
          </form>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-stone-900">Equipos activos</h3>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {props.equiposActivosEnPantalla.length}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11z" />
                  </svg>
                  Arrastra los equipos para cambiar su orden en el PDF
                </span>
              </p>
            </div>
            {props.equiposActivosEnPantalla.length > 0 ? (
              <div className="space-y-2">
                {props.equiposActivosEnPantalla.map((equipo) => props.renderEquipoCard(equipo, { draggableInActiveList: true }))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">Sin equipos activos.</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-stone-900">Equipos inactivos</h3>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                  {props.equiposInactivos.length}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                Los equipos inactivos no aparecen en la ficha de personal ni en el formulario de registrar movimientos.
              </p>
            </div>
            {props.equiposInactivos.length > 0 ? (
              <div className="space-y-2">
                {props.equiposInactivos.map((equipo) => props.renderEquipoCard(equipo))}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">Sin equipos inactivos.</p>
              </div>
            )}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "firmas" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Grado</span>
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Grado</span>
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
      </section>
    );
  }

  if (props.activeView === "usuarios" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Usuarios y privilegios</h2>
          <form onSubmit={props.onCreateUsuario} className="mt-3 space-y-3">
            <input
              value={props.newUsername}
              onChange={(event) => props.onNewUsernameChange(event.target.value)}
              placeholder="Nombre de usuario"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={props.newPassword}
                onChange={(event) => props.onNewPasswordChange(event.target.value)}
                placeholder="Contrasena (min 8)"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                type="password"
              />
              <input
                value={props.newPasswordConfirm}
                onChange={(event) => props.onNewPasswordConfirmChange(event.target.value)}
                placeholder="Repetir contrasena"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                type="password"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((role) => {
                const selected = props.newRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => props.onNewRoleChange(role)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selected
                        ? "border-stone-900 bg-stone-900 text-white shadow-lg"
                        : "border-stone-300 bg-white text-stone-800 hover:border-stone-500 hover:bg-stone-50"
                    }`}
                  >
                    <p className="text-sm font-semibold">{props.roleLabel(role)}</p>
                    <p className={`mt-1 text-xs ${selected ? "text-stone-200" : "text-stone-500"}`}>
                      {props.roleDescription(role)}
                    </p>
                    <p className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${selected ? "text-stone-300" : "text-stone-400"}`}>
                      {props.roleScope(role)}
                    </p>
                  </button>
                );
              })}
            </div>
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
                    <p className="mt-1 text-xs text-stone-500">{props.roleDescription(usuario.rol)}</p>
                    <p className="text-xs text-stone-600">{usuario.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SmallActionButton
                      text="Usuario"
                      tone="edit"
                      onClick={() => props.onChangeUsername(usuario)}
                    />
                    <SmallActionButton
                      text="Editar rol"
                      tone="edit"
                      onClick={() => props.onChangeUserRole(usuario)}
                    />
                    <SmallActionButton
                      text="Contrasena"
                      tone="edit"
                      onClick={() => props.onChangeUserPassword(usuario)}
                    />
                    <SmallActionButton
                      text={usuario.activo ? "Desactivar" : "Activar"}
                      tone="neutral"
                      onClick={() => props.onToggleUserActive(usuario)}
                    />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteUsuario(usuario)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "auditoria" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
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
