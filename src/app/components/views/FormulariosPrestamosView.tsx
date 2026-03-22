"use client";

import { useMemo, useState } from "react";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { LoadingInline } from "@/app/components/shared";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay, getTodayDateInput } from "@/lib/date-helpers";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoDraftItem, PrestamoEstadoEquipo } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

export type PrestamoEditPayload = {
  fechaPrestamo: string;
  fechaEstimadaDevolucionTexto?: string;
  fechaDevolucion?: string;
  comentarios?: string;
  motivo: string;
  items: Array<{
    itemId: string;
    cantidad: number;
    estadoEntrega: PrestamoEstadoEquipo;
    comentarioEntrega?: string;
    estadoDevolucion?: PrestamoEstadoEquipo;
    comentarioDevolucion?: string;
  }>;
};

type FormulariosPrestamosViewProps = {
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  isAdmin: boolean;
  equipos: Equipo[];
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  editingPrestamoId: string | null;
  maxDate: string;
  onPrestamoDraftChange: (
    field: "destinatarioTipo" | "destinatarioCi" | "fechaPrestamo" | "fechaEstimadaDevolucionTexto" | "comentarios",
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
  onEditPrestamo: (prestamoId: string, payload: PrestamoEditPayload) => Promise<void>;
  onDeletePrestamo: (prestamoId: string) => void;
  onReload: () => void;
};

type PrestamosTab = "registrar" | "vigentes" | "historial";

function estadoBadgeClass(estado: "PENDIENTE" | "DEVUELTO") {
  return estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
}

function reciboHref(prestamoId: string) {
  return `/api/prestamos/${encodeURIComponent(prestamoId)}/recibo`;
}

export function FormulariosPrestamosView({
  data,
  loading,
  error,
  canWrite,
  isAdmin,
  equipos,
  personal,
  oficialesSuboficiales,
  prestamoDraft,
  prestamoSaving,
  returningPrestamoId,
  editingPrestamoId,
  maxDate,
  onPrestamoDraftChange,
  onPrestamoItemChange,
  onAddPrestamoItem,
  onRemovePrestamoItem,
  onSubmitPrestamo,
  onSubmitPrestamoAndPrint,
  onReturnPrestamo,
  onEditPrestamo,
  onDeletePrestamo,
  onReload,
}: FormulariosPrestamosViewProps) {
  const ESTADO_OPTIONS: PrestamoEstadoEquipo[] = ["NUEVO", "BUENO", "REGULAR", "MALO"];
  const [tab, setTab] = useState<PrestamosTab>(canWrite ? "registrar" : "vigentes");
  const [selectedPrestamo, setSelectedPrestamo] = useState<StockDashboardData["prestamos"][number] | null>(null);
  const [prestamoIdFilter, setPrestamoIdFilter] = useState("");
  const [returnDateByPrestamo, setReturnDateByPrestamo] = useState<Record<string, string>>({});
  const [returnItemsByPrestamo, setReturnItemsByPrestamo] = useState<
    Record<string, Record<string, { estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion: string }>>
  >({});
  const [returnDialog, setReturnDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    fechaDevolucion: string;
  } | null>(null);
  const [editDialogError, setEditDialogError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    fechaPrestamo: string;
    fechaEstimadaDevolucionTexto: string;
    fechaDevolucion: string;
    comentarios: string;
    motivo: string;
    items: Array<{
      itemId: string;
      nombre: string;
      cantidad: string;
      estadoEntrega: PrestamoEstadoEquipo;
      comentarioEntrega: string;
      estadoDevolucion: PrestamoEstadoEquipo;
      comentarioDevolucion: string;
    }>;
  } | null>(null);
  const prestamos = useMemo(() => data?.prestamos ?? [], [data]);
  const normalizedPrestamoIdFilter = prestamoIdFilter.trim();

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

  function openEditDialog(prestamo: StockDashboardData["prestamos"][number]) {
    setEditDialogError(null);
    setEditDialog({
      prestamo,
      fechaPrestamo: prestamo.fechaPrestamo || getTodayDateInput(),
      fechaEstimadaDevolucionTexto: prestamo.fechaEstimadaDevolucionTexto ?? "",
      fechaDevolucion: prestamo.fechaDevolucion || getTodayDateInput(),
      comentarios: prestamo.comentarios ?? "",
      motivo: "",
      items: prestamo.items.map((item) => ({
        itemId: item.itemId,
        nombre: item.nombre,
        cantidad: String(item.cantidad),
        estadoEntrega: item.estadoEntrega,
        comentarioEntrega: item.comentarioEntrega ?? "",
        estadoDevolucion: item.estadoDevolucion ?? item.estadoEntrega,
        comentarioDevolucion: item.comentarioDevolucion ?? "",
      })),
    });
  }

  async function submitEditDialog() {
    if (!editDialog) return;
    const motivo = editDialog.motivo.trim();
    if (!motivo) {
      setEditDialogError("Debes indicar el motivo de la correccion.");
      return;
    }

    const payloadItems = editDialog.items.map((item) => ({
      itemId: item.itemId,
      cantidad: Number(item.cantidad),
      estadoEntrega: item.estadoEntrega,
      comentarioEntrega: item.comentarioEntrega.trim() || undefined,
      estadoDevolucion: editDialog.prestamo.estado === "DEVUELTO" ? item.estadoDevolucion : undefined,
      comentarioDevolucion: editDialog.prestamo.estado === "DEVUELTO" ? item.comentarioDevolucion.trim() || undefined : undefined,
    }));

    if (payloadItems.some((item) => !Number.isInteger(item.cantidad) || item.cantidad <= 0)) {
      setEditDialogError("Todas las cantidades deben ser enteros mayores a 0.");
      return;
    }

    setEditDialogError(null);
    try {
      await onEditPrestamo(editDialog.prestamo.prestamoId, {
        fechaPrestamo: editDialog.fechaPrestamo.trim(),
        fechaEstimadaDevolucionTexto: editDialog.fechaEstimadaDevolucionTexto.trim() || undefined,
        fechaDevolucion: editDialog.prestamo.estado === "DEVUELTO" ? editDialog.fechaDevolucion.trim() : undefined,
        comentarios: editDialog.comentarios.trim() || undefined,
        motivo,
        items: payloadItems,
      });
      setEditDialog(null);
      if (selectedPrestamo?.prestamoId === editDialog.prestamo.prestamoId) {
        setSelectedPrestamo(null);
      }
    } catch (error) {
      setEditDialogError(error instanceof Error ? error.message : "No se pudo editar el prestamo.");
    }
  }

  const equiposOrdenados = useMemo(
    () => [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    [equipos],
  );

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

  const prestamosVigentes = useMemo(
    () => prestamos.filter((prestamo) => prestamo.estado === "PENDIENTE"),
    [prestamos],
  );
  const prestamosVigentesFiltrados = useMemo(() => {
    if (normalizedPrestamoIdFilter === "") return prestamosVigentes;
    return prestamosVigentes.filter((prestamo) => prestamo.prestamoId.includes(normalizedPrestamoIdFilter));
  }, [prestamosVigentes, normalizedPrestamoIdFilter]);
  const prestamosFiltrados = useMemo(() => {
    if (normalizedPrestamoIdFilter === "") return prestamos;
    return prestamos.filter((prestamo) => prestamo.prestamoId.includes(normalizedPrestamoIdFilter));
  }, [prestamos, normalizedPrestamoIdFilter]);

  function renderPrestamoList(items: StockDashboardData["prestamos"], emptyMessage: string, showReturnAction: boolean) {
    return (
      <div className="space-y-2">
        {items.length === 0 ? <p className="text-sm text-stone-600">{emptyMessage}</p> : null}
        {items.map((prestamo) => (
          <article key={prestamo.prestamoId} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedPrestamo(prestamo)}
                className="text-left"
              >
                <p className="text-sm font-semibold text-stone-900">{prestamo.reciboNumero}</p>
                <p className="text-xs text-stone-600">
                  {prestamo.destinatarioEtiqueta}
                  {prestamo.destinatarioCi ? ` - CI ${formatUruguayanCi(prestamo.destinatarioCi)}` : ""}
                </p>
                <p className="text-xs text-stone-500">Prestado: {formatDateOnlyForDisplay(prestamo.fechaPrestamo)}</p>
                {prestamo.fechaEstimadaDevolucionTexto ? (
                  <p className="text-xs text-stone-500">Estimado: {prestamo.fechaEstimadaDevolucionTexto}</p>
                ) : null}
              </button>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${estadoBadgeClass(prestamo.estado)}`}>
                  {prestamo.estado}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPrestamo(prestamo)}
                  className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Ver detalle
                </button>
                <a
                  href={reciboHref(prestamo.prestamoId)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Recibo
                </a>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => openEditDialog(prestamo)}
                    disabled={editingPrestamoId === prestamo.prestamoId}
                    className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                  >
                    {editingPrestamoId === prestamo.prestamoId ? "Guardando..." : "Editar"}
                  </button>
                ) : null}
                {canWrite && showReturnAction && prestamo.estado === "PENDIENTE" ? (
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
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Prestamos</h2>
            <p className="mt-1 text-xs text-stone-600">Registro, vigentes e historial en un solo modulo.</p>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {canWrite ? (
            <button
              type="button"
              onClick={() => setTab("registrar")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "registrar" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
            >
              Registrar prestamo
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setTab("vigentes")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "vigentes" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
          >
            Prestamos vigentes
          </button>
          <button
            type="button"
            onClick={() => setTab("historial")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === "historial" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
          >
            Historial de prestamos
          </button>
        </div>
      </article>

      {error ? <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}

      {tab === "vigentes" || tab === "historial" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Buscar hoja por ID</h3>
          <label className="mt-3 block text-xs text-stone-700">
            ID de prestamo
            <input
              type="text"
              inputMode="numeric"
              value={prestamoIdFilter}
              onChange={(event) => setPrestamoIdFilter(event.target.value)}
              placeholder="Ej: 145"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </article>
      ) : null}

      {tab === "registrar" ? (
        canWrite ? (
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
                Fecha estimada devoluciÃ³n (texto)
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
                <div
                  key={`formulario-prestamo-item-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)_auto]"
                >
                  <select
                    value={item.itemId}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoItemChange(index, "itemId", event.target.value)}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar equipo</option>
                    {equiposOrdenados
                      .filter((equipo) => {
                        if (equipo.itemId === item.itemId) return true;
                        return !prestamoDraft.items.some(
                          (selectedItem, selectedIndex) =>
                            selectedIndex !== index && selectedItem.itemId === equipo.itemId,
                        );
                      })
                      .map((equipo) => (
                        <option key={equipo.itemId} value={equipo.itemId}>
                          {equipo.nombre}
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
                {prestamoSaving ? (
                  <LoadingInline label="Guardando..." size="xs" tone="light" textClassName="text-xs font-semibold text-white" />
                ) : (
                  "Guardar e imprimir"
                )}
              </button>
            </div>
          </article>
        ) : (
          <article className="ej-card rounded-2xl p-4">
            <p className="text-sm text-stone-600">No tienes permisos para registrar prestamos.</p>
          </article>
        )
      ) : null}

      {tab === "vigentes" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Prestamos vigentes</h3>
          <div className="mt-3">
            {renderPrestamoList(
              prestamosVigentesFiltrados,
              normalizedPrestamoIdFilter === ""
                ? "No hay prestamos vigentes."
                : `No hay prestamos vigentes para ID ${normalizedPrestamoIdFilter}.`,
              true,
            )}
          </div>
        </article>
      ) : null}

      {tab === "historial" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Historial (todos los prestamos)</h3>
          <div className="mt-3">
            {renderPrestamoList(
              prestamosFiltrados,
              normalizedPrestamoIdFilter === ""
                ? "No hay prestamos registrados."
                : `No hay prestamos para ID ${normalizedPrestamoIdFilter}.`,
              false,
            )}
          </div>
        </article>
      ) : null}

      {selectedPrestamo ? (
        <ModalFrame onClose={() => setSelectedPrestamo(null)} size="lg">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Detalle del prestamo</h3>
              <p className="text-sm text-stone-600">{selectedPrestamo.reciboNumero}</p>
            </header>

            <div className="grid grid-cols-1 gap-2 text-sm text-stone-700 md:grid-cols-2">
              <p><span className="font-semibold text-stone-900">Identificador:</span> {selectedPrestamo.prestamoId}</p>
              <p><span className="font-semibold text-stone-900">Estado:</span> {selectedPrestamo.estado}</p>
              <p><span className="font-semibold text-stone-900">Destinatario:</span> {selectedPrestamo.destinatarioEtiqueta}</p>
              <p><span className="font-semibold text-stone-900">CI:</span> {formatUruguayanCi(selectedPrestamo.destinatarioCi)}</p>
              <p><span className="font-semibold text-stone-900">Entregado por:</span> {selectedPrestamo.usuarioEntregaNombre}</p>
              <p>
                <span className="font-semibold text-stone-900">Recibido por:</span>{" "}
                {selectedPrestamo.usuarioRecibeDevolucionNombre ?? "Pendiente"}
              </p>
              <p><span className="font-semibold text-stone-900">Fecha prestamo:</span> {formatDateOnlyForDisplay(selectedPrestamo.fechaPrestamo)}</p>
              <p>
                <span className="font-semibold text-stone-900">Fecha estimada devoluciÃ³n:</span>{" "}
                {selectedPrestamo.fechaEstimadaDevolucionTexto?.trim() ? selectedPrestamo.fechaEstimadaDevolucionTexto : "-"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Fecha devoluciÃ³n:</span>{" "}
                {selectedPrestamo.fechaDevolucion ? formatDateOnlyForDisplay(selectedPrestamo.fechaDevolucion) : "Pendiente"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Comentarios:</span>{" "}
                {selectedPrestamo.comentarios?.trim() ? selectedPrestamo.comentarios : "-"}
              </p>
            </div>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos prestados</p>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                {selectedPrestamo.items.map((item) => (
                  <div key={`${selectedPrestamo.prestamoId}-modal-${item.itemId}`} className="mb-2 rounded-lg border border-stone-200 bg-white p-2 last:mb-0">
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold text-amber-700">{item.cantidad}</span> {item.nombre}
                    </p>
                    <p className="text-xs text-stone-600">Entrega: {item.estadoEntrega}{item.comentarioEntrega ? ` | ${item.comentarioEntrega}` : ""}</p>
                    {selectedPrestamo.estado === "PENDIENTE" ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                        <select
                          value={getReturnItemData(selectedPrestamo.prestamoId, item).estadoDevolucion}
                          disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                          onChange={(event) =>
                            setReturnItemsByPrestamo((prev) => ({
                              ...prev,
                              [selectedPrestamo.prestamoId]: {
                                ...(prev[selectedPrestamo.prestamoId] ?? {}),
                                [item.itemId]: {
                                  ...getReturnItemData(selectedPrestamo.prestamoId, item),
                                  estadoDevolucion: event.target.value as PrestamoEstadoEquipo,
                                },
                              },
                            }))
                          }
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                        >
                          {ESTADO_OPTIONS.map((estado) => (
                            <option key={`${selectedPrestamo.prestamoId}-${item.itemId}-modal-${estado}`} value={estado}>
                              {estado}
                            </option>
                          ))}
                        </select>
                        <input
                          value={getReturnItemData(selectedPrestamo.prestamoId, item).comentarioDevolucion}
                          disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                          onChange={(event) =>
                            setReturnItemsByPrestamo((prev) => ({
                              ...prev,
                              [selectedPrestamo.prestamoId]: {
                                ...(prev[selectedPrestamo.prestamoId] ?? {}),
                                [item.itemId]: {
                                  ...getReturnItemData(selectedPrestamo.prestamoId, item),
                                  comentarioDevolucion: event.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="Comentario devoluciÃ³n (opcional)"
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
            </section>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => openEditDialog(selectedPrestamo)}
                  disabled={editingPrestamoId === selectedPrestamo.prestamoId}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                >
                  {editingPrestamoId === selectedPrestamo.prestamoId ? "Guardando..." : "Editar"}
                </button>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => onDeletePrestamo(selectedPrestamo.prestamoId)}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Eliminar registro
                </button>
              ) : null}
              <a
                href={reciboHref(selectedPrestamo.prestamoId)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Abrir recibo
              </a>
              {canWrite && selectedPrestamo.estado === "PENDIENTE" ? (
                <button
                  type="button"
                  onClick={() => openReturnDialog(selectedPrestamo)}
                  disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {returningPrestamoId === selectedPrestamo.prestamoId ? "Guardando..." : "Devolver"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedPrestamo(null)}
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

      {editDialog ? (
        <ModalFrame onClose={() => setEditDialog(null)} size="xl">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Editar prestamo (admin)</h3>
              <p className="text-sm text-stone-600">{editDialog.prestamo.reciboNumero}</p>
            </header>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="text-xs text-stone-700">
                Fecha prestamo
                <DateTextInput
                  value={editDialog.fechaPrestamo}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(value) => setEditDialog((current) => (current ? { ...current, fechaPrestamo: value } : current))}
                  ariaLabel={`Fecha prestamo. Maximo ${maxDate}`}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              {editDialog.prestamo.estado === "DEVUELTO" ? (
                <label className="text-xs text-stone-700">
                  Fecha devolucion
                  <DateTextInput
                    value={editDialog.fechaDevolucion}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(value) => setEditDialog((current) => (current ? { ...current, fechaDevolucion: value } : current))}
                    ariaLabel={`Fecha devolucion. Maximo ${maxDate}`}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="text-xs text-stone-700">
                Fecha estimada devolucion (texto)
                <input
                  value={editDialog.fechaEstimadaDevolucionTexto}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(event) =>
                    setEditDialog((current) =>
                      current ? { ...current, fechaEstimadaDevolucionTexto: event.target.value } : current,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Comentarios
                <input
                  value={editDialog.comentarios}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(event) => setEditDialog((current) => (current ? { ...current, comentarios: event.target.value } : current))}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos</p>
              {editDialog.items.map((item, index) => (
                <div
                  key={`edit-prestamo-item-${item.itemId}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)]"
                >
                  <p className="text-sm font-semibold text-stone-900">{item.nombre}</p>
                  <input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.items];
                        nextItems[index] = { ...nextItems[index], cantidad: event.target.value };
                        return { ...current, items: nextItems };
                      })
                    }
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={item.estadoEntrega}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.items];
                        nextItems[index] = { ...nextItems[index], estadoEntrega: event.target.value as PrestamoEstadoEquipo };
                        return { ...current, items: nextItems };
                      })
                    }
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  >
                    {ESTADO_OPTIONS.map((estado) => (
                      <option key={`edit-prestamo-item-${item.itemId}-${estado}`} value={estado}>
                        {estado}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.comentarioEntrega}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.items];
                        nextItems[index] = { ...nextItems[index], comentarioEntrega: event.target.value };
                        return { ...current, items: nextItems };
                      })
                    }
                    placeholder="Comentario entrega (opcional)"
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  />
                  {editDialog.prestamo.estado === "DEVUELTO" ? (
                    <div className="md:col-span-4 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                      <select
                        value={item.estadoDevolucion}
                        disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                        onChange={(event) =>
                          setEditDialog((current) => {
                            if (!current) return current;
                            const nextItems = [...current.items];
                            nextItems[index] = { ...nextItems[index], estadoDevolucion: event.target.value as PrestamoEstadoEquipo };
                            return { ...current, items: nextItems };
                          })
                        }
                        className="rounded border border-stone-300 px-3 py-2 text-sm"
                      >
                        {ESTADO_OPTIONS.map((estado) => (
                          <option key={`edit-prestamo-devolucion-${item.itemId}-${estado}`} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                      <input
                        value={item.comentarioDevolucion}
                        disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                        onChange={(event) =>
                          setEditDialog((current) => {
                            if (!current) return current;
                            const nextItems = [...current.items];
                            nextItems[index] = { ...nextItems[index], comentarioDevolucion: event.target.value };
                            return { ...current, items: nextItems };
                          })
                        }
                        placeholder="Comentario devolucion (opcional)"
                        className="rounded border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </section>

            <label className="block text-xs text-stone-700">
              Motivo de la correccion (obligatorio para auditoria)
              <input
                value={editDialog.motivo}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                onChange={(event) => setEditDialog((current) => (current ? { ...current, motivo: event.target.value } : current))}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            {editDialogError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{editDialogError}</p>
            ) : null}

            <footer className="flex justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => setEditDialog(null)}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitEditDialog()}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {editingPrestamoId === editDialog.prestamo.prestamoId ? "Guardando..." : "Guardar cambios"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}

