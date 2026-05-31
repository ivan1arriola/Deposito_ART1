"use client";

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
import { GlobalSearchModal } from "./components/home/GlobalSearchModal";
import { MainNavigation } from "./components/home/MainNavigation";
import { Box, Typography, Divider, Stack, Button, IconButton, Drawer } from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import { AdminPushNotifications } from "./components/home/AdminPushNotifications";
import Image from "next/image";
import { HomeOverlaysLayer } from "./components/home/overlays/HomeOverlaysLayer";
import { HomeViewRouter } from "./components/home/HomeViewRouter";
import { PersonalPortalView } from "./components/home/PersonalPortalView";
import { LoginScreen } from "./components/auth/LoginScreen";
import { AppInstallCard } from "./components/pwa/AppInstallCard";
import {
  type PersonaProfileEquipmentRow,
  type PersonaProfileIdentity,
  type PersonaProfileState,
  type PersonaProfileTimelineEntry,
  type PersonaProfileTipo,
} from "./components/views/PersonaProfileView";
import { ConfigViews } from "./components/views/ConfigViews";
import type { PrestamoEditPayload } from "./components/views/FormulariosPrestamosView";
import { RecordatoriosConfigView } from "./components/views/RecordatoriosConfigView";
import { EquiposUnificarView } from "./components/views/EquiposUnificarView";
import { SmallActionButton, ActionMenu, toast } from "./components/shared";
import { useHomeData } from "./hooks/useHomeData";
import { useLoginState } from "./hooks/useLoginState";
import { useStockPrestamoDraftItems } from "./hooks/useStockPrestamoDraftItems";

