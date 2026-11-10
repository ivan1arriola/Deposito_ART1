"use client";

import { useEffect, useState, Fragment } from "react";
import { formatUruguayanCi } from "@/lib/ci";

type OutstandingItem = {
  nombre: string;
  cantidad: number;
};

type PendingBaja = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  grado: string;
  gradoAbreviacion: string;
  bateria: string | null;
  tipo: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
  outstandingLoans: Array<{
    movimientoId: string;
    reciboNumero: string | null;
    fecha: string;
    equipos: OutstandingItem[];
  }>;
  outstandingVestuario: OutstandingItem[];
};

type HistoryRecord = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  grado: string;
  gradoAbreviacion: string;
  bajaAt: string;
  tipo: string;
  tallas: Array<{ tipo: string; valor: string }>;
  observaciones: Array<{ texto: string; fecha: string }>;
};

export function PersonalBajasView() {
  const [pendientes, setPendientes] = useState<PendingBaja[]>([]);
  const [historial, setHistorial] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchPendiente, setSearchPendiente] = useState("");
  const [searchHistorial, setSearchHistorial] = useState("");

  // Accordion expands
  const [expandedCi, setExpandedCi] = useState<Record<string, boolean>>({});

  // Action Modals
  const [confirmCi, setConfirmCi] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const [reactivateCi, setReactivateCi] = useState<string | null>(null);
  const [reactivatingAction, setReactivatingAction] = useState(false);

  const fetchBajasData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/personal/bajas");
      if (!res.ok) throw new Error("No se pudo obtener la información de bajas.");
      const data = await res.json();
      setPendientes(data.pendientes || []);
      setHistorial(data.historial || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBajasData();
  }, []);

  const handleConfirmDevolucion = async (ci: string) => {
    try {
      setConfirmingAction(true);
      setError(null);
      const res = await fetch(`/api/personal/${encodeURIComponent(ci)}/confirmar-devolucion`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "No se pudo confirmar la devolución.");
      }
      setSuccess("¡Devolución confirmada con éxito! El personal ha sido transferido al historial administrativo.");
      setConfirmCi(null);
      await fetchBajasData();
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setConfirmingAction(false);
    }
  };

  const handleReactivate = async (ci: string) => {
    try {
      setReactivatingAction(true);
      setError(null);
      const res = await fetch(`/api/personal/${encodeURIComponent(ci)}/reactivar`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "No se pudo reactivar el personal.");
      }
      setSuccess("¡Personal reactivado con éxito! Todos sus datos activos han sido restituidos.");
      setReactivateCi(null);
      await fetchBajasData();
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setReactivatingAction(false);
    }
  };

  const toggleExpand = (ci: string) => {
    setExpandedCi((prev) => ({ ...prev, [ci]: !prev[ci] }));
  };

  // Filter lists
  const filteredPendientes = pendientes.filter((p) => {
    const term = searchPendiente.toLowerCase();
    const fullName = `${p.nombre1} ${p.nombre2 || ""} ${p.apellido1} ${p.apellido2 || ""}`.toLowerCase();
    return p.ci.includes(term) || fullName.includes(term) || p.grado.toLowerCase().includes(term);
  });

  const filteredHistorial = historial.filter((h) => {
    const term = searchHistorial.toLowerCase();
    const fullName = `${h.nombre1} ${h.nombre2 || ""} ${h.apellido1} ${h.apellido2 || ""}`.toLowerCase();
    return h.ci.includes(term) || fullName.includes(term) || h.grado.toLowerCase().includes(term);
  });

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col equipos-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-300 border-t-stone-800" />
        <p className="mt-4 text-sm font-semibold text-stone-600">Reconstruyendo estado de bajas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      {/* Messages */}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800 font-semibold shadow-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 font-black shadow-sm animate-pulse">
          ✅ {success}
        </div>
      )}

      {/* SECTION 1: PENDING RETURNS */}
      <section className="ej-card rounded-2xl p-5 border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap equipos-start justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 flex equipos-center gap-2">
              📋 Pendiente de Devolución por Baja
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-800">
                {pendientes.length}
              </span>
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Personal militar en proceso de baja que cuenta con préstamos de equipo o prendas de vestuario a su cargo.
            </p>
          </div>
          <input
            value={searchPendiente}
            onChange={(e) => setSearchPendiente(e.target.value)}
            placeholder="Buscar por cédula, nombre o grado..."
            className="w-full max-w-xs rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-800 focus:outline-none"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-100">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider font-bold text-stone-700">
              <tr>
                <th className="w-[12%] px-4 py-3">Cédula</th>
                <th className="w-[15%] px-4 py-3">Grado</th>
                <th className="w-[30%] px-4 py-3">Nombre Completo</th>
                <th className="w-[15%] px-4 py-3">Batería</th>
                <th className="w-[13%] px-4 py-3 text-center">Detalle Equipos</th>
                <th className="w-[15%] px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredPendientes.map((p) => {
                const isExpanded = expandedCi[p.ci] === true;
                const totalLoans = p.outstandingLoans.reduce((sum, l) => sum + l.equipos.length, 0);
                const totalVestuario = p.outstandingVestuario.length;

                return (
                  <Fragment key={p.ci}>
                    <tr className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-stone-700 font-bold">
                        {formatUruguayanCi(p.ci)}
                      </td>
                      <td className="px-4 py-3.5 text-stone-900 font-extrabold">{p.grado}</td>
                      <td className="px-4 py-3.5 text-stone-900 font-semibold">
                        {[p.apellido1, p.apellido2, p.nombre1, p.nombre2].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-4 py-3.5 text-stone-600">{p.bateria || "Sin Batería"}</td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(p.ci)}
                          className={`rounded-lg px-3 py-1 text-xs font-black transition-colors ${
                            isExpanded
                              ? "bg-stone-900 text-white"
                              : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                          }`}
                        >
                          {isExpanded
                            ? "Ocultar detalles"
                            : `Ver Equipos (${totalLoans + totalVestuario})`}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setConfirmCi(p.ci)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-800 transition-all hover:scale-[1.02]"
                        >
                          Confirmar Devolución
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/70 border-l-4 border-l-amber-500">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Vestuario section */}
                            <div>
                              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex equipos-center gap-1.5 border-b border-stone-200 pb-2">
                                👕 Vestuario & Prendas Entregadas
                                <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-700">
                                  {p.outstandingVestuario.length}
                                </span>
                              </h4>
                              {p.outstandingVestuario.length === 0 ? (
                                <p className="mt-3 text-xs text-stone-500 italic">No tiene vestuario pendiente.</p>
                              ) : (
                                <ul className="mt-2 divide-y divide-stone-200/50">
                                  {p.outstandingVestuario.map((equipo, idx) => (
                                    <li key={idx} className="flex justify-between py-2 text-xs font-medium">
                                      <span className="text-stone-800 font-semibold">{equipo.nombre}</span>
                                      <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-900 font-mono">
                                        Saldo: {equipo.cantidad}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Loans section */}
                            <div>
                              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide flex equipos-center gap-1.5 border-b border-stone-200 pb-2">
                                🛡️ Equipos en Préstamo Activo
                                <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-700">
                                  {p.outstandingLoans.length}
                                </span>
                              </h4>
                              {p.outstandingLoans.length === 0 ? (
                                <p className="mt-3 text-xs text-stone-500 italic">No tiene préstamos de equipo activos.</p>
                              ) : (
                                <div className="mt-2 space-y-3">
                                  {p.outstandingLoans.map((loan) => (
                                    <div key={loan.movimientoId} className="rounded-lg border border-stone-200 bg-white p-2.5 shadow-xs">
                                      <div className="flex justify-between text-[10px] font-black text-stone-500">
                                        <span>RECIBO: #{loan.reciboNumero || "N/A"}</span>
                                        <span>FECHA: {loan.fecha}</span>
                                      </div>
                                      <ul className="mt-1.5 divide-y divide-stone-100">
                                        {loan.equipos.map((equipo, i) => (
                                          <li key={i} className="flex justify-between py-1 text-xs">
                                            <span className="text-stone-700 font-semibold">{equipo.nombre}</span>
                                            <span className="font-mono text-stone-900 font-bold">Qty: {equipo.cantidad}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredPendientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500 italic">
                    No hay personal militar en proceso de devolución pendiente con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 2: ARCHIVED HISTORY */}
      <section className="ej-card rounded-2xl p-5 border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap equipos-start justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-black text-stone-900 flex equipos-center gap-2">
              📜 Historial Administrativo de Bajas
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-black text-stone-700">
                {historial.length}
              </span>
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Registros históricos de personal que fue dado de baja y devolvió la totalidad de sus equipos. Listos para re-alta rápida.
            </p>
          </div>
          <input
            value={searchHistorial}
            onChange={(e) => setSearchHistorial(e.target.value)}
            placeholder="Buscar por cédula o nombre..."
            className="w-full max-w-xs rounded-xl border border-stone-300 px-3.5 py-2 text-sm focus:border-stone-800 focus:outline-none"
          />
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-stone-100">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider font-bold text-stone-700">
              <tr>
                <th className="w-[12%] px-4 py-3">Cédula</th>
                <th className="w-[12%] px-4 py-3">Grado</th>
                <th className="w-[25%] px-4 py-3">Nombre Completo</th>
                <th className="w-[12%] px-4 py-3">Categoría</th>
                <th className="w-[14%] px-4 py-3">Fecha de Baja</th>
                <th className="w-[12%] px-4 py-3 text-center">Ficha Histórica</th>
                <th className="w-[13%] px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredHistorial.map((h) => {
                const isExpanded = expandedCi[`hist-${h.ci}`] === true;

                return (
                  <Fragment key={h.ci}>
                    <tr className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3.5 font-mono text-xs text-stone-600 font-bold">
                        {formatUruguayanCi(h.ci)}
                      </td>
                      <td className="px-4 py-3.5 text-stone-700 font-bold">{h.grado}</td>
                      <td className="px-4 py-3.5 text-stone-800 font-semibold">
                        {[h.apellido1, h.apellido2, h.nombre1, h.nombre2].filter(Boolean).join(" ")}
                      </td>
                      <td className="px-4 py-3.5 text-stone-600 text-xs font-bold uppercase">{h.tipo}</td>
                      <td className="px-4 py-3.5 text-stone-500 font-mono text-xs">
                        {new Date(h.bajaAt).toLocaleDateString("es-UY", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(`hist-${h.ci}`)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-black transition-colors ${
                            isExpanded ? "bg-stone-800 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {isExpanded ? "Ocultar Ficha" : "Ver Tallas & Obs"}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => setReactivateCi(h.ci)}
                          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-stone-800 transition-all hover:scale-[1.02]"
                        >
                          Reincorporar
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-stone-50/50 border-l-4 border-l-stone-400">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tallas */}
                            <div>
                              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide border-b border-stone-200 pb-2">
                                📐 Tallas Registradas en Baja
                              </h4>
                              <div className="mt-2.5 grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {h.tallas.map((t, idx) => (
                                  <div key={idx} className="rounded-lg border border-stone-200 bg-white p-2 text-center">
                                    <div className="text-[9px] font-black uppercase text-stone-400">{t.tipo}</div>
                                    <div className="mt-0.5 text-xs font-black text-stone-900">{t.valor}</div>
                                  </div>
                                ))}
                                {h.tallas.length === 0 && (
                                  <p className="text-xs text-stone-500 italic col-span-3">No hay tallas guardadas.</p>
                                )}
                              </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide border-b border-stone-200 pb-2">
                                💬 Observaciones & Historial
                              </h4>
                              {h.observaciones.length === 0 ? (
                                <p className="mt-3 text-xs text-stone-500 italic">No hay observaciones registradas.</p>
                              ) : (
                                <ul className="mt-2 space-y-2">
                                  {h.observaciones.map((o, idx) => (
                                    <li key={idx} className="rounded bg-white border border-stone-150 p-2 text-xs">
                                      <p className="text-stone-700 font-medium">{o.texto}</p>
                                      <p className="mt-1 text-[9px] font-mono text-stone-400">
                                        {o.fecha ? new Date(o.fecha).toLocaleDateString() : ""}
                                      </p>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {filteredHistorial.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-stone-500 italic">
                    El historial administrativo de bajas se encuentra vacío.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CONFIRM ACTION MODAL (DEVOLUCION) */}
      {confirmCi && (
        <div className="fixed inset-0 z-50 flex equipos-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-150 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-stone-900 flex equipos-center gap-2">
              ⚠️ Confirmar Devolución y Baja Definitiva
            </h3>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              ¿Confirmas que el personal militar con CI <strong>{formatUruguayanCi(confirmCi)}</strong> ha devuelto la totalidad del vestuario y armamento/equipo entregado?
            </p>
            <div className="mt-3 bg-stone-50 rounded-xl p-3 border border-stone-150 text-[11px] text-stone-600 leading-normal">
              <strong>Efectos colaterales:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Se creará una ficha digital inalterable en el Historial de Bajas.</li>
                <li>Se purgarán de forma definitiva todas sus referencias activas del sistema operativo.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmCi(null)}
                disabled={confirmingAction}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-extrabold text-stone-750 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDevolucion(confirmCi)}
                disabled={confirmingAction}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50 flex equipos-center gap-1.5"
              >
                {confirmingAction && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-white" />
                )}
                Confirmar y Archivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ACTION MODAL (REACTIVATE) */}
      {reactivateCi && (
        <div className="fixed inset-0 z-50 flex equipos-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-stone-150 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-black text-stone-900 flex equipos-center gap-2">
              🛡️ Confirmar Reincorporación / Re-Alta
            </h3>
            <p className="mt-3 text-xs text-stone-600 leading-relaxed">
              ¿Confirmas la reincorporación de personal con CI <strong>{formatUruguayanCi(reactivateCi)}</strong>?
            </p>
            <div className="mt-3 bg-stone-50 rounded-xl p-3 border border-stone-150 text-[11px] text-stone-600 leading-normal">
              <strong>Efectos colaterales:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Se restaurará su perfil personal militar operativo completo.</li>
                <li>Se re-cargarán automáticamente todas sus tallas de prendas y observaciones históricas.</li>
                <li>Se removerá del historial administrativo de bajas.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReactivateCi(null)}
                disabled={reactivatingAction}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-extrabold text-stone-750 hover:bg-stone-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleReactivate(reactivateCi)}
                disabled={reactivatingAction}
                className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-black text-white hover:bg-stone-800 disabled:opacity-50 flex equipos-center gap-1.5"
              >
                {reactivatingAction && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-stone-300 border-t-white" />
                )}
                Confirmar Reincorporación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
