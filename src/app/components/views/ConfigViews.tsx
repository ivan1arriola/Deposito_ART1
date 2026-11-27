"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import {
  formatAuditEntityId,
  resolveAuditEntityName,
  type AuditCiReferences,
} from "@/lib/audit-helpers";
import { formatUruguayanCi, normalizeCi } from "@/lib/ci";
import { formatDateTimeForDisplay, formatDateTimeExact } from "@/lib/date-helpers";
import { compareEquiposByTipoAndName } from "@/lib/equipo-sort";
import { systemUserLabel } from "@/lib/formatters";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MainView } from "@/types/views";
import {
  ROLE_OPTIONS,
  type Articulo,
  type AuditoriaRecord,
  type Equipo,
  type EquipoTipo,
  type FirmaConfig,
  type Rango,
  type Role,
  type TipoArticulo,
  type TipoEquipo,
  type UsuarioAdmin,
} from "@/types/entities";
import type { PapeleraRecord } from "@/app/types/home";
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
type EquipoConfig = Equipo;
type EquiposDisplayMode = "por_estado" | "alfabetico";
type AuditUserOption = {
  value: string;
  label: string;
};
type UserAccountType = UsuarioAdmin["accountType"];
type PapeleraViewState = {
  records: PapeleraRecord[];
  loading: boolean;
  restore: (papeleraId: string) => void | Promise<void>;
  removePermanent: (papeleraId: string) => void | Promise<void>;
};
type TrashDetails = {
  equipo?: { activo?: boolean | null } | null;
  articulo?: { tipo?: string | null } | null;
  cajaEquipos?: unknown[];
  equipoCodigosSIE?: unknown[];
  cajaItemCodigosSIE?: unknown[];
  movimientoEquipos?: unknown[];
  deletedMovimientos?: unknown[];
  deletedPrestamosActivos?: unknown[];
  deletedPrestamosHistoriales?: unknown[];
  stockOperacionEquipos?: unknown[];
  stockMovimientos?: unknown[];
  emptyEntregas?: unknown[];
};