// Importar tipos desde archivos de tipos organizados
import type {
  Role,
  Equipo,
  EquipoTipo,
  Personal,
  OficialSuboficial,
  PersonalObservacion,
  RecordatorioConfig,
  RecordatorioTarea,
  SoldadoWidgetVariant,
  FirmaConfig,
  UsuarioAdmin,
  Talla,
  TipoArticulo,
  TipoEquipo,
} from "@/types/entities";
import type {
  PersonalForm,
  OficialSuboficialForm,
  PersonalAltaMovimientoForm,
  EquipoForm,
  PrestamoDraft,
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
import type { PersonalCurrentUser } from "./types/home";

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
import { compareEquiposByTipoAndOrder } from "@/lib/equipo-sort";
import { GENERAL_TIPO_EQUIPO_CLAVE } from "@/lib/equipo-tipos";
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
  createArticuloHandler,
  updateArticuloHandler,
  deleteArticuloHandler,
  ingresarStockArticuloHandler,
  entregarArticulosPersonalHandler,
  createEquipoTipoHandler,
  createEquipoHandler,
  deleteEquipoTipoHandler,
  updateEquipoHandler,
  updateEquipoTipoHandler,
  deleteEquipoHandler,
  mergeEquipoHandler,
  loadEquipoDeleteImpactHandler,
  updateMultipleEquipoOrdersHandler,
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

type DeleteTipoEquipoResult = {
  equiposReasignadosAGeneral?: number;
};

type EtiquetadoSection = "codigos_sie" | "listado_cajas" | "imprimir_todas";
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
const STATUS_SESSION_CLOSED = "Sesión cerrada. Ingresa tus credenciales.";
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
    toast.info("Envío cancelado.", {
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

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  const err = error as Record<string, unknown>;
  return (
    err.name === "AbortError" ||
    err.code === 20 ||
    (typeof err.message === "string" && err.message.toLowerCase().includes("aborted")) ||
    (typeof err.message === "string" && err.message === "signal is aborted without reason")
  );
}

function isSoldadoWidgetVariant(value: string | null): value is SoldadoWidgetVariant {
  return value === "CLASICO" || value === "TACTICO";
}

export default function Home() {
  const { data: session } = useSession();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "6.1.0";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    articulos,
    tiposEquipo,
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

  const [papeleraRecords, setPapeleraRecords] = useState<any[]>([]);
  const [papeleraLoading, setPapeleraLoading] = useState(false);

  const loadPapelera = useCallback(async () => {
    setPapeleraLoading(true);
    try {
      const response = await fetch("/api/papelera");
      if (response.ok) {
        const data = await response.json();
        setPapeleraRecords(data);
      } else {
        
      }
    } catch (err) {
      
    } finally {
      setPapeleraLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === "papelera") {
      void loadPapelera();
    }
  }, [activeView, loadPapelera]);

  const restorePapelera = useCallback(async (papeleraId: string) => {
    try {
      const response = await fetch(`/api/papelera/${papeleraId}/restore`, {
        method: "POST",
      });
      if (response.ok) {
        setStatus("Restaurado con éxito.");
        void loadPapelera();
        void loadData();
      } else {
        const data = await response.json();
        setStatus(data.error || "No se pudo restaurar.");
      }
    } catch (err) {
      setStatus("Error de red al restaurar.");
    }
  }, [loadPapelera, loadData]);

  const deletePapeleraPermanent = useCallback(async (papeleraId: string) => {
    try {
      const response = await fetch(`/api/papelera/${papeleraId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setStatus("Eliminado permanentemente.");
        void loadPapelera();
      } else {
        const data = await response.json();
        setStatus(data.error || "No se pudo eliminar permanentemente.");
      }
    } catch (err) {
      setStatus("Error de red al eliminar permanentemente.");
    }
  }, [loadPapelera]);
  const {
    loginMode,
    loginUsername,
    loginPassword,
    setLoginPassword,
    showLoginPassword,
    setShowLoginPassword,
    loginLoading,
    setLoginLoading,
    showResetRequest,
    resetUsername,
    setResetUsername,
    resetRequestLoading,
    setResetRequestLoading,
    resetRequestMessage,
    setResetRequestMessage,
    handleLoginUsernameChange,
    handleLoginUsernamePaste,
    handleLoginUsernameKeyDown,
    handleSelectPersonalLogin,
    handleSelectSystemLogin,
    handleToggleResetRequest,
  } = useLoginState();
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
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);


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

  const [newArticuloNombre, setNewArticuloNombre] = useState("");
  const [newArticuloTipo, setNewArticuloTipo] = useState<TipoArticulo>("OFICINA");
  const [creatingArticulo, setCreatingArticulo] = useState(false);
  const [articuloStockIngresoId, setArticuloStockIngresoId] = useState("");
  const [articuloStockIngresoCantidad, setArticuloStockIngresoCantidad] = useState("1");
  const [articuloStockIngresoComentarios, setArticuloStockIngresoComentarios] = useState("");
  const [articuloStockIngresoSaving, setArticuloStockIngresoSaving] = useState(false);
  const [editArticuloId, setEditArticuloId] = useState<number | null>(null);

  const [articuloEntregaPersonalCi, setArticuloEntregaPersonalCi] = useState("");
  const [articuloEntregaPersonalOrdenanteCi, setArticuloEntregaPersonalOrdenanteCi] = useState("");
  const [articuloEntregaPersonalFecha, setArticuloEntregaPersonalFecha] = useState(getTodayDateInput());
  const [articuloEntregaPersonalComentarios, setArticuloEntregaPersonalComentarios] = useState("");
  const [articuloEntregaPersonalItems, setArticuloEntregaPersonalItems] = useState<import("@/app/components/views/ArticuloEntregaPersonalView").ArticuloEntregaPersonalDraftItem[]>([
    { articuloId: "", cantidad: "1" },
  ]);
  const [articuloEntregaPersonalSaving, setArticuloEntregaPersonalSaving] = useState(false);

  const updateArticuloEntregaPersonalItem = useCallback((index: number, field: "articuloId" | "cantidad", value: string) => {
    setArticuloEntregaPersonalItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }, []);

  const addArticuloEntregaPersonalItem = useCallback(() => {
    setArticuloEntregaPersonalItems((prev) => [...prev, { articuloId: "", cantidad: "1" }]);
  }, []);

  const removeArticuloEntregaPersonalItem = useCallback((index: number) => {
    setArticuloEntregaPersonalItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);
  const [editArticuloNombre, setEditArticuloNombre] = useState("");
  const [editArticuloTipo, setEditArticuloTipo] = useState<TipoArticulo>("OFICINA");

  const [newEquipo, setNewEquipo] = useState<EquipoForm>(EMPTY_EQUIPO_FORM);
  const [creatingEquipo, setCreatingEquipo] = useState(false);
  const [editEquipoId, setEditEquipoId] = useState<string | null>(null);
  const [editEquipo, setEditEquipo] = useState<EquipoForm>(EMPTY_EQUIPO_FORM);
  const [newTipoEquipoNombre, setNewTipoEquipoNombre] = useState("");
  const [newTipoEquipoOrden, setNewTipoEquipoOrden] = useState("");
  const [editTipoEquipoId, setEditTipoEquipoId] = useState<number | null>(null);
  const [editTipoEquipoNombre, setEditTipoEquipoNombre] = useState("");
  const [editTipoEquipoOrden, setEditTipoEquipoOrden] = useState("");
  const [equipoOrderDraftIds, setEquipoOrderDraftIds] = useState<string[] | null>(null);
  const [equipoInactivoOrderDraftIds, setEquipoInactivoOrderDraftIds] = useState<string[] | null>(null);
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
  const {
    updateStockDraftItem,
    addStockDraftItem,
    removeStockDraftItem,
    updatePrestamoDraftItem,
    addPrestamoDraftItem,
    removePrestamoDraftItem,
  } = useStockPrestamoDraftItems({
    setStockDraft,
    setPrestamoDraft,
    onStatusChange: setStatus,
  });
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
    ? "Ya hay un envío de hojas de entrega en curso. Puedes seguirlo desde la notificación flotante."
    : !currentUserReferenceEmail
      ? "Configura un correo de referencia en tu usuario para habilitar este envío."
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
  const inCatalogView =
    activeView === "grados" ||
    activeView === "baterias" ||
    activeView === "articulos" ||
    activeView === "equipos" ||
    activeView === "tipos_equipo";
  const inReminderConfigView = activeView === "recordatorios";
  const inAdminConfigView = activeView === "firmas" || activeView === "usuarios" || activeView === "auditoria" || activeView === "papelera";
  const inEtiquetadoView =
    activeView === "etiquetado_codigos_sie" ||
    activeView === "etiquetado_registrar_caja" ||
    activeView === "etiquetado_listado_cajas" ||
    activeView === "etiquetado_imprimir_todas";
  const ciPlaceholder = useMemo(() => generatePlaceholderUruguayanCi(), []);
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
  const tiposEquipoOptions = useMemo<EquipoTipo[]>(
    () => {
      const baseTipos =
        tiposEquipo.length > 0
          ? tiposEquipo
          : [
              {
                tipoEquipoId: null,
                clave: GENERAL_TIPO_EQUIPO_CLAVE,
                nombre: "General",
                orden: 0,
                esGeneral: true,
              },
            ];

      const byKey = new Map(baseTipos.map((tipo) => [tipo.clave, tipo]));
      for (const equipo of equipos) {
        if (byKey.has(equipo.tipo)) continue;
        byKey.set(equipo.tipo, {
          tipoEquipoId: equipo.tipoEquipoId ?? null,
          clave: equipo.tipo,
          nombre: equipo.tipoLabel ?? equipo.tipo,
          orden: typeof equipo.tipoOrden === "number" ? equipo.tipoOrden : byKey.size,
          esGeneral: equipo.tipo === GENERAL_TIPO_EQUIPO_CLAVE,
        });
      }

      return Array.from(byKey.values()).sort((left, right) => {
        if (left.orden !== right.orden) return left.orden - right.orden;
        return left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" });
      });
    },
    [equipos, tiposEquipo],
  );
  const tipoEquipoByClave = useMemo(
    () => new Map(tiposEquipoOptions.map((tipo) => [tipo.clave, tipo])),
    [tiposEquipoOptions],
  );
  const equiposRelacionadosCountByTipoEquipoId = useMemo(() => {
    const next = new Map<number, number>();

    for (const equipo of equipos) {
      if (equipo.tipoEquipoId == null) continue;
      next.set(equipo.tipoEquipoId, (next.get(equipo.tipoEquipoId) ?? 0) + 1);
    }

    return next;
  }, [equipos]);
  useEffect(() => {
    setNewEquipo((previous) => (
      tipoEquipoByClave.has(previous.tipo)
        ? previous
        : { ...previous, tipo: GENERAL_TIPO_EQUIPO_CLAVE }
    ));
    setEditEquipo((previous) => (
      tipoEquipoByClave.has(previous.tipo)
        ? previous
        : { ...previous, tipo: GENERAL_TIPO_EQUIPO_CLAVE }
    ));
  }, [tipoEquipoByClave]);
  const equiposOrdenados = useMemo(
    () => [...equipos].sort(compareEquiposByTipoAndOrder),
    [equipos],
  );
  const equiposActivos = useMemo(() => equiposOrdenados.filter((item) => item.activo), [equiposOrdenados]);
  const equiposInactivos = useMemo(() => equiposOrdenados.filter((item) => !item.activo), [equiposOrdenados]);
  const equiposActivosIdsByTipo = useMemo(() => {
    const next = new Map<string, Set<string>>();
    for (const tipo of tiposEquipoOptions) {
      next.set(
        tipo.clave,
        new Set(equiposActivos.filter((item) => item.tipo === tipo.clave).map((item) => item.equipoId)),
      );
    }
    return next;
  }, [equiposActivos, tiposEquipoOptions]);
  const equiposInactivosIdsByTipo = useMemo(() => {
    const next = new Map<string, Set<string>>();
    for (const tipo of tiposEquipoOptions) {
      next.set(
        tipo.clave,
        new Set(equiposInactivos.filter((item) => item.tipo === tipo.clave).map((item) => item.equipoId)),
      );
    }
    return next;
  }, [equiposInactivos, tiposEquipoOptions]);
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
  const auditUserOptions: { value: string; label: string }[] = [];

  const auditoriaFiltrada = useMemo(() => {
    let filtered = auditoria;

    if (auditFilter === "MOVIMIENTOS") {
      filtered = filtered.filter(
        (log) =>
          log.entidad === "REGISTRO" ||
          log.entidad === "ARTICULO_STOCK" ||
          log.entidad === "ARTICULO_ENTREGA_PERSONAL"
      );
    } else if (auditFilter === "AUTENTICACION") {
      filtered = filtered.filter((log) => log.entidad === "AUTH");
    }

    if (auditUserFilter === AUDIT_USER_FILTER_SYSTEM) {
      filtered = filtered.filter((log) => {
        if (log.usuario?.usuarioId) return false;
        if (log.detalle && typeof log.detalle === "object" && !Array.isArray(log.detalle)) {
          const det = log.detalle as Record<string, unknown>;
          if (det.accountType === "PERSONAL" || det.ci) return false;
        }
        return true;
      });
    } else if (auditUserFilter && auditUserFilter !== AUDIT_USER_FILTER_ALL) {
      const query = auditUserFilter.toLowerCase().trim();
      filtered = filtered.filter((log) => {
        // 1. Search in system user details
        if (log.usuario) {
          const u = log.usuario;
          const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
          const username = u.username.toLowerCase();
          const grado = (u.rango?.abreviacion || "").toLowerCase();
          const rol = roleLabel(u.rol).toLowerCase();
          if (
            fullName.includes(query) ||
            username.includes(query) ||
            grado.includes(query) ||
            rol.includes(query)
          ) {
            return true;
          }
        }
        // 2. Search in log details for personal users
        if (log.detalle && typeof log.detalle === "object" && !Array.isArray(log.detalle)) {
          const det = log.detalle as Record<string, unknown>;
          if (det.accountType === "PERSONAL" || det.ci) {
            const ci = String(det.ci || det.username || log.entidadId || "").toLowerCase();
            const detName = `${det.nombre || ""} ${det.apellido || ""}`.toLowerCase();
            const detGrado = String(det.grado || det.gradoAbreviacion || "").toLowerCase();
            if (
              ci.includes(query) ||
              detName.includes(query) ||
              detGrado.includes(query)
            ) {
              return true;
            }
          }
        }
        // 3. Match 'sistema' keyword for purely system records
        if (!log.usuario && query === "sistema") {
          const isPersonal =
            log.detalle &&
            typeof log.detalle === "object" &&
            !Array.isArray(log.detalle) &&
            ((log.detalle as any).accountType === "PERSONAL" || (log.detalle as any).ci);
          if (!isPersonal) return true;
        }
        return false;
      });
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
    const activeById = new Map(equiposActivos.map((item) => [item.equipoId, item]));
    return equipoOrderDraftIds
      .map((itemId) => activeById.get(itemId))
      .filter((item): item is Equipo => item !== undefined);
  }, [equiposActivos, equipoOrderDraftIds]);
  const hasEquipoOrderDraftChanges = useMemo(() => {
    if (!equipoOrderDraftIds) return false;
    const currentActiveIds = equiposActivos.map((item) => item.equipoId);
    if (equipoOrderDraftIds.length !== currentActiveIds.length) return true;
    return equipoOrderDraftIds.some((itemId, index) => itemId !== currentActiveIds[index]);
  }, [equiposActivos, equipoOrderDraftIds]);
  const equiposInactivosEnPantalla = useMemo(() => {
    if (!equipoInactivoOrderDraftIds) return equiposInactivos;
    const inactivoById = new Map(equiposInactivos.map((item) => [item.equipoId, item]));
    return equipoInactivoOrderDraftIds
      .map((itemId) => inactivoById.get(itemId))
      .filter((item): item is Equipo => item !== undefined);
  }, [equiposInactivos, equipoInactivoOrderDraftIds]);
  const hasEquipoInactivoOrderDraftChanges = useMemo(() => {
    if (!equipoInactivoOrderDraftIds) return false;
    const currentInactivoIds = equiposInactivos.map((item) => item.equipoId);
    if (equipoInactivoOrderDraftIds.length !== currentInactivoIds.length) return true;
    return equipoInactivoOrderDraftIds.some((itemId, index) => itemId !== currentInactivoIds[index]);
  }, [equiposInactivos, equipoInactivoOrderDraftIds]);
  const mergeEquipoSource = useMemo(() => {
    if (!mergeEquipoDialog) return null;
    return equiposOrdenados.find((equipo) => equipo.equipoId === mergeEquipoDialog.sourceItemId) ?? null;
  }, [equiposOrdenados, mergeEquipoDialog]);
  const mergeEquipoTargetOptions = useMemo(() => {
    if (!mergeEquipoDialog) return [] as Equipo[];
    return equiposOrdenados.filter((equipo) => equipo.equipoId !== mergeEquipoDialog.sourceItemId);
  }, [equiposOrdenados, mergeEquipoDialog]);
  const mergeEquipoDialogTargetId = useMemo(() => {
    if (!mergeEquipoDialog) return "";
    if (mergeEquipoTargetOptions.some((equipo) => equipo.equipoId === mergeEquipoDialog.targetItemId)) {
      return mergeEquipoDialog.targetItemId;
    }
    return mergeEquipoTargetOptions[0]?.equipoId ?? "";
  }, [mergeEquipoDialog, mergeEquipoTargetOptions]);
  useEffect(() => {
    const ids = new Set(equipos.map((equipo) => equipo.equipoId));

    setMergeEquipoOrigenId((current) => (current !== "" && ids.has(current) ? current : ""));
    setMergeEquipoDestinoId((current) => (current !== "" && ids.has(current) ? current : ""));
  }, [equipos]);
  const personalOrdenado = useMemo(() => [...personal].sort(comparePersonalByHierarchy), [personal]);
  const personalSearchIndex = useMemo(() => {
    type PersonalSearchEntry = {
      persona: Personal;
      ciDigits: string;
      nombresText: string;
      apellidosText: string;
    };

    const allEntries: PersonalSearchEntry[] = [];
    const byBatteryFilter = new Map<string, PersonalSearchEntry[]>();
    byBatteryFilter.set("ALL", allEntries);

    for (const persona of personalOrdenado) {
      const entry: PersonalSearchEntry = {
        persona,
        ciDigits: normalizeCi(persona.ci),
        nombresText: normalizeSearchTerm(`${persona.nombre1} ${persona.nombre2 ?? ""}`),
        apellidosText: normalizeSearchTerm(`${persona.apellido1} ${persona.apellido2 ?? ""}`),
      };
      allEntries.push(entry);

      const batteryKey = persona.bateriaId == null ? "NONE" : String(persona.bateriaId);
      const batteryEntries = byBatteryFilter.get(batteryKey);
      if (batteryEntries) {
        batteryEntries.push(entry);
      } else {
        byBatteryFilter.set(batteryKey, [entry]);
      }
    }

    return { allEntries, byBatteryFilter };
  }, [personalOrdenado]);
  const searchCedulaDigits = normalizeCi(searchCedula.trim());
  const searchNombresText = normalizeSearchTerm(searchNombres);
  const searchApellidosText = normalizeSearchTerm(searchApellidos);
  const hasPersonalFilters =
    searchCedula.trim() !== "" || searchNombres.trim() !== "" || searchApellidos.trim() !== "" || bateriaFilter !== "ALL";
  const personalFiltrado = useMemo(() => {
    const baseEntries = personalSearchIndex.byBatteryFilter.get(bateriaFilter) ?? [];
    return baseEntries
      .filter((entry) => {
        if (searchCedulaDigits !== "" && !entry.ciDigits.includes(searchCedulaDigits)) {
          return false;
        }

        if (searchNombresText !== "" && !entry.nombresText.includes(searchNombresText)) {
          return false;
        }

        if (searchApellidosText !== "" && !entry.apellidosText.includes(searchApellidosText)) {
          return false;
        }

        return true;
      })
      .map((entry) => entry.persona);
  }, [personalSearchIndex, bateriaFilter, searchCedulaDigits, searchNombresText, searchApellidosText]);
  const personalTotalPages = Math.max(1, Math.ceil(personalFiltrado.length / personalPageSize));
  const personalPageSafe = Math.min(personalPage, personalTotalPages);
  const personalFiltradoPaginado = useMemo(() => {
    const start = (personalPageSafe - 1) * personalPageSize;
    return personalFiltrado.slice(start, start + personalPageSize);
  }, [personalFiltrado, personalPageSafe, personalPageSize]);
  const isConfigView =
    inCatalogView ||
    inReminderConfigView ||
    inAdminConfigView ||
    activeView === "usuario_nuevo" ||
    activeView === "articulo_nuevo" ||
    activeView === "articulo_stock_ingreso";
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

  // Handle back button using History API
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setActiveView(event.state.view as MainView);
      } else {
        const hash = window.location.hash.replace("#", "");
        if (hash) {
          setActiveView(hash as MainView);
        } else {
          setActiveView("dashboard");
        }
      }
    };
    
    window.addEventListener("popstate", handlePopState);
    
    const initialHash = window.location.hash.replace("#", "");
    if (initialHash && initialHash !== "dashboard") {
      // Sync state to the URL hash on direct link visit
      setActiveView(initialHash as MainView);
      window.history.replaceState({ view: initialHash }, "", `#${initialHash}`);
    } else {
      // Replace initial state so the first pop works correctly
      window.history.replaceState({ view: "dashboard" }, "", `#dashboard`);
    }
    
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync activeView changes to history
  useEffect(() => {
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash !== activeView) {
      window.history.pushState({ view: activeView }, "", `#${activeView}`);
    }
  }, [activeView]);

  useEffect(() => {
    if (!currentUser || currentUser.rol !== "ADMIN") return;
    if (!(inAdminConfigView || activeView === "usuario_nuevo" || inReminderConfigView)) return;
    void loadAdminData();
  }, [activeView, currentUser, inAdminConfigView, inReminderConfigView, loadAdminData]);

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
      const message = error instanceof Error ? error.message : "No se pudo actualizar la configuración del recordatorio.";
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
    if (activeView === "articulo_nuevo" && !isAdmin) {
      setActiveView("articulos");
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    if (activeView === "articulo_stock_ingreso" && !canWrite) {
      setActiveView("articulos");
    }
  }, [activeView, canWrite]);

  useEffect(() => {
    if (activeView === "usuario_nuevo" && !isAdmin) {
      setActiveView("personal");
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    if (articulos.length === 0) {
      if (articuloStockIngresoId !== "") {
        setArticuloStockIngresoId("");
      }
      return;
    }

    const selectedExists = articulos.some((articulo) => String(articulo.articuloId) === articuloStockIngresoId);
    if (!selectedExists) {
      setArticuloStockIngresoId(String(articulos[0].articuloId));
    }
  }, [articuloStockIngresoId, articulos]);

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
    const currentActiveIds = new Set(equiposActivos.map((item) => item.equipoId));
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
    if (
      view === "stock_prestamos" ||
      view === "formularios" ||
      view === "prestamos_registrar" ||
      view === "prestamos_vigentes" ||
      view === "prestamos_historial"
    ) {
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
        await createEquipoHandler(input.nombre, GENERAL_TIPO_EQUIPO_CLAVE, false, {
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
      estanteria: string;
      piso: number;
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
        const response = await api<{ ok: true; codigoDepositoGeneral: number }>("/api/etiquetado/cajas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        setStatus(`Caja ${response.codigoDepositoGeneral} registrada.`);
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

  const createArticulo = useCallback(async () => {
    if (!isAdmin) {
      setStatus("Solo el administrador puede registrar artículos.");
      return;
    }
    setCreatingArticulo(true);
    try {
      await createArticuloHandler(newArticuloNombre, newArticuloTipo, {
        onSuccess: async () => {
          setNewArticuloNombre("");
          setNewArticuloTipo("OFICINA");
          setStatus("Artículo creado.");
          await loadData();
          setActiveView("articulos");
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    } finally {
      setCreatingArticulo(false);
    }
  }, [isAdmin, newArticuloNombre, newArticuloTipo, loadData]);

  const updateArticulo = useCallback(
    async (articuloId: number) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede editar artículos.");
        return;
      }
      try {
        await updateArticuloHandler(articuloId, editArticuloNombre, editArticuloTipo, {
          onSuccess: async () => {
            setEditArticuloId(null);
            setEditArticuloNombre("");
            setEditArticuloTipo("OFICINA");
            setStatus("Artículo actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      }
    },
    [isAdmin, editArticuloNombre, editArticuloTipo, loadData],
  );

  const deleteArticulo = useCallback(
    async (articuloId: number) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede eliminar artículos.");
        return;
      }
      const articulo = articulos.find((entry) => entry.articuloId === articuloId);

      try {
        const res = await fetch(`/api/articulos/${articuloId}`);
        if (!res.ok) throw new Error("No se pudieron cargar los movimientos del artículo.");
        const data = await res.json();

        const movimientosList = data.movimientos || [];

        const dialogMessage = (
          <div className="space-y-4">
            <p className="text-stone-750 leading-normal">
              ¿Estás seguro de que deseas eliminar el artículo <strong className="text-stone-900 font-extrabold">{articulo?.nombre}</strong>?
            </p>

            {movimientosList.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-amber-200 bg-amber-55/70 p-3 text-xs text-amber-900">
                  ⚠️ <strong className="font-extrabold">Atención:</strong> Este artículo está vinculado a <strong className="font-black">{movimientosList.length}</strong> movimiento(s) de stock. Al confirmarse la eliminación, todos estos movimientos y sus comprobantes de entrega se transferirán automáticamente a la papelera.
                </div>

                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                  <span className="text-[10px] font-black uppercase tracking-wide text-stone-500 block mb-1.5">
                    Movimientos Vinculados
                  </span>

                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                    {movimientosList.map((m: any) => (
                      <div key={m.articuloStockMovimientoId} className="flex justify-between items-center rounded-lg border border-stone-150 bg-white p-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                              m.tipo === "INGRESO" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
                            }`}>
                              {m.tipo}
                            </span>
                            <span className="font-mono text-stone-600 text-[10px]">{m.fechaEntrega || m.createdAt.split("T")[0]}</span>
                          </div>
                          {m.destinatario && (
                            <p className="mt-1 text-stone-900 font-semibold">{m.destinatario}</p>
                          )}
                          {m.comentario && (
                            <p className="mt-0.5 text-[10px] text-stone-500 italic">“{m.comentario}”</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-black text-xs ${
                            m.tipo === "INGRESO" ? "text-emerald-700" : "text-rose-700"
                          }`}>
                            {m.tipo === "INGRESO" ? "+" : "-"}{m.cantidad}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic mt-2">
                Este artículo no posee movimientos de stock ni comprobantes de entrega vinculados.
              </p>
            )}
          </div>
        );

        openConfirmDialog({
          title: "Eliminar artículo",
          message: dialogMessage,
          confirmText: "Eliminar artículo",
          tone: "danger",
          onConfirm: async () => {
            try {
              await deleteArticuloHandler(articuloId, {
                onSuccess: async () => {
                  setStatus("Artículo eliminado.");
                  await loadData();
                },
                onError: (message) => setStatus(message),
              });
            } catch {
              // Error manejado en el handler
            }
          },
        });
      } catch (err: any) {
        setStatus(err.message || "Error al cargar los movimientos del artículo.");
      }
    },
    [isAdmin, articulos, loadData],
  );

  const submitArticuloStockIngreso = useCallback(async () => {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar ingresos de stock de artículos.");
      return;
    }

    const articuloId = Number(articuloStockIngresoId);
    const cantidad = Number(articuloStockIngresoCantidad);
    if (!Number.isInteger(articuloId) || articuloId <= 0) {
      setStatus("Debes seleccionar un artículo.");
      return;
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      setStatus("La cantidad a ingresar debe ser un entero positivo.");
      return;
    }

    setArticuloStockIngresoSaving(true);
    try {
      await ingresarStockArticuloHandler(
        articuloId,
        cantidad,
        articuloStockIngresoComentarios.trim() || undefined,
        {
          onSuccess: async () => {
            setArticuloStockIngresoCantidad("1");
            setArticuloStockIngresoComentarios("");
            setStatus("Ingreso de stock del artículo registrado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        },
      );
    } catch {
      // Error manejado en el handler
    } finally {
      setArticuloStockIngresoSaving(false);
    }
  }, [canWrite, articuloStockIngresoId, articuloStockIngresoCantidad, articuloStockIngresoComentarios, loadData]);

  const submitArticuloEntregaPersonal = useCallback(async () => {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar entregas de artículos.");
      return;
    }

    if (!articuloEntregaPersonalCi.trim()) {
      setStatus("Debes seleccionar el destinatario de la entrega.");
      return;
    }
    if (!articuloEntregaPersonalOrdenanteCi.trim()) {
      setStatus("Debes seleccionar quién ordena la entrega.");
      return;
    }
    if (articuloEntregaPersonalCi === articuloEntregaPersonalOrdenanteCi) {
      setStatus("El destinatario no puede ser el mismo que ordena la entrega.");
      return;
    }

    const itemsPayload = articuloEntregaPersonalItems.map((item) => ({
      articuloId: Number(item.articuloId),
      cantidad: Number(item.cantidad),
    }));

    for (let i = 0; i < itemsPayload.length; i++) {
      const item = itemsPayload[i];
      if (!Number.isInteger(item.articuloId) || item.articuloId <= 0) {
        setStatus(`Debes seleccionar un artículo en la fila ${i + 1}.`);
        return;
      }
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        setStatus(`La cantidad en la fila ${i + 1} debe ser un entero positivo.`);
        return;
      }
    }

    setArticuloEntregaPersonalSaving(true);
    try {
      await entregarArticulosPersonalHandler(
        articuloEntregaPersonalCi,
        articuloEntregaPersonalOrdenanteCi,
        articuloEntregaPersonalFecha,
        articuloEntregaPersonalComentarios.trim() || undefined,
        itemsPayload,
        {
          onSuccess: async () => {
            setArticuloEntregaPersonalCi("");
            setArticuloEntregaPersonalOrdenanteCi("");
            setArticuloEntregaPersonalFecha(getTodayDateInput());
            setArticuloEntregaPersonalComentarios("");
            setArticuloEntregaPersonalItems([{ articuloId: "", cantidad: "1" }]);
            setStatus("Entrega de artículos registrada exitosamente.");
            setActiveView("articulos");
            await loadData();
          },
          onError: (message) => setStatus(message),
        },
      );
    } catch {
      // Error manejado en el handler
    } finally {
      setArticuloEntregaPersonalSaving(false);
    }
  }, [
    canWrite,
    articuloEntregaPersonalCi,
    articuloEntregaPersonalOrdenanteCi,
    articuloEntregaPersonalFecha,
    articuloEntregaPersonalComentarios,
    articuloEntregaPersonalItems,
    loadData,
  ]);

  const createTipoEquipo = useCallback(async () => {
    if (!canWrite) {
      setStatus("No tienes permisos para crear.");
      return;
    }

    try {
      await createEquipoTipoHandler(newTipoEquipoNombre, newTipoEquipoOrden ? Number(newTipoEquipoOrden) : undefined, {
        onSuccess: async () => {
          setNewTipoEquipoNombre("");
          setNewTipoEquipoOrden("");
          setStatus("Tipo de equipo creado.");
          await loadData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    }
  }, [canWrite, loadData, newTipoEquipoNombre, newTipoEquipoOrden]);

  const updateTipoEquipo = useCallback(async (tipoEquipoId: number) => {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }

    try {
      await updateEquipoTipoHandler(
        tipoEquipoId,
        editTipoEquipoNombre,
        editTipoEquipoOrden ? Number(editTipoEquipoOrden) : undefined,
        {
          onSuccess: async () => {
            setEditTipoEquipoId(null);
            setEditTipoEquipoNombre("");
            setEditTipoEquipoOrden("");
            setStatus("Tipo de equipo actualizado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        },
      );
    } catch {
      // Error manejado en el handler
    }
  }, [canWrite, editTipoEquipoNombre, editTipoEquipoOrden, loadData]);

  const deleteTipoEquipo = useCallback(async (tipoEquipoId: number) => {
    if (!canWrite) {
      setStatus("No tienes permisos para eliminar.");
      return;
    }

    const tipo = tiposEquipoOptions.find((entry) => entry.tipoEquipoId === tipoEquipoId);
    const cantidadRelacionados = equiposRelacionadosCountByTipoEquipoId.get(tipoEquipoId) ?? 0;
    const nombreTipo = tipo?.nombre ?? "este tipo de equipo";
    const confirmMessage =
      cantidadRelacionados > 0
        ? `Si eliminas "${nombreTipo}", ${cantidadRelacionados} equipo${cantidadRelacionados === 1 ? "" : "s"} pasar${cantidadRelacionados === 1 ? "á" : "án"} a General.`
        : `Si eliminas "${nombreTipo}", el resto de categorías conservará su orden relativo.`;

    if (!window.confirm(`${confirmMessage}\n\n¿Deseas continuar?`)) {
      return;
    }

    try {
      await deleteEquipoTipoHandler(tipoEquipoId, {
        onSuccess: async (data) => {
          const equiposReasignadosAGeneralRaw =
            typeof data === "object" &&
            data !== null &&
            "equiposReasignadosAGeneral" in data &&
            typeof (data as DeleteTipoEquipoResult).equiposReasignadosAGeneral === "number"
              ? (data as DeleteTipoEquipoResult).equiposReasignadosAGeneral
              : null;
          const equiposReasignadosAGeneral = equiposReasignadosAGeneralRaw ?? cantidadRelacionados;

          if (editTipoEquipoId === tipoEquipoId) {
            setEditTipoEquipoId(null);
            setEditTipoEquipoNombre("");
            setEditTipoEquipoOrden("");
          }
          setStatus(
            equiposReasignadosAGeneral > 0
              ? `Tipo de equipo eliminado. ${equiposReasignadosAGeneral} equipo${equiposReasignadosAGeneral === 1 ? "" : "s"} pas${equiposReasignadosAGeneral === 1 ? "ó" : "aron"} a General.`
              : "Tipo de equipo eliminado.",
          );
          await loadData();
        },
        onError: (message) => setStatus(message),
      });
    } catch {
      // Error manejado en el handler
    }
  }, [canWrite, editTipoEquipoId, equiposRelacionadosCountByTipoEquipoId, loadData, tiposEquipoOptions]);

  const createEquipo = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canWrite) {
        setStatus("No tienes permisos para crear.");
        return;
      }

      setCreatingEquipo(true);
      try {
        await createEquipoHandler(newEquipo.nombre, newEquipo.tipo, newEquipo.activo, {
          onSuccess: async () => {
            setNewEquipo(EMPTY_EQUIPO_FORM);
            setStatus("Equipo creado.");
            await loadData();
          },
          onError: (message) => setStatus(message),
        });
      } catch {
        // Error manejado en el handler
      } finally {
        setCreatingEquipo(false);
      }
    },
    [canWrite, newEquipo, loadData],
  );

  const updateEquipo = useCallback(
    async (equipoId: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      try {
        await updateEquipoHandler(equipoId, editEquipo.nombre, editEquipo.tipo, editEquipo.activo, editEquipo.ordenPdf ?? 0, {
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
        await updateEquipoHandler(equipo.equipoId, equipo.nombre, equipo.tipo, !equipo.activo, equipo.ordenPdf, {
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
      const currentActiveIds = equiposActivos.map((item) => item.equipoId);
      if (
        orderedItemIds.length === currentActiveIds.length &&
        orderedItemIds.every((itemId, index) => itemId === currentActiveIds[index])
      ) {
        return;
      }

      try {
        await updateMultipleEquipoOrdersHandler(orderedItemIds, {
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
    (tipo: TipoEquipo, updater: (currentOrder: string[]) => string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      setEquipoOrderDraftIds((currentDraft) => {
        const baseOrder = currentDraft ?? equiposActivos.map((item) => item.equipoId);
        return tiposEquipoOptions.flatMap((tipoOption) => {
          const ids = equiposActivosIdsByTipo.get(tipoOption.clave) ?? new Set<string>();
          const currentOrderByTipo = baseOrder.filter((itemId) => ids.has(itemId));
          return tipoOption.clave === tipo ? updater(currentOrderByTipo) : currentOrderByTipo;
        });
      });
    },
    [canWrite, equiposActivos, equiposActivosIdsByTipo, tiposEquipoOptions],
  );

  const moveEquipoInDraft = useCallback(
    (itemId: string, direction: "up" | "down", tipo: TipoEquipo) => {
      updateEquipoOrderDraft(tipo, (currentOrder) => {
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
    (itemId: string, nextPosition: number, tipo: TipoEquipo) => {
      updateEquipoOrderDraft(tipo, (currentOrder) => {
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

  const saveInactivoEquiposOrder = useCallback(
    async (orderedItemIds: string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }
      const currentInactivoIds = equiposInactivos.map((item) => item.equipoId);
      if (
        orderedItemIds.length === currentInactivoIds.length &&
        orderedItemIds.every((itemId, index) => itemId === currentInactivoIds[index])
      ) {
        return;
      }

      try {
        await updateMultipleEquipoOrdersHandler(
          orderedItemIds,
          {
            onSuccess: async () => {
              setEquipoInactivoOrderDraftIds(null);
              setStatus("Orden de PDF de inactivos actualizado.");
              await loadData();
            },
            onError: (message) => setStatus(message),
          },
          false,
        );
      } catch {
        // Error manejado en el handler
      }
    },
    [canWrite, equiposInactivos, loadData],
  );

  const updateEquipoInactivoOrderDraft = useCallback(
    (tipo: TipoEquipo, updater: (currentOrder: string[]) => string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      setEquipoInactivoOrderDraftIds((currentDraft) => {
        const baseOrder = currentDraft ?? equiposInactivos.map((item) => item.equipoId);
        return tiposEquipoOptions.flatMap((tipoOption) => {
          const ids = equiposInactivosIdsByTipo.get(tipoOption.clave) ?? new Set<string>();
          const currentOrderByTipo = baseOrder.filter((itemId) => ids.has(itemId));
          return tipoOption.clave === tipo ? updater(currentOrderByTipo) : currentOrderByTipo;
        });
      });
    },
    [canWrite, equiposInactivos, equiposInactivosIdsByTipo, tiposEquipoOptions],
  );

  const moveEquipoInactivoInDraft = useCallback(
    (itemId: string, direction: "up" | "down", tipo: TipoEquipo) => {
      updateEquipoInactivoOrderDraft(tipo, (currentOrder) => {
        const currentIndex = currentOrder.indexOf(itemId);
        if (currentIndex < 0) return currentOrder;
        const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= currentOrder.length) return currentOrder;
        return moveIdInOrder(currentOrder, currentIndex, targetIndex);
      });
    },
    [updateEquipoInactivoOrderDraft],
  );

  const setEquipoInactivoDraftPosition = useCallback(
    (itemId: string, nextPosition: number, tipo: TipoEquipo) => {
      updateEquipoInactivoOrderDraft(tipo, (currentOrder) => {
        const currentIndex = currentOrder.indexOf(itemId);
        const targetIndex = nextPosition - 1;
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length || currentIndex === targetIndex) {
          return currentOrder;
        }
        return moveIdInOrder(currentOrder, currentIndex, targetIndex);
      });
    },
    [updateEquipoInactivoOrderDraft],
  );

  const deleteEquipo = useCallback(
    async (equipoId: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const item = equipos.find((entry) => entry.equipoId === equipoId);
      let impacto:
        | Awaited<ReturnType<typeof loadEquipoDeleteImpactHandler>>
        | null = null;
      try {
        impacto = await loadEquipoDeleteImpactHandler(equipoId, {
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
        `Acción destructiva e irreversible: se eliminará ${item?.nombre ?? "este equipo"} y no se puede deshacer.`,
        `Movimientos afectados: ${resumen.totalMovimientos} (registros: ${resumen.totalRegistros}, stock: ${resumen.totalStock}).`,
        `Movimientos que quedarán vacíos y se eliminarán: ${resumen.movimientosQueSeEliminan}.`,
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
            await deleteEquipoHandler(equipoId, {
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

      const source = equiposOrdenados.find((equipo) => equipo.equipoId === sourceItemId);
      if (!source) {
        setStatus("No se encontró el equipo a unificar.");
        return;
      }

      const firstTarget = equiposOrdenados.find((equipo) => equipo.equipoId !== sourceItemId);
      if (!firstTarget) {
        setStatus("Debes tener al menos dos equipos para poder unificar.");
        return;
      }

      setMergeEquipoDialog({
        sourceItemId,
        targetItemId: firstTarget.equipoId,
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

    const source = equiposOrdenados.find((equipo) => equipo.equipoId === mergeEquipoDialog.sourceItemId);
    const targetItemId = mergeEquipoDialogTargetId;
    const target = equiposOrdenados.find((equipo) => equipo.equipoId === targetItemId);

    if (!source || !target) {
      setStatus("No se encontraron los equipos seleccionados.");
      return;
    }

    setMergeEquipoSaving(true);
    try {
      const result = await mergeEquipoHandler(source.equipoId, target.equipoId, {
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

      const origen = equipos.find((equipo) => equipo.equipoId === origenItemId);
      const destino = equipos.find((equipo) => equipo.equipoId === destinoItemId);
      if (!origen || !destino) {
        setStatus("No se encontraron los equipos seleccionados.");
        return;
      }

      openConfirmDialog({
        title: "Unificar equipos",
        message: [
          `Se traspasarán todos los movimientos de "${origen.nombre}" hacia "${destino.nombre}".`,
          `Luego se eliminará "${origen.nombre}" del catálogo.`,
          "",
          "Acción destructiva e irreversible.",
        ].join("\n"),
        confirmText: "Unificar y eliminar origen",
        tone: "danger",
        onConfirm: async () => {
          try {
            const result = await mergeEquipoHandler(origenItemId, destinoItemId, {
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
      // Normalizamos el ID quitando el prefijo 'prestamo-' si está presente (seguridad adicional)
      const normalizedId = prestamoId.replace(/^prestamo-/, "");
      const popup = window.open(`/api/prestamos/${encodeURIComponent(normalizedId)}/recibo`, "_blank", "noopener,noreferrer");
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

  const printMovementsSummaryFromProfile = useCallback((ci: string) => {
    window.open(`/api/personal/${encodeURIComponent(ci)}/resumen-prestamos`, "_blank", "noopener,noreferrer");
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
      dbId: registro.registroId,
      fecha: registro.fecha,
      tipo: registro.tipo === "ENTREGA" ? "ENTREGA" : registro.tipo === "DEVOLUCION" ? "DEVOLUCION" : "ASIGNACION",
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
        dbId: prestamo.prestamoId,
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
        dbId: prestamo.prestamoId,
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

  async function openPersonaProfileByCi(ci: string) {
    const normalizedCi = normalizeCi(ci);

    const subalterno = personal.find((persona) => normalizeCi(persona.ci) === normalizedCi);
    if (subalterno) {
      await openPersonaProfileFromPersonal(subalterno);
      return true;
    }

    const oficialSuboficial = oficialesSuboficiales.find((registro) => normalizeCi(registro.ci) === normalizedCi);
    if (oficialSuboficial) {
      await openPersonaProfileFromOficialSuboficial(oficialSuboficial);
      return true;
    }

    return false;
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

  function openRegistro(ci: string, tipo: RegistroTipo, options: { incluirFueraDeHoja?: boolean } = {}) {
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
      destinatarioTipo: "PERSONAL",
      recintoClase: "INTERNO",
      recintoNombre: "",
      recintoResponsableGrado: "",
      recintoResponsableNombre: "",
      recintoResponsableApellido: "",
      recintoResponsableCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
      incluirFueraDeHoja: options.incluirFueraDeHoja ?? false,
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
    const destinatariosDisponibles =
      tipo === "ASIGNACION" ? personal.length + oficialesSuboficiales.length : personalFiltrado.length;
    if (destinatariosDisponibles === 0) {
      setStatus(tipo === "ASIGNACION" ? "No hay personal disponible para registrar una asignación." : "No hay personal disponible para registrar una entrega masiva.");
      return;
    }
    setRegistroDraft({
      modo: "crear",
      registroId: null,
      ci: "",
      ciList: [],
      tipo,
      destinatarioTipo: "PERSONAL",
      recintoClase: "INTERNO",
      recintoNombre: "",
      recintoResponsableGrado: "",
      recintoResponsableNombre: "",
      recintoResponsableApellido: "",
      recintoResponsableCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
      incluirFueraDeHoja: false,
      fecha: getTodayDateInput(),
      comentarios: "",
      items: [{ itemId: "", cantidad: "1" }],
    });
  }

  function openRecintoRegistro(tipo: RegistroTipo, options: { incluirFueraDeHoja?: boolean } = {}) {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar movimientos.");
      return;
    }
    setRegistroDraft({
      modo: "crear",
      registroId: null,
      ci: "",
      ciList: [],
      tipo,
      destinatarioTipo: "RECINTO",
      recintoClase: "INTERNO",
      recintoNombre: "",
      recintoResponsableGrado: "",
      recintoResponsableNombre: "",
      recintoResponsableApellido: "",
      recintoResponsableCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
      incluirFueraDeHoja: options.incluirFueraDeHoja ?? false,
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
      destinatarioTipo: "PERSONAL",
      recintoClase: "INTERNO",
      recintoNombre: "",
      recintoResponsableGrado: "",
      recintoResponsableNombre: "",
      recintoResponsableApellido: "",
      recintoResponsableCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
      incluirFueraDeHoja: false,
      fecha: formatDateOnlyForDisplay(registro.fecha),
      comentarios: registro.comentarios ?? "",
      items:
        registro.items.length > 0
          ? registro.items.map((item) => ({ itemId: item.itemId, cantidad: String(item.cantidad) }))
          : [{ itemId: "", cantidad: "1" }],
    });
  }

  async function fetchAndRectifyRegistro(registroId: string) {
    if (!canWrite) {
      setStatus("No tienes permisos para rectificar movimientos.");
      return;
    }
    try {
      setStatus("Cargando datos de la asignación...");
      const response = await api<{
        registroId: string;
        fecha: string;
        tipo: RegistroTipo;
        comentarios: string | null;
        destinatarioTipo: "PERSONAL" | "RECINTO" | "EXTERNO";
        recintoClase: "INTERNO" | "EXTERNO" | null;
        recintoNombre: string | null;
        recintoResponsableInfo: { grado: string; nombre: string; apellido: string; ci: string } | null;
        destinatarioExternoInfo: { grado: string; nombre: string; apellido: string; ci: string; unidadDestino: string } | null;
        ci: string;
        items: Array<{ itemId: string; cantidad: number }>;
      }>(`/api/registros/${encodeURIComponent(registroId)}`);

      setRegistroDraft({
        modo: "rectificar",
        registroId: response.registroId,
        ci: response.ci,
        ciList: [response.ci],
        tipo: response.tipo,
        destinatarioTipo: response.destinatarioTipo,
        recintoClase: response.recintoClase ?? "INTERNO",
        recintoNombre: response.recintoNombre ?? "",
        recintoResponsableGrado: response.recintoResponsableInfo?.grado ?? "",
        recintoResponsableNombre: response.recintoResponsableInfo?.nombre ?? "",
        recintoResponsableApellido: response.recintoResponsableInfo?.apellido ?? "",
        recintoResponsableCi: response.recintoResponsableInfo?.ci ?? "",
        destinatarioExternoGrado: response.destinatarioExternoInfo?.grado ?? "",
        destinatarioExternoNombre: response.destinatarioExternoInfo?.nombre ?? "",
        destinatarioExternoApellido: response.destinatarioExternoInfo?.apellido ?? "",
        destinatarioExternoCi: response.destinatarioExternoInfo?.ci ?? "",
        destinatarioExternoUnidadDestino: response.destinatarioExternoInfo?.unidadDestino ?? "",
        incluirFueraDeHoja: false,
        fecha: response.fecha,
        comentarios: response.comentarios ?? "",
        items:
          response.items.length > 0
            ? response.items.map((item) => ({ itemId: item.itemId, cantidad: String(item.cantidad) }))
            : [{ itemId: "", cantidad: "1" }],
      });
      setStatus("");
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo cargar el movimiento para editar.");
    }
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
      if (!prev || prev.modo !== "crear" || prev.destinatarioTipo !== "PERSONAL") return prev;
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
      if (!prev || prev.modo !== "crear" || prev.destinatarioTipo !== "PERSONAL") return prev;
      const ciList = Array.from(
        new Set(
          (prev.tipo === "ASIGNACION"
            ? [...personal.map((persona) => persona.ci), ...oficialesSuboficiales.map((registro) => registro.ci)]
            : personalFiltrado.map((persona) => persona.ci)),
        ),
      );
      return {
        ...prev,
        ciList,
        ci: ciList[0] ?? "",
      };
    });
  }

  function clearRegistroDestinatarios() {
    setRegistroDraft((prev) => {
      if (!prev || prev.modo !== "crear" || prev.destinatarioTipo !== "PERSONAL") return prev;
      return {
        ...prev,
        ciList: [],
        ci: "",
      };
    });
  }

  async function saveRegistro(printAfterSave = false) {
    if (!registroDraft || registroSaving) return;
    const isRectificacion = registroDraft.modo === "rectificar" && registroDraft.registroId !== null;
    const isRecinto = registroDraft.destinatarioTipo === "RECINTO";
    const isExterno = registroDraft.destinatarioTipo === "EXTERNO";
    const movementLabel =
      registroDraft.tipo === "ENTREGA" ? "Entrega" : registroDraft.tipo === "DEVOLUCION" ? "Devolución" : "Asignación";
    if (!parseDateInput(registroDraft.fecha).valid) {
      setStatus("La fecha del movimiento debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(registroDraft.fecha)) {
      setStatus("La fecha del movimiento no puede ser futura.");
      return;
    }
    if (registroDraft.tipo !== "ASIGNACION" && registroDraft.destinatarioTipo !== "PERSONAL") {
      setStatus("Entrega y devolución solo admiten destinatario personal subalterno.");
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

    const targetCis =
      isRecinto || isExterno || (isRectificacion && registroDraft.destinatarioTipo !== "PERSONAL")
        ? []
        : isRectificacion
          ? [registroDraft.ci]
          : Array.from(new Set(registroDraft.ciList.map((ci) => ci.trim()).filter((ci) => ci !== "")));

    if (isRecinto) {
      if (registroDraft.recintoNombre.trim() === "") {
        setStatus("Debes indicar el nombre del recinto.");
        return;
      }
    } else if (isExterno) {
      if (
        !registroDraft.destinatarioExternoGrado.trim() ||
        !registroDraft.destinatarioExternoNombre.trim() ||
        !registroDraft.destinatarioExternoApellido.trim() ||
        !registroDraft.destinatarioExternoUnidadDestino.trim()
      ) {
        setStatus("Debes completar todos los datos del destinatario externo.");
        return;
      }
      if (!isValidUruguayanCi(registroDraft.destinatarioExternoCi.trim())) {
        setStatus("La CI del destinatario externo no es válida.");
        return;
      }
    } else if (targetCis.length === 0) {
      setStatus("Debes seleccionar al menos una persona para registrar el movimiento.");
      return;
    }

    setRegistroSaving(true);
    setStatus(isRectificacion ? "Actualizando rectificación..." : "Guardando movimiento...");
    try {
      const response = await api<{ registroId?: string }>(isRectificacion ? `/api/registros/${registroDraft.registroId}` : "/api/registros", {
        method: isRectificacion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ci: targetCis[0],
          ciList: targetCis,
          destinatarioTipo: registroDraft.destinatarioTipo,
          recintoClase: isRecinto ? registroDraft.recintoClase : undefined,
          recintoNombre: isRecinto ? registroDraft.recintoNombre.trim() : undefined,
          destinatarioRecinto: isRecinto ? {
            grado: registroDraft.recintoResponsableGrado.trim(),
            nombre: registroDraft.recintoResponsableNombre.trim(),
            apellido: registroDraft.recintoResponsableApellido.trim(),
            ci: registroDraft.recintoResponsableCi.trim(),
          } : undefined,
          destinatarioExterno: isExterno
            ? {
                grado: registroDraft.destinatarioExternoGrado.trim(),
                nombre: registroDraft.destinatarioExternoNombre.trim(),
                apellido: registroDraft.destinatarioExternoApellido.trim(),
                ci: registroDraft.destinatarioExternoCi.trim(),
                unidadDestino: registroDraft.destinatarioExternoUnidadDestino.trim(),
              }
            : undefined,
          tipo: registroDraft.tipo,
          fecha: registroDraft.fecha,
          comentarios: registroDraft.comentarios.trim() || undefined,
          items: payloadEquipos,
        }),
      });
      setStatus(
        isRecinto
          ? isRectificacion
            ? `${movementLabel} rectificada para recinto ${registroDraft.recintoNombre.trim()}.`
            : `${movementLabel} registrada para recinto ${registroDraft.recintoNombre.trim()}.`
          : isExterno
            ? isRectificacion
              ? `${movementLabel} rectificada para ${registroDraft.destinatarioExternoApellido.trim()}, ${registroDraft.destinatarioExternoNombre.trim()}.`
              : `${movementLabel} registrada para ${registroDraft.destinatarioExternoApellido.trim()}, ${registroDraft.destinatarioExternoNombre.trim()}.`
          : isRectificacion
            ? `${movementLabel} rectificada para ${formatUruguayanCi(registroDraft.ci)}.`
            : targetCis.length === 1
              ? `${movementLabel} registrada para ${formatUruguayanCi(targetCis[0])}.`
              : `${movementLabel} masiva registrada para ${targetCis.length} personas.`,
      );
      if (printAfterSave && !isRectificacion && response.registroId) {
        window.open(`/api/registros/${encodeURIComponent(response.registroId)}/recibo`, "_blank", "noopener,noreferrer");
      }
      setRegistroDraft(null);
      await loadData();
      if (!isRecinto && !isExterno && registroViewer && targetCis.includes(registroViewer.ci)) {
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
    const tipoLabel = registro.tipo === "ENTREGA" ? "entrega" : registro.tipo === "DEVOLUCION" ? "devolución" : "asignación";

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

  function deleteRecintoRegistro(registroId: string, fechaLabel: string, nombreLabel: string, onSuccess: () => void) {
    if (!canDeleteRegistros) {
      setStatus("Solo un administrador puede eliminar movimientos.");
      return;
    }

    openConfirmDialog({
      title: "Eliminar asignación",
      message: `Se eliminará la asignación a ${nombreLabel} del ${fechaLabel}. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar",
      tone: "danger",
      onConfirm: async () => {
        setStatus("Eliminando asignación...");
        try {
          await api(`/api/registros/${registroId}`, {
            method: "DELETE",
          });
          setStatus(`Asignación a ${nombreLabel} eliminada.`);
          onSuccess();
          await loadData();
        } catch (error: unknown) {
          setStatus(error instanceof Error ? error.message : "No se pudo eliminar la asignación.");
        }
      },
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

  async function savePrestamo(printAfterSave = false) {
    if (prestamoSaving) return;
    if (prestamoDraft.actuanteCi.trim() === "") {
      setStatus("Debes indicar 'por orden de' (oficial, suboficial o sargento).");
      return;
    }
    if (prestamoDraft.clasePrestamo === "INTERNO" && prestamoDraft.destinatarioCi.trim() === "") {
      setStatus("Debes seleccionar un destinatario interno para el préstamo.");
      return;
    }
    if (prestamoDraft.clasePrestamo === "EXTERNO") {
      if (
        !prestamoDraft.destinatarioExternoGrado.trim() ||
        !prestamoDraft.destinatarioExternoNombre.trim() ||
        !prestamoDraft.destinatarioExternoApellido.trim() ||
        !prestamoDraft.destinatarioExternoUnidadDestino.trim()
      ) {
        setStatus("Debes completar grado, nombre, apellido y unidad de destino del destinatario externo.");
        return;
      }
      if (!isValidUruguayanCi(prestamoDraft.destinatarioExternoCi.trim())) {
        setStatus("La CI del destinatario externo no es válida.");
        return;
      }
    }
    if (!parseDateInput(prestamoDraft.fechaPrestamo).valid) {
      setStatus("La fecha del préstamo debe estar en formato DD/MM/AAAA.");
      return;
    }
    if (isDateInputAfterToday(prestamoDraft.fechaPrestamo)) {
      setStatus("La fecha del préstamo no puede ser futura.");
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
      setStatus("No puedes repetir equipos en un mismo préstamo.");
      return;
    }

    setPrestamoSaving(true);
    setStatus("Registrando préstamo...");
    try {
      const created = await api<{ prestamoId: string }>("/api/prestamos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clasePrestamo: prestamoDraft.clasePrestamo,
          destinatarioTipo: prestamoDraft.clasePrestamo === "INTERNO" ? prestamoDraft.destinatarioTipo : undefined,
          destinatarioCi: prestamoDraft.clasePrestamo === "INTERNO" ? prestamoDraft.destinatarioCi.trim() : undefined,
          destinatarioExterno:
            prestamoDraft.clasePrestamo === "EXTERNO"
              ? {
                  grado: prestamoDraft.destinatarioExternoGrado.trim(),
                  nombre: prestamoDraft.destinatarioExternoNombre.trim(),
                  apellido: prestamoDraft.destinatarioExternoApellido.trim(),
                  ci: prestamoDraft.destinatarioExternoCi.trim(),
                  unidadDestino: prestamoDraft.destinatarioExternoUnidadDestino.trim(),
                }
              : undefined,
          actuanteCi: prestamoDraft.actuanteCi.trim(),
          fechaPrestamo: prestamoDraft.fechaPrestamo,
          fechaEstimadaDevolucionTexto: prestamoDraft.fechaEstimadaDevolucionTexto.trim() || undefined,
          comentarios: prestamoDraft.comentarios.trim() || undefined,
          items: payloadItems,
        }),
      });
      setPrestamoDraft({ ...EMPTY_PRESTAMO_DRAFT, fechaPrestamo: getTodayDateInput() });
      setStatus("Préstamo registrado.");
      await reloadActiveStockData();
      if (printAfterSave) {
        window.open(`/api/prestamos/${encodeURIComponent(created.prestamoId)}/recibo`, "_blank", "noopener,noreferrer");
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar el préstamo.");
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
      setStatus("Devolución de préstamo registrada.");
      await reloadActiveStockData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar la devolución del préstamo.");
    } finally {
      setReturningPrestamoId(null);
    }
  }

  async function deletePrestamo(prestamoId: string) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede eliminar préstamos.");
      return;
    }

    openConfirmDialog({
      title: "Eliminar préstamo",
      message: `Se eliminará el préstamo con ID ${prestamoId}. Esta acción no se puede deshacer.`,
      confirmText: "Eliminar préstamo",
      tone: "danger",
      onConfirm: async () => {
        setStatus("Eliminando préstamo...");
        await api(`/api/prestamos/${encodeURIComponent(prestamoId)}`, {
          method: "DELETE",
        });
        setStatus(`Préstamo ${prestamoId} eliminado.`);
        await reloadActiveStockData();
      },
    });
  }

  async function editPrestamo(prestamoId: string, payload: PrestamoEditPayload) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede editar préstamos.");
      return;
    }
    if (editingPrestamoId) return;

    setEditingPrestamoId(prestamoId);
    setStatus(`Actualizando préstamo ${prestamoId}...`);
    try {
      await api(`/api/prestamos/${encodeURIComponent(prestamoId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setStatus(`Préstamo ${prestamoId} actualizado.`);
      await reloadActiveStockData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo editar el préstamo.";
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
            setActiveView("dashboard");

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
    [loginMode, loginUsername, loginPassword, loadData, setActiveView, setLoginLoading, setLoginPassword, setShowLoginPassword],
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
    [loginMode, resetRequestLoading, resetUsername, setResetRequestLoading, setResetRequestMessage],
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
            setStatus("Contraseña actualizada.");
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
  }, [clearLoadedData, setCurrentUser, setLoginPassword, setShowLoginPassword]);

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
              : "No se encontró el seguimiento del envío solicitado.";

          setBulkDeliveryEmailJob((prev) => {
            if (!prev || prev.jobId !== jobId) return prev;
            return buildLocalCancelledJob(prev, "Seguimiento cancelado localmente por el usuario.");
          });

          toast.info("Seguimiento cancelado.", {
            id: BULK_DELIVERY_EMAIL_TOAST_ID,
            description: `${message}\nEl seguimiento local se detuvo.`,
            duration: 7000,
          });
          setStatus("Seguimiento del envío cancelado localmente.");
          return;
        }

        if (!response.ok) {
          const message =
            payload && typeof payload.error === "string" && payload.error.trim() !== ""
              ? payload.error
              : "No se pudo cancelar el envío.";
          throw new Error(message);
        }

        const cancelledJob = payload?.job;
        if (cancelledJob) {
          setBulkDeliveryEmailJob(cancelledJob);
          syncBulkDeliveryEmailToast(cancelledJob);
          setStatus(payload?.message || cancelledJob.message || "Envío cancelado por el usuario.");
          return;
        }

        setBulkDeliveryEmailJob((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          return buildLocalCancelledJob(prev, "Envío cancelado por el usuario.");
        });
        toast.info("Envío cancelado.", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: "Se detuvo el seguimiento del envío en segundo plano.",
          duration: 7000,
        });
        setStatus("Envío cancelado por el usuario.");
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo cancelar el envío.";
        setBulkDeliveryEmailJob((prev) => {
          if (!prev || prev.jobId !== jobId) return prev;
          return buildLocalCancelledJob(prev, "Seguimiento cancelado localmente por el usuario.");
        });

        toast.info("Seguimiento cancelado.", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: `Se detuvo el seguimiento local del envío.\n${message}`,
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
      setStatus("No hay un envío de hojas de entrega en curso para cancelar.");
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
              : "No se pudo consultar el estado del envío.";
          const pollError = new Error(message) as Error & { status?: number };
          pollError.status = response.status;
          throw pollError;
        }

        if (!payload?.job) {
          throw new Error("El servidor no devolvió el estado del envío.");
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
          setStatus(nextJob.message || "Envío cancelado por el usuario.");
          return;
        }

        clearBulkDeliveryEmailPolling();
        bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
          void pollBulkDeliveryEmailJob(jobId);
        }, 1200);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "No se pudo consultar el estado del envío.";
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

          toast.error("Seguimiento del envío no disponible.", {
            id: BULK_DELIVERY_EMAIL_TOAST_ID,
            description: `${message}\nPuedes iniciar un nuevo envío cuando lo necesites.`,
            duration: 9000,
          });
          setStatus(`No se pudo continuar el seguimiento del envío: ${message}`);
          return;
        }

        toast.loading("Enviando PDF por correo en segundo plano...", {
          id: BULK_DELIVERY_EMAIL_TOAST_ID,
          description: `Seguimos consultando el estado del envío...\n${message}`,
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
      setStatus("Ya hay un envío de hojas de entrega ejecutándose en segundo plano.");
      syncBulkDeliveryEmailToast(bulkDeliveryEmailJob, onBulkDeliveryEmailToastCancel);
      return;
    }

    setStatus(`Iniciando envío en segundo plano de ${personal.length} hojas de entrega...`);

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
        setStatus("El envío ya estaba en curso. Se retomó el seguimiento.");
        return;
      }

      if (!response.ok) {
        const message =
          payload && typeof payload.error === "string" && payload.error.trim() !== ""
            ? payload.error
            : "No se pudo iniciar el envío del PDF por correo.";
        throw new Error(message);
      }

      if (!payload?.job) {
        throw new Error("El servidor no devolvió el seguimiento del envío.");
      }

      const startedJob = payload.job;
      setBulkDeliveryEmailJob(startedJob);
      syncBulkDeliveryEmailToast(startedJob, onBulkDeliveryEmailToastCancel);
      clearBulkDeliveryEmailPolling();
      bulkDeliveryEmailPollTimeoutRef.current = window.setTimeout(() => {
        void pollBulkDeliveryEmailJob(startedJob.jobId);
      }, 250);
      setStatus(payload.message || "Envío de PDF iniciado en segundo plano.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar el envío del PDF por correo.";
      setStatus(`Error al iniciar envío de PDF por correo: ${message}`);
      toast.error("No se pudo iniciar el envío por correo.", { description: message });
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
    options?: {
      reorderableInActiveList?: boolean;
      reorderableInInactiveList?: boolean;
      orderIndex?: number;
      orderCount?: number;
      orderGroupType?: TipoEquipo;
    },
  ) {
    const reorderableInActiveList = options?.reorderableInActiveList === true;
    const reorderableInInactiveList = options?.reorderableInInactiveList === true;
    const isReorderable = reorderableInActiveList || reorderableInInactiveList;
    const orderIndex = options?.orderIndex ?? -1;
    const orderCount = options?.orderCount ?? 0;
    const orderGroupType = options?.orderGroupType ?? equipo.tipo;
    const currentOrderLabel = isReorderable && orderIndex >= 0 ? orderIndex + 1 : (equipo.ordenPdf > 10000 ? equipo.ordenPdf - 10000 : equipo.ordenPdf);
    const tipoAssignmentLabel = equipo.tipoEquipoId == null ? "Asignar tipo" : "Reasignar tipo";
    const openEquipoEditForm = (focus: "general" | "tipo" = "general") => {
      setEditEquipoId(equipo.equipoId);
      setEditEquipo({
        nombre: equipo.nombre,
        tipo: equipo.tipo,
        activo: equipo.activo,
        ordenPdf: equipo.ordenPdf,
      });

      if (focus === "tipo") {
        setStatus(
          equipo.tipoEquipoId == null
            ? `Selecciona el tipo para ${equipo.nombre} y guarda el cambio.`
            : `Selecciona el nuevo tipo para ${equipo.nombre} y guarda el cambio.`,
        );
      }
    };

    return (
      <div
        key={equipo.equipoId}
        className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-sm transition-[box-shadow,border-color,background-color] duration-200 hover:shadow-md"
      >
        {editEquipoId === equipo.equipoId ? (
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
                value={editEquipo.ordenPdf > 10000 ? editEquipo.ordenPdf - 10000 : editEquipo.ordenPdf}
                onChange={(event) => setEditEquipo((prev) => ({ ...prev, ordenPdf: Math.max(1, Number(event.target.value) || 1) }))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-700 mb-1">Tipo</label>
              <select
                value={editEquipo.tipo}
                onChange={(event) => setEditEquipo((prev) => ({ ...prev, tipo: event.target.value as TipoEquipo }))}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {tiposEquipoOptions.map((tipoOption) => (
                  <option key={`edit-equipo-tipo-${tipoOption.clave}`} value={tipoOption.clave}>
                    {tipoOption.nombre}
                  </option>
                ))}
              </select>
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
              <SmallActionButton text="Guardar" tone="ok" onClick={() => void updateEquipo(equipo.equipoId)} />
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
                  equipo.tipo === GENERAL_TIPO_EQUIPO_CLAVE
                    ? "bg-sky-100 text-sky-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {equipo.tipoLabel ?? equipo.tipo}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  equipo.activo
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {equipo.activo ? "Aparece en hoja" : "Oculto de hoja"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                {isReorderable ? `Posicion actual en lista: ${currentOrderLabel}` : `Orden PDF: ${equipo.ordenPdf > 10000 ? equipo.ordenPdf - 10000 : equipo.ordenPdf}`}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {canWrite ? (
                <SmallActionButton
                  text={equipo.activo ? "Ocultar de hoja" : "Mostrar en hoja"}
                  tone="neutral"
                  onClick={() => void toggleEquipoActivo(equipo)}
                />
              ) : null}
              {isReorderable ? (
                <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-2 py-2">
                  <span className="inline-flex min-w-8 items-center justify-center rounded-xl bg-stone-900 px-2 py-1 text-xs font-semibold text-white">
                    {currentOrderLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => reorderableInActiveList ? moveEquipoInDraft(equipo.equipoId, "up", orderGroupType) : moveEquipoInactivoInDraft(equipo.equipoId, "up", orderGroupType)}
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
                      onClick={() => reorderableInActiveList ? moveEquipoInDraft(equipo.equipoId, "down", orderGroupType) : moveEquipoInactivoInDraft(equipo.equipoId, "down", orderGroupType)}
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
                      onChange={(event) => reorderableInActiveList ? setEquipoDraftPosition(equipo.equipoId, Number(event.target.value), orderGroupType) : setEquipoInactivoDraftPosition(equipo.equipoId, Number(event.target.value), orderGroupType)}
                      disabled={!canWrite}
                      className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 outline-none"
                    >
                      {Array.from({ length: orderCount }, (_, index) => index + 1).map((position) => (
                        <option key={`${equipo.equipoId}-position-${position}`} value={position}>
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
                      onClick: () => openEquipoEditForm("general"),
                    },
                    {
                      label: tipoAssignmentLabel,
                      icon: "edit",
                      tone: "secondary",
                      onClick: () => openEquipoEditForm("tipo"),
                    },
                    {
                      label: "Unificar con otro",
                      icon: "drag",
                      tone: "secondary",
                      onClick: () => openMergeEquipoDialog(equipo.equipoId),
                    },
                    {
                      label: "Eliminar",
                      icon: "trash",
                      tone: "danger",
                      onClick: () => void deleteEquipo(equipo.equipoId),
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
    ? "Validando credenciales y preparando tu sesión..."
    : isPageBootLoading
      ? "Verificando sesión activa..."
      : "Cargando pantalla de acceso...";
  const personaProfileLoading = personaProfile?.loading ?? false;
  const primaryLoadSteps = useMemo(
    () => [
      "Consultando base de datos de personal, rangos y baterías...",
      "Cargando tallas, catálogo de equipos y configuraciones base...",
      "Consolidando movimientos, préstamos, devoluciones y stock...",
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
      appendBulkDeliveryPdfLog("Servidor procesando generación de hojas y compaginación.");
      return;
    }
    if (bulkDeliveryPdfPhase === "downloading-response") {
      appendBulkDeliveryPdfLog("Servidor finalizó, iniciando descarga de respuesta.");
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
    if (firmaConfigLoading) return "Cargando configuración de firmas y auditoría...";
    if (firmaConfigSaving) return "Guardando configuración de firmas...";
    if (hojaMatrixLoading) return "Cargando datos y calculando hoja matriz de subalternos...";
    if (equipoResumenLoading) return "Cargando datos y calculando resumen de equipos por bateria...";
    if (stockLoading) {
      if (activeStockLoadProfile?.key === "historial") {
        return "Cargando historial y calculando impacto de movimientos en stock...";
      }
      if (activeStockLoadProfile?.key === "prestamos") {
        return "Cargando préstamos y estado de devoluciones...";
      }
      return "Cargando stock y recalculando totales operativos...";
    }
    if (etiquetadoLoading) {
      if (activeEtiquetadoSection === "codigos_sie") {
        return "Cargando códigos SIE y validando disponibilidad...";
      }
      if (activeEtiquetadoSection === "imprimir_todas") {
        return "Cargando etiquetas y preparando impresion masiva...";
      }
      return "Cargando módulo de etiquetado...";
    }
    if (recordatoriosLoading) return "Cargando tareas y recordatorios...";
    if (recordatoriosSaving) return "Guardando cambios de recordatorios...";
    if (creatingPersonal) return "Guardando alta de personal y actualizando listados...";
    if (creatingOficialSuboficial) return "Guardando alta de oficiales/suboficiales...";
    if (promotingSubalternoCi !== null) return "Procesando ascenso y actualizando datos del legajo...";
    if (mergeEquipoSaving) return "Unificando equipo y sincronizando referencias...";
    if (stockSaving) {
      return stockDraft.tipo === "EGRESO"
        ? "Registrando baja de stock y recalculando existencias..."
        : "Registrando alta de stock y recalculando existencias...";
    }
    if (prestamoSaving) return "Registrando préstamo y actualizando stock en tiempo real...";
    if (returningPrestamoId !== null) return "Registrando devolución y recalculando stock...";
    if (editingPrestamoId !== null) return "Actualizando préstamo y validando consistencia...";
    if (registroSaving) return "Guardando movimiento y actualizando historial...";
    if (personalObservacionSaving) return "Guardando observación del personal...";
    if (changeLoading) return "Actualizando tu contraseña...";
    if (userRoleSaving) return "Actualizando rol del usuario...";
    if (userPasswordSaving) return "Actualizando contraseña del usuario...";
    if (usernameSaving) return "Actualizando datos del usuario...";
    if (confirmDialogBusy) return "Aplicando cambios solicitados...";
    return "Actualizando información...";
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
  if (!currentUser) {
    return (
      <LoginScreen
        status={status}
        loginMode={loginMode}
        loginUsername={loginUsername}
        loginPassword={loginPassword}
        showLoginPassword={showLoginPassword}
        loading={loading}
        loginLoading={loginLoading}
        showResetRequest={showResetRequest}
        resetUsername={resetUsername}
        resetRequestLoading={resetRequestLoading}
        resetRequestMessage={resetRequestMessage}
        initMessage={initMessage}
        showInitCredentials={showInitCredentials}
        initCredentials={initCredentials}
        isLoginGlobalBusy={isLoginGlobalBusy}
        loginBusyLabel={loginBusyLabel}
        onSelectPersonalLogin={handleSelectPersonalLogin}
        onSelectSystemLogin={handleSelectSystemLogin}
        onHideInitCredentials={() => setShowInitCredentials(false)}
        onLoginSubmit={login}
        onLoginUsernameChange={handleLoginUsernameChange}
        onLoginUsernamePaste={handleLoginUsernamePaste}
        onLoginUsernameKeyDown={handleLoginUsernameKeyDown}
        onLoginPasswordChange={setLoginPassword}
        onToggleLoginPasswordVisibility={() => setShowLoginPassword((current) => !current)}
        onToggleResetRequest={handleToggleResetRequest}
        onResetUsernameChange={setResetUsername}
        onResetRequestSubmit={requestPasswordReset}
      />
    );
  }

  if (isPersonalAccount && currentUser) {
    const normalizedPersonalCi =
      typeof currentUser.personalCi === "string" && /^\d+$/.test(currentUser.personalCi)
        ? Number.parseInt(currentUser.personalCi, 10)
        : null;

    return (
      <PersonalPortalView
        currentUser={{
          accountType: "PERSONAL",
          personalCi: normalizedPersonalCi,
          username: currentUser.username,
          apellido: currentUser.apellido,
          nombre: currentUser.nombre,
          grado: currentUser.grado,
          mailReferencia: currentUser.mailReferencia,
        } as PersonalCurrentUser}
        personalSelfProfile={personalSelfProfile}
        loading={loading}
        changeLoading={changeLoading}
        personalContactSaving={personalContactSaving}
        showChangePassword={showChangePassword}
        changeCurrentPassword={changeCurrentPassword}
        changeNewPassword={changeNewPassword}
        changeConfirmPassword={changeConfirmPassword}
        showPersonalContactModal={showPersonalContactModal}
        personalContactTelefono={personalContactTelefono}
        personalContactMail={personalContactMail}
        setChangeCurrentPassword={setChangeCurrentPassword}
        setChangeNewPassword={setChangeNewPassword}
        setChangeConfirmPassword={setChangeConfirmPassword}
        setShowChangePassword={setShowChangePassword}
        setPersonalContactTelefono={setPersonalContactTelefono}
        setPersonalContactMail={setPersonalContactMail}
        setShowPersonalContactModal={setShowPersonalContactModal}
        onReloadProfile={loadPersonalSelfProfile}
        onOpenOwnDeliverySheetPdf={openOwnDeliverySheetPdf}
        onLogout={logout}
        onSubmitChangePassword={submitChangePassword}
        onSubmitPersonalContactUpdate={submitPersonalContactUpdate}
      />
    );
  }

  const sidebarContent = (
    <>
      <Stack spacing={2} sx={{ mb: 4, mt: 1, px: 1, alignItems: "center", overflow: "hidden" }}>
        <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, alignSelf: "flex-start", opacity: sidebarCollapsed ? 0 : 1, transition: "opacity 0.2s" }}>
          Versión: {appVersion}
        </Typography>

        <Box sx={{ width: sidebarCollapsed ? 45 : 100, height: "auto", my: 1, transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }}>
          <Image
            src="/assets/logo-deposito.png"
            alt="Logo Depósito"
            width={200}
            height={240}
            style={{ width: "100%", height: "auto", filter: "drop-shadow(0 0 12px rgba(255,255,255,0.15))", transition: "all 0.3s ease" }}
          />
        </Box>

        <Box sx={{ textAlign: "center", display: sidebarCollapsed ? "none" : "block" }}>
          <Typography sx={{ color: "rgba(255,255,255,0.9)", fontSize: 13, fontStyle: "italic", fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
            Grupo &quot;Brigadier General Manuel Oribe&quot; de Artillería 105mm No. 1
          </Typography>
          <Typography sx={{ color: "var(--color-ejercito-gold)", fontWeight: 900, fontSize: 20, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Depósito General
          </Typography>
        </Box>

        <Divider sx={{ width: "100%", borderColor: "rgba(255,255,255,0.1)" }} />

        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "flex-start", pl: 1, opacity: sidebarCollapsed ? 0 : 1, transition: "opacity 0.2s" }}>
          {!sidebarCollapsed && "Menú Principal"}
        </Typography>
      </Stack>

      <MainNavigation
        activeView={activeView}
        canWrite={canWrite}
        isAdmin={isAdmin}
        showConfigViews={showConfigViews}
        isConfigView={isConfigView}
        configMenuRef={configMenuRef}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSelectView={(view) => {
          handleSelectMainView(view);
          setMobileMenuOpen(false);
        }}
        onOpenSearch={() => {
          setGlobalSearchOpen(true);
          setMobileMenuOpen(false);
        }}
        onSetConfigViews={setShowConfigViews}
        embedded
      />

      <Box sx={{ mt: 4, mb: 2 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 3 }} />
        
        {/* User Info Section */}
        <Stack spacing={1.5} sx={{ px: 1, mb: 4 }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", mb: 0.5 }}>
              Usuario Conectado
            </Typography>
            <Typography sx={{ color: "common.white", fontSize: 14, fontWeight: 700 }}>
              {currentUser?.username || "---"}
            </Typography>
            <Typography sx={{ color: "var(--color-ejercito-gold)", fontSize: 12, fontWeight: 600 }}>
              {currentUser ? roleLabel(currentUser.rol) : "---"}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => reloadCurrentViewData(true)}
              sx={{ 
                borderColor: "rgba(255,255,255,0.2)", 
                color: "common.white",
                fontSize: 11,
                textTransform: "none",
                "&:hover": { borderColor: "rgba(255,255,255,0.4)", bgcolor: "rgba(255,255,255,0.05)" }
              }}
            >
              Recargar
            </Button>
            <Button
              fullWidth
              variant="contained"
              size="small"
              color="error"
              onClick={() => void logout()}
              sx={{ 
                fontSize: 11,
                textTransform: "none",
                boxShadow: "0 4px 12px rgba(211, 47, 47, 0.2)"
              }}
            >
              Cerrar sesión
            </Button>
          </Stack>
        </Stack>

        {/* Metrics Section */}
        <Typography sx={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.5, pl: 1 }}>
          Resumen del Sistema
        </Typography>
        
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25, px: 0.5 }}>
          {[
            { label: "Subalternos", value: personal.length },
            { label: "Oficiales/Sub", value: oficialesSuboficiales.length },
            { label: "Equipos", value: equipos.length },
            { label: "Movimientos", value: movimientosTotal },
          ].map((metric) => (
            <Box 
              key={metric.label}
              sx={{ 
                p: 1.5, 
                borderRadius: 1.5, 
                bgcolor: "rgba(0,0,0,0.2)", 
                border: "1px solid rgba(255,255,255,0.05)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              <Typography sx={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 700, textTransform: "uppercase" }}>
                {metric.label}
              </Typography>
              <Typography sx={{ color: "common.white", fontSize: 18, fontWeight: 900, mt: 0.2 }}>
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "var(--color-camo-base)" }}>
      {/* Sidebar - Desktop Only */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, md: sidebarCollapsed ? 80 : 280, lg: sidebarCollapsed ? 80 : 300 },
          display: { xs: "none", md: "block" },
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          p: 2,
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          background: "linear-gradient(180deg, rgba(22, 28, 22, 0.98) 0%, rgba(15, 20, 15, 0.99) 100%)",
          backdropFilter: "blur(20px)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
          zIndex: 1200,
          transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          overflowX: "hidden",
        }}
      >
        {sidebarContent}
      </Box>

      {/* Drawer - Mobile Only */}
      <Drawer
        anchor="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            bgcolor: "rgba(15, 20, 15, 0.98)",
            backdropFilter: "blur(20px)",
            p: 2,
            borderRight: "1px solid rgba(255,255,255,0.1)",
            backgroundImage: "none",
          }
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
          overflowY: "auto",
          position: "relative",
          p: activeView === "dashboard" ? 0 : { xs: 2, sm: 3, lg: 4 },
          backgroundColor: activeView === "dashboard" ? "#2f3a2a" : "#5f6c46",
          backgroundImage: activeView === "dashboard"
            ? "linear-gradient(110deg, rgba(12,16,11,0.78) 0%, rgba(20,27,18,0.56) 46%, rgba(9,12,10,0.76) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0) 2px 7px), url('/assets/dashboard-foto.jpg')"
            : "linear-gradient(90deg, rgba(24,27,21,0.5) 0%, rgba(255,255,255,0.04) 40%, rgba(24,27,21,0.45) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0) 2px 7px)",
          backgroundSize: activeView === "dashboard" ? "cover" : "auto",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-stone-300/80 bg-white px-4 py-3 shadow-md backdrop-blur-md min-[900px]:hidden -mx-2 sm:-mx-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-stone-100 to-stone-200 shadow-inner">
                <img src="/assets/logo-deposito.png" alt="Escudo" className="h-8 w-8 object-contain drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-tight text-[var(--color-ejercito-gold)] drop-shadow-sm">
                  DEPÓSITO GENERAL
                </h1>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-stone-700">Grupo "Brigadier General Manuel Oribe" de Artillería 105mm No. 1</span>
                  <span className="h-1 w-1 rounded-full bg-stone-400"></span>
                  <span className="text-[10px] font-bold text-stone-600">v{appVersion}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGlobalSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 focus:bg-stone-100 focus:outline-none"
              >
                <span className="sr-only">Buscar personal</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 transition-colors hover:bg-stone-100 focus:bg-stone-100 focus:outline-none"
              >
                <span className="sr-only">Abrir menú</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </header>

        {currentUser?.rol === "ADMIN" && (
          <Box sx={{ position: "relative", px: activeView === "dashboard" ? 3 : 0, mt: activeView === "dashboard" ? 3 : 0 }}>
            <AdminPushNotifications />
          </Box>
        )}

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

          {activeView === "equipos_unificar" ? (
            <EquiposUnificarView
              canWrite={canWrite}
              equipos={equipos}
              mergeEquipoOrigenId={mergeEquipoOrigenId}
              mergeEquipoDestinoId={mergeEquipoDestinoId}
              onMergeEquipoOrigenIdChange={handleMergeEquipoOrigenChange}
              onMergeEquipoDestinoIdChange={handleMergeEquipoDestinoChange}
              onMergeEquipos={mergeEquipos}
            />
          ) : null}

          {inCatalogView || (isAdmin && inAdminConfigView) ? (
          <ConfigViews
            activeView={activeView as "grados" | "baterias" | "articulos" | "equipos" | "tipos_equipo" | "firmas" | "usuarios" | "auditoria" | "papelera"}
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
            articulos={articulos}
            editArticuloId={editArticuloId}
            editArticuloNombre={editArticuloNombre}
            editArticuloTipo={editArticuloTipo}
            tiposEquipo={tiposEquipoOptions}
            newTipoEquipoNombre={newTipoEquipoNombre}
            newTipoEquipoOrden={newTipoEquipoOrden}
            editTipoEquipoId={editTipoEquipoId}
            editTipoEquipoNombre={editTipoEquipoNombre}
            editTipoEquipoOrden={editTipoEquipoOrden}
            equipos={equiposOrdenados}
            newEquipo={newEquipo}
            editEquipoId={editEquipoId}
            editEquipo={editEquipo}
            equiposInactivos={equiposInactivos}
            equiposInactivosEnPantalla={equiposInactivosEnPantalla}
            equiposActivosEnPantalla={equiposActivosEnPantalla}
            hasEquipoOrderDraftChanges={hasEquipoOrderDraftChanges}
            hasEquipoInactivoOrderDraftChanges={hasEquipoInactivoOrderDraftChanges}
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
            onEditArticuloIdChange={setEditArticuloId}
            onEditArticuloNombreChange={setEditArticuloNombre}
            onEditArticuloTipoChange={setEditArticuloTipo}
            onUpdateArticulo={(articuloId) => void updateArticulo(articuloId)}
            onDeleteArticulo={(articuloId) => void deleteArticulo(articuloId)}
            onNewTipoEquipoNombreChange={setNewTipoEquipoNombre}
            onNewTipoEquipoOrdenChange={setNewTipoEquipoOrden}
            onEditTipoEquipoIdChange={setEditTipoEquipoId}
            onEditTipoEquipoNombreChange={setEditTipoEquipoNombre}
            onEditTipoEquipoOrdenChange={setEditTipoEquipoOrden}
            onCreateTipoEquipo={() => void createTipoEquipo()}
            onUpdateTipoEquipo={(tipoEquipoId) => void updateTipoEquipo(tipoEquipoId)}
            onDeleteTipoEquipo={(tipoEquipoId) => void deleteTipoEquipo(tipoEquipoId)}
            onSumarStock={(articuloId) => {
              setArticuloStockIngresoId(String(articuloId));
              setActiveView("articulo_stock_ingreso");
            }}
            onEntregarArticulo={(articuloId) => {
              setArticuloEntregaPersonalItems([{ articuloId: String(articuloId), cantidad: "1" }]);
              setActiveView("articulo_entrega_personal");
            }}
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
            onSaveEquipoInactivoOrder={() => {
              if (!equipoInactivoOrderDraftIds) return;
              void saveInactivoEquiposOrder(equipoInactivoOrderDraftIds);
            }}
            onResetEquipoInactivoOrderDraft={() => setEquipoInactivoOrderDraftIds(null)}
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
            papeleraRecords={papeleraRecords}
            papeleraLoading={papeleraLoading}
            onRestorePapelera={restorePapelera}
            onDeletePapeleraPermanent={deletePapeleraPermanent}
            reloadCurrentViewData={reloadCurrentViewData}
          />
          ) : null}

          <HomeViewRouter
            onRectifyRegistro={fetchAndRectifyRegistro}
            activeView={activeView}
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
            rangos={rangosConfigView}
            baterias={baterias}
            equiposActivos={equiposActivos}
            tallaOptionsByKey={tallaOptionsByKey}
            maxFechaIngreso={maxFechaIngreso}
            newPersonalMovimientos={newPersonalMovimientos}
            newPersonalMovimientoDraft={newPersonalMovimientoDraft}
            newPersonalMovimientoEditIndex={newPersonalMovimientoEditIndex}
            setActiveView={setActiveView}
            createPersonal={createPersonal}
            updateNewPersonalField={updateNewPersonalField}
            openNewPersonalMovimientoModal={openNewPersonalMovimientoModal}
            closeNewPersonalMovimientoModal={closeNewPersonalMovimientoModal}
            saveNewPersonalMovimientoFromModal={saveNewPersonalMovimientoFromModal}
            editNewPersonalMovimiento={editNewPersonalMovimiento}
            removeNewPersonalMovimiento={removeNewPersonalMovimiento}
            updateNewPersonalMovimientoDraft={updateNewPersonalMovimientoDraft}
            updateNewPersonalMovimientoDraftItem={updateNewPersonalMovimientoDraftItem}
            addNewPersonalMovimientoDraftItem={addNewPersonalMovimientoDraftItem}
            removeNewPersonalMovimientoDraftItem={removeNewPersonalMovimientoDraftItem}
            editingOficialSuboficialCi={editingOficialSuboficialCi}
            newOficialSuboficial={newOficialSuboficial}
            duplicateOficialSuboficialLabel={duplicateOficialSuboficialLabel}
            oficialSuboficialCiLooksValid={oficialSuboficialCiLooksValid}
            oficialSuboficialCiAlreadyExists={oficialSuboficialCiAlreadyExists}
            canRegisterOficialSuboficial={canRegisterOficialSuboficial}
            oficialSuboficialRequiredCompleted={oficialSuboficialRequiredCompleted}
            oficialSuboficialRequiredFields={oficialSuboficialRequiredFields}
            canSubmitOficialSuboficial={canSubmitOficialSuboficial}
            creatingOficialSuboficial={creatingOficialSuboficial}
            rangosOficialSuboficialDisponibles={rangosOficialSuboficialDisponibles}
            cancelOficialSuboficialForm={cancelOficialSuboficialForm}
            createOficialSuboficial={createOficialSuboficial}
            updateNewOficialSuboficialField={updateNewOficialSuboficialField}
            tiposEquipo={tiposEquipoOptions}
            newEquipo={newEquipo}
            loading={loading}
            creatingEquipo={creatingEquipo}
            creatingArticulo={creatingArticulo}
            createEquipo={createEquipo}
            setNewEquipo={setNewEquipo}
            newArticuloNombre={newArticuloNombre}
            newArticuloTipo={newArticuloTipo}
            createArticulo={createArticulo}
            setNewArticuloNombre={setNewArticuloNombre}
            setNewArticuloTipo={setNewArticuloTipo}
            articulos={articulos}
            articuloStockIngresoId={articuloStockIngresoId}
            articuloStockIngresoCantidad={articuloStockIngresoCantidad}
            articuloStockIngresoComentarios={articuloStockIngresoComentarios}
            articuloStockIngresoSaving={articuloStockIngresoSaving}
            submitArticuloStockIngreso={submitArticuloStockIngreso}
            setArticuloStockIngresoId={setArticuloStockIngresoId}
            setArticuloStockIngresoCantidad={setArticuloStockIngresoCantidad}
            setArticuloStockIngresoComentarios={setArticuloStockIngresoComentarios}
            articuloEntregaPersonalCi={articuloEntregaPersonalCi}
            articuloEntregaPersonalOrdenanteCi={articuloEntregaPersonalOrdenanteCi}
            articuloEntregaPersonalFecha={articuloEntregaPersonalFecha}
            articuloEntregaPersonalComentarios={articuloEntregaPersonalComentarios}
            articuloEntregaPersonalItems={articuloEntregaPersonalItems}
            articuloEntregaPersonalSaving={articuloEntregaPersonalSaving}
            submitArticuloEntregaPersonal={submitArticuloEntregaPersonal}
            setArticuloEntregaPersonalCi={setArticuloEntregaPersonalCi}
            setArticuloEntregaPersonalOrdenanteCi={setArticuloEntregaPersonalOrdenanteCi}
            setArticuloEntregaPersonalFecha={setArticuloEntregaPersonalFecha}
            setArticuloEntregaPersonalComentarios={setArticuloEntregaPersonalComentarios}
            updateArticuloEntregaPersonalItem={updateArticuloEntregaPersonalItem}
            addArticuloEntregaPersonalItem={addArticuloEntregaPersonalItem}
            removeArticuloEntregaPersonalItem={removeArticuloEntregaPersonalItem}
            newBateria={newBateria}
            newBateriaOrden={newBateriaOrden}
            createBateria={createBateria}
            setNewBateria={setNewBateria}
            setNewBateriaOrden={setNewBateriaOrden}
            newRangoAbreviacion={newRangoAbreviacion}
            newRangoNombreCompleto={newRangoNombreCompleto}
            newRangoOrden={newRangoOrden}
            createRango={createRango}
            setNewRangoAbreviacion={setNewRangoAbreviacion}
            setNewRangoNombreCompleto={setNewRangoNombreCompleto}
            setNewRangoOrden={setNewRangoOrden}
            isAdmin={isAdmin}
            newUserRangoId={newUserRangoId}
            rangosConfigView={rangosConfigView}
            newNombre={newNombre}
            newApellido={newApellido}
            newUsername={newUsername}
            newPassword={newPassword}
            newPasswordConfirm={newPasswordConfirm}
            newMailReferencia={newMailReferencia}
            newRole={newRole}
            createUsuario={createUsuario}
            setNewUserRangoId={setNewUserRangoId}
            setNewNombre={setNewNombre}
            setNewApellido={setNewApellido}
            setNewUsername={setNewUsername}
            setNewPassword={setNewPassword}
            setNewPasswordConfirm={setNewPasswordConfirm}
            setNewMailReferencia={setNewMailReferencia}
            setNewRole={setNewRole}
            roleLabel={roleLabel}
            roleDescription={roleDescription}
            roleScope={roleScope}
            personal={personal}
            personalFiltrado={personalFiltrado}
            personalFiltradoPaginado={personalFiltradoPaginado}
            canWrite={canWrite}
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
            setSearchCedula={setSearchCedula}
            setSearchApellidos={setSearchApellidos}
            setSearchNombres={setSearchNombres}
            setBateriaFilter={setBateriaFilter}
            setPersonalPage={setPersonalPage}
            setPersonalPageSize={setPersonalPageSize}
            printAllDeliverySheets={printAllDeliverySheets}
            emailAllDeliverySheets={emailAllDeliverySheets}
            cancelBulkDeliveryEmailJob={cancelBulkDeliveryEmailJob}
            bulkDeliveryEmailBusy={bulkDeliveryEmailBusy}
            bulkDeliveryEmailDisabledReason={bulkDeliveryEmailDisabledReason}
            printPersonnelByBattery={printPersonnelByBattery}
            openMassRegistro={openMassRegistro}
            openRecintoRegistro={openRecintoRegistro}
            toggleTallas={toggleTallas}
            deletePersonal={deletePersonal}
            openRegistro={openRegistro}
            deleteRecintoRegistro={deleteRecintoRegistro}
            openPersonalObservacion={openPersonalObservacion}
            openRegistroViewer={openRegistroViewer}
            openPersonaProfileFromPersonal={openPersonaProfileFromPersonal}
            setFichaViewingCi={setFichaViewingCi}
            startEditPersonal={startEditPersonal}
            setEditPersonalCi={setEditPersonalCi}
            setEditPersonal={setEditPersonal}
            updatePersonal={updatePersonal}
            canPromoteEditPersonalToSuboficial={canPromoteEditPersonalToSuboficial}
            promotingSubalternoCi={promotingSubalternoCi}
            promoteSargentoToSuboficial={promoteSargentoToSuboficial}
            openAscensoDeliverySheet={openAscensoDeliverySheet}
            oficialesSuboficiales={oficialesSuboficiales}
            startEditOficialSuboficial={startEditOficialSuboficial}
            openOficialSuboficialCreate={openOficialSuboficialCreate}
            openPersonaProfileFromOficialSuboficial={openPersonaProfileFromOficialSuboficial}
            reloadCurrentViewData={reloadCurrentViewData}
            hojaMatrixData={hojaMatrixData}
            hojaMatrixLoading={hojaMatrixLoading}
            hojaMatrixError={hojaMatrixError}
            loadHojaMatrix={loadHojaMatrix}
            equipoResumenData={equipoResumenData}
            equipoResumenLoading={equipoResumenLoading}
            equipoResumenError={equipoResumenError}
            loadEquipoResumen={loadEquipoResumen}
            stockData={stockData}
            stockLoading={stockLoading}
            stockError={stockError}
            equiposOrdenados={equiposOrdenados}
            stockDraft={stockDraft}
            stockSaving={stockSaving}
            setStockDraft={setStockDraft}
            updateStockDraftItem={updateStockDraftItem}
            addStockDraftItem={addStockDraftItem}
            removeStockDraftItem={removeStockDraftItem}
            saveStockOperation={saveStockOperation}
            prestamoDraft={prestamoDraft}
            prestamoSaving={prestamoSaving}
            returningPrestamoId={returningPrestamoId}
            setPrestamoDraft={setPrestamoDraft}
            updatePrestamoDraftItem={updatePrestamoDraftItem}
            addPrestamoDraftItem={addPrestamoDraftItem}
            removePrestamoDraftItem={removePrestamoDraftItem}
            savePrestamo={savePrestamo}
            returnPrestamo={returnPrestamo}
            reloadActiveStockData={reloadActiveStockData}
            editingPrestamoId={editingPrestamoId}
            editPrestamo={editPrestamo}
            deletePrestamo={deletePrestamo}
            openPersonaProfileByCi={openPersonaProfileByCi}
            inEtiquetadoView={inEtiquetadoView}
            activeEtiquetadoSection={activeEtiquetadoSection}
            etiquetadoData={etiquetadoData}
            etiquetadoLoading={etiquetadoLoading}
            etiquetadoError={etiquetadoError}
            reloadEtiquetadoData={reloadEtiquetadoData}
            createEtiquetadoItem={createEtiquetadoItem}
            createEtiquetadoEstanteria={createEtiquetadoEstanteria}
            deleteEtiquetadoEstanteria={deleteEtiquetadoEstanteria}
            createEtiquetadoCodigoSIE={createEtiquetadoCodigoSIE}
            updateEtiquetadoCodigoSIE={updateEtiquetadoCodigoSIE}
            deleteEtiquetadoCodigoSIE={deleteEtiquetadoCodigoSIE}
            createEtiquetadoCaja={createEtiquetadoCaja}
            deleteEtiquetadoCaja={deleteEtiquetadoCaja}
            printEtiquetaCaja={printEtiquetaCaja}
            printListadoCajas={printListadoCajas}
            printTodasEtiquetas={printTodasEtiquetas}
            EMPTY_PERSONAL_FORM={EMPTY_PERSONAL_FORM}
          />

          <HomeOverlaysLayer
            activeView={activeView}
            mergeEquipoDialog={mergeEquipoDialog}
            mergeEquipoSource={mergeEquipoSource}
            mergeEquipoDialogTargetId={mergeEquipoDialogTargetId}
            mergeEquipoTargetOptions={mergeEquipoTargetOptions}
            mergeEquipoSaving={mergeEquipoSaving}
            updateMergeEquipoDialogTarget={updateMergeEquipoDialogTarget}
            closeMergeEquipoDialog={closeMergeEquipoDialog}
            submitMergeEquipoDialog={submitMergeEquipoDialog}
            showChangePassword={showChangePassword}
            changeCurrentPassword={changeCurrentPassword}
            changeNewPassword={changeNewPassword}
            changeConfirmPassword={changeConfirmPassword}
            changeLoading={changeLoading}
            setChangeCurrentPassword={setChangeCurrentPassword}
            setChangeNewPassword={setChangeNewPassword}
            setChangeConfirmPassword={setChangeConfirmPassword}
            setShowChangePassword={setShowChangePassword}
            submitChangePassword={submitChangePassword}
            userRoleDialog={userRoleDialog}
            userRoleSaving={userRoleSaving}
            setUserRoleDialog={setUserRoleDialog}
            closeUserRoleDialog={closeUserRoleDialog}
            submitUserRoleChange={submitUserRoleChange}
            userPasswordDialog={userPasswordDialog}
            userPasswordSaving={userPasswordSaving}
            setUserPasswordDialog={setUserPasswordDialog}
            closeUserPasswordDialog={closeUserPasswordDialog}
            submitUserPasswordChange={submitUserPasswordChange}
            usernameDialog={usernameDialog}
            usernameSaving={usernameSaving}
            rangosConfigView={rangosConfigView}
            setUsernameDialog={setUsernameDialog}
            closeUsernameDialog={closeUsernameDialog}
            submitUsernameChange={submitUsernameChange}
            confirmDialog={confirmDialog}
            confirmDialogBusy={confirmDialogBusy}
            closeConfirmDialog={closeConfirmDialog}
            confirmDialogAccept={confirmDialogAccept}
            registroViewer={registroViewer}
            registroViewerRowsPaginados={registroViewerRowsPaginados}
            registroViewerPage={registroViewerPage}
            registroViewerPageSize={registroViewerPageSize}
            canWrite={canWrite}
            canDeleteRegistros={canDeleteRegistros}
            rectifyRegistro={rectifyRegistro}
            setRegistroViewerPage={setRegistroViewerPage}
            setRegistroViewerPageSize={setRegistroViewerPageSize}
            setRegistroViewer={setRegistroViewer}
            registroDraft={registroDraft}
            personaRegistro={personaRegistro}
            personalFiltrado={personalFiltrado}
            oficialesSuboficiales={oficialesSuboficiales}
            equiposOrdenados={equiposOrdenados}
            maxFechaIngreso={maxFechaIngreso}
            registroSaving={registroSaving}
            setRegistroDraft={setRegistroDraft}
            toggleRegistroDestinatario={toggleRegistroDestinatario}
            selectAllRegistroDestinatarios={selectAllRegistroDestinatarios}
            clearRegistroDestinatarios={clearRegistroDestinatarios}
            updateRegistroItem={updateRegistroItem}
            addRegistroItem={addRegistroItem}
            removeRegistroItem={removeRegistroItem}
            deleteRegistro={deleteRegistro}
            saveRegistro={saveRegistro}
            personalObservacionDraft={personalObservacionDraft}
            personalObservacionSaving={personalObservacionSaving}
            setPersonalObservacionDraft={setPersonalObservacionDraft}
            resetPersonalObservacionForm={resetPersonalObservacionForm}
            editPersonalObservacion={editPersonalObservacion}
            deletePersonalObservacion={deletePersonalObservacion}
            savePersonalObservacion={savePersonalObservacion}
            personaProfile={personaProfile}
            closePersonaProfileView={closePersonaProfileView}
            reloadPersonaProfile={reloadPersonaProfile}
            printDeliverySheetFromProfile={printDeliverySheetFromProfile}
            printPrestamosFromProfile={printPrestamosFromProfile}
            onPrintMovementsSummary={printMovementsSummaryFromProfile}
            fichaViewingCi={fichaViewingCi}
            setActiveView={setActiveView}
            recordatorioConfig={recordatorioConfig}
            recordatorioTasks={recordatorioTasks}
            recordatoriosLoading={recordatoriosLoading}
            recordatoriosSaving={recordatoriosSaving}
            currentUser={currentUser}
            soldadoWidgetVariant={soldadoWidgetVariant}
            createRecordatorioTask={createRecordatorioTask}
            updateRecordatorioTask={updateRecordatorioTask}
            isAppGlobalBusy={isAppGlobalBusy}
            appBusyLabel={appBusyLabel}
          />
        </div>
      </Box>

      <GlobalSearchModal
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onSelectPersona={(ci) => {
          void openPersonaProfileByCi(ci);
          setGlobalSearchOpen(false);
        }}
        personal={personal}
        oficialesSuboficiales={oficialesSuboficiales}
      />
    </Box>
  );
}
