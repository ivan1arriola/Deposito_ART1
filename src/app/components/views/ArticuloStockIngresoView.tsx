"use client";

import type { Articulo } from "@/types/entities";

type ArticuloStockIngresoViewProps = {
  articulos: Articulo[];
  articuloId: string;
  cantidad: string;
  comentarios: string;
  saving: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onArticuloIdChange: (value: string) => void;
  onCantidadChange: (value: string) => void;
  onComentariosChange: (value: string) => void;
};

const TIPO_LABEL: Record<Articulo["tipo"], string> = {
  OFICINA: "Oficina",
  LIMPIEZA: "Limpieza",
};

export function ArticuloStockIngresoView({
  articulos,
  articuloId,
  cantidad,
  comentarios,
  saving,
  onBack,
  onSubmit,
  onArticuloIdChange,
  onCantidadChange,
  onComentariosChange,
}: ArticuloStockIngresoViewProps) {
  const articulosOrdenados = [...articulos].sort(
    (a, b) =>
      a.tipo.localeCompare(b.tipo) ||
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );

  const articuloSeleccionado =
    articulosOrdenados.find((articulo) => String(articulo.articuloId) === articuloId) ?? null;
  const cantidadIngresada = Number(cantidad);
  const cantidadValida = Number.isInteger(cantidadIngresada) && cantidadIngresada > 0;
  const stockProyectado =
    articuloSeleccionado && cantidadValida
      ? articuloSeleccionado.stockActual + cantidadIngresada
      : (articuloSeleccionado?.stockActual ?? 0);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">
                Vista operativa
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">
                Ingreso de stock de artículos
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Suma unidades a un artículo ya registrado sin mezclarlo con el stock de equipos.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            {articulosOrdenados.length === 0 ? (
              <p className="text-sm text-stone-600">
                Primero debes registrar al menos un artículo.
              </p>
            ) : (
              <>
                <label className="block">
                  <span className="block text-xs font-medium text-stone-700">Artículo *</span>
                  <select
                    value={articuloId}
                    onChange={(event) => onArticuloIdChange(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">Selecciona un artículo</option>
                    {articulosOrdenados.map((articulo) => (
                      <option key={articulo.articuloId} value={String(articulo.articuloId)}>
                        {`${articulo.nombre} · ${TIPO_LABEL[articulo.tipo]}`}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-4 block">
                  <span className="block text-xs font-medium text-stone-700">
                    Cantidad a ingresar *
                  </span>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={cantidad}
                    onChange={(event) => onCantidadChange(event.target.value)}
                    placeholder="Ej: 12"
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="block text-xs font-medium text-stone-700">Comentarios</span>
                  <textarea
                    value={comentarios}
                    onChange={(event) => onComentariosChange(event.target.value)}
                    rows={4}
                    placeholder="Opcional. Ej: Compra de reposición mensual."
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                  />
                </label>
              </>
            )}
          </div>

          <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">
              Resumen
            </p>
            {articuloSeleccionado ? (
              <>
                <p className="mt-3 text-sm font-bold">{articuloSeleccionado.nombre}</p>
                <p className="mt-1 text-sm text-white/80">
                  {TIPO_LABEL[articuloSeleccionado.tipo]}
                </p>
                <p className="mt-4 text-sm leading-6 text-white/85">{`Stock actual: ${articuloSeleccionado.stockActual}`}</p>
                <p className="text-sm leading-6 text-white/85">{`Stock proyectado: ${stockProyectado}`}</p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-white/85">
                Selecciona un artículo para ver su stock actual.
              </p>
            )}
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving || !articuloSeleccionado || !cantidadValida}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)]"
            >
              {saving ? "Registrando..." : "Registrar ingreso"}
            </button>
          </aside>
        </div>
      </article>
    </section>
  );
}
