"use client";

import Image from "next/image";
import {
  Fragment,
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
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
import { ConfigViews } from "./components/views/ConfigViews";
import { HojaDeEntregaView } from "./components/views/HojaDeEntregaView";
import { HojaMatrixView } from "./components/views/HojaMatrixView";
import { PersonalCreateView } from "./components/views/PersonalCreateView";
import { TallasResumenView } from "./components/views/TallasResumenView";
import { SmallActionButton, PaginationControls, ActionMenu, toast } from "./components/shared";

// Importar tipos desde archivos de tipos organizados
import type {
  Role,
  Rango,
  Bateria,
  Equipo,
  Personal,
  PersonalObservacion,
  CurrentUser,
  FirmaConfig,
  UsuarioAdmin,
  AuditoriaRecord,
  DbStatus,
} from "@/types/entities";
import type {
  PersonalForm,
  EquipoForm,
  RegistroDraftEquipo,
  RegistroDraft,
} from "@/types/forms";
import type {
  MainView,
  RegistroTipo,
  RegistroView,
  RegistroViewerState,
  HojaMatrixData,
  ConfirmDialogState,
  AuditFilter,
} from "@/types/views";
import { ROLE_OPTIONS } from "@/types/entities";
import { EMPTY_PERSONAL_FORM, EMPTY_EQUIPO_FORM } from "@/types/forms";

// Importar utilidades desde archivos organizados
import { api } from "@/lib/api";
import { apellidosLabel, nombresLabel, roleDescription, roleLabel, roleScope, rangoLabel, tallasEntries } from "@/lib/formatters";
import {
  tallasMap,
  getTodayDateInput,
  personalPayload,
  toEditablePersonal,
} from "@/lib/form-mappers";
import { normalizeSearchTerm } from "@/lib/search";
import { moveIdInOrder, compareTallaOptions } from "@/lib/array-utils";

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
  changeUsernameHandler,
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
import { checkDbInitHandler, initializeDatabaseHandler } from "@/lib/handlers-auth";

type PersonalObservacionDraft = {
  ci: string;
  nombre: string;
  observacionId: string | null;
  fecha: string;
  texto: string;
  observaciones: PersonalObservacion[];
  loading: boolean;
  error: string | null;
};

type UserRoleDialogState = {
  usuarioId: string;
  username: string;
  currentRole: Role;
  nextRole: Role;
};

type UserPasswordDialogState = {
  usuarioId: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
};

type UsernameDialogState = {
  usuarioId: string;
  username: string;
  title: string;
  description: string;
};

export default function Home() {
  const ciPlaceholder = `Ej: ${generatePlaceholderUruguayanCi()}`;
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Verificando sesión...");
  const [initMessage, setInitMessage] = useState<{ type: "info" | "success"; text: string } | null>(null);
  const [showInitCredentials, setShowInitCredentials] = useState(false);
  const [initCredentials, setInitCredentials] = useState<{ username: string; password: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
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
  const [usernameDialog, setUsernameDialog] = useState<UsernameDialogState | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);

  const [rangos, setRangos] = useState<Rango[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaRecord[]>([]);
  const [firmaConfig, setFirmaConfig] = useState<FirmaConfig | null>(null);
  const [firmaConfigDraft, setFirmaConfigDraft] = useState({
    encargadoRango: "",
    encargadoNombre: "",
    oficialRango: "",
    oficialNombre: "",
  });
  const [firmaConfigLoading, setFirmaConfigLoading] = useState(false);
  const [firmaConfigSaving, setFirmaConfigSaving] = useState(false);
  const [firmaConfigError, setFirmaConfigError] = useState<string | null>(null);
  const [movimientosTotal, setMovimientosTotal] = useState(0);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
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
  const [draggedEquipoId, setDraggedEquipoId] = useState<string | null>(null);
  const [dragOrderEquipoIds, setDragOrderEquipoIds] = useState<string[] | null>(null);
  const draggedEquipoIdRef = useRef<string | null>(null);
  const dragOrderEquipoIdsRef = useRef<string[] | null>(null);
  const equipoCardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousEquipoRectsRef = useRef(new Map<string, DOMRect>());

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
  const [personalObservacionDraft, setPersonalObservacionDraft] = useState<PersonalObservacionDraft | null>(null);
  const [personalObservacionSaving, setPersonalObservacionSaving] = useState(false);
  const [registroViewer, setRegistroViewer] = useState<RegistroViewerState | null>(null);
  const [registroViewerPage, setRegistroViewerPage] = useState(1);
  const [registroViewerPageSize, setRegistroViewerPageSize] = useState(20);
  const [activeView, setActiveView] = useState<MainView>("personal");
  const [fichaViewingCi, setFichaViewingCi] = useState<string | null>(null);
  const [showConfigViews, setShowConfigViews] = useState(false);
  const configMenuRef = useRef<HTMLDivElement | null>(null);
  const [hojaMatrixData, setHojaMatrixData] = useState<HojaMatrixData | null>(null);
  const [hojaMatrixLoading, setHojaMatrixLoading] = useState(false);
  const [hojaMatrixError, setHojaMatrixError] = useState<string | null>(null);
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
  const ciHasError = !ciLooksValid || ciAlreadyExists;
  const requiredPersonalFields = [
    newPersonal.ci.trim() !== "" && isValidUruguayanCi(newPersonal.ci) && !ciAlreadyExists,
    newPersonal.apellido1.trim() !== "",
    newPersonal.nombre1.trim() !== "",
    Number(newPersonal.rangoId) > 0,
  ];
  const requiredPersonalCompleted = requiredPersonalFields.filter(Boolean).length;
  const canSubmitPersonal = canRegisterPersonal && requiredPersonalCompleted === requiredPersonalFields.length && !creatingPersonal;
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
    if (!dragOrderEquipoIds) return equiposActivos;
    const activeById = new Map(equiposActivos.map((item) => [item.itemId, item]));
    return dragOrderEquipoIds
      .map((itemId) => activeById.get(itemId))
      .filter((item): item is Equipo => item !== undefined);
  }, [equiposActivos, dragOrderEquipoIds]);
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
    if (!dragOrderEquipoIds) return;
    const currentActiveIds = new Set(equiposActivos.map((item) => item.itemId));
    const dragStateIsValid =
      dragOrderEquipoIds.length === equiposActivos.length && dragOrderEquipoIds.every((itemId) => currentActiveIds.has(itemId));
    if (dragStateIsValid) return;
    setDraggedEquipoId(null);
    setDragOrderEquipoIds(null);
    draggedEquipoIdRef.current = null;
    dragOrderEquipoIdsRef.current = null;
  }, [dragOrderEquipoIds, equiposActivos]);

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();

    for (const equipo of equiposActivosEnPantalla) {
      const node = equipoCardRefs.current.get(equipo.itemId);
      if (!node) continue;

      const nextRect = node.getBoundingClientRect();
      nextRects.set(equipo.itemId, nextRect);

      const previousRect = previousEquipoRectsRef.current.get(equipo.itemId);
      if (!previousRect) continue;

      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue;

      node.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(0.985)` },
          { transform: "translate(0px, 0px) scale(1)" },
        ],
        {
          duration: draggedEquipoId ? 220 : 320,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    }

    previousEquipoRectsRef.current = nextRects;
  }, [equiposActivosEnPantalla, draggedEquipoId]);

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
    setRangos([]);
    setBaterias([]);
    setEquipos([]);
    setPersonal([]);
    setUsuarios([]);
    setAuditoria([]);
    setFirmaConfig(null);
    setFirmaConfigDraft({ encargadoRango: "", encargadoNombre: "", oficialRango: "", oficialNombre: "" });
    setFirmaConfigLoading(false);
    setFirmaConfigSaving(false);
    setFirmaConfigError(null);
    setMovimientosTotal(0);
    setEditPersonalCi(null);
    setEditPersonal(EMPTY_PERSONAL_FORM);
    setExpandedTallasByCi({});
    setRegistroDraft(null);
    setRegistroSaving(false);
    setPersonalObservacionDraft(null);
    setPersonalObservacionSaving(false);
    setRegistroViewerPage(1);
    setRegistroViewerPageSize(20);
    setHojaMatrixData(null);
    setHojaMatrixLoading(false);
    setHojaMatrixError(null);
    setConfirmDialog(null);
    setConfirmDialogBusy(false);
    setPersonalPage(1);
    setPersonalPageSize(25);
    setAuditPage(1);
    setAuditPageSize(25);
    setDraggedEquipoId(null);
    setDragOrderEquipoIds(null);
    draggedEquipoIdRef.current = null;
    dragOrderEquipoIdsRef.current = null;
    equipoCardRefs.current.clear();
    previousEquipoRectsRef.current.clear();
  }

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);

    try {
      const me = await api<{ user: CurrentUser }>("/api/auth/me");
      setCurrentUser(me.user);

      await api<DbStatus>("/api/db-status");

      const [rangosData, bateriasData, equiposData, personalData, movimientosSummary] = await Promise.all([
        api<Rango[]>("/api/rangos"),
        api<Bateria[]>("/api/baterias"),
        api<Equipo[]>("/api/items"),
        api<Personal[]>("/api/personal"),
        api<{ total: number }>("/api/registros?summary=1").catch(() => ({ total: 0 })),
      ]);

      setRangos(rangosData);
      setBaterias(bateriasData);
      setEquipos(equiposData);
      setPersonal(personalData);
      setMovimientosTotal(movimientosSummary.total);

      if (me.user.rol === "ADMIN") {
        setFirmaConfigLoading(true);
        const [usuariosData, auditoriaData, firmaConfigResult] = await Promise.all([
          api<UsuarioAdmin[]>("/api/usuarios"),
          api<AuditoriaRecord[]>("/api/auditoria?limit=200"),
          api<FirmaConfig>("/api/firma-config")
            .then((config) => ({ config, error: null as string | null }))
            .catch((error: unknown) => ({
              config: null,
              error: error instanceof Error ? error.message : "No se pudo cargar la configuracion de firmas.",
            })),
        ]);
        setUsuarios(usuariosData);
        setAuditoria(auditoriaData);
        setFirmaConfig(firmaConfigResult.config);
        setFirmaConfigDraft({
          encargadoRango: firmaConfigResult.config?.encargadoRango ?? "",
          encargadoNombre: firmaConfigResult.config?.encargadoNombre ?? "",
          oficialRango: firmaConfigResult.config?.oficialRango ?? "",
          oficialNombre: firmaConfigResult.config?.oficialNombre ?? "",
        });
        setFirmaConfigError(firmaConfigResult.error);
        setFirmaConfigLoading(false);
      } else {
        setUsuarios([]);
        setAuditoria([]);
        setFirmaConfig(null);
        setFirmaConfigDraft({ encargadoRango: "", encargadoNombre: "", oficialRango: "", oficialNombre: "" });
        setFirmaConfigLoading(false);
        setFirmaConfigError(null);
      }

      setHojaMatrixData(null);
      setHojaMatrixError(null);
      setStatus("Datos actualizados.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la informacion.";
      if (message === "No autenticado.") {
        setCurrentUser(null);
        clearLoadedData();
        setStatus("Ingresa tus credenciales.");
        return;
      }
      if (message.toLowerCase().includes("base de datos")) {
        clearLoadedData();
        setStatus(`Error de base de datos: ${message}`);
        return;
      }
      setStatus(message);
    } finally {
      setFirmaConfigLoading(false);
      setLoading(false);
    }
  }, []);

  const loadHojaMatrix = useCallback(async () => {
    setHojaMatrixLoading(true);
    setHojaMatrixError(null);
    try {
      const data = await api<HojaMatrixData>("/api/hoja-matrix");
      setHojaMatrixData(data);
    } catch (error: unknown) {
      setHojaMatrixError(error instanceof Error ? error.message : "No se pudo cargar la Hoja Matriz.");
    } finally {
      setHojaMatrixLoading(false);
    }
  }, []);

  useEffect(() => {
    const initDb = async () => {
      try {
        const status = await checkDbInitHandler();
        if (status.needsInit) {
          setInitMessage({ type: "info", text: "Inicializando base de datos..." });
          await initializeDatabaseHandler({
            onSuccess: (result: unknown) => {
              const data = result as {
                initialized: boolean;
                message: string;
                credentials?: { username: string; password: string };
              };
              if (data.credentials) {
                setInitCredentials(data.credentials);
              }
              setInitMessage({ type: "success", text: data.message });
              setShowInitCredentials(true);
            },
            onError: (message) => {
              setInitMessage({ type: "info", text: `Error al inicializar: ${message}` });
            },
          });
        }
      } catch {
        // Silent fail, la BD ya está inicializada
      }
    };
    void initDb();
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  useEffect(() => {
    if (activeView !== "hoja_matrix") return;
    if (hojaMatrixLoading) return;
    if (hojaMatrixData) return;
    void loadHojaMatrix();
  }, [activeView, hojaMatrixData, hojaMatrixLoading, loadHojaMatrix]);

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
            setStatus(`Equipo ${!equipo.activo ? "activado" : "desactivado"}.`);
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

  function startEquipoDrag(itemId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }

    event.preventDefault();
    const orderedIds = equiposActivos.map((item) => item.itemId);
    if (!orderedIds.includes(itemId)) return;

    setDraggedEquipoId(itemId);
    setDragOrderEquipoIds(orderedIds);
    draggedEquipoIdRef.current = itemId;
    dragOrderEquipoIdsRef.current = orderedIds;
  }

  useEffect(() => {
    if (!draggedEquipoId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!(target instanceof HTMLElement)) return;
      const targetCard = target.closest<HTMLElement>("[data-equipo-drag-id]");
      const targetEquipoId = targetCard?.dataset.equipoDragId;
      const currentDraggedEquipoId = draggedEquipoIdRef.current;
      const currentOrder = dragOrderEquipoIdsRef.current;

      if (!targetEquipoId || !currentDraggedEquipoId || !currentOrder) return;

      const currentIndex = currentOrder.indexOf(currentDraggedEquipoId);
      const targetIndex = currentOrder.indexOf(targetEquipoId);
      if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return;

      const nextOrder = moveIdInOrder(currentOrder, currentIndex, targetIndex);
      dragOrderEquipoIdsRef.current = nextOrder;
      setDragOrderEquipoIds(nextOrder);
    };

    const finishDrag = () => {
      const finalOrder = dragOrderEquipoIdsRef.current;
      setDraggedEquipoId(null);
      setDragOrderEquipoIds(null);
      draggedEquipoIdRef.current = null;
      dragOrderEquipoIdsRef.current = null;

      if (finalOrder) {
        void saveActiveEquiposOrder(finalOrder);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
    };
  }, [draggedEquipoId, saveActiveEquiposOrder]);

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
        setStatus("La cedula ya existe.");
        return;
      }
      if (!isValidUruguayanCi(newPersonal.ci)) {
        setStatus("CI uruguaya invalida. Revisa digito verificador.");
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
    [canRegisterPersonal, ciAlreadyExists, creatingPersonal, newPersonal, loadData],
  );

  const updateNewPersonalField = useCallback((field: keyof PersonalForm, value: string) => {
    setNewPersonal((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updatePersonal = useCallback(
    async (ci: string) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
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
          fecha: registroDraft.fecha,
          comentarios: registroDraft.comentarios.trim() || undefined,
          items: payloadEquipos,
        }),
      });
      setStatus(
        isRectificacion
          ? `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolucion"} rectificada para ${formatUruguayanCi(registroDraft.ci)}.`
          : `${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolucion"} registrada para ${formatUruguayanCi(registroDraft.ci)}.`,
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
        `${isEditing ? "Observacion actualizada" : "Observacion registrada"} para ${formatUruguayanCi(personalObservacionDraft.ci)}.`,
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
          setStatus(`Observacion eliminada para ${formatUruguayanCi(observacion.ci)}.`);
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
          <option value="">Sin bateria (pendiente)</option>
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
  }, [changeCurrentPassword, changeNewPassword, changeConfirmPassword]);

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

      const trimmedUsername = newUsername.trim();
      if (trimmedUsername === "") {
        setStatus("El nombre de usuario es obligatorio.");
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
        await createUsuarioHandler(trimmedUsername, newPassword, newRole, {
          onSuccess: async () => {
            setNewUsername("");
            setNewPassword("");
            setNewPasswordConfirm("");
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
    [isAdmin, newUsername, newPassword, newPasswordConfirm, newRole, loadData],
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
      usuario: { usuarioId: string; username: string },
      options?: { title?: string; description?: string },
    ) => {
      setUsernameDialog({
        usuarioId: usuario.usuarioId,
        username: usuario.username,
        title: options?.title ?? "Cambiar nombre de usuario",
        description: options?.description ?? "Actualiza el nombre con el que esta cuenta inicia sesion.",
      });
    },
    [],
  );

  const changeUsername = useCallback(
    (usuario: UsuarioAdmin) => {
      if (!isAdmin) {
        setStatus("Solo el administrador puede cambiar nombres de usuario ajenos.");
        return;
      }

      openUsernameDialog(usuario, {
        title: "Cambiar nombre de usuario",
        description: `Actualiza el acceso de ${usuario.username}.`,
      });
    },
    [isAdmin, openUsernameDialog],
  );

  const changeOwnUsername = useCallback(() => {
    if (!currentUser) return;

    openUsernameDialog(currentUser, {
      title: "Cambiar mi usuario",
      description: "Actualiza el nombre de acceso de la cuenta activa.",
    });
  }, [currentUser, openUsernameDialog]);

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

    const nextUsername = usernameDialog.username.trim();
    if (nextUsername === "") {
      setStatus("El nombre de usuario es obligatorio.");
      return;
    }

    setUsernameSaving(true);
    try {
      await changeUsernameHandler(usernameDialog.usuarioId, nextUsername, {
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
  }, [usernameDialog, currentUser, loadData]);

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

  function viewButtonClass(view: MainView) {
    const selected = activeView === view;
    return selected
      ? "ej-view-active rounded-lg px-3 py-2 text-sm font-semibold"
      : "ej-view-idle rounded-lg px-3 py-2 text-sm font-semibold";
  }

  function configOptionClass(view: Extract<MainView, "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria">) {
    const selected = activeView === view;
    return selected
      ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
      : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100 hover:border-stone-400";
  }

  function selectConfigView(view: Extract<MainView, "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria">) {
    setActiveView(view);
    setShowConfigViews(false);
  }

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

  function renderEquipoCard(equipo: Equipo, options?: { draggableInActiveList?: boolean }) {
    const draggableInActiveList = options?.draggableInActiveList === true;
    const isDraggingThisItem = draggedEquipoId === equipo.itemId;

    return (
      <div
        key={equipo.itemId}
        ref={(node) => {
          if (!draggableInActiveList) return;
          if (node) {
            equipoCardRefs.current.set(equipo.itemId, node);
            return;
          }
          equipoCardRefs.current.delete(equipo.itemId);
        }}
        data-equipo-drag-id={draggableInActiveList ? equipo.itemId : undefined}
        className={`rounded-2xl border bg-white/95 p-4 shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out ${
          isDraggingThisItem
            ? "border-lime-400 bg-lime-50/80 shadow-xl shadow-lime-950/15 ring-1 ring-lime-300/80 -translate-y-1 scale-[1.01]"
            : "border-stone-200 hover:-translate-y-0.5 hover:shadow-md"
        }`}
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
              <span className="font-medium text-stone-700">Activo</span>
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
                  {equipo.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">Orden PDF: {equipo.ordenPdf}</p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {draggableInActiveList ? (
                <button
                  type="button"
                  onPointerDown={(event) => startEquipoDrag(equipo.itemId, event)}
                  disabled={!canWrite}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 touch-none disabled:opacity-50 ${
                    isDraggingThisItem
                      ? "bg-lime-700 text-white shadow-lg shadow-lime-950/20"
                      : "bg-stone-200 text-stone-700 hover:bg-stone-300 active:bg-stone-400"
                  }`}
                  title="Arrastra para reordenar"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="5" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="9" cy="19" r="1.5" />
                    <circle cx="15" cy="5" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="15" cy="19" r="1.5" />
                  </svg>
                  Reordenar
                </button>
              ) : null}

                <ActionMenu
                  buttonLabel="Acciones"
                  actions={[
                    {
                    label: equipo.activo ? "Desactivar" : "Activar",
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
      <section className="ej-hero relative overflow-hidden rounded-[32px] border border-white/10 px-5 py-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,204,0,0.22),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(31,103,40,0.34),transparent_36%)]" />
        <div className="pointer-events-none absolute -right-16 top-6 h-48 w-48 rounded-full border border-white/10 bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#0f3b17]/45 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[220px_minmax(0,1.15fr)_320px]">
          <div className="flex flex-col gap-4">
            <Image
              src="/assets/logo-artilleria.jpg"
              alt="Logo Artilleria"
              width={220}
              height={150}
              priority
              className="h-auto w-[160px] rounded-2xl border border-[#FFCC00]/60 bg-white/95 object-contain p-1.5 shadow-lg sm:w-[200px]"
            />
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#FFCC00]">Unidad</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-white">
                {'Grupo "Brig. Gral. Manuel Oribe" de Artilleria 105mm No. 1'}
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#FFCC00]">
              Plataforma operativa de deposito
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
              Deposito General
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/82 sm:text-base">
              Centraliza personal, equipos, movimientos y documentos con una vista rapida del estado operativo y acceso directo a las tareas criticas del dia.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-300/25 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-50">
                {loading ? "Sincronizando datos" : "Sistema operativo"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85">
                {roleScope(currentUser?.rol)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/85">
                Flujo SPA centralizado
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFCC00]">Tu alcance</p>
                <p className="mt-2 text-base font-semibold text-white">{roleLabel(currentUser?.rol)}</p>
                <p className="mt-1 text-sm leading-5 text-white/75">{roleDescription(currentUser?.rol)}</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFCC00]">Situacion</p>
                <p className="mt-2 text-base font-semibold text-white">
                  {equiposActivos.length} equipos activos y {movimientosTotal} movimientos
                </p>
                <p className="mt-1 text-sm leading-5 text-white/75">
                  El panel queda listo para registrar entregas, devoluciones y ajustes sin salir de la vista principal.
                </p>
              </article>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <article className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FFCC00]">Cuenta activa</p>
              <p className="mt-2 text-lg font-semibold text-white">{currentUser.username}</p>
              <p className="mt-1 text-sm text-white/78">{roleLabel(currentUser.rol)}</p>
            </article>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <button
                type="button"
                onClick={() => void loadData(true)}
                className="ej-button-muted rounded-2xl px-3 py-3 text-sm font-semibold"
              >
                Recargar panel
              </button>
              <button
                type="button"
                onClick={changeOwnUsername}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Cambiar usuario
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangeCurrentPassword("");
                  setChangeNewPassword("");
                  setChangeConfirmPassword("");
                  setShowChangePassword(true);
                }}
                className="rounded-2xl border border-[#FFCC00]/35 bg-black/30 px-3 py-3 text-sm font-semibold text-white transition hover:bg-black/40"
              >
                Cambiar contrasena
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="ej-button-danger rounded-2xl px-3 py-3 text-sm font-semibold"
              >
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-xl border border-[#FFCC00]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#FFCC00]">Personal</p>
            <p className="text-lg font-bold text-white">{personal.length}</p>
          </div>
          <div className="rounded-xl border border-[#FFCC00]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#FFCC00]">Grados</p>
            <p className="text-lg font-bold text-white">{rangos.length}</p>
          </div>
          <div className="rounded-xl border border-[#FFCC00]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#FFCC00]">Bater?as</p>
            <p className="text-lg font-bold text-white">{baterias.length}</p>
          </div>
          <div className="rounded-xl border border-[#FFCC00]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#FFCC00]">Equipos activos</p>
            <p className="text-lg font-bold text-white">{equiposActivos.length}</p>
          </div>
          <div className="rounded-xl border border-[#FFCC00]/35 bg-black/30 px-3 py-2 backdrop-blur-sm">
            <p className="text-[10px] uppercase tracking-wider text-[#FFCC00]">Movimientos</p>
            <p className="text-lg font-bold text-white">{movimientosTotal}</p>
          </div>
        </div>
      </section>

      <section className="ej-card relative z-40 mt-4 overflow-visible rounded-2xl p-3 sm:p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Navegación</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setActiveView("personal");
              setShowConfigViews(false);
            }}
            className={`${viewButtonClass("personal")} group relative flex-1 overflow-hidden transition-all`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Personal</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("hoja_matrix");
              setShowConfigViews(false);
            }}
            className={`${viewButtonClass("hoja_matrix")} group relative flex-1 overflow-hidden transition-all`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span>Hoja Matriz</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("personal_nuevo");
              setShowConfigViews(false);
            }}
            disabled={!canWrite}
            className={`${viewButtonClass("personal_nuevo")} group relative flex-1 overflow-hidden transition-all disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Alta Personal</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("formularios");
              setShowConfigViews(false);
            }}
            className={`${viewButtonClass("formularios")} group relative flex-1 overflow-hidden transition-all`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m-9 12h12a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Formularios</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("tallas_resumen");
              setShowConfigViews(false);
            }}
            className={`${viewButtonClass("tallas_resumen")} group relative flex-1 overflow-hidden transition-all`}
          >
            <div className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline">Resumen Tallas</span>
              <span className="sm:hidden">Tallas</span>
            </div>
          </button>
          <div ref={configMenuRef} className="relative z-50 flex-1">
            <button
              type="button"
              onClick={() => setShowConfigViews((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={showConfigViews}
              aria-controls="menu-configuracion"
              className={`
                group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all
                ${
                  isConfigView || showConfigViews
                    ? "ej-view-active"
                    : "ej-view-idle"
                }
              `}
            >
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Configuración</span>
              <svg className={`h-3 w-3 transition-transform ${showConfigViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showConfigViews ? (
              <div
                id="menu-configuracion"
                role="menu"
                className="absolute right-0 z-[60] mt-2 w-full min-w-[290px] rounded-xl border border-stone-300 bg-white p-2 shadow-xl sm:w-[360px]"
              >
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de configuracion</p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button type="button" onClick={() => selectConfigView("grados")} className={configOptionClass("grados")}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    Registrar Grados
                  </button>
                  <button type="button" onClick={() => selectConfigView("baterias")} className={configOptionClass("baterias")}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Registrar Baterías
                  </button>
                  <button type="button" onClick={() => selectConfigView("equipos")} className={configOptionClass("equipos")}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Registrar Equipos
                  </button>
                  {isAdmin ? (
                    <>
                      <button type="button" onClick={() => selectConfigView("firmas")} className={configOptionClass("firmas")}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10 0V6a3 3 0 10-6 0v2m6 0H7" />
                        </svg>
                        Firmas institucionales
                      </button>
                      <button type="button" onClick={() => selectConfigView("usuarios")} className={configOptionClass("usuarios")}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Usuarios
                      </button>
                      <button type="button" onClick={() => selectConfigView("auditoria")} className={configOptionClass("auditoria")}>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10v-3M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Auditoria detallada
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

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
          equipos={equipos}
          newEquipo={newEquipo}
          editEquipoId={editEquipoId}
          editEquipo={editEquipo}
          equiposActivos={equiposActivos}
          equiposInactivos={equiposInactivos}
          equiposActivosEnPantalla={equiposActivosEnPantalla}
          draggedEquipoId={draggedEquipoId}
          usuarios={usuarios}
          newUsername={newUsername}
          newPassword={newPassword}
          newPasswordConfirm={newPasswordConfirm}
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
          onStartEquipoDrag={() => {}}
          renderEquipoCard={renderEquipoCard}
          onNewUsernameChange={setNewUsername}
          onNewPasswordChange={setNewPassword}
          onNewPasswordConfirmChange={setNewPasswordConfirm}
          onNewRoleChange={setNewRole}
          onCreateUsuario={(event) => void createUsuario(event)}
          onChangeUsername={(usuario) => void changeUsername(usuario)}
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

      {activeView === "personal" ? (
        <section className="ej-card mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Personal</h2>
              <p className="mt-1 text-xs text-stone-600">Orden: Grado del Personal, Apellidos y Nombres.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printAllDeliverySheets}
                disabled={personal.length === 0}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Imprimir todas las hojas
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("personal_nuevo");
                }}
                disabled={!canWrite}
                className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Registrar nuevo
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={searchCedula}
              onChange={(event) => setSearchCedula(event.target.value)}
              placeholder="Buscar por cedula"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={searchApellidos}
              onChange={(event) => setSearchApellidos(event.target.value)}
              placeholder="Buscar por apellidos"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              value={searchNombres}
              onChange={(event) => setSearchNombres(event.target.value)}
              placeholder="Buscar por nombres"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <select
              value={bateriaFilter}
              onChange={(event) => setBateriaFilter(event.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="ALL">Todas las baterias</option>
              <option value="NONE">Sin bateria</option>
              {baterias.map((bateria) => (
                <option key={bateria.bateriaId} value={String(bateria.bateriaId)}>
                  {bateria.nombre}
                </option>
              ))}
            </select>
          </div>
          {hasPersonalFilters ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  setSearchCedula("");
                  setSearchNombres("");
                  setSearchApellidos("");
                  setBateriaFilter("ALL");
                }}
                className="rounded bg-stone-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Limpiar filtros
              </button>
            </div>
          ) : null}

          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="personas"
            onPageChange={setPersonalPage}
            onPageSizeChange={setPersonalPageSize}
          />

          <div className="mt-3 space-y-3 md:hidden">
            {personalFiltradoPaginado.map((persona) => {
              const tallas = tallasMap(persona.tallas);
              const ciValida = isValidUruguayanCi(persona.ci);
              const tallasOpen = expandedTallasByCi[persona.ci] === true;
              const editing = editPersonalCi === persona.ci;
              return (
                <article
                  key={persona.ci}
                  className={`rounded-xl border p-3 ${ciValida ? "border-stone-200 bg-stone-50/80" : "border-red-300 bg-red-50/70"}`}
                >
                  <p className={`text-xs font-mono ${ciValida ? "text-stone-600" : "font-semibold text-red-700"}`}>
                    {formatUruguayanCi(persona.ci)}
                    {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                  </p>
                  <p className="mt-2 text-sm font-bold text-stone-900">{persona.rango.nombreCompleto}</p>
                  <p className="mt-2 text-sm text-stone-900">
                    <span className="font-semibold">Apellidos:</span> {apellidosLabel(persona)}
                  </p>
                  <p className="text-sm text-stone-900">
                    <span className="font-semibold">Nombres:</span> {nombresLabel(persona)}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">{persona.bateria?.nombre ?? "Sin bateria"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SmallActionButton
                      text={editing ? "Cancelar" : "Editar"}
                      tone={editing ? "neutral" : "edit"}
                      onClick={() => {
                        if (editing) {
                          setEditPersonalCi(null);
                          setEditPersonal(EMPTY_PERSONAL_FORM);
                          return;
                        }
                        startEditPersonal(persona);
                      }}
                    />
                    <SmallActionButton text="Borrar" tone="delete" onClick={() => void deletePersonal(persona.ci)} />
                    <button
                      type="button"
                      onClick={() => toggleTallas(persona.ci)}
                      className="rounded bg-stone-600 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-stone-700 hover:shadow-md active:scale-95"
                    >
                      {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRegistro(persona.ci, "ENTREGA")}
                      className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-emerald-800 hover:shadow-md active:scale-95"
                    >
                      Entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => openRegistro(persona.ci, "DEVOLUCION")}
                      className="rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-amber-800 hover:shadow-md active:scale-95"
                    >
                      Devolucion
                    </button>
                    <button
                      type="button"
                      onClick={() => void openPersonalObservacion(persona)}
                      className="rounded bg-teal-700 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-teal-800 hover:shadow-md active:scale-95"
                    >
                      Observacion
                    </button>
                    <button
                      type="button"
                      onClick={() => void openRegistroViewer(persona)}
                      className="rounded bg-sky-700 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-sky-800 hover:shadow-md active:scale-95"
                    >
                      Ver movimientos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView("hoja-de-entrega");
                        setFichaViewingCi(persona.ci);
                      }}
                      className="rounded bg-indigo-700 px-2 py-1 text-xs font-medium text-white transition-all duration-200 hover:bg-indigo-800 hover:shadow-md active:scale-95"
                    >
                      Hoja de Entrega
                    </button>
                  </div>
                  {tallasOpen ? (
                    <div className="mt-2 rounded-lg border border-stone-200 bg-white p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {tallasEntries(tallas).map((entry) => (
                          <div key={entry.key} className="rounded-md border border-stone-200 bg-stone-50 px-2 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                            <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {editing ? <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">{renderInlineEditForm(persona.ci)}</div> : null}
                </article>
              );
            })}
            {personalFiltrado.length === 0 ? <p className="text-sm text-stone-500">Sin resultados con los filtros actuales.</p> : null}
          </div>

          <div className="mt-3 md:hidden">
            <PaginationControls
              page={personalPage}
              pageSize={personalPageSize}
              totalItems={personalFiltrado.length}
              itemLabel="personas"
              onPageChange={setPersonalPage}
              onPageSizeChange={setPersonalPageSize}
            />
          </div>

          <div className="mt-3 hidden md:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="w-[11%] px-3 py-2">CI</th>
                  <th className="w-[15%] px-3 py-2">Grado del Personal</th>
                  <th className="w-[18%] px-3 py-2">Apellidos</th>
                  <th className="w-[18%] px-3 py-2">Nombres</th>
                  <th className="w-[13%] px-3 py-2">Bateria</th>
                  <th className="w-[9%] px-3 py-2">Detalles</th>
                  <th className="w-[16%] px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-300">
                {personalFiltradoPaginado.map((persona, index) => {
                  const tallas = tallasMap(persona.tallas);
                  const ciValida = isValidUruguayanCi(persona.ci);
                  const tallasOpen = expandedTallasByCi[persona.ci] === true;
                  const editing = editPersonalCi === persona.ci;
                  const isEven = index % 2 === 0;
                  return (
                    <Fragment key={persona.ci}>
                      <tr className={!ciValida ? "bg-red-50/60" : isEven ? "bg-white" : "bg-stone-100"}>
                        <td className={`px-3 py-2 font-mono text-xs ${ciValida ? "text-stone-700" : "font-bold text-red-700"}`}>
                          <div>
                            {formatUruguayanCi(persona.ci)}
                            {!ciValida ? <span className="ml-1 text-red-700">(con error)</span> : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-stone-900">
                          <span className="font-bold">{persona.rango.nombreCompleto}</span>
                        </td>
                        <td className="px-3 py-2 text-stone-900">{apellidosLabel(persona)}</td>
                        <td className="px-3 py-2 text-stone-900">{nombresLabel(persona)}</td>
                        <td className="px-3 py-2 text-stone-700">{persona.bateria?.nombre ?? "Sin bateria"}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleTallas(persona.ci)}
                            className="w-full rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 transition-all duration-200 hover:bg-stone-50 hover:border-stone-400 hover:shadow-sm active:scale-95"
                          >
                            {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                          </button>
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="grid grid-cols-2 gap-1.5">
                            <SmallActionButton
                              text={editing ? "Cancelar" : "Editar"}
                              tone={editing ? "neutral" : "edit"}
                              className="w-full text-[11px] leading-tight"
                              onClick={() => {
                                if (editing) {
                                  setEditPersonalCi(null);
                                  setEditPersonal(EMPTY_PERSONAL_FORM);
                                  return;
                                }
                                startEditPersonal(persona);
                              }}
                            />
                            <SmallActionButton
                              text="Borrar"
                              tone="delete"
                              className="w-full text-[11px] leading-tight"
                              onClick={() => void deletePersonal(persona.ci)}
                            />
                            <button
                              type="button"
                              onClick={() => openRegistro(persona.ci, "ENTREGA")}
                              className="w-full rounded bg-emerald-700 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-all duration-200 hover:bg-emerald-800 hover:shadow-md active:scale-95"
                            >
                              Entrega
                            </button>
                            <button
                              type="button"
                              onClick={() => openRegistro(persona.ci, "DEVOLUCION")}
                              className="w-full rounded bg-amber-700 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-all duration-200 hover:bg-amber-800 hover:shadow-md active:scale-95"
                            >
                              Devolucion
                            </button>
                            <button
                              type="button"
                              onClick={() => void openPersonalObservacion(persona)}
                              className="w-full rounded bg-teal-700 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-all duration-200 hover:bg-teal-800 hover:shadow-md active:scale-95"
                            >
                              Observacion
                            </button>
                            <button
                              type="button"
                              onClick={() => void openRegistroViewer(persona)}
                              className="w-full rounded bg-sky-700 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-all duration-200 hover:bg-sky-800 hover:shadow-md active:scale-95"
                            >
                              Ver movimientos
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView("hoja-de-entrega");
                                setFichaViewingCi(persona.ci);
                              }}
                              className="col-span-2 w-full rounded bg-indigo-700 px-2 py-1 text-[11px] font-medium leading-tight text-white transition-all duration-200 hover:bg-indigo-800 hover:shadow-md active:scale-95"
                              >
                              Hoja de Entrega
                            </button>
                          </div>
                        </td>
                      </tr>
                      {tallasOpen ? (
                        <tr className="bg-stone-50/80">
                          <td colSpan={7} className="px-3 py-2">
                            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
                              {tallasEntries(tallas).map((entry) => (
                                <div key={entry.key} className="rounded-md border border-stone-200 bg-white px-2 py-2">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                                  <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                      {editing ? (
                        <tr className="bg-white">
                          <td colSpan={7} className="px-3 py-3">
                            {renderInlineEditForm(persona.ci)}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {personalFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-sm text-stone-500">
                      Sin resultados con los filtros actuales.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={personalPage}
            pageSize={personalPageSize}
            totalItems={personalFiltrado.length}
            itemLabel="personas"
            onPageChange={setPersonalPage}
            onPageSizeChange={setPersonalPageSize}
          />
        </section>
      ) : null}

      {activeView === "hoja_matrix" ? (
        <HojaMatrixView
          data={hojaMatrixData}
          loading={hojaMatrixLoading}
          error={hojaMatrixError}
          onReload={loadHojaMatrix}
        />
      ) : null}

      {activeView === "formularios" ? (
        <section className="mt-6">
          <article className="ej-card overflow-hidden rounded-3xl p-0">
            <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_55%,#fef3c7_100%)] px-5 py-5 sm:px-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Proxima vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">Formularios</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Este espacio queda reservado para futuros formularios operativos y administrativos.
              </p>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 p-5">
                <p className="text-sm font-semibold text-stone-900">Modulo en preparacion</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Cuando se implemente, aca podras centralizar formularios especiales sin mezclarlos con personal,
                  equipos o configuracion.
                </p>
              </div>

              <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Pendiente</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">Vista reservada para desarrollo futuro</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  El boton ya forma parte de la navegacion de la SPA. La logica funcional se puede agregar despues sin
                  volver a tocar la estructura principal.
                </p>
              </aside>
            </div>
          </article>
        </section>
      ) : null}

      {activeView === "tallas_resumen" ? (
        <TallasResumenView personal={personal} baterias={baterias} />
      ) : null}

      {showChangePassword ? (
        <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3" onClick={() => setShowChangePassword(false)}>
          <article
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-stone-900">Cambiar contraseña</h3>
            <p className="mt-1 text-xs text-stone-600">Ingresa tu contraseña actual y la nueva contraseña.</p>

            <div className="mt-3 space-y-2">
              <input
                value={changeCurrentPassword}
                onChange={(event) => setChangeCurrentPassword(event.target.value)}
                placeholder="Contraseña actual"
                type="password"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />

              <input
                value={changeNewPassword}
                onChange={(event) => setChangeNewPassword(event.target.value)}
                placeholder="Nueva contraseña"
                type="password"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={changeConfirmPassword}
                onChange={(event) => setChangeConfirmPassword(event.target.value)}
                placeholder="Confirmar contraseña"
                type="password"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowChangePassword(false)}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={changeLoading}
                onClick={() => void submitChangePassword()}
                className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {changeLoading ? "Procesando..." : "Guardar"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {userRoleDialog ? (
        <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3" onClick={closeUserRoleDialog}>
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-role-dialog-title"
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="user-role-dialog-title" className="text-base font-semibold text-stone-900">
              Cambiar rol de usuario
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {`Usuario: ${userRoleDialog.username}`}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {`Rol actual: ${roleLabel(userRoleDialog.currentRole)}`}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((role) => {
                const selected = userRoleDialog.nextRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() =>
                      setUserRoleDialog((current) => (current ? { ...current, nextRole: role } : current))
                    }
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-stone-900 bg-stone-900 text-white"
                        : "border-stone-300 bg-white text-stone-800 hover:border-stone-500"
                    }`}
                  >
                    <p className="text-sm font-semibold">{roleLabel(role)}</p>
                    <p className={`mt-1 text-xs ${selected ? "text-stone-200" : "text-stone-500"}`}>
                      {roleDescription(role)}
                    </p>
                    <p className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${selected ? "text-stone-300" : "text-stone-400"}`}>
                      {roleScope(role)}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeUserRoleDialog}
                disabled={userRoleSaving}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitUserRoleChange()}
                disabled={userRoleSaving || userRoleDialog.nextRole === userRoleDialog.currentRole}
                className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {userRoleSaving ? "Guardando..." : "Guardar rol"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {userPasswordDialog ? (
        <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3" onClick={closeUserPasswordDialog}>
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-password-dialog-title"
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="user-password-dialog-title" className="text-base font-semibold text-stone-900">
              Cambiar contraseña de usuario
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              {`Usuario: ${userPasswordDialog.username}`}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Define una nueva contraseña para la cuenta seleccionada.
            </p>

            <div className="mt-4 space-y-2">
              <input
                value={userPasswordDialog.newPassword}
                onChange={(event) =>
                  setUserPasswordDialog((current) =>
                    current ? { ...current, newPassword: event.target.value } : current
                  )
                }
                placeholder="Nueva contraseña"
                type="password"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={userPasswordDialog.confirmPassword}
                onChange={(event) =>
                  setUserPasswordDialog((current) =>
                    current ? { ...current, confirmPassword: event.target.value } : current
                  )
                }
                placeholder="Confirmar nueva contraseña"
                type="password"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeUserPasswordDialog}
                disabled={userPasswordSaving}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitUserPasswordChange()}
                disabled={
                  userPasswordSaving ||
                  userPasswordDialog.newPassword.trim() === "" ||
                  userPasswordDialog.confirmPassword.trim() === ""
                }
                className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {userPasswordSaving ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {usernameDialog ? (
        <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3" onClick={closeUsernameDialog}>
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-dialog-title"
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="username-dialog-title" className="text-base font-semibold text-stone-900">
              {usernameDialog.title}
            </h3>
            <p className="mt-1 text-sm text-stone-600">{usernameDialog.description}</p>

            <div className="mt-4 space-y-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-700">Usuario</span>
                <input
                  value={usernameDialog.username}
                  onChange={(event) =>
                    setUsernameDialog((current) =>
                      current ? { ...current, username: event.target.value } : current,
                    )
                  }
                  placeholder="Nombre de usuario"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeUsernameDialog}
                disabled={usernameSaving}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitUsernameChange()}
                disabled={usernameSaving || usernameDialog.username.trim() === ""}
                className="rounded bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {usernameSaving ? "Guardando..." : "Guardar usuario"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {confirmDialog ? (
        <section className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-3" onClick={closeConfirmDialog}>
          <article
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="w-full max-w-md rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-stone-900">
              {confirmDialog.title}
            </h3>
            <p className="mt-2 text-sm text-stone-700">{confirmDialog.message}</p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmDialog}
                disabled={confirmDialogBusy}
                className="rounded border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => void confirmDialogAccept()}
                disabled={confirmDialogBusy}
                className={`rounded px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  confirmDialog.tone === "danger" ? "bg-rose-700 hover:bg-rose-800" : "bg-stone-700 hover:bg-stone-800"
                }`}
              >
                {confirmDialogBusy ? "Procesando..." : confirmDialog.confirmText}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {registroViewer ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-3">
          <article className="w-full max-w-3xl rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">Visualizador de Entregas / Devoluciones</h3>
                <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(registroViewer.ci)}`}</p>
                <p className="text-xs font-medium text-stone-700">{`Personal: ${registroViewer.nombre}`}</p>
              </div>
              <button
                type="button"
                onClick={() => setRegistroViewer(null)}
                className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 max-h-[60vh] space-y-2 overflow-auto pr-1">
              {registroViewer.loading ? <p className="text-sm text-stone-600">Cargando movimientos...</p> : null}
              {!registroViewer.loading && registroViewer.error ? (
                <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{registroViewer.error}</p>
              ) : null}
              {!registroViewer.loading && !registroViewer.error && registroViewerRows.length === 0 ? (
                <p className="text-sm text-stone-600">No hay movimientos registrados para esta persona.</p>
              ) : null}
              {!registroViewer.loading && !registroViewer.error
                  ? registroViewerRowsPaginados.map((registro) => (
                      <div key={registro.registroId} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-stone-900">{new Date(registro.fecha).toLocaleDateString("es-UY")}</p>
                          <div className="flex items-center gap-2">
                            {canWrite && registro.tipo !== "AJUSTE" ? (
                              <button
                                type="button"
                                onClick={() => rectifyRegistro(registro)}
                                className="rounded bg-sky-700 px-2 py-1 text-[11px] font-semibold text-white"
                              >
                                Rectificar
                              </button>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                registro.tipo === "ENTREGA"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : registro.tipo === "DEVOLUCION"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-sky-100 text-sky-800"
                              }`}
                            >
                              {registro.tipo}
                            </span>
                          </div>
                        </div>
                        {registro.auditoria ? (
                          <p className="mt-1 text-xs text-stone-700">
                            {`${registro.auditoria.accion === "UPDATE" ? "Rectificado por" : "Registrado por"}: ${
                              registro.auditoria.usuario?.username ?? "Sistema"
                            } (${roleLabel(registro.auditoria.usuario?.rol ?? null)}) - Auditoria BD #${registro.auditoria.auditoriaId}`}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-stone-500">Sin referencia de auditoria para este movimiento.</p>
                        )}
                      {registro.comentarios ? <p className="mt-1 text-xs text-stone-700">{registro.comentarios}</p> : null}
                      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {registro.items.map((item) => (
                          <p key={`${registro.registroId}-${item.itemId}`} className="text-xs text-stone-700">
                            <span className="font-semibold">{item.cantidad}x</span> {item.nombre}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))
                : null}
            </div>
            {!registroViewer.loading && !registroViewer.error && registroViewerRows.length > 0 ? (
              <PaginationControls
                page={registroViewerPage}
                pageSize={registroViewerPageSize}
                totalItems={registroViewerRows.length}
                itemLabel="movimientos"
                onPageChange={setRegistroViewerPage}
                onPageSizeChange={setRegistroViewerPageSize}
                className="mt-3"
              />
            ) : null}
          </article>
        </section>
      ) : null}

      {registroDraft ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-3">
          <article className="w-full max-w-2xl rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {registroDraft.modo === "rectificar"
                    ? registroDraft.tipo === "ENTREGA"
                      ? "Rectificar Entrega"
                      : "Rectificar Devolucion"
                    : registroDraft.tipo === "ENTREGA"
                      ? "Registrar Entrega"
                      : "Registrar Devolucion"}
                </h3>
                <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(registroDraft.ci)}`}</p>
                {registroDraft.modo === "rectificar" && registroDraft.registroId ? (
                  <p className="text-xs text-stone-600">{`Registro #${registroDraft.registroId}`}</p>
                ) : null}
                {personaRegistro ? (
                  <p className="text-xs font-medium text-stone-700">{`Personal: ${apellidosLabel(personaRegistro)}, ${nombresLabel(personaRegistro)}`}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setRegistroDraft(null)}
                disabled={registroSaving}
                className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            {registroSaving ? (
              <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                Actualizando movimiento...
              </p>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-stone-700">
                Fecha
                <input
                  type="date"
                  max={maxFechaIngreso}
                  value={registroDraft.fecha}
                  disabled={registroSaving}
                  onChange={(event) => setRegistroDraft((prev) => (prev ? { ...prev, fecha: event.target.value } : prev))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Comentarios (opcional)
                <input
                  value={registroDraft.comentarios}
                  disabled={registroSaving}
                  onChange={(event) => setRegistroDraft((prev) => (prev ? { ...prev, comentarios: event.target.value } : prev))}
                  placeholder="Detalle breve"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos del movimiento</p>
              {registroDraft.items.map((item, index) => (
                <div key={`reg-item-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <select
                    value={item.itemId}
                    disabled={registroSaving}
                    onChange={(event) => updateRegistroItem(index, "itemId", event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar equipo</option>
                    {equiposOrdenados
                      .filter((catalogItem) => {
                        if (!catalogItem.activo && catalogItem.itemId !== item.itemId) return false;
                        if (catalogItem.itemId === item.itemId) return true;
                        return !registroDraft.items.some(
                          (selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId,
                        );
                      })
                      .map((catalogItem) => (
                        <option key={catalogItem.itemId} value={catalogItem.itemId}>
                          {catalogItem.nombre}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    disabled={registroSaving}
                    onChange={(event) => updateRegistroItem(index, "cantidad", event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRegistroItem(index)}
                    disabled={registroSaving || registroDraft.items.length <= 1}
                    className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={addRegistroItem}
                disabled={registroSaving}
                className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar equipo
              </button>
              <button
                type="button"
                onClick={() => void saveRegistro()}
                disabled={registroSaving}
                className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {registroSaving
                  ? registroDraft.modo === "rectificar"
                    ? "Guardando rectificacion..."
                    : "Guardando movimiento..."
                  : registroDraft.modo === "rectificar"
                    ? "Guardar rectificacion"
                    : "Guardar movimiento"}
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {personalObservacionDraft ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-3">
          <article className="w-full max-w-2xl rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {personalObservacionDraft.observacionId ? "Editar Observacion" : "Registrar Observacion"}
                </h3>
                <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(personalObservacionDraft.ci)}`}</p>
                <p className="text-xs font-medium text-stone-700">{`Personal: ${personalObservacionDraft.nombre}`}</p>
              </div>
              <button
                type="button"
                onClick={() => setPersonalObservacionDraft(null)}
                disabled={personalObservacionSaving}
                className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            {personalObservacionSaving || personalObservacionDraft.loading ? (
              <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                {personalObservacionSaving ? "Guardando observacion..." : "Cargando observaciones..."}
              </p>
            ) : null}

            {personalObservacionDraft.error ? (
              <p className="mt-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                {personalObservacionDraft.error}
              </p>
            ) : null}

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Observaciones registradas</p>
                  {personalObservacionDraft.observacionId ? (
                    <button
                      type="button"
                      onClick={resetPersonalObservacionForm}
                      disabled={personalObservacionSaving}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Nueva observacion
                    </button>
                  ) : null}
                </div>
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {!personalObservacionDraft.loading && personalObservacionDraft.observaciones.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm text-stone-500">
                      Sin observaciones registradas.
                    </div>
                  ) : null}
                  {personalObservacionDraft.observaciones.map((observacion) => (
                    <article key={observacion.observacionId} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-stone-700">
                            {new Date(observacion.fecha).toLocaleDateString("es-UY")}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-stone-900">{observacion.texto}</p>
                        </div>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <SmallActionButton
                            text="Editar"
                            tone="edit"
                            onClick={() => editPersonalObservacion(observacion)}
                          />
                          <SmallActionButton
                            text="Borrar"
                            tone="delete"
                            onClick={() => deletePersonalObservacion(observacion)}
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    {personalObservacionDraft.observacionId ? "Editar" : "Nueva"} observacion
                  </p>
                  {personalObservacionDraft.observacionId ? (
                    <button
                      type="button"
                      onClick={resetPersonalObservacionForm}
                      disabled={personalObservacionSaving}
                      className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancelar edicion
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 space-y-3">
                  <label className="block text-xs text-stone-700">
                    Fecha
                    <input
                      type="date"
                      max={maxFechaIngreso}
                      value={personalObservacionDraft.fecha}
                      disabled={personalObservacionSaving}
                      onChange={(event) =>
                        setPersonalObservacionDraft((prev) => (prev ? { ...prev, fecha: event.target.value } : prev))
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-xs text-stone-700">
                    Observacion
                    <textarea
                      rows={7}
                      value={personalObservacionDraft.texto}
                      disabled={personalObservacionSaving}
                      onChange={(event) =>
                        setPersonalObservacionDraft((prev) => (prev ? { ...prev, texto: event.target.value } : prev))
                      }
                      placeholder="Detalle asociado a la persona"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPersonalObservacionDraft(null)}
                    disabled={personalObservacionSaving}
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => void savePersonalObservacion()}
                    disabled={personalObservacionSaving}
                    className="rounded bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {personalObservacionSaving
                      ? "Guardando..."
                      : personalObservacionDraft.observacionId
                        ? "Guardar cambios"
                        : "Guardar observacion"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {activeView === "hoja-de-entrega" && fichaViewingCi ? (
        <HojaDeEntregaView ci={fichaViewingCi} onClose={() => setActiveView("personal")} />
      ) : null}

      {loading ? <p className="mt-4 text-xs text-stone-600">Actualizando informacion...</p> : null}
      
    </main>
  );
}

