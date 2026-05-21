"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { checkDbInitHandler, initializeDatabaseHandler } from "@/lib/handlers-auth";
import type {
  Articulo,
  AuditoriaRecord,
  Bateria,
  CurrentUser,
  DbStatus,
  Equipo,
  FirmaConfig,
  OficialSuboficial,
  Personal,
  Rango,
  UsuarioAdmin,
} from "@/types/entities";
import type { EquipoResumenData, HojaMatrixData, MainView, StockDashboardData } from "@/types/views";

type UseHomeDataOptions = {
  onStatusChange: (message: string) => void;
  activeView: MainView;
};

type LoadStockDataOptions = {
  includeHistorial?: boolean;
  includePrestamos?: boolean;
  limit?: number;
};

type RequestKey = "core" | "admin" | "hojaMatrix" | "equipoResumen" | "stock";

const REQUEST_KEYS: RequestKey[] = ["core", "admin", "hojaMatrix", "equipoResumen", "stock"];
const ADMIN_VIEWS = new Set<MainView>(["firmas", "usuarios", "auditoria", "usuario_nuevo", "recordatorios"]);
const STOCK_VIEWS = new Set<MainView>([
  "stock",
  "stock_total",
  "stock_actual",
  "stock_alta",
  "stock_baja",
  "stock_historial",
  "stock_prestamos",
  "formularios",
  "prestamos_registrar",
  "prestamos_vigentes",
  "prestamos_historial",
]);

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

