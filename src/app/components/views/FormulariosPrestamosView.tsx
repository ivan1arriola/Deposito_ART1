"use client";

import { useMemo, useState } from "react";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { LoadingInline } from "@/app/components/shared";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { PrestamoDraft, PrestamoDraftItem } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";

type FormulariosPrestamosViewProps = {
  data: StockDashboardData | null;
  loading: boolean;
  error: string | null;
  canWrite: boolean;
  equipos: Equipo[];
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  prestamoDraft: PrestamoDraft;
  prestamoSaving: boolean;
  returningPrestamoId: string | null;
  maxDate: string;
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

type PrestamosTab = "registrar" | "vigentes" | "historial";

function estadoBadgeClass(estado: "PENDIENTE" | "DEVUELTO") {
  return estado === "PENDIENTE" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
}

export function FormulariosPrestamosView({
  data,
  loading,
  error,
  canWrite,
  equipos,
  personal,
  oficialesSuboficiales,
  prestamoDraft,
  prestamoSaving,
  returningPrestamoId,
  maxDate,
  onPrestamoDraftChange,
  onPrestamoItemChange,
  onAddPrestamoItem,
  onRemovePrestamoItem,
  onSubmitPrestamo,
  onReturnPrestamo,
  onReload,
}: FormulariosPrestamosViewProps) {
  const [tab, setTab] = useState<PrestamosTab>(canWrite ? "registrar" : "vigentes");
  const [selectedPrestamo, setSelectedPrestamo] = useState<StockDashboardData["prestamos"][number] | null>(null);
  const prestamos = useMemo(() => data?.prestamos ?? [], [data]);

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

    return [...oficialesSuboficiales]
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
                {canWrite && showReturnAction && prestamo.estado === "PENDIENTE" ? (
                  <button
                    type="button"
                    onClick={() => onReturnPrestamo(prestamo.prestamoId, maxDate)}
                    disabled={returningPrestamoId === prestamo.prestamoId}
                    className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {returningPrestamoId === prestamo.prestamoId ? "Guardando..." : "Devolver hoy"}
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
            <h2 className="text-base font-semibold text-stone-900">Formularios de prestamos</h2>
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
                <div
                  key={`formulario-prestamo-item-${index}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_auto]"
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
                {prestamoSaving ? (
                  <LoadingInline label="Guardando..." size="xs" tone="light" textClassName="text-xs font-semibold text-white" />
                ) : (
                  "Guardar prestamo"
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
            {renderPrestamoList(prestamosVigentes, "No hay prestamos vigentes.", true)}
          </div>
        </article>
      ) : null}

      {tab === "historial" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Historial (todos los prestamos)</h3>
          <div className="mt-3">
            {renderPrestamoList(prestamos, "No hay prestamos registrados.", false)}
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
                <span className="font-semibold text-stone-900">Fecha devolucion:</span>{" "}
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
                  <p key={`${selectedPrestamo.prestamoId}-modal-${item.itemId}`} className="text-sm text-stone-700">
                    <span className="font-semibold text-amber-700">{item.cantidad}</span> {item.nombre}
                  </p>
                ))}
              </div>
            </section>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
              {canWrite && selectedPrestamo.estado === "PENDIENTE" ? (
                <button
                  type="button"
                  onClick={() => onReturnPrestamo(selectedPrestamo.prestamoId, maxDate)}
                  disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {returningPrestamoId === selectedPrestamo.prestamoId ? "Guardando..." : "Marcar devuelto hoy"}
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
    </section>
  );
}
