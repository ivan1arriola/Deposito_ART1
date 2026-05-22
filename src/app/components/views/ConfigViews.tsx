"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import { formatAuditEntityId, resolveAuditEntityName, type AuditCiReferences } from "@/lib/audit-helpers";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";
import { formatDateTimeForDisplay, formatDateTimeExact } from "@/lib/date-helpers";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MainView } from "@/types/views";
import type { Articulo, AuditoriaRecord, FirmaConfig, Rango, Role, TipoArticulo, UsuarioAdmin } from "@/types/entities";
import { LoadingInline, PaginationControls, SmallActionButton } from "../shared";
import { ModalFrame } from "../modals/ModalFrame";

// Premium Material-UI Icons
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FolderZipOutlinedIcon from "@mui/icons-material/FolderZipOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import StorageOutlinedIcon from "@mui/icons-material/StorageOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

type RangoTipo = "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
type RangoConfig = Rango & { tipo?: RangoTipo };
type BateriaConfig = { bateriaId: number; nombre: string; orden: number };
type ArticuloConfig = Articulo;
type EquipoConfig = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
type EquiposDisplayMode = "por_estado" | "alfabetico";
type AuditUserOption = {
  value: string;
  label: string;
};
type UserAccountType = UsuarioAdmin["accountType"];

interface ConfigViewsProps {
  activeView: "grados" | "baterias" | "articulos" | "equipos" | "firmas" | "usuarios" | "auditoria" | "papelera";
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
  // Articulos state
  articulos: ArticuloConfig[];
  editArticuloId: number | null;
  editArticuloNombre: string;
  editArticuloTipo: TipoArticulo;
  // Equipos state
  equipos: EquipoConfig[];
  newEquipo: { nombre: string; activo: boolean; ordenPdf: number };
  editEquipoId: string | null;
  editEquipo: { nombre: string; activo: boolean; ordenPdf: number };
  equiposInactivos: EquipoConfig[];
  equiposInactivosEnPantalla: EquipoConfig[];
  equiposActivosEnPantalla: EquipoConfig[];
  hasEquipoOrderDraftChanges: boolean;
  hasEquipoInactivoOrderDraftChanges: boolean;
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
  auditUserFilter: string;
  auditUserOptions: AuditUserOption[];
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
  // Articulos callbacks
  onEditArticuloIdChange: (id: number | null) => void;
  onEditArticuloNombreChange: (value: string) => void;
  onEditArticuloTipoChange: (value: TipoArticulo) => void;
  onUpdateArticulo: (articuloId: number) => void;
  onDeleteArticulo: (articuloId: number) => void;
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
  onSaveEquipoInactivoOrder: () => void;
  onResetEquipoInactivoOrderDraft: () => void;
  renderEquipoCard: (equipo: EquipoConfig, options?: { reorderableInActiveList?: boolean; reorderableInInactiveList?: boolean; orderIndex?: number; orderCount?: number }) => ReactNode;
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
  onConfirmUserEmail: (usuario: UsuarioAdmin) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
  onDeleteUsuario: (usuario: UsuarioAdmin) => void;
  // Firma config callbacks
  onFirmaConfigDraftChange: (key: keyof Omit<FirmaConfig, "updatedAt">, value: string) => void;
  onSaveFirmaConfig: (event: FormEvent<HTMLFormElement>) => void;
  // Auditoria callbacks
  onAuditFilterChange: (filter: "TODOS" | "MOVIMIENTOS" | "AUTENTICACION") => void;
  onAuditUserFilterChange: (value: string) => void;
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
  renderAuditDetalle: (detalle: unknown, ciReferences?: AuditCiReferences, accion?: string) => ReactNode;
  // Papelera state and callbacks
  papeleraRecords?: Array<{ papeleraId: string; tipo: string; nombre: string; originalId: string; createdAt: string }>;
  papeleraLoading?: boolean;
  onRestorePapelera?: (papeleraId: string) => void;
  onDeletePapeleraPermanent?: (papeleraId: string) => void;
  reloadCurrentViewData?: (showSpinner?: boolean) => Promise<void>;
}

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "READ_ONLY"];
const USER_ACCOUNT_TYPE_TABS: Array<{ value: UserAccountType; label: string }> = [
  { value: "SISTEMA", label: "Usuarios de sistema" },
  { value: "PERSONAL", label: "Usuarios de personal" },
];
const RANGO_TIPO_LABEL: Record<RangoTipo, string> = {
  SUBALTERNO: "Personal Subalterno",
  OFICIAL: "Senores Oficiales",
  SUBOFICIAL: "Suboficiales",
};
const ARTICULO_TIPO_OPTIONS: TipoArticulo[] = ["OFICINA", "LIMPIEZA"];
const ARTICULO_TIPO_LABEL: Record<TipoArticulo, string> = {
  OFICINA: "Oficina",
  LIMPIEZA: "Limpieza",
};