interface ConfigViewsProps {
  activeView:
    | "grados"
    | "baterias"
    | "articulos"
    | "equipos"
    | "tipos_equipo"
    | "firmas"
    | "usuarios"
    | "auditoria"
    | "papelera";
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
  // Tipos de equipo state
  tiposEquipo: EquipoTipo[];
  newTipoEquipoNombre: string;
  newTipoEquipoOrden: string;
  editTipoEquipoId: number | null;
  editTipoEquipoNombre: string;
  editTipoEquipoOrden: string;
  // Equipos state
  equipos: EquipoConfig[];
  newEquipo: { nombre: string; tipo: TipoEquipo; activo: boolean; ordenPdf: number };
  editEquipoId: string | null;
  editEquipo: { nombre: string; tipo: TipoEquipo; activo: boolean; ordenPdf: number };
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
  // Tipos de equipo callbacks
  onNewTipoEquipoNombreChange: (value: string) => void;
  onNewTipoEquipoOrdenChange: (value: string) => void;
  onEditTipoEquipoIdChange: (id: number | null) => void;
  onEditTipoEquipoNombreChange: (value: string) => void;
  onEditTipoEquipoOrdenChange: (value: string) => void;
  onCreateTipoEquipo: () => void;
  onUpdateTipoEquipo: (tipoEquipoId: number) => void;
  onDeleteTipoEquipo: (tipoEquipoId: number) => void;
  onSumarStock?: (articuloId: number) => void;
  onEntregarArticulo?: (articuloId: number) => void;
  // Equipos callbacks
  onNewEquipoChange: (
    value: string | boolean,
    key: keyof Pick<EquipoConfig, "nombre" | "tipo" | "activo">
  ) => void;
  onEditEquipoIdChange: (id: string | null) => void;
  onEditEquipoChange: (
    value: string | boolean | number,
    key: keyof Pick<EquipoConfig, "nombre" | "tipo" | "activo" | "ordenPdf">
  ) => void;
  onCreateEquipo: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateEquipo: (equipoId: string) => void;
  onToggleEquipoActivo: (equipo: EquipoConfig) => void;
  onDeleteEquipo: (equipoId: string) => void;
  onMergeEquipoOrigenIdChange: (equipoId: string) => void;
  onMergeEquipoDestinoIdChange: (equipoId: string) => void;
  onMergeEquipos: (origenItemId: string, destinoItemId: string) => void;
  onSaveEquipoOrder: () => void;
  onResetEquipoOrderDraft: () => void;
  onSaveEquipoInactivoOrder: () => void;
  onResetEquipoInactivoOrderDraft: () => void;
  renderEquipoCard: (
    equipo: EquipoConfig,
    options?: {
      reorderableInActiveList?: boolean;
      reorderableInInactiveList?: boolean;
      orderIndex?: number;
      orderCount?: number;
      orderGroupType?: TipoEquipo;
    }
  ) => ReactNode;
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
  renderAuditDetalle: (
    detalle: unknown,
    ciReferences?: AuditCiReferences,
    accion?: string
  ) => ReactNode;
  // Papelera state and callbacks
  papelera?: PapeleraViewState;
  reloadCurrentViewData?: (showSpinner?: boolean) => Promise<void>;
}

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
  const [activeUserAccountTypeTab, setActiveUserAccountTypeTab] =
    useState<UserAccountType>("SISTEMA");
  const [personalUsersSearch, setPersonalUsersSearch] = useState("");
  const equiposCountByTipo = useMemo(() => {
    const next = new Map<string, number>();

    for (const equipo of props.equipos) {
      next.set(equipo.tipo, (next.get(equipo.tipo) ?? 0) + 1);
    }

    return next;
  }, [props.equipos]);

  // Local state for Auditoria Undo capability
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);
  const [undoSuccess, setUndoSuccess] = useState<string | null>(null);

  const handleUndo = async (auditoriaId: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas deshacer esta acción (#${auditoriaId})? Esto revertirá el estado de la base de datos.`
      )
    ) {
      return;
    }
    setUndoingId(auditoriaId);
    setUndoError(null);
    setUndoSuccess(null);
    try {
      const response = await fetch(`/api/auditoria/${auditoriaId}/undo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo deshacer la acción de auditoría.");
      }
      setUndoSuccess(`¡Acción de auditoría #${auditoriaId} revertida con éxito!`);
      if (props.reloadCurrentViewData) {
        await props.reloadCurrentViewData(true);
      }
    } catch (err: unknown) {
      setUndoError(err instanceof Error ? err.message : "Error al intentar deshacer la acción.");
    } finally {
      setUndoingId(null);
    }
  };

  const isUndoable = (log: AuditoriaRecord) => {
    const undoableEntities = [
      "GRADO_PERSONAL",
      "BATERIA",
      "ARTICULO",
      "EQUIPO",
      "PERSONAL",
      "OBSERVACION",
    ];
    return (
      (log.accion === "CREATE" || log.accion === "UPDATE" || log.accion === "DELETE") &&
      undoableEntities.includes(log.entidad)
    );
  };

  const isWithin5Days = (createdAt: string | Date) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 5;
  };

  // Local state for Papelera interactive preview
  type TrashRecord = NonNullable<ConfigViewsProps["papelera"]>["records"][0];
  const [selectedTrashRecord, setSelectedTrashRecord] = useState<TrashRecord | null>(null);
  const [trashDetails, setTrashDetails] = useState<TrashDetails | null>(null);
  const [trashDetailsLoading, setTrashDetailsLoading] = useState(false);
  const [trashModalAction, setTrashModalAction] = useState<"restore" | "delete" | null>(null);

  // Local state for Papelera interactive search & filter
  const [trashSearchQuery, setTrashSearchQuery] = useState("");
  const [trashTypeFilter, setTrashTypeFilter] = useState<"ALL" | "EQUIPO" | "ARTICULO">("ALL");

  const filteredTrashRecords = useMemo(() => {
    if (!props.papelera) return [];
    return props.papelera.records.filter((record) => {
      const matchesSearch =
        record.nombre.toLowerCase().includes(trashSearchQuery.toLowerCase()) ||
        record.originalId.toLowerCase().includes(trashSearchQuery.toLowerCase());
      const matchesType = trashTypeFilter === "ALL" || record.tipo === trashTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [props.papelera, trashSearchQuery, trashTypeFilter]);

  const handleOpenTrashModal = async (record: TrashRecord, action: "restore" | "delete") => {
    setSelectedTrashRecord(record);
    setTrashModalAction(action);
    setTrashDetailsLoading(true);
    setTrashDetails(null);
    try {
      const res = await fetch(`/api/papelera/${record.papeleraId}`);
      if (res.ok) {
        const data = await res.json();
        setTrashDetails(data.payload as TrashDetails);
      } else {
        console.log("Error fetching trash details");
      }
    } catch (err) {
      console.log(err);
    } finally {
      setTrashDetailsLoading(false);
    }
  };

  const handleConfirmTrashAction = () => {
    if (!selectedTrashRecord || !trashModalAction) return;
    if (trashModalAction === "restore") {
      void props.papelera?.restore(selectedTrashRecord.papeleraId);
    } else {
      void props.papelera?.removePermanent(selectedTrashRecord.papeleraId);
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
    [usuariosPersonal]
  );
  const personalUsersSearchTerm = personalUsersSearch.trim();
  const usuariosPersonalFiltrados = useMemo(() => {
    if (personalUsersSearchTerm === "") {
      return usuariosPersonal;
    }
    return filterSearchIndex(usuariosPersonalSearchIndex, personalUsersSearch);
  }, [usuariosPersonal, usuariosPersonalSearchIndex, personalUsersSearch, personalUsersSearchTerm]);
  const usuariosFiltradosPorTipo =
    activeUserAccountTypeTab === "SISTEMA" ? usuariosSistema : usuariosPersonalFiltrados;
  const renderTiposEquipoManagement = () => (
    <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900">Tipos de equipo</h3>
          <p className="mt-1 text-xs text-stone-600">
            Los equipos sin tipo relacionado quedan automáticamente en General, y el orden que
            definas aquí se refleja en stock, hojas y listados.
          </p>
        </div>
        {!props.canWrite ? (
          <p className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-700">
            Modo solo lectura: puedes consultar tipos, pero no modificarlos.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_96px_auto]">
        <input
          value={props.newTipoEquipoNombre}
          onChange={(event) => props.onNewTipoEquipoNombreChange(event.target.value)}
          placeholder="Nuevo tipo de equipo"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          disabled={!props.canWrite}
        />
        <input
          type="number"
          min="1"
          value={props.newTipoEquipoOrden}
          onChange={(event) => props.onNewTipoEquipoOrdenChange(event.target.value)}
          placeholder={String(props.tiposEquipo.filter((tipo) => !tipo.esGeneral).length + 1)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          disabled={!props.canWrite}
        />
        <button
          type="button"
          onClick={() => props.onCreateTipoEquipo()}
          disabled={!props.canWrite}
          className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Crear tipo
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-500">
        General siempre queda primero. Los demás tipos usan el orden numérico que indiques.
      </p>

      <div className="mt-4 space-y-2">
        {props.tiposEquipo.map((tipo) => {
          const equiposRelacionados = equiposCountByTipo.get(tipo.clave) ?? 0;

          return (
            <div key={`tipo-equipo-${tipo.clave}`} className="rounded-lg bg-white/90 p-3">
              {tipo.esGeneral ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap equipos-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{tipo.nombre}</span>
                      <span className="inline-flex equipos-center rounded-full border border-stone-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        Categoría por defecto
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Se aplica cuando un equipo no tiene tipo relacionado.
                    </p>
                  </div>
                  <span className="text-xs font-medium text-stone-500">
                    {equiposRelacionados} equipo{equiposRelacionados === 1 ? "" : "s"}
                  </span>
                </div>
              ) : props.editTipoEquipoId === tipo.tipoEquipoId ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_96px_auto]">
                  <input
                    value={props.editTipoEquipoNombre}
                    onChange={(event) => props.onEditTipoEquipoNombreChange(event.target.value)}
                    className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    min="1"
                    value={props.editTipoEquipoOrden}
                    onChange={(event) => props.onEditTipoEquipoOrdenChange(event.target.value)}
                    className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                  />
                  <div className="flex gap-2">
                    {props.canWrite ? (
                      <>
                        <SmallActionButton
                          text="Ok"
                          tone="ok"
                          onClick={() => props.onUpdateTipoEquipo(tipo.tipoEquipoId ?? 0)}
                        />
                        <SmallActionButton
                          text="Cancelar"
                          tone="neutral"
                          onClick={() => {
                            props.onEditTipoEquipoIdChange(null);
                            props.onEditTipoEquipoNombreChange("");
                            props.onEditTipoEquipoOrdenChange("");
                          }}
                        />
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap equipos-center gap-2">
                      <span className="text-sm font-medium text-stone-800">{tipo.nombre}</span>
                      <span className="inline-flex equipos-center rounded-full border border-stone-300 bg-stone-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
                        {tipo.clave}
                      </span>
                      <span className="inline-flex equipos-center rounded-full border border-stone-200 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-stone-700">
                        {equiposRelacionados} equipo{equiposRelacionados === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">{`Orden ${tipo.orden}. Si lo borras, sus equipos vuelven a General.`}</p>
                  </div>
                  {props.canWrite ? (
                    <div className="flex gap-2">
                      <SmallActionButton
                        text="Editar"
                        tone="edit"
                        onClick={() => {
                          props.onEditTipoEquipoIdChange(tipo.tipoEquipoId);
                          props.onEditTipoEquipoNombreChange(tipo.nombre);
                          props.onEditTipoEquipoOrdenChange(String(tipo.orden));
                        }}
                      />
                      <SmallActionButton
                        text="Borrar"
                        tone="delete"
                        onClick={() => props.onDeleteTipoEquipo(tipo.tipoEquipoId ?? 0)}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (props.activeView === "grados") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">
            Grados registrados
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Desde esta vista se muestran los grados de oficiales, suboficiales y subalternos con su
            orden actual.
          </p>
          <p className="mt-1 text-xs text-stone-600">
            El administrador puede editar o eliminar cualquier grado desde esta pantalla.
          </p>
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
                        onChange={(event) =>
                          props.onEditRangoNombreCompletoChange(event.target.value)
                        }
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
                          <SmallActionButton
                            text="Ok"
                            tone="ok"
                            onClick={() => props.onUpdateRango(rango.rangoId)}
                          />
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap equipos-center gap-2">
                          <span className="text-sm font-medium text-stone-800">
                            {props.rangoLabel(rango)}
                          </span>
                          {rango.tipo ? (
                            <span className="inline-flex equipos-center rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-600">
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
                          <SmallActionButton
                            text="Borrar"
                            tone="delete"
                            onClick={() => props.onDeleteRango(rango.rangoId)}
                          />
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
          <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">
            Baterías registradas
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Desde esta vista puedes editar o eliminar baterías existentes.
          </p>
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
                      <SmallActionButton
                        text="Ok"
                        tone="ok"
                        onClick={() => props.onUpdateBateria(bateria.bateriaId)}
                      />
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
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
                      <SmallActionButton
                        text="Borrar"
                        tone="delete"
                        onClick={() => props.onDeleteBateria(bateria.bateriaId)}
                      />
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
    // Group articles by tipo
    const grouped: Record<TipoArticulo, typeof props.articulos> = {} as Record<
      TipoArticulo,
      typeof props.articulos
    >;
    for (const art of props.articulos) {
      if (!grouped[art.tipo]) {
        grouped[art.tipo] = [];
      }
      grouped[art.tipo].push(art);
    }

    // Sort each group alphabetically A-Z by name
    for (const key of Object.keys(grouped)) {
      grouped[key as TipoArticulo].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
      );
    }

    const handlePrintCatalog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const tipoLabels: Record<TipoArticulo, string> = {
        OFICINA: "Oficina y Papelería",
        LIMPIEZA: "Limpieza e Higiene",
      };

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <title>Catálogo de Artículos - Depósito General</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              color: #1c1917;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #e7e5e4;
              padding-bottom: 15px;
            }
            .header h1 {
              font-size: 20px;
              margin: 0;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .header p {
              font-size: 12px;
              color: #78716c;
              margin: 4px 0 0 0;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              color: #78716c;
              margin-bottom: 20px;
            }
            .category-section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .category-title {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              color: #44403c;
              background-color: #f5f5f4;
              padding: 6px 10px;
              border-radius: 4px;
              margin-bottom: 8px;
              border-left: 3px solid #78716c;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 6px 10px;
              text-align: left;
              font-size: 12px;
              border-bottom: 1px solid #e7e5e4;
            }
            th {
              font-weight: 700;
              color: #44403c;
              background-color: #fafaf9;
            }
            .text-right {
              text-align: right;
            }
            .stock-positive {
              color: #15803d;
              font-weight: 600;
            }
            .stock-zero {
              color: #b91c1c;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Catálogo de Artículos</h1>
            <p>Sistema de Depósito General — Artillería 1</p>
          </div>
          <div class="meta">
            <span>Fecha de Impresión: ${new Date().toLocaleDateString("es-UY")} ${new Date().toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Total de Artículos: ${props.articulos.length}</span>
          </div>

          ${ARTICULO_TIPO_OPTIONS.map((tipo) => {
            const list = grouped[tipo] || [];
            if (list.length === 0) return "";
            return `
              <div class="category-section">
                <div class="category-title">${tipoLabels[tipo] || tipo}</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 75%;">Nombre del Artículo</th>
                      <th style="width: 25%;" class="text-right">Cantidad en Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list
                      .map(
                        (art) => `
                      <tr>
                        <td>${art.nombre}</td>
                        <td class="text-right ${art.stockActual > 0 ? "stock-positive" : "stock-zero"}">
                          ${art.stockActual}
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `;
          }).join("")}

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    };

    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:equipos-start sm:justify-between border-b border-stone-200 pb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex equipos-center gap-2">
                <svg
                  className="w-5 h-5 text-stone-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                Catálogo de Artículos
              </h2>
              <p className="mt-1 text-xs text-stone-600">
                Inventario auxiliar de oficina, limpieza y consumibles de la Unidad militar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handlePrintCatalog}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 flex equipos-center gap-1.5 shadow-sm"
              >
                <svg
                  className="w-4 h-4 text-stone-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4"
                  />
                </svg>
                Imprimir catálogo
              </button>
              {props.canWrite ? (
                <button
                  type="button"
                  onClick={() => props.onNavigateView("articulo_stock_ingreso")}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 flex equipos-center gap-1.5 shadow-sm"
                >
                  <svg
                    className="w-4 h-4 text-stone-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Ingreso de stock
                </button>
              ) : null}
              {props.isAdmin ? (
                <button
                  type="button"
                  onClick={() => props.onNavigateView("articulo_nuevo")}
                  className="ej-button rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"
                >
                  Nuevo artículo
                </button>
              ) : null}
            </div>
          </div>

          {!props.isAdmin ? (
            <p className="mt-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600 flex equipos-center gap-2">
              <svg
                className="w-4 h-4 text-stone-400 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Modo solo lectura: solo el administrador puede crear, editar o eliminar artículos.
            </p>
          ) : null}

          <div className="mt-4 space-y-6">
            {props.articulos.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-stone-300 bg-stone-50 px-4 py-8 text-center">
                <p className="text-sm text-stone-600">
                  Todavía no hay artículos registrados en el sistema.
                </p>
              </div>
            ) : null}

            {ARTICULO_TIPO_OPTIONS.map((tipo) => {
              const list = grouped[tipo] || [];
              if (list.length === 0) return null;

              return (
                <div
                  key={tipo}
                  className="border border-stone-200/70 bg-stone-50/30 p-4 rounded-xl shadow-sm"
                >
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3.5 flex equipos-center justify-between">
                    <span className="flex equipos-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                      {ARTICULO_TIPO_LABEL[tipo]}
                    </span>
                    <span className="text-[10px] font-bold text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded-full uppercase tracking-normal">
                      {list.length} {list.length === 1 ? "artículo" : "artículos"}
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 gap-2.5">
                    {list.map((articulo) => (
                      <div
                        key={articulo.articuloId}
                        className="rounded-xl border border-stone-200 bg-white p-3 hover:border-stone-300 hover:shadow-sm transition-all duration-150"
                      >
                        {props.editArticuloId === articulo.articuloId && props.isAdmin ? (
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
                            <input
                              value={props.editArticuloNombre}
                              onChange={(event) =>
                                props.onEditArticuloNombreChange(event.target.value)
                              }
                              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
                            />
                            <select
                              value={props.editArticuloTipo}
                              onChange={(event) =>
                                props.onEditArticuloTipoChange(event.target.value as TipoArticulo)
                              }
                              className="w-full rounded border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-500"
                            >
                              {ARTICULO_TIPO_OPTIONS.map((t) => (
                                <option key={t} value={t}>
                                  {ARTICULO_TIPO_LABEL[t]}
                                </option>
                              ))}
                            </select>
                            <div className="flex gap-2">
                              <SmallActionButton
                                text="Ok"
                                tone="ok"
                                onClick={() => props.onUpdateArticulo(articulo.articuloId)}
                              />
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
                          <div className="flex flex-col gap-3 sm:flex-row sm:equipos-center sm:justify-between">
                            {/* Left Side: Name and Category badge */}
                            <div className="flex equipos-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-stone-100 flex equipos-center justify-center text-stone-600 shadow-inner flex-shrink-0">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                  />
                                </svg>
                              </div>
                              <span className="text-sm font-semibold text-stone-800 tracking-tight">
                                {articulo.nombre}
                              </span>
                            </div>

                            {/* Right Side: Stock Status and Actions */}
                            <div className="flex flex-wrap equipos-center gap-2 sm:gap-3 ml-auto sm:ml-0">
                              {/* Stock Badge */}
                              <div
                                className={`px-2.5 py-1 rounded-full text-xs font-bold border flex equipos-center gap-1.5 shadow-sm select-none ${
                                  articulo.stockActual > 0
                                    ? "bg-green-50/80 border-green-200/60 text-green-700"
                                    : "bg-red-50/80 border-red-200/60 text-red-700"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${articulo.stockActual > 0 ? "bg-green-500" : "bg-red-500"}`}
                                ></span>
                                Stock: {articulo.stockActual}
                              </div>

                              {/* Quick Inventory Handlers */}
                              {props.canWrite && (
                                <div className="flex equipos-center gap-1">
                                  <button
                                    type="button"
                                    title="Sumar stock para este artículo"
                                    onClick={() => {
                                      if (props.onSumarStock) {
                                        props.onSumarStock(articulo.articuloId);
                                      } else {
                                        props.onNavigateView("articulo_stock_ingreso");
                                      }
                                    }}
                                    className="inline-flex equipos-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-700 hover:text-emerald-700 bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 rounded-lg transition-colors duration-150 shadow-sm"
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      strokeWidth="2.5"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 4v16m8-8H4"
                                      />
                                    </svg>
                                    Sumar
                                  </button>
                                  <button
                                    type="button"
                                    title="Entregar este artículo a un subalterno"
                                    onClick={() => {
                                      if (props.onEntregarArticulo) {
                                        props.onEntregarArticulo(articulo.articuloId);
                                      } else {
                                        props.onNavigateView("articulo_entrega_personal");
                                      }
                                    }}
                                    className="inline-flex equipos-center gap-1 px-2.5 py-1 text-xs font-bold text-stone-700 hover:text-blue-700 bg-stone-100 hover:bg-blue-50 border border-stone-200 hover:border-blue-200 rounded-lg transition-colors duration-150 shadow-sm"
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      strokeWidth="2.5"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                      />
                                    </svg>
                                    Entregar
                                  </button>
                                </div>
                              )}

                              {/* Admin Actions */}
                              {props.isAdmin && (
                                <div className="flex equipos-center gap-1 border-l border-stone-200 pl-2 sm:pl-3">
                                  <SmallActionButton
                                    text="Editar"
                                    tone="edit"
                                    onClick={() => {
                                      props.onEditArticuloIdChange(articulo.articuloId);
                                      props.onEditArticuloNombreChange(articulo.nombre);
                                      props.onEditArticuloTipoChange(articulo.tipo);
                                    }}
                                  />
                                  <SmallActionButton
                                    text="Borrar"
                                    tone="delete"
                                    onClick={() => props.onDeleteArticulo(articulo.articuloId)}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    );
  }

  if (props.activeView === "tipos_equipo") {
    return (
      <section className="mt-6 grid grid-cols-1 gap-4">
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:equipos-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Tipos de equipo</h2>
              <p className="mt-1 text-xs text-stone-600">
                Administra las categorías del catálogo y define el orden en que aparecen en stock,
                hojas y listados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => props.onNavigateView("equipos")}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Ir al catálogo de equipos
            </button>
          </div>

          <div className="mt-6">{renderTiposEquipoManagement()}</div>
        </article>
      </section>
    );
  }

  if (props.activeView === "equipos") {
    const equiposOrdenadosAlfabeticamente = [...props.equipos].sort((a, b) =>
      compareEquiposByTipoAndName(a, b)
    );
    const tipoSections = props.tiposEquipo.map((tipo) => {
      const alphabeticItems = equiposOrdenadosAlfabeticamente.filter(
        (equipo) => equipo.tipo === tipo.clave
      );
      const activeItems = props.equiposActivosEnPantalla.filter(
        (equipo) => equipo.tipo === tipo.clave
      );
      const inactiveItems = props.equiposInactivosEnPantalla.filter(
        (equipo) => equipo.tipo === tipo.clave
      );

      return {
        key: tipo.clave,
        label: tipo.nombre,
        isGeneral: tipo.esGeneral,
        alphabeticItems,
        activeItems,
        inactiveItems,
        activeOrderById: new Map(activeItems.map((equipo, index) => [equipo.equipoId, index])),
        inactiveOrderById: new Map(inactiveItems.map((equipo, index) => [equipo.equipoId, index])),
      };
    });
    return (
      <section className="mt-6 grid grid-cols-1 gap-6">
        <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-md">
          {/* Header Banner */}
          <div className="bg-stone-800 px-6 py-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9IjAuNCIgc3Ryb2tlLXdpZHRoPSIxIj48L3BhdGg+Cjwvc3ZnPg==')] bg-repeat" />
            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:equipos-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white/95">
                  Catálogo de Equipos
                </h2>
                <p className="mt-2 text-sm font-medium text-stone-300 max-w-xl leading-relaxed">
                  Administra, edita y elimina equipos. Organiza su aparición en las hojas de entrega
                  o matrices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => props.onNavigateView("tipos_equipo")}
                className="inline-flex equipos-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white shadow-sm ring-1 ring-white/20 transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
              >
                <svg
                  className="h-4.5 w-4.5 opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Categorías y Tipos
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {!props.canWrite ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                <div className="flex equipos-center gap-3 text-amber-800">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-amber-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <p className="text-sm font-bold">
                    Modo de sólo lectura: no tienes permisos para modificar el catálogo.
                  </p>
                </div>
              </div>
            ) : null}

            {/* View Toggle */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:equipos-center sm:justify-between">
              <div className="flex w-full equipos-center rounded-xl bg-stone-100/80 p-1 sm:w-auto shadow-inner ring-1 ring-stone-200/50">
                <button
                  type="button"
                  onClick={() => setEquiposDisplayMode("por_estado")}
                  className={`flex-1 sm:flex-none rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                    equiposDisplayMode === "por_estado"
                      ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/60"
                      : "text-stone-500 hover:bg-stone-200/50 hover:text-stone-700"
                  }`}
                >
                  Vista por Estado de Hoja
                </button>
                <button
                  type="button"
                  onClick={() => setEquiposDisplayMode("alfabetico")}
                  className={`flex-1 sm:flex-none rounded-lg px-4 py-2.5 text-sm font-bold transition-all duration-300 ${
                    equiposDisplayMode === "alfabetico"
                      ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/60"
                      : "text-stone-500 hover:bg-stone-200/50 hover:text-stone-700"
                  }`}
                >
                  Vista Alfabética (A-Z)
                </button>
              </div>
              <p className="text-xs font-semibold text-stone-400">
                {equiposDisplayMode === "por_estado"
                  ? "Ordena equipos visibles y ocultos de manera independiente."
                  : "Todos los equipos organizados por nombre."}
              </p>
            </div>

            <div className="space-y-12">
              {equiposDisplayMode === "alfabetico" ? (
                <div className="space-y-8">
                  {tipoSections.map((section) => (
                    <div key={section.key} className="relative">
                      <div className="mb-4 flex equipos-center gap-3 pb-2 border-b border-stone-100">
                        <div
                          className={`flex h-8 w-8 equipos-center justify-center rounded-lg shadow-sm ${
                            section.isGeneral
                              ? "bg-sky-100 text-sky-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          <svg
                            className="h-4.5 w-4.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-bold text-stone-800">
                          {section.isGeneral ? "Equipos Generales" : section.label}
                        </h3>
                        <span className="inline-flex h-6 equipos-center justify-center rounded-full bg-stone-100 px-2.5 text-xs font-bold text-stone-600 ring-1 ring-stone-200/60">
                          {section.alphabeticItems.length}
                        </span>
                      </div>

                      {section.alphabeticItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                          {section.alphabeticItems.map((equipo) =>
                            props.renderEquipoCard(equipo, { reorderableInActiveList: false })
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col equipos-center justify-center rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
                          <div className="mb-3 rounded-full bg-stone-100 p-3 text-stone-300">
                            <svg
                              className="h-6 w-6"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-stone-500">
                            Sin equipos registrados
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {equiposDisplayMode === "por_estado" ? (
                <>
                  <div className="relative">
                    <div className="sticky top-0 z-20 -mx-6 px-6 py-4 backdrop-blur-xl bg-white/80 border-b border-stone-100/80 sm:-mx-8 sm:px-8 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                      <div className="flex flex-col gap-4 sm:flex-row sm:equipos-center sm:justify-between">
                        <div className="flex equipos-center gap-3">
                          <div className="flex h-10 w-10 equipos-center justify-center rounded-xl bg-emerald-100 text-emerald-600 shadow-sm ring-1 ring-emerald-200/50">
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-black tracking-tight text-stone-900">
                              Activos en Hoja de Entrega
                            </h3>
                            <p className="text-xs font-semibold text-emerald-600">
                              {props.equiposActivosEnPantalla.length} equipos visibles
                            </p>
                          </div>
                        </div>

                        {props.equiposActivosEnPantalla.length > 0 &&
                        props.hasEquipoOrderDraftChanges ? (
                          <div className="flex equipos-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button
                              type="button"
                              onClick={props.onResetEquipoOrderDraft}
                              className="rounded-xl bg-stone-100 px-4 py-2.5 text-xs font-bold text-stone-600 transition-all hover:bg-stone-200 active:scale-95"
                            >
                              Deshacer
                            </button>
                            <button
                              type="button"
                              onClick={props.onSaveEquipoOrder}
                              className="inline-flex equipos-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2.5}
                                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                                />
                              </svg>
                              Guardar Orden
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-8 space-y-10">
                      {tipoSections.map((section) => (
                        <div key={`active-${section.key}`}>
                          <div className="mb-4 flex equipos-center gap-3">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500">
                              {section.isGeneral ? "Generales" : section.label}
                            </h4>
                            <div className="h-px flex-1 bg-stone-100"></div>
                            <span className="text-xs font-bold text-stone-400">
                              {section.activeItems.length}
                            </span>
                          </div>
                          {section.activeItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                              {section.activeItems.map((equipo) =>
                                props.renderEquipoCard(equipo, {
                                  reorderableInActiveList: true,
                                  orderGroupType: section.key,
                                  orderIndex: section.activeOrderById.get(equipo.equipoId) ?? -1,
                                  orderCount: section.activeItems.length,
                                })
                              )}
                            </div>
                          ) : (
                            <div className="flex equipos-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-4 py-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-stone-300"></span>
                              <p className="text-xs font-medium text-stone-500">
                                Ningún equipo activo en esta categoría.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative mt-16 pt-8 border-t-2 border-dashed border-stone-200/50">
                    <div className="flex flex-col gap-4 sm:flex-row sm:equipos-center sm:justify-between mb-8">
                      <div className="flex equipos-center gap-3">
                        <div className="flex h-10 w-10 equipos-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-sm ring-1 ring-rose-200/50">
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-black tracking-tight text-stone-900">
                            Ocultos de Hoja General
                          </h3>
                          <p className="text-xs font-semibold text-rose-600">
                            {props.equiposInactivos.length} equipos fuera de hoja
                          </p>
                        </div>
                      </div>

                      {props.equiposInactivosEnPantalla.length > 0 &&
                      props.hasEquipoInactivoOrderDraftChanges ? (
                        <div className="flex equipos-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                          <button
                            type="button"
                            onClick={props.onResetEquipoInactivoOrderDraft}
                            className="rounded-xl bg-stone-100 px-4 py-2.5 text-xs font-bold text-stone-600 transition-all hover:bg-stone-200 active:scale-95"
                          >
                            Deshacer
                          </button>
                          <button
                            type="button"
                            onClick={props.onSaveEquipoInactivoOrder}
                            className="inline-flex equipos-center gap-1.5 rounded-xl bg-stone-800 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-stone-800/20 transition-all hover:bg-stone-900 active:scale-95"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                              />
                            </svg>
                            Guardar Orden Inactivos
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-10 opacity-90">
                      {tipoSections.map((section) => (
                        <div key={`inactive-${section.key}`}>
                          <div className="mb-4 flex equipos-center gap-3">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-stone-500">
                              {section.isGeneral
                                ? "Generales (Ocultos)"
                                : `${section.label} (Ocultos)`}
                            </h4>
                            <div className="h-px flex-1 bg-stone-100"></div>
                            <span className="text-xs font-bold text-stone-400">
                              {section.inactiveItems.length}
                            </span>
                          </div>
                          {section.inactiveItems.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                              {section.inactiveItems.map((equipo) =>
                                props.renderEquipoCard(equipo, {
                                  reorderableInActiveList: false,
                                  reorderableInInactiveList: true,
                                  orderGroupType: section.key,
                                  orderIndex: section.inactiveOrderById.get(equipo.equipoId) ?? -1,
                                  orderCount: section.inactiveItems.length,
                                })
                              )}
                            </div>
                          ) : (
                            <div className="flex equipos-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-4 py-3">
                              <span className="h-1.5 w-1.5 rounded-full bg-stone-300"></span>
                              <p className="text-xs font-medium text-stone-500">
                                Ningún equipo oculto en esta categoría.
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
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
          <h2 className="text-base font-semibold text-stone-900">
            Firmas institucionales (solo administrador)
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Esta sección controla los datos de quienes firman la hoja de entrega. Los textos
            institucionales son fijos.
          </p>
          <div className="mt-3 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold text-stone-700">Textos institucionales (fijos):</p>
            <p className="text-xs text-stone-600">
              • Encargado: El Encargado del Depósito General del Grp. &quot;Brig. Gral. Manuel
              Oribe&quot; de Artillería 105mm No. 1.
            </p>
            <p className="text-xs text-stone-600">
              • Oficial: El Oficial de Administración del Grp. &quot;Brig. Gral. Manuel Oribe&quot;
              de Artillería 105mm No. 1.
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Grado
                    </span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.encargadoRango}
                      onChange={(event) =>
                        props.onFirmaConfigDraftChange("encargadoRango", event.target.value)
                      }
                      placeholder="Ej: Sgto."
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.encargadoNombre}
                      onChange={(event) =>
                        props.onFirmaConfigDraftChange("encargadoNombre", event.target.value)
                      }
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
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Grado
                    </span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.oficialRango}
                      onChange={(event) =>
                        props.onFirmaConfigDraftChange("oficialRango", event.target.value)
                      }
                      placeholder="Ej: -Tte.2º"
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Nombre
                    </span>
                    <input
                      type="text"
                      value={props.firmaConfigDraft.oficialNombre}
                      onChange={(event) =>
                        props.onFirmaConfigDraftChange("oficialNombre", event.target.value)
                      }
                      placeholder="Ej: Gerardo Otero"
                      disabled={props.firmaConfigSaving}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap equipos-center justify-between gap-2">
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
              {props.firmaConfigError ? (
                <p className="text-xs font-medium text-rose-700">{props.firmaConfigError}</p>
              ) : null}
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
            Desde esta vista puedes editar, activar, desactivar o eliminar usuarios existentes. Las
            altas nuevas se hacen desde el menú `Configuración`.
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
                    <p
                      className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${selected ? "text-stone-300" : "text-stone-400"}`}
                    >
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
              const count =
                tab.value === "SISTEMA" ? usuariosSistema.length : usuariosPersonal.length;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveUserAccountTypeTab(tab.value)}
                  className={`inline-flex equipos-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
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
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                Buscar personal
              </span>
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {systemUserLabel(usuario)}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        {`Usuario: ${usuario.username}${isPersonalAccount ? " (acceso por cédula)" : ""}`}
                      </p>
                      <p className="text-xs text-stone-600">
                        {usuario.mailReferencia
                          ? `Mail de referencia: ${usuario.mailReferencia} (${usuario.mailVerificadaAt ? "verificado" : "no verificado"})`
                          : "Mail de referencia: sin dato"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {isPersonalAccount
                          ? "Cuenta de personal: acceso de solo consulta a su ficha."
                          : props.roleDescription(usuario.rol)}
                      </p>
                      <p className="text-xs text-stone-600">
                        {usuario.activo ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isPersonalAccount ? (
                        <SmallActionButton
                          text="Datos"
                          tone="edit"
                          onClick={() => props.onEditUsuario(usuario)}
                        />
                      ) : null}
                      {!isPersonalAccount ? (
                        <SmallActionButton
                          text="Editar rol"
                          tone="edit"
                          onClick={() => props.onChangeUserRole(usuario)}
                        />
                      ) : null}
                      <SmallActionButton
                        text="Contraseña"
                        tone="edit"
                        onClick={() => props.onChangeUserPassword(usuario)}
                      />
                      {!isPersonalAccount && usuario.mailReferencia && !usuario.mailVerificadaAt ? (
                        <SmallActionButton
                          text="Confirmar correo"
                          tone="ok"
                          onClick={() => props.onConfirmUserEmail(usuario)}
                        />
                      ) : null}
                      <SmallActionButton
                        text={usuario.activo ? "Desactivar" : "Activar"}
                        tone="neutral"
                        onClick={() => props.onToggleUserActive(usuario)}
                      />
                      {!isPersonalAccount ? (
                        <SmallActionButton
                          text="Borrar"
                          tone="delete"
                          onClick={() => props.onDeleteUsuario(usuario)}
                        />
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
          <h2 className="text-base font-semibold text-stone-900">
            Historial de Auditoría y Control de Cambios
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Visualice las transiciones exactas de estado (Antes → Ahora) de cada acción
            administrativa del sistema y deshaga cambios recientes (dentro de los 5 días de validez)
            de forma segura.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_300px] lg:equipos-center">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => props.onAuditFilterChange("TODOS")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  props.auditFilter === "TODOS"
                    ? "bg-stone-800 text-white"
                    : "border border-stone-300 bg-white text-stone-700"
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
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                value={props.auditUserFilter === "ALL" ? "" : props.auditUserFilter}
                onChange={(event) => props.onAuditUserFilterChange(event.target.value)}
                placeholder="🔍 Buscar por usuario, grado, CI..."
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm transition placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
              />
            </div>
          </div>
          {undoSuccess && (
            <div className="mt-3 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200 text-xs font-semibold flex equipos-center gap-2">
              <CheckCircleOutlinedIcon className="h-4 w-4 text-green-600" />
              {undoSuccess}
            </div>
          )}
          {undoError && (
            <div className="mt-3 p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs font-semibold flex equipos-center gap-2">
              <WarningAmberOutlinedIcon className="h-4 w-4 text-red-600" />
              {undoError}
            </div>
          )}
          <div className="mt-3 space-y-3 w-full">
            {props.auditoriaFiltradaPaginada.map((log) => {
              const exactTime = formatDateTimeExact(log.createdAt);
              const undoAvailable = isUndoable(log) && isWithin5Days(log.createdAt);
              const resolvedName = resolveAuditEntityName(
                log.entidad,
                log.detalle,
                log.ciReferencias
              );

              return (
                <div
                  key={log.auditoriaId}
                  className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm hover:shadow transition-shadow duration-150 flex flex-col gap-2 w-full"
                >
                  {/* Día y hora exactas + Auditoría BD # */}
                  <div className="flex flex-wrap equipos-center justify-between border-b border-stone-100 pb-2">
                    <span className="text-[11px] font-bold text-stone-500 bg-stone-50 border border-stone-200/55 px-2 py-0.5 rounded flex equipos-center gap-1">
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
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                        Quién realizó la acción
                      </span>
                      <span className="text-stone-800 text-sm">
                        {log.usuario ? (
                          <>
                            <span className="font-bold text-stone-900">
                              {[
                                log.usuario.rango?.abreviacion,
                                log.usuario.nombre,
                                log.usuario.apellido,
                              ]
                                .filter(Boolean)
                                .join(" ")
                                .trim() || log.usuario.username}
                            </span>
                            <span className="text-stone-500 font-medium text-xs ml-1">
                              {`(${log.usuario.username} | ${props.roleLabel(log.usuario.rol)})`}
                            </span>
                          </>
                        ) : (
                          (() => {
                            if (
                              log.detalle &&
                              typeof log.detalle === "object" &&
                              !Array.isArray(log.detalle)
                            ) {
                              const det = log.detalle as Record<string, unknown>;
                              if (det.accountType === "PERSONAL" || det.ci) {
                                const ci = String(det.ci || det.username || log.entidadId || "");
                                const formattedCi = formatUruguayanCi(ci);
                                const nameFromRef =
                                  log.ciReferencias?.[ci] || log.ciReferencias?.[normalizeCi(ci)];
                                const name =
                                  nameFromRef ||
                                  [det.grado || det.gradoAbreviacion, det.nombre, det.apellido]
                                    .filter(Boolean)
                                    .join(" ")
                                    .trim();
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
                          })()
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                        Qué hizo exactamente
                      </span>
                      <span className="font-medium text-stone-800 text-sm">
                        {`${props.auditActionLabel(log.accion)} ${props.auditEntityLabel(log.entidad)}`}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                        Entidades afectadas
                      </span>
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
                    <div className="flex equipos-center justify-between mt-2 pt-2 border-t border-stone-100">
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
                        className={`rounded px-3 py-1 text-xs font-bold shadow-sm transition-all duration-150 flex equipos-center gap-1 ${
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
          <div className="flex flex-col gap-4 md:flex-row md:equipos-center md:justify-between border-b border-stone-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900 flex equipos-center gap-2">
                <DeleteOutlineOutlinedIcon className="h-5 w-5 text-stone-600" />
                Papelera de Reciclaje
              </h2>
              <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                Restaura o elimina permanentemente artículos y equipos dados de baja. Se listan sus
                recibos, préstamos y movimientos históricos resguardados.
              </p>
            </div>

            {/* Interactive Controls */}
            {!props.papelera?.loading && props.papelera && props.papelera.records.length > 0 && (
              <div className="flex flex-col gap-2 sm:flex-row sm:equipos-center">
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
                    onClick={() => setTrashTypeFilter("EQUIPO")}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
                      trashTypeFilter === "EQUIPO"
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

          {props.papelera?.loading ? (
            <div className="mt-8 flex justify-center py-12">
              <LoadingInline label="Cargando papelera..." />
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {filteredTrashRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-250 bg-stone-50 px-6 py-12 text-center flex flex-col equipos-center justify-center">
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
                      className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white p-3.5 sm:flex-row sm:equipos-center sm:justify-between transition-all hover:shadow-sm"
                    >
                      <div className="flex equipos-center gap-3">
                        {/* Dynamic Icon Container */}
                        <div
                          className={`hidden xs:flex h-9 w-9 equipos-center justify-center rounded-xl transition-all ${
                            record.tipo === "EQUIPO"
                              ? "bg-blue-50 text-blue-600 border border-blue-150 group-hover:bg-blue-100/70"
                              : "bg-purple-50 text-purple-600 border border-purple-150 group-hover:bg-purple-100/70"
                          }`}
                        >
                          {record.tipo === "EQUIPO" ? (
                            <FolderZipOutlinedIcon className="h-4.5 w-4.5" />
                          ) : (
                            <StorageOutlinedIcon className="h-4.5 w-4.5" />
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap equipos-center gap-2">
                            <span className="text-sm font-bold text-stone-850">
                              {record.nombre}
                            </span>
                            <span
                              className={`inline-flex equipos-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${
                                record.tipo === "EQUIPO"
                                  ? "bg-blue-50/70 text-blue-700 border-blue-200"
                                  : "bg-purple-50/70 text-purple-700 border-purple-200"
                              }`}
                            >
                              {record.tipo === "EQUIPO" ? "Equipo" : "Artículo"}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono">
                              ID: {record.originalId}
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] text-stone-500 flex equipos-center gap-1">
                            <InfoOutlinedIcon className="h-3 w-3 inline text-stone-400" />
                            Eliminado el:{" "}
                            <strong className="text-stone-700 font-semibold">
                              {formatDateTimeForDisplay(record.createdAt)}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenTrashModal(record, "restore")}
                          className="rounded-lg border border-emerald-250 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all active:scale-95 flex equipos-center gap-1"
                        >
                          <RestoreFromTrashOutlinedIcon className="h-3.5 w-3.5" />
                          Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenTrashModal(record, "delete")}
                          className="rounded-lg border border-red-250 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100 transition-all active:scale-95 flex equipos-center gap-1"
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
            <div className="flex equipos-center gap-2 border-b border-stone-200 pb-3">
              <h3 className="text-sm font-bold text-stone-900 flex equipos-center gap-1.5">
                {trashModalAction === "restore" ? (
                  <RestoreFromTrashOutlinedIcon className="h-4.5 w-4.5 text-emerald-600" />
                ) : (
                  <DeleteOutlineOutlinedIcon className="h-4.5 w-4.5 text-red-650" />
                )}
                {trashModalAction === "restore"
                  ? "Confirmar Restauración de Registro"
                  : "Confirmar Eliminación Permanente"}
              </h3>
              <span
                className={`inline-flex equipos-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${
                  selectedTrashRecord.tipo === "EQUIPO"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-purple-50 text-purple-700 border-purple-200"
                }`}
              >
                {selectedTrashRecord.tipo === "EQUIPO" ? "Equipo" : "Artículo"}
              </span>
            </div>

            <div className="mt-3.5 rounded-xl border border-stone-150 bg-stone-50/70 p-3">
              <p className="text-xs font-bold text-stone-750">
                Elemento a procesar:{" "}
                <span className="text-stone-900 font-extrabold">{selectedTrashRecord.nombre}</span>
              </p>
              <p className="text-[10px] text-stone-400 font-mono mt-1">
                Identificador de origen: {selectedTrashRecord.originalId}
              </p>
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
                    : "Se eliminarán físicamente del servidor de datos las siguientes entidades resguardadas:"}
                </p>

                <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs space-y-2 max-h-[35vh] overflow-y-auto shadow-inner">
                  {selectedTrashRecord.tipo === "EQUIPO" ? (
                    <>
                      <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-medium text-stone-700 flex equipos-center gap-1.5">
                          <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                          Ficha base del Equipo:
                        </span>
                        <span className="font-extrabold text-stone-950">
                          1 registro (Activo: {trashDetails.equipo?.activo ? "Sí" : "No"})
                        </span>
                      </div>

                      {(trashDetails.cajaEquipos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Ubicaciones en Cajas del Depósito:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.cajaEquipos?.length ?? 0} registros
                          </span>
                        </div>
                      )}

                      {(trashDetails.equipoCodigosSIE?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <SearchOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Códigos de Barra de Inventario (SIE):
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.equipoCodigosSIE?.length ?? 0} códigos
                          </span>
                        </div>
                      )}

                      {(trashDetails.cajaItemCodigosSIE?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Asociaciones de Códigos a Cajas:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.cajaItemCodigosSIE?.length ?? 0} registros
                          </span>
                        </div>
                      )}

                      {(trashDetails.movimientoEquipos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <InfoOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Historial de Movimientos de Equipos:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.movimientoEquipos?.length ?? 0} movimientos
                          </span>
                        </div>
                      )}

                      {(trashDetails.deletedMovimientos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Recibos de Entrega / Préstamos completos:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.deletedMovimientos?.length ?? 0} planillas
                          </span>
                        </div>
                      )}

                      {(trashDetails.deletedPrestamosActivos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100">
                          <span className="text-amber-900 font-bold flex equipos-center gap-1.5">
                            <WarningAmberOutlinedIcon className="h-4 w-4 text-amber-600" />
                            Préstamos Vigentes (Pendientes de Devolución):
                          </span>
                          <span className="font-black text-amber-800">
                            {trashDetails.deletedPrestamosActivos?.length ?? 0} activos
                          </span>
                        </div>
                      )}

                      {(trashDetails.deletedPrestamosHistoriales?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <CheckCircleOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Historial de Préstamos Finalizados:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.deletedPrestamosHistoriales?.length ?? 0} devueltos
                          </span>
                        </div>
                      )}

                      {(trashDetails.stockOperacionEquipos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <CheckCircleOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Operaciones de Ajuste de Stock Relacionadas:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.stockOperacionEquipos?.length ?? 0} registros
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                        <span className="font-medium text-stone-700 flex equipos-center gap-1.5">
                          <StorageOutlinedIcon className="h-4 w-4 text-stone-400" />
                          Ficha base del Artículo:
                        </span>
                        <span className="font-extrabold text-stone-950">
                          1 registro (Tipo: {trashDetails.articulo?.tipo})
                        </span>
                      </div>

                      {(trashDetails.stockMovimientos?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between border-b border-stone-100 pb-2">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <InfoOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Movimientos de Stock (Ingresos / Entregas):
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.stockMovimientos?.length ?? 0} transacciones
                          </span>
                        </div>
                      )}

                      {(trashDetails.emptyEntregas?.length ?? 0) > 0 && (
                        <div className="flex equipos-center justify-between">
                          <span className="text-stone-600 flex equipos-center gap-1.5">
                            <FolderZipOutlinedIcon className="h-4 w-4 text-stone-400" />
                            Planillas de Entregas a Personal Completas:
                          </span>
                          <span className="font-bold text-stone-900">
                            {trashDetails.emptyEntregas?.length ?? 0} planillas
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {trashModalAction === "delete" ? (
                  <div className="rounded-xl border border-red-250 bg-red-50 p-3 text-xs text-red-950 flex gap-2 equipos-start shadow-sm">
                    <WarningAmberOutlinedIcon className="h-5 w-5 text-red-750 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-red-900 block mb-0.5">
                        ⚠️ ADVERTENCIA CRÍTICA:
                      </strong>
                      Esta acción eliminará físicamente toda la información analizada y es
                      irreversible. Se borrarán permanentemente del sistema de datos del depósito y
                      no habrá forma de recuperarlos.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-250 bg-emerald-50 p-3 text-xs text-emerald-950 flex gap-2 equipos-start shadow-sm">
                    <CheckCircleOutlinedIcon className="h-5 w-5 text-emerald-750 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-emerald-900 block mb-0.5">
                        💡 NOTA DE RESTAURACIÓN:
                      </strong>
                      Al confirmar, se reinsertarán automáticamente todas las dependencias e
                      historiales listados arriba, volviendo a estar disponibles en tiempo real en
                      las vistas operativas principales y reportes del sistema.
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
                {trashModalAction === "delete"
                  ? "Sí, eliminar permanentemente"
                  : "Sí, restaurar registro completo"}
              </button>
            </div>
          </ModalFrame>
        )}
      </section>
    );
  }

  return null;
}
