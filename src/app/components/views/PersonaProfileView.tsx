"use client";

import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay, parseDateInput } from "@/lib/date-helpers";
import { tallasEntries } from "@/lib/formatters";
import { tallasMap } from "@/lib/form-mappers";
import type { PersonalObservacion, Talla } from "@/types/entities";
import type { PrestamoStockEntry, RegistroView } from "@/types/views";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import MilitaryTechRoundedIcon from "@mui/icons-material/MilitaryTechRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import NoteAltRoundedIcon from "@mui/icons-material/NoteAltRounded";

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
  mailReferencia: string | null;
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
  allowPrintActions?: boolean;
  showBackButton?: boolean;
};

function movementTypeStyles(tipo: PersonaProfileTimelineType) {
  if (tipo === "ENTREGA") return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
  if (tipo === "DEVOLUCION") return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
  if (tipo === "PRESTAMO") return "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20";
  return "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20";
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
    return "rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm";
  }
  return "rounded-2xl border border-stone-200/60 bg-white p-4 shadow-sm";
}

export function PersonaProfileView({
  state,
  onBack,
  onReload,
  onPrintDeliverySheet,
  onPrintPrestamos,
  allowPrintActions = true,
  showBackButton = true,
}: PersonaProfileViewProps) {
  if (!state) {
    return (
      <section className="mt-8 space-y-6">
        <article className="rounded-3xl bg-white p-8 shadow-xl border border-stone-200/50 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 text-stone-300">
            <PersonRoundedIcon sx={{ fontSize: 40 }} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-stone-900">Perfil no seleccionado</h2>
          <p className="mt-2 text-sm text-stone-500">Selecciona una persona del buscador para ver su ficha completa.</p>
          {showBackButton && (
             <button
                type="button"
                onClick={onBack}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-black active:scale-95"
              >
                <ArrowBackRoundedIcon fontSize="small" />
                Volver al inicio
              </button>
          )}
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
    <section className="mt-8 space-y-6">
      {/* Header Profile Card */}
      <article className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-xl border border-stone-200/50">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-stone-800 to-stone-900 text-white shadow-lg ring-4 ring-stone-100">
              <MilitaryTechRoundedIcon sx={{ fontSize: 32 }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-stone-900 leading-tight">
                  {state.identity.apellido}, {state.identity.nombre}
                </h2>
                <span className="hidden sm:inline-block rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-stone-500 border border-stone-200/50">
                  {typeLabel}
                </span>
              </div>
              <p className="mt-1 text-sm font-bold text-stone-500 flex items-center gap-1.5">
                <BadgeRoundedIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                {formatUruguayanCi(state.identity.ci)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {allowPrintActions && state.identity.tipo === "SUBALTERNO" && (
              <button
                type="button"
                onClick={() => onPrintDeliverySheet(state.identity.ci)}
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-black active:scale-95 shadow-lg shadow-stone-900/10"
              >
                <PrintRoundedIcon fontSize="small" />
                Hoja de Entrega
              </button>
            )}
            
            {allowPrintActions && (
              <button
                type="button"
                onClick={() => {
                  if (prestamoIds.length === 1) {
                    onPrintPrestamos(prestamoIds);
                  } else {
                    const timelineEl = document.getElementById("profile-timeline");
                    timelineEl?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                disabled={prestamoIds.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-600/10 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PrintRoundedIcon fontSize="small" />
                {prestamoIds.length === 1 ? "Imprimir Préstamo" : `Imprimir Préstamos (${prestamoIds.length})`}
              </button>
            )}

            <button
              type="button"
              onClick={onReload}
              disabled={state.loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-90 disabled:opacity-50"
            >
              <RefreshRoundedIcon />
            </button>

            {showBackButton && (
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-90"
              >
                <ArrowBackRoundedIcon />
              </button>
            )}
          </div>
        </div>

        {state.loading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-indigo-600" />
            <p className="text-sm font-bold text-indigo-700">Sincronizando información del personal...</p>
          </div>
        )}

        {state.error && (
          <div className="mt-6 rounded-2xl bg-rose-50 p-4 border border-rose-200">
            <p className="text-sm font-bold text-rose-800">{state.error}</p>
          </div>
        )}
      </article>

      {!state.loading && !state.error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Informacion Personal & Tallas Card */}
            <article className="rounded-3xl bg-white p-6 shadow-lg border border-stone-200/50">
              <div className="flex items-center gap-2 mb-6">
                 <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
                    <PersonRoundedIcon fontSize="small" />
                 </div>
                 <h3 className="text-lg font-black text-stone-900 tracking-tight">Información de Servicio</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Grado</p>
                   <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                      <MilitaryTechRoundedIcon sx={{ fontSize: 18, color: "var(--color-ejercito-gold)" }} />
                      {state.identity.gradoAbreviacion} — {state.identity.gradoNombre}
                   </p>
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Batería / Unidad</p>
                   <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                      <GroupsRoundedIcon sx={{ fontSize: 18, color: "stone.400" }} />
                      {state.identity.bateriaNombre ?? "No aplica / General"}
                   </p>
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Contacto</p>
                   <div className="flex flex-col gap-1">
                      <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        <PhoneRoundedIcon sx={{ fontSize: 16, color: "stone.300" }} />
                        {state.identity.telefonoContacto ?? "Sin teléfono"}
                      </p>
                      <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        <MailRoundedIcon sx={{ fontSize: 16, color: "stone.300" }} />
                        {state.identity.mailReferencia ?? "Sin correo"}
                      </p>
                   </div>
                </div>

                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Incorporación</p>
                   <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                      <CalendarTodayRoundedIcon sx={{ fontSize: 16, color: "stone.300" }} />
                      {state.identity.fechaIngreso ?? "No registrada"}
                   </p>
                </div>

                {/* DYNAMIC FIELDS: Only show Reingreso if true */}
                {state.identity.esReingreso === true && (
                  <>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Reingreso</p>
                       <p className="text-sm font-bold text-indigo-600">Personal de Reingreso</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Alta Original</p>
                       <p className="text-sm font-bold text-stone-800">{state.identity.fechaIngresoOriginal ?? "-"}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Tallas Section */}
              <div className="mt-8 pt-6 border-t border-stone-100">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-4">Dimensiones y Tallas</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {tallas.map((entry) => (
                    <div key={`profile-talla-${entry.key}`} className="rounded-2xl border border-stone-100 bg-stone-50/50 px-4 py-3 text-center transition hover:border-stone-200">
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">{entry.label}</p>
                      <p className="mt-1 text-base font-black text-stone-900">{entry.value || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            {/* Equipment Summary Table */}
            <article className="rounded-3xl bg-white p-6 shadow-lg border border-stone-200/50 overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                 <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
                    <Inventory2RoundedIcon fontSize="small" />
                 </div>
                 <h3 className="text-lg font-black text-stone-900 tracking-tight">Equipamiento Actual</h3>
              </div>

              {state.equipmentSummary.length === 0 ? (
                <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                   <p className="text-sm font-bold text-stone-400">Sin equipos cargados en sistema.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="pb-3 text-left text-[10px] font-black uppercase tracking-widest text-stone-400">Artículo</th>
                        <th className="pb-3 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">E/P</th>
                        <th className="pb-3 text-center text-[10px] font-black uppercase tracking-widest text-stone-400">Dev</th>
                        <th className="pb-3 text-right text-[10px] font-black uppercase tracking-widest text-stone-400">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {state.equipmentSummary.map((row) => (
                        <tr key={`profile-equipment-${row.item}`} className="group hover:bg-stone-50/50 transition-colors">
                          <td className="py-3 pr-4">
                             <p className="text-sm font-bold text-stone-800">{row.item}</p>
                             <p className="text-[10px] font-bold text-stone-400 uppercase tracking-tighter">
                               {row.fuente === "REGISTROS" ? "Suministro" : "Préstamo"}
                             </p>
                          </td>
                          <td className="py-3 text-center tabular-nums text-sm font-medium text-stone-600">{row.entregado}</td>
                          <td className="py-3 text-center tabular-nums text-sm font-medium text-stone-600">{row.devuelto}</td>
                          <td className="py-3 text-right">
                             <span className={`inline-block min-w-[32px] px-2 py-1 rounded-lg text-xs font-black tabular-nums ${row.saldo > 0 ? "bg-stone-900 text-white shadow-md shadow-stone-900/20" : "bg-stone-100 text-stone-400"}`}>
                                {row.saldo}
                             </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            {/* Timeline Section */}
            <article id="profile-timeline" className="rounded-3xl bg-white p-6 shadow-lg border border-stone-200/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
                      <TimelineRoundedIcon fontSize="small" />
                  </div>
                  <h3 className="text-lg font-black text-stone-900 tracking-tight">Historial de Movimientos</h3>
                </div>
                <div className="flex gap-2">
                   {Object.entries(movementCounts).map(([tipo, count]) => count > 0 && (
                      <span key={tipo} className={`hidden sm:inline-block rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-widest ${movementTypeStyles(tipo as PersonaProfileTimelineType)}`}>
                         {tipo}: {count}
                      </span>
                   ))}
                </div>
              </div>

              {timeline.length === 0 ? (
                <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                   <p className="text-sm font-bold text-stone-400">Sin historial registrado.</p>
                </div>
              ) : (
                <div className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-stone-100">
                  {timeline.map((entry) => (
                    <div key={entry.id} className="relative pl-12">
                       {/* Timeline dot */}
                       <div className={`absolute left-0 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-2xl border-4 border-white shadow-md transition-transform group-hover:scale-110 ${
                         entry.tipo === "ENTREGA" ? "bg-emerald-500 text-white" :
                         entry.tipo === "DEVOLUCION" ? "bg-amber-500 text-white" :
                         entry.tipo === "PRESTAMO" ? "bg-indigo-600 text-white" : "bg-cyan-500 text-white"
                       }`}>
                          <DescriptionRoundedIcon sx={{ fontSize: 18 }} />
                       </div>

                       <div className={movementCardClass(entry)}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 mb-3">
                             <div className="flex items-center gap-2">
                                <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${movementTypeStyles(entry.tipo)}`}>
                                  {entry.tipo.replace("_", " ")}
                                </span>
                                <span className="text-xs font-black text-stone-400">{formatDateOnlyForDisplay(entry.fecha)}</span>
                             </div>

                             {entry.tipo === "PRESTAMO" && (
                               <button
                                 onClick={() => onPrintPrestamos([entry.id])}
                                 className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-700 transition hover:bg-indigo-100 active:scale-95"
                               >
                                 <PrintRoundedIcon sx={{ fontSize: 16 }} />
                                 REIMPRIMIR RECIBO
                               </button>
                             )}
                          </div>

                          <div className="space-y-3">
                             <p className="text-sm font-bold text-stone-800 leading-snug">{entry.descripcion}</p>
                             
                             {entry.items.length > 0 && (
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-3 rounded-xl border border-stone-100">
                                  {entry.items.map((item) => (
                                    <div key={`${entry.id}-${item.nombre}`} className="flex items-center justify-between gap-4">
                                       <span className="text-xs font-bold text-stone-600">{item.nombre}</span>
                                       <span className="text-xs font-black text-stone-900 tabular-nums">x{item.cantidad}</span>
                                    </div>
                                  ))}
                               </div>
                             )}

                             <div className="flex items-center gap-1.5 pt-1">
                                <NoteAltRoundedIcon sx={{ fontSize: 14, color: "stone.300" }} />
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">
                                   Responsable: <span className="text-stone-600">{entry.responsable?.trim() || "SISTEMA"}</span>
                                </span>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
             {/* Observaciones Sidebar Card */}
             {state.identity.tipo === "SUBALTERNO" && (
               <article className="rounded-3xl bg-white p-6 shadow-lg border border-stone-200/50">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-stone-100 text-stone-600">
                        <NoteAltRoundedIcon fontSize="small" />
                    </div>
                    <h3 className="text-lg font-black text-stone-900 tracking-tight">Observaciones</h3>
                  </div>

                  {state.observaciones.length === 0 ? (
                    <div className="py-6 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                       <p className="text-xs font-bold text-stone-400">Sin notas adicionales.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {state.observaciones.map((observacion) => (
                        <div key={observacion.observacionId} className="group relative pl-4 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-indigo-500 before:rounded-full">
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{formatDateOnlyForDisplay(observacion.fecha)}</p>
                          <p className="mt-1 text-sm font-medium text-stone-700 leading-relaxed">{observacion.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
               </article>
             )}

             {/* Stats Card */}
             <article className="rounded-3xl bg-gradient-to-br from-stone-800 to-stone-900 p-6 shadow-xl text-white">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 mb-6 text-center">Resumen Ejecutivo</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-2xl font-black">{state.registros.length}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mt-1">Registros</p>
                   </div>
                   <div className="text-center p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-2xl font-black">{state.prestamos.filter(p => p.estado === "PENDIENTE").length}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 mt-1">Vigentes</p>
                   </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                   <p className="text-[10px] font-bold text-stone-500 italic">"Custodiar con Honor, Servir con Lealtad"</p>
                </div>
             </article>
          </div>
        </div>
      )}
    </section>
  );
}