export function ConfigViews(props: ConfigViewsProps) {
  const [activeUserAccountTypeTab, setActiveUserAccountTypeTab] = useState<UserAccountType>("SISTEMA");
  const [personalUsersSearch, setPersonalUsersSearch] = useState("");

  // Local state for Auditoria Undo capability
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoSuccess, setUndoSuccess] = useState<string | null>(null);

  const handleUndo = async (auditoriaId: string) => {
    if (!confirm(`¿Estás seguro de que deseas deshacer esta acción (#${auditoriaId})? Esto revertirá el estado de la base de datos.`)) {
      return;
    }
    setUndoingId(auditoriaId);
    setUndoError(null);
    setUndoSuccess(null);
    try {
      const response = await fetch(`/api/auditoria/${auditoriaId}/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo deshacer la acción de auditoría.");
      }
      setUndoSuccess(`¡Acción de auditoría #${auditoriaId} revertida con éxito!`);
      if (props.reloadCurrentViewData) {
        await props.reloadCurrentViewData(true);
      }
    } catch (err: any) {
      setUndoError(err.message || "Error al intentar deshacer la acción.");
    } finally {
      setUndoingId(null);
    }
  };

  const isUndoable = (log: AuditoriaRecord) => {
    const undoableEntities = ["GRADO_PERSONAL", "BATERIA", "ARTICULO", "ITEM", "PERSONAL", "OBSERVACION"];
    return (log.accion === "CREATE" || log.accion === "UPDATE" || log.accion === "DELETE") && undoableEntities.includes(log.entidad);
  };

  const isWithin5Days = (createdAt: string | Date) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 5;
  };

  // Local state for Papelera interactive preview
  const [selectedTrashRecord, setSelectedTrashRecord] = useState<any | null>(null);
  const [trashDetails, setTrashDetails] = useState<any | null>(null);
  const [trashDetailsLoading, setTrashDetailsLoading] = useState(false);
  const [trashModalAction, setTrashModalAction] = useState<"restore" | "delete" | null>(null);

  // Local state for Papelera interactive search & filter
  const [trashSearchQuery, setTrashSearchQuery] = useState("");
  const [trashTypeFilter, setTrashTypeFilter] = useState<"ALL" | "ITEM" | "ARTICULO">("ALL");

  const filteredTrashRecords = useMemo(() => {
    if (!props.papeleraRecords) return [];
    return props.papeleraRecords.filter((record) => {
      const matchesSearch = record.nombre.toLowerCase().includes(trashSearchQuery.toLowerCase()) || 
                            record.originalId.toLowerCase().includes(trashSearchQuery.toLowerCase());
      const matchesType = trashTypeFilter === "ALL" || record.tipo === trashTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [props.papeleraRecords, trashSearchQuery, trashTypeFilter]);

  const handleOpenTrashModal = async (record: any, action: "restore" | "delete") => {
    setSelectedTrashRecord(record);
    setTrashModalAction(action);
    setTrashDetailsLoading(true);
    setTrashDetails(null);
    try {
      const res = await fetch(`/api/papelera/${record.papeleraId}`);
      if (res.ok) {
        const data = await res.json();
        setTrashDetails(data.payload);
      } else {
        console.error("Error fetching trash details");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTrashDetailsLoading(false);
    }
  };

  const handleConfirmTrashAction = () => {
    if (!selectedTrashRecord || !trashModalAction) return;
    if (trashModalAction === "restore") {
      props.onRestorePapelera && props.onRestorePapelera(selectedTrashRecord.papeleraId);
    } else {
      props.onDeletePapeleraPermanent && props.onDeletePapeleraPermanent(selectedTrashRecord.papeleraId);
    }
    // Close modal
    setSelectedTrashRecord(null);
    setTrashModalAction(null);
    setTrashDetails(null);
  };
  const [equiposDisplayMode, setEquiposDisplayMode] = useState<EquiposDisplayMode>("por_estado");
  const usuariosSistema = useMemo(
    () => props.usuarios.filter((usuario) => usuario.accountType === "SISTEMA"),
    [props.usuarios]
  );
  const usuariosPersonal = useMemo(
    () => props.usuarios.filter((usuario) => usuario.accountType === "PERSONAL"),
    [props.usuarios]
  );
  const usuariosPersonalSearchIndex = useMemo(
    () =>
      buildSearchIndex(usuariosPersonal, {
        text: (usuario) => {
          const fullName = `${usuario.nombre} ${usuario.apellido}`;
          const invertedFullName = `${usuario.apellido}, ${usuario.nombre}`;
          return [
            usuario.personalCi ?? "",
            usuario.username,
            usuario.nombre,
            usuario.apellido,
            fullName,
            invertedFullName,
            usuario.grado,
            usuario.mailReferencia ?? "",
          ].join(" ");
        },
      }),
    [usuariosPersonal],
  );
  const personalUsersSearchTerm = personalUsersSearch.trim();
  const usuariosPersonalFiltrados = useMemo(() => {
    if (personalUsersSearchTerm === "") {
      return usuariosPersonal;
    }
    return filterSearchIndex(usuariosPersonalSearchIndex, personalUsersSearch);
  }, [usuariosPersonal, usuariosPersonalSearchIndex, personalUsersSearch, personalUsersSearchTerm]);
  const usuariosFiltradosPorTipo = activeUserAccountTypeTab === "SISTEMA" ? usuariosSistema : usuariosPersonalFiltrados;

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
          <p className="mt-1 text-xs text-stone-600">Desde esta vista puedes editar o eliminar baterías existentes.</p>
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

  if (props.activeView === "articulos") {
    const articulosOrdenados = [...props.articulos].sort(
      (a, b) =>
        ARTICULO_TIPO_OPTIONS.indexOf(a.tipo) - ARTICULO_TIPO_OPTIONS.indexOf(b.tipo) ||
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );

    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Artículos</h2>
              <p className="mt-1 text-xs text-stone-600">Catálogo auxiliar para clasificar artículos de oficina y limpieza.</p>
              <p className="mt-1 text-xs text-stone-600">Las altas y los ingresos de stock se realizan desde vistas separadas dentro del menú Artículos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {props.canWrite ? (
                <button
                  type="button"
                  onClick={() => props.onNavigateView("articulo_stock_ingreso")}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                >
                  Ingreso de stock
                </button>
              ) : null}
              {props.isAdmin ? (
                <button
                  type="button"
                  onClick={() => props.onNavigateView("articulo_nuevo")}
                  className="ej-button rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  Nuevo artículo
                </button>
              ) : null}
            </div>
          </div>
          {!props.isAdmin ? (
            <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
              Modo solo lectura: solo el administrador puede crear, editar o eliminar artículos.
            </p>
          ) : null}

          <div className="mt-4 space-y-2">
            {articulosOrdenados.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">Todavía no hay artículos registrados.</p>
              </div>
            ) : null}

            {articulosOrdenados.map((articulo) => (
              <div key={articulo.articuloId} className="rounded-lg bg-stone-100/80 p-2">
                {props.editArticuloId === articulo.articuloId && props.isAdmin ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                    <input
                      value={props.editArticuloNombre}
                      onChange={(event) => props.onEditArticuloNombreChange(event.target.value)}
                      className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                    />
                    <select
                      value={props.editArticuloTipo}
                      onChange={(event) => props.onEditArticuloTipoChange(event.target.value as TipoArticulo)}
                      className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                    >
                      {ARTICULO_TIPO_OPTIONS.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {ARTICULO_TIPO_LABEL[tipo]}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <SmallActionButton text="Ok" tone="ok" onClick={() => props.onUpdateArticulo(articulo.articuloId)} />
                      <SmallActionButton
                        text="Cancelar"
                        tone="neutral"
                        onClick={() => {
                          props.onEditArticuloIdChange(null);
                          props.onEditArticuloNombreChange("");
                          props.onEditArticuloTipoChange("OFICINA");
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{articulo.nombre}</span>
                      <span className="inline-flex items-center rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        {ARTICULO_TIPO_LABEL[articulo.tipo]}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-700">
                        {`Stock ${articulo.stockActual}`}
                      </span>
                    </div>
                    {props.isAdmin ? (
                      <div className="flex gap-2">
                        <SmallActionButton
                          text="Editar"
                          tone="edit"
                          onClick={() => {
                            props.onEditArticuloIdChange(articulo.articuloId);
                            props.onEditArticuloNombreChange(articulo.nombre);
                            props.onEditArticuloTipoChange(articulo.tipo);
                          }}
                        />
                        <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteArticulo(articulo.articuloId)} />
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

  if (props.activeView === "equipos") {
    const activeOrderById = new Map(
      props.equiposActivosEnPantalla.map((equipo, index) => [equipo.itemId, index]),
    );
    const inactivoOrderById = new Map(
      props.equiposInactivosEnPantalla.map((equipo, index) => [equipo.itemId, index]),
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
            Desde esta vista puedes editar o eliminar equipos existentes y decidir si aparecen en Hoja de Entrega / Hoja Matriz. Las altas nuevas se hacen desde el menú `Stock y Equipos`.
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
            <div className="rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Vista de equipos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEquiposDisplayMode("por_estado")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    equiposDisplayMode === "por_estado"
                      ? "bg-stone-800 text-white"
                      : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  Por estado (hoja / fuera de hoja)
                </button>
                <button
                  type="button"
                  onClick={() => setEquiposDisplayMode("alfabetico")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    equiposDisplayMode === "alfabetico"
                      ? "bg-stone-800 text-white"
                      : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  Orden alfabético (todos)
                </button>
              </div>
              <p className="mt-2 text-xs text-stone-600">
                La vista alfabética muestra todos los equipos sin separar por si aparecen o no en hoja de entrega.
              </p>
            </div>

            {equiposDisplayMode === "alfabetico" ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-stone-900">Todos los equipos (A-Z)</h3>
                  <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                    {equiposOrdenadosAlfabeticamente.length}
                  </span>
                </div>
                <p className="mb-3 text-xs text-stone-600">Incluye equipos visibles y ocultos en hoja.</p>
                {equiposOrdenadosAlfabeticamente.length > 0 ? (
                  <div className="space-y-2">
                    {equiposOrdenadosAlfabeticamente.map((equipo) =>
                      props.renderEquipoCard(equipo, {
                        reorderableInActiveList: false,
                      }),
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                    <p className="text-sm text-stone-600">No hay equipos registrados.</p>
                  </div>
                )}
              </div>
            ) : null}

            {equiposDisplayMode === "por_estado" ? (
              <>
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
              </>
            ) : null}

          {equiposDisplayMode === "por_estado" ? (
          <div className="mt-6 space-y-3 border-t border-stone-200 pt-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold text-stone-900">No aparecen en Hoja de Entrega / Hoja Matriz</h3>
                <span className="inline-flex items-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                  {props.equiposInactivos.length}
                </span>
              </div>
              <p className="mb-3 text-xs text-stone-600">
                Estos equipos siguen registrados, pero están ocultos de las hojas. Puedes definir su orden para cuando imprimas el listado total de stock.
              </p>
            </div>
            {props.equiposInactivosEnPantalla.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-3 py-3 mb-3">
                <div>
                  <p className="text-sm font-semibold text-stone-900">Editor de orden de inactivos</p>
                  <p className="text-xs text-stone-600">Define el orden en el que aparecerán al imprimir el listado total de stock.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={props.onResetEquipoInactivoOrderDraft}
                    disabled={!props.canWrite || !props.hasEquipoInactivoOrderDraftChanges}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Restablecer
                  </button>
                  <button
                    type="button"
                    onClick={props.onSaveEquipoInactivoOrder}
                    disabled={!props.canWrite || !props.hasEquipoInactivoOrderDraftChanges}
                    className="ej-button rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar orden
                  </button>
                </div>
              </div>
            ) : null}
            {props.equiposInactivosEnPantalla.length > 0 ? (
              <div className="space-y-2">
                {props.equiposInactivosEnPantalla.map((equipo) =>
                  props.renderEquipoCard(equipo, {
                    reorderableInActiveList: false,
                    reorderableInInactiveList: true,
                    orderIndex: inactivoOrderById.get(equipo.itemId) ?? -1,
                    orderCount: props.equiposInactivosEnPantalla.length,
                  }),
                )}
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-center">
                <p className="text-sm text-stone-600">No hay equipos ocultos.</p>
              </div>
            )}
          </div>
          ) : null}

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
              label="Cargando configuración de firmas..."
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
            Desde esta vista puedes editar, activar, desactivar o eliminar usuarios existentes. Las altas nuevas se hacen desde el menú `Configuración`.
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
          <div className="mt-3 flex flex-wrap gap-2">
            {USER_ACCOUNT_TYPE_TABS.map((tab) => {
              const isActive = activeUserAccountTypeTab === tab.value;
              const count = tab.value === "SISTEMA" ? usuariosSistema.length : usuariosPersonal.length;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveUserAccountTypeTab(tab.value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-300 bg-white text-stone-700 hover:border-stone-500 hover:bg-stone-50"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                      isActive ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {activeUserAccountTypeTab === "PERSONAL" ? (
            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Buscar personal</span>
              <input
                type="search"
                value={personalUsersSearch}
                onChange={(event) => setPersonalUsersSearch(event.target.value)}
                placeholder="Buscar por cédula, nombre, apellido, usuario o mail"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          ) : null}
          <div className="mt-3 space-y-2">
            {usuariosFiltradosPorTipo.map((usuario) => {
              const isPersonalAccount = usuario.accountType === "PERSONAL";

              return (
                <div key={usuario.usuarioId} className="rounded-lg bg-stone-100/80 p-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{`${usuario.grado} ${usuario.apellido}, ${usuario.nombre}`}</p>
                      <p className="mt-1 text-xs text-stone-600">
                        {`Usuario: ${usuario.username}${isPersonalAccount ? " (acceso por cédula)" : ""}`}
                      </p>
                      <p className="text-xs text-stone-600">
                        {usuario.mailReferencia
                          ? `Mail de referencia: ${usuario.mailReferencia} (${usuario.mailVerificadaAt ? "verificado" : "no verificado"})`
                          : "Mail de referencia: sin dato"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {isPersonalAccount ? "Cuenta de personal: acceso de solo consulta a su ficha." : props.roleDescription(usuario.rol)}
                      </p>
                      <p className="text-xs text-stone-600">{usuario.activo ? "Activo" : "Inactivo"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isPersonalAccount ? (
                        <SmallActionButton text="Datos" tone="edit" onClick={() => props.onEditUsuario(usuario)} />
                      ) : null}
                      {!isPersonalAccount ? (
                        <SmallActionButton text="Editar rol" tone="edit" onClick={() => props.onChangeUserRole(usuario)} />
                      ) : null}
                      <SmallActionButton text="Contraseña" tone="edit" onClick={() => props.onChangeUserPassword(usuario)} />
                      {!isPersonalAccount && usuario.mailReferencia && !usuario.mailVerificadaAt ? (
                        <SmallActionButton text="Confirmar correo" tone="ok" onClick={() => props.onConfirmUserEmail(usuario)} />
                      ) : null}
                      <SmallActionButton
                        text={usuario.activo ? "Desactivar" : "Activar"}
                        tone="neutral"
                        onClick={() => props.onToggleUserActive(usuario)}
                      />
                      {!isPersonalAccount ? (
                        <SmallActionButton text="Borrar" tone="delete" onClick={() => props.onDeleteUsuario(usuario)} />
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {usuariosFiltradosPorTipo.length === 0 ? (
              <p className="rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                {activeUserAccountTypeTab === "SISTEMA"
                  ? "No hay usuarios de sistema para mostrar."
                  : personalUsersSearchTerm
                    ? "No hay coincidencias para esa búsqueda en usuarios de personal."
                    : "No hay usuarios de personal para mostrar."}
              </p>
            ) : null}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "auditoria" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Historial de Auditoría y Control de Cambios</h2>
          <p className="mt-1 text-xs text-stone-600">
            Visualice las transiciones exactas de estado (Antes → Ahora) de cada acción administrativa del sistema y deshaga cambios recientes (dentro de los 5 días de validez) de forma segura.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => props.onAuditFilterChange("TODOS")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  props.auditFilter === "TODOS" ? "bg-stone-800 text-white" : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                Todos los eventos
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
                Movimientos de Inventario
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
                Accesos y Seguridad
              </button>
            </div>
            <label className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-2 rounded border border-stone-300 bg-stone-100 px-2 py-1.5">
              <span className="text-xs font-semibold text-stone-700">Usuario</span>
              <select
                value={props.auditUserFilter}
                onChange={(event) => props.onAuditUserFilterChange(event.target.value)}
                className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-800"
              >
                {props.auditUserOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {undoSuccess && (
            <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircleOutlinedIcon className="h-4 w-4 text-green-600" />
              {undoSuccess}
            </div>
          )}
          {undoError && (
            <div className="mt-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs font-semibold flex items-center gap-2">
              <WarningAmberOutlinedIcon className="h-4 w-4 text-red-600" />
              {undoError}
            </div>
          )}
          <div className="mt-3 space-y-3 w-full">
            {props.auditoriaFiltradaPaginada.map((log) => {
              const exactTime = formatDateTimeExact(log.createdAt);
              const undoAvailable = isUndoable(log) && isWithin5Days(log.createdAt);
              const resolvedName = resolveAuditEntityName(log.entidad, log.detalle, log.ciReferencias);

              return (
                <div key={log.auditoriaId} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow transition-shadow duration-150 flex flex-col gap-2 w-full">
                  {/* Día y hora exactas + Auditoría BD # */}
                  <div className="flex flex-wrap items-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-[11px] font-bold text-stone-500 bg-stone-50 border border-stone-200/55 px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                      {exactTime}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                      {`Auditoría BD #${log.auditoriaId}`}
                    </span>
                  </div>

                  {/* Quien realizó la acción (Usuario) + Qué hizo exactamente + Qué entidades afectó */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs border-b border-stone-50 pb-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">Quién realizó la acción</span>
                      <span className="text-stone-800 text-sm">
                        {log.usuario ? (
                          <>
                            <span className="font-bold text-stone-900">
                              {[log.usuario.rango?.abreviacion, log.usuario.nombre, log.usuario.apellido].filter(Boolean).join(" ").trim() || log.usuario.username}
                            </span>
                            <span className="text-stone-500 font-medium text-xs ml-1">
                              {`(${log.usuario.username} | ${props.roleLabel(log.usuario.rol)})`}
                            </span>
                          </>
                        ) : (() => {
                          if (log.detalle && typeof log.detalle === "object" && !Array.isArray(log.detalle)) {
                            const det = log.detalle as Record<string, unknown>;
                            if (det.accountType === "PERSONAL" || det.ci) {
                              const ci = String(det.ci || det.username || log.entidadId || "");
                              const formattedCi = formatUruguayanCi(ci);
                              const nameFromRef = log.ciReferencias?.[ci] || log.ciReferencias?.[normalizeCi(ci)];
                              const name = nameFromRef || [det.grado || det.gradoAbreviacion, det.nombre, det.apellido].filter(Boolean).join(" ").trim();
                              return (
                                <>
                                  <span className="font-bold text-stone-900">
                                    {name || `Personal`}
                                  </span>
                                  <span className="text-stone-500 font-medium text-xs ml-1">
                                    {`(${formattedCi} | Personal)`}
                                  </span>
                                </>
                              );
                            }
                          }
                          return <span className="font-bold text-stone-900">Sistema</span>;
                        })()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">Qué hizo exactamente</span>
                      <span className="font-medium text-stone-800 text-sm">
                        {`${props.auditActionLabel(log.accion)} ${props.auditEntityLabel(log.entidad)}`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">Entidades afectadas</span>
                      <div className="flex flex-col gap-1 mt-0.5">
                        {resolvedName && (
                          <span className="font-bold text-stone-900 text-xs bg-stone-50 border border-stone-200/50 rounded px-1.5 py-0.5 w-max">
                            {resolvedName}
                          </span>
                        )}
                        <span className="font-mono bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded w-max text-[10px] font-semibold">
                          {formatAuditEntityId(log.entidadId, log.ciReferencias)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles / Diffs */}
                  <div className="py-1">
                    {props.renderAuditDetalle(log.detalle, log.ciReferencias, log.accion)}
                  </div>

                  {/* Botón de deshacer (funcional hasta por 5 días) */}
                  {isUndoable(log) && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-100">
                      <div>
                        {undoAvailable ? (
                          <span className="text-[10px] text-green-600 bg-green-50 border border-green-200/50 px-2 py-0.5 rounded-full font-semibold">
                            Deshacer disponible (dentro de los 5 días)
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded-full font-semibold">
                            Deshacer expirado (más de 5 días)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndo(log.auditoriaId)}
                        disabled={undoingId !== null || !undoAvailable}
                        className={`rounded px-3 py-1 text-xs font-bold shadow-sm transition-all duration-150 flex items-center gap-1 ${
                          undoAvailable
                            ? "bg-red-600 hover:bg-red-700 text-white active:scale-95"
                            : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                        }`}
                      >
                        {undoingId === log.auditoriaId ? (
                          <>
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                            Deshaciendo...
                          </>
                        ) : (
                          "Deshacer Cambio"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

  if (props.activeView === "papelera" && props.isAdmin) {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4 shadow-sm border border-stone-200 bg-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <DeleteOutlineOutlinedIcon className="h-5 w-5 text-stone-600" />
                Papelera de Reciclaje
              </h2>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Restaura o elimina permanentemente artículos y equipos dados de baja. Se listan sus recibos, préstamos y movimientos históricos resguardados.
              </p>
            </div>

            {/* Interactive Controls */}
            {!props.papeleraLoading && props.papeleraRecords && props.papeleraRecords.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Search Bar */}
                <div className="relative min-w-[220px]">
                  <SearchOutlinedIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o ID..."
                    value={trashSearchQuery}
                    onChange={(e) => setTrashSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-1.5 pl-9 pr-4 text-xs text-stone-850 placeholder-stone-450 focus:border-stone-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-200 transition-all"
                  />
                </div>

                {/* Segmented Filter */}
                <div className="flex rounded-xl bg-stone-100 p-0.5 border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setTrashTypeFilter("ALL")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      trashTypeFilter === "ALL"
                        ? "bg-white text-stone-900 shadow-sm"
                        : "text-stone-500 hover:text-stone-950"
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrashTypeFilter("ITEM")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      trashTypeFilter === "ITEM"
                        ? "bg-white text-blue-800 shadow-sm"
                        : "text-stone-500 hover:text-stone-950"
                    }`}
                  >
                    Equipos
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrashTypeFilter("ARTICULO")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      trashTypeFilter === "ARTICULO"
                        ? "bg-white text-purple-800 shadow-sm"
                        : "text-stone-500 hover:text-stone-950"
                    }`}
                  >
                    Artículos
                  </button>
                </div>
              </div>
            )}
          </div>

          {props.papeleraLoading ? (
            <div className="mt-8 flex justify-center py-12">
              <LoadingInline label="Cargando papelera..." />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {filteredTrashRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-250 bg-stone-50 px-6 py-12 text-center flex flex-col items-center justify-center">
                  <DeleteOutlineOutlinedIcon className="h-10 w-10 text-stone-300 mb-2.5" />
                  <p className="text-sm font-semibold text-stone-700">La papelera está vacía</p>
                  <p className="text-xs text-stone-500 mt-1 max-w-[340px] leading-relaxed">
                    {trashSearchQuery || trashTypeFilter !== "ALL"
                      ? "No se encontraron elementos eliminados que coincidan con los filtros seleccionados."
                      : "No hay registros en la papelera en este momento. Los elementos eliminados aparecerán aquí."}
                  </p>
                  {(trashSearchQuery || trashTypeFilter !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrashSearchQuery("");
                        setTrashTypeFilter("ALL");
                      }}
                      className="mt-3.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-all active:scale-95"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredTrashRecords.map((record) => (
                    <div
                      key={record.papeleraId}
                      className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white p-3.5 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        {/* Dynamic Icon Container */}
                        <div className={`hidden xs:flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
                          record.tipo === "ITEM"
                            ? "bg-blue-50 text-blue-600 border border-blue-150 group-hover:bg-blue-100/70"
                            : "bg-purple-50 text-purple-600 border border-purple-150 group-hover:bg-purple-100/70"
                        }`}>
                          {record.tipo === "ITEM" ? (
                            <FolderZipOutlinedIcon className="h-4.5 w-4.5" />
                          ) : (
                            <StorageOutlinedIcon className="h-4.5 w-4.5" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-stone-850">{record.nombre}</span>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${
                              record.tipo === "ITEM"
                                ? "bg-blue-50/70 text-blue-700 border-blue-200"
                                : "bg-purple-50/70 text-purple-700 border-purple-200"
                            }`}>
                              {record.tipo === "ITEM" ? "Equipo" : "Artículo"}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">ID: {record.originalId}</span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-stone-500 flex items-center gap-1">
                            <InfoOutlinedIcon className="h-3 w-3 inline text-stone-400" />
                            Eliminado el: <strong className="text-stone-700 font-semibold">{formatDateTimeForDisplay(record.createdAt)}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenTrashModal(record, "restore")}
                          className="rounded-lg border border-emerald-250 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-95 flex items-center gap-1"
                        >
                          <RestoreFromTrashOutlinedIcon className="h-3.5 w-3.5" />
                          Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTrashModal(record, "delete")}
                          className="rounded-lg border border-red-250 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100 transition-all active:scale-95 flex items-center gap-1"
                        >
                          <DeleteOutlineOutlinedIcon className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </article>

        {/* Dynamic Analysis overlay modal */}
        {selectedTrashRecord && (
          <ModalFrame
            onClose={() => {
              setSelectedTrashRecord(null);
              setTrashModalAction(null);
              setTrashDetails(null);
            }}
            size="lg"
          >
            <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                {trashModalAction === "restore" ? (
                  <RestoreFromTrashOutlinedIcon className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <DeleteOutlineOutlinedIcon className="h-4.5 w-4.5 text-red-650" />
                )}
                {trashModalAction === "restore"
                  ? "Confirmar Restauración de Registro"
                  : "Confirmar Eliminación Permanente"
                }
              </h3>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${
                selectedTrashRecord.tipo === "ITEM"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}>
                {selectedTrashRecord.tipo === "ITEM" ? "Equipo" : "Artículo"}
              </span>
            </div>

            <div className="mt-3.5 rounded-xl border border-stone-150 bg-stone-50/70 p-3">
              <p className="text-xs font-bold text-stone-750">
                Elemento a procesar: <span className="text-stone-900 font-extrabold">{selectedTrashRecord.nombre}</span>
              </p>
              <p className="text-[10px] text-stone-400 font-mono mt-1">Identificador de origen: {selectedTrashRecord.originalId}</p>
            </div>

            {trashDetailsLoading ? (
              <div className="my-8 flex justify-center py-6">
                <LoadingInline label="Analizando y cargando dependencias de la base de datos..." />
              </div>
            ) : trashDetails ? (
              <div className="mt-4 space-y-4">
                <p className="text-xs text-stone-600 font-medium">
                  {trashModalAction === "restore"
                    ? "Se reestablecerá de forma atómica el elemento con las siguientes relaciones vinculadas:"
                    : "Se eliminarán físicamente del servidor de datos las siguientes entidades resguardadas:"
                  }
                </p>

                <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs space-y-2 max-h-[35vh] overflow-y-auto shadow-inner">
                  {selectedTrashRecord.tipo === "ITEM" ? (
                    <>
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-medium text-stone-700 flex items-center gap-1.5">
                          <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                          Ficha base del Equipo:
                        </span>
                        <span className="font-extrabold text-stone-950">1 registro (Activo: {trashDetails.item?.activo ? "Sí" : "No"})</span>
                      </div>

                      {trashDetails.cajaItems?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Ubicaciones en Cajas del Depósito:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.cajaItems.length} registros</span>
                        </div>
                      )}

                      {trashDetails.itemCodigosSIE?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <SearchOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Códigos de Barra de Inventario (SIE):
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.itemCodigosSIE.length} códigos</span>
                        </div>
                      )}

                      {trashDetails.cajaItemCodigosSIE?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Asociaciones de Códigos a Cajas:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.cajaItemCodigosSIE.length} registros</span>
                        </div>
                      )}

                      {trashDetails.movimientoItems?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <InfoOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Historial de Movimientos de Equipos:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.movimientoItems.length} movimientos</span>
                        </div>
                      )}

                      {trashDetails.deletedMovimientos?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Recibos de Entrega / Préstamos completos:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.deletedMovimientos.length} planillas</span>
                        </div>
                      )}

                      {trashDetails.deletedPrestamosActivos?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                          <span className="text-amber-900 font-bold flex items-center gap-1.5">
                            <WarningAmberOutlinedIcon className="h-4 w-4 text-amber-600" />
                            Préstamos Vigentes (Pendientes de Devolución):
                          </span>
                          <span className="font-black text-amber-800">{trashDetails.deletedPrestamosActivos.length} activos</span>
                        </div>
                      )}

                      {trashDetails.deletedPrestamosHistoriales?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <CheckCircleOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Historial de Préstamos Finalizados:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.deletedPrestamosHistoriales.length} devueltos</span>
                        </div>
                      )}

                      {trashDetails.stockOperacionItems?.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <CheckCircleOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Operaciones de Ajuste de Stock Relacionadas:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.stockOperacionItems.length} registros</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-medium text-stone-700 flex items-center gap-1.5">
                          <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                          Ficha base del Artículo:
                        </span>
                        <span className="font-extrabold text-stone-950">1 registro (Tipo: {trashDetails.articulo?.tipo})</span>
                      </div>

                      {trashDetails.stockMovimientos?.length > 0 && (
                        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <InfoOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Movimientos de Stock (Ingresos / Entregas):
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.stockMovimientos.length} transacciones</span>
                        </div>
                      )}

                      {trashDetails.emptyEntregas?.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-stone-600 flex items-center gap-1.5">
                            <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Planillas de Entregas a Personal Completas:
                          </span>
                          <span className="font-bold text-stone-900">{trashDetails.emptyEntregas.length} planillas</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {trashModalAction === "delete" ? (
                  <div className="rounded-xl border border-red-250 bg-red-50 p-3 text-xs text-red-950 flex gap-2 items-start shadow-sm">
                    <WarningAmberOutlinedIcon className="h-5 w-5 text-red-750 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-red-900 block mb-0.5">⚠️ ADVERTENCIA CRÍTICA:</strong>
                      Esta acción eliminará físicamente toda la información analizada y es irreversible. Se borrarán permanentemente del sistema de datos del depósito y no habrá forma de recuperarlos.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-250 bg-emerald-50 p-3 text-xs text-emerald-950 flex gap-2 items-start shadow-sm">
                    <CheckCircleOutlinedIcon className="h-5 w-5 text-emerald-750 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-emerald-900 block mb-0.5">💡 NOTA DE RESTAURACIÓN:</strong>
                      Al confirmar, se reinsertarán automáticamente todas las dependencias e historiales listados arriba, volviendo a estar disponibles en tiempo real en las vistas operativas principales y reportes del sistema.
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="my-6 text-center text-xs text-red-600">
                No se pudieron cargar los detalles para el análisis de impacto.
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedTrashRecord(null);
                  setTrashModalAction(null);
                  setTrashDetails(null);
                }}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmTrashAction}
                disabled={trashDetailsLoading}
                className={`rounded-xl px-4 py-2 text-xs font-bold text-white active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 shadow-sm ${
                  trashModalAction === "delete"
                    ? "bg-red-655 hover:bg-red-700 border border-red-750"
                    : "bg-emerald-655 hover:bg-emerald-700 border border-emerald-750"
                }`}
              >
                {trashModalAction === "delete" ? "Sí, eliminar permanentemente" : "Sí, restaurar registro completo"}
              </button>
            </div>
          </ModalFrame>
        )}
      </section>
    );
  }

  return null;
}
