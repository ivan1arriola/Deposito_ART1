"use client";

import Image from "next/image";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatUruguayanCi, generatePlaceholderUruguayanCi, isValidUruguayanCi, normalizeCi } from "@/lib/ci";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import {
  TALLA_KEYS,
  TALLA_OPTIONS,
  type TallaKey,
  isAllowedTallaValue,
  normalizeTallaValue,
} from "@/lib/tallas";
import { DashboardHero } from "./components/home/DashboardHero";
import { MainNavigation } from "./components/home/MainNavigation";
import { SoldadoRecordatorioWidget } from "./components/home/SoldadoRecordatorioWidget";
import { AppInstallCard } from "./components/pwa/AppInstallCard";
import { HomeDialogsLayer } from "./components/modals/HomeDialogsLayer";
import { MergeEquipoModal } from "./components/modals/MergeEquipoModal";
import { PersonalSection } from "./components/personal/PersonalSection";
import { ConfigViews } from "./components/views/ConfigViews";
import { BateriaCreateView } from "./components/views/BateriaCreateView";
import { EquipoResumenView } from "./components/views/EquipoResumenView";
import { EquipoCreateView } from "./components/views/EquipoCreateView";
import { HojaDeEntregaView } from "./components/views/HojaDeEntregaView";
import { HojaMatrixView } from "./components/views/HojaMatrixView";
import { FormulariosPrestamosView } from "./components/views/FormulariosPrestamosView";
import { EtiquetadoView } from "./components/views/EtiquetadoView";
import { PersonalCreateView } from "./components/views/PersonalCreateView";
import { OficialSuboficialCreateView } from "./components/views/OficialSuboficialCreateView";
import { RangoCreateView } from "./components/views/RangoCreateView";
import { StockView } from "./components/views/StockView";
import { TallasResumenView } from "./components/views/TallasResumenView";
import { OficialesSuboficialesView } from "./components/views/OficialesSuboficialesView";
import { OficialesSuboficialesResumenView } from "./components/views/OficialesSuboficialesResumenView";
import { RecordatoriosConfigView } from "./components/views/RecordatoriosConfigView";
import { UserCreateView } from "./components/views/UserCreateView";
import { SmallActionButton, ActionMenu, LoadingOverlay, toast } from "./components/shared";
import { useHomeData } from "./hooks/useHomeData";

// Importar tipos desde archivos de tipos organizados
import type {
  Role,
  Equipo,
  Personal,
  OficialSuboficial,
  PersonalObservacion,
  RecordatorioConfig,
  RecordatorioTarea,
  FirmaConfig,
  UsuarioAdmin,
} from "@/types/entities";
import type {
  PersonalForm,
  OficialSuboficialForm,
  PersonalAltaMovimientoForm,
  EquipoForm,
  PrestamoDraft,
  PrestamoDraftItem,
  RegistroDraftEquipo,
  RegistroDraft,
  StockOperacionDraft,
} from "@/types/forms";
import type {
  MainView,
  RegistroTipo,
  RegistroView,
  RegistroViewerState,
  ConfirmDialogState,
  AuditFilter,
} from "@/types/views";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";
import { ROLE_OPTIONS } from "@/types/entities";
import {
  EMPTY_PERSONAL_FORM,
  EMPTY_OFICIAL_SUBOFICIAL_FORM,
  EMPTY_EQUIPO_FORM,
  EMPTY_PERSONAL_ALTA_MOVIMIENTO_FORM,
  EMPTY_STOCK_OPERACION_DRAFT,
  EMPTY_PRESTAMO_DRAFT,
} from "@/types/forms";
import type { PersonalObservacionDraft, UserPasswordDialogState, UserProfileDialogState, UserRoleDialogState } from "./types/home";

