"use client";

import { useMemo, useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { LoadingInline } from "@/app/components/shared";
import { formatDateOnlyForDisplay, getTodayDateInput } from "@/lib/date-helpers";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { formatUruguayanCi } from "@/lib/ci";
import { normalizeSearchText } from "@/lib/spanish-text";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoDraftItem, PrestamoEstadoEquipo, StockOperacionDraft, StockOperacionDraftItem } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

type StockViewProps = {
  section: "total" | "actual" | "alta" | "baja" | "historial" | "prestamos";
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  equipos: Equipo[];
  draft: StockOperacionDraft;
  saving: boolean;
  maxDate: string;
  onDraftChange: (field: "tipo" | "fecha" | "comentarios", value: string) => void;
  onDraftItemChange: (index: number, field: keyof StockOperacionDraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  onPrestamoDraftChange: (
    field:
      | "destinatarioTipo"
      | "destinatarioCi"
      | "actuanteCi"
      | "fechaPrestamo"
      | "fechaEstimadaDevolucionTexto"
      | "comentarios",
    value: string,
  ) => void;
  onPrestamoItemChange: (index: number, field: keyof PrestamoDraftItem, value: string) => void;
  onAddPrestamoItem: () => void;
  onRemovePrestamoItem: (index: number) => void;
  onSubmitPrestamo: () => void;
  onSubmitPrestamoAndPrint: () => void;
  onReturnPrestamo: (
    prestamoId: string,
    fechaDevolucion: string,
    items?: Array<{ itemId: string; estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion?: string }>,
  ) => void;
  onReload: () => void;
};

function historyBadgeClass(tipo: "INGRESO" | "EGRESO" | "ENTREGA" | "DEVOLUCION" | "PRESTAMO" | "DEVOLUCION_PRESTAMO") {
  if (tipo === "INGRESO" || tipo === "DEVOLUCION" || tipo === "DEVOLUCION_PRESTAMO") return "bg-emerald-100 text-emerald-800";
  if (tipo === "PRESTAMO") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}

function reciboHref(prestamoId: string) {
  return `/api/prestamos/${encodeURIComponent(prestamoId)}/recibo`;
}

function normalizeRankForActuante(value: string) {
  return normalizeSearchText(value.replace(/[º°]/g, ""));
}

function isSargentoRank(abreviacion: string) {
  const normalized = normalizeRankForActuante(abreviacion);
  return normalized.includes("sargento") || normalized.startsWith("sgto");
}

export function StockView({
  section,
  data,
  loading,
  error,
  canWrite,
  equipos,
  draft,
  saving,
  maxDate,
  onDraftChange,
  onDraftItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  personal,
  oficialesSuboficiales,
  prestamoDraft,
  prestamoSaving,
  returningPrestamoId,
  onPrestamoDraftChange,
  onPrestamoItemChange,
  onAddPrestamoItem,
  onRemovePrestamoItem,
  onSubmitPrestamo,
  onSubmitPrestamoAndPrint,
  onReturnPrestamo,
  onReload,
}: StockViewProps) {
  const ESTADO_OPTIONS: PrestamoEstadoEquipo[] = ["NUEVO", "BUENO", "REGULAR", "MALO"];
  const resumen = data?.resumen ?? [];
  const historial = data?.historial ?? [];
  const prestamos = data?.prestamos ?? [];
  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const destinatarioOptions = useMemo(() => {
    if (prestamoDraft.destinatarioTipo === "PERSONAL") {
      return [...personal]
        .sort((a, b) =>
          `${apellidosLabel(a)} ${nombresLabel(a)}`.localeCompare(`${apellidosLabel(b)} ${nombresLabel(b)}`, "es", {
            sensitivity: "base",
          }),
        )
        .map((persona) => ({
          ci: persona.ci,
          label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`,
        }));
    }

    return oficialesSuboficiales
      .filter((registro) => (prestamoDraft.destinatarioTipo === "OFICIAL" ? registro.tipo === "OFICIAL" : registro.tipo === "SUBOFICIAL"))
      .slice()
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es", { sensitivity: "base" }))
      .map((registro) => ({
        ci: registro.ci,
        label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`,
      }));
  }, [prestamoDraft.destinatarioTipo, personal, oficialesSuboficiales]);
  const actuanteOptions = useMemo(() => {
    const oficialesYSuboficiales = oficialesSuboficiales.map((registro) => ({
      ci: registro.ci,
      label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`.replace(/\s+/g, " ").trim(),
    }));

    const sargentos = personal
      .filter((persona) => isSargentoRank(persona.rango.abreviacion))
      .map((persona) => ({
        ci: persona.ci,
        label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`
          .replace(/\s+/g, " ")
          .trim(),
      }));

    const optionsByCi = new Map<string, { ci: string; label: string }>();
    for (const option of [...oficialesYSuboficiales, ...sargentos]) {
      if (!optionsByCi.has(option.ci)) {
        optionsByCi.set(option.ci, option);
      }
    }

    return Array.from(optionsByCi.values()).sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [oficialesSuboficiales, personal]);
  const [returnDateByPrestamo, setReturnDateByPrestamo] = useState<Record<string, string>>({});
  const [prestamoIdFilter, setPrestamoIdFilter] = useState("");
  const [returnItemsByPrestamo, setReturnItemsByPrestamo] = useState<
    Record<string, Record<string, { estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion: string }>>
  >({});
  const [returnDialog, setReturnDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    fechaDevolucion: string;
  } | null>(null);
  const normalizedPrestamoIdFilter = prestamoIdFilter.trim();
  const prestamosFiltrados =
    normalizedPrestamoIdFilter === ""
      ? prestamos
      : prestamos.filter((prestamo) => prestamo.prestamoId.includes(normalizedPrestamoIdFilter));

  const getReturnDate = (prestamoId: string) => {
    const saved = returnDateByPrestamo[prestamoId];
    return saved !== undefined ? saved : maxDate;
  };

  function openReturnDialog(prestamo: StockDashboardData["prestamos"][number]) {
    setReturnDialog({
      prestamo,
      fechaDevolucion: getReturnDate(prestamo.prestamoId) || getTodayDateInput(),
    });
  }

  function submitReturnDialog() {
    if (!returnDialog) return;
    const fechaDevolucion = returnDialog.fechaDevolucion.trim() || getTodayDateInput();
    setReturnDateByPrestamo((prev) => ({ ...prev, [returnDialog.prestamo.prestamoId]: fechaDevolucion }));
    onReturnPrestamo(
      returnDialog.prestamo.prestamoId,
      fechaDevolucion,
      returnDialog.prestamo.items.map((item) => {
        const itemData = getReturnItemData(returnDialog.prestamo.prestamoId, item);
        return {
          itemId: item.itemId,
          estadoDevolucion: itemData.estadoDevolucion,
          comentarioDevolucion: itemData.comentarioDevolucion.trim() || undefined,
        };
      }),
    );
    setReturnDialog(null);
  }

  const getReturnItemData = (
    prestamoId: string,
    item: StockDashboardData["prestamos"][number]["items"][number],
  ) => {
    const byPrestamo = returnItemsByPrestamo[prestamoId];
    if (byPrestamo && byPrestamo[item.itemId]) return byPrestamo[item.itemId];
    return {
      estadoDevolucion: item.estadoEntrega,
      comentarioDevolucion: "",
    };
  };

  const totalSubalternos = resumen.reduce((total, item) => total + item.stockSubalternos, 0);
  const totalPrestamo = resumen.reduce((total, item) => total + item.stockPrestamo, 0);
  const totalDeposito = resumen.reduce((total, item) => total + item.stockDeposito, 0);
  const totalUnidad = resumen.reduce((total, item) => total + item.stockUnidad, 0);
  const itemsConStockDeposito = resumen.filter((item) => item.stockDeposito !== 0).length;
  const itemsNegativosDeposito = resumen.filter((item) => item.stockDeposito < 0).length;

  const showSummaryCards = section === "total" || section === "actual";
  const showManualForm = canWrite && (section === "alta" || section === "baja");
  const showStockTable = section === "total" || section === "actual";
  const showHistory = section === "historial";
  const showPrestamos = section === "prestamos";

  const viewTitle =
    section === "total"
      ? "Total de equipos en la unidad"
      : section === "actual"
        ? "Stock interno de deposito"
        : section === "alta"
          ? "Alta de stock"
          : section === "baja"
            ? "Baja de stock"
            : section === "prestamos"
              ? "Prestamos de equipo"
              : "Historial de stock";

  const stockTableTitle = section === "total" ? "Totales por item (subalternos + préstamo + depósito)" : "Stock interno de depósito por equipo";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{viewTitle}</h2>
            <p className="mt-1 text-xs text-stone-600">Vista operativa de stock y movimientos.</p>
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            {loading ? <LoadingInline label="Recargando..." size="xs" textClassName="text-xs font-semibold text-stone-700" /> : "Recargar"}
          </button>
        </div>

        {showSummaryCards ? (
          section === "total" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total subalternos</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalSubalternos}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total prestamo</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalPrestamo}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total deposito</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalDeposito}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total unidad</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalUnidad}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total unidades</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalDeposito}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Items con stock</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{itemsConStockDeposito}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Items negativos</p>
                <p className={`mt-2 text-2xl font-bold ${itemsNegativosDeposito > 0 ? "text-rose-700" : "text-stone-900"}`}>{itemsNegativosDeposito}</p>
              </div>
            </div>
          )
        ) : null}
      </article>

      {showManualForm ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">{section === "alta" ? "Alta de stock" : "Baja de stock"}</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-xs text-stone-700">
              Fecha
              <DateTextInput
                value={draft.fecha}
                disabled={saving}
                onChange={(value) => onDraftChange("fecha", value)}
                ariaLabel={`Fecha de stock. Maximo ${maxDate}`}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-stone-700">
              Comentarios
              <input
                value={draft.comentarios}
                disabled={saving}
                onChange={(event) => onDraftChange("comentarios", event.target.value)}
                placeholder="Detalle breve"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Items del movimiento</p>
              <button
                type="button"
                onClick={onAddItem}
                disabled={saving}
                className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Agregar equipo
              </button>
            </div>
            {draft.items.map((item, index) => (
              <div key={`stock-item-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                <select
                  value={item.itemId}
                  disabled={saving}
                  onChange={(event) => onDraftItemChange(index, "itemId", event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar equipo</option>
                  {equiposOrdenados
                    .filter((catalogItem) => {
                      if (catalogItem.itemId === item.itemId) return true;
                      return !draft.items.some((selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId);
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
                  disabled={saving}
                  onChange={(event) => onDraftItemChange(index, "cantidad", event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={saving || draft.items.length <= 1}
                  className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onSubmit} disabled={saving} className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50">
              {saving ? <LoadingInline label="Guardando..." size="xs" tone="light" textClassName="text-xs font-semibold text-white" /> : "Guardar movimiento"}
            </button>
          </div>
        </article>
      ) : null}

      {showPrestamos ? (
        <>
          {canWrite ? (
            <article className="ej-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-stone-900">Registrar prestamo</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <label className="text-xs text-stone-700">
                  Tipo destinatario
                  <select
                    value={prestamoDraft.destinatarioTipo}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("destinatarioTipo", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="PERSONAL">Subalternos</option>
                  <option value="OFICIAL">Oficiales</option>
                  <option value="SUBOFICIAL">Suboficiales</option>
                </select>
              </label>
                <div className="text-xs text-stone-700">
                  Destinatario
                  <DestinatarioSearchSelect
                    key={prestamoDraft.destinatarioTipo}
                    options={destinatarioOptions}
                    value={prestamoDraft.destinatarioCi}
                    disabled={prestamoSaving}
                    onChange={(ci) => onPrestamoDraftChange("destinatarioCi", ci)}
                  />
                </div>
                <div className="text-xs text-stone-700">
                  Por oden de
                  <DestinatarioSearchSelect
                    key="stock-prestamo-actuante"
                    options={actuanteOptions}
                    value={prestamoDraft.actuanteCi}
                    disabled={prestamoSaving}
                    onChange={(ci) => onPrestamoDraftChange("actuanteCi", ci)}
                  />
                </div>
                <label className="text-xs text-stone-700">
                  Fecha prestamo
                  <DateTextInput
                    value={prestamoDraft.fechaPrestamo}
                    disabled={prestamoSaving}
                    onChange={(value) => onPrestamoDraftChange("fechaPrestamo", value)}
                    ariaLabel={`Fecha del prestamo. Maximo ${maxDate}`}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-stone-700">
                  Fecha estimada devolución (texto)
                  <input
                    value={prestamoDraft.fechaEstimadaDevolucionTexto}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("fechaEstimadaDevolucionTexto", event.target.value)}
                    placeholder="Ej: 10 dias, fin de campana, 2 semanas"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs text-stone-700">
                  Comentarios
                  <input
                    value={prestamoDraft.comentarios}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("comentarios", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos prestados</p>
                  <button
                    type="button"
                    onClick={onAddPrestamoItem}
                    disabled={prestamoSaving}
                    className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Agregar equipo
                  </button>
                </div>
                {prestamoDraft.items.map((item, index) => (
                  <div key={`prestamo-item-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)_auto]">
                    <select
                      value={item.itemId}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "itemId", event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar equipo</option>
                      {equiposOrdenados
                        .filter((catalogItem) => {
                          if (catalogItem.itemId === item.itemId) return true;
                          return !prestamoDraft.items.some((selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId);
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
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "cantidad", event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={item.estadoEntrega}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "estadoEntrega", event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      {ESTADO_OPTIONS.map((estado) => (
                        <option key={estado} value={estado}>
                          {estado}
                        </option>
                      ))}
                    </select>
                    <input
                      value={item.comentarioEntrega}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "comentarioEntrega", event.target.value)}
                      placeholder="Comentario del equipo (opcional)"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => onRemovePrestamoItem(index)}
                      disabled={prestamoSaving || prestamoDraft.items.length <= 1}
                      className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onSubmitPrestamo}
                  disabled={prestamoSaving}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-50"
                >
                  Solo guardar
                </button>
                <button
                  type="button"
                  onClick={onSubmitPrestamoAndPrint}
                  disabled={prestamoSaving}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {prestamoSaving ? <LoadingInline label="Guardando..." size="xs" tone="light" textClassName="text-xs font-semibold text-white" /> : "Guardar e imprimir"}
                </button>
              </div>
            </article>
          ) : null}

          <article className="ej-card rounded-2xl p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h3 className="text-sm font-semibold text-stone-900">Prestamos registrados</h3>
              <label className="w-full max-w-xs text-xs text-stone-700">
                Buscar hoja por ID
                <input
                  type="text"
                  inputMode="numeric"
                  value={prestamoIdFilter}
                  onChange={(event) => setPrestamoIdFilter(event.target.value)}
                  placeholder="Ej: 145"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-3 space-y-2">
              {prestamosFiltrados.length === 0 ? (
                <p className="text-sm text-stone-600">
                  {normalizedPrestamoIdFilter === ""
                    ? "No hay prestamos registrados."
                    : `No hay prestamos para ID ${normalizedPrestamoIdFilter}.`}
                </p>
              ) : null}
              {prestamosFiltrados.map((prestamo) => (
                <div key={prestamo.prestamoId} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{prestamo.reciboNumero}</p>
                      <p className="text-xs text-stone-600">
                        {prestamo.destinatarioEtiqueta}
                        {prestamo.destinatarioCi ? ` - CI ${formatUruguayanCi(prestamo.destinatarioCi)}` : ""}
                      </p>
                      <p className="text-xs text-stone-500">Prestado: {formatDateOnlyForDisplay(prestamo.fechaPrestamo)}</p>
                      {prestamo.fechaEstimadaDevolucionTexto ? (
                        <p className="text-xs text-stone-500">Estimado: {prestamo.fechaEstimadaDevolucionTexto}</p>
                      ) : null}
                      <p className="text-xs text-stone-500">Por oden de: {prestamo.actuanteNombre ?? "No registrado"}</p>
                      {prestamo.fechaDevolucion ? <p className="text-xs text-stone-500">Devuelto: {formatDateOnlyForDisplay(prestamo.fechaDevolucion)}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${prestamo.estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {prestamo.estado}
                      </span>
                      <a
                        href={reciboHref(prestamo.prestamoId)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                      >
                        Recibo
                      </a>
                      {canWrite && prestamo.estado === "PENDIENTE" ? (
                        <button
                          type="button"
                          onClick={() => openReturnDialog(prestamo)}
                          disabled={returningPrestamoId === prestamo.prestamoId}
                          className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {returningPrestamoId === prestamo.prestamoId ? "Guardando..." : "Devolver"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {prestamo.comentarios ? <p className="mt-2 text-xs text-stone-700">{prestamo.comentarios}</p> : null}
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    {prestamo.items.map((item) => (
                      <div key={`${prestamo.prestamoId}-${item.itemId}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                        <p className="text-xs text-stone-700">
                          <span className="font-semibold text-amber-700">{item.cantidad}</span> {item.nombre}
                        </p>
                        <p className="text-xs text-stone-600">Entrega: {item.estadoEntrega}{item.comentarioEntrega ? ` | ${item.comentarioEntrega}` : ""}</p>
                        {prestamo.estado === "PENDIENTE" ? (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                            <select
                              value={getReturnItemData(prestamo.prestamoId, item).estadoDevolucion}
                              disabled={returningPrestamoId === prestamo.prestamoId}
                              onChange={(event) =>
                                setReturnItemsByPrestamo((prev) => ({
                                  ...prev,
                                  [prestamo.prestamoId]: {
                                    ...(prev[prestamo.prestamoId] ?? {}),
                                    [item.itemId]: {
                                      ...getReturnItemData(prestamo.prestamoId, item),
                                      estadoDevolucion: event.target.value as PrestamoEstadoEquipo,
                                    },
                                  },
                                }))
                              }
                              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                            >
                              {ESTADO_OPTIONS.map((estado) => (
                                <option key={`${prestamo.prestamoId}-${item.itemId}-${estado}`} value={estado}>
                                  {estado}
                                </option>
                              ))}
                            </select>
                            <input
                              value={getReturnItemData(prestamo.prestamoId, item).comentarioDevolucion}
                              disabled={returningPrestamoId === prestamo.prestamoId}
                              onChange={(event) =>
                                setReturnItemsByPrestamo((prev) => ({
                                  ...prev,
                                  [prestamo.prestamoId]: {
                                    ...(prev[prestamo.prestamoId] ?? {}),
                                    [item.itemId]: {
                                      ...getReturnItemData(prestamo.prestamoId, item),
                                      comentarioDevolucion: event.target.value,
                                    },
                                  },
                                }))
                              }
                              placeholder="Comentario devolución (opcional)"
                              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                            />
                          </div>
                        ) : (
                          <p className="text-xs text-stone-600">
                            Devolucion: {item.estadoDevolucion ?? "-"}
                            {item.comentarioDevolucion ? ` | ${item.comentarioDevolucion}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </>
      ) : null}

      {showStockTable ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">{stockTableTitle}</h3>
          {loading ? <LoadingInline label="Cargando stock..." className="mt-3" textClassName="text-sm font-medium text-stone-600" /> : null}
          {error ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          {!loading && !error ? (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-700">Equipo</th>
                    {section === "total" ? (
                      <>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Subalternos</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Prestamo</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Deposito</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Unidad</th>
                      </>
                    ) : (
                      <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Stock deposito</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((item, index) => (
                    <tr key={item.itemId} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                      <td className="border-b border-stone-100 px-3 py-2 text-stone-900">{item.nombre}</td>
                      {section === "total" ? (
                        <>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockSubalternos}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockPrestamo}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockDeposito}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockUnidad}</td>
                        </>
                      ) : (
                        <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockDeposito}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      ) : null}

      {showHistory ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Historial que impacta stock interno</h3>
          {loading ? <LoadingInline label="Cargando stock..." className="mt-3" textClassName="text-sm font-medium text-stone-600" /> : null}
          {error ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <div className="mt-3 space-y-2">
            {historial.length === 0 ? <p className="text-sm text-stone-600">No hay movimientos de stock registrados.</p> : null}
            {historial.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{formatDateOnlyForDisplay(entry.fecha)}</p>
                    <p className="text-xs text-stone-600">{entry.persona ?? "Sin destinatario"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${historyBadgeClass(entry.tipo)}`}>
                      {entry.tipo}
                    </span>
                    <span className="text-xs font-semibold text-stone-600">{`${entry.totalUnidades} unidades`}</span>
                  </div>
                </div>
                {entry.comentarios ? <p className="mt-2 text-xs text-stone-700">{entry.comentarios}</p> : null}
                <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                  {entry.items.map((item) => (
                    <p key={`${entry.id}-${item.itemId}`} className="text-xs text-stone-700">
                      <span className={`font-semibold ${item.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {item.delta > 0 ? `+${item.delta}` : item.delta}
                      </span>{" "}
                      {item.nombre}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {returnDialog ? (
        <ModalFrame onClose={() => setReturnDialog(null)} size="md">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Confirmar devolucion</h3>
              <p className="text-sm text-stone-600">
                {returnDialog.prestamo.reciboNumero} | {returnDialog.prestamo.destinatarioEtiqueta}
              </p>
            </header>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs text-stone-600">Fecha prestamo: {formatDateOnlyForDisplay(returnDialog.prestamo.fechaPrestamo)}</p>
              <p className="mt-1 text-xs text-stone-600">Por oden de: {returnDialog.prestamo.actuanteNombre ?? "No registrado"}</p>
              <label className="mt-3 block text-xs text-stone-700">
                Fecha devolucion
                <DateTextInput
                  value={returnDialog.fechaDevolucion}
                  disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                  onChange={(value) =>
                    setReturnDialog((current) => (current ? { ...current, fechaDevolucion: value } : current))
                  }
                  ariaLabel={`Fecha de devolucion. Maximo ${maxDate}`}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                onClick={() =>
                  setReturnDialog((current) =>
                    current
                      ? {
                          ...current,
                          fechaDevolucion: getTodayDateInput(),
                        }
                      : current,
                  )
                }
                className="mt-2 rounded border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Hoy
              </button>
            </div>

            <footer className="flex justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => setReturnDialog(null)}
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitReturnDialog}
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {returningPrestamoId === returnDialog.prestamo.prestamoId ? "Guardando..." : "Confirmar devolucion"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