export function useHomeData({ onStatusChange, activeView }: UseHomeDataOptions) {
  const [loading, setLoading] = useState(true);
  const [initMessage, setInitMessage] = useState<{ type: "info" | "success"; text: string } | null>(null);
  const [showInitCredentials, setShowInitCredentials] = useState(false);
  const [initCredentials, setInitCredentials] = useState<{ username: string; password: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [rangos, setRangos] = useState<Rango[]>([]);
  const [rangosOficiales, setRangosOficiales] = useState<Rango[]>([]);
  const [rangosSuboficiales, setRangosSuboficiales] = useState<Rango[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [oficialesSuboficiales, setOficialesSuboficiales] = useState<OficialSuboficial[]>([]);
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
  const [hojaMatrixData, setHojaMatrixData] = useState<HojaMatrixData | null>(null);
  const [hojaMatrixLoading, setHojaMatrixLoading] = useState(false);
  const [hojaMatrixError, setHojaMatrixError] = useState<string | null>(null);
  const [equipoResumenData, setEquipoResumenData] = useState<EquipoResumenData | null>(null);
  const [equipoResumenLoading, setEquipoResumenLoading] = useState(false);
  const [equipoResumenError, setEquipoResumenError] = useState<string | null>(null);
  const [stockData, setStockData] = useState<StockDashboardData | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const requestControllersRef = useRef<Partial<Record<RequestKey, AbortController>>>({});
  const requestIdsRef = useRef<Record<RequestKey, number>>({
    core: 0,
    admin: 0,
    hojaMatrix: 0,
    equipoResumen: 0,
    stock: 0,
  });

  const beginRequest = useCallback((key: RequestKey) => {
    requestControllersRef.current[key]?.abort();
    const controller = new AbortController();
    requestControllersRef.current[key] = controller;
    const requestId = requestIdsRef.current[key] + 1;
    requestIdsRef.current[key] = requestId;
    return { requestId, signal: controller.signal };
  }, []);

  const isCurrentRequest = useCallback((key: RequestKey, requestId: number) => {
    return requestIdsRef.current[key] === requestId;
  }, []);

  const abortAllRequests = useCallback(() => {
    for (const key of REQUEST_KEYS) {
      requestControllersRef.current[key]?.abort();
      requestControllersRef.current[key] = undefined;
    }
  }, []);

  const resetAdminData = useCallback(() => {
    setUsuarios([]);
    setAuditoria([]);
    setFirmaConfig(null);
    setFirmaConfigDraft({ encargadoRango: "", encargadoNombre: "", oficialRango: "", oficialNombre: "" });
    setFirmaConfigLoading(false);
    setFirmaConfigSaving(false);
    setFirmaConfigError(null);
  }, []);

  const clearLoadedData = useCallback(() => {
    abortAllRequests();
    setRangos([]);
    setRangosOficiales([]);
    setRangosSuboficiales([]);
    setBaterias([]);
    setArticulos([]);
    setEquipos([]);
    setPersonal([]);
    setOficialesSuboficiales([]);
    resetAdminData();
    setMovimientosTotal(0);
    setHojaMatrixData(null);
    setHojaMatrixLoading(false);
    setHojaMatrixError(null);
    setEquipoResumenData(null);
    setEquipoResumenLoading(false);
    setEquipoResumenError(null);
    setStockData(null);
    setStockLoading(false);
    setStockError(null);
  }, [abortAllRequests, resetAdminData]);

  const loadData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      const { requestId, signal } = beginRequest("core");
      const requestInit: RequestInit = { signal };

      try {
        const me = await api<{ user: CurrentUser }>("/api/auth/me", requestInit);
        if (!isCurrentRequest("core", requestId)) return;
        setCurrentUser(me.user);

        if (me.user.accountType === "PERSONAL") {
          clearLoadedData();
          onStatusChange("Datos actualizados.");
          return;
        }

        await api<DbStatus>("/api/db-status", requestInit);
        if (!isCurrentRequest("core", requestId)) return;

        const [
          rangosData,
          rangosOficialesData,
          rangosSuboficialesData,
          bateriasData,
          articulosData,
          equiposData,
          personalData,
          oficialesSuboficialesData,
          movimientosSummary,
        ] = await Promise.all([
          api<Rango[]>("/api/rangos", requestInit),
          api<Rango[]>("/api/rangos?tipo=OFICIAL", requestInit),
          api<Rango[]>("/api/rangos?tipo=SUBOFICIAL", requestInit),
          api<Bateria[]>("/api/baterias", requestInit),
          api<Articulo[]>("/api/articulos", requestInit).catch(() => [] as Articulo[]),
          api<Equipo[]>("/api/items", requestInit),
          api<Personal[]>("/api/personal", requestInit),
          api<OficialSuboficial[]>("/api/oficiales-suboficiales", requestInit),
          api<{ total: number }>("/api/registros?summary=1", requestInit).catch(() => ({ total: 0 })),
        ]);

        if (!isCurrentRequest("core", requestId)) return;

        setRangos(rangosData);
        setRangosOficiales(rangosOficialesData);
        setRangosSuboficiales(rangosSuboficialesData);
        setBaterias(bateriasData);
        setArticulos(articulosData);
        setEquipos(equiposData);
        setPersonal(personalData);
        setOficialesSuboficiales(oficialesSuboficialesData);
        setMovimientosTotal(movimientosSummary.total);

        if (!ADMIN_VIEWS.has(activeView)) {
          resetAdminData();
        }

        setHojaMatrixData(null);
        setHojaMatrixError(null);
        setEquipoResumenData(null);
        setEquipoResumenError(null);
        setStockData(null);
        setStockError(null);
        onStatusChange("Datos actualizados.");
      } catch (error: unknown) {
        if (isAbortError(error)) return;
        const message = error instanceof Error ? error.message : "No se pudo cargar la información.";
        if (message === "No autenticado.") {
          setCurrentUser(null);
          clearLoadedData();
          onStatusChange("Ingresa tus credenciales.");
          return;
        }
        if (message.toLowerCase().includes("base de datos")) {
          clearLoadedData();
          onStatusChange(`Error de base de datos: ${message}`);
          return;
        }
        onStatusChange(message);
      } finally {
        if (isCurrentRequest("core", requestId)) {
          setLoading(false);
        }
      }
    },
    [activeView, beginRequest, clearLoadedData, isCurrentRequest, onStatusChange, resetAdminData],
  );

  const loadAdminData = useCallback(async () => {
    if (currentUser?.accountType !== "SISTEMA" || currentUser.rol !== "ADMIN") {
      resetAdminData();
      return;
    }

    setFirmaConfigLoading(true);
    setFirmaConfigError(null);
    const { requestId, signal } = beginRequest("admin");
    const requestInit: RequestInit = { signal };

    try {
      const [usuariosData, auditoriaData, firmaConfigResult] = await Promise.all([
        api<UsuarioAdmin[]>("/api/usuarios", requestInit),
        api<AuditoriaRecord[]>("/api/auditoria?limit=200", requestInit),
        api<FirmaConfig>("/api/firma-config", requestInit)
          .then((config) => ({ config, error: null as string | null }))
          .catch((error: unknown) => ({
            config: null,
            error: error instanceof Error ? error.message : "No se pudo cargar la configuración de firmas.",
          })),
      ]);

      if (!isCurrentRequest("admin", requestId)) return;

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
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      const message = error instanceof Error ? error.message : "No se pudieron cargar los datos administrativos.";
      setFirmaConfigError(message);
    } finally {
      if (isCurrentRequest("admin", requestId)) {
        setFirmaConfigLoading(false);
      }
    }
  }, [beginRequest, currentUser?.accountType, currentUser?.rol, isCurrentRequest, resetAdminData]);

  const loadHojaMatrix = useCallback(async () => {
    setHojaMatrixLoading(true);
    setHojaMatrixError(null);
    const { requestId, signal } = beginRequest("hojaMatrix");
    const requestInit: RequestInit = { signal };

    try {
      const data = await api<HojaMatrixData>("/api/hoja-matrix", requestInit);
      if (!isCurrentRequest("hojaMatrix", requestId)) return;
      setHojaMatrixData(data);
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (!isCurrentRequest("hojaMatrix", requestId)) return;
      setHojaMatrixError(error instanceof Error ? error.message : "No se pudo cargar la Hoja Matriz.");
    } finally {
      if (isCurrentRequest("hojaMatrix", requestId)) {
        setHojaMatrixLoading(false);
      }
    }
  }, [beginRequest, isCurrentRequest]);

  const loadEquipoResumen = useCallback(async () => {
    setEquipoResumenLoading(true);
    setEquipoResumenError(null);
    const { requestId, signal } = beginRequest("equipoResumen");
    const requestInit: RequestInit = { signal };

    try {
      const data = await api<EquipoResumenData>("/api/resumen-equipos", requestInit);
      if (!isCurrentRequest("equipoResumen", requestId)) return;
      setEquipoResumenData(data);
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (!isCurrentRequest("equipoResumen", requestId)) return;
      setEquipoResumenError(error instanceof Error ? error.message : "No se pudo cargar el resumen de equipo.");
    } finally {
      if (isCurrentRequest("equipoResumen", requestId)) {
        setEquipoResumenLoading(false);
      }
    }
  }, [beginRequest, isCurrentRequest]);

  const loadStockData = useCallback(async (options: LoadStockDataOptions = {}) => {
    setStockLoading(true);
    setStockError(null);
    const { requestId, signal } = beginRequest("stock");
    const requestInit: RequestInit = { signal };

    try {
      const params = new URLSearchParams();
      if (options.includeHistorial === false) params.set("includeHistorial", "0");
      if (options.includePrestamos === false) params.set("includePrestamos", "0");

      const fallbackLimit =
        typeof options.limit === "number"
          ? options.limit
          : options.includeHistorial
            ? 300
            : options.includePrestamos
              ? 250
              : undefined;

      if (typeof fallbackLimit === "number" && Number.isInteger(fallbackLimit) && fallbackLimit > 0) {
        params.set("limit", String(fallbackLimit));
      }

      const query = params.toString();
      const url = query ? `/api/stock?${query}` : "/api/stock";
      const data = await api<StockDashboardData>(url, requestInit);
      if (!isCurrentRequest("stock", requestId)) return;
      setStockData(data);
    } catch (error: unknown) {
      if (isAbortError(error)) return;
      if (!isCurrentRequest("stock", requestId)) return;
      setStockError(error instanceof Error ? error.message : "No se pudo cargar el stock.");
    } finally {
      if (isCurrentRequest("stock", requestId)) {
        setStockLoading(false);
      }
    }
  }, [beginRequest, isCurrentRequest]);

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
        // La base ya estaba inicializada o el chequeo no aplica.
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
    if (activeView !== "hoja_matrix") {
      requestControllersRef.current.hojaMatrix?.abort();
      requestControllersRef.current.hojaMatrix = undefined;
    }

    if (activeView !== "equipo_resumen") {
      requestControllersRef.current.equipoResumen?.abort();
      requestControllersRef.current.equipoResumen = undefined;
    }

    if (!STOCK_VIEWS.has(activeView)) {
      requestControllersRef.current.stock?.abort();
      requestControllersRef.current.stock = undefined;
    }

    if (!ADMIN_VIEWS.has(activeView)) {
      requestControllersRef.current.admin?.abort();
      requestControllersRef.current.admin = undefined;
    }
  }, [activeView]);

  useEffect(() => {
    return () => {
      abortAllRequests();
    };
  }, [abortAllRequests]);

  return {
    loading,
    setLoading,
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
    equipos,
    personal,
    oficialesSuboficiales,
    usuarios,
    auditoria,
    firmaConfig,
    firmaConfigDraft,
    setFirmaConfigDraft,
    firmaConfigLoading,
    firmaConfigSaving,
    setFirmaConfigSaving,
    firmaConfigError,
    setFirmaConfigError,
    movimientosTotal,
    hojaMatrixData,
    setHojaMatrixData,
    hojaMatrixLoading,
    hojaMatrixError,
    setHojaMatrixError,
    equipoResumenData,
    setEquipoResumenData,
    equipoResumenLoading,
    equipoResumenError,
    setEquipoResumenError,
    stockData,
    setStockData,
    stockLoading,
    stockError,
    setStockError,
    loadData,
    loadAdminData,
    loadHojaMatrix,
    loadEquipoResumen,
    loadStockData,
    clearLoadedData,
    setRangos,
    setRangosOficiales,
    setRangosSuboficiales,
    setBaterias,
    setArticulos,
    setEquipos,
    setPersonal,
    setOficialesSuboficiales,
    setUsuarios,
    setAuditoria,
    setFirmaConfig,
  };
}
