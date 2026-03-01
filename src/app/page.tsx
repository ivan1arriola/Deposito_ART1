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
  TALLA_LABELS,
  TALLA_OPTIONS,
  type TallaKey,
  normalizeTallaValue,
} from "@/lib/tallas";
import { DashboardHero } from "./components/home/DashboardHero";
import { FormulariosPlaceholder } from "./components/home/FormulariosPlaceholder";
import { MainNavigation } from "./components/home/MainNavigation";
import { HomeDialogsLayer } from "./components/modals/HomeDialogsLayer";
import { PersonalSection } from "./components/personal/PersonalSection";
import { ConfigViews } from "./components/views/ConfigViews";
import { BateriaCreateView } from "./components/views/BateriaCreateView";
import { EquipoResumenView } from "./components/views/EquipoResumenView";
import { EquipoCreateView } from "./components/views/EquipoCreateView";
import { HojaDeEntregaView } from "./components/views/HojaDeEntregaView";
import { HojaMatrixView } from "./components/views/HojaMatrixView";
import { PersonalCreateView } from "./components/views/PersonalCreateView";
import { RangoCreateView } from "./components/views/RangoCreateView";
import { StockView } from "./components/views/StockView";
import { TallasResumenView } from "./components/views/TallasResumenView";
import { SmallActionButton, ActionMenu, toast } from "./components/shared";
import { useHomeData } from "./hooks/useHomeData";

// Importar tipos desde archivos de tipos organizados
import type {
  Role,
  Rango,
  Bateria,
  Equipo,
  Personal,
  PersonalObservacion,
  FirmaConfig,
  UsuarioAdmin,
} from "@/types/entities";
import type {
  PersonalForm,
  EquipoForm,
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
import { ROLE_OPTIONS } from "@/types/entities";
import { EMPTY_PERSONAL_FORM, EMPTY_EQUIPO_FORM, EMPTY_STOCK_OPERACION_DRAFT } from "@/types/forms";
import type { PersonalObservacionDraft, UserPasswordDialogState, UserProfileDialogState, UserRoleDialogState } from "./types/home";

// Importar utilidades desde archivos organizados
import { api } from "@/lib/api";
import { apellidosLabel, nombresLabel, roleDescription, roleLabel, roleScope, rangoLabel } from "@/lib/formatters";
import {
  getTodayDateInput,
  personalPayload,
  toEditablePersonal,
} from "@/lib/form-mappers";
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
  updateMultipleItemOrdersHandler,
} from "@/lib/handlers-catalog";
import {
  createPersonalHandler,
  updatePersonalHandler,
  deletePersonalHandler,
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
  toggleUserActiveHandler,
  deleteUsuarioHandler,
  saveFirmaConfigHandler,
} from "@/lib/handlers-usuarios";
import {
  loginHandler,
  logoutHandler,
  changePasswordHandler,
} from "@/lib/handlers-auth";

// Importar utilidades de helpers
import { auditActionLabel, auditEntityLabel, renderAuditDetalle } from "@/lib/audit-helpers";

