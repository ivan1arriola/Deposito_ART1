"use client";

import type { FormEvent } from "react";
import { LoadingInline } from "@/app/components/shared";
import type { EquipoForm } from "@/types/forms";

type EquipoCreateViewProps = {
  form: EquipoForm;
  saving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (key: keyof Pick<EquipoForm, "nombre" | "tipo" | "activo">, value: string | boolean) => void;
};

export function EquipoCreateView({ form, saving, onBack, onSubmit, onChange }: EquipoCreateViewProps) {
  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Registrar equipo</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Crea un equipo operativo y define si aparece en la hoja de entrega.
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

        <form onSubmit={onSubmit} className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <label className="block">
              <span className="block text-xs font-medium text-stone-700">Nombre del equipo *</span>
              <input
                value={form.nombre}
                onChange={(event) => onChange("nombre", event.target.value)}
                placeholder="Nuevo equipo"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-4 block">
              <span className="block text-xs font-medium text-stone-700">Tipo de equipo *</span>
              <select
                value={form.tipo}
                onChange={(event) => onChange("tipo", event.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              >
                <option value="GENERAL">General</option>
                <option value="FRI">FRI</option>
              </select>
            </label>

            <label className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) => onChange("activo", event.target.checked)}
                className="h-4 w-4 rounded border-stone-300"
              />
              <span className="text-sm font-medium text-stone-700">Aparece en Hoja de Entrega</span>
            </label>
          </div>

          <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">Alta inmediata</p>
            <p className="mt-3 text-sm leading-6 text-white/85">
              El equipo quedará disponible enseguida para configuración, stock y movimientos.
            </p>
            <button
              type="submit"
              disabled={saving || form.nombre.trim() === ""}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)]"
            >
              {saving ? (
                <LoadingInline
                  label="Creando..."
                  size="xs"
                  tone="dark"
                  showSpinner
                  textClassName="text-sm font-bold text-[var(--color-ejercito-black)]"
                />
              ) : (
                "Registrar equipo"
              )}
            </button>
          </aside>
        </form>
      </article>
    </section>
  );
}
