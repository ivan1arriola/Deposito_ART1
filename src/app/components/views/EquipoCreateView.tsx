"use client";

import type { FormEvent } from "react";
import type { EquipoForm } from "@/types/forms";

type EquipoCreateViewProps = {
  form: EquipoForm;
  saving: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (key: keyof Pick<EquipoForm, "nombre" | "activo">, value: string | boolean) => void;
};

export function EquipoCreateView({ form, saving, onBack, onSubmit, onChange }: EquipoCreateViewProps) {
  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#edf8f1_60%,#fff8db_100%)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-stone-900">Registrar equipo</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Crea un equipo operativo y define si aparece en la hoja de entrega.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
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

          <aside className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300">Alta inmediata</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              El equipo quedará disponible enseguida para configuración, stock y movimientos.
            </p>
            <button
              type="submit"
              disabled={saving || form.nombre.trim() === ""}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
            >
              {saving ? "Creando..." : "Registrar equipo"}
            </button>
          </aside>
        </form>
      </article>
    </section>
  );
}
