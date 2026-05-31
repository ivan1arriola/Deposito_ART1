"use client";

import { useMemo, useRef, useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { LoadingInline } from "@/app/components/shared";
import { api } from "@/lib/api";
import { compareEquiposByTipoAndName, compareEquiposByTipoAndOrder, groupEquiposByTipo } from "@/lib/equipo-sort";
import { formatDateOnlyForDisplay, getTodayDateInput } from "@/lib/date-helpers";
import { formatUruguayanCi } from "@/lib/ci";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import SortByAlphaRoundedIcon from "@mui/icons-material/SortByAlphaRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import type { StockDashboardData, StockEquipoTraceData } from "@/types/views";
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
  const resumen = useMemo(() => data?.resumen ?? [], [data]);
  const historial = data?.historial ?? [];
  const prestamos = data?.prestamos ?? [];
  const equiposOrdenados = [...equipos].sort(compareEquiposByTipoAndName);

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
  const [equipoTraceDialog, setItemTraceDialog] = useState<{
    equipo: StockDashboardData["resumen"][number];
    column: "SUBALTERNOS" | "PRESTAMO" | "RECINTO";
  } | null>(null);
  const [equipoTraceData, setEquipoTraceData] = useState<StockEquipoTraceData | null>(null);
  const [equipoTraceLoading, setItemTraceLoading] = useState(false);
  const [equipoTraceError, setItemTraceError] = useState<string | null>(null);
  const equipoTraceRequestIdRef = useRef(0);
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
    equipoTraceRequestIdRef.current += 1;
    setItemTraceDialog(null);
    setEquipoTraceData(null);
    setItemTraceLoading(false);
    setItemTraceError(null);
  }

  async function openItemTraceDialog(equipo: StockDashboardData["resumen"][number], column: "SUBALTERNOS" | "PRESTAMO" | "RECINTO") {
    const requestId = equipoTraceRequestIdRef.current + 1;
    equipoTraceRequestIdRef.current = requestId;
    setItemTraceDialog({ equipo, column });
    setEquipoTraceData(null);
    setItemTraceError(null);
    setItemTraceLoading(true);
    try {
      const trace = await api<StockEquipoTraceData>(`/api/stock/equipo-trace?equipoId=${encodeURIComponent(equipo.equipoId)}`);
      if (equipoTraceRequestIdRef.current !== requestId) return;
      setEquipoTraceData(trace);
    } catch (traceError: unknown) {
      if (equipoTraceRequestIdRef.current !== requestId) return;
      setItemTraceError(traceError instanceof Error ? traceError.message : "No se pudo cargar el detalle del equipo.");
    } finally {
      if (equipoTraceRequestIdRef.current !== requestId) return;
      setItemTraceLoading(false);
    }
  }

  function openItemTracePrint() {
    if (!equipoTraceDialog) return;
    const query = new URLSearchParams({
      equipoId: equipoTraceDialog.equipo.equipoId,
      column: equipoTraceDialog.column,
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
      returnDialog.prestamo.equipos.map((equipo) => {
        const itemData = getReturnItemData(returnDialog.prestamo.prestamoId, equipo);
        return {
          equipoId: equipo.equipoId,
          estadoDevolucion: itemData.estadoDevolucion,
          comentarioDevolucion: itemData.comentarioDevolucion.trim() || undefined,
        };
      }),
    );
    setReturnDialog(null);
  }

  const getReturnItemData = (
    prestamoId: string,
    equipo: StockDashboardData["prestamos"][number]["equipos"][number],
  ) => {
    const byPrestamo = returnItemsByPrestamo[prestamoId];
    if (byPrestamo && byPrestamo[equipo.equipoId]) return byPrestamo[equipo.equipoId];
    return {
      estadoDevolucion: equipo.estadoEntrega,
      comentarioDevolucion: "",
    };
  };

  const getSieInputValue = (equipo: StockDashboardData["resumen"][number]) => {
    const draftValue = sieDraftByItemId[equipo.equipoId];
    return draftValue !== undefined ? draftValue : String(equipo.existenciaSie ?? 0);
  };

  function updateSieDraft(equipoId: string, value: string) {
    if (!/^\d*$/.test(value)) return;
    setSieError(null);
    setSieDraftByItemId((prev) => ({
      ...prev,
      [equipoId]: value,
    }));
  }

  async function persistSieValue(equipo: StockDashboardData["resumen"][number]) {
    if (!canEditSie || sieSavingItemId !== null) return;
    const inputValue = getSieInputValue(equipo).trim();
    if (inputValue === "") {
      resetSieDraft(equipo);
      return;
    }

    const parsed = Number(inputValue);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setSieError("La existencia del SIE debe ser un entero mayor o igual a 0.");
      return;
    }

    if (parsed === equipo.existenciaSie) {
      setSieDraftByItemId((prev) => {
        if (!(equipo.equipoId in prev)) return prev;
        const next = { ...prev };
        delete next[equipo.equipoId];
        return next;
      });
      return;
    }

    setSieSavingItemId(equipo.equipoId);
    setSieError(null);
    try {
      await api<{ equipoId: string; equipoId: string; existenciaSie: number }>(
        `/api/equipos/${encodeURIComponent(equipo.equipoId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ existenciaSie: parsed }),
        },
      );
      setSieDraftByItemId((prev) => {
        const next = { ...prev };
        delete next[equipo.equipoId];
        return next;
      });
      await onReload();
    } catch (saveError: unknown) {
      setSieError(saveError instanceof Error ? saveError.message : "No se pudo actualizar la existencia del SIE.");
    } finally {
      setSieSavingItemId((current) => (current === equipo.equipoId ? null : current));
    }
  }

  function resetSieDraft(equipo: StockDashboardData["resumen"][number]) {
    setSieDraftByItemId((prev) => {
      if (!(equipo.equipoId in prev)) return prev;
      const next = { ...prev };
      delete next[equipo.equipoId];
      return next;
    });
    setSieError(null);
  }

  const {
    totalSubalternos,
    totalAsignacion,
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
        : resumen.filter((equipo) => equipo.nombre.toLowerCase().includes(normalizedSearchTermEquipos));
    return [...list].sort(ordenAlfabetico ? compareEquiposByTipoAndName : compareEquiposByTipoAndOrder);
  }, [resumen, normalizedSearchTermEquipos, ordenAlfabetico]);

  const { showSummaryCards, showManualForm, showStockTable, showHistory, showPrestamos, viewTitle, stockTableTitle } =
    getSectionViewConfig(section);
  const canEditSie = canWrite && isAdmin;
  const stockTableSections = useMemo(
    () =>
      groupEquiposByTipo(resumenFiltrado).map((group) => ({
        key: group.key,
        title: section === "total" ? `Equipo ${group.label}` : `Equipo ${group.label} en depósito`,
        equipos: group.equipos,
      })),
    [resumenFiltrado, section],
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap equipos-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{viewTitle}</h2>
            <p className="mt-1 text-xs text-stone-600">Vista operativa de stock y movimientos.</p>
          </div>
          <div className="flex flex-wrap equipos-center gap-2.5">
            {section === "total" ? (
              <div className="flex equipos-center bg-stone-900 text-white rounded-xl shadow-md p-1 border border-stone-800">
                <button
                  type="button"
                  onClick={() => window.open("/listado-equipos-unidad?autoprint=1", "_blank", "noopener,noreferrer")}
                  className="flex equipos-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all hover:bg-stone-800 active:scale-95 text-[#e5bb37]"
                  title="Imprimir con el orden configurado en PDF / Catálogo"
                >
                  <PrintRoundedIcon sx={{ fontSize: 18 }} />
                  <span>Imprimir (Orden Asignado)</span>
                </button>
                <div className="w-[1px] h-5 bg-stone-700 mx-0.5" />
                <button
                  type="button"
                  onClick={() => window.open("/listado-equipos-unidad?autoprint=1&sort=alpha", "_blank", "noopener,noreferrer")}
                  className="flex equipos-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all hover:bg-stone-800 active:scale-95 text-stone-200 hover:text-white"
                  title="Imprimir separando equipos por categoría, con orden alfabético dentro de cada grupo"
                >
                  <SortByAlphaRoundedIcon sx={{ fontSize: 18 }} />
                  <span>Imprimir (A-Z por categoría)</span>
                </button>
              </div>
            ) : null}
            <button
              type="button"
              onClick={onReload}
              disabled={loading}
              className="flex equipos-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-400 active:scale-95 disabled:opacity-50"
            >
              <RefreshRoundedIcon sx={{ fontSize: 18 }} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Recargando..." : "Recargar"}</span>
            </button>
          </div>
        </div>

        {showSummaryCards ? (
          section === "total" ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total subalternos</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalSubalternos}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total recintos</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{totalAsignacion}</p>
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
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Equipos con stock</p>
                <p className="mt-2 text-2xl font-bold text-stone-900">{itemsConStockDeposito}</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Equipos negativos</p>
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
            <div className="flex equipos-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos del movimiento</p>
              <button
                type="button"
                onClick={onAddItem}
                disabled={saving}
                className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Agregar equipo
              </button>
            </div>
            {draft.equipos.map((equipo, index) => (
              <div key={`stock-equipo-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
                <select
                  value={equipo.equipoId}
                  disabled={saving}
                  onChange={(event) => onDraftItemChange(index, "equipoId", event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                      <option value="">Seleccionar equipo</option>
                      {equiposOrdenados
                        .filter((catalogItem) => {
                          if (catalogItem.equipoId === equipo.equipoId) return true;
                          return !draft.equipos.some((selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.equipoId === catalogItem.equipoId);
                        })
                        .map((catalogItem) => (
                          <option key={catalogItem.equipoId} value={catalogItem.equipoId}>
                            {catalogItem.nombre}{catalogItem.tipoLabel && catalogItem.tipoLabel !== "General" ? ` (${catalogItem.tipoLabel})` : ""}
                          </option>
                        ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={equipo.cantidad}
                  disabled={saving}
                  onChange={(event) => onDraftItemChange(index, "cantidad", event.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={saving || draft.equipos.length <= 1}
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
                <div className="flex equipos-center justify-between gap-2">
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
                {prestamoDraft.equipos.map((equipo, index) => (
                  <div key={`prestamo-equipo-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)_auto]">
                    <select
                      value={equipo.equipoId}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "equipoId", event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar equipo</option>
                      {equiposOrdenados
                        .filter((catalogItem) => {
                          if (catalogItem.equipoId === equipo.equipoId) return true;
                          return !prestamoDraft.equipos.some((selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.equipoId === catalogItem.equipoId);
                        })
                        .map((catalogItem) => (
                          <option key={catalogItem.equipoId} value={catalogItem.equipoId}>
                            {catalogItem.nombre}{catalogItem.tipoLabel && catalogItem.tipoLabel !== "General" ? ` (${catalogItem.tipoLabel})` : ""}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={equipo.cantidad}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "cantidad", event.target.value)}
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <select
                      value={equipo.estadoEntrega}
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
                      value={equipo.comentarioEntrega}
                      disabled={prestamoSaving}
                      onChange={(event) => onPrestamoItemChange(index, "comentarioEntrega", event.target.value)}
                      placeholder="Comentario del equipo (opcional)"
                      className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => onRemovePrestamoItem(index)}
                      disabled={prestamoSaving || prestamoDraft.equipos.length <= 1}
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
            <div className="flex flex-wrap equipos-end justify-between gap-2">
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
                  <div className="flex flex-wrap equipos-start justify-between gap-2">
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
                    <div className="flex equipos-center gap-2">
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
                    {prestamo.equipos.map((equipo) => (
                      <div key={`${prestamo.prestamoId}-${equipo.equipoId}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                        <p className="text-xs text-stone-700">
                          <span className="font-semibold text-amber-700">{equipo.cantidad}</span> {equipo.nombre}
                        </p>
                        <p className="text-xs text-stone-600">Entrega: {equipo.estadoEntrega}{equipo.comentarioEntrega ? ` | ${equipo.comentarioEntrega}` : ""}</p>
                        {prestamo.estado === "PENDIENTE" ? (
                          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                            <select
                              value={getReturnItemData(prestamo.prestamoId, equipo).estadoDevolucion}
                              disabled={returningPrestamoId === prestamo.prestamoId}
                              onChange={(event) =>
                                setReturnItemsByPrestamo((prev) => ({
                                  ...prev,
                                  [prestamo.prestamoId]: {
                                    ...(prev[prestamo.prestamoId] ?? {}),
                                    [equipo.equipoId]: {
                                      ...getReturnItemData(prestamo.prestamoId, equipo),
                                      estadoDevolucion: event.target.value as PrestamoEstadoEquipo,
                                    },
                                  },
                                }))
                              }
                              className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                            >
                              {ESTADO_OPTIONS.map((estado) => (
                                <option key={`${prestamo.prestamoId}-${equipo.equipoId}-${estado}`} value={estado}>
                                  {estado}
                                </option>
                              ))}
                            </select>
                            <input
                              value={getReturnItemData(prestamo.prestamoId, equipo).comentarioDevolucion}
                              disabled={returningPrestamoId === prestamo.prestamoId}
                              onChange={(event) =>
                                setReturnItemsByPrestamo((prev) => ({
                                  ...prev,
                                  [prestamo.prestamoId]: {
                                    ...(prev[prestamo.prestamoId] ?? {}),
                                    [equipo.equipoId]: {
                                      ...getReturnItemData(prestamo.prestamoId, equipo),
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
                            Devolucion: {equipo.estadoDevolucion ?? "-"}
                            {equipo.comentarioDevolucion ? ` | ${equipo.comentarioDevolucion}` : ""}
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
          <div className="flex flex-wrap equipos-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-stone-900">{stockTableTitle}</h3>
            <div className="flex flex-wrap equipos-center gap-4">
              <label className="flex equipos-center gap-2 cursor-pointer text-xs font-medium text-stone-700 select-none">
                <input
                  type="checkbox"
                  checked={ordenAlfabetico}
                  onChange={(event) => setOrdenAlfabetico(event.target.checked)}
                  className="h-4 w-4 rounded border-stone-300 text-indigo-700 focus:ring-indigo-500"
                />
                <span>Ordenar A-Z por categoría</span>
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
            <div className="mt-3 space-y-6">
              {resumenFiltrado.length === 0 ? (
                <div className="rounded-lg border border-dashed border-stone-300 px-3 py-8 text-center text-stone-500 italic">
                  No se encontraron equipos que coincidan con &quot;{searchTermEquipos}&quot;.
                </div>
              ) : null}
              {resumenFiltrado.length > 0 ? stockTableSections.map((tableSection) => (
                <div key={tableSection.key}>
                  <div className="mb-2 flex equipos-center gap-2">
                    <h4 className="text-sm font-semibold text-stone-900">{tableSection.title}</h4>
                    <span className="inline-flex equipos-center rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                      {tableSection.equipos.length}
                    </span>
                  </div>
                  {tableSection.equipos.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-stone-300 px-3 py-6 text-sm text-stone-500">
                      {`No hay registros para la categoría ${tableSection.title.toLowerCase()} en esta vista.`}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <thead>
                          <tr>
                            <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold text-stone-700">Equipo</th>
                            {section === "total" ? (
                              <>
                                <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Subalternos</th>
                                <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Recintos</th>
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
                          {tableSection.equipos.map((equipo, index) => (
                            <tr key={equipo.equipoId} className={index % 2 === 0 ? "bg-white" : "bg-stone-100/80"}>
                              <td className="border-b border-stone-100 px-3 py-2 text-stone-900">{equipo.nombre}</td>
                              {section === "total" ? (
                                <>
                                  <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                                    <button
                                      type="button"
                                      onClick={() => void openItemTraceDialog(equipo, "SUBALTERNOS")}
                                      className={`rounded px-1 text-right font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                                        equipo.stockSubalternos < 0 ? "text-rose-600 font-bold animate-pulse" : "text-stone-900"
                                      }`}
                                      title={`Ver detalle de ${equipo.nombre} en Subalternos`}
                                    >
                                      {equipo.stockSubalternos}
                                    </button>
                                  </td>
                                  <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                                    <button
                                      type="button"
                                      onClick={() => void openItemTraceDialog(equipo, "RECINTO")}
                                      className={`rounded px-1 text-right font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                                        equipo.stockAsignacion < 0 ? "text-rose-600 font-bold animate-pulse" : "text-stone-900"
                                      }`}
                                      title={`Ver detalle de ${equipo.nombre} en Recintos`}
                                    >
                                      {equipo.stockAsignacion}
                                    </button>
                                  </td>
                                  <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                                    <button
                                      type="button"
                                      onClick={() => void openItemTraceDialog(equipo, "PRESTAMO")}
                                      className={`rounded px-1 text-right font-semibold hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                                        equipo.stockPrestamo < 0 ? "text-rose-600 font-bold animate-pulse" : "text-stone-900"
                                      }`}
                                      title={`Ver detalle de ${equipo.nombre} en Prestamo`}
                                    >
                                      {equipo.stockPrestamo}
                                    </button>
                                  </td>
                                  <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${
                                    equipo.stockDeposito < 0 ? "text-rose-600 font-bold" : "text-stone-900"
                                  }`}>
                                    {equipo.stockDeposito}
                                  </td>
                                  <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${
                                    equipo.stockUnidad < 0 ? "text-rose-600 font-bold" : "text-stone-900"
                                  }`}>
                                    {equipo.stockUnidad}
                                  </td>
                                  <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">
                                    {canEditSie ? (
                                      <div className="flex equipos-center justify-end gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step={1}
                                          value={getSieInputValue(equipo)}
                                          disabled={loading || sieSavingItemId !== null}
                                          onChange={(event) => updateSieDraft(equipo.equipoId, event.target.value)}
                                          onBlur={() => void persistSieValue(equipo)}
                                          onKeyDown={(event) => {
                                            if (event.key === "Enter") {
                                              event.preventDefault();
                                              void persistSieValue(equipo);
                                              return;
                                            }
                                            if (event.key === "Escape") {
                                              event.preventDefault();
                                              resetSieDraft(equipo);
                                            }
                                          }}
                                          className="w-24 rounded border border-stone-300 px-2 py-1 text-right text-xs font-semibold text-stone-900"
                                          aria-label={`Existencia del SIE para ${equipo.nombre}`}
                                        />
                                        {sieSavingItemId === equipo.equipoId ? (
                                          <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Guardando</span>
                                        ) : null}
                                      </div>
                                    ) : (
                                      (equipo.existenciaSie ?? 0)
                                    )}
                                  </td>
                                </>
                              ) : (
                                <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${
                                  equipo.stockDeposito < 0 ? "text-rose-600 font-bold" : "text-stone-900"
                                }`}>
                                  {equipo.stockDeposito}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )) : null}
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
                <div className="flex flex-wrap equipos-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{formatDateOnlyForDisplay(entry.fecha)}</p>
                    <p className="text-xs text-stone-600">{entry.persona ?? "Sin destinatario"}</p>
                  </div>
                  <div className="flex equipos-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${historyBadgeClass(entry.tipo)}`}>
                      {entry.tipo}
                    </span>
                    <span className="text-xs font-semibold text-stone-600">{`${entry.totalUnidades} unidades`}</span>
                  </div>
                </div>
                {entry.comentarios ? <p className="mt-2 text-xs text-stone-700">{entry.comentarios}</p> : null}
                <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                  {entry.equipos.map((equipo) => (
                    <p key={`${entry.id}-${equipo.equipoId}`} className="text-xs text-stone-700">
                      <span className={`font-semibold ${equipo.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        {equipo.delta > 0 ? `+${equipo.delta}` : equipo.delta}
                      </span>{" "}
                      {equipo.nombre}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {equipoTraceDialog ? (
        <ModalFrame onClose={closeItemTraceDialog} size="xl">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">
                Detalle de {equipoTraceDialog.column === "SUBALTERNOS" ? "Subalternos" : equipoTraceDialog.column === "RECINTO" ? "Recintos" : "Préstamos"}
              </h3>
              <p className="text-sm text-stone-600">{equipoTraceDialog.equipo.nombre}</p>
            </header>

            <div className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 md:grid-cols-2">
              <p><span className="font-semibold text-stone-900">Equipo ID:</span> {equipoTraceDialog.equipo.equipoId}</p>
              <p>
                <span className="font-semibold text-stone-900">Total en columna:</span>{" "}
                {equipoTraceDialog.column === "SUBALTERNOS"
                  ? (equipoTraceData?.totals.subalternos ?? equipoTraceDialog.equipo.stockSubalternos)
                  : equipoTraceDialog.column === "RECINTO"
                    ? (equipoTraceData?.totals.recinto ?? equipoTraceDialog.equipo.stockAsignacion)
                    : (equipoTraceData?.totals.prestamo ?? equipoTraceDialog.equipo.stockPrestamo)}
              </p>
            </div>

            {equipoTraceLoading ? (
              <LoadingInline label="Cargando trazabilidad..." className="mt-1" textClassName="text-sm font-medium text-stone-600" />
            ) : null}
            {equipoTraceError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{equipoTraceError}</p>
            ) : null}

            {!equipoTraceLoading && !equipoTraceError && equipoTraceData ? (
              equipoTraceDialog.column === "SUBALTERNOS" ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Personal con cantidad neta distinta de cero
                  </p>
                  {equipoTraceData.subalternos.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                      No hay tenencias activas para este equipo en la columna Subalternos.
                    </p>
                  ) : null}
                  {equipoTraceData.subalternos.map((entry) => (
                    <div key={`trace-subalterno-${entry.ci}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap equipos-start justify-between gap-2">
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
              ) : equipoTraceDialog.column === "RECINTO" ? (
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                    Recintos con asignaciones activas
                  </p>
                  {(!equipoTraceData.recintos || equipoTraceData.recintos.length === 0) ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                      No hay asignaciones activas a recintos para este equipo.
                    </p>
                  ) : null}
                  {(equipoTraceData.recintos || []).map((entry) => (
                    <div key={`trace-recinto-${entry.recintoNombre}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap equipos-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{entry.recintoNombre}</p>
                        </div>
                        <p className={`text-sm font-bold ${entry.cantidadNeta < 0 ? "text-rose-700" : "text-stone-900"}`}>
                          {entry.cantidadNeta > 0 ? `+${entry.cantidadNeta}` : entry.cantidadNeta}
                        </p>
                      </div>
                      <div className="mt-2 space-y-1">
                        {entry.movimientos.map((movimiento) => (
                          <div key={`trace-recinto-mov-${entry.recintoNombre}-${movimiento.movimientoId}`} className="rounded-lg border border-stone-200 bg-white px-2 py-1">
                            <p className="text-xs text-stone-700">
                              <span className={`font-semibold ${movimiento.delta < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {movimiento.delta > 0 ? `+${movimiento.delta}` : movimiento.delta}
                              </span>{" "}
                              ({movimiento.cantidad}) | Mov. #{movimiento.movimientoId} |{" "}
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
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Préstamos activos del equipo</p>
                  {equipoTraceData.prestamos.length === 0 ? (
                    <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
                      No hay préstamos activos para este equipo.
                    </p>
                  ) : null}
                  {equipoTraceData.prestamos.map((entry) => (
                    <div key={`trace-prestamo-${entry.prestamoId}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                      <div className="flex flex-wrap equipos-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{entry.destinatarioEtiqueta}</p>
                          <p className="text-xs text-stone-600">
                            {entry.destinatarioCi ? `CI ${formatUruguayanCi(entry.destinatarioCi)}` : "CI pendiente"}
                          </p>
                          <div className="flex equipos-center gap-2 mt-0.5">
                            <p className="text-xs text-stone-500">{prestamoClaseLabel(entry.clasePrestamo)}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              entry.clasePrestamo === "EXTERNO" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                            }`}>
                              {entry.clasePrestamo}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600 mt-1">
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