// Importar utilidades desde archivos organizados
import { api } from "@/lib/api";
import { apellidosLabel, nombresLabel, roleDescription, roleLabel, roleScope, rangoLabel } from "@/lib/formatters";
import {
  getTodayDateInput,
  oficialSuboficialPayload,
  personalPayload,
  toEditableOficialSuboficial,
  toEditablePersonal,
} from "@/lib/form-mappers";
import {
  formatDateOnlyForDisplay,
  parseDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { normalizeSearchTerm } from "@/lib/search";
import { moveIdInOrder, compareTallaOptions } from "@/lib/array-utils";
import { isValidUruguayanMobileNumber } from "@/lib/uruguayan-phone";

// Importar handlers de operaciones
import {
  createRangoHandler,
  updateRangoHandler,
  deleteRangoHandler,
  createBateriaHandler,
  updateBateriaHandler,
  deleteBateriaHandler,
  createItemHandler,
  updateItemHandler,
  deleteItemHandler,
  mergeItemHandler,
  loadItemDeleteImpactHandler,
  updateMultipleItemOrdersHandler,
} from "@/lib/handlers-catalog";
import {
  createPersonalHandler,
  createOficialSuboficialHandler,
  updateOficialSuboficialHandler,
  updatePersonalHandler,
  deletePersonalHandler,
  promoteSargentoToSuboficialHandler,
  createPersonalObservacionHandler,
  loadPersonalObservacionesHandler,
  updatePersonalObservacionHandler,
  deletePersonalObservacionHandler,
} from "@/lib/handlers-personal";
import {
  createUsuarioHandler,
  updateUsuarioProfileHandler,
  changeUserRoleHandler,
  changeUserPasswordHandler,
  confirmUserEmailHandler,
  toggleUserActiveHandler,
  deleteUsuarioHandler,
  saveFirmaConfigHandler,
} from "@/lib/handlers-usuarios";
import {
  loginHandler,
  logoutHandler,
  requestPasswordResetHandler,
  changePasswordHandler,
} from "@/lib/handlers-auth";

// Importar utilidades de helpers
import { auditActionLabel, auditEntityLabel, renderAuditDetalle } from "@/lib/audit-helpers";

type StockLoadProfile = {
  key: "summary" | "historial" | "prestamos";
  options: {
    includeHistorial?: boolean;
    includePrestamos?: boolean;
    limit?: number;
  };
};

type EtiquetadoSection = "codigos_sie" | "registrar_caja" | "listado_cajas" | "imprimir_todas";

const STATUS_VERIFYING_SESSION = "Verificando sesión...";
const STATUS_STARTING_SESSION = "Iniciando sesión...";
const STATUS_ENTER_CREDENTIALS = "Ingresa tus credenciales.";
const STATUS_SESSION_CLOSED = "Sesion cerrada. Ingresa tus credenciales.";

function rangoLooksLikeSargento(rango: { abreviacion: string; nombreCompleto: string } | null | undefined) {
  if (!rango) return false;
  const normalized = normalizeSearchTerm(`${rango.abreviacion} ${rango.nombreCompleto}`);
  const hasSargento = normalized.includes("sargento") || normalized.includes("sgto");
  const hasPrimero = /\b(primero|1ro|1ero|1er)\b/.test(normalized);
  return hasSargento && !hasPrimero;
}

export default function Home() {
  const ciPlaceholder = `Ej: ${generatePlaceholderUruguayanCi()}`;
  const [status, setStatus] = useState(STATUS_VERIFYING_SESSION);
  const {
    loading,
    initMessage,
    showInitCredentials,
    setShowInitCredentials,
    initCredentials,
    currentUser,
    setCurrentUser,
    rangos,
    rangosOficiales,
    rangosSuboficiales,
    baterias,
    equipos,
    personal,
    oficialesSuboficiales,
    usuarios,
    auditoria,
    firmaConfig,
    setFirmaConfig,
    firmaConfigDraft,
    setFirmaConfigDraft,
    firmaConfigLoading,
    firmaConfigSaving,
    setFirmaConfigSaving,
    firmaConfigError,
    setFirmaConfigError,
    movimientosTotal,
    hojaMatrixData,
    hojaMatrixLoading,
    hojaMatrixError,
    loadData,
    loadHojaMatrix,
    equipoResumenData,
    equipoResumenLoading,
    equipoResumenError,
    loadEquipoResumen,
    stockData,
    stockLoading,
    stockError,
    setStockData,
    setStockError,
    loadStockData,
    clearLoadedData: clearLoadedDataState,
  } = useHomeData({ onStatusChange: setStatus });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [resetRequestLoading, setResetRequestLoading] = useState(false);
  const [resetRequestMessage, setResetRequestMessage] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changeCurrentPassword, setChangeCurrentPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeConfirmPassword, setChangeConfirmPassword] = useState("");
  const [changeLoading, setChangeLoading] = useState(false);
  const [userRoleDialog, setUserRoleDialog] = useState<UserRoleDialogState | null>(null);
  const [userRoleSaving, setUserRoleSaving] = useState(false);
  const [userPasswordDialog, setUserPasswordDialog] = useState<UserPasswordDialogState | null>(null);
  const [userPasswordSaving, setUserPasswordSaving] = useState(false);
  const [usernameDialog, setUsernameDialog] = useState<UserProfileDialogState | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);


  const [newUserRangoId, setNewUserRangoId] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newMailReferencia, setNewMailReferencia] = useState("");
  const [newRole, setNewRole] = useState<Role>("EDITOR");

  const [newRangoAbreviacion, setNewRangoAbreviacion] = useState("");
  const [newRangoNombreCompleto, setNewRangoNombreCompleto] = useState("");
  const [newRangoOrden, setNewRangoOrden] = useState("");
  const [editRangoId, setEditRangoId] = useState<number | null>(null);
  const [editRangoAbreviacion, setEditRangoAbreviacion] = useState("");
  const [editRangoNombreCompleto, setEditRangoNombreCompleto] = useState("");
  const [editRangoOrden, setEditRangoOrden] = useState("");

  const [newBateria, setNewBateria] = useState("");
  const [newBateriaOrden, setNewBateriaOrden] = useState("");
  const [editBateriaId, setEditBateriaId] = useState<number | null>(null);
  const [editBateriaNombre, setEditBateriaNombre] = useState("");
  const [editBateriaOrden, setEditBateriaOrden] = useState("");

  const [newEquipo, setNewEquipo] = useState<EquipoForm>(EMPTY_EQUIPO_FORM);
  const [editEquipoId, setEditEquipoId] = useState<string | null>(null);
  const [editEquipo, setEditEquipo] = useState<EquipoForm>(EMPTY_EQUIPO_FORM);
  const [equipoOrderDraftIds, setEquipoOrderDraftIds] = useState<string[] | null>(null);
  const [mergeEquipoOrigenId, setMergeEquipoOrigenId] = useState("");
  const [mergeEquipoDestinoId, setMergeEquipoDestinoId] = useState("");
  const [mergeEquipoDialog, setMergeEquipoDialog] = useState<{ sourceItemId: string; targetItemId: string } | null>(null);
  const [mergeEquipoSaving, setMergeEquipoSaving] = useState(false);

  const [newPersonal, setNewPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [newOficialSuboficial, setNewOficialSuboficial] = useState<OficialSuboficialForm>(EMPTY_OFICIAL_SUBOFICIAL_FORM);
  const [editingOficialSuboficialCi, setEditingOficialSuboficialCi] = useState<string | null>(null);
  const [newPersonalMovimientos, setNewPersonalMovimientos] = useState<PersonalAltaMovimientoForm[]>([]);
  const [newPersonalMovimientoDraft, setNewPersonalMovimientoDraft] = useState<PersonalAltaMovimientoForm | null>(null);
  const [newPersonalMovimientoEditIndex, setNewPersonalMovimientoEditIndex] = useState<number | null>(null);
  const [editPersonalCi, setEditPersonalCi] = useState<string | null>(null);
  const [editPersonal, setEditPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [promotingSubalternoCi, setPromotingSubalternoCi] = useState<string | null>(null);
  const [searchCedula, setSearchCedula] = useState("");
  const [searchNombres, setSearchNombres] = useState("");
  const [searchApellidos, setSearchApellidos] = useState("");
  const [bateriaFilter, setBateriaFilter] = useState<string>("ALL");
  const [expandedTallasByCi, setExpandedTallasByCi] = useState<Record<string, boolean>>({});
  const [registroDraft, setRegistroDraft] = useState<RegistroDraft | null>(null);
  const [registroSaving, setRegistroSaving] = useState(false);
  const [stockDraft, setStockDraft] = useState<StockOperacionDraft>({ ...EMPTY_STOCK_OPERACION_DRAFT, fecha: getTodayDateInput() });
  const [stockSaving, setStockSaving] = useState(false);
  const [prestamoDraft, setPrestamoDraft] = useState<PrestamoDraft>({ ...EMPTY_PRESTAMO_DRAFT, fechaPrestamo: getTodayDateInput() });
  const [prestamoSaving, setPrestamoSaving] = useState(false);
  const [returningPrestamoId, setReturningPrestamoId] = useState<string | null>(null);
  const [personalObservacionDraft, setPersonalObservacionDraft] = useState<PersonalObservacionDraft | null>(null);
  const [personalObservacionSaving, setPersonalObservacionSaving] = useState(false);
  const [registroViewer, setRegistroViewer] = useState<RegistroViewerState | null>(null);
  const [registroViewerPage, setRegistroViewerPage] = useState(1);
  const [registroViewerPageSize, setRegistroViewerPageSize] = useState(20);
  const [activeView, setActiveView] = useState<MainView>("personal");
  const [fichaViewingCi, setFichaViewingCi] = useState<string | null>(null);
  const [showConfigViews, setShowConfigViews] = useState(false);
  const [etiquetadoData, setEtiquetadoData] = useState<EtiquetadoDashboardData | null>(null);
  const [etiquetadoLoading, setEtiquetadoLoading] = useState(false);
  const [etiquetadoError, setEtiquetadoError] = useState<string | null>(null);
  const [recordatorioTasks, setRecordatorioTasks] = useState<RecordatorioTarea[]>([]);
  const [recordatorioConfig, setRecordatorioConfig] = useState<RecordatorioConfig>({ mostrarMuneco: true });
  const [recordatoriosLoading, setRecordatoriosLoading] = useState(false);
  const [recordatoriosSaving, setRecordatoriosSaving] = useState(false);
  const [recordatoriosError, setRecordatoriosError] = useState<string | null>(null);
  const recordatorioToastShownRef = useRef<string | null>(null);
  const configMenuRef = useRef<HTMLDivElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmDialogBusy, setConfirmDialogBusy] = useState(false);
  const [creatingPersonal, setCreatingPersonal] = useState(false);
  const [creatingOficialSuboficial, setCreatingOficialSuboficial] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("TODOS");
  const [personalPage, setPersonalPage] = useState(1);
  const [personalPageSize, setPersonalPageSize] = useState(25);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const lastToastStatusRef = useRef<string | null>(null);

  const isAdmin = currentUser?.rol === "ADMIN";
  const canWrite = currentUser?.rol === "ADMIN" || currentUser?.rol === "EDITOR";
  const canManageOwnAccount = canWrite;
  const canDelete = canWrite;
  const canDeleteRegistros = isAdmin;
  const canRegisterPersonal = canWrite && rangos.length > 0;
  const rangosOficialSuboficialDisponibles = useMemo(
    () => (newOficialSuboficial.tipo === "OFICIAL" ? rangosOficiales : rangosSuboficiales),
    [newOficialSuboficial.tipo, rangosOficiales, rangosSuboficiales],
  );
  const canRegisterOficialSuboficial = canWrite && rangosOficialSuboficialDisponibles.length > 0;
  const inCatalogView = activeView === "grados" || activeView === "baterias" || activeView === "equipos";
  const inReminderConfigView = activeView === "recordatorios";
  const inAdminConfigView = activeView === "firmas" || activeView === "usuarios" || activeView === "auditoria";
  const inEtiquetadoView =
    activeView === "etiquetado_codigos_sie" ||
    activeView === "etiquetado_registrar_caja" ||
    activeView === "etiquetado_listado_cajas" ||
    activeView === "etiquetado_imprimir_todas";
  const normalizedNewCi = normalizeCi(newPersonal.ci.trim());
  const duplicatePersonal = useMemo(() => {
    if (normalizedNewCi === "") return null;
    return personal.find((persona) => normalizeCi(persona.ci) === normalizedNewCi) ?? null;
  }, [normalizedNewCi, personal]);
  const ciAlreadyExists = duplicatePersonal !== null;
  const ciLooksValid = newPersonal.ci.trim() === "" || isValidUruguayanCi(newPersonal.ci);
  const newPersonalPhoneLooksValid =
    newPersonal.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(newPersonal.telefonoContacto);
  const newPersonalFechaIngresoLooksValid =
    newPersonal.fechaIngreso.trim() === "" ||
    (parseDateInput(newPersonal.fechaIngreso).valid && !isDateInputAfterToday(newPersonal.fechaIngreso));
  const newPersonalFechaIngresoOriginalLooksValid =
    newPersonal.fechaIngresoOriginal.trim() === "" ||
    (parseDateInput(newPersonal.fechaIngresoOriginal).valid && !isDateInputAfterToday(newPersonal.fechaIngresoOriginal));
  const newPersonalReentryDatesLookValid =
    !newPersonal.esReingreso ||
    (newPersonal.fechaIngreso.trim() !== "" &&
      parseDateInput(newPersonal.fechaIngreso).valid &&
      newPersonalFechaIngresoOriginalLooksValid &&
      (newPersonal.fechaIngresoOriginal.trim() === "" || !isDateInputAfter(newPersonal.fechaIngresoOriginal, newPersonal.fechaIngreso)));
  const ciHasError = !ciLooksValid || ciAlreadyExists;
  const requiredPersonalFields = [
    newPersonal.ci.trim() !== "" && isValidUruguayanCi(newPersonal.ci) && !ciAlreadyExists,
    newPersonal.apellido1.trim() !== "",
    newPersonal.nombre1.trim() !== "",
    Number(newPersonal.rangoId) > 0,
  ];
  const requiredPersonalCompleted = requiredPersonalFields.filter(Boolean).length;
  const canSubmitPersonal =
    canRegisterPersonal &&
    requiredPersonalCompleted === requiredPersonalFields.length &&
    newPersonalPhoneLooksValid &&
    newPersonalFechaIngresoLooksValid &&
    newPersonalFechaIngresoOriginalLooksValid &&
    newPersonalReentryDatesLookValid &&
    !creatingPersonal;

  const normalizedNewOficialSuboficialCi = normalizeCi(newOficialSuboficial.ci.trim());
  const normalizedEditingOficialSuboficialCi = normalizeCi(editingOficialSuboficialCi ?? "");
  const duplicateOficialSuboficialLabel = useMemo(() => {
    if (normalizedNewOficialSuboficialCi === "") return null;
    if (normalizedEditingOficialSuboficialCi !== "" && normalizedNewOficialSuboficialCi === normalizedEditingOficialSuboficialCi) return null;

    const duplicateSubalterno = personal.find((persona) => normalizeCi(persona.ci) === normalizedNewOficialSuboficialCi);
    if (duplicateSubalterno) {
      return `${apellidosLabel(duplicateSubalterno)}, ${nombresLabel(duplicateSubalterno)}`;
    }

    const duplicateOficialSuboficial = oficialesSuboficiales.find(
      (registro) => normalizeCi(registro.ci) === normalizedNewOficialSuboficialCi,
    );
    if (duplicateOficialSuboficial) {
      return `${duplicateOficialSuboficial.apellido}, ${duplicateOficialSuboficial.nombre}`;
    }

    return null;
  }, [normalizedNewOficialSuboficialCi, normalizedEditingOficialSuboficialCi, personal, oficialesSuboficiales]);
  const oficialSuboficialCiAlreadyExists = duplicateOficialSuboficialLabel !== null;
  const oficialSuboficialCiLooksValid =
    newOficialSuboficial.ci.trim() === "" || isValidUruguayanCi(newOficialSuboficial.ci);
  const newOficialSuboficialPhoneLooksValid =
    newOficialSuboficial.telefonoContacto.trim() === "" ||
    isValidUruguayanMobileNumber(newOficialSuboficial.telefonoContacto);
  const oficialSuboficialRequiredFields = [
    newOficialSuboficial.ci.trim() !== "" &&
      isValidUruguayanCi(newOficialSuboficial.ci) &&
      !oficialSuboficialCiAlreadyExists,
    newOficialSuboficial.apellido1.trim() !== "",
    newOficialSuboficial.nombre1.trim() !== "",
    Number(newOficialSuboficial.rangoId) > 0,
  ];
  const oficialSuboficialRequiredCompleted = oficialSuboficialRequiredFields.filter(Boolean).length;
  const canSubmitOficialSuboficial =
    canRegisterOficialSuboficial &&
    oficialSuboficialRequiredCompleted === oficialSuboficialRequiredFields.length &&
    newOficialSuboficialPhoneLooksValid &&
    !creatingOficialSuboficial;

  const rangosConfigView = useMemo(
    () =>
      [
        ...rangosOficiales.map((rango) => ({ ...rango, tipo: "OFICIAL" as const })),
        ...rangosSuboficiales.map((rango) => ({ ...rango, tipo: "SUBOFICIAL" as const })),
        ...rangos.map((rango) => ({ ...rango, tipo: "SUBALTERNO" as const })),
      ].sort((a, b) => {
        const tipoOrder = { OFICIAL: 0, SUBOFICIAL: 1, SUBALTERNO: 2 } as const;
        if (tipoOrder[a.tipo] !== tipoOrder[b.tipo]) return tipoOrder[a.tipo] - tipoOrder[b.tipo];
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.rangoId - b.rangoId;
      }),
    [rangos, rangosOficiales, rangosSuboficiales],
  );

  const maxFechaIngreso = getTodayDateInput();
  const equiposOrdenados = useMemo(
    () => [...equipos].sort((a, b) => a.ordenPdf - b.ordenPdf || a.nombre.localeCompare(b.nombre, "es")),
    [equipos],
  );
  const equiposActivos = useMemo(() => equiposOrdenados.filter((item) => item.activo), [equiposOrdenados]);
  const equiposInactivos = useMemo(() => equiposOrdenados.filter((item) => !item.activo), [equiposOrdenados]);
  const tallaOptionsByKey = useMemo(() => {
    const dynamic = {} as Record<TallaKey, string[]>;

    for (const key of TALLA_KEYS) {
      const values = new Set<string>(TALLA_OPTIONS[key]);

      for (const persona of personal) {
        for (const talla of persona.tallas) {
          if (talla.tallaTipo.nombre !== key) continue;
          const normalized = normalizeTallaValue(key, talla.tallaValor);
          if (normalized && isAllowedTallaValue(key, normalized)) values.add(normalized);
        }
      }

      for (const registro of oficialesSuboficiales) {
        for (const talla of registro.tallas) {
          if (talla.tallaTipo.nombre !== key) continue;
          const normalized = normalizeTallaValue(key, talla.tallaValor);
          if (normalized && isAllowedTallaValue(key, normalized)) values.add(normalized);
        }
      }

      const newValue = normalizeTallaValue(key, newPersonal[key]);
      const newOficialSuboficialValue = normalizeTallaValue(key, newOficialSuboficial[key]);
      const editValue = normalizeTallaValue(key, editPersonal[key]);
      if (newValue && isAllowedTallaValue(key, newValue)) values.add(newValue);
      if (newOficialSuboficialValue && isAllowedTallaValue(key, newOficialSuboficialValue)) values.add(newOficialSuboficialValue);
      if (editValue && isAllowedTallaValue(key, editValue)) values.add(editValue);

      dynamic[key] = Array.from(values).sort((a, b) => compareTallaOptions(key, a, b));
    }

    return dynamic;
  }, [personal, oficialesSuboficiales, newPersonal, newOficialSuboficial, editPersonal]);
  const auditoriaFiltrada = useMemo(() => {
    if (auditFilter === "MOVIMIENTOS") {
      return auditoria.filter((log) => log.entidad === "REGISTRO");
    }
    if (auditFilter === "AUTENTICACION") {
      return auditoria.filter((log) => log.entidad === "AUTH");
    }
    return auditoria;
  }, [auditFilter, auditoria]);
  const auditTotalPages = Math.max(1, Math.ceil(auditoriaFiltrada.length / auditPageSize));
  const auditPageSafe = Math.min(auditPage, auditTotalPages);
  const auditoriaFiltradaPaginada = useMemo(() => {
    const start = (auditPageSafe - 1) * auditPageSize;
    return auditoriaFiltrada.slice(start, start + auditPageSize);
  }, [auditoriaFiltrada, auditPageSafe, auditPageSize]);
  const equiposActivosEnPantalla = useMemo(() => {
    if (!equipoOrderDraftIds) return equiposActivos;
    const activeById = new Map(equiposActivos.map((item) => [item.itemId, item]));
    return equipoOrderDraftIds
      .map((itemId) => activeById.get(itemId))
      .filter((item): item is Equipo => item !== undefined);
  }, [equiposActivos, equipoOrderDraftIds]);
  const hasEquipoOrderDraftChanges = useMemo(() => {
    if (!equipoOrderDraftIds) return false;
    const currentActiveIds = equiposActivos.map((item) => item.itemId);
    if (equipoOrderDraftIds.length !== currentActiveIds.length) return true;
    return equipoOrderDraftIds.some((itemId, index) => itemId !== currentActiveIds[index]);
  }, [equiposActivos, equipoOrderDraftIds]);
  const mergeEquipoSource = useMemo(() => {
    if (!mergeEquipoDialog) return null;
    return equiposOrdenados.find((equipo) => equipo.itemId === mergeEquipoDialog.sourceItemId) ?? null;
  }, [equiposOrdenados, mergeEquipoDialog]);
  const mergeEquipoTargetOptions = useMemo(() => {
    if (!mergeEquipoDialog) return [] as Equipo[];
    return equiposOrdenados.filter((equipo) => equipo.itemId !== mergeEquipoDialog.sourceItemId);
  }, [equiposOrdenados, mergeEquipoDialog]);
  const mergeEquipoDialogTargetId = useMemo(() => {
    if (!mergeEquipoDialog) return "";
    if (mergeEquipoTargetOptions.some((equipo) => equipo.itemId === mergeEquipoDialog.targetItemId)) {
      return mergeEquipoDialog.targetItemId;
    }
    return mergeEquipoTargetOptions[0]?.itemId ?? "";
  }, [mergeEquipoDialog, mergeEquipoTargetOptions]);
  useEffect(() => {
    const ids = new Set(equipos.map((equipo) => equipo.itemId));

    setMergeEquipoOrigenId((current) => (current !== "" && ids.has(current) ? current : ""));
    setMergeEquipoDestinoId((current) => (current !== "" && ids.has(current) ? current : ""));
  }, [equipos]);
  const personalOrdenado = useMemo(() => [...personal].sort(comparePersonalByHierarchy), [personal]);
  const searchCedulaDigits = normalizeCi(searchCedula.trim());
  const searchNombresText = normalizeSearchTerm(searchNombres);
  const searchApellidosText = normalizeSearchTerm(searchApellidos);
  const hasPersonalFilters =
    searchCedula.trim() !== "" || searchNombres.trim() !== "" || searchApellidos.trim() !== "" || bateriaFilter !== "ALL";
  const personalFiltrado = useMemo(() => {
    return personalOrdenado.filter((persona) => {
      const matchBateria =
        bateriaFilter === "ALL"
          ? true
          : bateriaFilter === "NONE"
            ? persona.bateriaId == null
            : persona.bateriaId === Number(bateriaFilter);

      if (!matchBateria) return false;

      if (searchCedulaDigits !== "" && !normalizeCi(persona.ci).includes(searchCedulaDigits)) {
        return false;
      }

      if (searchNombresText !== "") {
        const nombresPersona = normalizeSearchTerm(`${persona.nombre1} ${persona.nombre2 ?? ""}`);
        if (!nombresPersona.includes(searchNombresText)) return false;
      }

      if (searchApellidosText !== "") {
        const apellidosPersona = normalizeSearchTerm(`${persona.apellido1} ${persona.apellido2 ?? ""}`);
        if (!apellidosPersona.includes(searchApellidosText)) return false;
      }

      return true;
    });
  }, [personalOrdenado, bateriaFilter, searchCedulaDigits, searchNombresText, searchApellidosText]);
  const personalTotalPages = Math.max(1, Math.ceil(personalFiltrado.length / personalPageSize));
  const personalPageSafe = Math.min(personalPage, personalTotalPages);
  const personalFiltradoPaginado = useMemo(() => {
    const start = (personalPageSafe - 1) * personalPageSize;
    return personalFiltrado.slice(start, start + personalPageSize);
  }, [personalFiltrado, personalPageSafe, personalPageSize]);
  const isConfigView = inCatalogView || inReminderConfigView || inAdminConfigView;
  const personaRegistro = useMemo(() => {
    if (!registroDraft) return null;
    return personal.find((persona) => persona.ci === registroDraft.ci) ?? null;
  }, [personal, registroDraft]);
  const personaEnEdicion = useMemo(() => {
    if (!editPersonalCi) return null;
    return personal.find((persona) => persona.ci === editPersonalCi) ?? null;
  }, [editPersonalCi, personal]);
  const rangoEnEdicion = useMemo(() => {
    if (!personaEnEdicion) return null;
    const parsedRangoId = Number(editPersonal.rangoId);
    if (Number.isInteger(parsedRangoId) && parsedRangoId > 0) {
      return rangos.find((rango) => rango.rangoId === parsedRangoId) ?? personaEnEdicion.rango;
    }
    return personaEnEdicion.rango;
  }, [editPersonal.rangoId, personaEnEdicion, rangos]);
  const canPromoteEditPersonalToSuboficial = useMemo(() => {
    if (!isAdmin) return false;
    if (!editPersonalCi) return false;
    return rangoLooksLikeSargento(rangoEnEdicion);
  }, [editPersonalCi, isAdmin, rangoEnEdicion]);
  const registroViewerRows = useMemo(() => registroViewer?.registros ?? [], [registroViewer]);
  const registroViewerTotalPages = Math.max(1, Math.ceil(registroViewerRows.length / registroViewerPageSize));
  const registroViewerPageSafe = Math.min(registroViewerPage, registroViewerTotalPages);
  const registroViewerRowsPaginados = useMemo(() => {
    const start = (registroViewerPageSafe - 1) * registroViewerPageSize;
    return registroViewerRows.slice(start, start + registroViewerPageSize);
  }, [registroViewerRows, registroViewerPageSafe, registroViewerPageSize]);

  useEffect(() => {
    if (inAdminConfigView && !isAdmin) {
      setActiveView("personal");
    }
  }, [inAdminConfigView, isAdmin]);

  const loadRecordatorios = useCallback(async () => {
    if (!currentUser) {
      setRecordatorioTasks([]);
      setRecordatorioConfig({ mostrarMuneco: true });
      setRecordatoriosError(null);
      return;
    }

    setRecordatoriosLoading(true);
    setRecordatoriosError(null);
    try {
      const [tasksData, configData] = await Promise.all([
        api<RecordatorioTarea[]>("/api/tareas"),
        api<RecordatorioConfig>("/api/tareas/config"),
      ]);
      setRecordatorioTasks(tasksData);
      setRecordatorioConfig(configData);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los recordatorios.";
      setRecordatoriosError(message);
    } finally {
      setRecordatoriosLoading(false);
    }
  }, [currentUser]);

  const createRecordatorioTask = useCallback(
    async (input: { titulo: string; nota: string; fechaLimite: string | null; prioridad: "NORMAL" | "URGENTE"; usuarioId?: string }) => {
      setRecordatoriosSaving(true);
      setRecordatoriosError(null);
      try {
        await api<RecordatorioTarea>("/api/tareas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        await loadRecordatorios();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo crear la tarea.";
        setRecordatoriosError(message);
        toast.error(message);
      } finally {
        setRecordatoriosSaving(false);
      }
    },
    [loadRecordatorios],
  );

  const updateRecordatorioTask = useCallback(
    async (
      tareaId: string,
      input: Partial<{ titulo: string; nota: string; fechaLimite: string | null; prioridad: "NORMAL" | "URGENTE" }> & { completada?: boolean },
    ) => {
      setRecordatoriosSaving(true);
      setRecordatoriosError(null);
      try {
        await api<RecordatorioTarea>(`/api/tareas/${encodeURIComponent(tareaId)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        await loadRecordatorios();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo actualizar la tarea.";
        setRecordatoriosError(message);
        toast.error(message);
      } finally {
        setRecordatoriosSaving(false);
      }
    },
    [loadRecordatorios],
  );

  const deleteRecordatorioTask = useCallback(
    async (tareaId: string) => {
      setRecordatoriosSaving(true);
      setRecordatoriosError(null);
      try {
        await api<{ ok: boolean }>(`/api/tareas/${encodeURIComponent(tareaId)}`, {
          method: "DELETE",
        });
        await loadRecordatorios();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo eliminar la tarea.";
        setRecordatoriosError(message);
        toast.error(message);
      } finally {
        setRecordatoriosSaving(false);
      }
    },
    [loadRecordatorios],
  );

  const updateRecordatorioConfig = useCallback(async (mostrarMuneco: boolean) => {
    setRecordatoriosSaving(true);
    setRecordatoriosError(null);
    try {
      const result = await api<RecordatorioConfig>("/api/tareas/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mostrarMuneco }),
      });
      setRecordatorioConfig(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la configuracion del recordatorio.";
      setRecordatoriosError(message);
      toast.error(message);
    } finally {
      setRecordatoriosSaving(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setRecordatorioTasks([]);
      setRecordatorioConfig({ mostrarMuneco: true });
      setRecordatoriosError(null);
      recordatorioToastShownRef.current = null;
      return;
    }
    void loadRecordatorios();
  }, [currentUser, loadRecordatorios]);

  const pendingRecordatorios = useMemo(
    () => recordatorioTasks.filter((task) => !task.completada),
    [recordatorioTasks],
  );
  const urgentPendingRecordatorios = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return pendingRecordatorios.filter((task) => task.prioridad === "URGENTE" || (task.fechaLimite && task.fechaLimite <= todayKey)).length;
  }, [pendingRecordatorios]);

  useEffect(() => {
    if (!currentUser || recordatoriosLoading) return;
    if (recordatorioToastShownRef.current === currentUser.usuarioId) return;
    recordatorioToastShownRef.current = currentUser.usuarioId;

    if (pendingRecordatorios.length <= 0) return;
    if (urgentPendingRecordatorios > 0) {
      toast.error(`Tenes ${urgentPendingRecordatorios} tarea(s) urgente(s) en tu recordatorio.`);
      return;
    }
    toast.info(`Tenes ${pendingRecordatorios.length} tarea(s) pendiente(s) en tu recordatorio.`);
  }, [currentUser, pendingRecordatorios.length, recordatoriosLoading, urgentPendingRecordatorios]);

  useEffect(() => {
    if ((activeView === "personal_nuevo" || activeView === "oficial_nuevo" || activeView === "suboficial_nuevo") && !canWrite) {
      setActiveView("personal");
    }
  }, [activeView, canWrite]);

  useEffect(() => {
    if (editingOficialSuboficialCi) return;
    if (activeView === "oficial_nuevo" && newOficialSuboficial.tipo !== "OFICIAL") {
      setNewOficialSuboficial((prev) => ({ ...prev, tipo: "OFICIAL", rangoId: "" }));
      return;
    }
    if (activeView === "suboficial_nuevo" && newOficialSuboficial.tipo !== "SUBOFICIAL") {
      setNewOficialSuboficial((prev) => ({ ...prev, tipo: "SUBOFICIAL", rangoId: "" }));
    }
  }, [activeView, editingOficialSuboficialCi, newOficialSuboficial.tipo]);

  useEffect(() => {
    if (activeView === "equipo_nuevo" && !canWrite) {
      setActiveView("personal");
    }
  }, [activeView, canWrite]);

  useEffect(() => {
    if ((activeView === "bateria_nueva" || activeView === "grado_nuevo") && !isAdmin) {
      setActiveView("personal");
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    if (activeView === "usuario_nuevo" && !isAdmin) {
      setActiveView("personal");
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    setPersonalPage(1);
  }, [searchCedula, searchNombres, searchApellidos, bateriaFilter, personalPageSize]);

  useEffect(() => {
    if (personalPage <= personalTotalPages) return;
    setPersonalPage(personalTotalPages);
  }, [personalPage, personalTotalPages]);

  useEffect(() => {
    if (!registroViewer) return;
    setRegistroViewerPage(1);
  }, [registroViewer, registroViewerPageSize]);

  useEffect(() => {
    if (registroViewerPage <= registroViewerTotalPages) return;
    setRegistroViewerPage(registroViewerTotalPages);
  }, [registroViewerPage, registroViewerTotalPages]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditFilter, auditPageSize]);

  useEffect(() => {
    if (auditPage <= auditTotalPages) return;
    setAuditPage(auditTotalPages);
  }, [auditPage, auditTotalPages]);

  useEffect(() => {
    if (!currentUser) {
      lastToastStatusRef.current = null;
      return;
    }

    if (!status || status === lastToastStatusRef.current) return;
    lastToastStatusRef.current = status;

    const normalized = status.toLowerCase();
    const shouldIgnore =
      status === "Datos actualizados." ||
      status === STATUS_VERIFYING_SESSION ||
      status === STATUS_STARTING_SESSION ||
      status === STATUS_ENTER_CREDENTIALS ||
      status === STATUS_SESSION_CLOSED ||
      normalized.startsWith("actualizando ") ||
      normalized.startsWith("guardando ");

    if (shouldIgnore) return;

    const isError =
      normalized.includes("no se pudo") ||
      normalized.includes("error") ||
      normalized.includes("inval") ||
      normalized.includes("no tienes permisos") ||
      normalized.includes("solo el administrador") ||
      normalized.includes("no autorizado") ||
      normalized.includes("debes ") ||
      normalized.includes("repetida") ||
      normalized.includes("repetido") ||
      normalized.includes("obligatorio") ||
      normalized.includes("no existe") ||
      normalized.includes("falta");

    if (isError) {
      toast.error(status);
      return;
    }

    if (normalized.endsWith("...")) return;

    toast.success(status);
  }, [currentUser, status]);

  useEffect(() => {
    if (!equipoOrderDraftIds) return;
    const currentActiveIds = new Set(equiposActivos.map((item) => item.itemId));
    const draftIsValid =
      equipoOrderDraftIds.length === equiposActivos.length && equipoOrderDraftIds.every((itemId) => currentActiveIds.has(itemId));
    if (draftIsValid) return;
    setEquipoOrderDraftIds(null);
  }, [equipoOrderDraftIds, equiposActivos]);

  useEffect(() => {
    if (!showConfigViews) return;

    function handleOutsideClick(event: MouseEvent) {
      if (!configMenuRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (configMenuRef.current.contains(event.target)) return;
      setShowConfigViews(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowConfigViews(false);
    }

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showConfigViews]);

  useEffect(() => {
    if (!confirmDialog) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || confirmDialogBusy) return;
      event.preventDefault();
      setConfirmDialog(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmDialog, confirmDialogBusy]);

  const clearLoadedData = useCallback(() => {
    clearLoadedDataState();
    setEditPersonalCi(null);
    setEditPersonal(EMPTY_PERSONAL_FORM);
    setPromotingSubalternoCi(null);
    setExpandedTallasByCi({});
    setRegistroDraft(null);
    setRegistroSaving(false);
    setStockDraft({ ...EMPTY_STOCK_OPERACION_DRAFT, fecha: getTodayDateInput() });
    setStockSaving(false);
    setPersonalObservacionDraft(null);
    setPersonalObservacionSaving(false);
    setRegistroViewerPage(1);
    setRegistroViewerPageSize(20);
    setConfirmDialog(null);
    setConfirmDialogBusy(false);
    setPersonalPage(1);
    setPersonalPageSize(25);
    setAuditPage(1);
    setAuditPageSize(25);
    setEquipoOrderDraftIds(null);
    setEtiquetadoData(null);
    setEtiquetadoLoading(false);
    setEtiquetadoError(null);
  }, [clearLoadedDataState]);
  useEffect(() => {
    if (activeView !== "hoja_matrix") return;
    void loadHojaMatrix();
  }, [activeView, loadHojaMatrix]);

  useEffect(() => {
    if (activeView !== "equipo_resumen") return;
    if (equipoResumenLoading) return;
    if (equipoResumenData) return;
    void loadEquipoResumen();
  }, [activeView, equipoResumenData, equipoResumenLoading, loadEquipoResumen]);

  const getStockLoadProfile = useCallback((view: MainView): StockLoadProfile | null => {
    if (view === "stock_historial") {
      return {
        key: "historial",
        options: { includeHistorial: true, includePrestamos: false },
      };
    }
    if (view === "stock_prestamos" || view === "formularios") {
      return {
        key: "prestamos",
        options: { includeHistorial: false, includePrestamos: true },
      };
    }
    if (view === "stock" || view === "stock_total" || view === "stock_actual" || view === "stock_alta" || view === "stock_baja") {
      return {
        key: "summary",
        options: { includeHistorial: false, includePrestamos: false },
      };
    }
    return null;
  }, []);

  const activeStockLoadProfile = useMemo(() => getStockLoadProfile(activeView), [activeView, getStockLoadProfile]);

  const reloadActiveStockData = useCallback(async () => {
    if (!activeStockLoadProfile) return;
    await loadStockData(activeStockLoadProfile.options);
  }, [activeStockLoadProfile, loadStockData]);

  useEffect(() => {
    if (!activeStockLoadProfile) return;
    if (stockLoading) return;
    if (stockData) return;
    if (stockError) return;
    void loadStockData(activeStockLoadProfile.options);
  }, [activeStockLoadProfile, stockData, stockLoading, stockError, loadStockData]);

  useEffect(() => {
    if (activeView === "stock_alta" && stockDraft.tipo !== "INGRESO") {
      setStockDraft((prev) => ({ ...prev, tipo: "INGRESO" }));
      return;
    }
    if (activeView === "stock_baja" && stockDraft.tipo !== "EGRESO") {
      setStockDraft((prev) => ({ ...prev, tipo: "EGRESO" }));
    }
  }, [activeView, stockDraft.tipo]);

  const getEtiquetadoSection = useCallback((view: MainView): EtiquetadoSection | null => {
    if (view === "etiquetado_codigos_sie") return "codigos_sie";
    if (view === "etiquetado_registrar_caja") return "registrar_caja";
    if (view === "etiquetado_listado_cajas") return "listado_cajas";
    if (view === "etiquetado_imprimir_todas") return "imprimir_todas";
    return null;
  }, []);

  const activeEtiquetadoSection = useMemo(
    () => getEtiquetadoSection(activeView),
    [activeView, getEtiquetadoSection],
  );

  const loadEtiquetadoData = useCallback(async () => {
    setEtiquetadoLoading(true);
    setEtiquetadoError(null);
    try {
      const data = await api<EtiquetadoDashboardData>("/api/etiquetado/dashboard");
      setEtiquetadoData(data);
    } catch (error: unknown) {
      setEtiquetadoError(error instanceof Error ? error.message : "No se pudo cargar el modulo de etiquetado.");
    } finally {
      setEtiquetadoLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeEtiquetadoSection) return;
    if (etiquetadoLoading) return;
    if (etiquetadoData) return;
    if (etiquetadoError) return;
    void loadEtiquetadoData();
  }, [activeEtiquetadoSection, etiquetadoData, etiquetadoError, etiquetadoLoading, loadEtiquetadoData]);

  const reloadEtiquetadoData = useCallback(async () => {
    await loadEtiquetadoData();
  }, [loadEtiquetadoData]);

  const createEtiquetadoItem = useCallback(
    async (input: { nombre: string }) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }
      try {
        await createItemHandler(input.nombre, false, {
          onSuccess: async () => {
            setStatus("Equipo creado oculto de hoja de entrega.");
            await Promise.all([loadData(), loadEtiquetadoData()]);
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, loadData, loadEtiquetadoData],
  );

  const createEtiquetadoEstanteria = useCallback(
    async (codigo: string, piso: number) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setStatus("Registrando estanteria...");
      try {
        await api("/api/etiquetado/estanterias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codigo, piso }),
        });
        setStatus("Estanteria registrada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo registrar la estanteria.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const deleteEtiquetadoEstanteria = useCallback(
    async (codigo: string, piso: number) => {
      if (!canWrite) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }

      setStatus("Eliminando estanteria...");
      try {
        await api(`/api/etiquetado/estanterias/${encodeURIComponent(codigo)}/${encodeURIComponent(String(piso))}`, {
          method: "DELETE",
        });
        setStatus("Estanteria eliminada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo eliminar la estanteria.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const createEtiquetadoCodigoSIE = useCallback(
    async (input: { codigo: string; talla: string; itemId: string }) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setStatus("Registrando codigo SIE...");
      try {
        await api("/api/etiquetado/codigos-sie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        setStatus("Codigo SIE registrado.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo registrar el codigo SIE.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const deleteEtiquetadoCodigoSIE = useCallback(
    async (codigo: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }

      setStatus("Eliminando codigo SIE...");
      try {
        await api(`/api/etiquetado/codigos-sie/${encodeURIComponent(codigo)}`, {
          method: "DELETE",
        });
        setStatus("Codigo SIE eliminado.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo eliminar el codigo SIE.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const createEtiquetadoCaja = useCallback(
    async (input: {
      codigoDepositoGeneral: number;
      cantidad: number;
      estanteria: string;
      codigosSIE: string[];
    }) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setStatus("Registrando caja...");
      try {
        await api("/api/etiquetado/cajas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        setStatus("Caja registrada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo registrar la caja.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const deleteEtiquetadoCaja = useCallback(
    async (codigoDepositoGeneral: number) => {
      if (!canWrite) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }

      setStatus("Eliminando caja...");
      try {
        await api(`/api/etiquetado/cajas/${encodeURIComponent(String(codigoDepositoGeneral))}`, {
          method: "DELETE",
        });
        setStatus("Caja eliminada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo eliminar la caja.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const openEtiquetasPrint = useCallback(
    (options: { codigos?: number[]; orientacion: "horizontal" | "vertical" }) => {
      const params = new URLSearchParams();
      params.set("autoprint", "1");
      params.set("orientacion", options.orientacion);
      if (options.codigos && options.codigos.length > 0) {
        params.set("cajas", options.codigos.join(","));
      }
      const popup = window.open(`/etiquetas-cajas?${params.toString()}`, "_blank", "noopener,noreferrer");
      if (!popup) {
        setStatus("Permite ventanas emergentes para imprimir las etiquetas.");
      }
    },
    [],
  );

  const printEtiquetaCaja = useCallback(
    (codigoDepositoGeneral: number, orientacion: "horizontal" | "vertical") => {
      openEtiquetasPrint({ codigos: [codigoDepositoGeneral], orientacion });
    },
    [openEtiquetasPrint],
  );

  const printTodasEtiquetas = useCallback(
    (orientacion: "horizontal" | "vertical") => {
      openEtiquetasPrint({ orientacion });
    },
    [openEtiquetasPrint],
  );

  const createRango = useCallback(async () => {
    if (!isAdmin) {
      setStatus("Solo el administrador puede modificar grados.");
      return;
    }
    try {
      await createRangoHandler(
        newRangoAbreviacion,
        newRangoNombreCompleto,
        newRangoOrden.trim() === "" ? undefined : Number(newRangoOrden),
        {
          onSuccess: async () => {
            setNewRangoAbreviacion("");
            setNewRangoNombreCompleto("");
            setNewRangoOrden("");
            setStatus("Grado del personal creado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        },
      );
    } catch {
      // Error manejado en el handler
    }
  }, [isAdmin, newRangoAbreviacion, newRangoNombreCompleto, newRangoOrden, loadData]);

  const updateRango = useCallback(
    async (rangoId: number) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede modificar grados.");
        return;
      }
      try {
        await updateRangoHandler(
          rangoId,
          editRangoAbreviacion,
          editRangoNombreCompleto,
          editRangoOrden.trim() === "" ? undefined : Number(editRangoOrden),
          {
            onSuccess: async () => {
              setEditRangoId(null);
              setEditRangoAbreviacion("");
              setEditRangoNombreCompleto("");
              setEditRangoOrden("");
              setStatus("Grado del personal actualizado.");
              await loadData();
            },
            onError: (message) => setStatus(message),
          },
        );
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, editRangoAbreviacion, editRangoNombreCompleto, editRangoOrden, loadData],
  );

  const deleteRango = useCallback(
    (rangoId: number) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede modificar grados.");
        return;
      }
      const rango = rangosConfigView.find((entry) => entry.rangoId === rangoId);
      openConfirmDialog({
        title: "Eliminar grado",
        message: `Se eliminará ${rango?.nombreCompleto ?? "este grado del personal"}.`,
        confirmText: "Eliminar grado",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteRangoHandler(rangoId, {
              onSuccess: async () => {
                setStatus("Grado del personal eliminado.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [isAdmin, rangosConfigView, loadData],
  );

  const createBateria = useCallback(async () => {
    if (!isAdmin) {
      setStatus("Solo el administrador puede registrar baterías.");
      return;
    }
    try {
      await createBateriaHandler(newBateria, newBateriaOrden.trim() === "" ? undefined : Number(newBateriaOrden), {
        onSuccess: async () => {
          setNewBateria("");
          setNewBateriaOrden("");
          setStatus("Batería creada.");
          await loadData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    }
  }, [isAdmin, newBateria, newBateriaOrden, loadData]);

  const updateBateria = useCallback(
    async (bateriaId: number) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      try {
        await updateBateriaHandler(
          bateriaId,
          editBateriaNombre,
          editBateriaOrden.trim() === "" ? undefined : Number(editBateriaOrden),
          {
            onSuccess: async () => {
              setEditBateriaId(null);
              setEditBateriaNombre("");
              setEditBateriaOrden("");
              setStatus("Batería actualizada.");
              await loadData();
            },
            onError: (message) => setStatus(message),
          },
        );
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, editBateriaNombre, editBateriaOrden, loadData],
  );

  const deleteBateria = useCallback(
    (bateriaId: number) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const bateria = baterias.find((entry) => entry.bateriaId === bateriaId);
      openConfirmDialog({
        title: "Eliminar batería",
        message: `Se eliminará ${bateria?.nombre ?? "esta batería"}.`,
        confirmText: "Eliminar batería",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteBateriaHandler(bateriaId, {
              onSuccess: async () => {
                setStatus("Batería eliminada.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [canDelete, baterias, loadData],
  );

  const createEquipo = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      try {
        await createItemHandler(newEquipo.nombre, newEquipo.activo, {
          onSuccess: async () => {
            setNewEquipo(EMPTY_EQUIPO_FORM);
            setStatus("Equipo creado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, newEquipo, loadData],
  );

  const updateEquipo = useCallback(
    async (itemId: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      try {
        await updateItemHandler(itemId, editEquipo.nombre, editEquipo.activo, editEquipo.ordenPdf ?? 0, {
          onSuccess: async () => {
            setEditEquipoId(null);
            setEditEquipo(EMPTY_EQUIPO_FORM);
            setStatus("Equipo actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, editEquipo, loadData],
  );

  const toggleEquipoActivo = useCallback(
    async (equipo: Equipo) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      try {
        await updateItemHandler(equipo.itemId, equipo.nombre, !equipo.activo, equipo.ordenPdf, {
          onSuccess: async () => {
            setStatus(`Equipo ${!equipo.activo ? "visible en hoja" : "oculto de hoja"}.`);
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, loadData],
  );

  const saveActiveEquiposOrder = useCallback(
    async (orderedItemIds: string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      const currentActiveIds = equiposActivos.map((item) => item.itemId);
      if (
        orderedItemIds.length === currentActiveIds.length &&
        orderedItemIds.every((itemId, index) => itemId === currentActiveIds[index])
      ) {
        return;
      }

      try {
        await updateMultipleItemOrdersHandler(orderedItemIds, {
          onSuccess: async () => {
            setEquipoOrderDraftIds(null);
            setStatus("Orden de PDF actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, equiposActivos, loadData],
  );
  const updateEquipoOrderDraft = useCallback(
    (updater: (currentOrder: string[]) => string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      setEquipoOrderDraftIds((currentDraft) => {
        const baseOrder = currentDraft ?? equiposActivos.map((item) => item.itemId);
        return updater(baseOrder);
      });
    },
    [canWrite, equiposActivos],
  );

  const moveEquipoInDraft = useCallback(
    (itemId: string, direction: "up" | "down") => {
      updateEquipoOrderDraft((currentOrder) => {
        const currentIndex = currentOrder.indexOf(itemId);
        if (currentIndex < 0) return currentOrder;
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= currentOrder.length) return currentOrder;
        return moveIdInOrder(currentOrder, currentIndex, targetIndex);
      });
    },
    [updateEquipoOrderDraft],
  );

  const setEquipoDraftPosition = useCallback(
    (itemId: string, nextPosition: number) => {
      updateEquipoOrderDraft((currentOrder) => {
        const currentIndex = currentOrder.indexOf(itemId);
        const targetIndex = nextPosition - 1;
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length || currentIndex === targetIndex) {
          return currentOrder;
        }
        return moveIdInOrder(currentOrder, currentIndex, targetIndex);
      });
    },
    [updateEquipoOrderDraft],
  );

  const deleteEquipo = useCallback(
    async (itemId: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const item = equipos.find((entry) => entry.itemId === itemId);
      let impacto:
        | Awaited<ReturnType<typeof loadItemDeleteImpactHandler>>
        | null = null;
      try {
        impacto = await loadItemDeleteImpactHandler(itemId, {
          onSuccess: () => {},
          onError: (message) => setStatus(message),
        });
      } catch {
        return;
      }

      const registrosImpacto = impacto.registros.map((registro) => {
        const accion = registro.seEliminaMovimiento ? "se elimina movimiento completo" : "solo se elimina este equipo del movimiento";
        const fecha = formatDateOnlyForDisplay(registro.fecha, registro.fecha);
        return `- Registro #${registro.movimientoId} | ${registro.tipo} | ${fecha} | CI ${registro.ci} | ${accion}`;
      });
      const stockImpacto = impacto.stock.map((stock) => {
        const accion = stock.seEliminaMovimiento ? "se elimina movimiento completo" : "solo se elimina este equipo del movimiento";
        const fecha = formatDateOnlyForDisplay(stock.fecha, stock.fecha);
        return `- Stock #${stock.movimientoId} | ${stock.tipo} | ${fecha} | ${accion}`;
      });
      const resumen = impacto.resumen;
      const messageLines = [
        `Acción destructiva e irreversible: se eliminará ${item?.nombre ?? "este equipo"} y no se puede deshacer.`,
        `Movimientos afectados: ${resumen.totalMovimientos} (registros: ${resumen.totalRegistros}, stock: ${resumen.totalStock}).`,
        `Movimientos que quedarán vacíos y se eliminarán: ${resumen.movimientosQueSeEliminan}.`,
        `Movimientos que conservarán otros equipos: ${resumen.movimientosQueSeActualizan}.`,
        "",
        "Registros afectados:",
        ...(registrosImpacto.length > 0 ? registrosImpacto : ["- Ninguno"]),
        "",
        "Movimientos de stock afectados:",
        ...(stockImpacto.length > 0 ? stockImpacto : ["- Ninguno"]),
      ];

      openConfirmDialog({
        title: "Eliminar equipo",
        message: messageLines.join("\n"),
        confirmText: "Eliminar equipo (destructivo)",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteItemHandler(itemId, {
              onSuccess: async () => {
                setStatus("Equipo eliminado con limpieza de movimientos relacionados.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [canDelete, equipos, loadData],
  );

  const openMergeEquipoDialog = useCallback(
    (sourceItemId: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para unificar equipos.");
        return;
      }

      const source = equiposOrdenados.find((equipo) => equipo.itemId === sourceItemId);
      if (!source) {
        setStatus("No se encontro el equipo a reasignar.");
        return;
      }

      const firstTarget = equiposOrdenados.find((equipo) => equipo.itemId !== sourceItemId);
      if (!firstTarget) {
        setStatus("Debes tener al menos dos equipos para poder reasignar.");
        return;
      }

      setMergeEquipoDialog({
        sourceItemId,
        targetItemId: firstTarget.itemId,
      });
    },
    [canDelete, equiposOrdenados],
  );

  const closeMergeEquipoDialog = useCallback(() => {
    if (mergeEquipoSaving) return;
    setMergeEquipoDialog(null);
  }, [mergeEquipoSaving]);

  const updateMergeEquipoDialogTarget = useCallback((targetItemId: string) => {
    setMergeEquipoDialog((current) => (current ? { ...current, targetItemId } : current));
  }, []);

  const submitMergeEquipoDialog = useCallback(async () => {
    if (!mergeEquipoDialog || mergeEquipoSaving) return;
    if (!canDelete) {
      setStatus("No tienes permisos para unificar equipos.");
      return;
    }

    const source = equiposOrdenados.find((equipo) => equipo.itemId === mergeEquipoDialog.sourceItemId);
    const targetItemId = mergeEquipoDialogTargetId;
    const target = equiposOrdenados.find((equipo) => equipo.itemId === targetItemId);

    if (!source || !target) {
      setStatus("No se encontraron los equipos seleccionados.");
      return;
    }

    setMergeEquipoSaving(true);
    try {
      const result = await mergeItemHandler(source.itemId, target.itemId, {
        onSuccess: () => {},
        onError: (message) => setStatus(message),
      });
      setStatus(
        `Equipo unificado: ${result.sourceItem.nombre} -> ${result.targetItem.nombre}. Movimientos afectados: ${result.resumen.totalMovimientosAfectados}.`,
      );
      setMergeEquipoDialog(null);
      setMergeEquipoOrigenId("");
      setMergeEquipoDestinoId("");
      await loadData();
    } catch {
      // Error manejado en el handler
    } finally {
      setMergeEquipoSaving(false);
    }
  }, [canDelete, equiposOrdenados, loadData, mergeEquipoDialog, mergeEquipoDialogTargetId, mergeEquipoSaving]);

  const handleMergeEquipoOrigenChange = useCallback(
    (nextOrigenId: string) => {
      setMergeEquipoOrigenId(nextOrigenId);
      if (nextOrigenId !== "" && nextOrigenId === mergeEquipoDestinoId) {
        setMergeEquipoDestinoId("");
      }
    },
    [mergeEquipoDestinoId],
  );

  const handleMergeEquipoDestinoChange = useCallback((nextDestinoId: string) => {
    setMergeEquipoDestinoId(nextDestinoId);
  }, []);

  const mergeEquipos = useCallback(
    (origenItemId: string, destinoItemId: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para unificar equipos.");
        return;
      }
      if (origenItemId.trim() === "" || destinoItemId.trim() === "") {
        setStatus("Debes seleccionar equipo origen y equipo destino.");
        return;
      }
      if (origenItemId === destinoItemId) {
        setStatus("El equipo origen y destino deben ser distintos.");
        return;
      }

      const origen = equipos.find((equipo) => equipo.itemId === origenItemId);
      const destino = equipos.find((equipo) => equipo.itemId === destinoItemId);
      if (!origen || !destino) {
        setStatus("No se encontraron los equipos seleccionados.");
        return;
      }

      openConfirmDialog({
        title: "Unificar equipos",
        message: [
          `Se reasignaran todos los movimientos de "${origen.nombre}" hacia "${destino.nombre}".`,
          `Luego se eliminará "${origen.nombre}" del catálogo.`,
          "",
          "Acción destructiva e irreversible.",
        ].join("\n"),
        confirmText: "Unificar y eliminar origen",
        tone: "danger",
        onConfirm: async () => {
          try {
            const result = await mergeItemHandler(origenItemId, destinoItemId, {
              onSuccess: () => {},
              onError: (message) => setStatus(message),
            });
            setStatus(
              `Equipo unificado: ${result.sourceItem.nombre} -> ${result.targetItem.nombre}. Movimientos afectados: ${result.resumen.totalMovimientosAfectados}.`,
            );
            setMergeEquipoOrigenId("");
            setMergeEquipoDestinoId("");
            await loadData();
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [canDelete, equipos, loadData],
  );

  const createEmptyAltaMovimiento = useCallback((): PersonalAltaMovimientoForm => {
    return {
      ...EMPTY_PERSONAL_ALTA_MOVIMIENTO_FORM,
      fecha: getTodayDateInput(),
      items: [{ itemId: "", cantidad: "1" }],
    };
  }, []);

  const openNewPersonalMovimientoModal = useCallback(() => {
    setNewPersonalMovimientoEditIndex(null);
    setNewPersonalMovimientoDraft(createEmptyAltaMovimiento());
  }, [createEmptyAltaMovimiento]);

  const editNewPersonalMovimiento = useCallback((movimientoIndex: number) => {
    const target = newPersonalMovimientos[movimientoIndex];
    if (!target) return;
    setNewPersonalMovimientoEditIndex(movimientoIndex);
    setNewPersonalMovimientoDraft({
      ...target,
      items: target.items.map((item) => ({ ...item })),
    });
  }, [newPersonalMovimientos]);

  const closeNewPersonalMovimientoModal = useCallback(() => {
    setNewPersonalMovimientoDraft(null);
    setNewPersonalMovimientoEditIndex(null);
  }, []);

  const removeNewPersonalMovimiento = useCallback((movimientoIndex: number) => {
    setNewPersonalMovimientos((prev) => prev.filter((_, index) => index !== movimientoIndex));
  }, []);

  const updateNewPersonalMovimientoDraft = useCallback(
    (field: keyof Omit<PersonalAltaMovimientoForm, "items">, value: string) => {
      setNewPersonalMovimientoDraft((prev) => (prev ? ({ ...prev, [field]: value } as PersonalAltaMovimientoForm) : prev));
    },
    [],
  );

  const updateNewPersonalMovimientoDraftItem = useCallback((itemIndex: number, field: "itemId" | "cantidad", value: string) => {
    setNewPersonalMovimientoDraft((prev) => {
      if (!prev) return prev;
      if (
        field === "itemId" &&
        value !== "" &&
        prev.items.some((item, currentItemIndex) => currentItemIndex !== itemIndex && item.itemId === value)
      ) {
        setStatus("Ese equipo ya fue seleccionado en este movimiento.");
        return prev;
      }
      return {
        ...prev,
        items: prev.items.map((item, currentItemIndex) => (currentItemIndex === itemIndex ? { ...item, [field]: value } : item)),
      };
    });
  }, []);

  const addNewPersonalMovimientoDraftItem = useCallback(() => {
    setNewPersonalMovimientoDraft((prev) =>
      prev
        ? {
            ...prev,
            items: [...prev.items, { itemId: "", cantidad: "1" }],
          }
        : prev,
    );
  }, []);

  const removeNewPersonalMovimientoDraftItem = useCallback((itemIndex: number) => {
    setNewPersonalMovimientoDraft((prev) => {
      if (!prev) return prev;
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
      };
    });
  }, []);

  const saveNewPersonalMovimientoFromModal = useCallback(() => {
    if (!newPersonalMovimientoDraft) return;
    if (!parseDateInput(newPersonalMovimientoDraft.fecha).valid) {
      setStatus("La fecha del movimiento debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(newPersonalMovimientoDraft.fecha)) {
      setStatus("La fecha del movimiento no puede ser futura.");
      return;
    }

    const parsedItems = newPersonalMovimientoDraft.items
      .map((item) => ({ itemId: item.itemId.trim(), cantidad: Number(item.cantidad) }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (parsedItems.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad válida.");
      return;
    }

    const uniqueItemIds = new Set(parsedItems.map((item) => item.itemId));
    if (uniqueItemIds.size !== parsedItems.length) {
      setStatus("No puedes repetir equipos en un mismo movimiento.");
      return;
    }

    const sanitizedDraft: PersonalAltaMovimientoForm = {
      ...newPersonalMovimientoDraft,
      comentarios: newPersonalMovimientoDraft.comentarios.trim(),
      items: parsedItems.map((item) => ({ itemId: item.itemId, cantidad: String(item.cantidad) })),
    };

    setNewPersonalMovimientos((prev) => {
      if (newPersonalMovimientoEditIndex === null) return [...prev, sanitizedDraft];
      return prev.map((movimiento, index) => (index === newPersonalMovimientoEditIndex ? sanitizedDraft : movimiento));
    });
    closeNewPersonalMovimientoModal();
  }, [newPersonalMovimientoDraft, newPersonalMovimientoEditIndex, closeNewPersonalMovimientoModal]);

  const createPersonal = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (creatingPersonal) return;
      if (!canRegisterPersonal) {
        setStatus("No se puede registrar personal sin registrar Grados previamente.");
        return;
      }
      if (ciAlreadyExists) {
        setStatus("La cédula ya existe.");
        return;
      }
      if (!isValidUruguayanCi(newPersonal.ci)) {
        setStatus("CI uruguaya inválida. Revisa dígito verificador.");
        return;
      }
      if (!newPersonalPhoneLooksValid) {
        setStatus("El celular de contacto debe tener formato uruguayo válido.");
        return;
      }
      if (newPersonal.fechaIngreso.trim() !== "" && !parseDateInput(newPersonal.fechaIngreso).valid) {
        setStatus("La fecha de ingreso debe estar en formato DD/MM/AAAA.");
        return;
      }
      if (newPersonal.fechaIngreso.trim() !== "" && isDateInputAfterToday(newPersonal.fechaIngreso)) {
        setStatus("La fecha de ingreso no puede ser futura.");
        return;
      }
      if (newPersonal.fechaIngresoOriginal.trim() !== "" && !parseDateInput(newPersonal.fechaIngresoOriginal).valid) {
        setStatus("La fecha de ingreso debe estar en formato DD/MM/AAAA.");
        return;
      }
      if (newPersonal.fechaIngresoOriginal.trim() !== "" && isDateInputAfterToday(newPersonal.fechaIngresoOriginal)) {
        setStatus("La fecha de ingreso no puede ser futura.");
        return;
      }
      if (newPersonal.esReingreso && newPersonal.fechaIngreso.trim() === "") {
        setStatus("La fecha de re-ingreso es obligatoria.");
        return;
      }
      if (
        newPersonal.esReingreso &&
        newPersonal.fechaIngresoOriginal.trim() !== "" &&
        isDateInputAfter(newPersonal.fechaIngresoOriginal, newPersonal.fechaIngreso)
      ) {
        setStatus("La fecha de ingreso no puede ser posterior al re-ingreso.");
        return;
      }

      const movimientosPayload = [] as Array<{
        tipo: "ENTREGA" | "DEVOLUCION";
        fecha: string;
        comentarios?: string;
        items: Array<{ itemId: string; cantidad: number }>;
      }>;

      for (const [movimientoIndex, movimiento] of newPersonalMovimientos.entries()) {
          if (!parseDateInput(movimiento.fecha).valid) {
            setStatus(`La fecha del movimiento #${movimientoIndex + 1} debe estar en formato DD/MM/AAAA.`);
            return;
          }
          if (isDateInputAfterToday(movimiento.fecha)) {
            setStatus(`La fecha del movimiento #${movimientoIndex + 1} no puede ser futura.`);
            return;
          }

          const parsedItems = movimiento.items
            .map((item) => ({ itemId: item.itemId.trim(), cantidad: Number(item.cantidad) }))
            .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

          if (parsedItems.length === 0) {
            setStatus(`Debes agregar al menos un equipo con cantidad válida en el movimiento #${movimientoIndex + 1}.`);
            return;
          }

          const uniqueItemIds = new Set(parsedItems.map((item) => item.itemId));
          if (uniqueItemIds.size !== parsedItems.length) {
            setStatus(`No puedes repetir equipos en el movimiento #${movimientoIndex + 1}.`);
            return;
          }

        movimientosPayload.push({
          tipo: movimiento.tipo,
          fecha: movimiento.fecha,
          comentarios: movimiento.comentarios.trim() || undefined,
          items: parsedItems,
        });
      }

      const payload = {
        ...personalPayload(newPersonal, true),
        movimientos: movimientosPayload.length > 0 ? movimientosPayload : undefined,
      };

      setCreatingPersonal(true);
      try {
        await createPersonalHandler(payload, {
          onSuccess: async () => {
            const nombreCompleto = `${newPersonal.apellido1.trim()}, ${newPersonal.nombre1.trim()}`.replace(/\s+/g, " ").trim();
            setNewPersonal(EMPTY_PERSONAL_FORM);
            setNewPersonalMovimientos([]);
            setNewPersonalMovimientoDraft(null);
            setNewPersonalMovimientoEditIndex(null);
            setActiveView("personal");
            setPersonalPage(1);
            toast.success("Subalterno registrado correctamente", {
              description:
                movimientosPayload.length > 0
                  ? `${nombreCompleto} y ${movimientosPayload.length} movimiento(s) inicial(es) fueron registrados.`
                  : `${nombreCompleto} ya figura en el listado de subalternos y puede recibir movimientos.`,
              duration: 5000,
            });
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } finally {
        setCreatingPersonal(false);
      }
    },
    [
      canRegisterPersonal,
      ciAlreadyExists,
      creatingPersonal,
      newPersonal,
      newPersonalPhoneLooksValid,
      newPersonalMovimientos,
      loadData,
    ],
  );

  const updateNewOficialSuboficialField = useCallback((field: keyof OficialSuboficialForm, value: string) => {
    setNewOficialSuboficial((prev) => {
      if (field === "tipo") {
        return {
          ...prev,
          tipo: value === "SUBOFICIAL" ? "SUBOFICIAL" : "OFICIAL",
          rangoId: "",
        };
      }
      return { ...prev, [field]: value } as OficialSuboficialForm;
    });
  }, []);

  const openOficialSuboficialCreate = useCallback((tipo: "OFICIAL" | "SUBOFICIAL") => {
    setEditingOficialSuboficialCi(null);
    setNewOficialSuboficial({ ...EMPTY_OFICIAL_SUBOFICIAL_FORM, tipo, rangoId: "" });
    setActiveView(tipo === "OFICIAL" ? "oficial_nuevo" : "suboficial_nuevo");
  }, []);

  const startEditOficialSuboficial = useCallback((registro: OficialSuboficial) => {
    setEditingOficialSuboficialCi(registro.ci);
    setNewOficialSuboficial(toEditableOficialSuboficial(registro));
    setActiveView(registro.tipo === "OFICIAL" ? "oficial_nuevo" : "suboficial_nuevo");
  }, []);

  const submitOficialSuboficial = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (creatingOficialSuboficial) return;
      if (!canRegisterOficialSuboficial) {
        setStatus("No se puede registrar personal oficial/suboficial sin grados disponibles para el tipo elegido.");
        return;
      }
      if (oficialSuboficialCiAlreadyExists) {
        setStatus("La cédula ya existe.");
        return;
      }
      if (!isValidUruguayanCi(newOficialSuboficial.ci)) {
        setStatus("CI uruguaya inválida. Revisa dígito verificador.");
        return;
      }
      if (!newOficialSuboficialPhoneLooksValid) {
        setStatus("El celular de contacto debe tener formato uruguayo valido.");
        return;
      }
      if (Number(newOficialSuboficial.rangoId) <= 0) {
        setStatus("Debes seleccionar un grado.");
        return;
      }

      const isEditing = editingOficialSuboficialCi !== null;
      setCreatingOficialSuboficial(true);
      try {
        const payload = oficialSuboficialPayload(newOficialSuboficial, !isEditing);
        const action = isEditing
          ? updateOficialSuboficialHandler(editingOficialSuboficialCi, payload, {
              onError: (message) => setStatus(message),
            })
          : createOficialSuboficialHandler(payload, {
              onError: (message) => setStatus(message),
            });
        await action;

        const nombreCompleto = `${newOficialSuboficial.apellido1.trim()}, ${newOficialSuboficial.nombre1.trim()}`
          .replace(/\s+/g, " ")
          .trim();
        const viewAfterSave = newOficialSuboficial.tipo === "OFICIAL" ? "oficiales" : "suboficiales";

        setEditingOficialSuboficialCi(null);
        setNewOficialSuboficial({ ...EMPTY_OFICIAL_SUBOFICIAL_FORM, tipo: newOficialSuboficial.tipo });
        setActiveView(viewAfterSave);

        toast.success(
          isEditing
            ? "Oficial/Suboficial actualizado correctamente"
            : "Oficial/Suboficial registrado correctamente",
          {
            description: isEditing
              ? `${nombreCompleto} fue actualizado en el listado.`
              : `${nombreCompleto} ya figura en el listado.`,
            duration: 5000,
          },
        );

        await loadData();
      } finally {
        setCreatingOficialSuboficial(false);
      }
    },
    [
      creatingOficialSuboficial,
      canRegisterOficialSuboficial,
      oficialSuboficialCiAlreadyExists,
      newOficialSuboficial,
      newOficialSuboficialPhoneLooksValid,
      editingOficialSuboficialCi,
      loadData,
    ],
  );

  const cancelOficialSuboficialForm = useCallback(() => {
    const tipo = newOficialSuboficial.tipo;
    setEditingOficialSuboficialCi(null);
    setNewOficialSuboficial({ ...EMPTY_OFICIAL_SUBOFICIAL_FORM, tipo });
    setActiveView(tipo === "OFICIAL" ? "oficiales" : "suboficiales");
  }, [newOficialSuboficial.tipo]);

  const createOficialSuboficial = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      await submitOficialSuboficial(event);
    },
    [submitOficialSuboficial],
  );

  const updateNewPersonalField = useCallback((field: keyof PersonalForm, value: string | boolean) => {
    setNewPersonal((prev) => {
      const next = { ...prev, [field]: value } as PersonalForm;
      if (field === "esReingreso" && value === false) {
        next.fechaIngresoOriginal = "";
      }
      return next;
    });
  }, []);

  const updatePersonal = useCallback(
    async (ci: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      if (editPersonal.telefonoContacto.trim() !== "" && !isValidUruguayanMobileNumber(editPersonal.telefonoContacto)) {
        setStatus("El celular de contacto debe tener formato uruguayo válido.");
        return;
      }
      if (editPersonal.fechaIngreso.trim() !== "" && !parseDateInput(editPersonal.fechaIngreso).valid) {
        setStatus("La fecha de ingreso debe estar en formato DD/MM/AAAA.");
        return;
      }
      if (editPersonal.fechaIngreso.trim() !== "" && isDateInputAfterToday(editPersonal.fechaIngreso)) {
        setStatus("La fecha de ingreso no puede ser futura.");
        return;
      }
      if (editPersonal.fechaIngresoOriginal.trim() !== "" && !parseDateInput(editPersonal.fechaIngresoOriginal).valid) {
        setStatus("La fecha de ingreso debe estar en formato DD/MM/AAAA.");
        return;
      }
      if (editPersonal.fechaIngresoOriginal.trim() !== "" && isDateInputAfterToday(editPersonal.fechaIngresoOriginal)) {
        setStatus("La fecha de ingreso no puede ser futura.");
        return;
      }
      if (editPersonal.esReingreso && editPersonal.fechaIngreso.trim() === "") {
        setStatus("La fecha de re-ingreso es obligatoria.");
        return;
      }
      if (
        editPersonal.esReingreso &&
        editPersonal.fechaIngresoOriginal.trim() !== "" &&
        isDateInputAfter(editPersonal.fechaIngresoOriginal, editPersonal.fechaIngreso)
      ) {
        setStatus("La fecha de ingreso no puede ser posterior al re-ingreso.");
        return;
      }
      try {
        await updatePersonalHandler(ci, personalPayload(editPersonal, false), {
          onSuccess: async () => {
            setEditPersonalCi(null);
            setEditPersonal(EMPTY_PERSONAL_FORM);
            setStatus("Subalterno actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, editPersonal, loadData],
  );

  const promoteSargentoToSuboficial = useCallback(
    async (ci: string, adminPassword: string) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede ejecutar ascensos.");
        return;
      }
      if (promotingSubalternoCi) return;

      const trimmedPassword = adminPassword.trim();
      if (trimmedPassword === "") {
        setStatus("Debes ingresar la contraseña del administrador para confirmar.");
        return;
      }

      setPromotingSubalternoCi(ci);
      setStatus("Procesando ascenso a Sargento Primero...");
      try {
        const response = (await promoteSargentoToSuboficialHandler(ci, trimmedPassword, {
          onError: (message) => setStatus(message),
        })) as
          | {
              prestamoGenerado?: { reciboNumero?: string | null } | null;
            }
          | undefined;

        const recibo = response?.prestamoGenerado?.reciboNumero;
        setEditPersonalCi(null);
        setEditPersonal(EMPTY_PERSONAL_FORM);
        setStatus(
          recibo
            ? `Ascenso completado. Se genero el recibo ${recibo}.`
            : "Ascenso completado.",
        );
        await loadData();
      } catch {
        // Error manejado en el handler
      } finally {
        setPromotingSubalternoCi(null);
      }
    },
    [isAdmin, loadData, promotingSubalternoCi],
  );

  const openAscensoDeliverySheet = useCallback((ci: string) => {
    const printUrl = `/hoja-de-entrega/${encodeURIComponent(ci)}?autoprint=1`;
    const popup = window.open(printUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      setStatus("Debes permitir ventanas emergentes para imprimir la hoja de entrega.");
      return false;
    }
    popup.focus();
    setStatus("Hoja de entrega abierta (opcional). Tras confirmar el ascenso no podrás imprimir la hoja previa.");
    return true;
  }, []);

  const deletePersonal = useCallback(
    (ci: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const persona = personal.find((entry) => entry.ci === ci);
      openConfirmDialog({
        title: "Eliminar subalterno",
        message: persona
          ? `Se eliminará ${apellidosLabel(persona)}, ${nombresLabel(persona)} (${formatUruguayanCi(ci)}).`
          : `Se eliminara el subalterno con CI ${formatUruguayanCi(ci)}.`,
        confirmText: "Eliminar subalterno",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deletePersonalHandler(ci, {
              onSuccess: async () => {
                setStatus("Subalterno eliminado.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [canDelete, personal, loadData],
  );

  function startEditPersonal(persona: Personal) {
    setEditPersonalCi(persona.ci);
    setEditPersonal(toEditablePersonal(persona));
  }

  function toggleTallas(ci: string) {
    setExpandedTallasByCi((prev) => ({
      ...prev,
      [ci]: !prev[ci],
    }));
  }

  async function loadRegistroViewer(ci: string, nombre: string) {
    setRegistroViewer({
      ci,
      nombre,
      loading: true,
      error: null,
      registros: [],
    });

    try {
      const registros = await api<RegistroView[]>(`/api/registros?ci=${encodeURIComponent(ci)}&limit=200`);
      setRegistroViewer({
        ci,
        nombre,
        loading: false,
        error: null,
        registros,
      });
    } catch (error: unknown) {
      setRegistroViewer({
        ci,
        nombre,
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo cargar el historial.",
        registros: [],
      });
    }
  }

  async function openRegistroViewer(persona: Personal) {
    const nombre = `${apellidosLabel(persona)}, ${nombresLabel(persona)}`;
    await loadRegistroViewer(persona.ci, nombre);
  }

  function openRegistro(ci: string, tipo: RegistroTipo) {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar movimientos.");
      return;
    }
    setRegistroDraft({
      modo: "crear",
      registroId: null,
      ci,
      ciList: [ci],
      tipo,
      fecha: getTodayDateInput(),
      comentarios: "",
      items: [{ itemId: "", cantidad: "1" }],
    });
  }

  function openMassRegistro(tipo: RegistroTipo) {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar movimientos.");
      return;
    }
    if (personalFiltrado.length === 0) {
      setStatus("No hay personal disponible para registrar una entrega masiva.");
      return;
    }
    setRegistroDraft({
      modo: "crear",
      registroId: null,
      ci: "",
      ciList: [],
      tipo,
      fecha: getTodayDateInput(),
      comentarios: "",
      items: [{ itemId: "", cantidad: "1" }],
    });
  }

  async function refreshPersonalObservaciones(ci: string) {
    const observaciones = await loadPersonalObservacionesHandler(ci, {
      onError: (message) => setStatus(message),
    });
    return observaciones as PersonalObservacion[];
  }

  async function openPersonalObservacion(persona: Personal) {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar observaciones.");
      return;
    }

    const nombre = `${apellidosLabel(persona)}, ${nombresLabel(persona)}`;
    setPersonalObservacionDraft({
      ci: persona.ci,
      nombre,
      observacionId: null,
      fecha: getTodayDateInput(),
      texto: "",
      observaciones: [],
      loading: true,
      error: null,
    });

    try {
      const observaciones = await refreshPersonalObservaciones(persona.ci);
      setPersonalObservacionDraft((prev) =>
        prev && prev.ci === persona.ci
          ? {
              ...prev,
              observaciones,
              loading: false,
              error: null,
            }
          : prev,
      );
    } catch (error: unknown) {
      setPersonalObservacionDraft((prev) =>
        prev && prev.ci === persona.ci
          ? {
              ...prev,
              observaciones: [],
              loading: false,
              error: error instanceof Error ? error.message : "No se pudieron cargar las observaciones.",
            }
          : prev,
      );
    }
  }

  function resetPersonalObservacionForm() {
    setPersonalObservacionDraft((prev) =>
      prev
        ? {
            ...prev,
            observacionId: null,
            fecha: getTodayDateInput(),
            texto: "",
            error: null,
          }
        : prev,
    );
  }

  function editPersonalObservacion(observacion: PersonalObservacion) {
    setPersonalObservacionDraft((prev) =>
      prev
        ? {
            ...prev,
            observacionId: observacion.observacionId,
            fecha: formatDateOnlyForDisplay(observacion.fecha),
            texto: observacion.texto,
            error: null,
          }
        : prev,
    );
  }

  function rectifyRegistro(registro: RegistroView) {
    if (!canWrite) {
      setStatus("No tienes permisos para rectificar movimientos.");
      return;
    }
    if (registro.tipo === "AJUSTE") {
      setStatus("Los ajustes no se rectifican desde esta vista.");
      return;
    }

    setRegistroDraft({
      modo: "rectificar",
      registroId: registro.registroId,
      ci: registro.ci,
      ciList: [registro.ci],
      tipo: registro.tipo,
      fecha: formatDateOnlyForDisplay(registro.fecha),
      comentarios: registro.comentarios ?? "",
      items:
        registro.items.length > 0
          ? registro.items.map((item) => ({ itemId: item.itemId, cantidad: String(item.cantidad) }))
          : [{ itemId: "", cantidad: "1" }],
    });
  }

  function updateRegistroItem(index: number, field: keyof RegistroDraftEquipo, value: string) {
    setRegistroDraft((prev) => {
      if (!prev) return prev;
      if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
        setStatus("Ese equipo ya fue seleccionado en este movimiento.");
        return prev;
      }
      const items = prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item));
      return { ...prev, items };
    });
  }

  function addRegistroItem() {
    setRegistroDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, items: [...prev.items, { itemId: "", cantidad: "1" }] };
    });
  }

  function removeRegistroItem(index: number) {
    setRegistroDraft((prev) => {
      if (!prev) return prev;
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  }

  function toggleRegistroDestinatario(ci: string) {
    setRegistroDraft((prev) => {
      if (!prev || prev.modo !== "crear") return prev;
      const targetCi = ci.trim();
      if (targetCi === "") return prev;
      const exists = prev.ciList.includes(targetCi);
      const nextCiList = exists ? prev.ciList.filter((entry) => entry !== targetCi) : [...prev.ciList, targetCi];
      return {
        ...prev,
        ciList: nextCiList,
        ci: nextCiList[0] ?? "",
      };
    });
  }

  function selectAllRegistroDestinatarios() {
    setRegistroDraft((prev) => {
      if (!prev || prev.modo !== "crear") return prev;
      const ciList = Array.from(new Set(personalFiltrado.map((persona) => persona.ci)));
      return {
        ...prev,
        ciList,
        ci: ciList[0] ?? "",
      };
    });
  }

  function clearRegistroDestinatarios() {
    setRegistroDraft((prev) => {
      if (!prev || prev.modo !== "crear") return prev;
      return {
        ...prev,
        ciList: [],
        ci: "",
      };
    });
  }

  async function saveRegistro() {
    if (!registroDraft || registroSaving) return;
    const isRectificacion = registroDraft.modo === "rectificar" && registroDraft.registroId !== null;
    if (!parseDateInput(registroDraft.fecha).valid) {
      setStatus("La fecha del movimiento debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(registroDraft.fecha)) {
      setStatus("La fecha del movimiento no puede ser futura.");
      return;
    }
    const payloadEquipos = registroDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadEquipos.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad válida.");
      return;
    }
    const uniqueItemIds = new Set(payloadEquipos.map((item) => item.itemId));
    if (uniqueItemIds.size !== payloadEquipos.length) {
      setStatus("No puedes repetir equipos en un mismo movimiento.");
      return;
    }

    const targetCis = isRectificacion
      ? [registroDraft.ci]
      : Array.from(new Set(registroDraft.ciList.map((ci) => ci.trim()).filter((ci) => ci !== "")));
    if (targetCis.length === 0) {
      setStatus("Debes seleccionar al menos una persona para registrar el movimiento.");
      return;
    }

    setRegistroSaving(true);
    setStatus(isRectificacion ? "Actualizando rectificación..." : "Guardando movimiento...");
    try {
      await api(isRectificacion ? `/api/registros/${registroDraft.registroId}` : "/api/registros", {
        method: isRectificacion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ci: targetCis[0],
          ciList: targetCis,
          tipo: registroDraft.tipo,
          fecha: registroDraft.fecha,
          comentarios: registroDraft.comentarios.trim() || undefined,
          items: payloadEquipos,
        }),
      });
      setStatus(
        isRectificacion
          ? `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} rectificada para ${formatUruguayanCi(registroDraft.ci)}.`
          : targetCis.length === 1
            ? `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} registrada para ${formatUruguayanCi(targetCis[0])}.`
            : `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} masiva registrada para ${targetCis.length} personas.`,
      );
      setRegistroDraft(null);
      await loadData();
      if (registroViewer && targetCis.includes(registroViewer.ci)) {
        await loadRegistroViewer(registroViewer.ci, registroViewer.nombre);
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : isRectificacion ? "No se pudo rectificar el movimiento." : "No se pudo registrar el movimiento.");
    } finally {
      setRegistroSaving(false);
    }
  }

  function deleteRegistro(registro: RegistroView) {
    if (!canDeleteRegistros) {
      setStatus("Solo un administrador puede eliminar movimientos.");
      return;
    }
    if (registro.tipo === "AJUSTE") {
      setStatus("Los ajustes no se eliminan desde esta vista.");
      return;
    }

    const fechaLabel = formatDateOnlyForDisplay(registro.fecha);
    const tipoLabel = registro.tipo === "ENTREGA" ? "entrega" : "devolución";

    openConfirmDialog({
      title: "Eliminar movimiento",
      message: `Se eliminará la ${tipoLabel} del ${fechaLabel} para CI ${formatUruguayanCi(registro.ci)}. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar movimiento",
      tone: "danger",
      onConfirm: async () => {
        setStatus("Eliminando movimiento...");
        try {
          await api(`/api/registros/${registro.registroId}`, {
            method: "DELETE",
          });
          setRegistroDraft((prev) => (prev && prev.registroId === registro.registroId ? null : prev));
          setStatus(`Movimiento eliminado para ${formatUruguayanCi(registro.ci)}.`);
          await loadData();
          if (registroViewer && registroViewer.ci === registro.ci) {
            await loadRegistroViewer(registroViewer.ci, registroViewer.nombre);
          }
        } catch (error: unknown) {
          setStatus(error instanceof Error ? error.message : "No se pudo eliminar el movimiento.");
        }
      },
    });
  }

  function updateStockDraftItem(index: number, field: keyof RegistroDraftEquipo, value: string) {
    setStockDraft((prev) => {
      if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
        setStatus("Ese equipo ya fue seleccionado en este movimiento de stock.");
        return prev;
      }
      return {
        ...prev,
        items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      };
    });
  }

  function addStockDraftItem() {
    setStockDraft((prev) => ({ ...prev, items: [...prev.items, { itemId: "", cantidad: "1" }] }));
  }

  function removeStockDraftItem(index: number) {
    setStockDraft((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  }

  async function saveStockOperation() {
    if (stockSaving) return;
    if (!parseDateInput(stockDraft.fecha).valid) {
      setStatus("La fecha del stock debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(stockDraft.fecha)) {
      setStatus("La fecha del stock no puede ser futura.");
      return;
    }

    const payloadItems = stockDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadItems.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad válida.");
      return;
    }

    const uniqueItemIds = new Set(payloadItems.map((item) => item.itemId));
    if (uniqueItemIds.size !== payloadItems.length) {
      setStatus("No puedes repetir equipos en un mismo movimiento de stock.");
      return;
    }

    setStockSaving(true);
    setStatus(stockDraft.tipo === "INGRESO" ? "Registrando ingreso de stock..." : "Registrando egreso de stock...");
    try {
      await api("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: stockDraft.tipo,
          fecha: stockDraft.fecha,
          comentarios: stockDraft.comentarios.trim() || undefined,
          items: payloadItems,
        }),
      });
      setStockDraft({ ...EMPTY_STOCK_OPERACION_DRAFT, fecha: getTodayDateInput() });
      setStatus(stockDraft.tipo === "INGRESO" ? "Ingreso de stock registrado." : "Egreso de stock registrado.");
      await reloadActiveStockData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar el movimiento de stock.");
    } finally {
      setStockSaving(false);
    }
  }

  function updatePrestamoDraftItem(index: number, field: keyof PrestamoDraftItem, value: string) {
    setPrestamoDraft((prev) => {
      if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
        setStatus("Ese equipo ya fue seleccionado en este prestamo.");
        return prev;
      }
      return {
        ...prev,
        items: prev.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
      };
    });
  }

  function addPrestamoDraftItem() {
    setPrestamoDraft((prev) => ({ ...prev, items: [...prev.items, { itemId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }] }));
  }

  function removePrestamoDraftItem(index: number) {
    setPrestamoDraft((prev) => {
      if (prev.items.length <= 1) return prev;
      return { ...prev, items: prev.items.filter((_, itemIndex) => itemIndex !== index) };
    });
  }

  async function savePrestamo(printAfterSave = false) {
    if (prestamoSaving) return;
    if (prestamoDraft.destinatarioCi.trim() === "") {
      setStatus("Debes seleccionar un destinatario para el prestamo.");
      return;
    }
    if (!parseDateInput(prestamoDraft.fechaPrestamo).valid) {
      setStatus("La fecha del prestamo debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(prestamoDraft.fechaPrestamo)) {
      setStatus("La fecha del prestamo no puede ser futura.");
      return;
    }

    const payloadItems = prestamoDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
        estadoEntrega: item.estadoEntrega,
        comentarioEntrega: item.comentarioEntrega.trim() || undefined,
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadItems.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad válida.");
      return;
    }

    const uniqueItemIds = new Set(payloadItems.map((item) => item.itemId));
    if (uniqueItemIds.size !== payloadItems.length) {
      setStatus("No puedes repetir equipos en un mismo prestamo.");
      return;
    }

    setPrestamoSaving(true);
    setStatus("Registrando prestamo...");
    try {
      const created = await api<{ prestamoId: string }>("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinatarioTipo: prestamoDraft.destinatarioTipo,
          destinatarioCi: prestamoDraft.destinatarioCi.trim(),
          fechaPrestamo: prestamoDraft.fechaPrestamo,
          fechaEstimadaDevolucionTexto: prestamoDraft.fechaEstimadaDevolucionTexto.trim() || undefined,
          comentarios: prestamoDraft.comentarios.trim() || undefined,
          items: payloadItems,
        }),
      });
      setPrestamoDraft({ ...EMPTY_PRESTAMO_DRAFT, fechaPrestamo: getTodayDateInput() });
      setStatus("Prestamo registrado.");
      await reloadActiveStockData();
      if (printAfterSave) {
        window.open(`/api/prestamos/${encodeURIComponent(created.prestamoId)}/recibo`, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar el prestamo.");
    } finally {
      setPrestamoSaving(false);
    }
  }

  async function returnPrestamo(
    prestamoId: string,
    fechaDevolucion: string,
    items?: Array<{ itemId: string; estadoDevolucion: "NUEVO" | "BUENO" | "REGULAR" | "MALO"; comentarioDevolucion?: string }>,
  ) {
    if (returningPrestamoId) return;
    setReturningPrestamoId(prestamoId);
    setStatus("Registrando devolución del préstamo...");
    try {
      await api(`/api/prestamos/${encodeURIComponent(prestamoId)}/devolucion`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaDevolucion: fechaDevolucion.trim() || getTodayDateInput(),
          items,
        }),
      });
      setStatus("Devolucion de prestamo registrada.");
      await reloadActiveStockData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar la devolución del préstamo.");
    } finally {
      setReturningPrestamoId(null);
    }
  }

  async function deletePrestamo(prestamoId: string) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede eliminar prestamos.");
      return;
    }

    openConfirmDialog({
      title: "Eliminar prestamo",
      message: `Se eliminara el prestamo con ID ${prestamoId}. Esta accion no se puede deshacer.`,
      confirmText: "Eliminar prestamo",
      tone: "danger",
      onConfirm: async () => {
        setStatus("Eliminando prestamo...");
        await api(`/api/prestamos/${encodeURIComponent(prestamoId)}`, {
          method: "DELETE",
        });
        setStatus(`Prestamo ${prestamoId} eliminado.`);
        await reloadActiveStockData();
      },
    });
  }

  async function savePersonalObservacion() {
    if (!personalObservacionDraft || personalObservacionSaving) return;
    const isEditing = personalObservacionDraft.observacionId !== null;

    if (!personalObservacionDraft.fecha) {
      setStatus("Selecciona la fecha de la observación.");
      return;
    }
    if (!parseDateInput(personalObservacionDraft.fecha).valid) {
      setStatus("La fecha de la observación debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(personalObservacionDraft.fecha)) {
      setStatus("La fecha de la observación no puede ser futura.");
      return;
    }
    if (!personalObservacionDraft.texto.trim()) {
      setStatus("Ingresa el texto de la observación.");
      return;
    }

    setPersonalObservacionSaving(true);
    setStatus(isEditing ? "Actualizando observación..." : "Guardando observación...");
    try {
      if (isEditing && personalObservacionDraft.observacionId) {
        await updatePersonalObservacionHandler(
          personalObservacionDraft.ci,
          personalObservacionDraft.observacionId,
          {
            fecha: personalObservacionDraft.fecha,
            texto: personalObservacionDraft.texto.trim(),
          },
          {
            onError: (message) => setStatus(message),
          },
        );
      } else {
        await createPersonalObservacionHandler(
          personalObservacionDraft.ci,
          {
            fecha: personalObservacionDraft.fecha,
            texto: personalObservacionDraft.texto.trim(),
          },
          {
            onError: (message) => setStatus(message),
          },
        );
      }

      const observaciones = await refreshPersonalObservaciones(personalObservacionDraft.ci);
      setPersonalObservacionDraft((prev) =>
        prev
          ? {
              ...prev,
              observaciones,
              observacionId: null,
              fecha: getTodayDateInput(),
              texto: "",
              loading: false,
              error: null,
            }
          : prev,
      );
      setStatus(
        `${isEditing ? "Observación actualizada" : "Observación registrada"} para ${formatUruguayanCi(personalObservacionDraft.ci)}.`,
      );
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : isEditing ? "No se pudo actualizar la observación." : "No se pudo registrar la observación.");
    } finally {
      setPersonalObservacionSaving(false);
    }
  }

  function deletePersonalObservacion(observacion: PersonalObservacion) {
    openConfirmDialog({
      title: "Eliminar observación",
      message: `Se eliminará la observación del ${formatDateOnlyForDisplay(observacion.fecha)}.`,
      confirmText: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        try {
          await deletePersonalObservacionHandler(observacion.ci, observacion.observacionId, {
            onError: (message) => setStatus(message),
          });

          const observaciones = await refreshPersonalObservaciones(observacion.ci);
          setPersonalObservacionDraft((prev) =>
            prev && prev.ci === observacion.ci
              ? {
                  ...prev,
                  observaciones,
                  observacionId: prev.observacionId === observacion.observacionId ? null : prev.observacionId,
                  fecha: prev.observacionId === observacion.observacionId ? getTodayDateInput() : prev.fecha,
                  texto: prev.observacionId === observacion.observacionId ? "" : prev.texto,
                  error: null,
                }
              : prev,
          );
          setStatus(`Observación eliminada para ${formatUruguayanCi(observacion.ci)}.`);
        } catch {
          // Error manejado en el handler
        }
      },
    });
  }

  const login = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoginLoading(true);
      setStatus(STATUS_STARTING_SESSION);

      try {
        await loginHandler(loginUsername, loginPassword, {
          onSuccess: async () => {
            setLoginPassword("");
            await loadData(true);
          },
          onError: (message) => setStatus(message),
        });
      } finally {
        setLoginLoading(false);
      }
    },
    [loginUsername, loginPassword, loadData],
  );

  const requestPasswordReset = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (resetRequestLoading) return;

      const username = resetUsername.trim();
      if (username === "") {
        setResetRequestMessage("Ingresa tu usuario para recibir el enlace.");
        return;
      }

      setResetRequestLoading(true);
      setResetRequestMessage("");
      try {
        const result = await requestPasswordResetHandler(username, {
          onError: (message) => {
            setResetRequestMessage(message);
            setStatus(message);
          },
        });
        setResetRequestMessage(result.message);
        setStatus(result.message);
      } catch {
        // Error manejado por callbacks.
      } finally {
        setResetRequestLoading(false);
      }
    },
    [resetRequestLoading, resetUsername],
  );

  const submitChangePassword = useCallback(async () => {
    if (!canManageOwnAccount) {
      setStatus("El rol Solo Lectura no puede cambiar credenciales ni datos.");
      return;
    }
    if (changeNewPassword.trim() === "" || changeNewPassword !== changeConfirmPassword) {
      setStatus("La nueva contraseña no coincide.");
      return;
    }
    if (changeCurrentPassword.trim() === "") {
      setStatus("Ingresa la contraseña actual.");
      return;
    }

    setChangeLoading(true);
    try {
      await changePasswordHandler(
        { currentPassword: changeCurrentPassword, newPassword: changeNewPassword },
        {
          onSuccess: () => {
            setStatus("Contrasena actualizada.");
            setChangeCurrentPassword("");
            setChangeNewPassword("");
            setChangeConfirmPassword("");
            setShowChangePassword(false);
          },
          onError: (message) => setStatus(message),
        },
      );
    } finally {
      setChangeLoading(false);
    }
  }, [canManageOwnAccount, changeCurrentPassword, changeNewPassword, changeConfirmPassword]);

  const logout = useCallback(async () => {
    try {
      await logoutHandler({
        onSuccess: () => {
          setCurrentUser(null);
          clearLoadedData();
          setLoginPassword("");
          setActiveView("personal");
          setStatus(STATUS_SESSION_CLOSED);
        },
      });
    } catch {
      // Error manejado o ignorado en logout
      setCurrentUser(null);
      clearLoadedData();
      setLoginPassword("");
      setActiveView("personal");
      setStatus(STATUS_SESSION_CLOSED);
    }
  }, [clearLoadedData, setCurrentUser]);

  const createUsuario = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isAdmin) {
        setStatus("Solo el administrador puede crear usuarios.");
        return;
      }

      const parsedRangoId = Number(newUserRangoId);
      const trimmedNombre = newNombre.trim();
      const trimmedApellido = newApellido.trim();
      const trimmedUsername = newUsername.trim();
      const trimmedMailReferencia = newMailReferencia.trim();
      if (!Number.isInteger(parsedRangoId) || parsedRangoId <= 0 || !trimmedNombre || !trimmedApellido || !trimmedUsername) {
        setStatus("Grado, nombre, apellido y usuario son obligatorios.");
        return;
      }

      if (newPassword.trim().length < 8) {
        setStatus("La contraseña debe tener al menos 8 caracteres.");
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        setStatus("Las contraseñas no coinciden.");
        return;
      }

      try {
        await createUsuarioHandler({
          rangoId: parsedRangoId,
          nombre: trimmedNombre,
          apellido: trimmedApellido,
          usuario: trimmedUsername,
          password: newPassword,
          mailReferencia: trimmedMailReferencia,
          rol: newRole,
        }, {
          onSuccess: async () => {
            setNewUserRangoId("");
            setNewNombre("");
            setNewApellido("");
            setNewUsername("");
            setNewPassword("");
            setNewPasswordConfirm("");
            setNewMailReferencia("");
            setNewRole("EDITOR");
            setStatus("Usuario creado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, newUserRangoId, newNombre, newApellido, newUsername, newPassword, newPasswordConfirm, newMailReferencia, newRole, loadData],
  );

  const changeUserRole = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede cambiar roles.");
        return;
      }
      setUserRoleDialog({
        usuarioId: usuario.usuarioId,
        username: usuario.username,
        currentRole: usuario.rol,
        nextRole: usuario.rol,
      });
    },
    [isAdmin],
  );

  const closeUserRoleDialog = useCallback(() => {
    if (userRoleSaving) return;
    setUserRoleDialog(null);
  }, [userRoleSaving]);

  const changeUserPassword = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede cambiar contraseñas.");
        return;
      }
      setUserPasswordDialog({
        usuarioId: usuario.usuarioId,
        username: usuario.username,
        newPassword: "",
        confirmPassword: "",
      });
    },
    [isAdmin],
  );

  const closeUserPasswordDialog = useCallback(() => {
    if (userPasswordSaving) return;
    setUserPasswordDialog(null);
  }, [userPasswordSaving]);

  const openUsernameDialog = useCallback(
    (
      usuario: {
        usuarioId: string;
        rangoId?: number;
        nombre?: string;
        apellido?: string;
        username: string;
        mailReferencia?: string | null;
      },
      options?: { title?: string; description?: string },
    ) => {
      setUsernameDialog({
        usuarioId: usuario.usuarioId,
        rangoId: usuario.rangoId ? String(usuario.rangoId) : "",
        nombre: usuario.nombre ?? "",
        apellido: usuario.apellido ?? "",
        username: usuario.username,
        mailReferencia: usuario.mailReferencia ?? "",
        title: options?.title ?? "Editar usuario",
        description: options?.description ?? "Actualiza el nombre con el que esta cuenta inicia sesión.",
      });
    },
    [],
  );

  const editUsuario = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede editar usuarios ajenos.");
        return;
      }

      openUsernameDialog(usuario, {
        title: "Editar usuario",
        description: `Actualiza los datos de ${usuario.username}.`,
      });
    },
    [isAdmin, openUsernameDialog],
  );

  const changeOwnUsername = useCallback(() => {
    if (!currentUser) return;
    if (!canManageOwnAccount) {
      setStatus("El rol Solo Lectura no puede cambiar credenciales ni datos.");
      return;
    }

    openUsernameDialog(currentUser, {
      title: "Editar mi usuario",
      description: "Actualiza tus datos principales de acceso.",
    });
  }, [canManageOwnAccount, currentUser, openUsernameDialog]);

  const closeUsernameDialog = useCallback(() => {
    if (usernameSaving) return;
    setUsernameDialog(null);
  }, [usernameSaving]);

  const submitUserRoleChange = useCallback(async () => {
    if (!userRoleDialog) return;
    if (!ROLE_OPTIONS.includes(userRoleDialog.nextRole)) {
      setStatus("Rol inválido.");
      return;
    }

    setUserRoleSaving(true);
    try {
      await changeUserRoleHandler(userRoleDialog.usuarioId, userRoleDialog.nextRole, {
        onSuccess: async () => {
          setStatus("Rol actualizado.");
          setUserRoleDialog(null);
          await loadData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUserRoleSaving(false);
    }
  }, [userRoleDialog, loadData]);

  const submitUserPasswordChange = useCallback(async () => {
    if (!userPasswordDialog) return;

    if (userPasswordDialog.newPassword.trim().length < 8) {
      setStatus("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (userPasswordDialog.newPassword !== userPasswordDialog.confirmPassword) {
      setStatus("La nueva contraseña no coincide.");
      return;
    }

    setUserPasswordSaving(true);
    try {
      await changeUserPasswordHandler(userPasswordDialog.usuarioId, userPasswordDialog.newPassword, {
        onSuccess: async () => {
          setStatus("Contraseña de usuario actualizada.");
          setUserPasswordDialog(null);
          await loadData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUserPasswordSaving(false);
    }
  }, [userPasswordDialog, loadData]);

  const submitUsernameChange = useCallback(async () => {
    if (!usernameDialog) return;
    if (!canManageOwnAccount) {
      setStatus("El rol Solo Lectura no puede cambiar credenciales ni datos.");
      return;
    }

    const nextRangoId = Number(usernameDialog.rangoId);
    const nextNombre = usernameDialog.nombre.trim();
    const nextApellido = usernameDialog.apellido.trim();
    const nextUsername = usernameDialog.username.trim();
    const nextMailReferencia = usernameDialog.mailReferencia.trim();
    if (!Number.isInteger(nextRangoId) || nextRangoId <= 0 || !nextNombre || !nextApellido || !nextUsername) {
      setStatus("Grado, nombre, apellido y usuario son obligatorios.");
      return;
    }

    setUsernameSaving(true);
    try {
      await updateUsuarioProfileHandler(usernameDialog.usuarioId, {
        rangoId: nextRangoId,
        nombre: nextNombre,
        apellido: nextApellido,
        usuario: nextUsername,
        mailReferencia: nextMailReferencia,
      }, {
        onSuccess: async () => {
          const isSelfUpdate = currentUser?.usuarioId === usernameDialog.usuarioId;
          setStatus(isSelfUpdate ? `Tu usuario ahora es ${nextUsername}.` : `Usuario actualizado a ${nextUsername}.`);
          setUsernameDialog(null);
          await loadData(isSelfUpdate);
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUsernameSaving(false);
    }
  }, [canManageOwnAccount, usernameDialog, currentUser, loadData]);

  const toggleUserActive = useCallback(
    async (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede cambiar estado.");
        return;
      }
      try {
        await toggleUserActiveHandler(usuario.usuarioId, !usuario.activo, {
          onSuccess: async () => {
            setStatus("Estado de usuario actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, loadData],
  );

  const confirmUserEmail = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede confirmar correos.");
        return;
      }
      if (!usuario.mailReferencia) {
        setStatus("El usuario no tiene mail de referencia.");
        return;
      }
      if (usuario.mailVerificadaAt) {
        setStatus("El correo ya está verificado.");
        return;
      }

      openConfirmDialog({
        title: "Confirmar correo",
        message: `Se marcará como verificado el correo ${usuario.mailReferencia} de ${usuario.username}.`,
        confirmText: "Confirmar correo",
        tone: "neutral",
        onConfirm: async () => {
          try {
            await confirmUserEmailHandler(usuario.usuarioId, {
              onSuccess: async () => {
                setStatus("Correo confirmado.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [isAdmin, loadData],
  );

  const deleteUsuario = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede eliminar usuarios.");
        return;
      }
      openConfirmDialog({
        title: "Eliminar usuario",
        message: `Se eliminará la cuenta ${usuario.username}.`,
        confirmText: "Eliminar usuario",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteUsuarioHandler(usuario.usuarioId, {
              onSuccess: async () => {
                setStatus("Usuario eliminado.");
                await loadData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [isAdmin, loadData],
  );

  const saveFirmaConfig = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isAdmin) {
        setStatus("Solo el administrador puede editar firmas institucionales.");
        return;
      }

      const encargadoRango = firmaConfigDraft.encargadoRango.trim();
      const encargadoNombre = firmaConfigDraft.encargadoNombre.trim();
      const oficialRango = firmaConfigDraft.oficialRango.trim();
      const oficialNombre = firmaConfigDraft.oficialNombre.trim();
      
      if (!encargadoRango || !encargadoNombre || !oficialRango || !oficialNombre) {
        setFirmaConfigError("Todos los campos son obligatorios.");
        setStatus("Completa todos los campos de firma.");
        return;
      }

      setFirmaConfigSaving(true);
      setFirmaConfigError(null);
      try {
        await saveFirmaConfigHandler(
          encargadoRango,
          encargadoNombre,
          oficialRango,
          oficialNombre,
          {
            onSave: (updated) => {
              const config = updated as FirmaConfig;
              setFirmaConfig(config);
              setFirmaConfigDraft({
                encargadoRango: config.encargadoRango,
                encargadoNombre: config.encargadoNombre,
                oficialRango: config.oficialRango,
                oficialNombre: config.oficialNombre,
              });
              setStatus("Firmas institucionales actualizadas.");
            },
            onSuccess: () => {},
            onError: (message) => {
              setFirmaConfigError(message);
              setStatus(message);
            },
          }
        );
      } finally {
        setFirmaConfigSaving(false);
      }
    },
    [isAdmin, firmaConfigDraft, setFirmaConfig, setFirmaConfigDraft, setFirmaConfigError, setFirmaConfigSaving],
  );

  function openConfirmDialog(options: Omit<ConfirmDialogState, "cancelText" | "tone"> & Partial<Pick<ConfirmDialogState, "cancelText" | "tone">>) {
    setConfirmDialog({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText,
      cancelText: options.cancelText ?? "Cancelar",
      tone: options.tone ?? "danger",
      onConfirm: options.onConfirm,
    });
  }

  function closeConfirmDialog() {
    if (confirmDialogBusy) return;
    setConfirmDialog(null);
  }

  const printAllDeliverySheets = useCallback(() => {
    if (personal.length === 0) {
      toast.info("No hay personal para imprimir.");
      return;
    }

    const popup = window.open("/hojas-de-entrega?autoprint=1", "_blank", "noopener,noreferrer");

    if (!popup) {
      const message = "Permite ventanas emergentes para imprimir todas las hojas de entrega.";
      setStatus(message);
      return;
    }

    setStatus(`Abriendo hojas de entrega para ${personal.length} personas...`);
    toast.info(`Abriendo ${personal.length} hojas de entrega.`);
  }, [personal.length]);

  const printPersonnelByBattery = useCallback(() => {
    if (personal.length === 0) {
      toast.info("No hay personal para imprimir.");
      return;
    }

    const popup = window.open("/lista-personal?autoprint=1", "_blank", "noopener,noreferrer");

    if (!popup) {
      const message = "Permite ventanas emergentes para imprimir la lista de personal.";
      setStatus(message);
      return;
    }

    setStatus(`Abriendo lista de personal por batería para ${personal.length} personas...`);
    toast.info(`Abriendo lista por batería (${personal.length} personas).`);
  }, [personal.length]);

  async function confirmDialogAccept() {
    if (!confirmDialog) return;
    setConfirmDialogBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } finally {
      setConfirmDialogBusy(false);
    }
  }

  // Las funciones de auditería se importan directamente desde lib/audit-helpers

  function renderEquipoCard(
    equipo: Equipo,
    options?: { reorderableInActiveList?: boolean; orderIndex?: number; orderCount?: number },
  ) {
    const reorderableInActiveList = options?.reorderableInActiveList === true;
    const orderIndex = options?.orderIndex ?? -1;
    const orderCount = options?.orderCount ?? 0;
    const currentOrderLabel = reorderableInActiveList && orderIndex >= 0 ? orderIndex + 1 : equipo.ordenPdf;

    return (
      <div
        key={equipo.itemId}
        className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md"
      >
        {editEquipoId === equipo.itemId ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-700 mb-1">Nombre</label>
              <input
                value={editEquipo.nombre}
                onChange={(event) => setEditEquipo((prev) => ({ ...prev, nombre: event.target.value }))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-700 mb-1">Orden PDF</label>
              <input
                type="number"
                min={1}
                step={1}
                value={editEquipo.ordenPdf}
                onChange={(event) => setEditEquipo((prev) => ({ ...prev, ordenPdf: Math.max(1, Number(event.target.value) || 1) }))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-stone-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={editEquipo.activo}
                onChange={(event) => setEditEquipo((prev) => ({ ...prev, activo: event.target.checked }))}
                className="w-4 h-4 rounded border-stone-300"
              />
              <span className="font-medium text-stone-700">Aparece en Hoja de Entrega</span>
            </label>
            <div className="flex gap-2 pt-2">
              <SmallActionButton text="Guardar" tone="ok" onClick={() => void updateEquipo(equipo.itemId)} />
              <SmallActionButton
                text="Cancelar"
                tone="neutral"
                onClick={() => {
                  setEditEquipoId(null);
                  setEditEquipo(EMPTY_EQUIPO_FORM);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900">{equipo.nombre}</h3>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  equipo.activo
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {equipo.activo ? "Aparece en hoja" : "Oculto de hoja"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {reorderableInActiveList ? `Posicion actual en hoja: ${currentOrderLabel}` : `Orden PDF: ${equipo.ordenPdf}`}
              </p>
              {/*
                      {codigo.aclaracion ? `${codigo.codigo} · ${codigo.aclaracion}` : codigo.codigo}
              */}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {canWrite ? (
                <SmallActionButton
                  text={equipo.activo ? "Ocultar de hoja" : "Mostrar en hoja"}
                  tone="neutral"
                  onClick={() => void toggleEquipoActivo(equipo)}
                />
              ) : null}
              {reorderableInActiveList ? (
                <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-2 py-2">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-xl bg-stone-900 px-2 py-1 text-xs font-semibold text-white">
                    {currentOrderLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveEquipoInDraft(equipo.itemId, "up")}
                      disabled={!canWrite || orderIndex <= 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 transition hover:border-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Subir una posicion"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEquipoInDraft(equipo.itemId, "down")}
                      disabled={!canWrite || orderIndex < 0 || orderIndex >= orderCount - 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-300 bg-white text-stone-700 transition hover:border-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Bajar una posicion"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  <label className="flex items-center gap-2 rounded-xl bg-white px-2 py-1 text-xs text-stone-600">
                    <span>Ir a</span>
                    <select
                      value={currentOrderLabel}
                      onChange={(event) => setEquipoDraftPosition(equipo.itemId, Number(event.target.value))}
                      disabled={!canWrite}
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 outline-none"
                    >
                      {Array.from({ length: orderCount }, (_, index) => index + 1).map((position) => (
                        <option key={`${equipo.itemId}-position-${position}`} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              {canWrite ? (
                <ActionMenu
                  buttonLabel="Acciones"
                  actions={[
                    {
                      label: equipo.activo ? "Ocultar de hoja" : "Mostrar en hoja",
                      icon: equipo.activo ? "x" : "check",
                      tone: equipo.activo ? "danger" : "success",
                      onClick: () => void toggleEquipoActivo(equipo),
                    },
                    {
                      label: "Editar",
                      icon: "edit",
                      tone: "primary",
                      onClick: () => {
                        setEditEquipoId(equipo.itemId);
                        setEditEquipo({
                          nombre: equipo.nombre,
                          activo: equipo.activo,
                          ordenPdf: equipo.ordenPdf,
                        });
                      },
                    },
                    {
                      label: "Reasignar",
                      icon: "drag",
                      tone: "secondary",
                      onClick: () => openMergeEquipoDialog(equipo.itemId),
                    },
                    {
                      label: "Eliminar",
                      icon: "trash",
                      tone: "danger",
                      onClick: () => void deleteEquipo(equipo.itemId),
                    },
                  ]}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  const normalizedStatus = status.toLowerCase();
  const isPageBootLoading =
    !currentUser &&
    !loginLoading &&
    (normalizedStatus.startsWith("verificando") ||
      normalizedStatus.startsWith("iniciando"));
  const isLoginGlobalBusy = !currentUser && (isPageBootLoading || loginLoading);
  const isAppGlobalBusy =
    !!currentUser &&
    (
      loading ||
      firmaConfigLoading ||
      hojaMatrixLoading ||
      equipoResumenLoading ||
      stockLoading ||
      creatingPersonal ||
      creatingOficialSuboficial ||
      mergeEquipoSaving ||
      stockSaving ||
      prestamoSaving ||
      returningPrestamoId !== null ||
      registroSaving ||
      personalObservacionSaving ||
      changeLoading ||
      userRoleSaving ||
      userPasswordSaving ||
      usernameSaving ||
      promotingSubalternoCi !== null ||
      confirmDialogBusy
    );

  if (!currentUser) {
    return (
      <main className="relative mx-auto flex min-h-dvh w-full max-w-7xl items-center justify-center px-3 py-4 sm:px-6 sm:py-6">
        <section className="relative grid w-full max-w-[1120px] max-h-[min(88vh,780px)] overflow-hidden rounded-[28px] border border-stone-300/70 bg-white/90 shadow-[0_24px_70px_rgba(17,24,39,0.16)] lg:grid-cols-[1fr_minmax(360px,440px)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(141,132,91,0.16),transparent_45%),radial-gradient(circle_at_bottom_right,rgba(102,112,77,0.14),transparent_42%)]" />

          <div className="relative hidden border-r border-stone-300/60 p-8 lg:flex lg:items-center lg:justify-center xl:p-10">
            <Image
              src="/assets/logo-deposito.png"
              alt="Logo Deposito"
              width={420}
              height={420}
              priority
              className="h-auto w-full max-w-[clamp(300px,34vw,460px)] object-contain drop-shadow-[0_18px_34px_rgba(17,24,39,0.22)]"
            />
          </div>

          <div className="relative overflow-y-auto p-5 sm:p-8 lg:flex lg:items-center lg:p-10">
            <div className="w-full lg:mx-auto lg:max-w-[460px]">
              <div className="mb-4 flex justify-center lg:hidden">
                <Image
                  src="/assets/logo-deposito.png"
                  alt="Logo Deposito"
                  width={220}
                  height={220}
                  priority
                  className="h-auto w-36 object-contain drop-shadow-[0_14px_28px_rgba(17,24,39,0.22)] sm:w-44"
                />
              </div>
              <div className="rounded-2xl border border-stone-200/80 bg-white/75 p-4 shadow-sm sm:p-5">
              <h1 className="mt-1 text-3xl font-black tracking-tight text-stone-900 sm:text-4xl">Iniciar sesión</h1>
              <p className="mt-2 text-sm text-stone-600" suppressHydrationWarning>{status}</p>

              {initMessage && showInitCredentials && initCredentials && (
                <div className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${
                  initMessage.type === "success"
                    ? "border-green-300/70 bg-green-50/80 text-green-900"
                    : "border-blue-300/70 bg-blue-50/80 text-blue-900"
                }`}>
                  <p className="font-semibold">{initMessage.text}</p>
                  <div className="mt-3 space-y-1 rounded border border-current/20 bg-white/60 p-2 text-xs">
                    <p><strong>Usuario:</strong> <code className="font-mono">{initCredentials.username}</code></p>
                    <p><strong>Contrasena:</strong> <code className="font-mono">{initCredentials.password}</code></p>
                  </div>
                  <p className="mt-2 text-xs italic">Guarda estas credenciales en un lugar seguro.</p>
                  <button
                    type="button"
                    onClick={() => setShowInitCredentials(false)}
                    className="mt-2 w-full rounded px-2 py-1 text-xs font-semibold hover:bg-current/10"
                  >
                    Entendido
                  </button>
                </div>
              )}

              <form onSubmit={login} className="mt-5 space-y-3">
                <input
                  value={loginUsername}
                  onChange={(event) => setLoginUsername(event.target.value)}
                  placeholder="Usuario"
                  className="w-full rounded-2xl border border-stone-300/90 bg-white/90 px-3 py-2 text-sm"
                />
                <input
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  placeholder="Contrasena"
                  type="password"
                  className="w-full rounded-2xl border border-stone-300/90 bg-white/90 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || loginLoading}
                  className="w-full rounded-2xl bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:opacity-60"
                >
                  {loading || loginLoading ? "Ingresando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetRequest((current) => !current);
                    setResetRequestMessage("");
                    setResetUsername((current) => current || loginUsername.trim());
                  }}
                  className="text-xs font-semibold text-stone-700 underline underline-offset-2 hover:text-stone-900"
                >
                  {showResetRequest ? "Ocultar recuperación de contraseña" : "Olvidé mi contraseña"}
                </button>
              </div>

              {showResetRequest ? (
                <form onSubmit={requestPasswordReset} className="mt-3 space-y-2 rounded-2xl border border-stone-300 bg-stone-50/90 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Recuperar acceso</p>
                  <input
                    value={resetUsername}
                    onChange={(event) => setResetUsername(event.target.value)}
                    placeholder="Usuario"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={resetRequestLoading}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:opacity-60"
                  >
                    {resetRequestLoading ? "Enviando..." : "Enviar enlace mágico"}
                  </button>
                  {resetRequestMessage ? <p className="text-xs text-stone-600">{resetRequestMessage}</p> : null}
                </form>
              ) : null}
              </div>

              <AppInstallCard compact />
            </div>
          </div>
        </section>
        <LoadingOverlay visible={isLoginGlobalBusy} label={loginLoading ? "Ingresando..." : "Cargando página..."} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">

      <DashboardHero
        loading={loading}
        currentUser={currentUser}
        canManageAccount={canManageOwnAccount}
        personalCount={personal.length}
        oficialesSuboficialesCount={oficialesSuboficiales.length}
        equiposRegistradosCount={equipos.length}
        movimientosTotal={movimientosTotal}
        roleLabel={roleLabel}
        onReload={() => void loadData(true, true)}
        onEditOwnUser={changeOwnUsername}
        onChangePassword={() => {
          setChangeCurrentPassword("");
          setChangeNewPassword("");
          setChangeConfirmPassword("");
          setShowChangePassword(true);
        }}
        onLogout={() => void logout()}
      />

      <AppInstallCard />

      <MainNavigation
        activeView={activeView}
        canWrite={canWrite}
        isAdmin={isAdmin}
        showConfigViews={showConfigViews}
        isConfigView={isConfigView}
        configMenuRef={configMenuRef}
        onSelectView={(view) => {
          const currentProfile = getStockLoadProfile(activeView);
          const nextProfile = getStockLoadProfile(view);
          const nextEtiquetadoSection = getEtiquetadoSection(view);
          if (view !== activeView && nextProfile) {
            setStockError(null);
          }
          if (view !== activeView && nextEtiquetadoSection) {
            setEtiquetadoError(null);
          }
          if ((currentProfile?.key ?? null) !== (nextProfile?.key ?? null)) {
            setStockData(null);
          }
          setActiveView(view);
        }}
        onSetConfigViews={setShowConfigViews}
      />


      {inReminderConfigView ? (
        <RecordatoriosConfigView
          tasks={recordatorioTasks}
          config={recordatorioConfig}
          isAdmin={isAdmin}
          currentUserId={currentUser?.usuarioId ?? null}
          userOptions={usuarios}
          loading={recordatoriosLoading}
          saving={recordatoriosSaving}
          error={recordatoriosError}
          onCreateTask={createRecordatorioTask}
          onUpdateTask={updateRecordatorioTask}
          onDeleteTask={deleteRecordatorioTask}
          onToggleWidget={updateRecordatorioConfig}
          onReload={loadRecordatorios}
        />
      ) : null}

      {inCatalogView || (isAdmin && inAdminConfigView) ? (
        <ConfigViews
          activeView={activeView as "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria"}
          isAdmin={isAdmin}
          canWrite={canWrite}
          rangos={rangosConfigView}
          newRangoAbreviacion={newRangoAbreviacion}
          newRangoNombreCompleto={newRangoNombreCompleto}
          newRangoOrden={newRangoOrden}
          editRangoId={editRangoId}
          editRangoAbreviacion={editRangoAbreviacion}
          editRangoNombreCompleto={editRangoNombreCompleto}
          editRangoOrden={editRangoOrden}
          baterias={baterias}
          newBateria={newBateria}
          newBateriaOrden={newBateriaOrden}
          editBateriaId={editBateriaId}
          editBateriaNombre={editBateriaNombre}
          editBateriaOrden={editBateriaOrden}
          equipos={equiposOrdenados}
          newEquipo={newEquipo}
          editEquipoId={editEquipoId}
          editEquipo={editEquipo}
          equiposInactivos={equiposInactivos}
          equiposActivosEnPantalla={equiposActivosEnPantalla}
          hasEquipoOrderDraftChanges={hasEquipoOrderDraftChanges}
          mergeEquipoOrigenId={mergeEquipoOrigenId}
          mergeEquipoDestinoId={mergeEquipoDestinoId}
          usuarios={usuarios}
          newUserRangoId={newUserRangoId}
          userRangoOptions={rangosConfigView}
          newNombre={newNombre}
          newApellido={newApellido}
          newUsername={newUsername}
          newPassword={newPassword}
          newPasswordConfirm={newPasswordConfirm}
          newMailReferencia={newMailReferencia}
          newRole={newRole}
          firmaConfig={firmaConfig}
          firmaConfigDraft={firmaConfigDraft}
          firmaConfigLoading={firmaConfigLoading}
          firmaConfigSaving={firmaConfigSaving}
          firmaConfigError={firmaConfigError}
          auditFilter={auditFilter}
          auditPage={auditPage}
          auditPageSize={auditPageSize}
          auditoriaFiltradaPaginada={auditoriaFiltradaPaginada}
          auditoriaFiltrada={auditoriaFiltrada}
          onNewRangoAbreviacionChange={setNewRangoAbreviacion}
          onNewRangoNombreCompletoChange={setNewRangoNombreCompleto}
          onNewRangoOrdenChange={setNewRangoOrden}
          onEditRangoIdChange={setEditRangoId}
          onEditRangoAbreviacionChange={setEditRangoAbreviacion}
          onEditRangoNombreCompletoChange={setEditRangoNombreCompleto}
          onEditRangoOrdenChange={setEditRangoOrden}
          onCreateRango={() => void createRango()}
          onUpdateRango={(rangoId) => void updateRango(rangoId)}
          onDeleteRango={(rangoId) => void deleteRango(rangoId)}
          onNewBateriaChange={setNewBateria}
          onNewBateriaOrdenChange={setNewBateriaOrden}
          onEditBateriaIdChange={setEditBateriaId}
          onEditBateriaNombreChange={setEditBateriaNombre}
          onEditBateriaOrdenChange={setEditBateriaOrden}
          onCreateBateria={() => void createBateria()}
          onUpdateBateria={(bateriaId) => void updateBateria(bateriaId)}
          onDeleteBateria={(bateriaId) => void deleteBateria(bateriaId)}
          onNewEquipoChange={(value, key) => setNewEquipo((prev) => ({ ...prev, [key]: value }))}
          onEditEquipoIdChange={setEditEquipoId}
          onEditEquipoChange={(value, key) => setEditEquipo((prev) => ({ ...prev, [key]: value }))}
          onCreateEquipo={(event) => void createEquipo(event)}
          onUpdateEquipo={(itemId) => void updateEquipo(itemId)}
          onToggleEquipoActivo={(item) => void toggleEquipoActivo(item)}
          onDeleteEquipo={(itemId) => void deleteEquipo(itemId)}
          onMergeEquipoOrigenIdChange={handleMergeEquipoOrigenChange}
          onMergeEquipoDestinoIdChange={handleMergeEquipoDestinoChange}
          onMergeEquipos={mergeEquipos}
          onSaveEquipoOrder={() => {
            if (!equipoOrderDraftIds) return;
            void saveActiveEquiposOrder(equipoOrderDraftIds);
          }}
          onResetEquipoOrderDraft={() => setEquipoOrderDraftIds(null)}
          renderEquipoCard={renderEquipoCard}
          onNewUserRangoIdChange={setNewUserRangoId}
          onNewNombreChange={setNewNombre}
          onNewApellidoChange={setNewApellido}
          onNewUsernameChange={setNewUsername}
          onNewPasswordChange={setNewPassword}
          onNewPasswordConfirmChange={setNewPasswordConfirm}
          onNewMailReferenciaChange={setNewMailReferencia}
          onNewRoleChange={setNewRole}
          onCreateUsuario={(event) => void createUsuario(event)}
          onEditUsuario={(usuario) => void editUsuario(usuario)}
          onChangeUserRole={(usuario) => void changeUserRole(usuario)}
          onChangeUserPassword={(usuario) => void changeUserPassword(usuario)}
          onConfirmUserEmail={(usuario) => void confirmUserEmail(usuario)}
          onToggleUserActive={(usuario) => void toggleUserActive(usuario)}
          onDeleteUsuario={(usuario) => void deleteUsuario(usuario)}
          onFirmaConfigDraftChange={(key, value) => setFirmaConfigDraft((prev) => ({ ...prev, [key]: value }))}
          onSaveFirmaConfig={(event) => void saveFirmaConfig(event)}
          onAuditFilterChange={setAuditFilter}
          onAuditPageChange={setAuditPage}
          onAuditPageSizeChange={setAuditPageSize}
          onNavigateView={(view) => setActiveView(view)}
          roleLabel={roleLabel}
          roleDescription={roleDescription}
          roleScope={roleScope}
          rangoLabel={rangoLabel}
          auditActionLabel={auditActionLabel}
          auditEntityLabel={auditEntityLabel}
          renderAuditDetalle={renderAuditDetalle}
        />
      ) : null}

      {activeView === "personal_nuevo" ? (
        <PersonalCreateView
          ciPlaceholder={ciPlaceholder}
          newPersonal={newPersonal}
          duplicatePersonal={duplicatePersonal}
          ciHasError={ciHasError}
          ciLooksValid={ciLooksValid}
          ciAlreadyExists={ciAlreadyExists}
          canRegisterPersonal={canRegisterPersonal}
          requiredPersonalCompleted={requiredPersonalCompleted}
          requiredPersonalFields={requiredPersonalFields}
          canSubmitPersonal={canSubmitPersonal}
          creatingPersonal={creatingPersonal}
          rangos={rangos}
          baterias={baterias}
          equiposActivos={equiposActivos}
          tallaOptionsByKey={tallaOptionsByKey}
          maxFechaIngreso={maxFechaIngreso}
          movimientos={newPersonalMovimientos}
          movimientoDraft={newPersonalMovimientoDraft}
          movimientoModalEditing={newPersonalMovimientoEditIndex !== null}
          onBack={() => setActiveView("personal")}
          onSubmit={(event) => void createPersonal(event)}
          onPersonalChange={updateNewPersonalField}
          onOpenMovimientoModal={openNewPersonalMovimientoModal}
          onCloseMovimientoModal={closeNewPersonalMovimientoModal}
          onSubmitMovimientoDraft={saveNewPersonalMovimientoFromModal}
          onEditMovimiento={editNewPersonalMovimiento}
          onRemoveMovimiento={removeNewPersonalMovimiento}
          onMovimientoDraftChange={updateNewPersonalMovimientoDraft}
          onMovimientoDraftItemChange={updateNewPersonalMovimientoDraftItem}
          onAddMovimientoDraftItem={addNewPersonalMovimientoDraftItem}
          onRemoveMovimientoDraftItem={removeNewPersonalMovimientoDraftItem}
        />
      ) : null}

      {activeView === "oficial_nuevo" || activeView === "suboficial_nuevo" ? (
        <OficialSuboficialCreateView
          mode={editingOficialSuboficialCi ? "edit" : "create"}
          ciPlaceholder={ciPlaceholder}
          form={newOficialSuboficial}
          duplicateLabel={duplicateOficialSuboficialLabel}
          ciHasError={!oficialSuboficialCiLooksValid || oficialSuboficialCiAlreadyExists}
          ciLooksValid={oficialSuboficialCiLooksValid}
          ciAlreadyExists={oficialSuboficialCiAlreadyExists}
          canRegister={canRegisterOficialSuboficial}
          requiredCompleted={oficialSuboficialRequiredCompleted}
          requiredFields={oficialSuboficialRequiredFields}
          canSubmit={canSubmitOficialSuboficial}
          saving={creatingOficialSuboficial}
          rangosDisponibles={rangosOficialSuboficialDisponibles}
          lockTipo
          disableCi={editingOficialSuboficialCi !== null}
          tallaOptionsByKey={tallaOptionsByKey}
          onBack={cancelOficialSuboficialForm}
          onSubmit={(event) => void createOficialSuboficial(event)}
          onChange={updateNewOficialSuboficialField}
        />
      ) : null}

      {activeView === "equipo_nuevo" ? (
        <EquipoCreateView
          form={newEquipo}
          saving={loading}
          onBack={() => setActiveView("equipos")}
          onSubmit={(event) => void createEquipo(event)}
          onChange={(key, value) => {
            setNewEquipo((previous) => ({
              ...previous,
              [key]: value,
            }));
          }}
        />
      ) : null}

      {activeView === "bateria_nueva" ? (
        <BateriaCreateView
          nombre={newBateria}
          orden={newBateriaOrden}
          saving={loading}
          suggestedOrder={baterias.length + 1}
          onBack={() => setActiveView("personal")}
          onCreate={() => void createBateria()}
          onNombreChange={setNewBateria}
          onOrdenChange={setNewBateriaOrden}
        />
      ) : null}

      {activeView === "grado_nuevo" ? (
        <RangoCreateView
          abreviacion={newRangoAbreviacion}
          nombreCompleto={newRangoNombreCompleto}
          orden={newRangoOrden}
          saving={loading}
          suggestedOrder={rangos.length + 1}
          onBack={() => setActiveView("personal")}
          onCreate={() => void createRango()}
          onAbreviacionChange={setNewRangoAbreviacion}
          onNombreCompletoChange={setNewRangoNombreCompleto}
          onOrdenChange={setNewRangoOrden}
        />
      ) : null}

      {activeView === "usuario_nuevo" ? (
        <UserCreateView
          isAdmin={isAdmin}
          rangoId={newUserRangoId}
          rangoOptions={rangosConfigView}
          nombre={newNombre}
          apellido={newApellido}
          username={newUsername}
          password={newPassword}
          passwordConfirm={newPasswordConfirm}
          mailReferencia={newMailReferencia}
          role={newRole}
          onBack={() => setActiveView("personal")}
          onSubmit={(event) => void createUsuario(event)}
          onRangoIdChange={setNewUserRangoId}
          onNombreChange={setNewNombre}
          onApellidoChange={setNewApellido}
          onUsernameChange={setNewUsername}
          onPasswordChange={setNewPassword}
          onPasswordConfirmChange={setNewPasswordConfirm}
          onMailReferenciaChange={setNewMailReferencia}
          onRoleChange={setNewRole}
          roleLabel={roleLabel}
          roleDescription={roleDescription}
          roleScope={roleScope}
        />
      ) : null}

      {activeView === "personal" ? (
        <PersonalSection
          loading={loading}
          personal={personal}
          personalFiltrado={personalFiltrado}
          personalFiltradoPaginado={personalFiltradoPaginado}
          baterias={baterias}
          rangos={rangos}
          canWrite={canWrite}
          isAdmin={isAdmin}
          searchCedula={searchCedula}
          searchApellidos={searchApellidos}
          searchNombres={searchNombres}
          bateriaFilter={bateriaFilter}
          hasPersonalFilters={hasPersonalFilters}
          personalPage={personalPage}
          personalPageSize={personalPageSize}
          expandedTallasByCi={expandedTallasByCi}
          editPersonalCi={editPersonalCi}
          editPersonal={editPersonal}
          tallaOptionsByKey={tallaOptionsByKey}
          maxFechaIngreso={maxFechaIngreso}
          onSearchCedulaChange={setSearchCedula}
          onSearchApellidosChange={setSearchApellidos}
          onSearchNombresChange={setSearchNombres}
          onBateriaFilterChange={setBateriaFilter}
          onClearFilters={() => {
            setSearchCedula("");
            setSearchNombres("");
            setSearchApellidos("");
            setBateriaFilter("ALL");
          }}
          onPersonalPageChange={setPersonalPage}
          onPersonalPageSizeChange={setPersonalPageSize}
          onPrintAllDeliverySheets={printAllDeliverySheets}
          onPrintPersonnelByBattery={printPersonnelByBattery}
          onOpenMassEntrega={() => openMassRegistro("ENTREGA")}
          onOpenCreate={() => setActiveView("personal_nuevo")}
          onToggleTallas={toggleTallas}
          onDeletePersonal={(ci) => void deletePersonal(ci)}
          onOpenRegistro={(ci, tipo) => openRegistro(ci, tipo)}
          onOpenPersonalObservacion={(persona) => void openPersonalObservacion(persona)}
          onOpenRegistroViewer={(persona) => void openRegistroViewer(persona)}
          onOpenDeliverySheet={(ci) => {
            setActiveView("hoja-de-entrega");
            setFichaViewingCi(ci);
          }}
          onStartEditPersonal={startEditPersonal}
          onCancelEditPersonal={() => {
            setEditPersonalCi(null);
            setEditPersonal(EMPTY_PERSONAL_FORM);
          }}
          onEditPersonalChange={(field, value) =>
            setEditPersonal((prev) => {
              const next = { ...prev, [field]: value } as PersonalForm;
              if (field === "esReingreso" && value === false) {
                next.fechaIngresoOriginal = "";
              }
              return next;
            })}
          onSaveEditPersonal={(ci) => void updatePersonal(ci)}
          canPromoteEditPersonalToSuboficial={canPromoteEditPersonalToSuboficial}
          promoteEditPersonalBusy={promotingSubalternoCi !== null}
          onPromoteEditPersonalToSuboficial={(ci, adminPassword) =>
            void promoteSargentoToSuboficial(ci, adminPassword)
          }
          onPrintAscensoDeliverySheet={openAscensoDeliverySheet}
        />
      ) : null}

      {activeView === "oficiales" ? (
        <OficialesSuboficialesView
          oficialesSuboficiales={oficialesSuboficiales}
          loading={loading}
          canWrite={canWrite}
          viewType="OFICIAL"
          onOpenCreate={() => openOficialSuboficialCreate("OFICIAL")}
          onStartEdit={startEditOficialSuboficial}
          onReload={() => loadData(true)}
        />
      ) : null}

      {activeView === "suboficiales" ? (
        <OficialesSuboficialesView
          oficialesSuboficiales={oficialesSuboficiales}
          loading={loading}
          canWrite={canWrite}
          viewType="SUBOFICIAL"
          onOpenCreate={() => openOficialSuboficialCreate("SUBOFICIAL")}
          onStartEdit={startEditOficialSuboficial}
          onReload={() => loadData(true)}
        />
      ) : null}

      {activeView === "oficiales_suboficiales_resumen" ? (
        <OficialesSuboficialesResumenView
          oficialesSuboficiales={oficialesSuboficiales}
          loading={loading}
          onReload={() => loadData(true)}
        />
      ) : null}

      {activeView === "hoja_matrix" ? (
        <HojaMatrixView
          data={hojaMatrixData}
          loading={hojaMatrixLoading}
          error={hojaMatrixError}
          onReload={loadHojaMatrix}
        />
      ) : null}

      {activeView === "equipo_resumen" ? (
        <EquipoResumenView
          data={equipoResumenData}
          loading={equipoResumenLoading}
          error={equipoResumenError}
          onReload={loadEquipoResumen}
        />
      ) : null}

      {["stock", "stock_total", "stock_actual", "stock_alta", "stock_baja", "stock_historial", "stock_prestamos"].includes(activeView) ? (
        <StockView
          section={
            activeView === "stock" || activeView === "stock_total"
              ? "total"
              : activeView === "stock_alta"
              ? "alta"
              : activeView === "stock_baja"
                ? "baja"
                : activeView === "stock_historial"
                  ? "historial"
                  : activeView === "stock_prestamos"
                    ? "prestamos"
                  : "actual"
          }
          data={stockData}
          loading={stockLoading}
          error={stockError}
          canWrite={canWrite}
          equipos={equiposOrdenados}
          draft={stockDraft}
          saving={stockSaving}
          maxDate={maxFechaIngreso}
          onDraftChange={(field, value) => setStockDraft((prev) => ({ ...prev, [field]: value }))}
          onDraftItemChange={updateStockDraftItem}
          onAddItem={addStockDraftItem}
          onRemoveItem={removeStockDraftItem}
          onSubmit={() => void saveStockOperation()}
          personal={personal}
          oficialesSuboficiales={oficialesSuboficiales}
          prestamoDraft={prestamoDraft}
          prestamoSaving={prestamoSaving}
          returningPrestamoId={returningPrestamoId}
          onPrestamoDraftChange={(field, value) =>
            setPrestamoDraft((prev) => {
              if (field === "destinatarioTipo") {
                return { ...prev, destinatarioTipo: value as PrestamoDraft["destinatarioTipo"], destinatarioCi: "" };
              }
              return { ...prev, [field]: value };
            })
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, items) => void returnPrestamo(prestamoId, fechaDevolucion, items)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}

      {activeView === "formularios" ? (
        <FormulariosPrestamosView
          data={stockData}
          loading={stockLoading}
          error={stockError}
          canWrite={canWrite}
          isAdmin={isAdmin}
          equipos={equiposOrdenados}
          personal={personal}
          oficialesSuboficiales={oficialesSuboficiales}
          prestamoDraft={prestamoDraft}
          prestamoSaving={prestamoSaving}
          returningPrestamoId={returningPrestamoId}
          maxDate={maxFechaIngreso}
          onPrestamoDraftChange={(field, value) =>
            setPrestamoDraft((prev) => {
              if (field === "destinatarioTipo") {
                return { ...prev, destinatarioTipo: value as PrestamoDraft["destinatarioTipo"], destinatarioCi: "" };
              }
              return { ...prev, [field]: value };
            })
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, items) => void returnPrestamo(prestamoId, fechaDevolucion, items)}
          onDeletePrestamo={(prestamoId) => void deletePrestamo(prestamoId)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}

      {inEtiquetadoView && activeEtiquetadoSection ? (
        <EtiquetadoView
          section={activeEtiquetadoSection}
          data={etiquetadoData}
          loading={etiquetadoLoading}
          error={etiquetadoError}
          canWrite={canWrite}
          onReload={() => void reloadEtiquetadoData()}
          onCreateItem={(input) => void createEtiquetadoItem(input)}
          onCreateEstanteria={(codigo, piso) => void createEtiquetadoEstanteria(codigo, piso)}
          onDeleteEstanteria={(codigo, piso) => void deleteEtiquetadoEstanteria(codigo, piso)}
          onCreateCodigoSIE={(input) => void createEtiquetadoCodigoSIE(input)}
          onDeleteCodigoSIE={(codigo) => void deleteEtiquetadoCodigoSIE(codigo)}
          onCreateCaja={(input) => void createEtiquetadoCaja(input)}
          onDeleteCaja={(codigoDepositoGeneral) => void deleteEtiquetadoCaja(codigoDepositoGeneral)}
          onPrintCaja={(codigoDepositoGeneral, orientacion) => printEtiquetaCaja(codigoDepositoGeneral, orientacion)}
          onPrintTodas={(orientacion) => printTodasEtiquetas(orientacion)}
        />
      ) : null}

      {activeView === "tallas_resumen" ? (
        <TallasResumenView personal={personal} baterias={baterias} oficialesSuboficiales={oficialesSuboficiales} />
      ) : null}

      <MergeEquipoModal
        isOpen={mergeEquipoDialog !== null}
        sourceName={mergeEquipoSource?.nombre ?? ""}
        targetItemId={mergeEquipoDialogTargetId}
        targetOptions={mergeEquipoTargetOptions.map((equipo) => ({ itemId: equipo.itemId, nombre: equipo.nombre }))}
        saving={mergeEquipoSaving}
        onTargetChange={updateMergeEquipoDialogTarget}
        onClose={closeMergeEquipoDialog}
        onSubmit={() => void submitMergeEquipoDialog()}
      />

      
      <HomeDialogsLayer
        showChangePassword={showChangePassword}
        changeCurrentPassword={changeCurrentPassword}
        changeNewPassword={changeNewPassword}
        changeConfirmPassword={changeConfirmPassword}
        changeLoading={changeLoading}
        onChangeCurrentPassword={setChangeCurrentPassword}
        onChangeNewPassword={setChangeNewPassword}
        onChangeConfirmPassword={setChangeConfirmPassword}
        onCloseChangePassword={() => setShowChangePassword(false)}
        onSubmitChangePassword={() => void submitChangePassword()}
        userRoleDialog={userRoleDialog}
        userRoleSaving={userRoleSaving}
        onUserRoleChange={(role) =>
          setUserRoleDialog((current) => (current ? { ...current, nextRole: role } : current))
        }
        onCloseUserRole={closeUserRoleDialog}
        onSubmitUserRole={() => void submitUserRoleChange()}
        userPasswordDialog={userPasswordDialog}
        userPasswordSaving={userPasswordSaving}
        onUserPasswordChange={(field, value) =>
          setUserPasswordDialog((current) => (current ? { ...current, [field]: value } : current))
        }
        onCloseUserPassword={closeUserPasswordDialog}
        onSubmitUserPassword={() => void submitUserPasswordChange()}
        usernameDialog={usernameDialog}
        usernameSaving={usernameSaving}
        userRangoOptions={rangosConfigView}
        onUsernameDialogChange={(field, value) =>
          setUsernameDialog((current) => (current ? { ...current, [field]: value } : current))
        }
        onCloseUsernameDialog={closeUsernameDialog}
        onSubmitUsernameDialog={() => void submitUsernameChange()}
        confirmDialog={confirmDialog}
        confirmDialogBusy={confirmDialogBusy}
        onCloseConfirmDialog={closeConfirmDialog}
        onConfirmDialogAccept={() => void confirmDialogAccept()}
        registroViewer={registroViewer}
        registroViewerRowsPaginados={registroViewerRowsPaginados}
        registroViewerPage={registroViewerPage}
        registroViewerPageSize={registroViewerPageSize}
        canWrite={canWrite}
        canDelete={canDeleteRegistros}
        onRectifyRegistro={rectifyRegistro}
        onRegistroViewerPageChange={setRegistroViewerPage}
        onRegistroViewerPageSizeChange={setRegistroViewerPageSize}
        onCloseRegistroViewer={() => setRegistroViewer(null)}
        registroDraft={registroDraft}
        personaRegistro={personaRegistro}
        personalFiltrado={personalFiltrado}
        equiposOrdenados={equiposOrdenados}
        maxFechaIngreso={maxFechaIngreso}
        registroSaving={registroSaving}
        onCloseRegistroEditor={() => setRegistroDraft(null)}
        onRegistroDraftChange={(field, value) => setRegistroDraft((prev) => (prev ? { ...prev, [field]: value } : prev))}
        onToggleRegistroDestinatario={toggleRegistroDestinatario}
        onSelectAllRegistroDestinatarios={selectAllRegistroDestinatarios}
        onClearRegistroDestinatarios={clearRegistroDestinatarios}
        onRegistroItemChange={updateRegistroItem}
        onAddRegistroItem={addRegistroItem}
        onRemoveRegistroItem={removeRegistroItem}
        onDeleteRegistro={deleteRegistro}
        onSubmitRegistro={() => void saveRegistro()}
        personalObservacionDraft={personalObservacionDraft}
        personalObservacionSaving={personalObservacionSaving}
        onClosePersonalObservacion={() => setPersonalObservacionDraft(null)}
        onResetPersonalObservacion={resetPersonalObservacionForm}
        onEditPersonalObservacion={editPersonalObservacion}
        onDeletePersonalObservacion={deletePersonalObservacion}
        onPersonalObservacionDateChange={(value) =>
          setPersonalObservacionDraft((prev) => (prev ? { ...prev, fecha: value } : prev))
        }
        onPersonalObservacionTextChange={(value) =>
          setPersonalObservacionDraft((prev) => (prev ? { ...prev, texto: value } : prev))
        }
        onSubmitPersonalObservacion={() => void savePersonalObservacion()}
      />

      {activeView === "hoja-de-entrega" && fichaViewingCi ? (

        <HojaDeEntregaView ci={fichaViewingCi} onClose={() => setActiveView("personal")} />
      ) : null}

      {recordatorioConfig.mostrarMuneco && activeView !== "recordatorios" ? (
        <SoldadoRecordatorioWidget
          tasks={recordatorioTasks}
          loading={recordatoriosLoading}
          saving={recordatoriosSaving}
          onCreateTask={createRecordatorioTask}
          onToggleTask={(tareaId, completada) => updateRecordatorioTask(tareaId, { completada })}
          onOpenConfig={() => setActiveView("recordatorios")}
        />
      ) : null}

      <LoadingOverlay visible={isAppGlobalBusy} label="Actualizando informacion..." />

    </main>
  );
}
