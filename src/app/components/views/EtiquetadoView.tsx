"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { LoadingInline } from "@/app/components/shared";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";

export type EtiquetadoSection =
  | "codigos_sie"
  | "listado_cajas"
  | "imprimir_todas";

type EtiquetaOrientacion = "horizontal" | "vertical";

type CreateCodigoSIEInput = {
  codigo: string;
  talla: string;
  itemId: string;
};

type UpdateCodigoSIEInput = {
  originalCodigo: string;
  codigo: string;
  talla: string;
  itemId: string;
};

type CreateItemInput = {
  nombre: string;
};

type CreateCajaInput = {
  codigoDepositoGeneral: number;
  cantidad: number;
  estanteria: string;
  itemIds: string[];
  codigosSIE: string[];
};

type EtiquetadoViewProps = {
  section: EtiquetadoSection;
  data: EtiquetadoDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  onReload: () => void;
  onCreateItem: (input: CreateItemInput) => void;
  onCreateEstanteria: (codigo: string, piso: number) => void;
  onDeleteEstanteria: (codigo: string, piso: number) => void;
  onCreateCodigoSIE: (input: CreateCodigoSIEInput) => void;
  onUpdateCodigoSIE: (input: UpdateCodigoSIEInput) => void;
  onDeleteCodigoSIE: (codigo: string) => void;
  onCreateCaja: (input: CreateCajaInput) => void;
  onDeleteCaja: (codigoDepositoGeneral: number) => void;
  onPrintCaja: (codigoDepositoGeneral: number, orientacion: EtiquetaOrientacion) => void;
  onPrintTodas: (orientacion: EtiquetaOrientacion) => void;
};

const SECTION_META: Record<EtiquetadoSection, { title: string; description: string }> = {
  codigos_sie: {
    title: "Códigos SIE",
    description: "Registra equipos, códigos SIE y estanterías para su vinculación.",
  },
  listado_cajas: {
    title: "Listado de Cajas",
    description: "Consulta cajas registradas e imprime etiquetas individuales por caja.",
  },
  imprimir_todas: {
    title: "Imprimir Todas las Etiquetas",
    description: "Genera e imprime en bloque todas las etiquetas registradas.",
  },
};

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeEstanteriaName(value: string) {
  return value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
}

function isValidEstanteriaName(value: string) {
  return /^[A-Z]$/.test(value.trim().toUpperCase());
}

function formatEstanteriaLabel(piso: number, nombreEstanteria: string) {
  return `Estanteria P${piso} - ${nombreEstanteria}`;
}

