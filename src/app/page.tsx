"use client";

import {
  Fragment,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { formatUruguayanCi, isValidUruguayanCi, normalizeCi } from "@/lib/ci";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import {
  TALLA_KEYS,
  TALLA_LABELS,
  TALLA_OPTIONS,
  type TallaKey,
  normalizeTallaValue,
  isAllowedTallaValue,
} from "@/lib/tallas";

type Rango = { rangoId: number; abreviacion: string; nombreCompleto: string };
type Bateria = { bateriaId: number; nombre: string };
type Item = { itemId: string; nombre: string; activo: boolean; ordenPdf: number };
type Talla = { tallaTipo: { nombre: string }; tallaValor: string };
type Personal = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  fechaIngreso: string | null;
  rangoId: number;
  bateriaId: number | null;
  rango: Rango;
  bateria: Bateria | null;
  tallas: Talla[];
};

type PersonalForm = {
  ci: string;
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  fechaIngreso: string;
  rangoId: string;
  bateriaId: string;
  PARKA: string;
  CAMISACO: string;
  PANTALON: string;
  KEPI: string;
  CALZADO: string;
};

type ItemForm = {
  nombre: string;
  activo: boolean;
  ordenPdf: number;
};

type Role = "ADMIN" | "EDITOR" | "VIEWER";
type MainView = "personal" | "tallas_resumen" | "grados" | "baterias" | "items" | "admin";
type RegistroTipo = "ENTREGA" | "DEVOLUCION";
type RegistroViewTipo = RegistroTipo | "AJUSTE";

type RegistroDraftItem = {
  itemId: string;
  cantidad: string;
};

type RegistroDraft = {
  ci: string;
  tipo: RegistroTipo;
  fecha: string;
  comentarios: string;
  items: RegistroDraftItem[];
};

type RegistroView = {
  registroId: string;
  auditoria: {
    auditoriaId: string;
    createdAt: string;
    usuarioId: string | null;
    usuario: { usuarioId: string; username: string; rol: Role } | null;
    detalle: unknown;
  } | null;
  ci: string;
  fecha: string;
  tipo: RegistroViewTipo;
  comentarios: string | null;
  createdAt: string;
  items: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
  }>;
};

type RegistroViewerState = {
  ci: string;
  nombre: string;
  loading: boolean;
  error: string | null;
  registros: RegistroView[];
};

type CurrentUser = {
  usuarioId: string;
  username: string;
  rol: Role;
};

type UsuarioAdmin = {
  usuarioId: string;
  username: string;
  rol: Role;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
};

type AuditoriaRecord = {
  auditoriaId: string;
  usuarioId: string | null;
  usuario: { usuarioId: string; username: string; rol: Role } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  createdAt: string;
};

type DbStatus = {
  ok: true;
  database: string | null;
  dbUser: string | null;
  host: string | null;
};

const EMPTY_PERSONAL_FORM: PersonalForm = {
  ci: "",
  apellido1: "",
  apellido2: "",
  nombre1: "",
  nombre2: "",
  fechaIngreso: "",
  rangoId: "",
  bateriaId: "",
  PARKA: "",
  CAMISACO: "",
  PANTALON: "",
  KEPI: "",
  CALZADO: "",
};

const EMPTY_ITEM_FORM: ItemForm = {
  nombre: "",
  activo: true,
  ordenPdf: 9999,
};

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "VIEWER"];
type AuditFilter = "TODOS" | "MOVIMIENTOS" | "AUTENTICACION";
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VIEWER: "Lector",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvio una respuesta invalida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "Error en la operacion.";
    throw new Error(message || "Error en la operacion.");
  }

  if (data === null) {
    throw new Error("El servidor no devolvio datos. No se pudo completar la lectura.");
  }

  return data as T;
}

function tallasMap(tallas: Talla[]) {
  const base: Record<string, string> = {
    PARKA: "-",
    CAMISACO: "-",
    PANTALON: "-",
    KEPI: "-",
    CALZADO: "-",
  };

  for (const talla of tallas) {
    base[talla.tallaTipo.nombre] = talla.tallaValor;
  }

  return base;
}

function apellidosLabel(persona: Personal) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function nombresLabel(persona: Personal) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tallasEntries(tallas: Record<string, string>) {
  return TALLA_KEYS.map((key) => {
    const rawValue = tallas[key];
    const value = rawValue && rawValue !== "-" ? rawValue : "Sin dato";
    return { key, label: TALLA_LABELS[key], value };
  });
}

