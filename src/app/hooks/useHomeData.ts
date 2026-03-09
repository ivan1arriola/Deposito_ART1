"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { checkDbInitHandler, initializeDatabaseHandler } from "@/lib/handlers-auth";
import type {
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
import type { EquipoResumenData, HojaMatrixData, StockDashboardData } from "@/types/views";

type UseHomeDataOptions = {
  onStatusChange: (message: string) => void;
};

type LoadStockDataOptions = {
  includeHistorial?: boolean;
  includePrestamos?: boolean;
  limit?: number;
};

export function useHomeData({ onStatusChange }: UseHomeDataOptions) {
  const [loading, setLoading] = useState(true);
  const [initMessage, setInitMessage] = useState<{ type: "info" | "success"; text: string } | null>(null);
  const [showInitCredentials, setShowInitCredentials] = useState(false);
  const [initCredentials, setInitCredentials] = useState<{ username: string; password: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [rangos, setRangos] = useState<Rango[]>([]);
  const [rangosOficiales, setRangosOficiales] = useState<Rango[]>([]);
  const [rangosSuboficiales, setRangosSuboficiales] = useState<Rango[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
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

  const clearLoadedData = useCallback(() => {
    setRangos([]);
    setRangosOficiales([]);
    setRangosSuboficiales([]);
    setBaterias([]);
    setEquipos([]);
    setPersonal([]);
    setOficialesSuboficiales([]);
    setUsuarios([]);
    setAuditoria([]);
    setFirmaConfig(null);
    setFirmaConfigDraft({ encargadoRango: "", encargadoNombre: "", oficialRango: "", oficialNombre: "" });
    setFirmaConfigLoading(false);
    setFirmaConfigSaving(false);
    setFirmaConfigError(null);
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
  }, []);

  const loadData = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);

      try {
        const me = await api<{ user: CurrentUser }>("/api/auth/me");
        setCurrentUser(me.user);

        await api<DbStatus>("/api/db-status");

        const [
          rangosData,
          rangosOficialesData,
          rangosSuboficialesData,
          bateriasData,
          equiposData,
          personalData,
          oficialesSuboficialesData,
          movimientosSummary,
        ] = await Promise.all([
          api<Rango[]>("/api/rangos"),
          api<Rango[]>("/api/rangos?tipo=OFICIAL"),
          api<Rango[]>("/api/rangos?tipo=SUBOFICIAL"),
          api<Bateria[]>("/api/baterias"),
          api<Equipo[]>("/api/items"),
          api<Personal[]>("/api/personal"),
          api<OficialSuboficial[]>("/api/oficiales-suboficiales"),
          api<{ total: number }>("/api/registros?summary=1").catch(() => ({ total: 0 })),
        ]);

        setRangos(rangosData);
        setRangosOficiales(rangosOficialesData);
        setRangosSuboficiales(rangosSuboficialesData);
        setBaterias(bateriasData);
        setEquipos(equiposData);
        setPersonal(personalData);
        setOficialesSuboficiales(oficialesSuboficialesData);
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
                error: error instanceof Error ? error.message : "No se pudo cargar la configuración de firmas.",
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
        setEquipoResumenData(null);
        setEquipoResumenError(null);
        setStockData(null);
        setStockError(null);
        onStatusChange("Datos actualizados.");
      } catch (error: unknown) {
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
        setFirmaConfigLoading(false);
        setLoading(false);
      }
    },
    [clearLoadedData, onStatusChange],
  );

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

  const loadEquipoResumen = useCallback(async () => {
    setEquipoResumenLoading(true);
    setEquipoResumenError(null);
    try {
      const data = await api<EquipoResumenData>("/api/resumen-equipos");
      setEquipoResumenData(data);
    } catch (error: unknown) {
      setEquipoResumenError(error instanceof Error ? error.message : "No se pudo cargar el resumen de equipo.");
    } finally {
      setEquipoResumenLoading(false);
    }
  }, []);

  const loadStockData = useCallback(async (options: LoadStockDataOptions = {}) => {
    setStockLoading(true);
    setStockError(null);
    try {
      const params = new URLSearchParams();
      if (options.includeHistorial === false) params.set("includeHistorial", "0");
      if (options.includePrestamos === false) params.set("includePrestamos", "0");
      if (typeof options.limit === "number" && Number.isInteger(options.limit) && options.limit > 0) {
        params.set("limit", String(options.limit));
      }
      const query = params.toString();
      const url = query ? `/api/stock?${query}` : "/api/stock";
      const data = await api<StockDashboardData>(url);
      setStockData(data);
    } catch (error: unknown) {
      setStockError(error instanceof Error ? error.message : "No se pudo cargar el stock.");
    } finally {
      setStockLoading(false);
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
    loadHojaMatrix,
    loadEquipoResumen,
    loadStockData,
    clearLoadedData,
    setRangos,
    setRangosOficiales,
    setRangosSuboficiales,
    setBaterias,
    setEquipos,
    setPersonal,
    setOficialesSuboficiales,
    setUsuarios,
    setAuditoria,
    setFirmaConfig,
  };
}
