"use client";

import { useMemo, useRef, useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { LoadingInline } from "@/app/components/shared";
import { api } from "@/lib/api";
import { formatDateOnlyForDisplay, getTodayDateInput } from "@/lib/date-helpers";
import { formatUruguayanCi } from "@/lib/ci";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SortByAlphaRoundedIcon from "@mui/icons-material/SortByAlphaRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type { StockDashboardData, StockItemTraceData } from "@/types/views";
import type { PrestamoEstadoEquipo } from "@/types/forms";
import type { StockViewProps } from "./stock/types";
import {
  buildActuanteOptions,
  buildDestinatarioOptions,
  ESTADO_OPTIONS,
  getSectionViewConfig,
  prestamoClaseLabel,
  getStockSummaryMetrics,
  historyBadgeClass,
  reciboHref,
} from "./stock/utils";

export function StockView({
  section,
  data,
  loading,
  error,
  canWrite,
  isAdmin,
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
  const resumen = data?.resumen ?? [];
  const historial = data?.historial ?? [];
  const prestamos = data?.prestamos ?? [];
  const equiposOrdenados = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const destinatarioOptions = useMemo(() => {
    return buildDestinatarioOptions(prestamoDraft.destinatarioTipo, personal, oficialesSuboficiales);
  }, [prestamoDraft.destinatarioTipo, personal, oficialesSuboficiales]);
  const actuanteOptions = useMemo(() => {
    return buildActuanteOptions(oficialesSuboficiales, personal);
  }, [oficialesSuboficiales, personal]);
  const [returnDateByPrestamo, setReturnDateByPrestamo] = useState<Record<string, string>>({});
  const [prestamoIdFilter, setPrestamoIdFilter] = useState("");
  const [returnItemsByPrestamo, setReturnItemsByPrestamo] = useState<
    Record<string, Record<string, { estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion: string }>>
  >({});
  const [sieDraftByItemId, setSieDraftByItemId] = useState<Record<string, string>>({});
  const [sieSavingItemId, setSieSavingItemId] = useState<string | null>(null);
  const [sieError, setSieError] = useState<string | null>(null);
  const [searchTermEquipos, setSearchTermEquipos] = useState("");
  const [ordenAlfabetico, setOrdenAlfabetico] = useState(false);
  const [returnDialog, setReturnDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    fechaDevolucion: string;
  } | null>(null);
  const [itemTraceDialog, setItemTraceDialog] = useState<{
    item: StockDashboardData["resumen"][number];
    column: "SUBALTERNOS" | "PRESTAMO";
  } | null>(null);
  const [itemTraceData, setItemTraceData] = useState<StockItemTraceData | null>(null);
  const [itemTraceLoading, setItemTraceLoading] = useState(false);
  const [itemTraceError, setItemTraceError] = useState<string | null>(null);
  const itemTraceRequestIdRef = useRef(0);
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

  function closeItemTraceDialog() {
    itemTraceRequestIdRef.current += 1;
    setItemTraceDialog(null);
    setItemTraceData(null);
    setItemTraceLoading(false);
    setItemTraceError(null);
  }

  async function openItemTraceDialog(item: StockDashboardData["resumen"][number], column: "SUBALTERNOS" | "PRESTAMO") {
    const requestId = itemTraceRequestIdRef.current + 1;
    itemTraceRequestIdRef.current = requestId;
    setItemTraceDialog({ item, column });
    setItemTraceData(null);
    setItemTraceError(null);
    setItemTraceLoading(true);
    try {
      const trace = await api<StockItemTraceData>(`/api/stock/item-trace?itemId=${encodeURIComponent(item.itemId)}`);
      if (itemTraceRequestIdRef.current !== requestId) return;
      setItemTraceData(trace);
    } catch (traceError: unknown) {
      if (itemTraceRequestIdRef.current !== requestId) return;
      setItemTraceError(traceError instanceof Error ? traceError.message : "No se pudo cargar el detalle del equipo.");
    } finally {
      if (itemTraceRequestIdRef.current !== requestId) return;
      setItemTraceLoading(false);
    }
  }

  function openItemTracePrint() {
    if (!itemTraceDialog) return;
    const query = new URLSearchParams({
      itemId: itemTraceDialog.item.itemId,
      column: itemTraceDialog.column,
      autoprint: "1",
    });
    window.open(`/trazabilidad-equipos?${query.toString()}`, "_blank", "noopener,noreferrer");
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

  const getSieInputValue = (item: StockDashboardData["resumen"][number]) => {
    const draftValue = sieDraftByItemId[item.itemId];
    return draftValue !== undefined ? draftValue : String(item.existenciaSie ?? 0);
  };

  function updateSieDraft(itemId: string, value: string) {
    if (!/^\d*$/.test(value)) return;
    setSieError(null);
    setSieDraftByItemId((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  async function persistSieValue(item: StockDashboardData["resumen"][number]) {
    if (!canEditSie || sieSavingItemId !== null) return;
    const inputValue = getSieInputValue(item).trim();
    if (inputValue === "") {
      resetSieDraft(item);
      return;
    }

    const parsed = Number(inputValue);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setSieError("La existencia del SIE debe ser un entero mayor o igual a 0.");
      return;
    }

    if (parsed === item.existenciaSie) {
      setSieDraftByItemId((prev) => {
        if (!(item.itemId in prev)) return prev;
        const next = { ...prev };
        delete next[item.itemId];
        return next;
      });
      return;
    }

    setSieSavingItemId(item.itemId);
    setSieError(null);
    try {
      await api<{ itemId: string; existenciaSie: number }>(`/api/items/${encodeURIComponent(item.itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existenciaSie: parsed }),
      });
      setSieDraftByItemId((prev) => {
        const next = { ...prev };
        delete next[item.itemId];
        return next;
      });
      await onReload();
    } catch (saveError: unknown) {
      setSieError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la existencia del SIE.");
    } finally {
      setSieSavingItemId((current) => (current === item.itemId ? null : current));
    }
  }

  function resetSieDraft(item: StockDashboardData["resumen"][number]) {
    setSieDraftByItemId((prev) => {
      if (!(item.itemId in prev)) return prev;
      const next = { ...prev };
      delete next[item.itemId];
      return next;
    });
    setSieError(null);
  }

  const {
    totalSubalternos,
    totalPrestamo,
    totalDeposito,
    totalUnidad,
    itemsConStockDeposito,
    itemsNegativosDeposito,
  } = getStockSummaryMetrics(resumen);

  const normalizedSearchTermEquipos = searchTermEquipos.trim().toLowerCase();
  const resumenFiltrado = useMemo(() => {
    const list =
      normalizedSearchTermEquipos === ""
        ? resumen
        : resumen.filter((item) => item.nombre.toLowerCase().includes(normalizedSearchTermEquipos));
    if (ordenAlfabetico) {
      return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
    }
    return list;
  }, [resumen, normalizedSearchTermEquipos, ordenAlfabetico]);

  const { showSummaryCards, showManualForm, showStockTable, showHistory, showPrestamos, viewTitle, stockTableTitle } =
    getSectionViewConfig(section);
  const canEditSie = canWrite && isAdmin;

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{viewTitle}</h2>
            <p className="mt-1 text-xs text-stone-600">Vista operativa de stock y movimientos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {section === "total" ? (
              <div className="flex items-center bg-stone-900 text-white rounded-xl shadow-md p-1 border border-stone-800">
                <button
                  type="button"
                  onClick={() => window.open("/listado-equipos-unidad?autoprint=1", "_blank", "noopener,noreferrer")}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all hover:bg-stone-800 active:scale-95 text-[#e5bb37]"
                  title="Imprimir con el orden configurado en PDF / Catálogo"
                >
                  <PrintRoundedIcon sx={{ fontSize: 18 }} />
                  <span>Imprimir (Orden Asignado)</span>
                </button>
                <div className="w-[1px] h-5 bg-stone-700 mx-0.5" />
                <button
                  type="button"
                  onClick={() => window.open("/listado-equipos-unidad?autoprint=1&sort=alpha", "_blank", "noopener,noreferrer")}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white"
                  title="Imprimir en estricto orden alfabético general"
                >
                  <SortByAlphaRoundedIcon sx={{ fontSize: 18 }} />
                  <span>Imprimir (Alfabético)</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-400 active:scale-95 disabled:opacity-50"
            >
              <RefreshRoundedIcon sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Recargando..." : "Recargar"}</span>
            </button>
          </div>
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
                <label className="text-xs text-stone-700 md:col-span-2">
                  Clase de préstamo
                  <select
                    value={prestamoDraft.clasePrestamo}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("clasePrestamo", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="INTERNO">Interno</option>
                    <option value="EXTERNO">Externo</option>
                    <option value="PENDIENTE">Completar después</option>
                  </select>
                </label>
                {prestamoDraft.clasePrestamo === "INTERNO" ? (
                  <>
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
                      Destinatario interno
                      <DestinatarioSearchSelect
                        key={prestamoDraft.destinatarioTipo}
                        options={destinatarioOptions}
                        value={prestamoDraft.destinatarioCi}
                        disabled={prestamoSaving}
                        onChange={(ci) => onPrestamoDraftChange("destinatarioCi", ci)}
                      />
                    </div>
                  </>
                ) : null}
                {prestamoDraft.clasePrestamo === "EXTERNO" ? (
                  <>
                    <label className="text-xs text-stone-700">
                      Grado
                      <input
                        value={prestamoDraft.destinatarioExternoGrado}
                        disabled={prestamoSaving}
                        onChange={(event) => onPrestamoDraftChange("destinatarioExternoGrado", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Cédula de identidad
                      <input
                        value={prestamoDraft.destinatarioExternoCi}
                        disabled={prestamoSaving}
                        onChange={(event) => onPrestamoDraftChange("destinatarioExternoCi", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Nombre
                      <input
                        value={prestamoDraft.destinatarioExternoNombre}
                        disabled={prestamoSaving}
                        onChange={(event) => onPrestamoDraftChange("destinatarioExternoNombre", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Apellido
                      <input
                        value={prestamoDraft.destinatarioExternoApellido}
                        disabled={prestamoSaving}
                        onChange={(event) => onPrestamoDraftChange("destinatarioExternoApellido", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700 md:col-span-2">
                      Unidad de destino
                      <input
                        value={prestamoDraft.destinatarioExternoUnidadDestino}
                        disabled={prestamoSaving}
                        onChange={(event) => onPrestamoDraftChange("destinatarioExternoUnidadDestino", event.target.value)}
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
                ) : null}
                {prestamoDraft.clasePrestamo === "PENDIENTE" ? (
                  <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">
                    Este préstamo se guardará sin destinatario hasta completarlo después.
                  </p>
                ) : null}
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
                    ariaLabel={`Fecha del préstamo. Maximo ${maxDate}`}
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
                    ? "No hay préstamos registrados."
                    : `No hay préstamos para ID ${normalizedPrestamoIdFilter}.`}
                </p>
              ) : null}
              {prestamosFiltrados.map((prestamo) => (
                <div key={prestamo.prestamoId} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{prestamo.reciboNumero}</p>
                      <p className="text-xs text-stone-600">
                        {prestamo.destinatarioEtiqueta}
                        {prestamo.destinatarioCi ? ` - CI ${formatUruguayanCi(prestamo.destinatarioCi)}` : " - pendiente"}
                      </p>
                      <p className="text-xs text-stone-500">{prestamoClaseLabel(prestamo.clasePrestamo)}</p>
                      {prestamo.destinatarioUnidadDestino ? (
                        <p className="text-xs text-stone-500">Unidad destino: {prestamo.destinatarioUnidadDestino}</p>
                      ) : null}
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">{stockTableTitle}</h3>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 select-none">
                <input
                  type="checkbox"
                  checked={ordenAlfabetico}
                  onChange={(event) => setOrdenAlfabetico(event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-indigo-700 focus:ring-indigo-500"
                />
                <span>Ordenar alfabéticamente</span>
              </label>
              <label className="w-full sm:w-auto max-w-xs text-xs text-stone-700">
                <span className="block mb-1">Filtrar equipos</span>
                <input
                  type="text"
                  value={searchTermEquipos}
                  onChange={(event) => setSearchTermEquipos(event.target.value)}
                  placeholder="Nombre del equipo..."
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
          {loading ? <LoadingInline label="Cargando stock..." className="mt-4" textClassName="text-sm font-medium text-stone-600" /> : null}
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
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Existencia SIE</th>
                      </>
                    ) : (
                      <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Stock deposito</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resumenFiltrado.length === 0 && !loading && !error ? (
                    <tr>
                      <td colSpan={section === "total" ? 6 : 2} className="px-3 py-8 text-center text-stone-500 italic">
                        No se encontraron equipos que coincidan con "{searchTermEquipos}".
                      </td>
                    </tr>
                  ) : null}
                  {resumenFiltrado.map((item, index) => (
                    <tr key={item.itemId} className={index % 2 === 0 ? "bg-white" : "bg-stone-100/80"}>
                      <td className="border-b border-stone-100 px-3 py-2 text-stone-900">{item.nombre}</td>
                      {section === "total" ? (
                        <>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                            <button
                              type="button"
                              onClick={() => void openItemTraceDialog(item, "SUBALTERNOS")}
                              className="rounded px-1 text-right font-semibold text-stone-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                              title={`Ver detalle de ${item.nombre} en Subalternos`}
                            >
                              {item.stockSubalternos}
                            </button>
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                            <button
                              type="button"
                              onClick={() => void openItemTraceDialog(item, "PRESTAMO")}
                              className="rounded px-1 text-right font-semibold text-stone-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                              title={`Ver detalle de ${item.nombre} en Prestamo`}
                            >
                              {item.stockPrestamo}
                            </button>
                          </td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockDeposito}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockUnidad}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                            {canEditSie ? (
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={getSieInputValue(item)}
                                  disabled={loading || sieSavingItemId !== null}
                                  onChange={(event) => updateSieDraft(item.itemId, event.target.value)}
                                  onBlur={() => void persistSieValue(item)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      void persistSieValue(item);
                                      return;
                                    }
                                    if (event.key === "Escape") {
                                      event.preventDefault();
                                      resetSieDraft(item);
                                    }
                                  }}
                                  className="w-24 rounded border border-stone-300 px-2 py-1 text-right text-xs font-semibold text-stone-900"
                                  aria-label={`Existencia del SIE para ${item.nombre}`}
                                />
                                {sieSavingItemId === item.itemId ? (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Guardando</span>
                                ) : null}
                              </div>
                            ) : (
                              (item.existenciaSie ?? 0)
                            )}
                          </td>
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
          {!loading && !error && sieError ? (
            <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{sieError}</p>
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

      {itemTraceDialog ? (
        <ModalFrame onClose={closeItemTraceDialog} size="xl">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">
                Detalle de {itemTraceDialog.column === "SUBALTERNOS" ? "Subalternos" : "Prestamo"}
              </h3>
              <p className="text-sm text-stone-600">{itemTraceDialog.item.nombre}</p>
            </header>

            <div className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 md:grid-cols-2">
              <p><span className="font-semibold text-stone-900">Item ID:</span> {itemTraceDialog.item.itemId}</p>
              <p>
                <span className="font-semibold text-stone-900">Total en columna:</span>{" "}
                {itemTraceDialog.column === "SUBALTERNOS"
                  ? (itemTraceData?.totals.subalternos ?? itemTraceDialog.item.stockSubalternos)
                  : (itemTraceData?.totals.prestamo ?? itemTraceDialog.item.stockPrestamo)}
              </p>
            </div>

            {itemTraceLoading ? (
              <LoadingInline label="Cargando trazabilidad..." className="mt-1" textClassName="text-sm font-medium text-stone-600" />
            ) : null}
            {itemTraceError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{itemTraceError}</p>
            ) : null}

            {!itemTraceLoading && !itemTraceError && itemTraceData ? (
              itemTraceDialog.column === "SUBALTERNOS" ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Personal con cantidad neta distinta de cero
                  </p>
                  {itemTraceData.subalternos.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                      No hay tenencias activas para este item en la columna Subalternos.
                    </p>
                  ) : null}
                  {itemTraceData.subalternos.map((entry) => (
                    <div key={`trace-subalterno-${entry.ci}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{entry.persona}</p>
                          <p className="text-xs text-stone-600">
                            CI {formatUruguayanCi(entry.ci)}
                            {entry.bateria ? ` | Batería ${entry.bateria}` : ""}
                            {` | ${entry.tipoPersonal}`}
                          </p>
                        </div>
                        <p className={`text-sm font-bold ${entry.cantidadNeta < 0 ? "text-rose-700" : "text-stone-900"}`}>
                          {entry.cantidadNeta > 0 ? `+${entry.cantidadNeta}` : entry.cantidadNeta}
                        </p>
                      </div>
                      <div className="mt-2 space-y-1">
                        {entry.movimientos.map((movimiento) => (
                          <div key={`trace-subalterno-mov-${entry.ci}-${movimiento.movimientoId}-${movimiento.tipo}`} className="rounded-lg border border-stone-200 bg-white px-2 py-1">
                            <p className="text-xs text-stone-700">
                              <span className={`font-semibold ${movimiento.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {movimiento.delta > 0 ? `+${movimiento.delta}` : movimiento.delta}
                              </span>{" "}
                              ({movimiento.cantidad}) | {movimiento.tipo} | Mov. #{movimiento.movimientoId} |{" "}
                              {formatDateOnlyForDisplay(movimiento.fecha)}
                            </p>
                            {movimiento.observaciones ? (
                              <p className="text-xs text-stone-600">Obs: {movimiento.observaciones}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ) : (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Préstamos activos del item</p>
                  {itemTraceData.prestamos.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                      No hay préstamos activos para este item.
                    </p>
                  ) : null}
                  {itemTraceData.prestamos.map((entry) => (
                    <div key={`trace-prestamo-${entry.prestamoId}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{entry.destinatarioEtiqueta}</p>
                          <p className="text-xs text-stone-600">
                            {entry.destinatarioCi ? `CI ${formatUruguayanCi(entry.destinatarioCi)}` : "CI pendiente"}
                          </p>
                          <p className="text-xs text-stone-500">{prestamoClaseLabel(entry.clasePrestamo)}</p>
                          <p className="text-xs text-stone-600">
                            Recibo: {entry.reciboNumero} | Préstamo #{entry.prestamoId} | Mov. #{entry.movimientoId}
                          </p>
                          <p className="text-xs text-stone-500">Fecha: {formatDateOnlyForDisplay(entry.fechaPrestamo)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-stone-900">+{entry.cantidad}</p>
                          <p className="text-xs text-stone-600">{entry.estado}</p>
                        </div>
                      </div>
                      {entry.observaciones ? <p className="mt-2 text-xs text-stone-600">Obs: {entry.observaciones}</p> : null}
                    </div>
                  ))}
                </section>
              )
            ) : null}

            <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={openItemTracePrint}
                className="rounded-lg bg-indigo-700 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
              >
                Imprimir trazabilidad
              </button>
              <button
                type="button"
                onClick={closeItemTraceDialog}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </ModalFrame>
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
                  ariaLabel={`Fecha de devolución. Maximo ${maxDate}`}
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
                {returningPrestamoId === returnDialog.prestamo.prestamoId ? "Guardando..." : "Confirmar devolución"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
