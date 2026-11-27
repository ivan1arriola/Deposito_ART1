"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingInline } from "@/app/components/shared";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { MovimientoRecintoViewRow } from "@/types/views";

type MovimientosRecintosResponse = {
  generatedAt: string;
  total: number;
  rows: MovimientoRecintoViewRow[];
};

type MovimientosRecintosViewProps = {
  canWrite: boolean;
  canDelete: boolean;
  onOpenRegistro: (tipo: "ENTREGA" | "DEVOLUCION" | "ASIGNACION") => void;
  onDeleteRegistro: (
    registroId: string,
    fechaLabel: string,
    nombreLabel: string,
    onSuccess: () => void
  ) => void;
  onRectifyRegistro: (registroId: string) => void;
};

function getRowActionClasses(variant: "neutral" | "primary" | "danger") {
  const base =
    "inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  if (variant === "primary") {
    return `${base} border-violet-700 bg-violet-700 text-white hover:bg-violet-800`;
  }
  if (variant === "danger") {
    return `${base} border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100`;
  }
  return `${base} border-stone-300 bg-white text-stone-800 hover:bg-stone-100`;
}

export function MovimientosRecintosView({
  canWrite,
  canDelete,
  onOpenRegistro,
  onDeleteRegistro,
  onRectifyRegistro,
}: MovimientosRecintosViewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [rows, setRows] = useState<MovimientoRecintoViewRow[]>([]);
  const [search, setSearch] = useState("");
  const [sortDirection] = useState<"asc" | "desc">("desc");
  const [detailRow, setDetailRow] = useState<MovimientoRecintoViewRow | null>(null);

  const loadRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/movimientos/recintos?ts=${Date.now()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as MovimientosRecintosResponse | { error?: string };
      if (!response.ok) {
        throw new Error(
          typeof payload === "object" && payload && "error" in payload
            ? payload.error || "Error"
            : "Error"
        );
      }

      const data = payload as MovimientosRecintosResponse;
      setRows(data.rows);
      setGeneratedAt(data.generatedAt);
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : "No se pudo cargar el listado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  const rowSearchIndex = useMemo(
    () =>
      buildSearchIndex(rows, {
        text: (row) =>
          [
            row.fecha,
            row.tipo,
            row.clase,
            row.nombre,
            row.anulado ? "anulada anulado" : "",
            ...(row.equipos || []).map((i) => `${i.equipo} ${i.cantidad}`),
            ...(row.articulos || []).map((a) => `${a.articulo} ${a.tipo} ${a.cantidad}`),
            row.observaciones || "",
            row.usuarioEntrega || "",
          ].join(" "),
      }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return filterSearchIndex(rowSearchIndex, search);
  }, [rowSearchIndex, search]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      if (a.fecha !== b.fecha) {
        return sortDirection === "desc"
          ? b.fecha.localeCompare(a.fecha)
          : a.fecha.localeCompare(b.fecha);
      }
      return 0;
    });
  }, [filteredRows, sortDirection]);

  const openReceipt = (movimientoId: string) => {
    window.open(
      `/api/registros/${encodeURIComponent(movimientoId)}/recibo`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const renderActionButtons = (row: MovimientoRecintoViewRow) => {
    const isAnulada = Boolean(row.anulado);
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setDetailRow(row)}
          disabled={loading}
          className={getRowActionClasses("neutral")}
          aria-label={`Ver detalle de asignación ${row.nombre}`}
        >
          <span>Detalle</span>
        </button>
        <button
          type="button"
          onClick={() => openReceipt(row.movimientoId)}
          disabled={loading}
          className={getRowActionClasses("neutral")}
          aria-label={`Imprimir recibo de asignación ${row.nombre}`}
        >
          <span>Imprimir</span>
        </button>
        {canWrite ? (
          <button
            type="button"
            onClick={() => onRectifyRegistro(row.movimientoId)}
            disabled={loading || isAnulada}
            className={getRowActionClasses("primary")}
            aria-label={`Editar asignación ${row.nombre}`}
          >
            <span>Editar</span>
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={() =>
              onDeleteRegistro(row.movimientoId, row.fecha, row.nombre, () => void loadRows())
            }
            disabled={loading || isAnulada}
            className={getRowActionClasses("danger")}
            aria-label={`Anular asignación ${row.nombre}`}
          >
            <span>Anular</span>
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">
              Asignaciones a Recintos y Externos
            </h2>
            <p className="mt-1 text-xs text-stone-600">
              Listado global de asignaciones realizadas a recintos, departamentos internos o
              personal externo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={() => onOpenRegistro("ASIGNACION")}
                disabled={loading}
                className="min-h-[44px] rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-800 disabled:opacity-60"
              >
                Registrar Asignación
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => window.open("/listado-asignaciones?autoprint=1", "_blank")}
              className="min-h-[44px] rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-200"
            >
              Imprimir listado
            </button>
            <button
              type="button"
              onClick={() => void loadRows()}
              disabled={loading}
              className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-60"
            >
              {loading ? (
                <LoadingInline
                  label="Actualizando..."
                  size="xs"
                  tone="dark"
                  textClassName="text-xs font-semibold text-stone-700"
                />
              ) : (
                "Actualizar"
              )}
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por destino, equipo, artículo, fecha, responsable u observaciones"
            aria-label="Buscar asignaciones"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <p className="text-xs font-semibold text-stone-600">
            Mostrando {sortedRows.length} de {rows.length}
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <LoadingInline
            label="Cargando asignaciones a recintos..."
            className="mt-3"
            textClassName="text-sm font-medium text-stone-600"
          />
        ) : null}

        {!loading && !error && sortedRows.length === 0 ? (
          <p className="mt-3 text-xs text-stone-600">
            No hay asignaciones para mostrar con el filtro actual.
          </p>
        ) : null}
      </article>

      {sortedRows.length > 0 ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="space-y-3 md:hidden" data-testid="asignaciones-mobile-list">
            {sortedRows.map((row, index) => (
              <div
                key={`mobile-${row.movimientoId}-${index}`}
                className={`rounded-xl border p-4 ${
                  row.anulado ? "border-rose-200 bg-rose-50/40" : "border-stone-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-stone-600">{row.fecha}</p>
                    <h3 className="mt-0.5 text-sm font-bold text-stone-900">{row.nombre}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-stone-700">
                      {row.clase}
                    </span>
                    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold uppercase text-violet-800">
                      {row.tipo}
                    </span>
                    {row.anulado ? (
                      <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold uppercase text-rose-800">
                        Anulada
                      </span>
                    ) : null}
                  </div>
                </div>

                {row.equipos.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Equipos
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-stone-800">
                      {row.equipos.map((item, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span>{item.equipo}</span>
                          <span className="font-bold tabular-nums">x{item.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {row.articulos && row.articulos.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Artículos
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-stone-800">
                      {row.articulos.map((art, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span>
                            {art.articulo}{" "}
                            <span className="text-xs text-stone-500">({art.tipo})</span>
                          </span>
                          <span className="font-bold tabular-nums">x{art.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {row.observaciones ? (
                  <p className="mt-2 text-xs text-stone-600">{row.observaciones}</p>
                ) : null}

                <div className="mt-3 border-t border-stone-100 pt-3">
                  {renderActionButtons(row)}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-auto rounded-xl border border-stone-200 md:block">
            <table className="w-full min-w-[1060px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Fecha
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Tipo
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Clase
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Destino (Recinto/Externo)
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Equipos y Artículos
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Autor
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Observaciones
                  </th>
                  <th className="border-b border-stone-200 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr
                    key={`${row.movimientoId}-${index}`}
                    className={
                      row.anulado
                        ? "bg-rose-50/40"
                        : index % 2 === 0
                          ? "bg-white"
                          : "bg-stone-50/70"
                    }
                  >
                    <td className="border-b border-stone-200 px-3 py-2 align-top font-mono text-sm text-stone-800">
                      {row.fecha}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 align-top text-sm font-semibold text-stone-900">
                      <div className="flex flex-wrap gap-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            row.tipo === "ENTREGA"
                              ? "bg-emerald-100 text-emerald-800"
                              : row.tipo === "DEVOLUCION"
                                ? "bg-amber-100 text-amber-800"
                                : row.tipo === "ASIGNACION"
                                  ? "bg-violet-100 text-violet-800"
                                  : "bg-stone-100 text-stone-800"
                          }`}
                        >
                          {row.tipo}
                        </span>
                        {row.anulado ? (
                          <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                            Anulada
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 align-top text-xs font-semibold uppercase text-stone-500">
                      {row.clase}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 align-top text-sm font-bold text-stone-900">
                      {row.nombre}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 align-top text-sm text-stone-800">
                      <div className="space-y-1">
                        {(row.equipos || []).map((item, idx) => (
                          <div
                            key={`eq-${idx}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>{item.equipo}</span>
                            <span className="font-bold tabular-nums text-stone-900">
                              x{item.cantidad}
                            </span>
                          </div>
                        ))}
                        {(row.articulos || []).map((art, idx) => (
                          <div
                            key={`art-${idx}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>
                              {art.articulo}{" "}
                              <span className="text-xs text-stone-500">({art.tipo})</span>
                            </span>
                            <span className="font-bold tabular-nums text-stone-900">
                              x{art.cantidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 align-top text-xs text-stone-600">
                      {row.usuarioEntrega || "-"}
                    </td>
                    <td
                      className="max-w-[200px] truncate border-b border-stone-200 px-3 py-2 align-top text-sm text-stone-700"
                      title={row.observaciones || ""}
                    >
                      {row.observaciones || "-"}
                    </td>
                    <td className="border-b border-stone-200 px-3 py-2 text-right align-top">
                      {renderActionButtons(row)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {generatedAt ? (
            <p className="mt-3 text-xs text-stone-500">
              Generado: {formatDateTimeForDisplay(generatedAt)}
            </p>
          ) : null}
        </article>
      ) : null}

      {detailRow ? (
        <ModalFrame onClose={() => setDetailRow(null)} size="md">
          <div className="p-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-stone-900">
                Detalle de{" "}
                {detailRow.tipo === "ASIGNACION"
                  ? "Asignación"
                  : detailRow.tipo === "ENTREGA"
                    ? "Entrega"
                    : "Devolución"}
              </h3>
              {detailRow.anulado ? (
                <span className="inline-flex rounded-full border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-xs font-bold uppercase text-rose-800">
                  Anulada
                </span>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    ID Movimiento
                  </p>
                  <p className="mt-1 break-all font-mono text-sm text-stone-800">
                    {detailRow.movimientoId}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{detailRow.fecha}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Destino ({detailRow.clase})
                </p>
                <p className="mt-1 text-sm font-bold text-stone-900">{detailRow.nombre}</p>
              </div>

              {detailRow.responsableInfo ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Responsable a cargo
                  </p>
                  <p className="mt-1 text-sm font-medium text-stone-800">
                    {detailRow.responsableInfo.grado} {detailRow.responsableInfo.nombre}{" "}
                    {detailRow.responsableInfo.apellido}
                    {detailRow.responsableInfo.ci &&
                    !detailRow.responsableInfo.ci.startsWith("SD-") ? (
                      <span className="ml-1 font-normal text-stone-500">
                        (CI: {detailRow.responsableInfo.ci})
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {detailRow.equipos.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Equipos
                  </p>
                  <div className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {detailRow.equipos.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-stone-50/50 p-3"
                      >
                        <span className="text-sm font-medium text-stone-800">{item.equipo}</span>
                        <span className="rounded border border-stone-200 bg-white px-2 py-0.5 text-sm font-bold text-stone-900 shadow-sm tabular-nums">
                          x{item.cantidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {detailRow.articulos && detailRow.articulos.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Artículos
                  </p>
                  <div className="mt-2 divide-y divide-stone-100 rounded-lg border border-stone-200">
                    {detailRow.articulos.map((art, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-stone-50/50 p-3"
                      >
                        <span className="text-sm font-medium text-stone-800">
                          {art.articulo}{" "}
                          <span className="text-xs text-stone-500">({art.tipo})</span>
                        </span>
                        <span className="rounded border border-stone-200 bg-white px-2 py-0.5 text-sm font-bold text-stone-900 shadow-sm tabular-nums">
                          x{art.cantidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Autor
                  </p>
                  <p className="mt-1 text-sm text-stone-800">{detailRow.usuarioEntrega || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Observaciones
                  </p>
                  <p className="mt-1 text-sm text-stone-800">{detailRow.observaciones || "-"}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-stone-100 pt-4">
              <button
                type="button"
                onClick={() => setDetailRow(null)}
                className="min-h-[44px] rounded-xl px-5 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => openReceipt(detailRow.movimientoId)}
                className="flex min-h-[44px] items-center gap-2 rounded-xl bg-violet-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-800"
              >
                Imprimir
              </button>
            </div>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
