"use client";

import { useEffect, useState, useMemo } from "react";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

import { LoadingInline } from "@/app/components/shared";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { formatUruguayanCi } from "@/lib/ci";
import {
  filterArticuloEntregasHistorial,
  type ArticuloEntregaHistorialEntry as ArticuloEntregaPersonalEntry,
} from "@/lib/articulo-entregas-history";
import { api } from "@/lib/api";

interface ArticuloEntregasHistorialViewProps {
  isAdmin?: boolean;
  onBack?: () => void;
}

export function ArticuloEntregasHistorialView({
  isAdmin = false,
  onBack,
}: ArticuloEntregasHistorialViewProps) {
  const [entregas, setEntregas] = useState<ArticuloEntregaPersonalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detalle seleccionado (modal)
  const [selectedEntrega, setSelectedEntrega] = useState<ArticuloEntregaPersonalEntry | null>(null);

  // Confirmación de eliminación
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<ArticuloEntregaPersonalEntry[]>("/api/articulos/entregas");
      setEntregas(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar el historial de entregas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHistory();
  }, []);

  const filteredEntregas = useMemo(() => {
    return filterArticuloEntregasHistorial(entregas, {
      searchTerm,
      startDate,
      endDate,
    });
  }, [entregas, searchTerm, startDate, endDate]);

  // Procedimiento de eliminación
  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/articulos/entregas/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo eliminar el registro.");
      }

      // Actualizar UI
      await fetchHistory();
      setConfirmDeleteId(null);
      setSelectedEntrega(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al eliminar el registro.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Imprimir recibo de entrega
  const handlePrintReceipt = (entrega: ArticuloEntregaPersonalEntry) => {
    window.open(
      `/api/articulos/entregas/${encodeURIComponent(entrega.articuloEntregaPersonalId)}/constancia`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handlePrintList = () => {
    const params = new URLSearchParams({ autoprint: "1" });
    const normalizedSearchTerm = searchTerm.trim();
    if (normalizedSearchTerm) {
      params.set("search", normalizedSearchTerm);
    }
    if (startDate) {
      params.set("startDate", startDate);
    }
    if (endDate) {
      params.set("endDate", endDate);
    }

    window.open(
      `/listado-entregas-articulos?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:equipos-center sm:justify-between">
        <div className="flex equipos-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex h-9 w-9 equipos-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 hover:text-white active:scale-95 shadow-sm"
              title="Volver"
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-white flex equipos-center gap-2">
              <HistoryRoundedIcon className="text-stone-200" />
              Historial de Entregas a Personal
            </h2>
            <p className="text-sm text-stone-200/90">
              Registro histórico de artículos de consumo distribuidos al personal.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap equipos-center gap-2">
          <button
            onClick={handlePrintList}
            disabled={loading}
            className="inline-flex equipos-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 hover:text-white active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <PrintRoundedIcon fontSize="small" />
            Imprimir listado
          </button>
          <button
            onClick={() => void fetchHistory()}
            disabled={loading}
            className="inline-flex equipos-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 hover:text-white active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <RefreshRoundedIcon fontSize="small" className={loading ? "animate-spin" : ""} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas de Historial */}
      {!loading && !error && entregas.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="ej-card rounded-2xl p-4 bg-gradient-to-br from-white to-stone-50 border border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Total de Entregas
            </span>
            <p className="mt-1 text-2xl font-extrabold text-stone-900">{entregas.length}</p>
          </div>
          <div className="ej-card rounded-2xl p-4 bg-gradient-to-br from-white to-stone-50 border border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Total Artículos Entregados
            </span>
            <p className="mt-1 text-2xl font-extrabold text-stone-900">
              {entregas.reduce(
                (acc, ent) => acc + ent.equipos.reduce((sum, equipo) => sum + equipo.cantidad, 0),
                0
              )}
            </p>
          </div>
          <div className="ej-card rounded-2xl p-4 bg-gradient-to-br from-white to-stone-50 border border-stone-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
              Personal Beneficiario
            </span>
            <p className="mt-1 text-2xl font-extrabold text-stone-900">
              {new Set(entregas.map((ent) => ent.personalCi)).size} personas
            </p>
          </div>
        </div>
      )}

      {/* Panel de Filtros */}
      <div className="ej-card rounded-2xl p-4 border border-stone-200 bg-white flex flex-col gap-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex equipos-center gap-1.5">
          <FilterAltRoundedIcon fontSize="inherit" />
          Filtros de Búsqueda
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {/* Búsqueda por Texto */}
          <div className="relative md:col-span-2">
            <SearchRoundedIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por destinatario, CI, artículo o comentario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-10 pr-4 text-sm text-stone-900 placeholder-stone-600 transition focus:border-stone-400 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Fecha Desde */}
          <div className="relative">
            <TodayRoundedIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-10 pr-3 text-sm text-stone-900 placeholder-stone-600 transition focus:border-stone-400 focus:bg-white focus:outline-none"
              title="Fecha desde"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="relative">
            <TodayRoundedIcon className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-10 pr-3 text-sm text-stone-900 placeholder-stone-600 transition focus:border-stone-400 focus:bg-white focus:outline-none"
              title="Fecha hasta"
            />
          </div>
        </div>
      </div>

      {/* Resultados y Carga */}
      {loading ? (
        <div className="ej-card rounded-2xl p-8 text-center bg-white border border-stone-200">
          <LoadingInline label="Cargando historial..." />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">Ocurrió un error al cargar el historial:</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : filteredEntregas.length === 0 ? (
        <div className="ej-card rounded-2xl p-12 text-center bg-white border border-stone-200">
          <p className="text-stone-600 font-medium">
            No se encontraron entregas que coincidan con los filtros.
          </p>
          {entregas.length === 0 && (
            <p className="text-xs text-stone-600 mt-1">
              Aún no se ha registrado ninguna entrega de artículos a personal.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntregas.map((entrega) => (
            <div
              key={entrega.articuloEntregaPersonalId}
              className="ej-card rounded-2xl p-4 border border-stone-200 bg-white transition hover:shadow-md hover:border-stone-300"
            >
              {/* Encabezado de la Tarjeta */}
              <div className="flex flex-col gap-3 sm:flex-row sm:equipos-start sm:justify-between border-b border-stone-100 pb-3">
                <div className="space-y-1">
                  <div className="flex equipos-center gap-2">
                    <span className="text-[10px] font-bold text-stone-600 bg-stone-100 rounded px-2 py-0.5">
                      #{entrega.articuloEntregaPersonalId}
                    </span>
                    <span className="text-xs font-semibold text-stone-600">
                      {formatDateOnlyForDisplay(entrega.fecha)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-stone-900 flex equipos-center gap-1.5">
                    <PersonRoundedIcon className="text-stone-600" fontSize="inherit" />
                    {entrega.personalLabel}
                    <span className="text-xs font-normal text-stone-600">
                      ({formatUruguayanCi(entrega.personalCi)})
                    </span>
                  </h4>
                </div>

                <div className="flex flex-wrap gap-2 equipos-center">
                  <button
                    onClick={() => handlePrintReceipt(entrega)}
                    className="inline-flex h-8 equipos-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
                    title="Imprimir constancia física"
                  >
                    <PrintRoundedIcon fontSize="inherit" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => setSelectedEntrega(entrega)}
                    className="inline-flex h-8 equipos-center justify-center gap-1.5 rounded-lg bg-stone-950 px-3 text-xs font-bold text-white transition hover:bg-stone-800 active:scale-95"
                  >
                    Ver Detalle
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setConfirmDeleteId(entrega.articuloEntregaPersonalId)}
                      className="inline-flex h-8 w-8 equipos-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100 active:scale-95"
                      title="Eliminar registro (en caso de error)"
                    >
                      <DeleteRoundedIcon fontSize="small" />
                    </button>
                  )}
                </div>
              </div>

              {/* Contenido / Artículos entregados */}
              <div className="mt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-2">
                  Artículos Entregados
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {entrega.equipos.map((equipo) => (
                    <div
                      key={`${entrega.articuloEntregaPersonalId}-${equipo.articuloId}`}
                      className="inline-flex equipos-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700"
                    >
                      <ArticleRoundedIcon fontSize="inherit" className="text-stone-600" />
                      <span className="font-semibold text-stone-900">{equipo.nombre}</span>
                      <span className="font-bold text-stone-600 bg-white border border-stone-200 rounded px-1 text-[10px]">
                        x{equipo.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comentarios o Metadatos */}
              <div className="mt-3 pt-3 border-t border-stone-100 flex flex-col gap-2 sm:flex-row sm:equipos-center sm:justify-between text-xs text-stone-600">
                <div className="flex equipos-center gap-2">
                  <span>
                    <strong>Ordenado por:</strong> {entrega.ordenanteLabel}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span>
                    <strong>Registrado por:</strong> {entrega.usuarioEntregaLabel}
                  </span>
                </div>

                {entrega.comentario && (
                  <div className="flex equipos-center gap-1.5 italic text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1 border border-amber-200/50 self-start sm:self-auto">
                    <ChatBubbleOutlineRoundedIcon fontSize="inherit" />
                    <span>&quot;{entrega.comentario}&quot;</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Diálogo de Detalle */}
      {selectedEntrega && (
        <div className="fixed inset-0 z-50 flex equipos-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto animate-scale-up">
            {/* Cabecera */}
            <header className="border-b border-stone-100 pb-3 mb-4">
              <span className="text-[10px] font-bold text-stone-600 bg-stone-100 rounded px-2 py-0.5">
                Entrega #{selectedEntrega.articuloEntregaPersonalId}
              </span>
              <h3 className="mt-1 text-lg font-extrabold text-stone-950">
                Constancia Detallada de Entrega
              </h3>
              <p className="text-xs text-stone-600">
                Registrado en sistema el {formatDateOnlyForDisplay(selectedEntrega.fecha)}
              </p>
            </header>

            {/* Datos Clave */}
            <div className="space-y-3 text-sm text-stone-800 mb-5">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 space-y-2">
                <p>
                  <strong className="text-stone-600">Recibe (Personal):</strong>{" "}
                  <span className="font-semibold text-stone-900">
                    {selectedEntrega.personalLabel}
                  </span>
                  <br />
                  <span className="text-xs text-stone-600">
                    C.I. {formatUruguayanCi(selectedEntrega.personalCi)}
                  </span>
                </p>
                <div className="border-t border-stone-200/60 my-2" />
                <p>
                  <strong className="text-stone-600">Autoriza (Ordenante):</strong>{" "}
                  <span className="font-semibold text-stone-900">
                    {selectedEntrega.ordenanteLabel}
                  </span>
                  <br />
                  <span className="text-xs text-stone-600">
                    C.I. {formatUruguayanCi(selectedEntrega.ordenanteCi)}
                  </span>
                </p>
                <div className="border-t border-stone-200/60 my-2" />
                <p>
                  <strong className="text-stone-600">Registra (Operador):</strong>{" "}
                  <span className="font-semibold text-stone-900">
                    {selectedEntrega.usuarioEntregaLabel}
                  </span>
                </p>
              </div>

              {/* Equipos */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 block mb-2">
                  Artículos Entregados
                </span>
                <div className="border border-stone-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-stone-600 border-b border-stone-200">
                        <th className="px-3 py-2">Artículo</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-right">Cant.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntrega.equipos.map((equipo) => (
                        <tr key={equipo.articuloId} className="border-b border-stone-100 text-xs">
                          <td className="px-3 py-2 font-semibold text-stone-900">
                            {equipo.nombre}
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] text-stone-600 uppercase">
                            {equipo.tipo}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-stone-900">
                            {equipo.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comentarios */}
              {selectedEntrega.comentario && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <h4 className="text-xs font-bold text-amber-900">Observaciones</h4>
                  <p className="mt-1 text-xs text-amber-800 italic">
                    &quot;{selectedEntrega.comentario}&quot;
                  </p>
                </div>
              )}
            </div>

            {/* Acciones */}
            <div className="flex gap-2 justify-end border-t border-stone-100 pt-3">
              {isAdmin && (
                <button
                  onClick={() => setConfirmDeleteId(selectedEntrega.articuloEntregaPersonalId)}
                  className="inline-flex h-9 equipos-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95 mr-auto"
                >
                  <DeleteRoundedIcon fontSize="small" />
                  Eliminar
                </button>
              )}
              <button
                onClick={() => handlePrintReceipt(selectedEntrega)}
                className="inline-flex h-9 equipos-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
              >
                <PrintRoundedIcon fontSize="small" />
                Imprimir Recibo
              </button>
              <button
                onClick={() => setSelectedEntrega(null)}
                className="inline-flex h-9 equipos-center justify-center rounded-xl bg-stone-900 px-4 text-sm font-bold text-white transition hover:bg-stone-800 active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[60] flex equipos-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 text-center space-y-4 animate-scale-up">
            <div className="mx-auto flex h-12 w-12 equipos-center justify-center rounded-full bg-rose-100 text-rose-600">
              <DeleteRoundedIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-950">¿Eliminar registro de entrega?</h3>
              <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
                Esta acción eliminará el registro de forma permanente, descontará la entrega y{" "}
                <strong>reabastecerá el stock</strong> de los artículos involucrados inmediatamente.
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleteLoading}
                className="inline-flex h-9 equipos-center justify-center rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDelete(confirmDeleteId)}
                disabled={deleteLoading}
                className="inline-flex h-9 equipos-center justify-center rounded-xl bg-rose-600 px-4 text-xs font-bold text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-50"
              >
                {deleteLoading ? "Eliminando..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
