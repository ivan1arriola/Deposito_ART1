"use client";

import type { Equipo } from "@/types/entities";

type MergeableEquipo = Pick<Equipo, "itemId" | "nombre" | "tipo" | "activo">;

type EquiposUnificarViewProps = {
  canWrite: boolean;
  equipos: MergeableEquipo[];
  mergeEquipoOrigenId: string;
  mergeEquipoDestinoId: string;
  onMergeEquipoOrigenIdChange: (id: string) => void;
  onMergeEquipoDestinoIdChange: (id: string) => void;
  onMergeEquipos: (origenId: string, destinoId: string) => void;
};

export function EquiposUnificarView({
  canWrite,
  equipos,
  mergeEquipoOrigenId,
  mergeEquipoDestinoId,
  onMergeEquipoOrigenIdChange,
  onMergeEquipoDestinoIdChange,
  onMergeEquipos,
}: EquiposUnificarViewProps) {
  const equiposOrdenadosAlfabeticamente = [...equipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  const mergeTargetEquipos = equiposOrdenadosAlfabeticamente.filter(
    (equipo) => equipo.itemId !== mergeEquipoOrigenId
  );

  const canMerge =
    canWrite &&
    equipos.length >= 2 &&
    mergeEquipoOrigenId.trim() !== "" &&
    mergeEquipoDestinoId.trim() !== "" &&
    mergeEquipoOrigenId !== mergeEquipoDestinoId;

  return (
    <div className="my-8">
      <div className="overflow-hidden rounded-3xl border border-stone-200/60 bg-white/80 backdrop-blur-xl shadow-xl">
        {/* Encabezado */}
        <div className="relative border-b border-stone-200/60 bg-gradient-to-r from-stone-50 to-white px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 shadow-sm ring-1 ring-amber-200/50">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-stone-900">Unificar Catálogo de Equipos</h2>
                <p className="text-sm font-semibold text-stone-500">
                  Herramienta de depuración y consolidación del inventario
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* Instrucciones simplificadas */}
          <div className="mb-8 rounded-2xl border border-sky-100 bg-sky-50/50 p-5 shadow-sm">
            <div className="flex gap-4">
              <div className="mt-0.5 flex-shrink-0 text-sky-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-sky-900 mb-1">¿Cómo funciona la unificación de equipos?</h3>
                <p className="text-xs font-medium text-sky-800/80 leading-relaxed">
                  Esta función permite resolver duplicados en el catálogo. Al unificar:
                </p>
                <ul className="mt-2 list-inside list-disc text-xs font-medium text-sky-800/80 space-y-1">
                  <li>Todos los registros históricos del <strong>Equipo Origen</strong> se traspasan al <strong>Equipo Destino</strong>.</li>
                  <li>El stock se recalcula automáticamente sumando todos los movimientos.</li>
                  <li>El <strong>Equipo Origen</strong> se elimina permanentemente del sistema de forma segura.</li>
                </ul>
              </div>
            </div>
          </div>

          {!canWrite ? (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-center gap-3 text-amber-800">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-sm font-bold">Modo de sólo lectura: no tienes permisos para unificar equipos.</p>
              </div>
            </div>
          ) : null}

          {equipos.length < 2 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="mb-2 text-lg font-black text-amber-800">No hay suficientes equipos</h3>
              <p className="text-sm font-medium text-amber-700/70 max-w-sm">
                Se requieren al menos 2 equipos registrados en el catálogo para poder realizar una fusión de registros.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Controles de Selección */}
              <div className="relative rounded-3xl border border-stone-200 bg-stone-50/50 p-6 sm:p-8 shadow-inner">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center pointer-events-none">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-stone-50 bg-white text-stone-400 shadow-sm z-10">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-0">
                  {/* Origen */}
                  <div>
                    <label htmlFor="merge-origen" className="mb-2.5 flex items-center gap-2 text-sm font-bold text-stone-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-[10px] text-rose-600 ring-1 ring-rose-200">1</span>
                      Equipo Origen (Se eliminará)
                    </label>
                    <select
                      id="merge-origen"
                      value={mergeEquipoOrigenId}
                      onChange={(e) => onMergeEquipoOrigenIdChange(e.target.value)}
                      disabled={!canWrite}
                      className="w-full cursor-pointer rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-sm font-semibold text-stone-800 shadow-sm transition-all focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:opacity-60 disabled:cursor-not-allowed hover:border-stone-300"
                    >
                      <option value="" disabled>Selecciona el equipo a eliminar...</option>
                      {equiposOrdenadosAlfabeticamente.map((equipo) => (
                        <option key={`merge-origen-opt-${equipo.itemId}`} value={equipo.itemId}>
                          {equipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Destino */}
                  <div>
                    <label htmlFor="merge-destino" className="mb-2.5 flex items-center gap-2 text-sm font-bold text-stone-700">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-600 ring-1 ring-emerald-200">2</span>
                      Equipo Destino (Se conservará)
                    </label>
                    <select
                      id="merge-destino"
                      value={mergeEquipoDestinoId}
                      onChange={(e) => onMergeEquipoDestinoIdChange(e.target.value)}
                      disabled={!canWrite || mergeEquipoOrigenId.trim() === ""}
                      className="w-full cursor-pointer rounded-2xl border-2 border-stone-200 bg-white px-4 py-3.5 text-sm font-semibold text-stone-800 shadow-sm transition-all focus:border-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed hover:border-stone-300"
                    >
                      <option value="" disabled>Selecciona el equipo que recibirá los datos...</option>
                      {mergeTargetEquipos.map((equipo) => (
                        <option key={`merge-destino-opt-${equipo.itemId}`} value={equipo.itemId}>
                          {equipo.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Advertencia y Botón */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between pt-2">
                <div className="flex flex-1 items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <div className="mt-0.5 text-rose-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <p className="text-xs font-bold text-rose-700 leading-relaxed">
                    Acción irreversible: Confirma que los equipos seleccionados sean los correctos. Una vez unificados, no se podrá deshacer la fusión automática.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!canMerge}
                  onClick={() => onMergeEquipos(mergeEquipoOrigenId, mergeEquipoDestinoId)}
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-stone-900 px-8 py-4 text-sm font-black text-white shadow-lg shadow-stone-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-stone-900/30 disabled:pointer-events-none disabled:opacity-40 active:translate-y-0"
                >
                  <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                    <div className="relative h-full w-8 bg-white/20" />
                  </div>
                  <span className="relative z-10 flex items-center gap-2">
                    Unificar y Eliminar Origen
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
