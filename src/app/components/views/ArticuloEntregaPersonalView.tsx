"use client";

import { useMemo } from "react";
import type { Articulo, Personal, OficialSuboficial } from "@/types/entities";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { buildActuanteOptions } from "@/app/components/views/stock/utils";

export type ArticuloEntregaPersonalDraftItem = {
  articuloId: string;
  cantidad: string;
};

export type ArticuloEntregaPersonalViewProps = {
  articulos: Articulo[];
  personal: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  personalCi: string;
  ordenanteCi: string;
  fecha: string;
  comentarios: string;
  equipos: ArticuloEntregaPersonalDraftItem[];
  saving: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onPersonalCiChange: (value: string) => void;
  onOrdenanteCiChange: (value: string) => void;
  onFechaChange: (value: string) => void;
  onComentariosChange: (value: string) => void;
  onItemChange: (index: number, field: keyof ArticuloEntregaPersonalDraftItem, value: string) => void;
  onAddItem: () => void;
  onRemoveEquipo: (index: number) => void;
};

const TIPO_LABEL: Record<Articulo["tipo"], string> = {
  OFICINA: "Oficina",
  LIMPIEZA: "Limpieza",
};

function validateEntregaPersonal(
  personalCi: string,
  ordenanteCi: string,
  equipos: ArticuloEntregaPersonalDraftItem[],
  articulos: Articulo[],
): { isValid: boolean; message: string | null; totalQuantity?: number } {
  if (!personalCi.trim()) {
    return { isValid: false, message: "Selecciona un personal destinatario." };
  }
  if (!ordenanteCi.trim()) {
    return { isValid: false, message: "Indica quién autoriza u ordena la entrega." };
  }
  if (personalCi === ordenanteCi) {
    return { isValid: false, message: "El destinatario no puede ser el mismo que ordena la entrega." };
  }

  let totalQuantity = 0;
  const selectedItemIds = new Set<string>();

  for (let i = 0; i < equipos.length; i++) {
    const equipo = equipos[i];
    if (!equipo.articuloId) {
      return { isValid: false, message: `Selecciona un artículo en la fila ${i + 1}.` };
    }
    if (selectedItemIds.has(equipo.articuloId)) {
      return { isValid: false, message: "No puedes repetir el mismo artículo en la entrega." };
    }
    selectedItemIds.add(equipo.articuloId);

    const qty = Number(equipo.cantidad);
    if (!Number.isInteger(qty) || qty <= 0) {
      return { isValid: false, message: `La cantidad en la fila ${i + 1} debe ser un número entero mayor a 0.` };
    }

    const originalArticulo = articulos.find((a) => String(a.articuloId) === equipo.articuloId);
    if (!originalArticulo) {
      return { isValid: false, message: `Artículo no encontrado en la fila ${i + 1}.` };
    }
    if (qty > originalArticulo.stockActual) {
      return {
        isValid: false,
        message: `Stock insuficiente para ${originalArticulo.nombre} (Solicitado: ${qty}, Disponible: ${originalArticulo.stockActual}).`,
      };
    }

    totalQuantity += qty;
  }

  if (equipos.length === 0) {
    return { isValid: false, message: "Agrega al menos un artículo para la entrega." };
  }

  return { isValid: true, message: null, totalQuantity };
}