function moveIdInOrder(order: string[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function roleLabel(role: Role | null | undefined) {
  if (!role) return "Sin rol";
  return ROLE_LABELS[role] ?? role;
}

function rangoLabel(rango: Rango) {
  return `${rango.abreviacion} - ${rango.nombreCompleto}`;
}

function toDateInput(dateIso: string | null) {
  if (!dateIso) return "";
  return dateIso.slice(0, 10);
}

function getTodayDateInput() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toFormTallaValue(key: TallaKey, value: string) {
  if (value === "-" || !isAllowedTallaValue(key, value)) return "";
  return normalizeTallaValue(key, value) ?? "";
}

function personalPayload(form: PersonalForm, includeCi: boolean) {
  const tallas = TALLA_KEYS.reduce(
    (acc, key) => {
      acc[key] = normalizeTallaValue(key, form[key]) ?? "";
      return acc;
    },
    {} as Record<TallaKey, string>,
  );

  return {
    ...(includeCi ? { ci: form.ci.trim() } : {}),
    apellido1: form.apellido1.trim(),
    apellido2: form.apellido2.trim(),
    nombre1: form.nombre1.trim(),
    nombre2: form.nombre2.trim(),
    fechaIngreso: form.fechaIngreso || undefined,
    rangoId: Number(form.rangoId),
    bateriaId: form.bateriaId ? Number(form.bateriaId) : undefined,
    tallas,
  };
}

function toEditablePersonal(persona: Personal): PersonalForm {
  const tallas = tallasMap(persona.tallas);
  return {
    ci: persona.ci,
    apellido1: persona.apellido1,
    apellido2: persona.apellido2 ?? "",
    nombre1: persona.nombre1,
    nombre2: persona.nombre2 ?? "",
    fechaIngreso: toDateInput(persona.fechaIngreso),
    rangoId: String(persona.rangoId),
    bateriaId: persona.bateriaId ? String(persona.bateriaId) : "",
    PARKA: toFormTallaValue("PARKA", tallas.PARKA),
    CAMISACO: toFormTallaValue("CAMISACO", tallas.CAMISACO),
    PANTALON: toFormTallaValue("PANTALON", tallas.PANTALON),
    KEPI: toFormTallaValue("KEPI", tallas.KEPI),
    CALZADO: toFormTallaValue("CALZADO", tallas.CALZADO),
  };
}

function CatalogCard(props: {
  title: string;
  placeholder: string;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onCreate: () => void;
  createDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <article className="ej-card rounded-2xl p-4">
      <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">{props.title}</h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={props.newValue}
          onChange={(event) => props.onNewValueChange(event.target.value)}
          placeholder={props.placeholder}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={props.onCreate}
          disabled={props.createDisabled}
          className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Crear
        </button>
      </div>
      <div className="mt-3 space-y-2">{props.children}</div>
    </article>
  );
}

function SmallActionButton(props: {
  text: string;
  tone: "edit" | "delete" | "ok" | "neutral";
  onClick: () => void;
  className?: string;
}) {
  const color =
    props.tone === "edit"
      ? "ej-action-edit"
      : props.tone === "delete"
        ? "ej-action-delete"
        : props.tone === "ok"
          ? "ej-action-ok"
          : "ej-action-neutral";

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`ej-action-btn rounded px-2 py-1 text-center text-xs font-medium ${color} ${props.className ?? ""}`}
    >
      {props.text}
    </button>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Verificando sesion...");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [rangos, setRangos] = useState<Rango[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [auditoria, setAuditoria] = useState<AuditoriaRecord[]>([]);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("VIEWER");

  const [newRangoAbreviacion, setNewRangoAbreviacion] = useState("");
  const [newRangoNombreCompleto, setNewRangoNombreCompleto] = useState("");
  const [editRangoId, setEditRangoId] = useState<number | null>(null);
  const [editRangoAbreviacion, setEditRangoAbreviacion] = useState("");
  const [editRangoNombreCompleto, setEditRangoNombreCompleto] = useState("");

  const [newBateria, setNewBateria] = useState("");
  const [editBateriaId, setEditBateriaId] = useState<number | null>(null);
  const [editBateriaNombre, setEditBateriaNombre] = useState("");

  const [newItem, setNewItem] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<ItemForm>(EMPTY_ITEM_FORM);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOrderItemIds, setDragOrderItemIds] = useState<string[] | null>(null);
  const draggedItemIdRef = useRef<string | null>(null);
  const dragOrderItemIdsRef = useRef<string[] | null>(null);

  const [newPersonal, setNewPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [editPersonalCi, setEditPersonalCi] = useState<string | null>(null);
  const [editPersonal, setEditPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [ciSearch, setCiSearch] = useState("");
  const [bateriaFilter, setBateriaFilter] = useState<string>("ALL");
  const [expandedTallasByCi, setExpandedTallasByCi] = useState<Record<string, boolean>>({});
  const [registroDraft, setRegistroDraft] = useState<RegistroDraft | null>(null);
  const [registroViewer, setRegistroViewer] = useState<RegistroViewerState | null>(null);
  const [activeView, setActiveView] = useState<MainView>("personal");
  const [showConfigViews, setShowConfigViews] = useState(false);
  const [showCreatePersonalForm, setShowCreatePersonalForm] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>("TODOS");

  const isAdmin = currentUser?.rol === "ADMIN";
  const canWrite = currentUser?.rol === "ADMIN" || currentUser?.rol === "EDITOR";
  const canDelete = canWrite;
  const canRegisterPersonal = canWrite && rangos.length > 0;
  const inCatalogView = activeView === "grados" || activeView === "baterias" || activeView === "items";
  const ciLooksValid = newPersonal.ci.trim() === "" || isValidUruguayanCi(newPersonal.ci);
  const requiredPersonalFields = [
    newPersonal.ci.trim() !== "" && isValidUruguayanCi(newPersonal.ci),
    newPersonal.apellido1.trim() !== "",
    newPersonal.nombre1.trim() !== "",
    Number(newPersonal.rangoId) > 0,
  ];
  const requiredPersonalCompleted = requiredPersonalFields.filter(Boolean).length;
  const canSubmitPersonal = canRegisterPersonal && requiredPersonalCompleted === requiredPersonalFields.length;
  const maxFechaIngreso = getTodayDateInput();
  const itemsOrdenados = useMemo(
    () => [...items].sort((a, b) => a.ordenPdf - b.ordenPdf || a.nombre.localeCompare(b.nombre, "es")),
    [items],
  );
  const itemsActivos = useMemo(() => itemsOrdenados.filter((item) => item.activo), [itemsOrdenados]);
  const itemsInactivos = useMemo(() => itemsOrdenados.filter((item) => !item.activo), [itemsOrdenados]);
  const auditoriaFiltrada = useMemo(() => {
    if (auditFilter === "MOVIMIENTOS") {
      return auditoria.filter((log) => log.entidad === "REGISTRO");
    }
    if (auditFilter === "AUTENTICACION") {
      return auditoria.filter((log) => log.entidad === "AUTH");
    }
    return auditoria;
  }, [auditFilter, auditoria]);
  const itemsActivosEnPantalla = useMemo(() => {
    if (!dragOrderItemIds) return itemsActivos;
    const activeById = new Map(itemsActivos.map((item) => [item.itemId, item]));
    return dragOrderItemIds
      .map((itemId) => activeById.get(itemId))
      .filter((item): item is Item => item !== undefined);
  }, [itemsActivos, dragOrderItemIds]);
  const personalOrdenado = useMemo(() => [...personal].sort(comparePersonalByHierarchy), [personal]);
  const searchQuery = ciSearch.trim();
  const searchQueryDigits = normalizeCi(searchQuery);
  const searchQueryText = normalizeSearchTerm(searchQuery);
  const personalFiltrado = useMemo(() => {
    return personalOrdenado.filter((persona) => {
      const matchBateria =
        bateriaFilter === "ALL"
          ? true
          : bateriaFilter === "NONE"
            ? persona.bateriaId == null
            : persona.bateriaId === Number(bateriaFilter);

      if (!matchBateria) return false;
      if (!searchQueryText) return true;

      const ciMatch = searchQueryDigits !== "" && normalizeCi(persona.ci).includes(searchQueryDigits);
      const nombreApellido = normalizeSearchTerm(
        `${persona.nombre1} ${persona.nombre2 ?? ""} ${persona.apellido1} ${persona.apellido2 ?? ""}`,
      );
      const textMatch = nombreApellido.includes(searchQueryText);
      return ciMatch || textMatch;
    });
  }, [personalOrdenado, bateriaFilter, searchQueryDigits, searchQueryText]);
  const resumenTallasPorBateria = useMemo(() => {
    type ResumenTalla = { key: TallaKey; label: string; values: Array<{ talla: string; cantidad: number }>; sinDato: number };
    type ResumenBateria = { key: string; nombre: string; total: number; tallas: ResumenTalla[] };

    const bateriasConEtiqueta = [
      ...baterias
        .map((bateria) => ({ key: String(bateria.bateriaId), nombre: bateria.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
      { key: "NONE", nombre: "Sin bateria" },
    ];

    const personalPorBateria = new Map<string, Personal[]>();
    for (const bateria of bateriasConEtiqueta) {
      personalPorBateria.set(bateria.key, []);
    }

    for (const persona of personalOrdenado) {
      const key = persona.bateriaId == null ? "NONE" : String(persona.bateriaId);
      const bucket = personalPorBateria.get(key);
      if (bucket) {
        bucket.push(persona);
        continue;
      }
      personalPorBateria.set(key, [persona]);
    }

    const resumen: ResumenBateria[] = [];

    for (const bateria of bateriasConEtiqueta) {
      const personas = personalPorBateria.get(bateria.key) ?? [];
      const tallas: ResumenTalla[] = TALLA_KEYS.map((key) => {
        const counter = new Map<string, number>();

        for (const persona of personas) {
          const tallasPersona = tallasMap(persona.tallas);
          const raw = tallasPersona[key];
          const value = raw && raw !== "-" ? raw : "Sin dato";
          counter.set(value, (counter.get(value) ?? 0) + 1);
        }

        const values = Array.from(counter.entries())
          .map(([talla, cantidad]) => ({ talla, cantidad }))
          .sort((a, b) => {
            if (a.talla === "Sin dato") return 1;
            if (b.talla === "Sin dato") return -1;
            return a.talla.localeCompare(b.talla, "es", { sensitivity: "base", numeric: true });
          });

        return {
          key,
          label: TALLA_LABELS[key],
          values,
          sinDato: counter.get("Sin dato") ?? 0,
        };
      });

      resumen.push({
        key: bateria.key,
        nombre: bateria.nombre,
        total: personas.length,
        tallas,
      });
    }

    return resumen;
  }, [baterias, personalOrdenado]);
  const isConfigView = activeView === "grados" || activeView === "baterias" || activeView === "items" || activeView === "admin";
  const personaRegistro = useMemo(() => {
    if (!registroDraft) return null;
    return personal.find((persona) => persona.ci === registroDraft.ci) ?? null;
  }, [personal, registroDraft]);

  useEffect(() => {
    if (activeView === "admin" && !isAdmin) {
      setActiveView("personal");
    }
  }, [activeView, isAdmin]);

  useEffect(() => {
    if (activeView !== "personal" && showCreatePersonalForm) {
      setShowCreatePersonalForm(false);
    }
  }, [activeView, showCreatePersonalForm]);

  useEffect(() => {
    if (!dragOrderItemIds) return;
    const currentActiveIds = new Set(itemsActivos.map((item) => item.itemId));
    const dragStateIsValid =
      dragOrderItemIds.length === itemsActivos.length && dragOrderItemIds.every((itemId) => currentActiveIds.has(itemId));
    if (dragStateIsValid) return;
    setDraggedItemId(null);
    setDragOrderItemIds(null);
    draggedItemIdRef.current = null;
    dragOrderItemIdsRef.current = null;
  }, [dragOrderItemIds, itemsActivos]);

  function clearLoadedData() {
    setRangos([]);
    setBaterias([]);
    setItems([]);
    setPersonal([]);
    setUsuarios([]);
    setAuditoria([]);
    setEditPersonalCi(null);
    setEditPersonal(EMPTY_PERSONAL_FORM);
    setExpandedTallasByCi({});
    setRegistroDraft(null);
    setShowCreatePersonalForm(false);
    setDraggedItemId(null);
    setDragOrderItemIds(null);
    draggedItemIdRef.current = null;
    dragOrderItemIdsRef.current = null;
  }

  const loadData = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true);

    try {
      const me = await api<{ user: CurrentUser }>("/api/auth/me");
      setCurrentUser(me.user);

      await api<DbStatus>("/api/db-status");

      const [rangosData, bateriasData, itemsData, personalData] = await Promise.all([
        api<Rango[]>("/api/rangos"),
        api<Bateria[]>("/api/baterias"),
        api<Item[]>("/api/items"),
        api<Personal[]>("/api/personal"),
      ]);

      setRangos(rangosData);
      setBaterias(bateriasData);
      setItems(itemsData);
      setPersonal(personalData);

      if (me.user.rol === "ADMIN") {
        const [usuariosData, auditoriaData] = await Promise.all([
          api<UsuarioAdmin[]>("/api/usuarios"),
          api<AuditoriaRecord[]>("/api/auditoria?limit=200"),
        ]);
        setUsuarios(usuariosData);
        setAuditoria(auditoriaData);
      } else {
        setUsuarios([]);
        setAuditoria([]);
      }

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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [loadData]);

  async function createRango() {
    if (!isAdmin) {
      setStatus("Solo el administrador puede modificar grados.");
      return;
    }
    try {
      await api("/api/rangos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abreviacion: newRangoAbreviacion,
          nombreCompleto: newRangoNombreCompleto,
        }),
      });
      setNewRangoAbreviacion("");
      setNewRangoNombreCompleto("");
      setStatus("Grado del personal creado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear el grado del personal.");
    }
  }

  async function updateRango(rangoId: number) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede modificar grados.");
      return;
    }
    try {
      await api(`/api/rangos/${rangoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abreviacion: editRangoAbreviacion,
          nombreCompleto: editRangoNombreCompleto,
        }),
      });
      setEditRangoId(null);
      setEditRangoAbreviacion("");
      setEditRangoNombreCompleto("");
      setStatus("Grado del personal actualizado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el grado del personal.");
    }
  }

  async function deleteRango(rangoId: number) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede modificar grados.");
      return;
    }
    if (!window.confirm("Eliminar grado del personal?")) return;
    try {
      await api(`/api/rangos/${rangoId}`, { method: "DELETE" });
      setStatus("Grado del personal eliminado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el grado del personal.");
    }
  }

  async function createBateria() {
    if (!isAdmin) {
      setStatus("Solo el administrador puede registrar baterias.");
      return;
    }
    try {
      await api("/api/baterias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: newBateria }),
      });
      setNewBateria("");
      setStatus("Bateria creada.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear la bateria.");
    }
  }

  async function updateBateria(bateriaId: number) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }
    try {
      await api(`/api/baterias/${bateriaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editBateriaNombre }),
      });
      setEditBateriaId(null);
      setEditBateriaNombre("");
      setStatus("Bateria actualizada.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar la bateria.");
    }
  }

  async function deleteBateria(bateriaId: number) {
    if (!canDelete) {
      setStatus("No tienes permisos para eliminar.");
      return;
    }
    if (!window.confirm("Eliminar bateria?")) return;
    try {
      await api(`/api/baterias/${bateriaId}`, { method: "DELETE" });
      setStatus("Bateria eliminada.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar la bateria.");
    }
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) {
      setStatus("No tienes permisos para crear.");
      return;
    }

    try {
      await api("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newItem.nombre,
          activo: newItem.activo,
        }),
      });
      setNewItem(EMPTY_ITEM_FORM);
      setStatus("Item creado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear el item.");
    }
  }

  async function updateItem(itemId: string) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }
    try {
      await api(`/api/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editItem),
      });
      setEditItemId(null);
      setEditItem(EMPTY_ITEM_FORM);
      setStatus("Item actualizado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el item.");
    }
  }

  async function toggleItemActivo(item: Item) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }

    try {
      await api(`/api/items/${item.itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: item.nombre,
          activo: !item.activo,
          ordenPdf: item.ordenPdf,
        }),
      });
      setStatus(`Item ${!item.activo ? "activado" : "desactivado"}.`);
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el item.");
    }
  }

  const saveActiveItemsOrder = useCallback(
    async (orderedItemIds: string[]) => {
      if (!canWrite) {
        setStatus("No tienes permisos para editar.");
        return;
      }

      const itemById = new Map(itemsActivos.map((item) => [item.itemId, item]));
      const updates = orderedItemIds
        .map((itemId, idx) => {
          const item = itemById.get(itemId);
          if (!item) return null;
          const ordenPdf = (idx + 1) * 10;
          return item.ordenPdf === ordenPdf ? null : { item, ordenPdf };
        })
        .filter((entry): entry is { item: Item; ordenPdf: number } => entry !== null);

      if (updates.length === 0) return;

      try {
        await Promise.all(
          updates.map(({ item, ordenPdf }) =>
            api(`/api/items/${item.itemId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                nombre: item.nombre,
                activo: item.activo,
                ordenPdf,
              }),
            }),
          ),
        );
        setStatus("Orden de PDF actualizado.");
        await loadData();
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "No se pudo actualizar el orden de PDF.");
      }
    },
    [canWrite, itemsActivos, loadData],
  );

  function startItemDrag(itemId: string, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }

    event.preventDefault();
    const orderedIds = itemsActivos.map((item) => item.itemId);
    if (!orderedIds.includes(itemId)) return;

    setDraggedItemId(itemId);
    setDragOrderItemIds(orderedIds);
    draggedItemIdRef.current = itemId;
    dragOrderItemIdsRef.current = orderedIds;
  }

  useEffect(() => {
    if (!draggedItemId) return;

    const handlePointerMove = (event: PointerEvent) => {
      const target = document.elementFromPoint(event.clientX, event.clientY);
      if (!(target instanceof HTMLElement)) return;
      const targetCard = target.closest<HTMLElement>("[data-item-drag-id]");
      const targetItemId = targetCard?.dataset.itemDragId;
      const currentDraggedItemId = draggedItemIdRef.current;
      const currentOrder = dragOrderItemIdsRef.current;

      if (!targetItemId || !currentDraggedItemId || !currentOrder) return;

      const currentIndex = currentOrder.indexOf(currentDraggedItemId);
      const targetIndex = currentOrder.indexOf(targetItemId);
      if (currentIndex < 0 || targetIndex < 0 || currentIndex === targetIndex) return;

      const nextOrder = moveIdInOrder(currentOrder, currentIndex, targetIndex);
      dragOrderItemIdsRef.current = nextOrder;
      setDragOrderItemIds(nextOrder);
    };

    const finishDrag = () => {
      const finalOrder = dragOrderItemIdsRef.current;
      setDraggedItemId(null);
      setDragOrderItemIds(null);
      draggedItemIdRef.current = null;
      dragOrderItemIdsRef.current = null;

      if (finalOrder) {
        void saveActiveItemsOrder(finalOrder);
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
  }, [draggedItemId, saveActiveItemsOrder]);

  async function deleteItem(itemId: string) {
    if (!canDelete) {
      setStatus("No tienes permisos para eliminar.");
      return;
    }
    if (!window.confirm("Eliminar item?")) return;
    try {
      await api(`/api/items/${itemId}`, { method: "DELETE" });
      setStatus("Item eliminado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el item.");
    }
  }

  async function createPersonal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRegisterPersonal) {
      setStatus("No se puede registrar personal sin registrar Grados previamente.");
      return;
    }
    if (!isValidUruguayanCi(newPersonal.ci)) {
      setStatus("CI uruguaya invalida. Revisa digito verificador.");
      return;
    }

    try {
      await api("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personalPayload(newPersonal, true)),
      });
      setNewPersonal(EMPTY_PERSONAL_FORM);
      setShowCreatePersonalForm(false);
      setStatus("Personal creado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear el personal.");
    }
  }

  async function updatePersonal(ci: string) {
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
      return;
    }
    try {
      await api(`/api/personal/${encodeURIComponent(ci)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personalPayload(editPersonal, false)),
      });
      setEditPersonalCi(null);
      setEditPersonal(EMPTY_PERSONAL_FORM);
      setStatus("Personal actualizado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el personal.");
    }
  }

  async function deletePersonal(ci: string) {
    if (!canDelete) {
      setStatus("No tienes permisos para eliminar.");
      return;
    }
    if (!window.confirm("Eliminar personal?")) return;
    try {
      await api(`/api/personal/${encodeURIComponent(ci)}`, { method: "DELETE" });
      setStatus("Personal eliminado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el personal.");
    }
  }

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

  async function openRegistroViewer(persona: Personal) {
    const nombre = `${apellidosLabel(persona)}, ${nombresLabel(persona)}`;
    setRegistroViewer({
      ci: persona.ci,
      nombre,
      loading: true,
      error: null,
      registros: [],
    });

    try {
      const registros = await api<RegistroView[]>(`/api/registros?ci=${encodeURIComponent(persona.ci)}&limit=200`);
      setRegistroViewer({
        ci: persona.ci,
        nombre,
        loading: false,
        error: null,
        registros,
      });
    } catch (error: unknown) {
      setRegistroViewer({
        ci: persona.ci,
        nombre,
        loading: false,
        error: error instanceof Error ? error.message : "No se pudo cargar el historial.",
        registros: [],
      });
    }
  }

  function openRegistro(ci: string, tipo: RegistroTipo) {
    if (!canWrite) {
      setStatus("No tienes permisos para registrar movimientos.");
      return;
    }
    setRegistroDraft({
      ci,
      tipo,
      fecha: getTodayDateInput(),
      comentarios: "",
      items: [{ itemId: "", cantidad: "1" }],
    });
  }

  function updateRegistroItem(index: number, field: keyof RegistroDraftItem, value: string) {
    setRegistroDraft((prev) => {
      if (!prev) return prev;
      if (field === "itemId" && value !== "" && prev.items.some((item, itemIndex) => itemIndex !== index && item.itemId === value)) {
        setStatus("Ese item ya fue seleccionado en este movimiento.");
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
    if (!registroDraft) return;
    const payloadItems = registroDraft.items
      .map((item) => ({
        itemId: item.itemId.trim(),
        cantidad: Number(item.cantidad),
      }))
      .filter((item) => item.itemId !== "" && Number.isInteger(item.cantidad) && item.cantidad > 0);

    if (payloadItems.length === 0) {
      setStatus("Debes agregar al menos un item con cantidad valida.");
      return;
    }
    const uniqueItemIds = new Set(payloadItems.map((item) => item.itemId));
    if (uniqueItemIds.size !== payloadItems.length) {
      setStatus("No puedes repetir items en un mismo movimiento.");
      return;
    }

    try {
      await api("/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ci: registroDraft.ci,
          tipo: registroDraft.tipo,
          fecha: registroDraft.fecha,
          comentarios: registroDraft.comentarios.trim() || undefined,
          items: payloadItems,
        }),
      });
      setStatus(`${registroDraft.tipo === "ENTREGA" ? "Entrega" : "Devolucion"} registrada para ${registroDraft.ci}.`);
      setRegistroDraft(null);
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo registrar el movimiento.");
    }
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
              {TALLA_OPTIONS[key].map((option) => (
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

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setStatus("Iniciando sesion...");

    try {
      await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      setLoginPassword("");
      await loadData(true);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      setCurrentUser(null);
      clearLoadedData();
      setLoginPassword("");
      setActiveView("personal");
      setStatus("Sesion cerrada. Ingresa tus credenciales.");
    }
  }

  async function createUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      setStatus("Solo el administrador puede crear usuarios.");
      return;
    }
    try {
      await api("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          rol: newRole,
          activo: true,
        }),
      });
      setNewUsername("");
      setNewPassword("");
      setNewRole("VIEWER");
      setStatus("Usuario creado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    }
  }

  async function changeUserRole(usuarioId: string, currentRole: Role) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede cambiar roles.");
      return;
    }
    const nextRole = window.prompt("Nuevo rol (ADMIN/EDITOR/VIEWER)", currentRole);
    if (!nextRole) return;
    const normalized = nextRole.toUpperCase();
    if (!ROLE_OPTIONS.includes(normalized as Role)) {
      setStatus("Rol invalido.");
      return;
    }

    try {
      await api(`/api/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol: normalized }),
      });
      setStatus("Rol actualizado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el rol.");
    }
  }

  async function toggleUserActive(usuario: UsuarioAdmin) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede cambiar estado.");
      return;
    }
    try {
      await api(`/api/usuarios/${usuario.usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !usuario.activo }),
      });
      setStatus("Estado de usuario actualizado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar el usuario.");
    }
  }

  async function resetUserPassword(usuario: UsuarioAdmin) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede restablecer contrasenas.");
      return;
    }
    const password = window.prompt(`Nueva contrasena para ${usuario.username} (min 8 caracteres)`, "");
    if (!password) return;

    try {
      await api(`/api/usuarios/${usuario.usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setStatus("Contrasena actualizada.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar la contrasena.");
    }
  }

  async function deleteUsuario(usuario: UsuarioAdmin) {
    if (!isAdmin) {
      setStatus("Solo el administrador puede eliminar usuarios.");
      return;
    }
    if (!window.confirm(`Eliminar usuario ${usuario.username}?`)) return;

    try {
      await api(`/api/usuarios/${usuario.usuarioId}`, { method: "DELETE" });
      setStatus("Usuario eliminado.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo eliminar el usuario.");
    }
  }

  function viewButtonClass(view: MainView) {
    const selected = activeView === view;
    return selected
      ? "ej-view-active rounded-lg px-3 py-2 text-sm font-semibold"
      : "ej-view-idle rounded-lg px-3 py-2 text-sm font-semibold";
  }

  function selectConfigView(view: Extract<MainView, "grados" | "baterias" | "items" | "admin">) {
    setActiveView(view);
    setShowConfigViews(false);
  }

  function auditActionLabel(accion: string) {
    if (accion === "CREATE") return "Creo";
    if (accion === "UPDATE") return "Actualizo";
    if (accion === "DELETE") return "Elimino";
    if (accion === "LOGIN") return "Inicio sesion";
    if (accion === "LOGOUT") return "Cerro sesion";
    return accion;
  }

  function auditEntityLabel(entidad: string) {
    if (entidad === "AUTH") return "autenticacion";
    if (entidad === "REGISTRO") return "movimiento";
    if (entidad === "PERSONAL") return "personal";
    if (entidad === "USUARIO") return "usuario";
    if (entidad === "RANGO") return "grado";
    if (entidad === "BATERIA") return "bateria";
    if (entidad === "ITEM") return "item";
    return entidad.toLowerCase();
  }

  function renderAuditDetalle(detalle: unknown) {
    if (!detalle || typeof detalle !== "object" || Array.isArray(detalle)) return null;
    const info = detalle as Record<string, unknown>;
    const items = Array.isArray(info.items)
      ? info.items
          .filter((item) => item && typeof item === "object" && !Array.isArray(item))
          .map((item) => item as Record<string, unknown>)
      : [];

    const lines: string[] = [];
    if (typeof info.evento === "string") lines.push(`Evento: ${info.evento}`);
    if (typeof info.ci === "string") lines.push(`CI: ${formatUruguayanCi(info.ci)}`);
    if (typeof info.tipo === "string") lines.push(`Tipo: ${info.tipo}`);
    if (typeof info.fechaMovimiento === "string") lines.push(`Fecha movimiento: ${info.fechaMovimiento}`);
    if (typeof info.fecha === "string" && !("fechaMovimiento" in info)) lines.push(`Fecha: ${info.fecha}`);
    if (typeof info.comentarios === "string" && info.comentarios.trim() !== "") lines.push(`Comentarios: ${info.comentarios}`);
    if (typeof info.totalItems === "number") lines.push(`Items distintos: ${info.totalItems}`);
    if (typeof info.totalUnidades === "number") lines.push(`Unidades: ${info.totalUnidades}`);
    if (typeof info.ip === "string" && info.ip.trim() !== "") lines.push(`IP: ${info.ip}`);
    if (typeof info.userAgent === "string" && info.userAgent.trim() !== "") lines.push(`Navegador: ${info.userAgent}`);

    const hasPrimaryData = lines.length > 0 || items.length > 0;
    if (!hasPrimaryData) {
      return (
        <pre className="mt-2 max-h-24 overflow-auto rounded border border-stone-200 bg-white p-2 text-[11px] text-stone-700">
          {JSON.stringify(info, null, 2)}
        </pre>
      );
    }

    return (
      <div className="mt-2 space-y-1 rounded border border-stone-200 bg-white p-2">
        {lines.map((line) => (
          <p key={line} className="text-[11px] text-stone-700">
            {line}
          </p>
        ))}
        {items.length > 0 ? (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-stone-700">Detalle de items:</p>
            {items.map((item, index) => {
              const nombre = typeof item.nombre === "string" && item.nombre.trim() !== "" ? item.nombre : "Item";
              const cantidad = typeof item.cantidad === "number" ? item.cantidad : 0;
              const itemId = typeof item.itemId === "string" ? ` (ID ${item.itemId})` : "";
              return (
                <p key={`${nombre}-${index}`} className="text-[11px] text-stone-700">
                  {`${cantidad} x ${nombre}${itemId}`}
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  function renderItemCard(item: Item, options?: { draggableInActiveList?: boolean }) {
    const draggableInActiveList = options?.draggableInActiveList === true;
    const isDraggingThisItem = draggedItemId === item.itemId;

    return (
      <div
        key={item.itemId}
        data-item-drag-id={draggableInActiveList ? item.itemId : undefined}
        className={`rounded-lg bg-stone-100/80 p-2 ${isDraggingThisItem ? "ring-2 ring-lime-400/80" : ""}`}
      >
        {editItemId === item.itemId ? (
          <div className="space-y-2">
            <input
              value={editItem.nombre}
              onChange={(event) => setEditItem((prev) => ({ ...prev, nombre: event.target.value }))}
              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
            />
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-600">Orden PDF</span>
              <input
                type="number"
                min={1}
                step={1}
                value={editItem.ordenPdf}
                onChange={(event) => setEditItem((prev) => ({ ...prev, ordenPdf: Math.max(1, Number(event.target.value) || 1) }))}
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editItem.activo}
                  onChange={(event) => setEditItem((prev) => ({ ...prev, activo: event.target.checked }))}
                />
                Activo
              </label>
            </div>
            <div className="flex gap-2">
              <SmallActionButton text="Ok" tone="ok" onClick={() => void updateItem(item.itemId)} />
              <SmallActionButton
                text="Cancelar"
                tone="neutral"
                onClick={() => {
                  setEditItemId(null);
                  setEditItem(EMPTY_ITEM_FORM);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-stone-800">
              {item.nombre} [orden PDF: {item.ordenPdf}] [{item.activo ? "activo" : "inactivo"}]
            </span>
            <div className="flex flex-wrap gap-2">
              {draggableInActiveList ? (
                <button
                  type="button"
                  onPointerDown={(event) => startItemDrag(item.itemId, event)}
                  disabled={!canWrite}
                  className="rounded border border-stone-400 bg-white px-2 py-1 text-xs font-medium text-stone-700 touch-none disabled:opacity-50"
                >
                  Arrastrar
                </button>
              ) : null}
              <SmallActionButton
                text={item.activo ? "Desactivar" : "Activar"}
                tone={item.activo ? "delete" : "ok"}
                onClick={() => void toggleItemActivo(item)}
              />
              <SmallActionButton
                text="Editar"
                tone="edit"
                onClick={() => {
                  setEditItemId(item.itemId);
                  setEditItem({
                    nombre: item.nombre,
                    activo: item.activo,
                    ordenPdf: item.ordenPdf,
                  });
                }}
              />
              <SmallActionButton text="Borrar" tone="delete" onClick={() => void deleteItem(item.itemId)} />
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
          <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Gestion de Deposito General - Artilleria 1</p>
          <h1 className="mt-2 text-2xl font-bold text-stone-900">Iniciar sesion</h1>
          <p className="mt-2 text-sm text-stone-600">{status}</p>

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
              placeholder="Contrasena"
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
      <section className="ej-hero relative overflow-hidden rounded-3xl p-5 shadow-xl sm:p-7">
        <div className="pointer-events-none absolute -right-14 -top-16 h-52 w-52 rounded-full bg-amber-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-black/15 blur-3xl" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.24em] text-amber-200/95">Gestion de Deposito General - Artilleria 1</p>
            <span className="rounded-full border border-emerald-200/35 bg-emerald-900/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
              {loading ? "Sincronizando" : "Sistema activo"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className="rounded-xl border border-amber-100/35 bg-black/20 px-3 py-2 text-xs font-semibold">
              {currentUser ? `${currentUser.username} (${roleLabel(currentUser.rol)})` : "Sin sesion iniciada"}
            </span>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className="ej-button-muted rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="ej-button-danger rounded-xl px-3 py-2 text-sm font-semibold"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-4xl">Gestion de Personal y Vestuario</h1>
            <p className="mt-2 text-sm text-amber-100/90 sm:max-w-2xl">
              Registro de alistados, grados, baterias e inventario operativo en una sola interfaz.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-200/90">Personal</p>
              <p className="text-lg font-bold text-white">{personal.length}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-200/90">Grados</p>
              <p className="text-lg font-bold text-white">{rangos.length}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-200/90">Baterias</p>
              <p className="text-lg font-bold text-white">{baterias.length}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-black/20 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-200/90">Items activos</p>
              <p className="text-lg font-bold text-white">{items.filter((item) => item.activo).length}</p>
            </div>
          </div>
        </div>

        <p className="relative mt-5 rounded-xl border border-amber-100/25 bg-black/25 px-3 py-2 text-xs">{status}</p>
      </section>

      <section className="ej-card mt-4 rounded-2xl p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Vistas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveView("personal");
              setShowConfigViews(false);
            }}
            className={viewButtonClass("personal")}
          >
            Personal
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("tallas_resumen");
              setShowConfigViews(false);
            }}
            className={viewButtonClass("tallas_resumen")}
          >
            Resumen Tallas
          </button>
          <button
            type="button"
            onClick={() => setShowConfigViews((prev) => !prev)}
            className={
              isConfigView || showConfigViews
                ? "ej-view-active rounded-lg px-3 py-2 text-sm font-semibold"
                : "ej-view-idle rounded-lg px-3 py-2 text-sm font-semibold"
            }
          >
            Configuracion {showConfigViews ? "▲" : "▼"}
          </button>
        </div>
        {showConfigViews ? (
          <div className="mt-2 rounded-xl border border-stone-200 bg-stone-50 p-2">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => selectConfigView("grados")} className={viewButtonClass("grados")}>
                Registrar Grados
              </button>
              <button type="button" onClick={() => selectConfigView("baterias")} className={viewButtonClass("baterias")}>
                Registrar Baterias
              </button>
              <button type="button" onClick={() => selectConfigView("items")} className={viewButtonClass("items")}>
                Registrar Items
              </button>
              {isAdmin ? (
                <button type="button" onClick={() => selectConfigView("admin")} className={viewButtonClass("admin")}>
                  Usuarios y Auditoria
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {inCatalogView ? (
        <section className="mt-6 grid grid-cols-1 gap-4">
          {activeView === "grados" ? (
            <article className="ej-card rounded-2xl p-4">
              <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Grado del Personal</h2>
              {!isAdmin ? (
                <p className="mt-2 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
                  Modo solo lectura: solo el administrador puede crear, editar o eliminar grados.
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                <input
                  value={newRangoAbreviacion}
                  onChange={(event) => setNewRangoAbreviacion(event.target.value)}
                  placeholder="Abreviacion"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  disabled={!isAdmin}
                />
                <input
                  value={newRangoNombreCompleto}
                  onChange={(event) => setNewRangoNombreCompleto(event.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  disabled={!isAdmin}
                />
                <button
                  type="button"
                  onClick={() => void createRango()}
                  disabled={!isAdmin}
                  className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Crear
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {rangos.map((rango) => (
                  <div key={rango.rangoId} className="rounded-lg bg-stone-100/80 p-2">
                    {editRangoId === rango.rangoId ? (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                        <input
                          value={editRangoAbreviacion}
                          onChange={(event) => setEditRangoAbreviacion(event.target.value)}
                          className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                        />
                        <input
                          value={editRangoNombreCompleto}
                          onChange={(event) => setEditRangoNombreCompleto(event.target.value)}
                          className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                        />
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <SmallActionButton text="Ok" tone="ok" onClick={() => void updateRango(rango.rangoId)} />
                            <SmallActionButton
                              text="Cancelar"
                              tone="neutral"
                              onClick={() => {
                                setEditRangoId(null);
                                setEditRangoAbreviacion("");
                                setEditRangoNombreCompleto("");
                              }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-stone-800">{rangoLabel(rango)}</span>
                        {isAdmin ? (
                          <div className="flex gap-2">
                            <SmallActionButton
                              text="Editar"
                              tone="edit"
                              onClick={() => {
                                setEditRangoId(rango.rangoId);
                                setEditRangoAbreviacion(rango.abreviacion);
                                setEditRangoNombreCompleto(rango.nombreCompleto);
                              }}
                            />
                            <SmallActionButton text="Borrar" tone="delete" onClick={() => void deleteRango(rango.rangoId)} />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {activeView === "baterias" ? (
            <CatalogCard
              title="Baterias"
              placeholder="Nueva bateria"
              newValue={newBateria}
              onNewValueChange={setNewBateria}
              onCreate={() => void createBateria()}
              createDisabled={!isAdmin}
            >
              {baterias.map((bateria) => (
                <div key={bateria.bateriaId} className="rounded-lg bg-stone-100/80 p-2">
                  {editBateriaId === bateria.bateriaId ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={editBateriaNombre}
                        onChange={(event) => setEditBateriaNombre(event.target.value)}
                        className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                      />
                      <div className="flex gap-2">
                        <SmallActionButton text="Ok" tone="ok" onClick={() => void updateBateria(bateria.bateriaId)} />
                        <SmallActionButton
                          text="Cancelar"
                          tone="neutral"
                          onClick={() => {
                            setEditBateriaId(null);
                            setEditBateriaNombre("");
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-medium text-stone-800">{bateria.nombre}</span>
                      <div className="flex gap-2">
                        <SmallActionButton
                          text="Editar"
                          tone="edit"
                          onClick={() => {
                            setEditBateriaId(bateria.bateriaId);
                            setEditBateriaNombre(bateria.nombre);
                          }}
                        />
                        <SmallActionButton text="Borrar" tone="delete" onClick={() => void deleteBateria(bateria.bateriaId)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CatalogCard>
          ) : null}

          {activeView === "items" ? (
            <article className="ej-card rounded-2xl p-4">
              <h2 className="text-base font-semibold text-stone-900">Items</h2>
              <form onSubmit={createItem} className="mt-3 space-y-2">
                <input
                  value={newItem.nombre}
                  onChange={(event) => setNewItem((prev) => ({ ...prev, nombre: event.target.value }))}
                  placeholder="Nuevo item"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newItem.activo}
                      onChange={(event) => setNewItem((prev) => ({ ...prev, activo: event.target.checked }))}
                    />
                    Activo
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canWrite}
                  className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Crear item
                </button>
              </form>

              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Items activos</p>
                <p className="text-xs text-stone-500">Arrastra con mouse o tactil para cambiar el orden del PDF.</p>
                {itemsActivosEnPantalla.length > 0 ? (
                  itemsActivosEnPantalla.map((item) => renderItemCard(item, { draggableInActiveList: true }))
                ) : (
                  <p className="text-sm text-stone-500">Sin items activos.</p>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Items inactivos</p>
                <p className="text-xs text-stone-500">Estos items no aparecen en la Hoja de Entrega ni en registrar movimientos.</p>
                {itemsInactivos.length > 0 ? (
                  itemsInactivos.map((item) => renderItemCard(item))
                ) : (
                  <p className="text-sm text-stone-500">Sin items inactivos.</p>
                )}
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {showCreatePersonalForm ? (
        <section className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 px-3 py-4 sm:items-center sm:py-6">
          <article className="ej-card max-h-[92vh] w-full max-w-6xl overflow-auto rounded-2xl">
          <div className="border-b border-stone-200 bg-gradient-to-r from-stone-50 to-lime-50/60 px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">Registrar Personal</h2>
                <p className="mt-1 text-sm text-stone-600">
                  Carga datos personales, destino y talles en una sola ficha.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-lime-700/25 bg-lime-100/70 px-3 py-1 text-xs font-semibold text-lime-900">
                  {`Campos obligatorios: ${requiredPersonalCompleted}/5`}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatePersonalForm(false)}
                  className="rounded bg-stone-700 px-2 py-1 text-xs font-semibold text-white"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>

          <form onSubmit={createPersonal} className="px-4 py-4 sm:px-5 sm:py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                <fieldset className="rounded-xl border border-stone-200 bg-stone-50/55 p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Identidad</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="sm:col-span-2 xl:col-span-4">
                      <span className="block text-xs font-medium text-stone-700">Cedula de identidad *</span>
                      <input
                        value={newPersonal.ci}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, ci: event.target.value }))}
                        placeholder="Ej: 55366796"
                        inputMode="numeric"
                        className={`mt-1 w-full rounded-lg border px-3 py-2.5 text-sm ${ciLooksValid ? "border-stone-300" : "border-rose-600 bg-rose-50"}`}
                      />
                      <span className="mt-1 block text-[11px] text-stone-500">Sin puntos ni guion.</span>
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Apellido 1 *</span>
                      <input
                        value={newPersonal.apellido1}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, apellido1: event.target.value }))}
                        placeholder="Apellido principal"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Apellido 2</span>
                      <input
                        value={newPersonal.apellido2}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, apellido2: event.target.value }))}
                        placeholder="Apellido secundario"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Nombre 1 *</span>
                      <input
                        value={newPersonal.nombre1}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, nombre1: event.target.value }))}
                        placeholder="Primer nombre"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      />
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Nombre 2</span>
                      <input
                        value={newPersonal.nombre2}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, nombre2: event.target.value }))}
                        placeholder="Segundo nombre"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="rounded-xl border border-stone-200 bg-stone-50/55 p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Datos de servicio</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <label>
                      <span className="block text-xs font-medium text-stone-700">Grado del personal *</span>
                      <select
                        value={newPersonal.rangoId}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, rangoId: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">Seleccionar grado</option>
                        {rangos.map((rango) => (
                          <option key={rango.rangoId} value={rango.rangoId}>
                            {rangoLabel(rango)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Bateria (importante)</span>
                      <select
                        value={newPersonal.bateriaId}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, bateriaId: event.target.value }))}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">Sin bateria (pendiente)</option>
                        {baterias.map((bateria) => (
                          <option key={bateria.bateriaId} value={bateria.bateriaId}>
                            {bateria.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="block text-xs font-medium text-stone-700">Fecha de ingreso (importante)</span>
                      <input
                        type="date"
                        value={newPersonal.fechaIngreso}
                        onChange={(event) => setNewPersonal((prev) => ({ ...prev, fechaIngreso: event.target.value }))}
                        max={maxFechaIngreso}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                      />
                    </label>
                  </div>
                </fieldset>

                <fieldset className="rounded-xl border border-stone-200 bg-stone-50/55 p-4">
                  <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Talles reglamentarios</legend>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {TALLA_KEYS.map((key) => (
                      <label key={key}>
                        <span className="block text-xs font-medium text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
                        <select
                          value={newPersonal[key]}
                          onChange={(event) => setNewPersonal((prev) => ({ ...prev, [key]: event.target.value }))}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                        >
                          <option value="">Seleccionar</option>
                          {TALLA_OPTIONS[key].map((option) => (
                            <option key={`${key}-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <aside className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-900">Estado del formulario</h3>
                <p className="mt-1 text-xs text-stone-600">Completa los campos obligatorios para habilitar el registro.</p>

                {!canRegisterPersonal ? (
                  <p className="mt-3 rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Primero debes registrar Grados.
                  </p>
                ) : null}

                {!ciLooksValid ? (
                  <p className="mt-3 rounded-lg border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    La cedula ingresada no es valida.
                  </p>
                ) : null}

                <div className="mt-4 space-y-2 text-xs text-stone-600">
                  <p>{`Cedula valida: ${requiredPersonalFields[0] ? "Si" : "No"}`}</p>
                  <p>{`Apellido 1: ${requiredPersonalFields[1] ? "Completo" : "Falta"}`}</p>
                  <p>{`Nombre 1: ${requiredPersonalFields[2] ? "Completo" : "Falta"}`}</p>
                  <p>{`Grado: ${requiredPersonalFields[3] ? "Seleccionado" : "Falta"}`}</p>
                  <p>{`Bateria (importante): ${Number(newPersonal.bateriaId) > 0 ? "Completa" : "Pendiente"}`}</p>
                  <p>{`Fecha de ingreso (importante): ${newPersonal.fechaIngreso ? "Completa" : "Pendiente"}`}</p>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmitPersonal}
                  className="ej-button mt-5 w-full rounded-lg px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Registrar Personal
                </button>
              </aside>
            </div>
          </form>
          </article>
        </section>
      ) : null}

      {activeView === "personal" ? (
        <section className="ej-card mt-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Personal</h2>
              <p className="mt-1 text-xs text-stone-600">Orden: Grado del Personal, Apellidos y Nombres.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreatePersonalForm(true)}
              disabled={!canWrite}
              className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Registrar nuevo
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={ciSearch}
              onChange={(event) => setCiSearch(event.target.value)}
              placeholder="Buscar por cedula, nombre o apellido"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm sm:max-w-sm"
            />
            {ciSearch.trim() !== "" || bateriaFilter !== "ALL" ? (
              <button
                type="button"
                onClick={() => {
                  setCiSearch("");
                  setBateriaFilter("ALL");
                }}
                className="rounded bg-stone-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Limpiar
              </button>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBateriaFilter("ALL")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                bateriaFilter === "ALL"
                  ? "bg-stone-800 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Todas las baterias
            </button>
            <button
              type="button"
              onClick={() => setBateriaFilter("NONE")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${
                bateriaFilter === "NONE"
                  ? "bg-stone-800 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Sin bateria
            </button>
            {baterias.map((bateria) => {
              const selected = bateriaFilter === String(bateria.bateriaId);
              return (
                <button
                  key={bateria.bateriaId}
                  type="button"
                  onClick={() => setBateriaFilter(String(bateria.bateriaId))}
                  className={`rounded px-3 py-1.5 text-xs font-semibold ${
                    selected ? "bg-stone-800 text-white" : "border border-stone-300 bg-white text-stone-700"
                  }`}
                >
                  {bateria.nombre}
                </button>
              );
            })}
          </div>

          <div className="mt-3 space-y-3 md:hidden">
            {personalFiltrado.map((persona) => {
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
                  </p>
                  {!ciValida ? (
                    <p className="mt-1 inline-block rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                      CI invalida en BD
                    </p>
                  ) : null}
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
                      className="rounded bg-stone-600 px-2 py-1 text-xs font-medium text-white"
                    >
                      {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openRegistro(persona.ci, "ENTREGA")}
                      className="rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white"
                    >
                      Entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => openRegistro(persona.ci, "DEVOLUCION")}
                      className="rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white"
                    >
                      Devolucion
                    </button>
                    <button
                      type="button"
                      onClick={() => void openRegistroViewer(persona)}
                      className="rounded bg-sky-700 px-2 py-1 text-xs font-medium text-white"
                    >
                      Ver movimientos
                    </button>
                    <button
                      type="button"
                      onClick={() => window.open(`/hoja-entrega/${encodeURIComponent(persona.ci)}`, "_blank", "noopener,noreferrer")}
                      className="rounded bg-indigo-700 px-2 py-1 text-xs font-medium text-white"
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

          <div className="mt-3 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
                <tr>
                  <th className="w-[140px] min-w-[140px] whitespace-nowrap px-3 py-2">CI</th>
                  <th className="px-3 py-2">Grado del Personal</th>
                  <th className="px-3 py-2">Apellidos</th>
                  <th className="px-3 py-2">Nombres</th>
                  <th className="px-3 py-2">Bateria</th>
                  <th className="px-3 py-2">Detalles</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {personalFiltrado.map((persona) => {
                  const tallas = tallasMap(persona.tallas);
                  const ciValida = isValidUruguayanCi(persona.ci);
                  const tallasOpen = expandedTallasByCi[persona.ci] === true;
                  const editing = editPersonalCi === persona.ci;
                  return (
                    <Fragment key={persona.ci}>
                      <tr className={!ciValida ? "bg-red-50/60" : undefined}>
                        <td
                          className={`w-[140px] min-w-[140px] whitespace-nowrap px-3 py-2 font-mono text-xs ${ciValida ? "text-stone-700" : "font-bold text-red-700"}`}
                        >
                          <div>{formatUruguayanCi(persona.ci)}</div>
                          {!ciValida ? <div className="mt-1 text-[10px] uppercase tracking-wide text-red-800">invalida</div> : null}
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
                            className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700"
                          >
                            {tallasOpen ? "Ocultar tallas" : "Ver tallas"}
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="grid min-w-[280px] grid-cols-2 gap-1.5">
                            <SmallActionButton
                              text={editing ? "Cancelar" : "Editar"}
                              tone={editing ? "neutral" : "edit"}
                              className="w-full"
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
                              className="w-full"
                              onClick={() => void deletePersonal(persona.ci)}
                            />
                            <button
                              type="button"
                              onClick={() => openRegistro(persona.ci, "ENTREGA")}
                              className="w-full rounded bg-emerald-700 px-2 py-1 text-xs font-medium text-white"
                            >
                              Entrega
                            </button>
                            <button
                              type="button"
                              onClick={() => openRegistro(persona.ci, "DEVOLUCION")}
                              className="w-full rounded bg-amber-700 px-2 py-1 text-xs font-medium text-white"
                            >
                              Devolucion
                            </button>
                            <button
                              type="button"
                              onClick={() => void openRegistroViewer(persona)}
                              className="w-full rounded bg-sky-700 px-2 py-1 text-xs font-medium text-white"
                            >
                              Ver movimientos
                            </button>
                            <button
                              type="button"
                              onClick={() => window.open(`/hoja-entrega/${encodeURIComponent(persona.ci)}`, "_blank", "noopener,noreferrer")}
                              className="w-full rounded bg-indigo-700 px-2 py-1 text-xs font-medium text-white"
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
        </section>
      ) : null}

      {activeView === "tallas_resumen" ? (
        <section className="mt-6 space-y-4">
          <article className="ej-card rounded-2xl p-4">
            <h2 className="text-base font-semibold text-stone-900">Resumen de Tallas por Bateria</h2>
            <p className="mt-1 text-xs text-stone-600">
              Conteo de tallas por bateria y tipo de prenda. Incluye el grupo Sin bateria cuando corresponde.
            </p>
          </article>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {resumenTallasPorBateria.map((bateria) => (
              <article key={bateria.key} className="ej-card rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-2">
                  <h3 className="text-sm font-semibold text-stone-900">{bateria.nombre}</h3>
                  <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-700">
                    {bateria.total} personal
                  </span>
                </div>

                {bateria.total === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">Sin personal asignado en esta bateria.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {bateria.tallas.map((talla) => (
                      <div key={`${bateria.key}-${talla.key}`} className="rounded-lg border border-stone-200 bg-stone-50/75 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">{talla.label}</p>
                          <p className="text-[11px] text-stone-600">{`Sin dato: ${talla.sinDato}`}</p>
                        </div>
                        <div className="max-h-32 overflow-auto">
                          <table className="min-w-full text-left text-xs">
                            <thead className="text-[10px] uppercase tracking-wide text-stone-500">
                              <tr>
                                <th className="py-1 pr-2">Talla</th>
                                <th className="py-1 text-right">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                              {talla.values.map((value) => (
                                <tr key={`${bateria.key}-${talla.key}-${value.talla}`}>
                                  <td className="py-1 pr-2 text-stone-800">{value.talla}</td>
                                  <td className="py-1 text-right font-semibold text-stone-700">{value.cantidad}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
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
              {!registroViewer.loading && !registroViewer.error && registroViewer.registros.length === 0 ? (
                <p className="text-sm text-stone-600">No hay movimientos registrados para esta persona.</p>
              ) : null}
              {!registroViewer.loading && !registroViewer.error
                ? registroViewer.registros.map((registro) => (
                    <div key={registro.registroId} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-900">{new Date(registro.fecha).toLocaleDateString("es-UY")}</p>
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
                      {registro.auditoria ? (
                        <p className="mt-1 text-xs text-stone-700">
                          {`Registrado por: ${registro.auditoria.usuario?.username ?? "Sistema"} (${roleLabel(registro.auditoria.usuario?.rol ?? null)}) - Auditoria BD #${registro.auditoria.auditoriaId}`}
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
          </article>
        </section>
      ) : null}

      {registroDraft ? (
        <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-3">
          <article className="w-full max-w-2xl rounded-2xl border border-stone-300 bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {registroDraft.tipo === "ENTREGA" ? "Registrar Entrega" : "Registrar Devolucion"}
                </h3>
                <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(registroDraft.ci)}`}</p>
                {personaRegistro ? (
                  <p className="text-xs font-medium text-stone-700">{`Personal: ${apellidosLabel(personaRegistro)}, ${nombresLabel(personaRegistro)}`}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setRegistroDraft(null)}
                className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-stone-700">
                Fecha
                <input
                  type="date"
                  max={maxFechaIngreso}
                  value={registroDraft.fecha}
                  onChange={(event) => setRegistroDraft((prev) => (prev ? { ...prev, fecha: event.target.value } : prev))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Comentarios (opcional)
                <input
                  value={registroDraft.comentarios}
                  onChange={(event) => setRegistroDraft((prev) => (prev ? { ...prev, comentarios: event.target.value } : prev))}
                  placeholder="Detalle breve"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Items del movimiento</p>
              {registroDraft.items.map((item, index) => (
                <div key={`reg-item-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <select
                    value={item.itemId}
                    onChange={(event) => updateRegistroItem(index, "itemId", event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar item</option>
                    {itemsOrdenados
                      .filter((catalogItem) => {
                        if (!catalogItem.activo) return false;
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
                    onChange={(event) => updateRegistroItem(index, "cantidad", event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRegistroItem(index)}
                    disabled={registroDraft.items.length <= 1}
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
                className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Agregar item
              </button>
              <button
                type="button"
                onClick={() => void saveRegistro()}
                className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
              >
                Guardar movimiento
              </button>
            </div>
          </article>
        </section>
      ) : null}

      {isAdmin && activeView === "admin" ? (
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="ej-card rounded-2xl p-4">
            <h2 className="text-base font-semibold text-stone-900">Usuarios y privilegios</h2>
            <form onSubmit={createUsuario} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="Nombre de usuario"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Contrasena (min 8)"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                type="password"
              />
              <select
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as Role)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!isAdmin}
                className="ej-button rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Crear usuario
              </button>
            </form>

            <div className="mt-3 space-y-2">
              {usuarios.map((usuario) => (
                <div key={usuario.usuarioId} className="rounded-lg bg-stone-100/80 p-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {usuario.username} ({roleLabel(usuario.rol)})
                      </p>
                      <p className="text-xs text-stone-600">{usuario.activo ? "Activo" : "Inactivo"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <SmallActionButton
                        text="Rol"
                        tone="edit"
                        onClick={() => void changeUserRole(usuario.usuarioId, usuario.rol)}
                      />
                      <SmallActionButton
                        text={usuario.activo ? "Desactivar" : "Activar"}
                        tone="neutral"
                        onClick={() => void toggleUserActive(usuario)}
                      />
                      <SmallActionButton
                        text="Contrasena"
                        tone="ok"
                        onClick={() => void resetUserPassword(usuario)}
                      />
                      <SmallActionButton text="Borrar" tone="delete" onClick={() => void deleteUsuario(usuario)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="ej-card rounded-2xl p-4">
            <h2 className="text-base font-semibold text-stone-900">Auditoria detallada (interfaz y base de datos)</h2>
            <p className="mt-1 text-xs text-stone-600">
              Cada registro muestra quien hizo la accion, sobre que entidad y el detalle guardado en la tabla de auditoria.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAuditFilter("TODOS")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  auditFilter === "TODOS" ? "bg-stone-800 text-white" : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("MOVIMIENTOS")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  auditFilter === "MOVIMIENTOS"
                    ? "bg-stone-800 text-white"
                    : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                Solo movimientos
              </button>
              <button
                type="button"
                onClick={() => setAuditFilter("AUTENTICACION")}
                className={`rounded px-3 py-1.5 text-xs font-semibold ${
                  auditFilter === "AUTENTICACION"
                    ? "bg-stone-800 text-white"
                    : "border border-stone-300 bg-white text-stone-700"
                }`}
              >
                Solo autenticacion
              </button>
            </div>
            <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
              {auditoriaFiltrada.map((log) => (
                <div key={log.auditoriaId} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                  <p className="text-xs text-stone-600">{new Date(log.createdAt).toLocaleString("es-UY")}</p>
                  <p className="text-sm font-medium text-stone-900">
                    {`${log.usuario?.username ?? "Sistema"} (${roleLabel(log.usuario?.rol ?? null)}) - ${auditActionLabel(log.accion)} ${auditEntityLabel(log.entidad)}`}
                  </p>
                  <p className="text-xs text-stone-600">{`Auditoria BD #${log.auditoriaId}`}</p>
                  <p className="text-xs text-stone-600">{log.entidadId ? `Entidad ID: ${log.entidadId}` : "Entidad sin ID"}</p>
                  {renderAuditDetalle(log.detalle)}
                </div>
              ))}
              {auditoriaFiltrada.length === 0 ? (
                <p className="text-sm text-stone-600">No hay eventos para este filtro.</p>
              ) : null}
            </div>
          </article>
        </section>
      ) : null}

      {loading ? <p className="mt-4 text-xs text-stone-600">Actualizando informacion...</p> : null}
    </main>
  );
}
