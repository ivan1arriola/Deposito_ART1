"use client";

import { useMemo } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { LoadingInline } from "@/app/components/shared";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { formatUruguayanCi } from "@/lib/ci";
import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoDraftItem, StockOperacionDraft, StockOperacionDraftItem } from "@/types/forms";
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
    field: "destinatarioTipo" | "destinatarioCi" | "fechaPrestamo" | "comentarios",
    value: string,
  ) => void;
  onPrestamoItemChange: (index: number, field: keyof PrestamoDraftItem, value: string) => void;
  onAddPrestamoItem: () => void;
  onRemovePrestamoItem: (index: number) => void;
  onSubmitPrestamo: () => void;
  onReturnPrestamo: (prestamoId: string, fechaDevolucion: string) => void;
  onReload: () => void;
};

function historyBadgeClass(tipo: "INGRESO" | "EGRESO" | "ENTREGA" | "DEVOLUCION" | "PRESTAMO" | "DEVOLUCION_PRESTAMO") {
  if (tipo === "INGRESO" || tipo === "DEVOLUCION" || tipo === "DEVOLUCION_PRESTAMO") return "bg-emerald-100 text-emerald-800";
  if (tipo === "PRESTAMO") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
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
  onReturnPrestamo,
  onReload,
}: StockViewProps) {
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

    return [...oficialesSuboficiales]
      .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, "es", { sensitivity: "base" }))
      .map((registro) => ({
        ci: registro.ci,
        label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`,
      }));
  }, [prestamoDraft.destinatarioTipo, personal, oficialesSuboficiales]);

  const valueBySection = (item: (typeof resumen)[number]) => (section === "total" ? item.stockTotal : item.stockDeposito);
  const totalUnidades = resumen.reduce((total, item) => total + valueBySection(item), 0);
  const itemsConStock = resumen.filter((item) => valueBySection(item) !== 0).length;
  const itemsNegativos = resumen.filter((item) => valueBySection(item) < 0).length;

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

  const stockTableTitle = section === "total" ? "Total por item (personal + deposito)" : "Stock interno de deposito por equipo";
  const returnDateFallback = maxDate;

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
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Total unidades</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{totalUnidades}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Items con stock</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{itemsConStock}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Items negativos</p>
              <p className={`mt-2 text-2xl font-bold ${itemsNegativos > 0 ? "text-rose-700" : "text-stone-900"}`}>{itemsNegativos}</p>
            </div>
          </div>
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
                    <option value="PERSONAL">Personal</option>
                    <option value="OFICIAL_SUBOFICIAL">Oficiales y Sub Oficiales</option>
                  </select>
                </label>
                <label className="text-xs text-stone-700">
                  Destinatario
                  <select
                    value={prestamoDraft.destinatarioCi}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("destinatarioCi", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar destinatario</option>
                    {destinatarioOptions.map((option) => (
                      <option key={option.ci} value={option.ci}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
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
                  <div key={`prestamo-item-${index}`} className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]">
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

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onSubmitPrestamo}
                  disabled={prestamoSaving}
                  className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {prestamoSaving ? <LoadingInline label="Guardando..." size="xs" tone="light" textClassName="text-xs font-semibold text-white" /> : "Guardar prestamo"}
                </button>
              </div>
            </article>
          ) : null}

          <article className="ej-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Prestamos registrados</h3>
            <div className="mt-3 space-y-2">
              {prestamos.length === 0 ? <p className="text-sm text-stone-600">No hay prestamos registrados.</p> : null}
              {prestamos.map((prestamo) => (
                <div key={prestamo.prestamoId} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{prestamo.reciboNumero}</p>
                      <p className="text-xs text-stone-600">
                        {prestamo.destinatarioEtiqueta}
                        {prestamo.destinatarioCi ? ` - CI ${formatUruguayanCi(prestamo.destinatarioCi)}` : ""}
                      </p>
                      <p className="text-xs text-stone-500">Prestado: {formatDateOnlyForDisplay(prestamo.fechaPrestamo)}</p>
                      {prestamo.fechaDevolucion ? <p className="text-xs text-stone-500">Devuelto: {formatDateOnlyForDisplay(prestamo.fechaDevolucion)}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${prestamo.estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {prestamo.estado}
                      </span>
                      {canWrite && prestamo.estado === "PENDIENTE" ? (
                        <button
                          type="button"
                          onClick={() => onReturnPrestamo(prestamo.prestamoId, returnDateFallback)}
                          disabled={returningPrestamoId === prestamo.prestamoId}
                          className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {returningPrestamoId === prestamo.prestamoId ? "Guardando..." : "Devolver hoy"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {prestamo.comentarios ? <p className="mt-2 text-xs text-stone-700">{prestamo.comentarios}</p> : null}
                  <div className="mt-2 grid grid-cols-1 gap-1 md:grid-cols-2">
                    {prestamo.items.map((item) => (
                      <p key={`${prestamo.prestamoId}-${item.itemId}`} className="text-xs text-stone-700">
                        <span className="font-semibold text-amber-700">{item.cantidad}</span> {item.nombre}
                      </p>
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
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Personal</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Deposito</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Total</th>
                      </>
                    ) : (
                      <th className="border-b border-stone-200 px-3 py-2 text-right font-semibold text-stone-700">Stock deposito</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {resumen.map((item) => (
                    <tr key={item.itemId}>
                      <td className="border-b border-stone-100 px-3 py-2 text-stone-900">{item.nombre}</td>
                      {section === "total" ? (
                        <>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockPersonal}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockDeposito}</td>
                          <td className="border-b border-stone-100 px-3 py-2 text-right font-semibold text-stone-900">{item.stockTotal}</td>
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
    </section>
  );
}
