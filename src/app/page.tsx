"use client";

import { FormEvent, useEffect, useState, type ReactNode } from "react";
import { isValidUruguayanCi } from "@/lib/ci";

type Rango = { rangoId: number; abreviacion: string; nombreCompleto: string };
type Bateria = { bateriaId: number; nombre: string };
type Item = { itemId: string; nombre: string; requiereTalle: boolean; activo: boolean };
type Talla = { tallaTipo: { nombre: string }; tallaValor: string };
type Personal = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  fechaIngreso: string | null;
  rangoId: number;
  bateriaId: number;
  rango: Rango;
  bateria: Bateria;
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
  requiereTalle: boolean;
  activo: boolean;
};

type Role = "ADMIN" | "EDITOR" | "VIEWER";
type MainView = "personal_registro" | "personal_gestion" | "grados" | "baterias" | "items" | "admin";

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

const TALLA_KEYS = ["PARKA", "CAMISACO", "PANTALON", "KEPI", "CALZADO"] as const;
type TallaKey = (typeof TALLA_KEYS)[number];
const TALLA_LABELS: Record<TallaKey, string> = {
  PARKA: "Parka",
  CAMISACO: "Camisaco",
  PANTALON: "Pantalon",
  KEPI: "Kepi",
  CALZADO: "Calzado",
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
  requiereTalle: false,
  activo: true,
};

const ROLE_OPTIONS: Role[] = ["ADMIN", "EDITOR", "VIEWER"];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : "Error en la operacion.";
    throw new Error(message || "Error en la operacion.");
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

function fullName(persona: Personal) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}, ${persona.nombre1} ${persona.nombre2 ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
}

function rangoLabel(rango: Rango) {
  return `${rango.abreviacion} - ${rango.nombreCompleto}`;
}

function toDateInput(dateIso: string | null) {
  if (!dateIso) return "";
  return dateIso.slice(0, 10);
}

