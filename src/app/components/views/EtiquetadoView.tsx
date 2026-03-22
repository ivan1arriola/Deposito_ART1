"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { LoadingInline } from "@/app/components/shared";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";

export type EtiquetadoSection =
  | "codigos_sie"
  | "registrar_caja"
  | "listado_cajas"
  | "imprimir_todas";

type EtiquetaOrientacion = "horizontal" | "vertical";

type CreateCodigoSIEInput = {
  codigo: string;
  talla: string;
  itemId: string;
};

type CreateItemInput = {
  nombre: string;
  activo: boolean;
};

type CreateCajaInput = {
  codigoDepositoGeneral: number;
  itemId: string;
  cantidad: number;
  estanteria: string;
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
  onDeleteCodigoSIE: (codigo: string) => void;
  onCreateCaja: (input: CreateCajaInput) => void;
  onDeleteCaja: (codigoDepositoGeneral: number) => void;
  onPrintCaja: (codigoDepositoGeneral: number, orientacion: EtiquetaOrientacion) => void;
  onPrintTodas: (orientacion: EtiquetaOrientacion) => void;
};

const SECTION_META: Record<EtiquetadoSection, { title: string; description: string }> = {
  codigos_sie: {
    title: "Codigos SIE",
    description: "Registra equipos, codigos SIE y estanterias para su vinculacion.",
  },
  registrar_caja: {
    title: "Registrar Caja",
    description: "Crea nuevas cajas indicando item, cantidad, ubicacion y codigos SIE asociados.",
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

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
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
  const activeItems = itemOptions.filter((item) => item.activo);

  const estanteriaCodes = useMemo(() => {
    const source = estanterias ?? [];
    return Array.from(new Set(source.map((estanteria) => estanteria.codigo))).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
  }, [estanterias]);
  const estanteriasList = estanterias ?? [];
  const codigosSIEList = codigosSIE ?? [];
  const cajasList = cajas ?? [];

  const [newItemNombre, setNewItemNombre] = useState("");
  const [newItemActivo, setNewItemActivo] = useState(true);
  const [newEstanteriaCodigo, setNewEstanteriaCodigo] = useState("");
  const [newEstanteriaPiso, setNewEstanteriaPiso] = useState("1");
  const [newCodigoSIE, setNewCodigoSIE] = useState("");
  const [newCodigoTalla, setNewCodigoTalla] = useState("");
  const [newCodigoItemId, setNewCodigoItemId] = useState("");
  const [newCajaCodigo, setNewCajaCodigo] = useState("");
  const [newCajaItemId, setNewCajaItemId] = useState("");
  const [newCajaCantidad, setNewCajaCantidad] = useState("1");
  const [newCajaEstanteria, setNewCajaEstanteria] = useState("");
  const [newCajaCodigosSIE, setNewCajaCodigosSIE] = useState<string[]>([]);
  const [cajaFiltro, setCajaFiltro] = useState("");
  const [massOrientation, setMassOrientation] = useState<EtiquetaOrientacion>("horizontal");

  const codigoItemIdValue = itemOptions.some((item) => item.itemId === newCodigoItemId)
    ? newCodigoItemId
    : (itemOptions[0]?.itemId ?? "");
  const cajaItemIdValue = itemOptions.some((item) => item.itemId === newCajaItemId)
    ? newCajaItemId
    : (itemOptions[0]?.itemId ?? "");
  const cajaEstanteriaValue = estanteriaCodes.includes(newCajaEstanteria)
    ? newCajaEstanteria
    : (estanteriaCodes[0] ?? "");

  const codigosSIEDelItemSeleccionado = useMemo(
    () =>
      (codigosSIE ?? []).filter((codigo) => codigo.itemId === cajaItemIdValue).sort((a, b) => {
        const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
        if (byCodigo !== 0) return byCodigo;
        return (a.talla ?? "").localeCompare(b.talla ?? "", "es", { sensitivity: "base" });
      }),
    [codigosSIE, cajaItemIdValue],
  );

  const codigosDisponiblesSet = useMemo(
    () => new Set(codigosSIEDelItemSeleccionado.map((codigo) => codigo.codigo)),
    [codigosSIEDelItemSeleccionado],
  );

  const selectedCajaCodigosSIE = useMemo(
    () => newCajaCodigosSIE.filter((codigo) => codigosDisponiblesSet.has(codigo)),
    [newCajaCodigosSIE, codigosDisponiblesSet],
  );

  const cajasFiltradas = useMemo(() => {
    const source = cajas ?? [];
    const filtro = cajaFiltro.trim().toLowerCase();
    if (!filtro) return source;

    return source.filter((caja) => {
      const texto = [
        String(caja.codigoDepositoGeneral),
        caja.itemNombre,
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
    onCreateItem({ nombre, activo: newItemActivo });
    setNewItemNombre("");
    setNewItemActivo(true);
  }

  function handleCreateEstanteria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigo = normalizeCode(newEstanteriaCodigo);
    const piso = Number(newEstanteriaPiso);
    if (!codigo || !Number.isInteger(piso)) return;
    onCreateEstanteria(codigo, piso);
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
    setNewCajaCodigosSIE((prev) => {
      const normalized = prev.filter((entry) => codigosDisponiblesSet.has(entry));
      if (normalized.includes(codigo)) return normalized.filter((entry) => entry !== codigo);
      return [...normalized, codigo];
    });
  }

  function handleCreateCaja(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const codigoDepositoGeneral = Number(newCajaCodigo);
    const cantidad = Number(newCajaCantidad);
    const itemId = cajaItemIdValue.trim();
    const estanteria = normalizeCode(cajaEstanteriaValue);
    if (!Number.isInteger(codigoDepositoGeneral) || !Number.isInteger(cantidad) || !itemId || !estanteria) return;
    onCreateCaja({
      codigoDepositoGeneral,
      itemId,
      cantidad,
      estanteria,
      codigosSIE: selectedCajaCodigosSIE,
    });
    setNewCajaCodigo("");
    setNewCajaCantidad("1");
    setNewCajaCodigosSIE([]);
  }

  function confirmDeleteEstanteria(codigo: string, piso: number) {
    if (!window.confirm(`Se eliminara la estanteria ${codigo}${piso}.`)) return;
    onDeleteEstanteria(codigo, piso);
  }

  function confirmDeleteCodigoSIE(codigo: string) {
    if (!window.confirm(`Se eliminara el codigo SIE ${codigo}.`)) return;
    onDeleteCodigoSIE(codigo);
  }

  function confirmDeleteCaja(codigoDepositoGeneral: number) {
    if (!window.confirm(`Se eliminara la caja ${codigoDepositoGeneral}.`)) return;
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
        <>
          <article className="ej-card rounded-2xl p-4">
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
                <label className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    checked={newItemActivo}
                    onChange={(event) => setNewItemActivo(event.target.checked)}
                    disabled={!canWrite}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  <span className="text-sm font-medium text-stone-700">Aparece en Hoja de Entrega</span>
                </label>
                <button
                  type="submit"
                  disabled={!canWrite || newItemNombre.trim() === ""}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Registrar equipo
                </button>
              </form>

              <form onSubmit={handleCreateEstanteria} className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Nueva estanteria</p>
                <p className="text-xs text-stone-600">Formato: Piso + Codigo (ejemplo: 1A).</p>
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
                    Codigo
                    <input
                      value={newEstanteriaCodigo}
                      onChange={(event) => setNewEstanteriaCodigo(event.target.value)}
                      placeholder="A"
                      maxLength={1}
                      disabled={!canWrite}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!canWrite || newEstanteriaCodigo.trim() === ""}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  Registrar estanteria
                </button>
              </form>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {estanteriasList.length === 0 ? (
                <p className="text-sm text-stone-600">No hay estanterias registradas.</p>
              ) : (
                estanteriasList.map((estanteria) => (
                  <div
                    key={`${estanteria.codigo}-${estanteria.piso}`}
                    className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700"
                  >
                    <span>{estanteria.etiqueta}</span>
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

          <article className="ej-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Registrar Codigo SIE</h3>
            <form onSubmit={handleCreateCodigoSIE} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-4">
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
              <input
                value={newCodigoSIE}
                onChange={(event) => setNewCodigoSIE(event.target.value)}
                placeholder="Codigo SIE"
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
              <button
                type="submit"
                disabled={!canWrite || newCodigoSIE.trim() === "" || codigoItemIdValue.trim() === ""}
                className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                Registrar codigo
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
                        No hay codigos SIE registrados.
                      </td>
                    </tr>
                  ) : (
                    codigosSIEList.map((codigo) => (
                      <tr key={`sie-row-${codigo.codigo}`} className="bg-white">
                        <td className="border-b border-stone-100 px-3 py-2 font-semibold text-stone-900">{codigo.codigo}</td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-700">{codigo.talla ?? "-"}</td>
                        <td className="border-b border-stone-100 px-3 py-2 text-stone-700">{codigo.itemNombre}</td>
                        <td className="border-b border-stone-100 px-3 py-2 text-right">
                          {canWrite ? (
                            <button
                              type="button"
                              onClick={() => confirmDeleteCodigoSIE(codigo.codigo)}
                              className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Borrar
                            </button>
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
        </>
      ) : null}

      {section === "registrar_caja" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Nueva Caja</h3>
          <form onSubmit={handleCreateCaja} className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
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
                Item
                <select
                  value={cajaItemIdValue}
                  onChange={(event) => setNewCajaItemId(event.target.value)}
                  disabled={!canWrite || activeItems.length === 0}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {activeItems.length === 0 ? <option value="">Sin items activos</option> : null}
                  {activeItems.map((item) => (
                    <option key={`caja-item-${item.itemId}`} value={item.itemId}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
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
                  disabled={!canWrite || estanteriaCodes.length === 0}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {estanteriaCodes.length === 0 ? <option value="">Sin estanterias</option> : null}
                  {estanteriaCodes.map((codigo) => (
                    <option key={`caja-estanteria-${codigo}`} value={codigo}>
                      {codigo}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Codigos SIE de la caja</p>
              {codigosSIEDelItemSeleccionado.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">
                  No hay codigos SIE registrados para el item seleccionado.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {codigosSIEDelItemSeleccionado.map((codigo) => {
                    const checked = selectedCajaCodigosSIE.includes(codigo.codigo);
                    return (
                      <label
                        key={`caja-codigo-${codigo.codigo}`}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                          checked ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-stone-300 bg-white text-stone-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canWrite}
                          onChange={() => toggleCodigoSIEEnCaja(codigo.codigo)}
                        />
                        <span className="font-semibold">{codigo.codigo}</span>
                        <span className="text-xs">{codigo.talla ?? "-"}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  !canWrite ||
                  newCajaCodigo.trim() === "" ||
                  cajaItemIdValue.trim() === "" ||
                  newCajaCantidad.trim() === "" ||
                  cajaEstanteriaValue.trim() === ""
                }
                className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60"
              >
                Crear caja
              </button>
            </div>
          </form>
        </article>
      ) : null}

      {section === "listado_cajas" ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900">Cajas registradas</h3>
            <label className="w-full max-w-xs text-xs text-stone-700">
              Buscar caja
              <input
                value={cajaFiltro}
                onChange={(event) => setCajaFiltro(event.target.value)}
                placeholder="Codigo, item, estanteria o codigo SIE"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 space-y-2">
            {cajasFiltradas.length === 0 ? (
              <p className="text-sm text-stone-600">No hay cajas que coincidan con el filtro.</p>
            ) : (
              cajasFiltradas.map((caja) => (
                <div key={`caja-${caja.codigoDepositoGeneral}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Caja {caja.codigoDepositoGeneral}</p>
                      <p className="text-xs text-stone-600">{caja.itemNombre}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {renderTag(`Cantidad ${caja.cantidad}`, "accent")}
                        {renderTag(`Estanteria ${caja.estanteria}`)}
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
                      <span className="font-semibold">Codigos SIE:</span>{" "}
                      {caja.codigosSIE.length === 0
                        ? "-"
                        : caja.codigosSIE
                            .map((codigo) => `${codigo.codigo}${codigo.talla ? ` (${codigo.talla})` : ""}`)
                            .join(", ")}
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