export function ArticuloEntregaPersonalView({
  articulos,
  personal,
  oficialesSuboficiales,
  personalCi,
  ordenanteCi,
  fecha,
  comentarios,
  equipos,
  saving,
  onBack,
  onSubmit,
  onPersonalCiChange,
  onOrdenanteCiChange,
  onFechaChange,
  onComentariosChange,
  onItemChange,
  onAddItem,
  onRemoveEquipo,
}: ArticuloEntregaPersonalViewProps) {
  // Sort articles by type then by name
  const articulosOrdenados = useMemo(() => {
    return [...articulos].sort(
      (a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
    );
  }, [articulos]);

  // Recipient options (combines subalternos and officers/subofficers)
  const recipientOptions = useMemo(() => {
    const list = [];
    // Subalterns
    for (const p of personal) {
      list.push({
        ci: p.ci,
        label: `${p.rango.abreviacion} ${apellidosLabel(p)}, ${nombresLabel(p)}`,
      });
    }
    // Officers & Subofficers
    for (const p of oficialesSuboficiales) {
      list.push({
        ci: p.ci,
        label: `${p.gradoMando.abreviacion} ${p.apellido}, ${p.nombre}`,
      });
    }
    return list.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [personal, oficialesSuboficiales]);

  // Authorizer / Ordered By options (Officers, Subofficers, and Sargentos)
  const actuanteOptions = useMemo(() => {
    return buildActuanteOptions(oficialesSuboficiales, personal);
  }, [oficialesSuboficiales, personal]);

  const selectedRecipient = useMemo(() => {
    return recipientOptions.find((opt) => opt.ci === personalCi) ?? null;
  }, [recipientOptions, personalCi]);

  const selectedOrdenante = useMemo(() => {
    return actuanteOptions.find((opt) => opt.ci === ordenanteCi) ?? null;
  }, [actuanteOptions, ordenanteCi]);

  // Validation checking
  const validation = useMemo(
    () => validateEntregaPersonal(personalCi, ordenanteCi, equipos, articulos),
    [personalCi, ordenanteCi, equipos, articulos],
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:equipos-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Nueva entrega</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Entrega de artículos a personal</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Registra la entrega de materiales de oficina o limpieza a personal militar. Afecta directamente el stock de artículos.
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

        <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Formulario Principal */}
          <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Personal Destinatario *
                </label>
                <DestinatarioSearchSelect
                  options={recipientOptions}
                  value={personalCi}
                  disabled={saving}
                  placeholder="Buscar destinatario por grado, apellido, nombre o CI"
                  onChange={onPersonalCiChange}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Por orden de *
                </label>
                <DestinatarioSearchSelect
                  options={actuanteOptions}
                  value={ordenanteCi}
                  disabled={saving}
                  placeholder="Buscar oficial, suboficial o sargento que ordena"
                  onChange={onOrdenanteCiChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Fecha de entrega *
                </label>
                <DateTextInput
                  value={fecha}
                  disabled={saving}
                  onChange={onFechaChange}
                  ariaLabel="Fecha de entrega de artículos"
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Comentarios / Notas
                </label>
                <textarea
                  value={comentarios}
                  disabled={saving}
                  onChange={(e) => onComentariosChange(e.target.value)}
                  placeholder="Opcional. Ej: Material para la oficina de administración..."
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm placeholder-stone-400 focus:border-stone-400 focus:outline-none resize-none"
                />
              </div>
            </div>

            <hr className="my-4 border-stone-200" />

            {/* Listado de Artículos */}
            <div className="space-y-3">
              <div className="flex equipos-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-stone-700">Artículos a entregar</h3>
                <button
                  type="button"
                  onClick={onAddItem}
                  disabled={saving}
                  className="rounded-xl bg-stone-800 hover:bg-stone-900 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50"
                >
                  + Agregar artículo
                </button>
              </div>

              {equipos.map((equipo, index) => {
                const selectedArt = articulos.find((a) => String(a.articuloId) === equipo.articuloId) ?? null;
                const isOverStock = selectedArt && Number(equipo.cantidad) > selectedArt.stockActual;

                return (
                  <div
                    key={`entrega-equipo-${index}`}
                    className={`grid grid-cols-1 gap-3 rounded-2xl border p-4 transition-colors md:grid-cols-[minmax(0,1fr)_120px_auto] equipos-end ${
                      isOverStock ? "border-amber-300 bg-amber-50/50" : "border-stone-200 bg-white"
                    }`}
                  >
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Artículo</label>
                      <select
                        value={equipo.articuloId}
                        disabled={saving}
                        onChange={(e) => onItemChange(index, "articuloId", e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Seleccionar artículo...</option>
                        {articulosOrdenados.map((art) => (
                          <option key={art.articuloId} value={String(art.articuloId)}>
                            {`${art.nombre} · ${TIPO_LABEL[art.tipo]} [Stock: ${art.stockActual}]`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min={1}
                        value={equipo.cantidad}
                        disabled={saving}
                        onChange={(e) => onItemChange(index, "cantidad", e.target.value)}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                      />
                    </div>

                    <div className="flex md:block md:self-end">
                      <button
                        type="button"
                        onClick={() => onRemoveEquipo(index)}
                        disabled={saving || equipos.length <= 1}
                        className="w-full rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Quitar
                      </button>
                    </div>

                    {isOverStock && (
                      <p className="col-span-full text-xs font-semibold text-amber-700 mt-1 flex equipos-center gap-1">
                        ⚠️ Cantidad excede el stock disponible ({selectedArt.stockActual} unidades en depósito).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen & Botón de Guardado */}
          <aside className="flex flex-col justify-between rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-5 text-white shadow-sm">
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">
                Resumen de entrega
              </p>

              <div>
                <p className="text-xs text-white/70">Destinatario</p>
                <p className="text-sm font-bold mt-1 text-white">
                  {selectedRecipient ? selectedRecipient.label : "Ninguno seleccionado"}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/70">Por orden de</p>
                <p className="text-sm font-bold mt-1 text-white">
                  {selectedOrdenante ? selectedOrdenante.label : "Ninguno seleccionado"}
                </p>
              </div>

              <div>
                <p className="text-xs text-white/70">Fecha</p>
                <p className="text-sm font-bold mt-1 text-white">{fecha || "Hoy"}</p>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-xs text-white/70">Total artículos a entregar</p>
                <p className="text-2xl font-black mt-1 text-[var(--color-ejercito-gold)]">
                  {validation.isValid ? (validation.totalQuantity ?? 0) : 0}
                </p>
              </div>

              {!validation.isValid && validation.message && (
                <div className="rounded-xl bg-amber-500/20 border border-amber-500/30 p-3 text-xs text-amber-200">
                  {validation.message}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={saving || !validation.isValid}
              className="mt-6 inline-flex w-full equipos-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3.5 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)] shadow-md hover:shadow-lg active:scale-[0.98] duration-150"
            >
              {saving ? "Registrando entrega..." : "Registrar entrega"}
            </button>
          </aside>
        </div>
      </article>
    </section>
  );
}
