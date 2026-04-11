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
  allowDuplicateCodigo?: boolean;
};

type UpdateCodigoSIEInput = {
  originalCodigoSIEId: string;
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
  estanteria: string;
  items: Array<{
    itemId: string;
    cantidad: number;
  }>;
  codigosSIEIds: string[];
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
  onDeleteCodigoSIE: (codigoSIEId: string, codigo: string) => void;
  onCreateCaja: (input: CreateCajaInput) => void;
  onDeleteCaja: (codigoDepositoGeneral: number) => void;
  onPrintCaja: (codigoDepositoGeneral: number, orientacion: EtiquetaOrientacion) => void;
  onPrintListadoCajas: () => void;
  onPrintTodas: (cajas: Array<{ codigoDepositoGeneral: number; orientacion: EtiquetaOrientacion }>) => void;
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
  onPrintListadoCajas,
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
  const codigosSIEList = useMemo(() => codigosSIE ?? [], [codigosSIE]);
  const cajasList = useMemo(() => cajas ?? [], [cajas]);

  const [newItemNombre, setNewItemNombre] = useState("");
  const [newEstanteriaCodigo, setNewEstanteriaCodigo] = useState("");
  const [newEstanteriaPiso, setNewEstanteriaPiso] = useState("1");
  const [newCodigoSIE, setNewCodigoSIE] = useState("");
  const [newCodigoTalla, setNewCodigoTalla] = useState("");
  const [newCodigoItemId, setNewCodigoItemId] = useState("");
  const [editingCodigoSIEId, setEditingCodigoSIEId] = useState<string | null>(null);
  const [editCodigoSIE, setEditCodigoSIE] = useState("");
  const [editCodigoTalla, setEditCodigoTalla] = useState("");
  const [editCodigoItemId, setEditCodigoItemId] = useState("");
  const [newCajaCodigo, setNewCajaCodigo] = useState("");
  const [newCajaCantidadByItemId, setNewCajaCantidadByItemId] = useState<Record<string, string>>({});
  const [newCajaEstanteria, setNewCajaEstanteria] = useState("");
  const [newCajaItemIds, setNewCajaItemIds] = useState<string[]>([]);
  const [newCajaCodigosSIEIds, setNewCajaCodigosSIEIds] = useState<string[]>([]);
  const [cajaFiltro, setCajaFiltro] = useState("");
  const [cajaItemFiltro, setCajaItemFiltro] = useState("");
  const [showCreateCajaForm, setShowCreateCajaForm] = useState(false);
  const [massOrientationByCodigo, setMassOrientationByCodigo] = useState<Record<number, EtiquetaOrientacion>>({});

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
    () => new Set(codigosSIEDisponibles.map((codigo) => codigo.codigoSIEId)),
    [codigosSIEDisponibles],
  );
  const codigoSIEItemById = useMemo(
    () => new Map(codigosSIEDisponibles.map((codigo) => [codigo.codigoSIEId, codigo.itemId])),
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
  const selectedCajaItemsConCantidadDraft = useMemo(
    () =>
      selectedCajaItemIds.map((itemId) => {
        const raw = (newCajaCantidadByItemId[itemId] ?? "1").trim();
        const cantidad = Number(raw);
        const valid = Number.isInteger(cantidad) && cantidad > 0;
        return {
          itemId,
          raw,
          cantidad: valid ? cantidad : 0,
          valid,
        };
      }),
    [newCajaCantidadByItemId, selectedCajaItemIds],
  );
  const cantidadCajaCalculada = useMemo(
    () => selectedCajaItemsConCantidadDraft.reduce((sum, item) => sum + item.cantidad, 0),
    [selectedCajaItemsConCantidadDraft],
  );
  const allSelectedItemsHaveValidCantidad = useMemo(
    () => selectedCajaItemsConCantidadDraft.every((item) => item.valid),
    [selectedCajaItemsConCantidadDraft],
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

  const selectedCajaCodigosSIEIds = useMemo(
    () =>
      newCajaCodigosSIEIds.filter((codigoSIEId) => {
        if (!codigosDisponiblesSet.has(codigoSIEId)) return false;
        const itemId = codigoSIEItemById.get(codigoSIEId);
        return typeof itemId === "string" && selectedCajaItemSet.has(itemId);
      }),
    [newCajaCodigosSIEIds, codigosDisponiblesSet, codigoSIEItemById, selectedCajaItemSet],
  );
  const selectedCajaCodigosSet = useMemo(
    () => new Set(selectedCajaCodigosSIEIds),
    [selectedCajaCodigosSIEIds],
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

  const massPrintCodes = useMemo(
    () => cajasList.map((caja) => caja.codigoDepositoGeneral),
    [cajasList],
  );

  function getMassOrientation(codigoDepositoGeneral: number): EtiquetaOrientacion {
    return massOrientationByCodigo[codigoDepositoGeneral] ?? "horizontal";
  }

  function setMassOrientation(codigoDepositoGeneral: number, orientacion: EtiquetaOrientacion) {
    setMassOrientationByCodigo((previous) => {
      if (previous[codigoDepositoGeneral] === orientacion) return previous;
      return {
        ...previous,
        [codigoDepositoGeneral]: orientacion,
      };
    });
  }

  function setMassOrientationForAll(orientacion: EtiquetaOrientacion) {
    setMassOrientationByCodigo((previous) => {
      const next: Record<number, EtiquetaOrientacion> = { ...previous };
      for (const codigo of massPrintCodes) {
        next[codigo] = orientacion;
      }
      return next;
    });
  }

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
    const tallaNormalizada = talla.length > 0 ? talla : "-";
    const duplicateTupleExists = codigosSIEList.some(
      (entry) => entry.codigo === codigo && entry.talla === tallaNormalizada && entry.itemId === itemId,
    );
    if (duplicateTupleExists) {
      window.alert("Ya existe un codigo SIE con la misma combinacion de codigo, talla e item.");
      return;
    }

    const sameCodeEntries = codigosSIEList.filter((entry) => entry.codigo === codigo);
    const allowDuplicateCodigo = sameCodeEntries.length > 0
      ? window.confirm(`El codigo SIE ${codigo} ya existe (${sameCodeEntries.length} registro(s)). Deseas registrarlo igualmente?`)
      : false;
    if (sameCodeEntries.length > 0 && !allowDuplicateCodigo) return;

    onCreateCodigoSIE({ codigo, talla, itemId, allowDuplicateCodigo });
    setNewCodigoSIE("");
    setNewCodigoTalla("");
  }

  function toggleCodigoSIEEnCaja(codigoSIEId: string) {
    if (!codigosDisponiblesSet.has(codigoSIEId)) return;
    const itemId = codigoSIEItemById.get(codigoSIEId);
    if (!itemId || !selectedCajaItemSet.has(itemId)) return;
    setNewCajaCodigosSIEIds((prev) => {
      const normalized = prev.filter((entry) => codigosDisponiblesSet.has(entry));
      if (normalized.includes(codigoSIEId)) return normalized.filter((entry) => entry !== codigoSIEId);
      return [...normalized, codigoSIEId];
    });
  }

  function toggleItemEnCaja(itemId: string) {
    setNewCajaItemIds((prev) => {
      if (prev.includes(itemId)) {
        setNewCajaCodigosSIEIds((prevCodigos) =>
          prevCodigos.filter((codigoSIEId) => codigoSIEItemById.get(codigoSIEId) !== itemId),
        );
        setNewCajaCantidadByItemId((prevCantidades) => {
          const next = { ...prevCantidades };
          delete next[itemId];
          return next;
        });
        return prev.filter((entry) => entry !== itemId);
      }
      setNewCajaCantidadByItemId((prevCantidades) =>
        prevCantidades[itemId] ? prevCantidades : { ...prevCantidades, [itemId]: "1" },
      );
      return [...prev, itemId];
    });
  }

  function updateCantidadForItem(itemId: string, value: string) {
    const normalized = value.replace(/[^\d]/g, "");
    setNewCajaCantidadByItemId((prev) => ({ ...prev, [itemId]: normalized }));
  }

  function clearCodigosForItem(itemId: string) {
    setNewCajaCodigosSIEIds((prevCodigos) =>
      prevCodigos.filter((codigoSIEId) => codigoSIEItemById.get(codigoSIEId) !== itemId),
    );
  }

  function setFilteredItemsSelection(checked: boolean) {
    const filteredIds = filteredItemOptions.map((item) => item.itemId);
    if (filteredIds.length === 0) return;

    if (checked) {
      setNewCajaItemIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
      setNewCajaCantidadByItemId((prev) => {
        const next = { ...prev };
        for (const itemId of filteredIds) {
          if (!next[itemId]) next[itemId] = "1";
        }
        return next;
      });
      return;
    }

    const filteredSet = new Set(filteredIds);
    setNewCajaItemIds((prev) => prev.filter((itemId) => !filteredSet.has(itemId)));
    setNewCajaCantidadByItemId((prev) => {
      const next = { ...prev };
      for (const itemId of filteredIds) {
        delete next[itemId];
      }
      return next;
    });
    setNewCajaCodigosSIEIds((prevCodigos) =>
      prevCodigos.filter((codigoSIEId) => {
        const itemId = codigoSIEItemById.get(codigoSIEId);
        return !itemId || !filteredSet.has(itemId);
      }),
    );
  }

  function handleCreateCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigoDepositoGeneral = Number(newCajaCodigo);
    const estanteriaSeleccionada = estanteriaOptions.find((option) => option.value === cajaEstanteriaValue);
    const estanteria = normalizeEstanteriaName(estanteriaSeleccionada?.codigo ?? "");
    const itemsPayload = selectedCajaItemsConCantidadDraft.map((item) => ({
      itemId: item.itemId,
      cantidad: item.cantidad,
    }));
    if (
      !Number.isInteger(codigoDepositoGeneral) ||
      !estanteriaSeleccionada ||
      !isValidEstanteriaName(estanteria) ||
      itemsPayload.length === 0 ||
      !allSelectedItemsHaveValidCantidad
    ) return;
    onCreateCaja({
      codigoDepositoGeneral,
      estanteria,
      items: itemsPayload,
      codigosSIEIds: selectedCajaCodigosSIEIds,
    });
    setNewCajaCodigo("");
    setNewCajaCantidadByItemId({});
    setNewCajaItemIds([]);
    setNewCajaCodigosSIEIds([]);
  }

  function confirmDeleteEstanteria(codigo: string, piso: number) {
    if (!window.confirm(`Se eliminará la ${formatEstanteriaLabel(piso, codigo)}.`)) return;
    onDeleteEstanteria(codigo, piso);
  }

  function confirmDeleteCodigoSIE(codigoSIEId: string, codigo: string) {
    if (!window.confirm(`Se eliminará el código SIE ${codigo}.`)) return;
    onDeleteCodigoSIE(codigoSIEId, codigo);
  }

  function startEditCodigoSIE(codigo: { codigoSIEId: string; codigo: string; talla: string; itemId: string }) {
    setEditingCodigoSIEId(codigo.codigoSIEId);
    setEditCodigoSIE(codigo.codigo);
    setEditCodigoTalla(codigo.talla === "-" ? "" : codigo.talla);
    setEditCodigoItemId(codigo.itemId);
  }

  function cancelEditCodigoSIE() {
    setEditingCodigoSIEId(null);
    setEditCodigoSIE("");
    setEditCodigoTalla("");
    setEditCodigoItemId("");
  }

  function saveEditCodigoSIE() {
    if (!editingCodigoSIEId) return;
    const originalCodigo = codigosSIEList.find((entry) => entry.codigoSIEId === editingCodigoSIEId)?.codigo ?? null;
    if (!originalCodigo) return;
    const codigo = normalizeCode(editCodigoSIE);
    const talla = normalizeCode(editCodigoTalla);
    const itemId = editCodigoItemId.trim();
    if (!codigo || !itemId || !SIE_CODE_REGEX.test(codigo)) return;

    onUpdateCodigoSIE({
      originalCodigoSIEId: editingCodigoSIEId,
      originalCodigo,
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
                Última actualización: {formatDateTimeForDisplay(data.generatedAt)}
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
                      <tr key={`sie-row-${codigo.codigoSIEId}`} className="bg-white">
                        <td className="border-b border-stone-100 px-3 py-2 font-semibold text-stone-900">
                          {editingCodigoSIEId === codigo.codigoSIEId ? (
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
                          {editingCodigoSIEId === codigo.codigoSIEId ? (
                            <input
                              value={editCodigoTalla}
                              onChange={(event) => setEditCodigoTalla(event.target.value.toUpperCase())}
                              disabled={!canWrite}
                              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                            />
                          ) : (
                            codigo.talla
                          )}
                        </td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-700">
                          {editingCodigoSIEId === codigo.codigoSIEId ? (
                            <select
                              value={editCodigoItemId}
                              onChange={(event) => setEditCodigoItemId(event.target.value)}
                              disabled={!canWrite || itemOptions.length === 0}
                              className="w-full rounded border border-stone-300 px-2 py-1 text-sm"
                            >
                              {itemOptions.map((item) => (
                                <option key={`sie-item-edit-${codigo.codigoSIEId}-${item.itemId}`} value={item.itemId}>
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
                            editingCodigoSIEId === codigo.codigoSIEId ? (
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
                                  onClick={() => confirmDeleteCodigoSIE(codigo.codigoSIEId, codigo.codigo)}
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
            <div className="flex w-full flex-wrap items-end justify-end gap-2 md:w-auto">
              <button
                type="button"
                onClick={onPrintListadoCajas}
                disabled={cajasList.length === 0}
                className="rounded border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-60"
              >
                Imprimir listado
              </button>
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
                  Cantidad (calculada)
                  <input
                    type="number"
                    min={0}
                    value={String(cantidadCajaCalculada)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title="Se calcula automaticamente segun los equipos seleccionados."
                    className="pointer-events-none mt-1 w-full rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-semibold text-stone-700 shadow-inner focus:border-stone-300 focus:shadow-none focus:translate-y-0"
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
                        const selectedCodesForItem = codigos.filter((codigo) => selectedCajaCodigosSet.has(codigo.codigoSIEId));
                        const hasSelectedCodes = selectedCodesForItem.length > 0;
                        return (
                          <div key={`caja-item-codigos-${item.itemId}`} className="rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-stone-800">{item.nombre}</p>
                                <label className="mt-1 block text-[11px] font-medium text-stone-600">
                                  Cantidad del equipo
                                  <input
                                    type="number"
                                    min={1}
                                    value={newCajaCantidadByItemId[item.itemId] ?? "1"}
                                    onChange={(event) => updateCantidadForItem(item.itemId, event.target.value)}
                                    className="mt-1 w-28 rounded border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700"
                                  />
                                </label>
                              </div>
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
                                  const checked = selectedCajaCodigosSet.has(codigo.codigoSIEId);
                                  return (
                                    <button
                                      key={`caja-codigo-${item.itemId}-${codigo.codigoSIEId}`}
                                      type="button"
                                      onClick={() => toggleCodigoSIEEnCaja(codigo.codigoSIEId)}
                                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                        checked
                                          ? "border-blue-300 bg-blue-50 text-blue-900"
                                          : "border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                                      }`}
                                    >
                                      {codigo.codigo}
                                      {codigo.talla !== "-" ? ` (${codigo.talla})` : ""}
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
                    selectedCajaItemIds.length === 0 ||
                    cajaEstanteriaValue.trim() === "" ||
                    !allSelectedItemsHaveValidCantidad
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
                                return `${equipo.itemNombre} x${equipo.cantidad}: S/Codigo`;
                              }
                              const codigosEquipo = equipo.codigosSIE
                                .map((codigo) => `${codigo.codigo}${codigo.talla !== "-" ? ` (${codigo.talla})` : ""}`)
                                .join(", ");
                              return `${equipo.itemNombre} x${equipo.cantidad}: ${codigosEquipo}`;
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

          {massPrintCodes.length > 0 ? (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Orientacion de etiquetas</p>
              </div>
              <p className="mt-1 text-[11px] text-stone-600">
                Define la orientacion por caja: puedes mezclar horizontal y vertical en una misma impresion.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMassOrientationForAll("horizontal")}
                  className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Todas Horizontal
                </button>
                <button
                  type="button"
                  onClick={() => setMassOrientationForAll("vertical")}
                  className="rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Todas Vertical
                </button>
              </div>
              <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
                {cajasList.map((caja) => {
                  const orientacionCaja = getMassOrientation(caja.codigoDepositoGeneral);
                  return (
                    <div
                      key={`mass-print-orientacion-${caja.codigoDepositoGeneral}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-stone-900">Caja {caja.codigoDepositoGeneral}</p>
                        <p className="truncate text-xs text-stone-600">
                          {estanteriaLabelByCode.get(caja.estanteria) ?? `Estanteria ${caja.estanteria}`} | Cantidad {caja.cantidad}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setMassOrientation(caja.codigoDepositoGeneral, "horizontal")}
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            orientacionCaja === "horizontal"
                              ? "bg-stone-900 text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          H
                        </button>
                        <button
                          type="button"
                          onClick={() => setMassOrientation(caja.codigoDepositoGeneral, "vertical")}
                          className={`rounded px-2 py-1 text-xs font-semibold ${
                            orientacionCaja === "vertical"
                              ? "bg-stone-900 text-white"
                              : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          V
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() =>
                onPrintTodas(
                  cajasList.map((caja) => ({
                    codigoDepositoGeneral: caja.codigoDepositoGeneral,
                    orientacion: getMassOrientation(caja.codigoDepositoGeneral),
                  })),
                )
              }
              disabled={massPrintCodes.length === 0}
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
