"use client";

import { FormEvent, ReactNode } from "react";
import { formatAuditEntityId, type AuditCiReferences } from "@/lib/audit-helpers";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import type { MainView } from "@/types/views";
import { LoadingInline, PaginationControls, SmallActionButton } from "../shared";

type Role = "ADMIN" | "EDITOR" | "READ_ONLY";
type RangoTipo = "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
type RangoConfig = { rangoId: number; abreviacion: string; nombreCompleto: string; orden: number; tipo?: RangoTipo };
type BateriaConfig = { bateriaId: number; nombre: string; orden: number };
type EquipoConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
type UsuarioAdmin = {
  usuarioId: string;
  rangoId: number;
  rango: RangoConfig;
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
type FirmaConfig = { encargadoRango: string; encargadoNombre: string; oficialRango: string; oficialNombre: string; updatedAt: string | null };
type AuditoriaRecord = {
  auditoriaId: string;
  usuarioId: string | null;
  usuario: { usuarioId: string; username: string; rol: Role } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  ciReferencias?: AuditCiReferences;
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
  equiposInactivos: EquipoConfig[];
  equiposActivosEnPantalla: EquipoConfig[];
  hasEquipoOrderDraftChanges: boolean;
  mergeEquipoOrigenId: string;
  mergeEquipoDestinoId: string;
  // Usuarios state
  usuarios: UsuarioAdmin[];
  newUserRangoId: string;
  userRangoOptions: RangoConfig[];
  newNombre: string;
  newApellido: string;
  newUsername: string;
  newPassword: string;
  newPasswordConfirm: string;
  newMailReferencia: string;
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
  onMergeEquipoOrigenIdChange: (itemId: string) => void;
  onMergeEquipoDestinoIdChange: (itemId: string) => void;
  onMergeEquipos: (origenItemId: string, destinoItemId: string) => void;
  onSaveEquipoOrder: () => void;
  onResetEquipoOrderDraft: () => void;
  renderEquipoCard: (equipo: EquipoConfig, options?: { reorderableInActiveList?: boolean; orderIndex?: number; orderCount?: number }) => ReactNode;
  // Usuarios callbacks
  onNewUserRangoIdChange: (value: string) => void;
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
  // Firma config callbacks
  onFirmaConfigDraftChange: (key: keyof Omit<FirmaConfig, "updatedAt">, value: string) => void;
  onSaveFirmaConfig: (event: FormEvent<HTMLFormElement>) => void;
  // Auditoria callbacks
  onAuditFilterChange: (filter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION") => void;
  onAuditPageChange: (page: number) => void;
  onAuditPageSizeChange: (size: number) => void;
  onNavigateView: (view: MainView) => void;
  // Utility functions
  roleLabel: (role: Role | null | undefined) => string;
  roleDescription: (role: Role | null | undefined) => string;
  roleScope: (role: Role | null | undefined) => string;
  rangoLabel: (rango: RangoConfig) => string;
  auditActionLabel: (accion: string) => string;
  auditEntityLabel: (entidad: string) => string;
  renderAuditDetalle: (detalle: unknown, ciReferences?: AuditCiReferences) => ReactNode;
}

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "READ_ONLY"];
const RANGO_TIPO_LABEL: Record<RangoTipo, string> = {
  SUBALTERNO: "Personal Subalterno",
  OFICIAL: "Senores Oficiales",
  SUBOFICIAL: "Sub Oficiales",
};

export function ConfigViews(props: ConfigViewsProps) {
  if (props.activeView === "grados") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Grados registrados</h2>
          <p className="mt-1 text-xs text-stone-600">Desde esta vista se muestran los grados de oficiales, suboficiales y subalternos con su orden actual.</p>
          <p className="mt-1 text-xs text-stone-600">El administrador puede editar o eliminar cualquier grado desde esta pantalla.</p>
          {!props.isAdmin ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: solo el administrador puede editar o eliminar grados.
            </p>
          ) : null}

          <div className="mt-3 space-y-2">
            {props.rangos.map((rango) => {
              const canEditRango = props.isAdmin;

              return (
                <div key={rango.rangoId} className="rounded-lg bg-stone-100/80 p-2">
                  {props.editRangoId === rango.rangoId && canEditRango ? (
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-stone-800">{props.rangoLabel(rango)}</span>
                          {rango.tipo ? (
                            <span className="inline-flex items-center rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                              {RANGO_TIPO_LABEL[rango.tipo]}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-stone-500">{`Orden ${rango.orden}`}</p>
                      </div>
                      {canEditRango ? (
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
              );
            })}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "baterias") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Baterías registradas</h2>
          <p className="mt-1 text-xs text-stone-600">Desde esta vista puedes editar o eliminar baterías existentes. El acceso está en Configuración → Equipos, bloque de mantenimiento ocasional.</p>
          {!props.isAdmin ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: solo el administrador puede editar o eliminar baterías.
            </p>
          ) : null}
          <div className="hidden mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_96px_auto]">
            <input
              value={props.newBateria}
              onChange={(event) => props.onNewBateriaChange(event.target.value)}
              placeholder="Nueva batería"
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
    const activeOrderById = new Map(
      props.equiposActivosEnPantalla.map((equipo, index) => [equipo.itemId, index]),
    );
    const equiposOrdenadosAlfabeticamente = [...props.equipos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
    const mergeTargetEquipos = equiposOrdenadosAlfabeticamente.filter((equipo) => equipo.itemId !== props.mergeEquipoOrigenId);
    const canMergeEquipos =
      props.canWrite &&
      props.equipos.length >= 2 &&
      props.mergeEquipoOrigenId.trim() !== "" &&
      props.mergeEquipoDestinoId.trim() !== "" &&
      props.mergeEquipoOrigenId !== props.mergeEquipoDestinoId;

    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Equipos registrados</h2>
          <p className="mt-1 text-xs text-stone-600">
            Desde esta vista puedes editar o eliminar equipos existentes y decidir si aparecen en Hoja de Entrega / Hoja Matriz. Las altas nuevas se hacen desde el menú `Altas`.
          </p>
          {!props.canWrite ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: puedes consultar equipos y su orden, pero no modificarlos.
            </p>
          ) : null}
          <form onSubmit={props.onCreateEquipo} className="hidden mt-3 space-y-2">
            <input
              value={props.newEquipo.nombre}
              onChange={(event) => props.onNewEquipoChange(event.target.value, "nombre")}
              placeholder="Nuevo equipo"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              disabled={!props.canWrite}
            />
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={props.newEquipo.activo}
                  onChange={(event) => props.onNewEquipoChange(event.target.checked, "activo")}
                  disabled={!props.canWrite}
                />
                Aparece en Hoja de Entrega
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
                <h3 className="text-sm font-semibold text-stone-900">Aparecen en Hoja de Entrega / Hoja Matriz</h3>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  {props.equiposActivosEnPantalla.length}
                </span>
              </div>
              <p className="text-xs text-stone-600 mb-3">
                Estos equipos se muestran en hoja y mantienen el editor de orden.
              </p>
            </div>
            {props.equiposActivosEnPantalla.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Editor de orden</p>
                  <p className="text-xs text-stone-600">Los cambios impactan el PDF y las hojas de entrega cuando confirmes.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={props.onResetEquipoOrderDraft}
                    disabled={!props.canWrite || !props.hasEquipoOrderDraftChanges}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={props.onSaveEquipoOrder}
                    disabled={!props.canWrite || !props.hasEquipoOrderDraftChanges}
                    className="ej-button rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar orden
                  </button>
                </div>
              </div>
            ) : null}
            {props.equiposActivosEnPantalla.length > 0 ? (
              <div className="space-y-2">
                {props.equiposActivosEnPantalla.map((equipo) =>
                  props.renderEquipoCard(equipo, {
                    reorderableInActiveList: true,
                    orderIndex: activeOrderById.get(equipo.itemId) ?? -1,
                    orderCount: props.equiposActivosEnPantalla.length,
                  }),
                )}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">No hay equipos visibles en hoja.</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-stone-900">No aparecen en Hoja de Entrega / Hoja Matriz</h3>
                <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                  {props.equiposInactivos.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-stone-600">
                Estos equipos siguen registrados, pero están ocultos de las hojas hasta que vuelvas a habilitarlos.
              </p>
            </div>
            {props.equiposInactivos.length > 0 ? (
              <div className="space-y-2">
                {props.equiposInactivos.map((equipo) =>
                  props.renderEquipoCard(equipo, {
                    reorderableInActiveList: false,
                  }),
                )}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">No hay equipos ocultos.</p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Unificar equipos</h3>
              <p className="mt-1 text-xs text-stone-600">
                Selecciona un equipo origen y uno destino. Se reasignarán todos los movimientos al destino y luego se eliminará el equipo origen.
              </p>
            </div>
            {props.equipos.length < 2 ? (
              <div className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                Debes tener al menos 2 equipos para poder unificarlos.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Equipo origen</span>
                  <select
                    value={props.mergeEquipoOrigenId}
                    onChange={(event) => props.onMergeEquipoOrigenIdChange(event.target.value)}
                    disabled={!props.canWrite}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Seleccionar equipo origen</option>
                    {equiposOrdenadosAlfabeticamente.map((equipo) => (
                      <option key={`merge-origen-${equipo.itemId}`} value={equipo.itemId}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Equipo destino</span>
                  <select
                    value={props.mergeEquipoDestinoId}
                    onChange={(event) => props.onMergeEquipoDestinoIdChange(event.target.value)}
                    disabled={!props.canWrite || props.mergeEquipoOrigenId.trim() === ""}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">Seleccionar equipo destino</option>
                    {mergeTargetEquipos.map((equipo) => (
                      <option key={`merge-destino-${equipo.itemId}`} value={equipo.itemId}>
                        {equipo.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => props.onMergeEquipos(props.mergeEquipoOrigenId, props.mergeEquipoDestinoId)}
                disabled={!canMergeEquipos}
                className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Unificar y eliminar origen
              </button>
              <p className="text-xs text-stone-500">Acción irreversible: se recomienda revisar antes de confirmar.</p>
            </div>
          </div>

          {props.isAdmin ? (
            <div className="mt-6 rounded-xl border border-stone-300 bg-stone-50 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Mantenimiento ocasional</p>
              <p className="mt-1 text-xs text-stone-600">
                Grados y baterías se usan poco. Se reubicaron aquí para no recargar los menús principales.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => props.onNavigateView("grados")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  Editar grados
                </button>
                <button
                  type="button"
                  onClick={() => props.onNavigateView("baterias")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  Editar baterías
                </button>
                <button
                  type="button"
                  onClick={() => props.onNavigateView("grado_nuevo")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  Alta de grado
                </button>
                <button
                  type="button"
                  onClick={() => props.onNavigateView("bateria_nueva")}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  Alta de batería
                </button>
              </div>
            </div>
          ) : null}
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
            Esta sección controla los datos de quienes firman la hoja de entrega. Los textos institucionales son fijos.
          </p>
          <div className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold text-stone-700">Textos institucionales (fijos):</p>
            <p className="text-xs text-stone-600">
              • Encargado: El Encargado del Depósito General del Grp. &quot;Brig. Gral. Manuel Oribe&quot; de Artillería 105mm No. 1.
            </p>
            <p className="text-xs text-stone-600">
              • Oficial: El Oficial de Administración del Grp. &quot;Brig. Gral. Manuel Oribe&quot; de Artillería 105mm No. 1.
            </p>
          </div>
          {props.firmaConfigLoading ? (
            <LoadingInline
              label="Cargando configuracion de firmas..."
              className="mt-3"
              textClassName="text-sm font-medium text-stone-600"
            />
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
                    ? `Última actualización: ${formatDateTimeForDisplay(props.firmaConfig.updatedAt)}`
                    : "Sin actualizaciones registradas todavía."}
                </p>
                <button
                  type="submit"
                  disabled={props.firmaConfigSaving}
                  className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {props.firmaConfigSaving ? (
                    <LoadingInline
                      label="Guardando..."
                      size="xs"
                      tone="light"
                      textClassName="text-sm font-semibold text-white"
                    />
                  ) : (
                    "Guardar firmas"
                  )}
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
          <h2 className="text-base font-semibold text-stone-900">Usuarios registrados</h2>
          <p className="mt-1 text-xs text-stone-600">
            Desde esta vista puedes editar, activar, desactivar o eliminar usuarios existentes. Las altas nuevas se hacen desde el menú `Altas`.
          </p>
          <form onSubmit={props.onCreateUsuario} className="hidden mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <select
                value={props.newUserRangoId}
                onChange={(event) => props.onNewUserRangoIdChange(event.target.value)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Grado</option>
                {props.userRangoOptions.map((rango) => (
                  <option key={`config-user-rango-${rango.rangoId}`} value={String(rango.rangoId)}>
                    {`${rango.abreviacion} - ${rango.nombreCompleto}`}
                  </option>
                ))}
              </select>
              <input
                value={props.newNombre}
                onChange={(event) => props.onNewNombreChange(event.target.value)}
                placeholder="Nombre"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={props.newApellido}
                onChange={(event) => props.onNewApellidoChange(event.target.value)}
                placeholder="Apellido"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={props.newUsername}
                onChange={(event) => props.onNewUsernameChange(event.target.value)}
                placeholder="Usuario"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={props.newPassword}
                onChange={(event) => props.onNewPasswordChange(event.target.value)}
                placeholder="Contraseña (mín. 8)"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                type="password"
              />
              <input
                value={props.newPasswordConfirm}
                onChange={(event) => props.onNewPasswordConfirmChange(event.target.value)}
                placeholder="Repetir contraseña"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                type="password"
              />
            </div>
            <input
              value={props.newMailReferencia}
              onChange={(event) => props.onNewMailReferenciaChange(event.target.value)}
              placeholder="Mail de referencia (opcional)"
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
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
                    <p className="text-sm font-medium text-stone-900">{`${usuario.grado} ${usuario.apellido}, ${usuario.nombre}`}</p>
                    <p className="mt-1 text-xs text-stone-600">{`Usuario: ${usuario.username}`}</p>
                    <p className="text-xs text-stone-600">
                      {usuario.mailReferencia ? `Mail de referencia: ${usuario.mailReferencia}` : "Mail de referencia: sin dato"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{props.roleDescription(usuario.rol)}</p>
                    <p className="text-xs text-stone-600">{usuario.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SmallActionButton
                      text="Datos"
                      tone="edit"
                      onClick={() => props.onEditUsuario(usuario)}
                    />
                    <SmallActionButton
                      text="Editar rol"
                      tone="edit"
                      onClick={() => props.onChangeUserRole(usuario)}
                    />
                    <SmallActionButton
                      text="Contraseña"
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
          <h2 className="text-base font-semibold text-stone-900">Auditoría detallada (interfaz y base de datos)</h2>
          <p className="mt-1 text-xs text-stone-600">
            Cada registro muestra quién hizo la acción, sobre qué entidad y el detalle guardado en la tabla de auditoría.
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
              Solo autenticación
            </button>
          </div>
          <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
            {props.auditoriaFiltradaPaginada.map((log) => (
              <div key={log.auditoriaId} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                <p className="text-xs text-stone-600">{formatDateTimeForDisplay(log.createdAt)}</p>
                <p className="text-sm font-medium text-stone-900">
                  {`${log.usuario?.username ?? "Sistema"} (${props.roleLabel(log.usuario?.rol ?? null)}) - ${props.auditActionLabel(log.accion)} ${props.auditEntityLabel(log.entidad)}`}
                </p>
                <p className="text-xs text-stone-600">{`Auditoría BD #${log.auditoriaId}`}</p>
                <p className="text-xs text-stone-600">{formatAuditEntityId(log.entidadId, log.ciReferencias)}</p>
                {props.renderAuditDetalle(log.detalle, log.ciReferencias)}
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


