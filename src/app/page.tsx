"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
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
import { renderSoldadoRecordatorioWidget } from "./components/home/SoldadoRecordatorioWidgetStrategyImpl";
import { AppInstallCard } from "./components/pwa/AppInstallCard";
import { HomeDialogsLayer } from "./components/modals/HomeDialogsLayer";
import { ChangePasswordModal } from "./components/modals/ChangePasswordModal";
import { PersonalContactModal } from "./components/modals/PersonalContactModal";
import { MergeEquipoModal } from "./components/modals/MergeEquipoModal";
import {
  PersonaProfileView,
  type PersonaProfileEquipmentRow,
  type PersonaProfileIdentity,
  type PersonaProfileState,
  type PersonaProfileTimelineEntry,
  type PersonaProfileTipo,
} from "./components/views/PersonaProfileView";
import { PersonalSection } from "./components/personal/PersonalSection";
import { ConfigViews } from "./components/views/ConfigViews";
import { BateriaCreateView } from "./components/views/BateriaCreateView";
import { EquipoResumenView } from "./components/views/EquipoResumenView";
import { EquipoCreateView } from "./components/views/EquipoCreateView";
import { HojaDeEntregaView } from "./components/views/HojaDeEntregaView";
import { HojaMatrixView } from "./components/views/HojaMatrixView";
import { FormulariosPrestamosView, type PrestamoEditPayload } from "./components/views/FormulariosPrestamosView";
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
  SoldadoWidgetVariant,
  FirmaConfig,
  UsuarioAdmin,
  Talla,
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
  PrestamoStockEntry,
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
import { isValidEmailAddress } from "@/lib/email-address";
import type { HojasEntregaEmailJobSnapshot } from "@/lib/hojas-entrega-email-job";

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

type EtiquetadoSection = "codigos_sie" | "listado_cajas" | "imprimir_todas";
type LoginMode = "USUARIO" | "PERSONAL";
type PersonalSelfProfileResponse = Omit<PersonaProfileState, "loading" | "error">;
type PersonalSelfContactResponse = {
  ci: string;
  telefonoContacto: string | null;
  mailReferencia: string | null;
};

type HojaEntregaSnapshot = {
  matrix: Array<{
    item: string;
    entregaTotal: number;
    devolucionTotal: number;
  }>;
};

type PersonaProfileReturnView = Extract<MainView, "personal" | "oficiales" | "suboficiales">;
type BulkDeliveryPdfPhase =
  | "idle"
  | "requesting"
  | "rendering-server"
  | "downloading-response"
  | "preparing-download"
  | "triggering-download";

type HojasEntregaPdfServerMetrics = {
  loadingMs: number | null;
  renderingMs: number | null;
  totalMs: number | null;
  hojas: number | null;
};

const STATUS_VERIFYING_SESSION = "Verificando sesión...";
const STATUS_STARTING_SESSION = "Iniciando sesión...";
const STATUS_ENTER_CREDENTIALS = "Ingresa tus credenciales.";
const STATUS_SESSION_CLOSED = "Sesion cerrada. Ingresa tus credenciales.";
const AUDIT_USER_FILTER_ALL = "__ALL__";
const AUDIT_USER_FILTER_SYSTEM = "__SYSTEM__";
const BULK_DELIVERY_EMAIL_TOAST_ID = "bulk-delivery-email-job";
const DEFAULT_BULK_DELIVERY_PDF_MS_PER_HOJA_ESTIMATE = 450;
const MAX_BULK_DELIVERY_PDF_LOG_ENTRIES = 12;
const DISPLAY_BULK_DELIVERY_PDF_LOG_ENTRIES = 4;
const SOLDADO_WIDGET_VARIANT_STORAGE_KEY = "soldado-recordatorio-widget-variant";

function isActiveHojasEntregaEmailJob(
  job: HojasEntregaEmailJobSnapshot | null | undefined,
): job is HojasEntregaEmailJobSnapshot & { status: "queued" | "running" } {
  return job?.status === "queued" || job?.status === "running";
}

function describeHojasEntregaEmailJob(job: HojasEntregaEmailJobSnapshot) {
  const progressLabel = job.progress > 0 && job.progress < 100 ? ` (${job.progress}%)` : "";
  const fileLabel = job.fileName ? `\nArchivo: ${job.fileName}` : "";
  const recipientLabel = job.to ? `\nDestino: ${job.to}` : "";
  return `${job.message}${progressLabel}${recipientLabel}${fileLabel}`;
}

function normalizeDurationMs(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  return Math.round(value);
}

function parseHojasEntregaPdfMetricsHeader(value: string | null): HojasEntregaPdfServerMetrics | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<HojasEntregaPdfServerMetrics>;
    return {
      loadingMs: normalizeDurationMs(parsed.loadingMs),
      renderingMs: normalizeDurationMs(parsed.renderingMs),
      totalMs: normalizeDurationMs(parsed.totalMs),
      hojas: typeof parsed.hojas === "number" && Number.isFinite(parsed.hojas) ? Math.max(0, Math.trunc(parsed.hojas)) : null,
    };
  } catch {
    return null;
  }
}