export default function Home() {
  const ciPlaceholder = `Ej: ${generatePlaceholderUruguayanCi()}`;
  const [status, setStatus] = useState("Verificando sesión...");
  const {
    loading,
    initMessage,
    showInitCredentials,
    setShowInitCredentials,
    initCredentials,
    currentUser,
    setCurrentUser,
    rangos,
    baterias,
    equipos,
    personal,
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
    loadStockData,
    clearLoadedData: clearLoadedDataState,
  } = useHomeData({ onStatusChange: setStatus });
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
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


  const [newGrado, setNewGrado] = useState("");
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

  const [newPersonal, setNewPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [editPersonalCi, setEditPersonalCi] = useState<string | null>(null);
  const [editPersonal, setEditPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [searchCedula, setSearchCedula] = useState("");
  const [searchNombres, setSearchNombres] = useState("");
  const [searchApellidos, setSearchApellidos] = useState("");
  const [bateriaFilter, setBateriaFilter] = useState<string>("ALL");
  const [expandedTallasByCi, setExpandedTallasByCi] = useState<Record<string, boolean>>({});
  const [registroDraft, setRegistroDraft] = useState<RegistroDraft | null>(null);
  const [registroSaving, setRegistroSaving] = useState(false);
  const [stockDraft, setStockDraft] = useState<StockOperacionDraft>({ ...EMPTY_STOCK_OPERACION_DRAFT, fecha: getTodayDateInput() });
  const [stockSaving, setStockSaving] = useState(false);
  const [personalObservacionDraft, setPersonalObservacionDraft] = useState<PersonalObservacionDraft | null>(null);
  const [personalObservacionSaving, setPersonalObservacionSaving] = useState(false);
  const [registroViewer, setRegistroViewer] = useState<RegistroViewerState | null>(null);
  const [registroViewerPage, setRegistroViewerPage] = useState(1);
  const [registroViewerPageSize, setRegistroViewerPageSize] = useState(20);
  const [activeView, setActiveView] = useState<MainView>("personal");
  const [fichaViewingCi, setFichaViewingCi] = useState<string | null>(null);
  const [showConfigViews, setShowConfigViews] = useState(false);
  const configMenuRef = useRef<HTMLDivElement | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmDialogBusy, setConfirmDialogBusy] = useState(false);
  const [creatingPersonal, setCreatingPersonal] = useState(false);
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
  const canRegisterPersonal = canWrite && rangos.length > 0;
  const inCatalogView = activeView === "grados" || activeView === "baterias" || activeView === "equipos";
  const inAdminConfigView = activeView === "firmas" || activeView === "usuarios" || activeView === "auditoria";
  const normalizedNewCi = normalizeCi(newPersonal.ci.trim());
  const duplicatePersonal = useMemo(() => {
    if (normalizedNewCi === "") return null;
    return personal.find((persona) => normalizeCi(persona.ci) === normalizedNewCi) ?? null;
  }, [normalizedNewCi, personal]);
  const ciAlreadyExists = duplicatePersonal !== null;
  const ciLooksValid = newPersonal.ci.trim() === "" || isValidUruguayanCi(newPersonal.ci);
  const newPersonalPhoneLooksValid =
    newPersonal.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(newPersonal.telefonoContacto);
  const newPersonalReentryDatesLookValid =
    !newPersonal.esReingreso ||
    (newPersonal.fechaIngreso.trim() !== "" &&
      (newPersonal.fechaIngresoOriginal.trim() === "" || newPersonal.fechaIngresoOriginal <= newPersonal.fechaIngreso));
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
    newPersonalReentryDatesLookValid &&
    !creatingPersonal;
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
          if (normalized) values.add(normalized);
        }
      }

      const newValue = normalizeTallaValue(key, newPersonal[key]);
      const editValue = normalizeTallaValue(key, editPersonal[key]);
      if (newValue) values.add(newValue);
      if (editValue) values.add(editValue);

      dynamic[key] = Array.from(values).sort((a, b) => compareTallaOptions(key, a, b));
    }

    return dynamic;
  }, [personal, newPersonal, editPersonal]);
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
  const isConfigView = inCatalogView || inAdminConfigView;
  const personaRegistro = useMemo(() => {
    if (!registroDraft) return null;
    return personal.find((persona) => persona.ci === registroDraft.ci) ?? null;
  }, [personal, registroDraft]);
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
    if (activeView === "personal_nuevo" && !canWrite) {
      setActiveView("personal");
    }
  }, [activeView, canWrite]);

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
      status === "Verificando sesión..." ||
      status === "Iniciando sesión..." ||
      status === "Ingresa tus credenciales." ||
      status === "Sesion cerrada. Ingresa tus credenciales." ||
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

  function clearLoadedData() {
    clearLoadedDataState();
    setEditPersonalCi(null);
    setEditPersonal(EMPTY_PERSONAL_FORM);
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
  }
  useEffect(() => {
    if (activeView !== "hoja_matrix") return;
    if (hojaMatrixLoading) return;
    if (hojaMatrixData) return;
    void loadHojaMatrix();
  }, [activeView, hojaMatrixData, hojaMatrixLoading, loadHojaMatrix]);

  useEffect(() => {
    if (activeView !== "equipo_resumen") return;
    if (equipoResumenLoading) return;
    if (equipoResumenData) return;
    void loadEquipoResumen();
  }, [activeView, equipoResumenData, equipoResumenLoading, loadEquipoResumen]);

  useEffect(() => {
    if (!["stock", "stock_actual", "stock_alta", "stock_baja", "stock_historial"].includes(activeView)) return;
    if (stockLoading) return;
    if (stockData) return;
    void loadStockData();
  }, [activeView, stockData, stockLoading, loadStockData]);

  useEffect(() => {
    if (activeView === "stock_alta" && stockDraft.tipo !== "INGRESO") {
      setStockDraft((prev) => ({ ...prev, tipo: "INGRESO" }));
      return;
    }
    if (activeView === "stock_baja" && stockDraft.tipo !== "EGRESO") {
      setStockDraft((prev) => ({ ...prev, tipo: "EGRESO" }));
    }
  }, [activeView, stockDraft.tipo]);

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
      const rango = rangos.find((entry) => entry.rangoId === rangoId);
      openConfirmDialog({
        title: "Eliminar grado",
        message: `Se eliminara ${rango?.nombreCompleto ?? "este grado del personal"}.`,
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
    [isAdmin, rangos, loadData],
  );

  const createBateria = useCallback(async () => {
    if (!isAdmin) {
      setStatus("Solo el administrador puede registrar baterias.");
      return;
    }
    try {
      await createBateriaHandler(newBateria, newBateriaOrden.trim() === "" ? undefined : Number(newBateriaOrden), {
        onSuccess: async () => {
          setNewBateria("");
          setNewBateriaOrden("");
          setStatus("Bateria creada.");
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
              setStatus("Bateria actualizada.");
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
        title: "Eliminar bateria",
        message: `Se eliminara ${bateria?.nombre ?? "esta bateria"}.`,
        confirmText: "Eliminar bateria",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteBateriaHandler(bateriaId, {
              onSuccess: async () => {
                setStatus("Bateria eliminada.");
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

      const itemById = new Map(equiposActivos.map((item) => [item.itemId, item]));
      const updates = orderedItemIds
        .map((itemId, idx) => {
          const item = itemById.get(itemId);
          if (!item) return null;
          const ordenPdf = idx + 1;
          return item.ordenPdf === ordenPdf ? null : { itemId: item.itemId, nombre: item.nombre, activo: item.activo, ordenPdf };
        })
        .filter((entry): entry is { itemId: string; nombre: string; activo: boolean; ordenPdf: number } => entry !== null);

      if (updates.length === 0) return;

      try {
        await updateMultipleItemOrdersHandler(updates, {
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
    (itemId: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const item = equipos.find((entry) => entry.itemId === itemId);
      openConfirmDialog({
        title: "Eliminar equipo",
        message: `Se eliminara ${item?.nombre ?? "este equipo"} del catalogo.`,
        confirmText: "Eliminar equipo",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deleteItemHandler(itemId, {
              onSuccess: async () => {
                setStatus("Equipo eliminado.");
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
        setStatus("CI uruguaya invalida. Revisa digito verificador.");
        return;
      }
      if (!newPersonalPhoneLooksValid) {
        setStatus("El celular de contacto debe tener formato uruguayo valido.");
        return;
      }
      if (newPersonal.esReingreso && newPersonal.fechaIngreso.trim() === "") {
        setStatus("La fecha de re-ingreso es obligatoria.");
        return;
      }
      if (
        newPersonal.esReingreso &&
        newPersonal.fechaIngresoOriginal.trim() !== "" &&
        newPersonal.fechaIngresoOriginal > newPersonal.fechaIngreso
      ) {
        setStatus("La fecha de ingreso original no puede ser posterior al re-ingreso.");
        return;
      }

      setCreatingPersonal(true);
      try {
        await createPersonalHandler(personalPayload(newPersonal, true), {
          onSuccess: async () => {
            const nombreCompleto = `${newPersonal.apellido1.trim()}, ${newPersonal.nombre1.trim()}`.replace(/\s+/g, " ").trim();
            setNewPersonal(EMPTY_PERSONAL_FORM);
            setActiveView("personal");
            setPersonalPage(1);
            toast.success("Personal registrado correctamente", {
              description: `${nombreCompleto} ya figura en el listado general y puede recibir movimientos.`,
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
    [canRegisterPersonal, ciAlreadyExists, creatingPersonal, newPersonal, newPersonalPhoneLooksValid, loadData],
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
        setStatus("El celular de contacto debe tener formato uruguayo valido.");
        return;
      }
      if (editPersonal.esReingreso && editPersonal.fechaIngreso.trim() === "") {
        setStatus("La fecha de re-ingreso es obligatoria.");
        return;
      }
      if (
        editPersonal.esReingreso &&
        editPersonal.fechaIngresoOriginal.trim() !== "" &&
        editPersonal.fechaIngresoOriginal > editPersonal.fechaIngreso
      ) {
        setStatus("La fecha de ingreso original no puede ser posterior al re-ingreso.");
        return;
      }
      try {
        await updatePersonalHandler(ci, personalPayload(editPersonal, false), {
          onSuccess: async () => {
            setEditPersonalCi(null);
            setEditPersonal(EMPTY_PERSONAL_FORM);
            setStatus("Personal actualizado.");
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

  const deletePersonal = useCallback(
    (ci: string) => {
      if (!canDelete) {
        setStatus("No tienes permisos para eliminar.");
        return;
      }
      const persona = personal.find((entry) => entry.ci === ci);
      openConfirmDialog({
        title: "Eliminar personal",
        message: persona
          ? `Se eliminara ${apellidosLabel(persona)}, ${nombresLabel(persona)} (${formatUruguayanCi(ci)}).`
          : `Se eliminara el personal con CI ${formatUruguayanCi(ci)}.`,
        confirmText: "Eliminar personal",
        tone: "danger",
        onConfirm: async () => {
          try {
            await deletePersonalHandler(ci, {
              onSuccess: async () => {
                setStatus("Personal eliminado.");
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
      tipo,
      afectaStock: true,
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
            fecha: observacion.fecha.slice(0, 10),
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
      tipo: registro.tipo,
      afectaStock: registro.afectaStock,
      fecha: registro.fecha.slice(0, 10),
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

  async function saveRegistro() {
    if (!registroDraft || registroSaving) return;
    const isRectificacion = registroDraft.modo === "rectificar" && registroDraft.registroId !== null;
    const payloadEquipos = registroDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadEquipos.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad valida.");
      return;
    }
    const uniqueItemIds = new Set(payloadEquipos.map((item) => item.itemId));
    if (uniqueItemIds.size !== payloadEquipos.length) {
      setStatus("No puedes repetir equipos en un mismo movimiento.");
      return;
    }

    setRegistroSaving(true);
    setStatus(isRectificacion ? "Actualizando rectificacion..." : "Actualizando movimiento...");
    try {
      await api(isRectificacion ? `/api/registros/${registroDraft.registroId}` : "/api/registros", {
        method: isRectificacion ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ci: registroDraft.ci,
          tipo: registroDraft.tipo,
          afectaStock: registroDraft.afectaStock,
          fecha: registroDraft.fecha,
          comentarios: registroDraft.comentarios.trim() || undefined,
          items: payloadEquipos,
        }),
      });
      setStatus(
        isRectificacion
          ? `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} rectificada para ${formatUruguayanCi(registroDraft.ci)}.`
          : `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolución"} registrada para ${formatUruguayanCi(registroDraft.ci)}.`,
      );
      setRegistroDraft(null);
      await loadData();
      if (registroViewer && registroViewer.ci === registroDraft.ci) {
        await loadRegistroViewer(registroViewer.ci, registroViewer.nombre);
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : isRectificacion ? "No se pudo rectificar el movimiento." : "No se pudo registrar el movimiento.");
    } finally {
      setRegistroSaving(false);
    }
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

    const payloadItems = stockDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadItems.length === 0) {
      setStatus("Debes agregar al menos un equipo con cantidad valida.");
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
      await loadData();
      await loadStockData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar el movimiento de stock.");
    } finally {
      setStockSaving(false);
    }
  }

  async function savePersonalObservacion() {
    if (!personalObservacionDraft || personalObservacionSaving) return;
    const isEditing = personalObservacionDraft.observacionId !== null;

    if (!personalObservacionDraft.fecha) {
      setStatus("Selecciona la fecha de la observacion.");
      return;
    }
    if (!personalObservacionDraft.texto.trim()) {
      setStatus("Ingresa el texto de la observacion.");
      return;
    }

    setPersonalObservacionSaving(true);
    setStatus(isEditing ? "Actualizando observacion..." : "Guardando observacion...");
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
      setStatus(error instanceof Error ? error.message : isEditing ? "No se pudo actualizar la observacion." : "No se pudo registrar la observacion.");
    } finally {
      setPersonalObservacionSaving(false);
    }
  }

  function deletePersonalObservacion(observacion: PersonalObservacion) {
    openConfirmDialog({
      title: "Eliminar observacion",
      message: `Se eliminara la observacion del ${new Date(observacion.fecha).toLocaleDateString("es-UY")}.`,
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

  function renderInlineEditForm(ci: string) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={editPersonal.apellido1}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, apellido1: event.target.value }))}
          placeholder="Apellido 1"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={editPersonal.apellido2}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, apellido2: event.target.value }))}
          placeholder="Apellido 2"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={editPersonal.nombre1}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, nombre1: event.target.value }))}
          placeholder="Nombre 1"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          value={editPersonal.nombre2}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, nombre2: event.target.value }))}
          placeholder="Nombre 2"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={editPersonal.fechaIngreso}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, fechaIngreso: event.target.value }))}
          max={maxFechaIngreso}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <select
          value={editPersonal.rangoId}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, rangoId: event.target.value }))}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          {rangos.map((rango) => (
            <option key={rango.rangoId} value={rango.rangoId}>
              {rangoLabel(rango)}
            </option>
          ))}
        </select>
        <select
          value={editPersonal.bateriaId}
          onChange={(event) => setEditPersonal((prev) => ({ ...prev, bateriaId: event.target.value }))}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">Sin batería (pendiente)</option>
          {baterias.map((bateria) => (
            <option key={bateria.bateriaId} value={bateria.bateriaId}>
              {bateria.nombre}
            </option>
          ))}
        </select>
        {TALLA_KEYS.map((key) => (
          <label key={`edit-${ci}-${key}`} className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
            <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
            <select
              value={editPersonal[key]}
              onChange={(event) => setEditPersonal((prev) => ({ ...prev, [key]: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar</option>
              {tallaOptionsByKey[key].map((option) => (
                <option key={`edit-${ci}-${key}-${option}`} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          type="button"
          onClick={() => void updatePersonal(ci)}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1"
        >
          Guardar cambios
        </button>
      </div>
    );
  }

  const login = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoginLoading(true);
      setStatus("Iniciando sesión...");

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
          setStatus("Sesion cerrada. Ingresa tus credenciales.");
        },
      });
    } catch {
      // Error manejado o ignorado en logout
      setCurrentUser(null);
      clearLoadedData();
      setLoginPassword("");
      setActiveView("personal");
      setStatus("Sesion cerrada. Ingresa tus credenciales.");
    }
  }, []);

  const createUsuario = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!isAdmin) {
        setStatus("Solo el administrador puede crear usuarios.");
        return;
      }

      const trimmedGrado = newGrado.trim();
      const trimmedNombre = newNombre.trim();
      const trimmedApellido = newApellido.trim();
      const trimmedUsername = newUsername.trim();
      const trimmedMailReferencia = newMailReferencia.trim();
      if (!trimmedGrado || !trimmedNombre || !trimmedApellido || !trimmedUsername) {
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
          grado: trimmedGrado,
          nombre: trimmedNombre,
          apellido: trimmedApellido,
          usuario: trimmedUsername,
          password: newPassword,
          mailReferencia: trimmedMailReferencia,
          rol: newRole,
        }, {
          onSuccess: async () => {
            setNewGrado("");
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
    [isAdmin, newGrado, newNombre, newApellido, newUsername, newPassword, newPasswordConfirm, newMailReferencia, newRole, loadData],
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
        grado?: string;
        nombre?: string;
        apellido?: string;
        username: string;
        mailReferencia?: string | null;
      },
      options?: { title?: string; description?: string },
    ) => {
      setUsernameDialog({
        usuarioId: usuario.usuarioId,
        grado: usuario.grado ?? "",
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
      setStatus("Rol invalido.");
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

    const nextGrado = usernameDialog.grado.trim();
    const nextNombre = usernameDialog.nombre.trim();
    const nextApellido = usernameDialog.apellido.trim();
    const nextUsername = usernameDialog.username.trim();
    const nextMailReferencia = usernameDialog.mailReferencia.trim();
    if (!nextGrado || !nextNombre || !nextApellido || !nextUsername) {
      setStatus("Grado, nombre, apellido y usuario son obligatorios.");
      return;
    }

    setUsernameSaving(true);
    try {
      await updateUsuarioProfileHandler(usernameDialog.usuarioId, {
        grado: nextGrado,
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

  const deleteUsuario = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede eliminar usuarios.");
        return;
      }
      openConfirmDialog({
        title: "Eliminar usuario",
        message: `Se eliminara la cuenta ${usuario.username}.`,
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
    [isAdmin, firmaConfigDraft],
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

  if (!currentUser) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
        <section className="w-full rounded-2xl border border-stone-300/80 bg-white/90 p-6 shadow-sm">
          <div className="mb-4 flex justify-center">
            <Image
              src="/assets/logo-artilleria.jpg"
              alt="Logo Artillería"
              width={180}
              height={128}
              priority
              className="h-auto w-36 rounded-lg border border-stone-300 bg-white object-contain p-1 sm:w-40"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
            {'Grupo "Brig.Gral.Manuel Oribe" de Artillería 105mm No. 1.'}
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-stone-600">{status}</p>

          {initMessage && showInitCredentials && initCredentials && (
            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              initMessage.type === "success"
                ? "border-green-300/70 bg-green-50/80 text-green-900"
                : "border-blue-300/70 bg-blue-50/80 text-blue-900"
            }`}>
              <p className="font-semibold">{initMessage.text}</p>
              <div className="mt-3 space-y-1 rounded border border-current/20 bg-white/50 p-2 text-xs">
                <p><strong>Usuario:</strong> <code className="font-mono">{initCredentials.username}</code></p>
                <p><strong>Contraseña:</strong> <code className="font-mono">{initCredentials.password}</code></p>
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

          <form onSubmit={login} className="mt-4 space-y-3">
            <input
              value={loginUsername}
              onChange={(event) => setLoginUsername(event.target.value)}
              placeholder="Usuario"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              placeholder="Contraseña"
              type="password"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={loading || loginLoading}
              className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading || loginLoading ? "Ingresando..." : "Entrar"}
            </button>
          </form>

        </section>
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
        equiposRegistradosCount={equipos.length}
        movimientosTotal={movimientosTotal}
        roleLabel={roleLabel}
        onReload={() => void loadData(true)}
        onEditOwnUser={changeOwnUsername}
        onChangePassword={() => {
          setChangeCurrentPassword("");
          setChangeNewPassword("");
          setChangeConfirmPassword("");
          setShowChangePassword(true);
        }}
        onLogout={() => void logout()}
      />

      <MainNavigation
        activeView={activeView}
        canWrite={canWrite}
        isAdmin={isAdmin}
        showConfigViews={showConfigViews}
        isConfigView={isConfigView}
        configMenuRef={configMenuRef}
        onSelectView={(view) => {
          setActiveView(view);
          setShowConfigViews(false);
        }}
        onToggleConfigViews={() => setShowConfigViews((prev) => !prev)}
      />


      {inCatalogView || (isAdmin && inAdminConfigView) ? (
        <ConfigViews
          activeView={activeView as "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria"}
          isAdmin={isAdmin}
          canWrite={canWrite}
          rangos={rangos}
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
          usuarios={usuarios}
          newGrado={newGrado}
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
          onSaveEquipoOrder={() => {
            if (!equipoOrderDraftIds) return;
            void saveActiveEquiposOrder(equipoOrderDraftIds);
          }}
          onResetEquipoOrderDraft={() => setEquipoOrderDraftIds(null)}
          renderEquipoCard={renderEquipoCard}
          onNewGradoChange={setNewGrado}
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
          onToggleUserActive={(usuario) => void toggleUserActive(usuario)}
          onDeleteUsuario={(usuario) => void deleteUsuario(usuario)}
          onFirmaConfigDraftChange={(key, value) => setFirmaConfigDraft((prev) => ({ ...prev, [key]: value }))}
          onSaveFirmaConfig={(event) => void saveFirmaConfig(event)}
          onAuditFilterChange={setAuditFilter}
          onAuditPageChange={setAuditPage}
          onAuditPageSizeChange={setAuditPageSize}
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
          tallaOptionsByKey={tallaOptionsByKey}
          maxFechaIngreso={maxFechaIngreso}
          onBack={() => setActiveView("personal")}
          onSubmit={(event) => void createPersonal(event)}
          onPersonalChange={updateNewPersonalField}
        />
      ) : null}

      {activeView === "equipo_nuevo" ? (
        <EquipoCreateView
          form={newEquipo}
          saving={loading}
          onBack={() => setActiveView("personal")}
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

      {activeView === "personal" ? (
        <PersonalSection
          personal={personal}
          personalFiltrado={personalFiltrado}
          personalFiltradoPaginado={personalFiltradoPaginado}
          baterias={baterias}
          rangos={rangos}
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

      {["stock", "stock_actual", "stock_alta", "stock_baja", "stock_historial"].includes(activeView) ? (
        <StockView
          section={
            activeView === "stock_alta"
              ? "alta"
              : activeView === "stock_baja"
                ? "baja"
                : activeView === "stock_historial"
                  ? "historial"
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
          onReload={() => void loadStockData()}
        />
      ) : null}

      {activeView === "formularios" ? <FormulariosPlaceholder /> : null}

      {activeView === "tallas_resumen" ? (
        <TallasResumenView personal={personal} baterias={baterias} />
      ) : null}

      
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
        onRectifyRegistro={rectifyRegistro}
        onRegistroViewerPageChange={setRegistroViewerPage}
        onRegistroViewerPageSizeChange={setRegistroViewerPageSize}
        onCloseRegistroViewer={() => setRegistroViewer(null)}
        registroDraft={registroDraft}
        personaRegistro={personaRegistro}
        equiposOrdenados={equiposOrdenados}
        maxFechaIngreso={maxFechaIngreso}
        registroSaving={registroSaving}
        onCloseRegistroEditor={() => setRegistroDraft(null)}
        onAfectaStockChange={(value) => setRegistroDraft((prev) => (prev ? { ...prev, afectaStock: value } : prev))}
        onRegistroDraftChange={(field, value) => setRegistroDraft((prev) => (prev ? { ...prev, [field]: value } : prev))}
        onRegistroItemChange={updateRegistroItem}
        onAddRegistroItem={addRegistroItem}
        onRemoveRegistroItem={removeRegistroItem}
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

      {loading ? <p className="mt-4 text-xs text-stone-600">Actualizando informacion...</p> : null}
      
    </main>
  );
}
