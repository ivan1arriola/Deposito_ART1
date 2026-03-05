"use client";

import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { Equipo } from "@/types/entities";
import type { StockOperacionDraft, StockOperacionDraftItem } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

type StockViewProps = {
  section: "total" | "actual" | "alta" | "baja" | "historial";
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
  onReload: () => void;
};

function historyBadgeClass(tipo: "INGRESO" | "EGRESO" | "ENTREGA" | "DEVOLUCION") {
  if (tipo === "INGRESO" || tipo === "DEVOLUCION") return "bg-emerald-100 text-emerald-800";
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
  onReload,
}: StockViewProps) {
  const resumen = data?.resumen ?? [];
  const historial = data?.historial ?? [];
  const equiposOrdenadosAlfabeticamente = [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));

  const valueBySection = (item: (typeof resumen)[number]) => (section === "total" ? item.stockTotal : item.stockDeposito);
  const totalUnidades = resumen.reduce((total, item) => total + valueBySection(item), 0);
  const itemsConStock = resumen.filter((item) => valueBySection(item) !== 0).length;
  const itemsNegativos = resumen.filter((item) => valueBySection(item) < 0).length;

  const showSummaryCards = section === "total" || section === "actual";
  const showManualForm = canWrite && (section === "alta" || section === "baja");
  const showStockTable = section === "total" || section === "actual";
  const showHistory = section === "historial";

  const formTitle = section === "alta" ? "Alta de stock" : "Baja de stock";
  const submitLabel = saving ? "Guardando..." : section === "alta" ? "Guardar ingreso" : "Guardar egreso";

  const viewTitle =
    section === "total"
      ? "Total de equipos en la unidad"
      : section === "actual"
        ? "Stock interno de deposito"
        : section === "alta"
          ? "Alta de stock"
          : section === "baja"
            ? "Baja de stock"
            : "Historial de stock";

  const description =
    section === "total"
      ? "Suma por item: equipos entregados al personal mas recuento interno del deposito."
      : section === "actual"
        ? "Recuento interno del deposito. Se altera por altas, bajas y movimientos de personal que afectan stock."
        : "Recuento interno del deposito. Se altera por altas, bajas y movimientos de personal que afectan stock.";

  const cardUnitsLabel = section === "total" ? "Total unidad" : "Total deposito";
  const cardItemsLabel = section === "total" ? "Items con total" : "Items con stock";
  const cardNegativeLabel = section === "total" ? "Items totales en negativo" : "Items en negativo";
  const stockTableTitle =
    section === "total" ? "Total por item (personal + deposito interno)" : "Stock interno de deposito por equipo";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{viewTitle}</h2>
            <p className="mt-1 text-xs text-stone-600">{description}</p>
          </div>
          <button
            type="button"
            onClick={onReload}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            Recargar
          </button>
        </div>

        {showSummaryCards ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{cardUnitsLabel}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{totalUnidades}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{cardItemsLabel}</p>
              <p className="mt-2 text-2xl font-bold text-stone-900">{itemsConStock}</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{cardNegativeLabel}</p>
              <p className={`mt-2 text-2xl font-bold ${itemsNegativos > 0 ? "text-rose-700" : "text-stone-900"}`}>{itemsNegativos}</p>
            </div>
          </div>
        ) : null}
      </article>

      {showManualForm ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">{formTitle}</h3>
          <p className="mt-1 text-xs text-stone-600">
            Puedes cargar varios equipos dentro del mismo movimiento. Agrega una fila por cada equipo que quieras incluir.
          </p>
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
            <label className="text-xs text-stone-700 md:col-span-1">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Items del movimiento</p>
                <p className="mt-1 text-xs text-stone-500">
                  {draft.items.length === 1
                    ? "Actualmente tienes 1 equipo cargado en este movimiento."
                    : `Actualmente tienes ${draft.items.length} equipos cargados en este movimiento.`}
                </p>
              </div>
              <button
                type="button"
                onClick={onAddItem}
                disabled={saving}
                className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Agregar otro equipo
              </button>
            </div>
            {draft.items.map((item, index) => (
              <div key={`stock-item-${index}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">{`Equipo ${index + 1}`}</p>
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    disabled={saving || draft.items.length <= 1}
                    className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_120px]">
                  <label className="text-xs text-stone-700">
                    Equipo
                    <select
                      value={item.itemId}
                      disabled={saving}
                      onChange={(event) => onDraftItemChange(index, "itemId", event.target.value)}
                      className="mt-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="">Seleccionar equipo</option>
                      {equiposOrdenadosAlfabeticamente
                        .filter((catalogItem) => {
                          if (catalogItem.itemId === item.itemId) return true;
                          return !draft.items.some(
                            (selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId,
                          );
                        })
                        .map((catalogItem) => (
                          <option key={catalogItem.itemId} value={catalogItem.itemId}>
                            {catalogItem.nombre}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="text-xs text-stone-700">
                    Cantidad
                    <input
                      type="number"
                      min={1}
                      value={item.cantidad}
                      disabled={saving}
                      onChange={(event) => onDraftItemChange(index, "cantidad", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </article>
      ) : null}

      {showStockTable ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">{stockTableTitle}</h3>
          {loading ? <p className="mt-3 text-sm text-stone-600">Cargando stock...</p> : null}
          {error ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          {!loading && !error ? (
            <>
              <div className="mt-3 hidden overflow-x-auto lg:block">
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
                            <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${item.stockPersonal < 0 ? "text-rose-700" : "text-stone-900"}`}>
                              {item.stockPersonal}
                            </td>
                            <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${item.stockDeposito < 0 ? "text-rose-700" : "text-stone-900"}`}>
                              {item.stockDeposito}
                            </td>
                            <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${item.stockTotal < 0 ? "text-rose-700" : "text-stone-900"}`}>
                              {item.stockTotal}
                            </td>
                          </>
                        ) : (
                          <td className={`border-b border-stone-100 px-3 py-2 text-right font-semibold ${item.stockDeposito < 0 ? "text-rose-700" : "text-stone-900"}`}>
                            {item.stockDeposito}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 lg:hidden">
                {resumen.map((item) => (
                  <div key={item.itemId} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    {section === "total" ? (
                      <>
                        <p className="font-semibold text-stone-900">{item.nombre}</p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-lg bg-white px-2 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Personal</p>
                            <p className={`text-sm font-bold ${item.stockPersonal < 0 ? "text-rose-700" : "text-stone-900"}`}>{item.stockPersonal}</p>
                          </div>
                          <div className="rounded-lg bg-white px-2 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Deposito</p>
                            <p className={`text-sm font-bold ${item.stockDeposito < 0 ? "text-rose-700" : "text-stone-900"}`}>{item.stockDeposito}</p>
                          </div>
                          <div className="rounded-lg bg-white px-2 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Total</p>
                            <p className={`text-sm font-bold ${item.stockTotal < 0 ? "text-rose-700" : "text-stone-900"}`}>{item.stockTotal}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-stone-900">{item.nombre}</p>
                        <p className={`text-lg font-bold ${item.stockDeposito < 0 ? "text-rose-700" : "text-stone-900"}`}>{item.stockDeposito}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </article>
      ) : null}

      {showHistory ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Historial que impacta stock interno</h3>
          {loading ? <p className="mt-3 text-sm text-stone-600">Cargando stock...</p> : null}
          {error ? <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <div className="mt-3 space-y-2">
            {historial.length === 0 ? <p className="text-sm text-stone-600">No hay movimientos de stock registrados.</p> : null}
            {historial.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{formatDateOnlyForDisplay(entry.fecha)}</p>
                    <p className="text-xs text-stone-600">
                      {entry.origen === "MANUAL"
                        ? "Movimiento manual de stock"
                        : `${entry.persona ?? "Personal sin dato"}${entry.ci ? ` - CI ${entry.ci}` : ""}`}
                    </p>
                    <p className="text-xs text-stone-500">
                      {entry.registradoPor ? `Registrado por: ${entry.registradoPor}` : "Registrado por: sin dato"}
                    </p>
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