function formatDurationForStatus(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  if (ms < 1000) return `${Math.max(0, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatElapsedTimer(ms: number | null | undefined) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatClockTime(value: Date) {
  return value.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function syncBulkDeliveryEmailToast(
  job: HojasEntregaEmailJobSnapshot,
  onCancel?: (jobId: string) => void,
) {
  const description = describeHojasEntregaEmailJob(job);

  if (job.status === "completed") {
    toast.success(job.to ? `PDF enviado a ${job.to}` : "PDF enviado por correo.", {
      id: BULK_DELIVERY_EMAIL_TOAST_ID,
      description,
      duration: 8000,
    });
    return;
  }

  if (job.status === "failed") {
    toast.error("Error al enviar PDF por correo.", {
      id: BULK_DELIVERY_EMAIL_TOAST_ID,
      description,
      duration: 9000,
    });
    return;
  }

  if (job.status === "cancelled") {
    toast.info("Envio cancelado.", {
      id: BULK_DELIVERY_EMAIL_TOAST_ID,
      description,
      duration: 7000,
    });
    return;
  }

  toast.loading("Enviando PDF por correo en segundo plano...", {
    id: BULK_DELIVERY_EMAIL_TOAST_ID,
    description,
    duration: Infinity,
    cancel: onCancel
      ? {
          label: "Cancelar",
          onClick: () => onCancel(job.jobId),
        }
      : undefined,
  });
}

function rangoLooksLikeSargento(rango: { abreviacion: string; nombreCompleto: string } | null | undefined) {
  if (!rango) return false;
  const normalized = normalizeSearchTerm(`${rango.abreviacion} ${rango.nombreCompleto}`);
  const hasSargento = normalized.includes("sargento") || normalized.includes("sgto");
  const hasPrimero = /\b(primero|1ro|1ero|1er)\b/.test(normalized);
  return hasSargento && !hasPrimero;
}

function isAbortError(error: unknown) {
  if (error instanceof DOMException) return error.name === "AbortError";
  if (error instanceof Error) return error.name === "AbortError";
  return false;
}

function isSoldadoWidgetVariant(value: string | null): value is SoldadoWidgetVariant {
  return value === "CLASICO" || value === "TACTICO";
}

export default function Home() {
  const { data: session } = useSession();
  const ciPlaceholder = `Ej: ${generatePlaceholderUruguayanCi()}`;
  const [status, setStatus] = useState(STATUS_VERIFYING_SESSION);
  const [activeView, setActiveView] = useState<MainView>("dashboard");
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
    loadAdminData,
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
  } = useHomeData({ onStatusChange: setStatus, activeView });
  const [loginMode, setLoginMode] = useState<LoginMode>("USUARIO");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
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
  const [showPersonalContactModal, setShowPersonalContactModal] = useState(false);
  const [personalContactTelefono, setPersonalContactTelefono] = useState("");
  const [personalContactMail, setPersonalContactMail] = useState("");
  const [personalContactSaving, setPersonalContactSaving] = useState(false);
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
  const [editingPrestamoId, setEditingPrestamoId] = useState<string | null>(null);
  const [personalObservacionDraft, setPersonalObservacionDraft] = useState<PersonalObservacionDraft | null>(null);
  const [personalObservacionSaving, setPersonalObservacionSaving] = useState(false);
  const [registroViewer, setRegistroViewer] = useState<RegistroViewerState | null>(null);
  const [registroViewerPage, setRegistroViewerPage] = useState(1);
  const [registroViewerPageSize, setRegistroViewerPageSize] = useState(20);
  const [personaProfile, setPersonaProfile] = useState<PersonaProfileState | null>(null);
  const [personalSelfProfile, setPersonalSelfProfile] = useState<PersonaProfileState | null>(null);
  const [personaProfileReturnView, setPersonaProfileReturnView] = useState<PersonaProfileReturnView>("personal");
  const [fichaViewingCi, setFichaViewingCi] = useState<string | null>(null);
  const [showConfigViews, setShowConfigViews] = useState(false);
  const [etiquetadoData, setEtiquetadoData] = useState<EtiquetadoDashboardData | null>(null);
  const [etiquetadoLoading, setEtiquetadoLoading] = useState(false);
  const [etiquetadoError, setEtiquetadoError] = useState<string | null>(null);
  const [recordatorioTasks, setRecordatorioTasks] = useState<RecordatorioTarea[]>([]);
  const [recordatorioConfig, setRecordatorioConfig] = useState<RecordatorioConfig>({ mostrarMuneco: true });
  const [soldadoWidgetVariant, setSoldadoWidgetVariant] = useState<SoldadoWidgetVariant>(() => {
    if (typeof window === "undefined") return "CLASICO";
    const stored = window.localStorage.getItem(SOLDADO_WIDGET_VARIANT_STORAGE_KEY);
    return isSoldadoWidgetVariant(stored) ? stored : "CLASICO";
  });
  const [recordatoriosLoading, setRecordatoriosLoading] = useState(false);
  const [recordatoriosSaving, setRecordatoriosSaving] = useState(false);
  const [recordatoriosError, setRecordatoriosError] = useState<string | null>(null);
  const recordatorioToastShownRef = useRef<string | null>(null);
  const recordatoriosRequestRef = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });
  const etiquetadoRequestRef = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });
  const personaProfileRequestRef = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });
  const configMenuRef = useRef<HTMLDivElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmDialogBusy, setConfirmDialogBusy] = useState(false);
  const [creatingPersonal, setCreatingPersonal] = useState(false);
  const [creatingOficialSuboficial, setCreatingOficialSuboficial] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("TODOS");
  const [auditUserFilter, setAuditUserFilter] = useState<string>(AUDIT_USER_FILTER_ALL);
  const [personalPage, setPersonalPage] = useState(1);
  const [personalPageSize, setPersonalPageSize] = useState(25);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(25);
  const [bulkDeliveryPdfLoading, setBulkDeliveryPdfLoading] = useState(false);
  const [bulkDeliveryPdfPhase, setBulkDeliveryPdfPhase] = useState<BulkDeliveryPdfPhase>("idle");
  const [bulkDeliveryPdfStartedAtMs, setBulkDeliveryPdfStartedAtMs] = useState<number | null>(null);
  const [bulkDeliveryPdfElapsedMs, setBulkDeliveryPdfElapsedMs] = useState(0);
  const [bulkDeliveryPdfMsPerHojaEstimate, setBulkDeliveryPdfMsPerHojaEstimate] = useState(
    DEFAULT_BULK_DELIVERY_PDF_MS_PER_HOJA_ESTIMATE,
  );
  const [bulkDeliveryPdfLogEntries, setBulkDeliveryPdfLogEntries] = useState<string[]>([]);
  const [bulkDeliveryEmailJob, setBulkDeliveryEmailJob] = useState<HojasEntregaEmailJobSnapshot | null>(null);
  const bulkDeliveryEmailPollTimeoutRef = useRef<number | null>(null);
  const bulkDeliveryPdfLastLoggedPhaseRef = useRef<BulkDeliveryPdfPhase | null>(null);
  const lastToastStatusRef = useRef<string | null>(null);

  const isPersonalAccount = currentUser?.accountType === "PERSONAL";
  const isAdmin = currentUser?.accountType === "SISTEMA" && currentUser?.rol === "ADMIN";
  const canWrite = currentUser?.accountType === "SISTEMA" && (currentUser?.rol === "ADMIN" || currentUser?.rol === "EDITOR");
  const sessionReferenceEmail = typeof session?.user?.email === "string" ? session.user.email.trim() : "";
  const currentUserReferenceEmail =
    typeof currentUser?.mailReferencia === "string" && currentUser.mailReferencia.trim() !== ""
      ? currentUser.mailReferencia.trim()
      : sessionReferenceEmail;
  const bulkDeliveryEmailBusy = isActiveHojasEntregaEmailJob(bulkDeliveryEmailJob);
  const bulkDeliveryEmailDisabledReason = bulkDeliveryEmailBusy
    ? "Ya hay un envio de hojas de entrega en curso. Puedes seguirlo desde la notificacion flotante."
    : !currentUserReferenceEmail
      ? "Configura un correo de referencia en tu usuario para habilitar este envio."
      : null;
  const canManageOwnAccount = canWrite || isPersonalAccount;
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
  const auditUserOptions = useMemo(() => {
    const uniqueUsers = new Map<string, { value: string; label: string }>();
    let hasSystemRecords = false;

    for (const usuario of usuarios) {
      if (uniqueUsers.has(usuario.usuarioId)) continue;
      uniqueUsers.set(usuario.usuarioId, {
        value: usuario.usuarioId,
        label: `${usuario.username} (${roleLabel(usuario.rol)})`,
      });
    }

    for (const log of auditoria) {
      if (!log.usuario?.usuarioId) {
        hasSystemRecords = true;
        continue;
      }
      if (uniqueUsers.has(log.usuario.usuarioId)) continue;
      uniqueUsers.set(log.usuario.usuarioId, {
        value: log.usuario.usuarioId,
        label: `${log.usuario.username} (${roleLabel(log.usuario.rol)})`,
      });
    }

    const dynamicOptions = Array.from(uniqueUsers.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
    const options = [{ value: AUDIT_USER_FILTER_ALL, label: "Todos los usuarios" }, ...dynamicOptions];

    if (hasSystemRecords) {
      options.splice(1, 0, { value: AUDIT_USER_FILTER_SYSTEM, label: "Sistema (sin usuario)" });
    }

    return options;
  }, [auditoria, usuarios]);
  const auditoriaFiltrada = useMemo(() => {
    let filtered = auditoria;

    if (auditFilter === "MOVIMIENTOS") {
      filtered = filtered.filter((log) => log.entidad === "REGISTRO");
    } else if (auditFilter === "AUTENTICACION") {
      filtered = filtered.filter((log) => log.entidad === "AUTH");
    }

    if (auditUserFilter === AUDIT_USER_FILTER_SYSTEM) {
      filtered = filtered.filter((log) => !log.usuario?.usuarioId);
    } else if (auditUserFilter !== AUDIT_USER_FILTER_ALL) {
      filtered = filtered.filter((log) => log.usuario?.usuarioId === auditUserFilter || log.usuarioId === auditUserFilter);
    }

    return filtered;
  }, [auditFilter, auditUserFilter, auditoria]);
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
  const isConfigView = inCatalogView || inReminderConfigView || inAdminConfigView || activeView === "usuario_nuevo";
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

  useEffect(() => {
    if (!currentUser || currentUser.rol !== "ADMIN") return;
    if (!(inAdminConfigView || activeView === "usuario_nuevo")) return;
    void loadAdminData();
  }, [activeView, currentUser, inAdminConfigView, loadAdminData]);

  const loadRecordatorios = useCallback(async () => {
    if (!currentUser) {
      recordatoriosRequestRef.current.controller?.abort();
      recordatoriosRequestRef.current.controller = null;
      setRecordatorioTasks([]);
      setRecordatorioConfig({ mostrarMuneco: true });
      setRecordatoriosError(null);
      return;
    }
    if (currentUser.accountType !== "SISTEMA") {
      recordatoriosRequestRef.current.controller?.abort();
      recordatoriosRequestRef.current.controller = null;
      setRecordatorioTasks([]);
      setRecordatorioConfig({ mostrarMuneco: true });
      setRecordatoriosError(null);
      return;
    }

    recordatoriosRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = recordatoriosRequestRef.current.id + 1;
    recordatoriosRequestRef.current = { id: requestId, controller };

    setRecordatoriosLoading(true);
    setRecordatoriosError(null);
    try {
      const [tasksData, configData] = await Promise.all([
        api<RecordatorioTarea[]>("/api/tareas", { signal: controller.signal }),
        api<RecordatorioConfig>("/api/tareas/config", { signal: controller.signal }),
      ]);

      if (recordatoriosRequestRef.current.id !== requestId) return;
      setRecordatorioTasks(tasksData);
      setRecordatorioConfig(configData);
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (recordatoriosRequestRef.current.id !== requestId) return;
      const message = error instanceof Error ? error.message : "No se pudieron cargar los recordatorios.";
      setRecordatoriosError(message);
    } finally {
      if (recordatoriosRequestRef.current.id !== requestId) return;
      setRecordatoriosLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SOLDADO_WIDGET_VARIANT_STORAGE_KEY, soldadoWidgetVariant);
  }, [soldadoWidgetVariant]);

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

  const toggleSoldadoWidgetVariant = useCallback(() => {
    setSoldadoWidgetVariant((current) => (current === "CLASICO" ? "TACTICO" : "CLASICO"));
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

  useEffect(() => {
    return () => {
      recordatoriosRequestRef.current.controller?.abort();
      etiquetadoRequestRef.current.controller?.abort();
      personaProfileRequestRef.current.controller?.abort();
    };
  }, []);

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
    if (activeView === "persona_ficha") return;
    personaProfileRequestRef.current.controller?.abort();
    personaProfileRequestRef.current.controller = null;
    setPersonaProfile(null);
  }, [activeView]);

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
    if (auditUserOptions.some((option) => option.value === auditUserFilter)) return;
    setAuditUserFilter(AUDIT_USER_FILTER_ALL);
  }, [auditUserFilter, auditUserOptions]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditFilter, auditPageSize, auditUserFilter]);

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
      if (!(event.target instanceof Node)) return;
      if (configMenuRef.current?.contains(event.target)) return;
      const configDropdown = document.getElementById("menu-configuracion");
      if (configDropdown?.contains(event.target)) return;
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
    setPersonaProfile(null);
    setPersonalSelfProfile(null);
    setPersonaProfileReturnView("personal");
    setConfirmDialog(null);
    setConfirmDialogBusy(false);
    setPersonalPage(1);
    setPersonalPageSize(25);
    setAuditUserFilter(AUDIT_USER_FILTER_ALL);
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

  const reloadAdminData = useCallback(async (showSpinner = false) => {
    await Promise.all([loadData(showSpinner), loadAdminData()]);
  }, [loadAdminData, loadData]);

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
    if (view === "etiquetado_registrar_caja") return "listado_cajas";
    if (view === "etiquetado_listado_cajas") return "listado_cajas";
    if (view === "etiquetado_imprimir_todas") return "imprimir_todas";
    return null;
  }, []);

  const activeEtiquetadoSection = useMemo(
    () => getEtiquetadoSection(activeView),
    [activeView, getEtiquetadoSection],
  );

  const handleSelectMainView = useCallback(
    (view: MainView) => {
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
    },
    [activeView, getEtiquetadoSection, getStockLoadProfile, setStockData, setStockError],
  );

  const loadEtiquetadoData = useCallback(async () => {
    etiquetadoRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = etiquetadoRequestRef.current.id + 1;
    etiquetadoRequestRef.current = { id: requestId, controller };

    setEtiquetadoLoading(true);
    setEtiquetadoError(null);
    try {
      const data = await api<EtiquetadoDashboardData>("/api/etiquetado/dashboard", { signal: controller.signal });
      if (etiquetadoRequestRef.current.id !== requestId) return;
      setEtiquetadoData(data);
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (etiquetadoRequestRef.current.id !== requestId) return;
      setEtiquetadoError(error instanceof Error ? error.message : "No se pudo cargar el modulo de etiquetado.");
    } finally {
      if (etiquetadoRequestRef.current.id !== requestId) return;
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

  useEffect(() => {
    if (activeEtiquetadoSection) return;
    etiquetadoRequestRef.current.controller?.abort();
    etiquetadoRequestRef.current.controller = null;
  }, [activeEtiquetadoSection]);

  const reloadEtiquetadoData = useCallback(async () => {
    await loadEtiquetadoData();
  }, [loadEtiquetadoData]);

  const reloadCurrentViewData = useCallback(
    async (showSpinner = false) => {
      if (!currentUser) {
        await loadData(showSpinner);
        return;
      }

      if (activeStockLoadProfile) {
        await reloadActiveStockData();
        return;
      }

      if (activeEtiquetadoSection) {
        await reloadEtiquetadoData();
        return;
      }

      if (activeView === "hoja_matrix") {
        await loadHojaMatrix();
        return;
      }

      if (activeView === "equipo_resumen") {
        await loadEquipoResumen();
        return;
      }

      if (activeView === "recordatorios") {
        await loadRecordatorios();
        return;
      }

      if (inAdminConfigView || activeView === "usuario_nuevo") {
        if (currentUser.rol === "ADMIN") {
          await reloadAdminData(showSpinner);
          return;
        }
      }

      await loadData(showSpinner);
    },
    [
      activeEtiquetadoSection,
      activeStockLoadProfile,
      activeView,
      currentUser,
      inAdminConfigView,
      loadData,
      loadEquipoResumen,
      loadHojaMatrix,
      loadRecordatorios,
      reloadActiveStockData,
      reloadAdminData,
      reloadEtiquetadoData,
    ],
  );

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
    async (nombreEstanteria: string, piso: number) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setStatus("Registrando estantería...");
      try {
        await api("/api/etiquetado/estanterias", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombreEstanteria, piso }),
        });
        setStatus("Estanteria registrada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo registrar la estantería.");
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

      setStatus("Eliminando estantería...");
      try {
        await api(`/api/etiquetado/estanterias/${encodeURIComponent(codigo)}/${encodeURIComponent(String(piso))}`, {
          method: "DELETE",
        });
        setStatus("Estanteria eliminada.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo eliminar la estantería.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const createEtiquetadoCodigoSIE = useCallback(
    async (input: { codigo: string; talla: string; itemId: string; allowDuplicateCodigo?: boolean }) => {
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setStatus("Registrando código SIE...");
      try {
        await api("/api/etiquetado/codigos-sie", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        setStatus("Código SIE registrado.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo registrar el código SIE.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const updateEtiquetadoCodigoSIE = useCallback(
    async (input: { originalCodigoSIEId: string; originalCodigo: string; codigo: string; talla: string; itemId: string }) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      setStatus("Actualizando código SIE...");
      try {
        await api(
          `/api/etiquetado/codigos-sie/${encodeURIComponent(input.originalCodigo)}?id=${encodeURIComponent(input.originalCodigoSIEId)}`,
          {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo: input.codigo,
            talla: input.talla,
            itemId: input.itemId,
          }),
          },
        );
        setStatus("Código SIE actualizado.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo actualizar el código SIE.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const deleteEtiquetadoCodigoSIE = useCallback(
    async (codigoSIEId: string, codigo: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }

      setStatus("Eliminando código SIE...");
      try {
        await api(`/api/etiquetado/codigos-sie/${encodeURIComponent(codigo)}?id=${encodeURIComponent(codigoSIEId)}`, {
          method: "DELETE",
        });
        setStatus("Código SIE eliminado.");
        await loadEtiquetadoData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo eliminar el código SIE.");
      }
    },
    [canWrite, loadEtiquetadoData],
  );

  const createEtiquetadoCaja = useCallback(
    async (input: {
      codigoDepositoGeneral: number;
      estanteria: string;
      items: Array<{
        itemId: string;
        cantidad: number;
      }>;
      codigosSIEIds: string[];
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
    (options: {
      codigos?: number[];
      orientacion?: "horizontal" | "vertical";
    }) => {
      const params = new URLSearchParams();
      params.set("autoprint", "1");
      params.set("orientacion", options.orientacion ?? "horizontal");
      if (options.codigos && options.codigos.length > 0) {
        params.set("cajas", options.codigos.join(","));
      }
      const popup = window.open(`/etiquetas-cajas?${params.toString()}`, "_blank", "noopener,noreferrer");
      if (!popup) {
        setStatus("Permite ventanas emergentes para imprimir las etiquetas.");
        return false;
      }
      return true;
    },
    [setStatus],
  );

  const printEtiquetaCaja = useCallback(
    (codigoDepositoGeneral: number, orientacion: "horizontal" | "vertical") => {
      openEtiquetasPrint({ codigos: [codigoDepositoGeneral], orientacion });
    },
    [openEtiquetasPrint],
  );

  const printTodasEtiquetas = useCallback(
    (cajas: Array<{ codigoDepositoGeneral: number; orientacion: "horizontal" | "vertical" }>) => {
      const cajasNormalizadas = Array.isArray(cajas)
        ? cajas.filter(
            (entry) =>
              Number.isInteger(entry.codigoDepositoGeneral) &&
              entry.codigoDepositoGeneral > 0 &&
              (entry.orientacion === "horizontal" || entry.orientacion === "vertical"),
          )
        : [];
      const codigosHorizontal = cajasNormalizadas
        .filter((entry) => entry.orientacion === "horizontal")
        .map((entry) => entry.codigoDepositoGeneral);
      const codigosVertical = cajasNormalizadas
        .filter((entry) => entry.orientacion === "vertical")
        .map((entry) => entry.codigoDepositoGeneral);

      const openedHorizontal =
        codigosHorizontal.length > 0
          ? openEtiquetasPrint({ orientacion: "horizontal", codigos: codigosHorizontal })
          : true;
      const openedVertical =
        codigosVertical.length > 0
          ? openEtiquetasPrint({ orientacion: "vertical", codigos: codigosVertical })
          : true;

      if (!openedHorizontal || !openedVertical) {
        return;
      }

      if (codigosHorizontal.length > 0 && codigosVertical.length > 0) {
        setStatus(
          `Se abrieron 2 impresiones: ${codigosHorizontal.length} horizontal(es) y ${codigosVertical.length} vertical(es).`,
        );
      }
    },
    [openEtiquetasPrint, setStatus],
  );

  const printListadoCajas = useCallback(() => {
    const params = new URLSearchParams();
    params.set("autoprint", "1");
    const popup = window.open(`/listado-cajas?${params.toString()}`, "_blank", "noopener,noreferrer");
    if (!popup) {
      setStatus("Permite ventanas emergentes para imprimir el listado de cajas.");
    }
  }, []);

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
      const codigosSIEImpacto = impacto.codigosSIE.map((codigo) => {
        const talla = codigo.talla ? ` | talla ${codigo.talla}` : "";
        return `- ${codigo.codigo}${talla} | apariciones en cajas: ${codigo.aparicionesEnCajas}`;
      });
      const cajasImpacto = impacto.cajas.map((caja) => {
        const detalles = [
          caja.tieneRelacionEquipoDirecta ? "incluye este equipo" : null,
          caja.codigosSIERelacionados.length > 0 ? `códigos SIE: ${caja.codigosSIERelacionados.join(", ")}` : null,
          caja.quedaSinEquipos ? "queda sin equipos seleccionados" : null,
        ]
          .filter((detail): detail is string => detail !== null)
          .join(" | ");
        return `- Caja ${caja.codigoDepositoGeneral} (nombre estantería ${caja.estanteria}) | equipos: ${caja.totalEquiposEnCaja}${detalles ? ` | ${detalles}` : ""}`;
      });
      const resumen = impacto.resumen;
      const messageLines = [
        `Accion destructiva e irreversible: se eliminara ${item?.nombre ?? "este equipo"} y no se puede deshacer.`,
        `Movimientos afectados: ${resumen.totalMovimientos} (registros: ${resumen.totalRegistros}, stock: ${resumen.totalStock}).`,
        `Movimientos que quedaran vacios y se eliminaran: ${resumen.movimientosQueSeEliminan}.`,
        `Movimientos que conservaran otros equipos: ${resumen.movimientosQueSeActualizan}.`,
        `Códigos SIE a eliminar: ${resumen.totalCodigosSIE} (apariciones en cajas por código: ${resumen.totalCodigosSIEEnCajas}).`,
        `Apariciones directas del equipo en cajas: ${resumen.totalAparicionesEquipoEnCajas}.`,
        `Cajas afectadas (equipo/códigos): ${resumen.totalCajasAfectadas}.`,
        `Cajas que quedan sin equipos seleccionados: ${resumen.cajasQueQuedanSinEquipos}.`,
        "",
        "Códigos SIE afectados:",
        ...(codigosSIEImpacto.length > 0 ? codigosSIEImpacto : ["- Ninguno"]),
        "",
        "Cajas afectadas:",
        ...(cajasImpacto.length > 0 ? cajasImpacto : ["- Ninguna"]),
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

  const triggerPdfDownload = useCallback((url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const openAscensoDeliverySheet = useCallback((ci: string) => {
    const pdfUrl = `/api/hoja-de-entrega/${encodeURIComponent(ci)}/pdf?ts=${Date.now()}`;
    triggerPdfDownload(pdfUrl);
    setStatus("Descargando hoja de entrega en PDF A4 (opcional antes del ascenso).");
    return true;
  }, [triggerPdfDownload]);

  const printDeliverySheetFromProfile = useCallback((ci: string) => {
    const pdfUrl = `/api/hoja-de-entrega/${encodeURIComponent(ci)}/pdf?ts=${Date.now()}`;
    triggerPdfDownload(pdfUrl);
    setStatus("Descargando hoja de entrega en PDF A4.");
  }, [triggerPdfDownload]);

  const printPrestamosFromProfile = useCallback((prestamoIds: string[]) => {
    const ids = Array.from(new Set(prestamoIds.map((id) => id.trim()).filter((id) => id !== "")));
    if (ids.length === 0) {
      setStatus("Esta persona no tiene préstamos para imprimir.");
      return;
    }

    let openedCount = 0;
    for (const prestamoId of ids) {
      const popup = window.open(`/api/prestamos/${encodeURIComponent(prestamoId)}/recibo`, "_blank", "noopener,noreferrer");
      if (popup) {
        openedCount += 1;
      }
    }

    if (openedCount === 0) {
      setStatus("Debes permitir ventanas emergentes para imprimir recibos de préstamo.");
      return;
    }

    if (openedCount < ids.length) {
      setStatus(`Se abrieron ${openedCount} de ${ids.length} recibos. Revisa el bloqueador de ventanas emergentes.`);
      return;
    }

    setStatus(`Se abrieron ${openedCount} recibo(s) de préstamo para impresión.`);
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

  function resolvePersonaProfileReturnView(tipo: PersonaProfileTipo): PersonaProfileReturnView {
    if (tipo === "OFICIAL") return "oficiales";
    if (tipo === "SUBOFICIAL") return "suboficiales";
    return "personal";
  }

  function buildSubalternoProfileIdentity(persona: Personal): PersonaProfileIdentity {
    return {
      ci: persona.ci,
      tipo: "SUBALTERNO",
      apellido: [persona.apellido1, persona.apellido2].filter(Boolean).join(" ").trim(),
      nombre: [persona.nombre1, persona.nombre2].filter(Boolean).join(" ").trim(),
      gradoAbreviacion: persona.rango.abreviacion,
      gradoNombre: persona.rango.nombreCompleto,
      bateriaNombre: persona.bateria?.nombre ?? null,
      telefonoContacto: persona.telefonoContacto,
      mailReferencia: null,
      esReingreso: persona.esReingreso,
      fechaIngreso: persona.fechaIngreso,
      fechaIngresoOriginal: persona.fechaIngresoOriginal,
      tallas: persona.tallas,
    };
  }

  function buildOficialSuboficialProfileIdentity(registro: OficialSuboficial): PersonaProfileIdentity {
    return {
      ci: registro.ci,
      tipo: registro.tipo,
      apellido: registro.apellido,
      nombre: registro.nombre,
      gradoAbreviacion: registro.gradoMando.abreviacion,
      gradoNombre: registro.gradoMando.nombreCompleto,
      bateriaNombre: null,
      telefonoContacto: registro.telefonoContacto,
      mailReferencia: null,
      esReingreso: null,
      fechaIngreso: null,
      fechaIngresoOriginal: null,
      tallas: registro.tallas as Talla[],
    };
  }

  function buildEquipmentSummaryFromHoja(hojaSnapshot: HojaEntregaSnapshot | null): PersonaProfileEquipmentRow[] {
    if (!hojaSnapshot) return [];
    return hojaSnapshot.matrix
      .map((row) => {
        const entregado = row.entregaTotal;
        const saldo = Math.max(row.devolucionTotal, 0);
        const devuelto = Math.max(entregado - saldo, 0);
        return {
          item: row.item,
          entregado,
          devuelto,
          saldo,
          fuente: "REGISTROS" as const,
        };
      })
      .filter((row) => row.entregado > 0 || row.saldo > 0)
      .sort((left, right) => left.item.localeCompare(right.item, "es", { sensitivity: "base" }));
  }

  function buildEquipmentSummaryFromPrestamos(prestamos: PrestamoStockEntry[]): PersonaProfileEquipmentRow[] {
    const prestadoMap = new Map<string, number>();
    const devueltoMap = new Map<string, number>();
    const saldoMap = new Map<string, number>();

    for (const prestamo of prestamos) {
      for (const item of prestamo.items) {
        prestadoMap.set(item.nombre, (prestadoMap.get(item.nombre) ?? 0) + item.cantidad);
        if (prestamo.estado === "DEVUELTO") {
          devueltoMap.set(item.nombre, (devueltoMap.get(item.nombre) ?? 0) + item.cantidad);
        } else {
          saldoMap.set(item.nombre, (saldoMap.get(item.nombre) ?? 0) + item.cantidad);
        }
      }
    }

    return Array.from(new Set([...prestadoMap.keys(), ...devueltoMap.keys(), ...saldoMap.keys()]))
      .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
      .map((item) => ({
        item,
        entregado: prestadoMap.get(item) ?? 0,
        devuelto: devueltoMap.get(item) ?? 0,
        saldo: saldoMap.get(item) ?? 0,
        fuente: "PRESTAMOS" as const,
      }))
      .filter((row) => row.entregado > 0 || row.saldo > 0);
  }

  function buildPersonaProfileTimeline(registros: RegistroView[], prestamos: PrestamoStockEntry[]): PersonaProfileTimelineEntry[] {
    const registrosTimeline = registros.map((registro) => ({
      id: `registro-${registro.registroId}`,
      fecha: registro.fecha,
      tipo: registro.tipo === "ENTREGA" ? "ENTREGA" : "DEVOLUCION",
      descripcion: `Registro ${registro.tipo.toLowerCase()} · ${registro.items.reduce((acc, item) => acc + item.cantidad, 0)} unidades`,
      responsable:
        registro.usuarioEntregaNombre?.trim() ||
        registro.auditoria?.usuario?.username ||
        (registro.usuarioEntregaId ? "Usuario eliminado" : null),
      estadoPrestamo: null,
      items: registro.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
    })) satisfies PersonaProfileTimelineEntry[];

    const prestamosTimeline = prestamos.flatMap((prestamo) => {
      const prestamoEntry: PersonaProfileTimelineEntry = {
        id: `prestamo-${prestamo.prestamoId}`,
        fecha: prestamo.fechaPrestamo,
        tipo: "PRESTAMO",
        descripcion: `Préstamo ${prestamo.reciboNumero} · ${prestamo.estado.toLowerCase()}`,
        responsable: prestamo.usuarioEntregaNombre ?? null,
        estadoPrestamo: prestamo.estado,
        items: prestamo.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
      };

      if (!prestamo.fechaDevolucion) return [prestamoEntry];

      const devolucionEntry: PersonaProfileTimelineEntry = {
        id: `prestamo-devolucion-${prestamo.prestamoId}`,
        fecha: prestamo.fechaDevolucion,
        tipo: "DEVOLUCION_PRESTAMO",
        descripcion: `Devolución de préstamo ${prestamo.reciboNumero}`,
        responsable: prestamo.usuarioRecibeDevolucionNombre ?? prestamo.usuarioEntregaNombre ?? null,
        estadoPrestamo: "DEVUELTO",
        items: prestamo.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
      };

      return [prestamoEntry, devolucionEntry];
    });

    return [...registrosTimeline, ...prestamosTimeline];
  }

  async function loadPersonaProfile(identity: PersonaProfileIdentity) {
    personaProfileRequestRef.current.controller?.abort();
    const controller = new AbortController();
    const requestId = personaProfileRequestRef.current.id + 1;
    personaProfileRequestRef.current = { id: requestId, controller };

    setPersonaProfile({
      identity,
      loading: true,
      error: null,
      registros: [],
      prestamos: [],
      observaciones: [],
      equipmentSummary: [],
      timeline: [],
    });

    const requestInit: RequestInit = { signal: controller.signal };

    try {
      const registrosPromise = api<RegistroView[]>(`/api/registros?ci=${encodeURIComponent(identity.ci)}&limit=300`, requestInit).catch(
        () => [],
      );
      const prestamosPromise = api<PrestamoStockEntry[]>(`/api/prestamos?ci=${encodeURIComponent(identity.ci)}&limit=300`, requestInit).catch(
        () => [],
      );
      const hojaPromise =
        identity.tipo === "SUBALTERNO"
          ? api<HojaEntregaSnapshot>(`/api/hoja-de-entrega/${encodeURIComponent(identity.ci)}`, requestInit).catch(() => null)
          : Promise.resolve(null);
      const observacionesPromise =
        identity.tipo === "SUBALTERNO"
          ? api<PersonalObservacion[]>(`/api/personal/${encodeURIComponent(identity.ci)}/observaciones`, requestInit).catch(() => [])
          : Promise.resolve([]);

      const [registros, prestamos, hojaSnapshot, observaciones] = await Promise.all([
        registrosPromise,
        prestamosPromise,
        hojaPromise,
        observacionesPromise,
      ]);

      if (personaProfileRequestRef.current.id !== requestId) return;

      const equipmentSummary =
        identity.tipo === "SUBALTERNO"
          ? buildEquipmentSummaryFromHoja(hojaSnapshot)
          : buildEquipmentSummaryFromPrestamos(prestamos);

      const timeline = buildPersonaProfileTimeline(registros, prestamos);

      setPersonaProfile({
        identity,
        loading: false,
        error: null,
        registros,
        prestamos,
        observaciones,
        equipmentSummary,
        timeline,
      });
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (personaProfileRequestRef.current.id !== requestId) return;
      setPersonaProfile({
        identity,
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo cargar la ficha completa.",
        registros: [],
        prestamos: [],
        observaciones: [],
        equipmentSummary: [],
        timeline: [],
      });
    }
  }

  async function openPersonaProfileFromPersonal(persona: Personal) {
    setPersonaProfileReturnView("personal");
    setActiveView("persona_ficha");
    await loadPersonaProfile(buildSubalternoProfileIdentity(persona));
  }

  async function openPersonaProfileFromOficialSuboficial(registro: OficialSuboficial) {
    setPersonaProfileReturnView(resolvePersonaProfileReturnView(registro.tipo));
    setActiveView("persona_ficha");
    await loadPersonaProfile(buildOficialSuboficialProfileIdentity(registro));
  }

  async function reloadPersonaProfile() {
    if (!personaProfile) return;
    await loadPersonaProfile(personaProfile.identity);
  }

  function closePersonaProfileView() {
    personaProfileRequestRef.current.controller?.abort();
    personaProfileRequestRef.current.controller = null;
    setPersonaProfile(null);
    setActiveView(personaProfileReturnView);
  }

  const loadPersonalSelfProfile = useCallback(async () => {
    if (!currentUser || currentUser.accountType !== "PERSONAL") return;

    setPersonalSelfProfile((previous) => ({
      identity:
        previous?.identity ?? {
          ci: currentUser.personalCi ?? currentUser.username,
          tipo: "SUBALTERNO",
          apellido: currentUser.apellido,
          nombre: currentUser.nombre,
          gradoAbreviacion: currentUser.grado,
          gradoNombre: currentUser.grado,
          bateriaNombre: null,
          telefonoContacto: null,
          mailReferencia: currentUser.mailReferencia ?? null,
          esReingreso: null,
          fechaIngreso: null,
          fechaIngresoOriginal: null,
          tallas: [],
        },
      loading: true,
      error: null,
      registros: previous?.registros ?? [],
      prestamos: previous?.prestamos ?? [],
      observaciones: previous?.observaciones ?? [],
      equipmentSummary: previous?.equipmentSummary ?? [],
      timeline: previous?.timeline ?? [],
    }));

    try {
      const profile = await api<PersonalSelfProfileResponse>("/api/personal/self/profile");
      setPersonalSelfProfile({
        ...profile,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cargar tu ficha personal.";
      setPersonalSelfProfile((previous) =>
        previous
          ? {
              ...previous,
              loading: false,
              error: message,
            }
          : {
              identity: {
                ci: currentUser.personalCi ?? currentUser.username,
                tipo: "SUBALTERNO",
                apellido: currentUser.apellido,
                nombre: currentUser.nombre,
                gradoAbreviacion: currentUser.grado,
                gradoNombre: currentUser.grado,
                bateriaNombre: null,
                telefonoContacto: null,
                mailReferencia: currentUser.mailReferencia ?? null,
                esReingreso: null,
                fechaIngreso: null,
                fechaIngresoOriginal: null,
                tallas: [],
              },
              loading: false,
              error: message,
              registros: [],
              prestamos: [],
              observaciones: [],
              equipmentSummary: [],
              timeline: [],
            },
      );
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || currentUser.accountType !== "PERSONAL") {
      setPersonalSelfProfile(null);
      setShowPersonalContactModal(false);
      return;
    }
    void loadPersonalSelfProfile();
  }, [currentUser, loadPersonalSelfProfile]);

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
    if (prestamoDraft.actuanteCi.trim() === "") {
      setStatus("Debes indicar 'por oden de' (oficial, suboficial o sargento).");
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
          actuanteCi: prestamoDraft.actuanteCi.trim(),
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

  async function editPrestamo(prestamoId: string, payload: PrestamoEditPayload) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede editar prestamos.");
      return;
    }
    if (editingPrestamoId) return;

    setEditingPrestamoId(prestamoId);
    setStatus(`Actualizando prestamo ${prestamoId}...`);
    try {
      await api(`/api/prestamos/${encodeURIComponent(prestamoId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(`Prestamo ${prestamoId} actualizado.`);
      await reloadActiveStockData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo editar el prestamo.";
      setStatus(message);
      throw error;
    } finally {
      setEditingPrestamoId(null);
    }
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
      const usernameInput = loginUsername.trim();
      if (usernameInput === "") {
        setStatus(loginMode === "PERSONAL" ? "Ingresa tu cédula." : "Ingresa tu usuario.");
        return;
      }

      const username = loginMode === "PERSONAL" ? normalizeCi(usernameInput) : usernameInput;
      if (loginMode === "PERSONAL" && !isValidUruguayanCi(username)) {
        setStatus("La cédula ingresada no es válida.");
        return;
      }

      setLoginLoading(true);
      setStatus(STATUS_STARTING_SESSION);

      try {
        await loginHandler(username, loginPassword, {
          onSuccess: async () => {
            setLoginPassword("");
            setShowLoginPassword(false);
            setPersonalSelfProfile(null);

            const callbackTarget =
              typeof window !== "undefined"
                ? new URLSearchParams(window.location.search).get("widgetAuthCallback")
                : null;

            if (
              callbackTarget &&
              typeof window !== "undefined" &&
              callbackTarget.startsWith(window.location.origin)
            ) {
              window.location.href = callbackTarget;
              return;
            }

            await loadData(true);
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error de login manejado por callbacks de estado (ej: credenciales invalidas).
      } finally {
        setLoginLoading(false);
      }
    },
    [loginMode, loginUsername, loginPassword, loadData],
  );

  const requestPasswordReset = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (resetRequestLoading) return;
      if (loginMode === "PERSONAL") {
        setResetRequestMessage("Las cuentas de personal no usan enlace por mail. Solicita cambio al administrador.");
        return;
      }

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
    [loginMode, resetRequestLoading, resetUsername],
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

  const submitPersonalContactUpdate = useCallback(async () => {
    if (!currentUser || currentUser.accountType !== "PERSONAL") return;

    const trimmedTelefono = personalContactTelefono.trim();
    const trimmedMail = personalContactMail.trim();

    if (trimmedTelefono !== "" && !isValidUruguayanMobileNumber(trimmedTelefono)) {
      setStatus("El celular debe ser un número uruguayo válido.");
      return;
    }
    if (trimmedMail !== "" && !isValidEmailAddress(trimmedMail)) {
      setStatus("El correo electrónico no es válido.");
      return;
    }

    setPersonalContactSaving(true);
    try {
      const updated = await api<PersonalSelfContactResponse>("/api/personal/self/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telefonoContacto: trimmedTelefono === "" ? null : trimmedTelefono,
          mailReferencia: trimmedMail === "" ? null : trimmedMail,
        }),
      });

      setPersonalSelfProfile((previous) =>
        previous
          ? {
              ...previous,
              identity: {
                ...previous.identity,
                telefonoContacto: updated.telefonoContacto,
                mailReferencia: updated.mailReferencia,
              },
            }
          : previous,
      );

      setShowPersonalContactModal(false);
      setStatus("Datos de contacto actualizados.");
      await loadPersonalSelfProfile();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el contacto.");
    } finally {
      setPersonalContactSaving(false);
    }
  }, [currentUser, loadPersonalSelfProfile, personalContactMail, personalContactTelefono]);

  const openOwnDeliverySheetPdf = useCallback(() => {
    if (!currentUser || currentUser.accountType !== "PERSONAL") return;

    const ci = currentUser.personalCi ?? currentUser.username;
    const popup = window.open(
      `/api/hoja-de-entrega/${encodeURIComponent(ci)}/pdf?inline=1&ts=${Date.now()}`,
      "_blank",
      "noopener,noreferrer",
    );

    if (!popup) {
      setStatus("Debes permitir ventanas emergentes para ver la hoja de entrega en PDF.");
      return;
    }

    setStatus("Abriendo hoja de entrega en PDF.");
  }, [currentUser]);

  const logout = useCallback(async () => {
    try {
      await logoutHandler({
        onSuccess: () => {
          setCurrentUser(null);
          clearLoadedData();
          setLoginPassword("");
          setShowLoginPassword(false);
          setShowPersonalContactModal(false);
          setPersonalContactTelefono("");
          setPersonalContactMail("");
          setActiveView("personal");
          setStatus(STATUS_SESSION_CLOSED);
        },
      });
    } catch {
      // Error manejado o ignorado en logout
      setCurrentUser(null);
      clearLoadedData();
      setLoginPassword("");
      setShowLoginPassword(false);
      setShowPersonalContactModal(false);
      setPersonalContactTelefono("");
      setPersonalContactMail("");
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
            await loadAdminData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, newUserRangoId, newNombre, newApellido, newUsername, newPassword, newPasswordConfirm, newMailReferencia, newRole, loadAdminData],
  );

  const changeUserRole = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede cambiar roles.");
        return;
      }
      if (usuario.accountType === "PERSONAL") {
        setStatus("Las cuentas de personal no admiten cambio de rol.");
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
      if (usuario.accountType === "PERSONAL") {
        setStatus("Las cuentas de personal no admiten edición de datos de usuario.");
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
    if (currentUser.accountType !== "SISTEMA") {
      setStatus("Las cuentas de personal no permiten editar datos de acceso.");
      return;
    }
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
          await loadAdminData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUserRoleSaving(false);
    }
  }, [userRoleDialog, loadAdminData]);

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
          await loadAdminData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUserPasswordSaving(false);
    }
  }, [userPasswordDialog, loadAdminData]);

  const submitUsernameChange = useCallback(async () => {
    if (!usernameDialog) return;
    if (usernameDialog.usuarioId.startsWith("personal:")) {
      setStatus("Las cuentas de personal no admiten edición de datos.");
      return;
    }
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
          if (isSelfUpdate && isAdmin) {
            await Promise.all([loadData(true), loadAdminData()]);
            return;
          }
          if (isSelfUpdate) {
            await loadData(true);
            return;
          }
          if (isAdmin) {
            await loadAdminData();
            return;
          }
          await loadData(false);
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setUsernameSaving(false);
    }
  }, [canManageOwnAccount, usernameDialog, currentUser, isAdmin, loadAdminData, loadData]);

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
            await loadAdminData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, loadAdminData],
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
                await loadAdminData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [isAdmin, loadAdminData],
  );

  const deleteUsuario = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede eliminar usuarios.");
        return;
      }
      if (usuario.accountType === "PERSONAL") {
        setStatus("Las cuentas de personal no se eliminan; puedes desactivarlas.");
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
                await loadAdminData();
              },
              onError: (message) => setStatus(message),
            });
          } catch {
            // Error manejado en el handler
          }
        },
      });
    },
    [isAdmin, loadAdminData],
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

  const clearBulkDeliveryEmailPolling = useCallback(() => {
    if (bulkDeliveryEmailPollTimeoutRef.current !== null) {
      window.clearTimeout(bulkDeliveryEmailPollTimeoutRef.current);
      bulkDeliveryEmailPollTimeoutRef.current = null;
    }
  }, []);

  const cancelBulkDeliveryEmailJobById = useCallback(
    async (jobId: string) => {
      clearBulkDeliveryEmailPolling();

      const buildLocalCancelledJob = (
        previous: HojasEntregaEmailJobSnapshot,
        message: string,
      ): HojasEntregaEmailJobSnapshot => ({
        ...previous,
        status: "cancelled",
        step: "cancelled",
        progress: 100,
        message,
        error: null,
        updatedAt: new Date().toISOString(),
      });

      try {
        const response = await fetch(`/api/hojas-de-entrega/pdf/email/${encodeURIComponent(jobId)}`, {
          method: "DELETE",
          cache: "no-store",
        });

        const rawBody = await response.text();
        let payload: { error?: string; message?: string; job?: HojasEntregaEmailJobSnapshot } | null = null;
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody) as { error?: string; message?: string; job?: HojasEntregaEmailJobSnapshot };
          } catch {
            payload = null;
          }
        }

        if (response.status === 409 && payload?.job) {
          setBulkDeliveryEmailJob(payload.job);
          syncBulkDeliveryEmailToast(payload.job);
          setStatus(payload.error || payload.message || payload.job.message);
          return;
        }

        if (response.status === 404) {
          const message =
            payload && typeof payload.error === "string" && payload.error.trim() !== ""
              ? payload.error
              : "No se encontro el seguimiento del envio solicitado.";

          setBulkDeliveryEmailJob((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            return buildLocalCancelledJob(prev, "Seguimiento cancelado localmente por el usuario.");
          });

          toast.info("Seguimiento cancelado.", {
            id: BULK_DELIVERY_EMAIL_TOAST_ID,
            description: `${message}\nEl seguimiento local se detuvo.`,
            duration: 7000,
          });
          setStatus("Seguimiento del envio cancelado localmente.");
          return;
        }

        if (!response.ok) {
          const message =
            payload && typeof payload.error === "string" && payload.error.trim() !== ""
              ? payload.error
              : "No se pudo cancelar el envio.";
          throw new Error(message);
        }

        const cancelledJob = payload?.job;
        if (cancelledJob) {
          setBulkDeliveryEmailJob(cancelledJob);
          syncBulkDeliveryEmailToast(cancelledJob);
          setStatus(payload?.message || cancelledJob.message || "Envio cancelado por el usuario.");
          return;
        }

        setBulkDeliveryEmailJob((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          return buildLocalCancelledJob(prev, "Envio cancelado por el usuario.");
        });
        toast.info("Envio cancelado.", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: "Se detuvo el seguimiento del envio en segundo plano.",
          duration: 7000,
        });
        setStatus("Envio cancelado por el usuario.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo cancelar el envio.";
        setBulkDeliveryEmailJob((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          return buildLocalCancelledJob(prev, "Seguimiento cancelado localmente por el usuario.");
        });

        toast.info("Seguimiento cancelado.", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: `Se detuvo el seguimiento local del envio.\n${message}`,
          duration: 7000,
        });
        setStatus(`Seguimiento cancelado localmente: ${message}`);
      }
    },
    [clearBulkDeliveryEmailPolling],
  );

  const onBulkDeliveryEmailToastCancel = useCallback(
    (jobId: string) => {
      void cancelBulkDeliveryEmailJobById(jobId);
    },
    [cancelBulkDeliveryEmailJobById],
  );

  const cancelBulkDeliveryEmailJob = useCallback(() => {
    if (!isActiveHojasEntregaEmailJob(bulkDeliveryEmailJob)) {
      setStatus("No hay un envio de hojas de entrega en curso para cancelar.");
      return;
    }
    void cancelBulkDeliveryEmailJobById(bulkDeliveryEmailJob.jobId);
  }, [bulkDeliveryEmailJob, cancelBulkDeliveryEmailJobById]);

  const pollBulkDeliveryEmailJob = useCallback(
    async (jobId: string) => {
      try {
        const response = await fetch(`/api/hojas-de-entrega/pdf/email/${encodeURIComponent(jobId)}`, {
          method: "GET",
          cache: "no-store",
        });

        const rawBody = await response.text();
        let payload: { error?: string; job?: HojasEntregaEmailJobSnapshot } | null = null;
        if (rawBody) {
          try {
            payload = JSON.parse(rawBody) as { error?: string; job?: HojasEntregaEmailJobSnapshot };
          } catch {
            payload = null;
          }
        }

        if (!response.ok) {
          const message =
            payload && typeof payload.error === "string" && payload.error.trim() !== ""
              ? payload.error
              : "No se pudo consultar el estado del envio.";
          const pollError = new Error(message) as Error & { status?: number };
          pollError.status = response.status;
          throw pollError;
        }

        if (!payload?.job) {
          throw new Error("El servidor no devolvio el estado del envio.");
        }

        const nextJob = payload.job;
        setBulkDeliveryEmailJob(nextJob);
        syncBulkDeliveryEmailToast(nextJob, onBulkDeliveryEmailToastCancel);

        if (nextJob.status === "completed") {
          clearBulkDeliveryEmailPolling();
          setStatus(nextJob.to ? `PDF enviado por correo a ${nextJob.to}.` : "PDF enviado por correo.");
          return;
        }

        if (nextJob.status === "failed") {
          clearBulkDeliveryEmailPolling();
          setStatus(`Error al enviar PDF por correo: ${nextJob.error ?? nextJob.message}`);
          return;
        }

        if (nextJob.status === "cancelled") {
          clearBulkDeliveryEmailPolling();
          setStatus(nextJob.message || "Envio cancelado por el usuario.");
          return;
        }

        clearBulkDeliveryEmailPolling();
        bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
          void pollBulkDeliveryEmailJob(jobId);
        }, 1200);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo consultar el estado del envio.";
        const statusCode = typeof (error as { status?: unknown })?.status === "number"
          ? (error as { status: number }).status
          : null;

        if (statusCode === 404) {
          clearBulkDeliveryEmailPolling();

          setBulkDeliveryEmailJob((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            return {
              ...prev,
              status: "failed",
              step: "failed",
              progress: 100,
              message,
              error: message,
              updatedAt: new Date().toISOString(),
            };
          });

          toast.error("Seguimiento del envio no disponible.", {
            id: BULK_DELIVERY_EMAIL_TOAST_ID,
            description: `${message}\nPuedes iniciar un nuevo envio cuando lo necesites.`,
            duration: 9000,
          });
          setStatus(`No se pudo continuar el seguimiento del envio: ${message}`);
          return;
        }

        toast.loading("Enviando PDF por correo en segundo plano...", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: `Seguimos consultando el estado del envio...\n${message}`,
          duration: Infinity,
          cancel: {
            label: "Cancelar",
            onClick: () => onBulkDeliveryEmailToastCancel(jobId),
          },
        });

        clearBulkDeliveryEmailPolling();
        bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
          void pollBulkDeliveryEmailJob(jobId);
        }, 2500);
      }
    },
    [clearBulkDeliveryEmailPolling, onBulkDeliveryEmailToastCancel],
  );

  const appendBulkDeliveryPdfLog = useCallback(
    (message: string) => {
      const elapsedMs =
        bulkDeliveryPdfStartedAtMs === null ? 0 : Math.max(0, Date.now() - bulkDeliveryPdfStartedAtMs);
      const elapsedLabel = formatElapsedTimer(elapsedMs) ?? "00:00";
      setBulkDeliveryPdfLogEntries((previous) => {
        const next = [...previous, `${elapsedLabel} | ${message}`];
        return next.slice(-MAX_BULK_DELIVERY_PDF_LOG_ENTRIES);
      });
    },
    [bulkDeliveryPdfStartedAtMs],
  );

  const printAllDeliverySheets = useCallback(async () => {
    if (personal.length === 0) {
      toast.info("No hay personal para imprimir.");
      return;
    }

    if (bulkDeliveryPdfLoading) {
      setStatus("Ya hay una generación de PDF de hojas de entrega en curso.");
      return;
    }

    bulkDeliveryPdfLastLoggedPhaseRef.current = null;
    setBulkDeliveryPdfLogEntries([]);
    setBulkDeliveryPdfStartedAtMs(Date.now());
    setBulkDeliveryPdfElapsedMs(0);
    setBulkDeliveryPdfLoading(true);
    setBulkDeliveryPdfPhase("requesting");
    setStatus(`Solicitando al servidor la generación del PDF A4 para ${personal.length} hoja(s)...`);
    toast.info(`Generando PDF A4 de ${personal.length} hojas.`);
    try {
      setBulkDeliveryPdfPhase("rendering-server");
      const response = await fetch("/api/hojas-de-entrega/pdf", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        let message = "No se pudo generar el PDF de hojas de entrega.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (typeof payload.error === "string" && payload.error.trim() !== "") {
            message = payload.error;
          }
        } catch {
          // Ignorar parseo fallido y conservar mensaje por defecto.
        }
        throw new Error(message);
      }

      setBulkDeliveryPdfPhase("downloading-response");
      setStatus("Servidor finalizó la generación. Descargando el archivo PDF...");
      const serverMetrics = parseHojasEntregaPdfMetricsHeader(response.headers.get("X-Hoja-Entrega-Pdf-Metrics"));
      if (
        serverMetrics?.totalMs !== null &&
        serverMetrics?.totalMs !== undefined &&
        serverMetrics?.hojas !== null &&
        serverMetrics?.hojas !== undefined &&
        serverMetrics.hojas > 0
      ) {
        const measuredMsPerHoja = serverMetrics.totalMs / serverMetrics.hojas;
        if (Number.isFinite(measuredMsPerHoja) && measuredMsPerHoja > 0) {
          setBulkDeliveryPdfMsPerHojaEstimate((previous) =>
            Math.round(previous * 0.7 + measuredMsPerHoja * 0.3),
          );
        }
      }
      const blob = await response.blob();
      setBulkDeliveryPdfPhase("preparing-download");
      setStatus("Archivo PDF recibido. Preparando descarga local...");
      const objectUrl = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition");
      const fileNameMatch = disposition?.match(/filename\*?=(?:UTF-8''|\"?)([^\";]+)/i);
      const rawFileName = fileNameMatch?.[1]?.trim().replace(/^\"|\"$/g, "");
      const fallbackFileName = "hoja-entrega-unidad.pdf";
      let fileName = rawFileName || fallbackFileName;

      if (rawFileName) {
        try {
          fileName = decodeURIComponent(rawFileName);
        } catch {
          fileName = rawFileName;
        }
      }

      setBulkDeliveryPdfPhase("triggering-download");
      setStatus(`Lanzando descarga de ${fileName}...`);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      link.rel = "noopener";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_500);

      const loadingLabel = formatDurationForStatus(serverMetrics?.loadingMs);
      const renderingLabel = formatDurationForStatus(serverMetrics?.renderingMs);
      const totalLabel = formatDurationForStatus(serverMetrics?.totalMs);
      const metricsLabel = [loadingLabel, renderingLabel, totalLabel].some(Boolean)
        ? ` Servidor: carga ${loadingLabel ?? "-"}, render ${renderingLabel ?? "-"}, total ${totalLabel ?? "-"}.`
        : "";
      appendBulkDeliveryPdfLog(`Descarga iniciada: ${fileName}.`);
      setStatus(`Descarga iniciada (${fileName}).${metricsLabel}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF de hojas de entrega.";
      appendBulkDeliveryPdfLog(`Error: ${message}`);
      setStatus(`Error al generar PDF de hojas de entrega: ${message}`);
    } finally {
      setBulkDeliveryPdfLoading(false);
      setBulkDeliveryPdfPhase("idle");
      setBulkDeliveryPdfStartedAtMs(null);
      setBulkDeliveryPdfElapsedMs(0);
    }
  }, [appendBulkDeliveryPdfLog, bulkDeliveryPdfLoading, personal.length]);

  const emailAllDeliverySheets = useCallback(async () => {
    if (personal.length === 0) {
      toast.info("No hay personal para enviar.");
      return;
    }

    if (bulkDeliveryPdfLoading) {
      setStatus("Ya hay una generación local de PDF de hojas de entrega en curso.");
      return;
    }

    if (isActiveHojasEntregaEmailJob(bulkDeliveryEmailJob)) {
      setStatus("Ya hay un envio de hojas de entrega ejecutandose en segundo plano.");
      syncBulkDeliveryEmailToast(bulkDeliveryEmailJob, onBulkDeliveryEmailToastCancel);
      return;
    }

    setStatus(`Iniciando envio en segundo plano de ${personal.length} hojas de entrega...`);

    try {
      const response = await fetch("/api/hojas-de-entrega/pdf/email", {
        method: "POST",
        cache: "no-store",
      });

      const rawBody = await response.text();
      let payload: { error?: string; message?: string; job?: HojasEntregaEmailJobSnapshot } | null = null;
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody) as { error?: string; message?: string; job?: HojasEntregaEmailJobSnapshot };
        } catch {
          payload = null;
        }
      }

      if (response.status === 409 && payload?.job) {
        const existingJob = payload.job;
        setBulkDeliveryEmailJob(existingJob);
        syncBulkDeliveryEmailToast(existingJob, onBulkDeliveryEmailToastCancel);
        clearBulkDeliveryEmailPolling();
        bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
          void pollBulkDeliveryEmailJob(existingJob.jobId);
        }, 250);
        setStatus("El envio ya estaba en curso. Se retomó el seguimiento.");
        return;
      }

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string" && payload.error.trim() !== ""
            ? payload.error
            : "No se pudo iniciar el envio del PDF por correo.";
        throw new Error(message);
      }

      if (!payload?.job) {
        throw new Error("El servidor no devolvio el seguimiento del envio.");
      }

      const startedJob = payload.job;
      setBulkDeliveryEmailJob(startedJob);
      syncBulkDeliveryEmailToast(startedJob, onBulkDeliveryEmailToastCancel);
      clearBulkDeliveryEmailPolling();
      bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
        void pollBulkDeliveryEmailJob(startedJob.jobId);
      }, 250);
      setStatus(payload.message || "Envio de PDF iniciado en segundo plano.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el envio del PDF por correo.";
      setStatus(`Error al iniciar envio de PDF por correo: ${message}`);
      toast.error("No se pudo iniciar el envio por correo.", { description: message });
    }
  }, [
    bulkDeliveryEmailJob,
    bulkDeliveryPdfLoading,
    clearBulkDeliveryEmailPolling,
    onBulkDeliveryEmailToastCancel,
    personal.length,
    pollBulkDeliveryEmailJob,
  ]);

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
  const loginBusyLabel = loginLoading
    ? "Validando credenciales y preparando tu sesion..."
    : isPageBootLoading
      ? "Verificando sesion activa..."
      : "Cargando pantalla de acceso...";
  const personaProfileLoading = personaProfile?.loading ?? false;
  const primaryLoadSteps = useMemo(
    () => [
      "Consultando base de datos de personal, rangos y baterias...",
      "Cargando tallas, catalogo de equipos y configuraciones base...",
      "Consolidando movimientos, prestamos, devoluciones y stock...",
      "Aplicando permisos de usuario y preparando la interfaz...",
    ],
    [],
  );
  const [primaryLoadStepIndex, setPrimaryLoadStepIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setPrimaryLoadStepIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setPrimaryLoadStepIndex((prev) => (prev + 1) % primaryLoadSteps.length);
    }, 1550);

    return () => window.clearInterval(intervalId);
  }, [loading, primaryLoadSteps]);

  const primaryLoadingLabel = primaryLoadSteps[primaryLoadStepIndex] ?? primaryLoadSteps[0];
  useEffect(() => {
    if (!bulkDeliveryPdfLoading || bulkDeliveryPdfStartedAtMs === null) {
      setBulkDeliveryPdfElapsedMs(0);
      return;
    }

    const refreshElapsed = () => {
      setBulkDeliveryPdfElapsedMs(Math.max(0, Date.now() - bulkDeliveryPdfStartedAtMs));
    };

    refreshElapsed();
    const intervalId = window.setInterval(refreshElapsed, 1000);
    return () => window.clearInterval(intervalId);
  }, [bulkDeliveryPdfLoading, bulkDeliveryPdfStartedAtMs]);

  useEffect(() => {
    if (!bulkDeliveryPdfLoading) {
      bulkDeliveryPdfLastLoggedPhaseRef.current = null;
      return;
    }
    if (bulkDeliveryPdfLastLoggedPhaseRef.current === bulkDeliveryPdfPhase) return;

    bulkDeliveryPdfLastLoggedPhaseRef.current = bulkDeliveryPdfPhase;
    if (bulkDeliveryPdfPhase === "requesting") {
      appendBulkDeliveryPdfLog(`Solicitud enviada al servidor (${personal.length} hojas).`);
      return;
    }
    if (bulkDeliveryPdfPhase === "rendering-server") {
      appendBulkDeliveryPdfLog("Servidor procesando generacion de hojas y compaginacion.");
      return;
    }
    if (bulkDeliveryPdfPhase === "downloading-response") {
      appendBulkDeliveryPdfLog("Servidor finalizo, iniciando descarga de respuesta.");
      return;
    }
    if (bulkDeliveryPdfPhase === "preparing-download") {
      appendBulkDeliveryPdfLog("Archivo recibido, preparando descarga local.");
      return;
    }
    if (bulkDeliveryPdfPhase === "triggering-download") {
      appendBulkDeliveryPdfLog("Lanzando descarga en el navegador.");
    }
  }, [
    appendBulkDeliveryPdfLog,
    bulkDeliveryPdfLoading,
    bulkDeliveryPdfPhase,
    personal.length,
  ]);

  const bulkDeliveryPdfLabel = useMemo(() => {
    if (!bulkDeliveryPdfLoading) return "";

    const lines: string[] = [];
    const shouldShowEstimate =
      (bulkDeliveryPdfPhase === "requesting" || bulkDeliveryPdfPhase === "rendering-server") &&
      personal.length > 0;
    const estimatedTotalMs = shouldShowEstimate
      ? Math.max(bulkDeliveryPdfMsPerHojaEstimate * personal.length, 10_000)
      : null;
    const remainingMsSigned =
      typeof estimatedTotalMs === "number" ? estimatedTotalMs - bulkDeliveryPdfElapsedMs : null;
    const estimatedEndAt =
      typeof estimatedTotalMs === "number" && bulkDeliveryPdfStartedAtMs !== null
        ? new Date(bulkDeliveryPdfStartedAtMs + estimatedTotalMs)
        : null;
    const progressRatio =
      typeof estimatedTotalMs === "number" && estimatedTotalMs > 0
        ? Math.min(1, bulkDeliveryPdfElapsedMs / estimatedTotalMs)
        : null;

    if (bulkDeliveryPdfPhase === "requesting") {
      lines.push(`Etapa 0/3: enviando solicitud al servidor para ${personal.length} hoja(s)...`);
    } else if (bulkDeliveryPdfPhase === "rendering-server") {
      if (progressRatio !== null && progressRatio < 0.2) {
        lines.push("Etapa 1/3: consultando datos de personal, tallas y movimientos...");
      } else if (progressRatio !== null && progressRatio < 0.8) {
        lines.push("Etapa 2/3: armando hojas de entrega por persona...");
      } else {
        lines.push("Etapa 3/3: compaginando PDF consolidado...");
      }
    } else if (bulkDeliveryPdfPhase === "downloading-response") {
      lines.push("Etapa final: servidor completó la generación, descargando archivo...");
    } else if (bulkDeliveryPdfPhase === "preparing-download") {
      lines.push("Etapa final: archivo recibido, preparando descarga local...");
    } else if (bulkDeliveryPdfPhase === "triggering-download") {
      lines.push("Etapa final: lanzando descarga en el navegador...");
    } else {
      lines.push(`Procesando PDF de ${personal.length} hoja(s)...`);
    }

    const elapsedLabel = formatElapsedTimer(bulkDeliveryPdfElapsedMs);
    if (elapsedLabel) {
      lines.push(`Transcurrido: ${elapsedLabel}`);
    }

    if (typeof remainingMsSigned === "number") {
      if (remainingMsSigned > 0) {
        const remainingLabel = formatElapsedTimer(remainingMsSigned);
        if (remainingLabel) {
          lines.push(`Restante estimado: ${remainingLabel}`);
        }
      } else {
        const overrunLabel = formatElapsedTimer(Math.abs(remainingMsSigned));
        if (overrunLabel) {
          lines.push(`Demora sobre estimado: +${overrunLabel}`);
        }
      }
    }

    if (estimatedEndAt) {
      if (typeof remainingMsSigned === "number" && remainingMsSigned > 0) {
        lines.push(`Finaliza aprox: ${formatClockTime(estimatedEndAt)}`);
      } else {
        lines.push(`Hora estimada original: ${formatClockTime(estimatedEndAt)}`);
      }
    }

    if (bulkDeliveryPdfLogEntries.length > 0) {
      lines.push("Log de avance:");
      for (const entry of bulkDeliveryPdfLogEntries.slice(-DISPLAY_BULK_DELIVERY_PDF_LOG_ENTRIES)) {
        lines.push(`- ${entry}`);
      }
    }

    return lines.join("\n");
  }, [
    bulkDeliveryPdfElapsedMs,
    bulkDeliveryPdfLoading,
    bulkDeliveryPdfLogEntries,
    bulkDeliveryPdfStartedAtMs,
    bulkDeliveryPdfMsPerHojaEstimate,
    bulkDeliveryPdfPhase,
    personal.length,
  ]);
  useEffect(() => {
    return () => {
      if (bulkDeliveryEmailPollTimeoutRef.current !== null) {
        window.clearTimeout(bulkDeliveryEmailPollTimeoutRef.current);
      }
    };
  }, []);

  const isAppGlobalBusy =
    !!currentUser &&
    (
      loading ||
      bulkDeliveryPdfLoading ||
      personaProfileLoading ||
      firmaConfigLoading ||
      firmaConfigSaving ||
      hojaMatrixLoading ||
      equipoResumenLoading ||
      stockLoading ||
      etiquetadoLoading ||
      recordatoriosLoading ||
      recordatoriosSaving ||
      creatingPersonal ||
      creatingOficialSuboficial ||
      mergeEquipoSaving ||
      stockSaving ||
      prestamoSaving ||
      returningPrestamoId !== null ||
      editingPrestamoId !== null ||
      registroSaving ||
      personalObservacionSaving ||
      changeLoading ||
      userRoleSaving ||
      userPasswordSaving ||
      usernameSaving ||
      promotingSubalternoCi !== null ||
      confirmDialogBusy
    );
  const appBusyLabel = useMemo(() => {
    if (loading) return primaryLoadingLabel;
    if (bulkDeliveryPdfLoading) return bulkDeliveryPdfLabel;
    if (personaProfileLoading) return "Cargando ficha completa y consolidando información de esta persona...";
    if (firmaConfigLoading) return "Cargando configuracion de firmas y auditoria...";
    if (firmaConfigSaving) return "Guardando configuracion de firmas...";
    if (hojaMatrixLoading) return "Cargando datos y calculando hoja matriz de subalternos...";
    if (equipoResumenLoading) return "Cargando datos y calculando resumen de equipos por bateria...";
    if (stockLoading) {
      if (activeStockLoadProfile?.key === "historial") {
        return "Cargando historial y calculando impacto de movimientos en stock...";
      }
      if (activeStockLoadProfile?.key === "prestamos") {
        return "Cargando prestamos y estado de devoluciones...";
      }
      return "Cargando stock y recalculando totales operativos...";
    }
    if (etiquetadoLoading) {
      if (activeEtiquetadoSection === "codigos_sie") {
        return "Cargando codigos SIE y validando disponibilidad...";
      }
      if (activeEtiquetadoSection === "imprimir_todas") {
        return "Cargando etiquetas y preparando impresion masiva...";
      }
      return "Cargando modulo de etiquetado...";
    }
    if (recordatoriosLoading) return "Cargando tareas y recordatorios...";
    if (recordatoriosSaving) return "Guardando cambios de recordatorios...";
    if (creatingPersonal) return "Guardando alta de personal y actualizando listados...";
    if (creatingOficialSuboficial) return "Guardando alta de oficiales/suboficiales...";
    if (promotingSubalternoCi !== null) return "Procesando ascenso y actualizando datos del legajo...";
    if (mergeEquipoSaving) return "Reasignando equipo y sincronizando referencias...";
    if (stockSaving) {
      return stockDraft.tipo === "EGRESO"
        ? "Registrando baja de stock y recalculando existencias..."
        : "Registrando alta de stock y recalculando existencias...";
    }
    if (prestamoSaving) return "Registrando prestamo y actualizando stock en tiempo real...";
    if (returningPrestamoId !== null) return "Registrando devolucion y recalculando stock...";
    if (editingPrestamoId !== null) return "Actualizando prestamo y validando consistencia...";
    if (registroSaving) return "Guardando movimiento y actualizando historial...";
    if (personalObservacionSaving) return "Guardando observacion del personal...";
    if (changeLoading) return "Actualizando tu contrasena...";
    if (userRoleSaving) return "Actualizando rol del usuario...";
    if (userPasswordSaving) return "Actualizando contrasena del usuario...";
    if (usernameSaving) return "Actualizando datos del usuario...";
    if (confirmDialogBusy) return "Aplicando cambios solicitados...";
    return "Actualizando informacion...";
  }, [
    bulkDeliveryPdfLabel,
    bulkDeliveryPdfLoading,
    primaryLoadingLabel,
    activeEtiquetadoSection,
    activeStockLoadProfile?.key,
    changeLoading,
    confirmDialogBusy,
    creatingOficialSuboficial,
    creatingPersonal,
    editingPrestamoId,
    equipoResumenLoading,
    etiquetadoLoading,
    firmaConfigLoading,
    firmaConfigSaving,
    hojaMatrixLoading,
    loading,
    personaProfileLoading,
    mergeEquipoSaving,
    personalObservacionSaving,
    prestamoSaving,
    recordatoriosLoading,
    recordatoriosSaving,
    registroSaving,
    returningPrestamoId,
    stockDraft.tipo,
    stockLoading,
    stockSaving,
    promotingSubalternoCi,
    userPasswordSaving,
    userRoleSaving,
    usernameSaving,
  ]);
  const personalSelfProfileLoading = personalSelfProfile?.loading ?? false;

  if (!currentUser) {
    return (
      <main className="relative mx-auto flex min-h-dvh w-full max-w-7xl items-center justify-center px-3 py-4 sm:px-6 sm:py-6">
        <section className="ej-login-shell lg:grid-cols-[1fr_minmax(360px,440px)]">
          <div className="ej-login-aside relative hidden p-8 lg:flex lg:items-center lg:justify-center xl:p-10">
            <Image
              src="/assets/logo-deposito.png"
              alt="Logo Depósito"
              width={420}
              height={420}
              priority
              className="h-auto w-full max-w-[clamp(300px,34vw,460px)] object-contain"
            />
          </div>

          <div className="relative overflow-y-auto p-5 sm:p-8 lg:flex lg:items-center lg:p-10">
            <div className="w-full lg:mx-auto lg:max-w-[460px]">
              <div className="mb-4 flex justify-center lg:hidden">
                <Image
                  src="/assets/logo-deposito.png"
                  alt="Logo Depósito"
                  width={220}
                  height={220}
                  priority
                  className="h-auto w-36 object-contain sm:w-44"
                />
              </div>
              <div className="ej-login-card p-4 sm:p-5">
              <h1 className="ej-login-title mt-1 text-3xl font-black tracking-tight sm:text-4xl">Iniciar sesión</h1>
              <p className="ej-login-status mt-2 text-sm" suppressHydrationWarning>{status}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("PERSONAL");
                    setShowResetRequest(false);
                    setResetRequestMessage("");
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    loginMode === "PERSONAL"
                      ? "bg-[var(--color-ejercito-blue)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Personal por cédula
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("USUARIO");
                    setShowResetRequest(false);
                    setResetRequestMessage("");
                  }}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    loginMode === "USUARIO"
                      ? "bg-[var(--color-ejercito-blue)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Usuario del sistema
                </button>
              </div>

              {loginMode === "PERSONAL" ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-[var(--color-text-secondary)]">Ingresa con tu cédula y contraseña.</p>
                  <p className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                    <span className="font-semibold">Nota:</span> La contraseña inicial es tu misma cédula.
                  </p>
                </div>
              ) : null}

              {initMessage && showInitCredentials && initCredentials && (
                <div className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${
                  initMessage.type === "success"
                    ? "border-[rgb(31,103,40,0.45)] bg-[rgb(31,103,40,0.1)] text-[var(--color-text-primary)]"
                    : "border-[rgb(27,117,170,0.45)] bg-[rgb(27,117,170,0.1)] text-[var(--color-text-primary)]"
                }`}>
                  <p className="font-semibold">{initMessage.text}</p>
                  <div className="mt-3 space-y-1 rounded border border-current/20 bg-[var(--color-surface-base)] p-2 text-xs">
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
                  placeholder={loginMode === "PERSONAL" ? "Cédula" : "Usuario"}
                  className="ej-login-input px-3 py-2 text-sm"
                />
                <div className="relative">
                  <input
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Contrasena"
                    type={showLoginPassword ? "text" : "password"}
                    className="ej-login-input px-3 py-2 pr-20 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((current) => !current)}
                    aria-label={showLoginPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                    className="absolute inset-y-0 right-2 my-1 rounded px-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {showLoginPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading || loginLoading}
                  className="ej-login-submit px-3 py-2.5 text-sm disabled:opacity-60"
                >
                  {loading || loginLoading ? "Ingresando..." : "Entrar"}
                </button>
              </form>

              {loginMode === "USUARIO" ? (
                <>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResetRequest((current) => !current);
                        setResetRequestMessage("");
                        setResetUsername((current) => current || loginUsername.trim());
                      }}
                      className="ej-login-link text-xs font-semibold underline underline-offset-2"
                    >
                      {showResetRequest ? "Ocultar recuperación de contraseña" : "Olvidé mi contraseña"}
                    </button>
                  </div>

                  {showResetRequest ? (
                    <form onSubmit={requestPasswordReset} className="ej-login-reset mt-3 space-y-2 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Recuperar acceso</p>
                      <input
                        value={resetUsername}
                        onChange={(event) => setResetUsername(event.target.value)}
                        placeholder="Usuario"
                        className="ej-login-input px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={resetRequestLoading}
                        className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
                      >
                        {resetRequestLoading ? "Enviando..." : "Enviar enlace mágico"}
                      </button>
                      {resetRequestMessage ? <p className="text-xs text-[var(--color-text-secondary)]">{resetRequestMessage}</p> : null}
                    </form>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                  Si olvidaste la contraseña, solicita el restablecimiento a un administrador.
                </p>
              )}
              </div>

              <AppInstallCard compact />
            </div>
          </div>
        </section>
        <LoadingOverlay visible={isLoginGlobalBusy} label={loginBusyLabel} />
      </main>
    );
  }

  if (isPersonalAccount) {
    const personalCi = currentUser.personalCi ?? currentUser.username;
    const personalFullName = `${currentUser.apellido}, ${currentUser.nombre}`.replace(/\s+/g, " ").trim();
    const personalProfileState: PersonaProfileState = personalSelfProfile ?? {
      identity: {
        ci: personalCi,
        tipo: "SUBALTERNO",
        apellido: currentUser.apellido,
        nombre: currentUser.nombre,
        gradoAbreviacion: currentUser.grado,
        gradoNombre: currentUser.grado,
        bateriaNombre: null,
        telefonoContacto: null,
        mailReferencia: currentUser.mailReferencia ?? null,
        esReingreso: null,
        fechaIngreso: null,
        fechaIngresoOriginal: null,
        tallas: [],
      },
      loading: true,
      error: null,
      registros: [],
      prestamos: [],
      observaciones: [],
      equipmentSummary: [],
      timeline: [],
    };
    const personalBusyLabel = changeLoading
      ? "Actualizando contraseña..."
      : personalContactSaving
        ? "Actualizando datos de contacto..."
      : personalSelfProfileLoading
        ? "Cargando tu ficha personal..."
        : "Actualizando datos de acceso...";

    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
        <section className="ej-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">Portal de Personal</h1>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Acceso de solo consulta a tu información.</p>
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
                {`${currentUser.grado} ${personalFullName} · CI ${formatUruguayanCi(personalCi)}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void loadPersonalSelfProfile()}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
              >
                Recargar ficha
              </button>
              <button
                type="button"
                onClick={() => {
                  setPersonalContactTelefono(personalProfileState.identity.telefonoContacto ?? "");
                  setPersonalContactMail(personalProfileState.identity.mailReferencia ?? "");
                  setShowPersonalContactModal(true);
                }}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
              >
                Actualizar contacto
              </button>
              <button
                type="button"
                onClick={() => openOwnDeliverySheetPdf()}
                disabled={personalSelfProfile?.identity.tipo !== "SUBALTERNO"}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Ver hoja PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangeCurrentPassword("");
                  setChangeNewPassword("");
                  setChangeConfirmPassword("");
                  setShowChangePassword(true);
                }}
                className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
              >
                Cambiar contraseña
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="rounded-xl bg-[var(--color-ejercito-blue)] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </section>

        <PersonaProfileView
          state={personalProfileState}
          onBack={() => {}}
          onReload={() => void loadPersonalSelfProfile()}
          onPrintDeliverySheet={() => {}}
          onPrintPrestamos={() => {}}
          allowPrintActions={false}
          showBackButton={false}
        />

        <ChangePasswordModal
          isOpen={showChangePassword}
          currentPassword={changeCurrentPassword}
          newPassword={changeNewPassword}
          confirmPassword={changeConfirmPassword}
          loading={changeLoading}
          onCurrentPasswordChange={setChangeCurrentPassword}
          onNewPasswordChange={setChangeNewPassword}
          onConfirmPasswordChange={setChangeConfirmPassword}
          onClose={() => setShowChangePassword(false)}
          onSubmit={() => void submitChangePassword()}
        />

        <PersonalContactModal
          isOpen={showPersonalContactModal}
          telefonoContacto={personalContactTelefono}
          mailReferencia={personalContactMail}
          saving={personalContactSaving}
          onTelefonoContactoChange={setPersonalContactTelefono}
          onMailReferenciaChange={setPersonalContactMail}
          onClose={() => setShowPersonalContactModal(false)}
          onSubmit={() => void submitPersonalContactUpdate()}
        />

        <LoadingOverlay
          visible={loading || personalSelfProfileLoading || changeLoading || personalContactSaving}
          label={personalBusyLabel}
        />
      </main>
    );
  }

  return (
    <main className={activeView === "dashboard" ? "min-h-screen w-full" : "mx-auto min-h-screen w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8"}>
      <DashboardHero
        loading={loading}
        currentUser={currentUser}
        activeView={activeView}
        canWrite={canWrite}
        isAdmin={isAdmin}
        showConfigViews={showConfigViews}
        isConfigView={isConfigView}
        configMenuRef={configMenuRef}
        canManageAccount={canManageOwnAccount}
        personalCount={personal.length}
        oficialesSuboficialesCount={oficialesSuboficiales.length}
        equiposRegistradosCount={equipos.length}
        movimientosTotal={movimientosTotal}
        roleLabel={roleLabel}
        onSelectView={handleSelectMainView}
        onSetConfigViews={setShowConfigViews}
        onReload={() => reloadCurrentViewData(true)}
        onEditOwnUser={changeOwnUsername}
        onChangePassword={() => {
          setChangeCurrentPassword("");
          setChangeNewPassword("");
          setChangeConfirmPassword("");
          setShowChangePassword(true);
        }}
        onLogout={() => void logout()}
      />

      <div>
        {activeView !== "dashboard" ? <AppInstallCard /> : null}

        {inReminderConfigView ? (
          <RecordatoriosConfigView
            tasks={recordatorioTasks}
            config={recordatorioConfig}
            isAdmin={isAdmin}
            currentUserId={currentUser?.usuarioId ?? null}
            userOptions={usuarios.filter((usuario) => usuario.accountType === "SISTEMA")}
            loading={recordatoriosLoading}
            saving={recordatoriosSaving}
            error={recordatoriosError}
            onCreateTask={createRecordatorioTask}
            onUpdateTask={updateRecordatorioTask}
            onDeleteTask={deleteRecordatorioTask}
            onToggleWidget={updateRecordatorioConfig}
            soldadoVariant={soldadoWidgetVariant}
            onToggleSoldadoVariant={toggleSoldadoWidgetVariant}
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
          auditUserFilter={auditUserFilter}
          auditUserOptions={auditUserOptions}
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
          onAuditUserFilterChange={setAuditUserFilter}
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
          onBack={() => setActiveView("usuarios")}
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
          onEmailAllDeliverySheets={emailAllDeliverySheets}
          onCancelEmailAllDeliverySheets={cancelBulkDeliveryEmailJob}
          emailAllDeliverySheetsBusy={bulkDeliveryEmailBusy}
          emailAllDeliverySheetsDisabledReason={bulkDeliveryEmailDisabledReason}
          onPrintPersonnelByBattery={printPersonnelByBattery}
          onOpenMassEntrega={() => openMassRegistro("ENTREGA")}
          onOpenCreate={() => setActiveView("personal_nuevo")}
          onToggleTallas={toggleTallas}
          onDeletePersonal={(ci) => void deletePersonal(ci)}
          onOpenRegistro={(ci, tipo) => openRegistro(ci, tipo)}
          onOpenPersonalObservacion={(persona) => void openPersonalObservacion(persona)}
          onOpenRegistroViewer={(persona) => void openRegistroViewer(persona)}
          onOpenProfile={(persona) => void openPersonaProfileFromPersonal(persona)}
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
          onOpenProfile={(registro) => void openPersonaProfileFromOficialSuboficial(registro)}
          onReload={() => reloadCurrentViewData(true)}
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
          onOpenProfile={(registro) => void openPersonaProfileFromOficialSuboficial(registro)}
          onReload={() => reloadCurrentViewData(true)}
        />
        ) : null}

        {activeView === "oficiales_resumen" ? (
        <OficialesSuboficialesResumenView
          oficialesSuboficiales={oficialesSuboficiales}
          viewType="OFICIAL"
          loading={loading}
          onReload={() => reloadCurrentViewData(true)}
        />
        ) : null}

        {activeView === "suboficiales_resumen" ? (
        <OficialesSuboficialesResumenView
          oficialesSuboficiales={oficialesSuboficiales}
          viewType="SUBOFICIAL"
          loading={loading}
          onReload={() => reloadCurrentViewData(true)}
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
          editingPrestamoId={editingPrestamoId}
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
          onEditPrestamo={(prestamoId, payload) => editPrestamo(prestamoId, payload)}
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
          onUpdateCodigoSIE={(input) => void updateEtiquetadoCodigoSIE(input)}
          onDeleteCodigoSIE={(codigoSIEId, codigo) => void deleteEtiquetadoCodigoSIE(codigoSIEId, codigo)}
          onCreateCaja={(input) => void createEtiquetadoCaja(input)}
          onDeleteCaja={(codigoDepositoGeneral) => void deleteEtiquetadoCaja(codigoDepositoGeneral)}
          onPrintCaja={(codigoDepositoGeneral, orientacion) => printEtiquetaCaja(codigoDepositoGeneral, orientacion)}
          onPrintListadoCajas={printListadoCajas}
          onPrintTodas={(cajas) => printTodasEtiquetas(cajas)}
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

        {activeView === "persona_ficha" ? (
        <PersonaProfileView
          state={personaProfile}
          onBack={closePersonaProfileView}
          onReload={() => void reloadPersonaProfile()}
          onPrintDeliverySheet={printDeliverySheetFromProfile}
          onPrintPrestamos={printPrestamosFromProfile}
        />
        ) : null}

        {activeView === "hoja-de-entrega" && fichaViewingCi ? (

          <HojaDeEntregaView ci={fichaViewingCi} onClose={() => setActiveView("personal")} />
        ) : null}

        {renderSoldadoRecordatorioWidget({
          activeView,
          config: recordatorioConfig,
          tasks: recordatorioTasks,
          loading: recordatoriosLoading,
          saving: recordatoriosSaving,
          displayName: (currentUser.nombre || currentUser.username).trim(),
          soldadoVariant: soldadoWidgetVariant,
          onCreateTask: createRecordatorioTask,
          onToggleTask: (tareaId, completada) => updateRecordatorioTask(tareaId, { completada }),
          onOpenConfig: () => setActiveView("recordatorios"),
        })}

        <LoadingOverlay visible={isAppGlobalBusy} label={appBusyLabel} />
      </div>

    </main>
  );
}