function personalPayload(form: PersonalForm, includeCi: boolean) {
  return {
    ...(includeCi ? { ci: form.ci.trim() } : {}),
    apellido1: form.apellido1.trim(),
    apellido2: form.apellido2.trim(),
    nombre1: form.nombre1.trim(),
    nombre2: form.nombre2.trim(),
    fechaIngreso: form.fechaIngreso || undefined,
    rangoId: Number(form.rangoId),
    bateriaId: Number(form.bateriaId),
    tallas: {
      PARKA: form.PARKA.trim(),
      CAMISACO: form.CAMISACO.trim(),
      PANTALON: form.PANTALON.trim(),
      KEPI: form.KEPI.trim(),
      CALZADO: form.CALZADO.trim(),
    },
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
    bateriaId: String(persona.bateriaId),
    PARKA: tallas.PARKA === "-" ? "" : tallas.PARKA,
    CAMISACO: tallas.CAMISACO === "-" ? "" : tallas.CAMISACO,
    PANTALON: tallas.PANTALON === "-" ? "" : tallas.PANTALON,
    KEPI: tallas.KEPI === "-" ? "" : tallas.KEPI,
    CALZADO: tallas.CALZADO === "-" ? "" : tallas.CALZADO,
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

function SmallActionButton(props: { text: string; tone: "edit" | "delete" | "ok" | "neutral"; onClick: () => void }) {
  const color =
    props.tone === "edit"
      ? "ej-action-edit"
      : props.tone === "delete"
        ? "ej-action-delete"
        : props.tone === "ok"
          ? "ej-action-ok"
          : "ej-action-neutral";

  return (
    <button type="button" onClick={props.onClick} className={`ej-action-btn rounded px-2 py-1 text-xs font-medium ${color}`}>
      {props.text}
    </button>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Cargando datos...");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

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

  const [newPersonal, setNewPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [editPersonalCi, setEditPersonalCi] = useState<string | null>(null);
  const [editPersonal, setEditPersonal] = useState<PersonalForm>(EMPTY_PERSONAL_FORM);
  const [activeView, setActiveView] = useState<MainView>("personal_registro");

  const isAdmin = currentUser?.rol === "ADMIN";
  const canWrite = currentUser?.rol === "ADMIN" || currentUser?.rol === "EDITOR";
  const canDelete = canWrite;
  const canRegisterPersonal = canWrite && rangos.length > 0 && baterias.length > 0;
  const inCatalogView = activeView === "grados" || activeView === "baterias" || activeView === "items";
  const ciLooksValid = newPersonal.ci.trim() === "" || isValidUruguayanCi(newPersonal.ci);

  useEffect(() => {
    if (activeView === "admin" && !isAdmin) {
      setActiveView("personal_registro");
    }
  }, [activeView, isAdmin]);

  async function loadData(showSpinner = false) {
    if (showSpinner) setLoading(true);

    try {
      const me = await api<{ user: CurrentUser }>("/api/auth/me");
      setCurrentUser(me.user);

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
          api<AuditoriaRecord[]>("/api/auditoria?limit=40"),
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
        window.location.href = "/login";
        return;
      }
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData(true);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  async function createRango() {
    if (!canWrite) {
      setStatus("No tienes permisos para crear.");
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
    if (!canWrite) {
      setStatus("No tienes permisos para editar.");
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
    if (!canDelete) {
      setStatus("No tienes permisos para eliminar.");
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
    if (!canWrite) {
      setStatus("No tienes permisos para crear.");
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
        body: JSON.stringify(newItem),
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
      setStatus("No se puede registrar personal sin registrar Grados y Bateria previamente.");
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

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  async function createUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin) {
      setStatus("Solo admin puede crear usuarios.");
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
      setStatus("Solo admin puede cambiar roles.");
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
      setStatus("Solo admin puede cambiar estado.");
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
      setStatus("Solo admin puede resetear passwords.");
      return;
    }
    const password = window.prompt(`Nueva password para ${usuario.username} (min 8 chars)`, "");
    if (!password) return;

    try {
      await api(`/api/usuarios/${usuario.usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setStatus("Password actualizada.");
      await loadData();
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo actualizar la password.");
    }
  }

  async function deleteUsuario(usuario: UsuarioAdmin) {
    if (!isAdmin) {
      setStatus("Solo admin puede eliminar usuarios.");
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8">
      <section className="ej-hero rounded-2xl p-5 shadow-lg sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/90">Soldados App</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Panel CRUD Responsive</h1>
            <p className="mt-2 text-sm text-amber-100/90">Grado del Personal, baterias, items y personal desde celular o PC.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-amber-100/35 bg-black/20 px-3 py-2 text-xs">
              {currentUser ? `${currentUser.username} (${currentUser.rol})` : "Sin sesion"}
            </span>
            <button
              type="button"
              onClick={() => void loadData(true)}
              className="ej-button-muted rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="ej-button-danger rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Salir
            </button>
          </div>
        </div>
        <p className="mt-4 rounded-lg border border-amber-100/25 bg-black/20 px-3 py-2 text-xs">{status}</p>
      </section>

      <section className="ej-card mt-4 rounded-2xl p-3 sm:p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Vistas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveView("personal_registro")}
            className={viewButtonClass("personal_registro")}
          >
            Registrar Personal
          </button>
          <button
            type="button"
            onClick={() => setActiveView("personal_gestion")}
            className={viewButtonClass("personal_gestion")}
          >
            Gestionar Personal
          </button>
          <button type="button" onClick={() => setActiveView("grados")} className={viewButtonClass("grados")}>
            Registrar Grados
          </button>
          <button type="button" onClick={() => setActiveView("baterias")} className={viewButtonClass("baterias")}>
            Registrar Baterias
          </button>
          <button type="button" onClick={() => setActiveView("items")} className={viewButtonClass("items")}>
            Registrar Items
          </button>
          {isAdmin ? (
            <button type="button" onClick={() => setActiveView("admin")} className={viewButtonClass("admin")}>
              Usuarios y Auditoria
            </button>
          ) : null}
        </div>
      </section>

      {inCatalogView ? (
        <section className="mt-6 grid grid-cols-1 gap-4">
          {activeView === "grados" ? (
            <article className="ej-card rounded-2xl p-4">
              <h2 className="text-base font-semibold text-[var(--UniformeVerdeOscuro)]">Grado del Personal</h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[180px_1fr_auto]">
                <input
                  value={newRangoAbreviacion}
                  onChange={(event) => setNewRangoAbreviacion(event.target.value)}
                  placeholder="Abreviacion"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <input
                  value={newRangoNombreCompleto}
                  onChange={(event) => setNewRangoNombreCompleto(event.target.value)}
                  placeholder="Nombre completo"
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void createRango()}
                  disabled={!canWrite}
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
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-medium text-stone-800">{rangoLabel(rango)}</span>
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
              createDisabled={!canWrite}
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
                      checked={newItem.requiereTalle}
                      onChange={(event) => setNewItem((prev) => ({ ...prev, requiereTalle: event.target.checked }))}
                    />
                    Requiere talle
                  </label>
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
                {items.map((item) => (
                  <div key={item.itemId} className="rounded-lg bg-stone-100/80 p-2">
                    {editItemId === item.itemId ? (
                      <div className="space-y-2">
                        <input
                          value={editItem.nombre}
                          onChange={(event) => setEditItem((prev) => ({ ...prev, nombre: event.target.value }))}
                          className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                        />
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editItem.requiereTalle}
                              onChange={(event) => setEditItem((prev) => ({ ...prev, requiereTalle: event.target.checked }))}
                            />
                            Requiere talle
                          </label>
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
                          {item.nombre} [{item.requiereTalle ? "talle" : "sin talle"}] [{item.activo ? "activo" : "inactivo"}]
                        </span>
                        <div className="flex gap-2">
                          <SmallActionButton
                            text="Editar"
                            tone="edit"
                            onClick={() => {
                              setEditItemId(item.itemId);
                              setEditItem({
                                nombre: item.nombre,
                                requiereTalle: item.requiereTalle,
                                activo: item.activo,
                              });
                            }}
                          />
                          <SmallActionButton text="Borrar" tone="delete" onClick={() => void deleteItem(item.itemId)} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          ) : null}
        </section>
      ) : null}

      {activeView === "personal_registro" ? (
        <section className="ej-card mt-6 rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Registrar Personal</h2>
          <p className="mt-1 text-xs text-stone-600">
            Completa los datos del alistado. Los campos con * son obligatorios.
          </p>
          <form onSubmit={createPersonal} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Cedula de Identidad *</span>
              <input
                value={newPersonal.ci}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, ci: event.target.value }))}
                placeholder="Ej: 55366796"
                inputMode="numeric"
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${ciLooksValid ? "border-stone-300" : "border-rose-600 bg-rose-50"}`}
              />
              <span className="mt-1 block text-[11px] text-stone-500">Sin puntos ni guion.</span>
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Apellido 1 *</span>
              <input
                value={newPersonal.apellido1}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, apellido1: event.target.value }))}
                placeholder="Apellido principal"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Apellido 2</span>
              <input
                value={newPersonal.apellido2}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, apellido2: event.target.value }))}
                placeholder="Apellido secundario"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Nombre 1 *</span>
              <input
                value={newPersonal.nombre1}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, nombre1: event.target.value }))}
                placeholder="Primer nombre"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Nombre 2</span>
              <input
                value={newPersonal.nombre2}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, nombre2: event.target.value }))}
                placeholder="Segundo nombre"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Fecha de ingreso</span>
              <input
                type="date"
                value={newPersonal.fechaIngreso}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, fechaIngreso: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Grado del Personal *</span>
              <select
                value={newPersonal.rangoId}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, rangoId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar grado</option>
                {rangos.map((rango) => (
                  <option key={rango.rangoId} value={rango.rangoId}>
                    {rangoLabel(rango)}
                  </option>
                ))}
              </select>
            </label>

            <label className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">Bateria *</span>
              <select
                value={newPersonal.bateriaId}
                onChange={(event) => setNewPersonal((prev) => ({ ...prev, bateriaId: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Seleccionar bateria</option>
                {baterias.map((bateria) => (
                  <option key={bateria.bateriaId} value={bateria.bateriaId}>
                    {bateria.nombre}
                  </option>
                ))}
              </select>
            </label>

            {TALLA_KEYS.map((key) => (
              <label key={key} className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
                <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
                <input
                  value={newPersonal[key]}
                  onChange={(event) => setNewPersonal((prev) => ({ ...prev, [key]: event.target.value }))}
                  placeholder={`Talla ${TALLA_LABELS[key]}`}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={!canRegisterPersonal}
              className="ej-button rounded-lg px-3 py-3 text-sm font-semibold disabled:opacity-50 sm:col-span-2 lg:col-span-2"
            >
              Registrar Personal
            </button>
          </form>
          {!canRegisterPersonal ? (
            <p className="mt-2 text-xs text-amber-700">
              No se puede registrar personal sin registrar Grados y Bateria previamente.
            </p>
          ) : null}
          {!ciLooksValid ? <p className="mt-2 text-xs text-rose-700">CI uruguaya invalida.</p> : null}
        </section>
      ) : null}

      {activeView === "personal_gestion" ? (
        <section className="ej-card mt-6 rounded-2xl p-4">
          <h2 className="text-base font-semibold text-stone-900">Personal</h2>

        <div className="mt-3 space-y-3 md:hidden">
          {personal.map((persona) => {
            const tallas = tallasMap(persona.tallas);
            return (
              <article key={persona.ci} className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
                <p className="text-xs font-mono text-stone-600">{persona.ci}</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{fullName(persona)}</p>
                <p className="mt-1 text-xs text-stone-600">
                  {rangoLabel(persona.rango)} | {persona.bateria.nombre}
                </p>
                <p className="mt-1 text-xs text-stone-600">{`P:${tallas.PARKA} C:${tallas.CAMISACO} Pa:${tallas.PANTALON} K:${tallas.KEPI} Ca:${tallas.CALZADO}`}</p>
                <div className="mt-2 flex gap-2">
                  <SmallActionButton text="Editar" tone="edit" onClick={() => startEditPersonal(persona)} />
                  <SmallActionButton text="Borrar" tone="delete" onClick={() => void deletePersonal(persona.ci)} />
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-3 hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-100 text-xs uppercase tracking-wide text-stone-600">
              <tr>
                <th className="px-3 py-2">CI</th>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Grado del Personal</th>
                <th className="px-3 py-2">Bateria</th>
                <th className="px-3 py-2">Tallas</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {personal.map((persona) => {
                const tallas = tallasMap(persona.tallas);
                return (
                  <tr key={persona.ci}>
                    <td className="px-3 py-2 font-mono text-xs text-stone-700">{persona.ci}</td>
                    <td className="px-3 py-2 text-stone-900">{fullName(persona)}</td>
                    <td className="px-3 py-2 text-stone-700">{rangoLabel(persona.rango)}</td>
                    <td className="px-3 py-2 text-stone-700">{persona.bateria.nombre}</td>
                    <td className="px-3 py-2 text-xs text-stone-600">
                      {`P:${tallas.PARKA} C:${tallas.CAMISACO} Pa:${tallas.PANTALON} K:${tallas.KEPI} Ca:${tallas.CALZADO}`}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <SmallActionButton text="Editar" tone="edit" onClick={() => startEditPersonal(persona)} />
                        <SmallActionButton text="Borrar" tone="delete" onClick={() => void deletePersonal(persona.ci)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>
      ) : null}

      {activeView === "personal_gestion" && editPersonalCi ? (
        <section className="ej-card mt-6 rounded-2xl p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-stone-900">{`Editar Personal (${editPersonalCi})`}</h2>
            <button
              type="button"
              onClick={() => {
                setEditPersonalCi(null);
                setEditPersonal(EMPTY_PERSONAL_FORM);
              }}
              className="rounded-lg bg-stone-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
              {baterias.map((bateria) => (
                <option key={bateria.bateriaId} value={bateria.bateriaId}>
                  {bateria.nombre}
                </option>
              ))}
            </select>
            {TALLA_KEYS.map((key) => (
              <input
                key={`edit-${key}`}
                value={editPersonal[key]}
                onChange={(event) => setEditPersonal((prev) => ({ ...prev, [key]: event.target.value }))}
                placeholder={`Talla ${key}`}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            ))}
            <button
              type="button"
              onClick={() => void updatePersonal(editPersonalCi)}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1"
            >
              Guardar cambios
            </button>
          </div>
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
                placeholder="Username"
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Password (min 8)"
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
                    {role}
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
                        {usuario.username} ({usuario.rol})
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
                        text="Password"
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
            <h2 className="text-base font-semibold text-stone-900">Auditoria (quien hizo que)</h2>
            <div className="mt-3 max-h-96 space-y-2 overflow-auto pr-1">
              {auditoria.map((log) => (
                <div key={log.auditoriaId} className="rounded-lg border border-stone-200 bg-stone-50 p-2">
                  <p className="text-xs text-stone-600">{new Date(log.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-medium text-stone-900">
                    {log.usuario?.username ?? "Sistema"} - {log.accion} {log.entidad}
                  </p>
                  <p className="text-xs text-stone-600">{log.entidadId ? `ID: ${log.entidadId}` : "Sin ID"}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {loading ? <p className="mt-4 text-xs text-stone-600">Actualizando informacion...</p> : null}
    </main>
  );
}
