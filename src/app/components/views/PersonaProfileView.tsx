"use client";

import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay, parseDateInput } from "@/lib/date-helpers";
import { tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import type { PersonalObservacion, Talla } from "@/types/entities";
import type { PrestamoStockEntry, RegistroView } from "@/types/views";

export type PersonaProfileTipo = "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
export type PersonaProfileTimelineType = "ENTREGA" | "DEVOLUCION" | "PRESTAMO" | "DEVOLUCION_PRESTAMO";

export type PersonaProfileIdentity = {
  ci: string;
  tipo: PersonaProfileTipo;
  apellido: string;
  nombre: string;
  gradoAbreviacion: string;
  gradoNombre: string;
  bateriaNombre: string | null;
  telefonoContacto: string | null;
  esReingreso: boolean | null;
  fechaIngreso: string | null;
  fechaIngresoOriginal: string | null;
  tallas: Talla[];
};

export type PersonaProfileEquipmentRow = {
  item: string;
  entregado: number;
  devuelto: number;
  saldo: number;
  fuente: "REGISTROS" | "PRESTAMOS";
};

export type PersonaProfileTimelineEntry = {
  id: string;
  fecha: string;
  tipo: PersonaProfileTimelineType;
  descripcion: string;
  responsable: string | null;
  estadoPrestamo?: "PENDIENTE" | "DEVUELTO" | null;
  items: Array<{ nombre: string; cantidad: number }>;
};

export type PersonaProfileState = {
  identity: PersonaProfileIdentity;
  loading: boolean;
  error: string | null;
  registros: RegistroView[];
  prestamos: PrestamoStockEntry[];
  observaciones: PersonalObservacion[];
  equipmentSummary: PersonaProfileEquipmentRow[];
  timeline: PersonaProfileTimelineEntry[];
};

type PersonaProfileViewProps = {
  state: PersonaProfileState | null;
  onBack: () => void;
  onReload: () => void;
  onPrintDeliverySheet: (ci: string) => void;
  onPrintPrestamos: (prestamoIds: string[]) => void;
};

function movementTypeStyles(tipo: PersonaProfileTimelineType) {
  if (tipo === "ENTREGA") return "bg-emerald-100 text-emerald-800";
  if (tipo === "DEVOLUCION") return "bg-amber-100 text-amber-800";
  if (tipo === "PRESTAMO") return "bg-indigo-100 text-indigo-800";
  return "bg-cyan-100 text-cyan-800";
}

function profileTypeLabel(tipo: PersonaProfileTipo) {
  if (tipo === "SUBALTERNO") return "Subalterno";
  if (tipo === "OFICIAL") return "Oficial";
  return "Suboficial";
}

function sortTimeline(entries: PersonaProfileTimelineEntry[]) {
  return [...entries].sort((left, right) => {
    const rightKey = parseDateInput(right.fecha).sortKey ?? "";
    const leftKey = parseDateInput(left.fecha).sortKey ?? "";
    return rightKey.localeCompare(leftKey);
  });
}

function movementCardClass(entry: PersonaProfileTimelineEntry) {
  const isPendingPrestamo = entry.tipo === "PRESTAMO" && entry.estadoPrestamo === "PENDIENTE";
  if (isPendingPrestamo) {
    return "rounded-lg border border-amber-300 bg-amber-50/70 p-3";
  }
  return "rounded-lg border border-stone-200 bg-white p-3";
}

export function PersonaProfileView({ state, onBack, onReload, onPrintDeliverySheet, onPrintPrestamos }: PersonaProfileViewProps) {
  if (!state) {
    return (
      <section className="mt-6 space-y-4">
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">Ficha completa en sistema</h2>
              <p className="mt-1 text-xs text-stone-600">No hay una persona seleccionada para mostrar.</p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
            >
              Volver
            </button>
          </div>
        </article>
      </section>
    );
  }

  const timeline = sortTimeline(state.timeline);
  const tallas = tallasEntries(tallasMap(state.identity.tallas));
  const typeLabel = profileTypeLabel(state.identity.tipo);
  const prestamoIds = Array.from(new Set(state.prestamos.map((prestamo) => prestamo.prestamoId)));

  const movementCounts = timeline.reduce<Record<PersonaProfileTimelineType, number>>(
    (acc, entry) => {
      acc[entry.tipo] += 1;
      return acc;
    },
    { ENTREGA: 0, DEVOLUCION: 0, PRESTAMO: 0, DEVOLUCION_PRESTAMO: 0 },
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">Ficha completa en sistema</h2>
            <p className="mt-1 text-xs text-stone-600">{`${state.identity.apellido}, ${state.identity.nombre}`}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-700">{typeLabel}</span>
              <span className="font-mono text-stone-600">{formatUruguayanCi(state.identity.ci)}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.identity.tipo === "SUBALTERNO" ? (
              <button
                type="button"
                onClick={() => onPrintDeliverySheet(state.identity.ci)}
                className="rounded bg-[var(--brand-charcoal)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#2b2922]"
              >
                Imprimir hoja de entrega
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onPrintPrestamos(prestamoIds)}
              disabled={prestamoIds.length === 0}
              className="rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {prestamoIds.length > 0 ? `Imprimir préstamos (${prestamoIds.length})` : "Sin préstamos para imprimir"}
            </button>
            <button
              type="button"
              onClick={onReload}
              disabled={state.loading}
              className="rounded bg-stone-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-900 disabled:opacity-60"
            >
              Actualizar ficha
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded bg-stone-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-800"
            >
              Volver
            </button>
          </div>
        </div>

        {state.loading ? (
          <p className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-medium text-stone-700">
            Cargando información completa de esta persona...
          </p>
        ) : null}

        {state.error ? (
          <p className="mt-3 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{state.error}</p>
        ) : null}
      </article>

      {!state.loading && !state.error ? (
        <>
          <article className="ej-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Información personal</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Grado:</span> {state.identity.gradoAbreviacion} - {state.identity.gradoNombre}
              </p>
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Batería:</span> {state.identity.bateriaNombre ?? "No aplica"}
              </p>
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Teléfono:</span> {state.identity.telefonoContacto ?? "No registrado"}
              </p>
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Reingreso:</span>{" "}
                {state.identity.esReingreso === null ? "No aplica" : state.identity.esReingreso ? "Sí" : "No"}
              </p>
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Fecha ingreso:</span> {state.identity.fechaIngreso ?? "-"}
              </p>
              <p className="text-sm text-stone-800">
                <span className="font-semibold">Ingreso original:</span> {state.identity.fechaIngresoOriginal ?? "-"}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
              {tallas.map((entry) => (
                <div key={`profile-talla-${entry.key}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{entry.label}</p>
                  <p className="mt-1 text-sm font-bold text-stone-900">{entry.value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="ej-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Resumen de equipos según sistema</h3>
            {state.equipmentSummary.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">No hay equipos asociados para esta persona.</p>
            ) : (
              <div className="mt-2 overflow-auto rounded-lg border border-stone-200 bg-white">
                <table className="w-full min-w-[38rem] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Equipo</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">Entregado / Prestado</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">Devuelto</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">Saldo actual</th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.equipmentSummary.map((row, index) => (
                      <tr key={`profile-equipment-${row.item}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.item}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-right text-sm tabular-nums text-stone-800">{row.entregado}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-right text-sm tabular-nums text-stone-800">{row.devuelto}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-right text-sm font-semibold tabular-nums text-stone-900">{row.saldo}</td>
                        <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-700">
                          {row.fuente === "REGISTROS" ? "Hoja/Registros" : "Préstamos"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <article className="ej-card rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-stone-900">Movimientos y tipos registrados</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">{`Entregas: ${movementCounts.ENTREGA}`}</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800">{`Devoluciones: ${movementCounts.DEVOLUCION}`}</span>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-800">{`Préstamos: ${movementCounts.PRESTAMO}`}</span>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-800">{`Dev. préstamo: ${movementCounts.DEVOLUCION_PRESTAMO}`}</span>
            </div>

            {timeline.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">No hay movimientos registrados para esta persona.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {timeline.map((entry) => (
                  <div key={entry.id} className={movementCardClass(entry)}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${movementTypeStyles(entry.tipo)}`}>
                          {entry.tipo}
                        </span>
                        <span className="text-xs text-stone-600">{formatDateOnlyForDisplay(entry.fecha)}</span>
                        {entry.tipo === "PRESTAMO" && entry.estadoPrestamo === "PENDIENTE" ? (
                          <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                            Pendiente
                          </span>
                        ) : null}
                      </div>
                      <span className="text-xs font-semibold text-stone-700">{entry.descripcion}</span>
                    </div>
                    <p className="mt-1 text-xs text-stone-600">
                      <span className="font-semibold text-stone-700">Responsable en sistema:</span>{" "}
                      {entry.responsable?.trim() ? entry.responsable : "No registrado"}
                    </p>
                    {entry.items.length > 0 ? (
                      <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {entry.items.map((item) => (
                          <p key={`${entry.id}-${item.nombre}`} className="text-xs text-stone-700">
                            <span className="font-semibold">{item.cantidad}x</span> {item.nombre}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </article>

          {state.identity.tipo === "SUBALTERNO" ? (
            <article className="ej-card rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-stone-900">Observaciones relacionadas</h3>
              {state.observaciones.length === 0 ? (
                <p className="mt-2 text-sm text-stone-600">Sin observaciones registradas.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {state.observaciones.map((observacion) => (
                    <div key={observacion.observacionId} className="rounded-lg border border-stone-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold text-stone-600">{formatDateOnlyForDisplay(observacion.fecha)}</p>
                      <p className="mt-1 text-sm text-stone-800">{observacion.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
