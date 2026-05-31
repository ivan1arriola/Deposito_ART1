"use client";

type RangoCreateViewProps = {
  abreviacion: string;
  nombreCompleto: string;
  orden: string;
  saving: boolean;
  suggestedOrder: number;
  onBack: () => void;
  onCreate: () => void;
  onAbreviacionChange: (value: string) => void;
  onNombreCompletoChange: (value: string) => void;
  onOrdenChange: (value: string) => void;
};

export function RangoCreateView({
  abreviacion,
  nombreCompleto,
  orden,
  saving,
  suggestedOrder,
  onBack,
  onCreate,
  onAbreviacionChange,
  onNombreCompletoChange,
  onOrdenChange,
}: RangoCreateViewProps) {
  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:equipos-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Registrar grado</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Agrega un nuevo grado para clasificar personal y mantener el orden jerárquico.
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
            <label className="block">
              <span className="block text-xs font-medium text-stone-700">Abreviacion *</span>
              <input
                value={abreviacion}
                onChange={(event) => onAbreviacionChange(event.target.value)}
                placeholder="Ej: Sgto"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-4 block">
              <span className="block text-xs font-medium text-stone-700">Nombre completo *</span>
              <input
                value={nombreCompleto}
                onChange={(event) => onNombreCompletoChange(event.target.value)}
                placeholder="Ej: Sargento"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>

            <label className="mt-4 block">
              <span className="block text-xs font-medium text-stone-700">Orden</span>
              <input
                type="number"
                min={1}
                value={orden}
                onChange={(event) => onOrdenChange(event.target.value)}
                placeholder={String(suggestedOrder)}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              />
            </label>
          </div>

          <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">Alta inmediata</p>
            <p className="mt-3 text-sm leading-6 text-white/85">
              El grado quedará disponible al instante para altas y edición de personal.
            </p>
            <button
              type="button"
              onClick={onCreate}
              disabled={saving || abreviacion.trim() === "" || nombreCompleto.trim() === ""}
              className="mt-5 inline-flex w-full equipos-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)]"
            >
              {saving ? "Creando..." : "Registrar grado"}
            </button>
          </aside>
        </div>
      </article>
    </section>
  );
}