function renderTag(label: string, tone: "neutral" | "accent" = "neutral") {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        tone === "accent"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-stone-300 bg-white text-stone-700"
      }`}
    >
      {label}
    </span>
  );
}

export function EtiquetadoView({
  section,
  data,
  loading,
  error,
  canWrite,
  onReload,
  onCreateItem,
  onCreateEstanteria,
  onDeleteEstanteria,
  onCreateCodigoSIE,
  onUpdateCodigoSIE,
  onDeleteCodigoSIE,
  onCreateCaja,
  onDeleteCaja,
  onPrintCaja,
  onPrintTodas,
}: EtiquetadoViewProps) {
  const meta = SECTION_META[section];
  const items = data?.items;
  const estanterias = data?.estanterias;
  const codigosSIE = data?.codigosSIE;
  const cajas = data?.cajas;

  const itemOptions = useMemo(() => {
    const source = items ?? [];
    return [...source].sort((a, b) => {
      return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    });
  }, [items]);

  const estanteriasList = useMemo(() => estanterias ?? [], [estanterias]);
  const estanteriaOptions = useMemo(() => {
    return [...estanteriasList]
      .map((estanteria) => ({
        value: `${estanteria.piso}:${estanteria.codigo}`,
        codigo: estanteria.codigo,
        piso: estanteria.piso,
        label: estanteria.etiqueta || formatEstanteriaLabel(estanteria.piso, estanteria.codigo),
      }))
      .sort((a, b) => {
        if (a.piso !== b.piso) return a.piso - b.piso;
        return a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
      });
  }, [estanteriasList]);
  const estanteriaLabelByCode = useMemo(() => {
    const map = new Map<string, string>();
    for (const estanteria of estanteriasList) {
      if (!map.has(estanteria.codigo)) {
        map.set(estanteria.codigo, estanteria.etiqueta || formatEstanteriaLabel(estanteria.piso, estanteria.codigo));
      }
    }
    return map;
  }, [estanteriasList]);
  const codigosSIEList = codigosSIE ?? [];
  const cajasList = cajas ?? [];

  const [newItemNombre, setNewItemNombre] = useState("");
  const [newEstanteriaCodigo, setNewEstanteriaCodigo] = useState("");
  const [newEstanteriaPiso, setNewEstanteriaPiso] = useState("1");
  const [newCodigoSIE, setNewCodigoSIE] = useState("");
  const [newCodigoTalla, setNewCodigoTalla] = useState("");
  const [newCodigoItemId, setNewCodigoItemId] = useState("");
  const [editingCodigoOriginal, setEditingCodigoOriginal] = useState<string | null>(null);
  const [editCodigoSIE, setEditCodigoSIE] = useState("");
  const [editCodigoTalla, setEditCodigoTalla] = useState("");
  const [editCodigoItemId, setEditCodigoItemId] = useState("");
  const [newCajaCodigo, setNewCajaCodigo] = useState("");
  const [newCajaCantidad, setNewCajaCantidad] = useState("1");
  const [newCajaEstanteria, setNewCajaEstanteria] = useState("");
  const [newCajaItemIds, setNewCajaItemIds] = useState<string[]>([]);
  const [newCajaCodigosSIE, setNewCajaCodigosSIE] = useState<string[]>([]);
  const [cajaFiltro, setCajaFiltro] = useState("");
  const [cajaItemFiltro, setCajaItemFiltro] = useState("");
  const [showCreateCajaForm, setShowCreateCajaForm] = useState(false);
  const [massOrientation, setMassOrientation] = useState<EtiquetaOrientacion>("horizontal");

  const codigoItemIdValue = itemOptions.some((item) => item.itemId === newCodigoItemId)
    ? newCodigoItemId
    : (itemOptions[0]?.itemId ?? "");
  const cajaEstanteriaValue = estanteriaOptions.some((option) => option.value === newCajaEstanteria)
    ? newCajaEstanteria
    : (estanteriaOptions[0]?.value ?? "");

  const codigosSIEDisponibles = useMemo(
    () =>
      (codigosSIE ?? []).slice().sort((a, b) => {
        const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
        if (byCodigo !== 0) return byCodigo;
        return (a.talla ?? "").localeCompare(b.talla ?? "", "es", { sensitivity: "base" });
      }),
    [codigosSIE],
  );

  const codigosDisponiblesSet = useMemo(
    () => new Set(codigosSIEDisponibles.map((codigo) => codigo.codigo)),
    [codigosSIEDisponibles],
  );
  const codigoSIEItemByCodigo = useMemo(
    () => new Map(codigosSIEDisponibles.map((codigo) => [codigo.codigo, codigo.itemId])),
    [codigosSIEDisponibles],
  );
  const itemOptionById = useMemo(
    () => new Map(itemOptions.map((item) => [item.itemId, item])),
    [itemOptions],
  );
  const selectedCajaItemIds = useMemo(
    () => newCajaItemIds.filter((itemId) => itemOptionById.has(itemId)),
    [newCajaItemIds, itemOptionById],
  );
  const selectedCajaItemSet = useMemo(
    () => new Set(selectedCajaItemIds),
    [selectedCajaItemIds],
  );
  const selectedCajaItems = useMemo(
    () => itemOptions.filter((item) => selectedCajaItemSet.has(item.itemId)),
    [itemOptions, selectedCajaItemSet],
  );
  const filteredItemOptions = useMemo(() => {
    const filtro = cajaItemFiltro.trim().toLowerCase();
    if (!filtro) return itemOptions;
    return itemOptions.filter((item) =>
      item.nombre.toLowerCase().includes(filtro),
    );
  }, [itemOptions, cajaItemFiltro]);
  const allFilteredSelected = useMemo(
    () => filteredItemOptions.length > 0 && filteredItemOptions.every((item) => selectedCajaItemSet.has(item.itemId)),
    [filteredItemOptions, selectedCajaItemSet],
  );
  const codigosPorItemSeleccionado = useMemo(
    () =>
      selectedCajaItems.map((item) => ({
        itemId: item.itemId,
        itemNombre: item.nombre,
        codigos: codigosSIEDisponibles.filter((codigo) => codigo.itemId === item.itemId),
      })),
    [selectedCajaItems, codigosSIEDisponibles],
  );
  const codigosPorItemSeleccionadoMap = useMemo(
    () => new Map(codigosPorItemSeleccionado.map((entry) => [entry.itemId, entry])),
    [codigosPorItemSeleccionado],
  );

  const selectedCajaCodigosSIE = useMemo(
    () =>
      newCajaCodigosSIE.filter((codigo) => {
        if (!codigosDisponiblesSet.has(codigo)) return false;
        const itemId = codigoSIEItemByCodigo.get(codigo);
        return typeof itemId === "string" && selectedCajaItemSet.has(itemId);
      }),
    [newCajaCodigosSIE, codigosDisponiblesSet, codigoSIEItemByCodigo, selectedCajaItemSet],
  );
  const selectedCajaCodigosSet = useMemo(
    () => new Set(selectedCajaCodigosSIE),
    [selectedCajaCodigosSIE],
  );

  const cajasFiltradas = useMemo(() => {
    const source = cajas ?? [];
    const filtro = cajaFiltro.trim().toLowerCase();
    if (!filtro) return source;

    return source.filter((caja) => {
      const texto = [
        String(caja.codigoDepositoGeneral),
        caja.itemNombres.join(" "),
        caja.estanteria,
        caja.codigosSIE.map((codigo) => codigo.codigo).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(filtro);
    });
  }, [cajas, cajaFiltro]);

  function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombre = newItemNombre.trim();
    if (!nombre) return;
    onCreateItem({ nombre });
    setNewItemNombre("");
  }

  function handleCreateEstanteria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nombreEstanteria = normalizeEstanteriaName(newEstanteriaCodigo);
    const piso = Number(newEstanteriaPiso);
    if (!isValidEstanteriaName(nombreEstanteria) || !Number.isInteger(piso)) return;
    onCreateEstanteria(nombreEstanteria, piso);
    setNewEstanteriaCodigo("");
    setNewEstanteriaPiso("1");
  }

  function handleCreateCodigoSIE(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigo = normalizeCode(newCodigoSIE);
    const talla = normalizeCode(newCodigoTalla);
    const itemId = codigoItemIdValue.trim();
    if (!codigo || !itemId) return;
    onCreateCodigoSIE({ codigo, talla, itemId });
    setNewCodigoSIE("");
    setNewCodigoTalla("");
  }

  function toggleCodigoSIEEnCaja(codigo: string) {
    if (!codigosDisponiblesSet.has(codigo)) return;
    const itemId = codigoSIEItemByCodigo.get(codigo);
    if (!itemId || !selectedCajaItemSet.has(itemId)) return;
    setNewCajaCodigosSIE((prev) => {
      const normalized = prev.filter((entry) => codigosDisponiblesSet.has(entry));
      if (normalized.includes(codigo)) return normalized.filter((entry) => entry !== codigo);
      return [...normalized, codigo];
    });
  }

  function toggleItemEnCaja(itemId: string) {
    setNewCajaItemIds((prev) => {
      if (prev.includes(itemId)) {
        setNewCajaCodigosSIE((prevCodigos) =>
          prevCodigos.filter((codigo) => codigoSIEItemByCodigo.get(codigo) !== itemId),
        );
        return prev.filter((entry) => entry !== itemId);
      }
      return [...prev, itemId];
    });
  }

  function clearCodigosForItem(itemId: string) {
    setNewCajaCodigosSIE((prevCodigos) =>
      prevCodigos.filter((codigo) => codigoSIEItemByCodigo.get(codigo) !== itemId),
    );
  }

  function setFilteredItemsSelection(checked: boolean) {
    const filteredIds = filteredItemOptions.map((item) => item.itemId);
    if (filteredIds.length === 0) return;

    if (checked) {
      setNewCajaItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
      return;
    }

    const filteredSet = new Set(filteredIds);
    setNewCajaItemIds((prev) => prev.filter((itemId) => !filteredSet.has(itemId)));
    setNewCajaCodigosSIE((prevCodigos) =>
      prevCodigos.filter((codigo) => {
        const itemId = codigoSIEItemByCodigo.get(codigo);
        return !itemId || !filteredSet.has(itemId);
      }),
    );
  }

  function handleCreateCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigoDepositoGeneral = Number(newCajaCodigo);
    const cantidad = Number(newCajaCantidad);
    const estanteriaSeleccionada = estanteriaOptions.find((option) => option.value === cajaEstanteriaValue);
    const estanteria = normalizeEstanteriaName(estanteriaSeleccionada?.codigo ?? "");
    if (
      !Number.isInteger(codigoDepositoGeneral) ||
      !Number.isInteger(cantidad) ||
      !estanteriaSeleccionada ||
      !isValidEstanteriaName(estanteria) ||
      selectedCajaItemIds.length === 0
    ) return;
    onCreateCaja({
      codigoDepositoGeneral,
      cantidad,
      estanteria,
      itemIds: selectedCajaItemIds,
      codigosSIE: selectedCajaCodigosSIE,
    });
    setNewCajaCodigo("");
    setNewCajaCantidad("1");
    setNewCajaItemIds([]);
    setNewCajaCodigosSIE([]);
  }

  function confirmDeleteEstanteria(codigo: string, piso: number) {
    if (!window.confirm(`Se eliminará la ${formatEstanteriaLabel(piso, codigo)}.`)) return;
    onDeleteEstanteria(codigo, piso);
  }

  function confirmDeleteCodigoSIE(codigo: string) {
    if (!window.confirm(`Se eliminará el código SIE ${codigo}.`)) return;
    onDeleteCodigoSIE(codigo);
  }

  function startEditCodigoSIE(codigo: { codigo: string; talla: string | null; itemId: string }) {
    setEditingCodigoOriginal(codigo.codigo);
    setEditCodigoSIE(codigo.codigo);
    setEditCodigoTalla(codigo.talla ?? "");
    setEditCodigoItemId(codigo.itemId);
  }

  function cancelEditCodigoSIE() {
    setEditingCodigoOriginal(null);
    setEditCodigoSIE("");
    setEditCodigoTalla("");
    setEditCodigoItemId("");
  }

  function saveEditCodigoSIE() {
    if (!editingCodigoOriginal) return;
    const codigo = normalizeCode(editCodigoSIE);
    const talla = normalizeCode(editCodigoTalla);
    const itemId = editCodigoItemId.trim();
    if (!codigo || !itemId || !SIE_CODE_REGEX.test(codigo)) return;

    onUpdateCodigoSIE({
      originalCodigo: editingCodigoOriginal,
      codigo,
      talla,
      itemId,
    });
    cancelEditCodigoSIE();
  }

  function confirmDeleteCaja(codigoDepositoGeneral: number) {
    if (!window.confirm(`Se eliminará la caja ${codigoDepositoGeneral}.`)) return;
    onDeleteCaja(codigoDepositoGeneral);
  }

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{meta.title}</h2>
            <p className="mt-1 text-xs text-stone-600">{meta.description}</p>
            {data ? (
              <p className="mt-1 text-xs text-stone-500">
                Ultima actualizacion: {formatDateTimeForDisplay(data.generatedAt)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
          >
            {loading ? (
              <LoadingInline label="Recargando..." size="xs" textClassName="text-xs font-semibold text-stone-700" />
            ) : (
              "Recargar"
            )}
          </button>
        </div>
        {!canWrite ? (
          <p className="mt-3 rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs text-stone-700">
            Modo solo lectura: puedes consultar e imprimir etiquetas, pero no crear ni eliminar registros.
          </p>
        ) : null}
      </article>

      {loading && !data ? (
        <article className="ej-card rounded-2xl p-4">
          <LoadingInline label="Cargando modulo de etiquetado..." textClassName="text-sm font-medium text-stone-700" />
        </article>
      ) : null}

      {error ? (
        <article className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</article>
      ) : null}

      {section === "codigos_sie" ? (
        <div className="flex flex-col gap-4">
          <article className="ej-card order-2 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Registrar Equipo y Estanteria</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              <form onSubmit={handleCreateItem} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nuevo equipo</p>
                <label className="block">
                  <span className="block text-xs font-medium text-stone-700">Nombre del equipo *</span>
                  <input
                    value={newItemNombre}
                    onChange={(event) => setNewItemNombre(event.target.value)}
                    placeholder="Nuevo equipo"
                    disabled={!canWrite}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Los equipos creados aqui quedan ocultos en Hoja de Entrega. Puedes habilitarlos luego desde
                  Configuración &gt; Equipos.
                </p>
                <button
                  type="submit"
                  disabled={!canWrite || newItemNombre.trim() === ""}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Registrar equipo
                </button>
              </form>

              <form onSubmit={handleCreateEstanteria} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nueva estantería</p>
                <p className="text-xs text-stone-600">Formato: Nombre de estantería (A-Z) + piso.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-stone-700">
                    Piso
                    <select
                      value={newEstanteriaPiso}
                      onChange={(event) => setNewEstanteriaPiso(event.target.value)}
                      disabled={!canWrite}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="1">Piso 1</option>
                      <option value="2">Piso 2</option>
                    </select>
                  </label>
                  <label className="text-xs text-stone-700">
                    Nombre de estantería
                    <input
                      value={newEstanteriaCodigo}
                      onChange={(event) => setNewEstanteriaCodigo(normalizeEstanteriaName(event.target.value))}
                      placeholder="A"
                      maxLength={1}
                      disabled={!canWrite}
                      inputMode="text"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canWrite || !isValidEstanteriaName(newEstanteriaCodigo)}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Registrar estantería
                </button>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {estanteriasList.length === 0 ? (
                <p className="text-sm text-stone-600">No hay estanterías registradas.</p>
              ) : (
                estanteriasList.map((estanteria) => (
                  <div
                    key={`${estanteria.codigo}-${estanteria.piso}`}
                    className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                  >
                    <span>{estanteria.etiqueta || formatEstanteriaLabel(estanteria.piso, estanteria.codigo)}</span>
                    {canWrite ? (
                      <button
                        type="button"
                        onClick={() => confirmDeleteEstanteria(estanteria.codigo, estanteria.piso)}
                        className="rounded bg-rose-50 px-2 py-0.5 text-[11px] text-rose-700 hover:bg-rose-100"
                      >
                        Borrar
                      </button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="ej-card order-1 rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Registrar Codigo SIE</h3>
            <p className="mt-1 text-xs text-stone-600">
              El código SIE se registra primero. Si hubo un error de digitado, usa &quot;Editar código&quot; en la tabla.
            </p>
            <form onSubmit={handleCreateCodigoSIE} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
              <input
                value={newCodigoSIE}
                onChange={(event) => setNewCodigoSIE(event.target.value)}
                placeholder="00005450 o ABC12"
                disabled={!canWrite}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <input
                value={newCodigoTalla}
                onChange={(event) => setNewCodigoTalla(event.target.value)}
                placeholder="Talla (opcional)"
                disabled={!canWrite}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <select
                value={codigoItemIdValue}
                onChange={(event) => setNewCodigoItemId(event.target.value)}
                disabled={!canWrite || itemOptions.length === 0}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {itemOptions.length === 0 ? <option value="">Sin items</option> : null}
                {itemOptions.map((item) => (
                  <option key={`sie-item-${item.itemId}`} value={item.itemId}>
                    {item.nombre}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={!canWrite || newCodigoSIE.trim() === "" || codigoItemIdValue.trim() === ""}
                className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                Registrar código
              </button>
            </form>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-700">Codigo SIE</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-700">Talla</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-700">Item</th>
                    <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {codigosSIEList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-sm text-stone-600">
                        No hay códigos SIE registrados.
                      </td>
                    </tr>
                  ) : (
                    codigosSIEList.map((codigo) => (
                      <tr key={`sie-row-${codigo.codigo}`} className="bg-white">
                        <td className="border-b border-stone-100 px-3 py-2 font-semibold text-stone-900">
                          {editingCodigoOriginal === codigo.codigo ? (
                            <input
                              value={editCodigoSIE}
                              onChange={(event) => setEditCodigoSIE(event.target.value.toUpperCase())}
                              maxLength={8}
                              disabled={!canWrite}
                              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                            />
                          ) : (
                            codigo.codigo
                          )}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-700">
                          {editingCodigoOriginal === codigo.codigo ? (
                            <input
                              value={editCodigoTalla}
                              onChange={(event) => setEditCodigoTalla(event.target.value.toUpperCase())}
                              disabled={!canWrite}
                              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                            />
                          ) : (
                            (codigo.talla ?? "-")
                          )}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-700">
                          {editingCodigoOriginal === codigo.codigo ? (
                            <select
                              value={editCodigoItemId}
                              onChange={(event) => setEditCodigoItemId(event.target.value)}
                              disabled={!canWrite || itemOptions.length === 0}
                              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                            >
                              {itemOptions.map((item) => (
                                <option key={`sie-item-edit-${codigo.codigo}-${item.itemId}`} value={item.itemId}>
                                  {item.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            codigo.itemNombre
                          )}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-right">
                          {canWrite ? (
                            editingCodigoOriginal === codigo.codigo ? (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={saveEditCodigoSIE}
                                  disabled={
                                    editCodigoSIE.trim() === "" ||
                                    editCodigoItemId.trim() === "" ||
                                    !SIE_CODE_REGEX.test(normalizeCode(editCodigoSIE))
                                  }
                                  className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditCodigoSIE}
                                  className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditCodigoSIE(codigo)}
                                  className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                                >
                                  Editar código
                                </button>
                                <button
                                  type="button"
                                  onClick={() => confirmDeleteCodigoSIE(codigo.codigo)}
                                  className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                                >
                                  Borrar
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-xs text-stone-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}

      {section === "listado_cajas" ? (
        <article className="ej-card rounded-2xl p-4">
          {canWrite ? (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => setShowCreateCajaForm((prev) => !prev)}
                className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors sm:w-auto sm:min-w-[13rem] ${
                  showCreateCajaForm
                    ? "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                    : "ej-button"
                }`}
              >
                {showCreateCajaForm ? "Ocultar registro" : "Registrar caja"}
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900">Cajas registradas</h3>
            <label className="w-full max-w-xs text-xs text-stone-700">
              Buscar caja
              <input
                value={cajaFiltro}
                onChange={(event) => setCajaFiltro(event.target.value)}
                placeholder="Código, equipo, nombre de estantería o código SIE"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {canWrite && showCreateCajaForm ? (
            <form onSubmit={handleCreateCaja} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs text-stone-700">
                  Codigo Dep. Gral.
                  <input
                    type="number"
                    min={1}
                    value={newCajaCodigo}
                    onChange={(event) => setNewCajaCodigo(event.target.value)}
                    disabled={!canWrite}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-stone-700">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    value={newCajaCantidad}
                    onChange={(event) => setNewCajaCantidad(event.target.value)}
                    disabled={!canWrite}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-stone-700">
                  Estanteria
                  <select
                    value={cajaEstanteriaValue}
                    onChange={(event) => setNewCajaEstanteria(event.target.value)}
                    disabled={!canWrite || estanteriaOptions.length === 0}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    {estanteriaOptions.length === 0 ? <option value="">Sin estanterías</option> : null}
                    {estanteriaOptions.map((estanteria) => (
                      <option key={`caja-estanteria-${estanteria.value}`} value={estanteria.value}>
                        {estanteria.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="rounded-xl border border-stone-200 bg-white p-3">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                        Equipos de la caja
                      </p>
                      <p className="text-[11px] text-stone-600">
                        Seleccionados: {selectedCajaItemIds.length}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFilteredItemsSelection(!allFilteredSelected)}
                        disabled={!canWrite || filteredItemOptions.length === 0}
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
                      >
                        {allFilteredSelected ? "Quitar filtrados" : "Seleccionar filtrados"}
                      </button>
                    </div>
                  </div>

                  <input
                    value={cajaItemFiltro}
                    onChange={(event) => setCajaItemFiltro(event.target.value)}
                    placeholder="Buscar equipo por nombre"
                    className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />

                  {itemOptions.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-600">No hay equipos registrados.</p>
                  ) : filteredItemOptions.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-600">No hay equipos para ese filtro.</p>
                  ) : (
                    <div className="mt-2 max-h-80 space-y-1 overflow-y-auto pr-1">
                      {filteredItemOptions.map((item) => {
                        const checked = selectedCajaItemSet.has(item.itemId);
                        return (
                          <label
                            key={`caja-item-${item.itemId}`}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                              checked ? "border-blue-300 bg-blue-50 text-blue-900" : "border-stone-300 bg-white text-stone-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canWrite}
                              onChange={() => toggleItemEnCaja(item.itemId)}
                            />
                            <span className="font-medium">{item.nombre}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-stone-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Códigos SIE por equipo
                  </p>
                  <p className="text-[11px] text-stone-600">
                    Para cada equipo, selecciona códigos o deja activo &quot;Sin código&quot;.
                  </p>
                  {selectedCajaItems.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-600">Selecciona equipos para configurar códigos.</p>
                  ) : (
                    <div className="mt-2 max-h-80 space-y-2 overflow-y-auto pr-1">
                      {selectedCajaItems.map((item) => {
                        const entry = codigosPorItemSeleccionadoMap.get(item.itemId);
                        const codigos = entry?.codigos ?? [];
                        const selectedCodesForItem = codigos.filter((codigo) => selectedCajaCodigosSet.has(codigo.codigo));
                        const hasSelectedCodes = selectedCodesForItem.length > 0;
                        return (
                          <div key={`caja-item-codigos-${item.itemId}`} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-stone-800">{item.nombre}</p>
                              <button
                                type="button"
                                onClick={() => toggleItemEnCaja(item.itemId)}
                                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100"
                              >
                                Quitar
                              </button>
                            </div>

                            {codigos.length === 0 ? (
                              <p className="mt-2 text-xs text-stone-600">Sin códigos registrados. Quedará S/Código.</p>
                            ) : (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => clearCodigosForItem(item.itemId)}
                                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                    hasSelectedCodes
                                      ? "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                                      : "border-emerald-300 bg-emerald-50 text-emerald-800"
                                  }`}
                                >
                                  Sin código
                                </button>
                                {codigos.map((codigo) => {
                                  const checked = selectedCajaCodigosSet.has(codigo.codigo);
                                  return (
                                    <button
                                      key={`caja-codigo-${item.itemId}-${codigo.codigo}`}
                                      type="button"
                                      onClick={() => toggleCodigoSIEEnCaja(codigo.codigo)}
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                        checked
                                          ? "border-blue-300 bg-blue-50 text-blue-900"
                                          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                                      }`}
                                    >
                                      {codigo.codigo}
                                      {codigo.talla ? ` (${codigo.talla})` : ""}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    !canWrite ||
                    newCajaCodigo.trim() === "" ||
                    newCajaCantidad.trim() === "" ||
                    selectedCajaItemIds.length === 0 ||
                    cajaEstanteriaValue.trim() === ""
                  }
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Crear caja
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-3 space-y-2">
            {cajasFiltradas.length === 0 ? (
              <p className="text-sm text-stone-600">No hay cajas que coincidan con el filtro.</p>
            ) : (
              cajasFiltradas.map((caja) => (
                <div key={`caja-${caja.codigoDepositoGeneral}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Caja {caja.codigoDepositoGeneral}</p>
                      <p className="text-xs text-stone-600">
                        {caja.itemNombres.length > 0 ? caja.itemNombres.join(", ") : "Sin equipos asociados por código SIE"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {renderTag(`Cantidad ${caja.cantidad}`, "accent")}
                        {renderTag(estanteriaLabelByCode.get(caja.estanteria) ?? `Estantería ${caja.estanteria}`)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onPrintCaja(caja.codigoDepositoGeneral, "horizontal")}
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Imprimir H
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintCaja(caja.codigoDepositoGeneral, "vertical")}
                        className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Imprimir V
                      </button>
                      {canWrite ? (
                        <button
                          type="button"
                          onClick={() => confirmDeleteCaja(caja.codigoDepositoGeneral)}
                          className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-stone-700">
                    <p>
                      <span className="font-semibold">Equipos / Códigos:</span>{" "}
                      {caja.equipos.length === 0
                        ? "-"
                        : caja.equipos
                            .map((equipo) => {
                              if (equipo.sinCodigo || equipo.codigosSIE.length === 0) {
                                return `${equipo.itemNombre}: S/Codigo`;
                              }
                              const codigosEquipo = equipo.codigosSIE
                                .map((codigo) => `${codigo.codigo}${codigo.talla ? ` (${codigo.talla})` : ""}`)
                                .join(", ");
                              return `${equipo.itemNombre}: ${codigosEquipo}`;
                            })
                            .join(" | ")}
                    </p>
                    <p>
                      <span className="font-semibold">Talles:</span> {caja.tallas.length > 0 ? caja.tallas.join(", ") : "-"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      ) : null}

      {section === "imprimir_todas" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Impresion masiva</h3>
          <p className="mt-1 text-xs text-stone-600">
            Se imprimiran {cajasList.length} etiqueta(s), una por hoja A4.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMassOrientation("horizontal")}
              className={`rounded px-3 py-2 text-xs font-semibold ${
                massOrientation === "horizontal"
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Horizontal
            </button>
            <button
              type="button"
              onClick={() => setMassOrientation("vertical")}
              className={`rounded px-3 py-2 text-xs font-semibold ${
                massOrientation === "vertical"
                  ? "bg-stone-900 text-white"
                  : "border border-stone-300 bg-white text-stone-700"
              }`}
            >
              Vertical
            </button>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => onPrintTodas(massOrientation)}
              disabled={cajasList.length === 0}
              className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
            >
              Imprimir todas las etiquetas
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
