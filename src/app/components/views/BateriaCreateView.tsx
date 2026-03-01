"use client";

type BateriaCreateViewProps = {
  nombre: string;
  orden: string;
  saving: boolean;
  suggestedOrder: number;
  onBack: () => void;
  onCreate: () => void;
  onNombreChange: (value: string) => void;
  onOrdenChange: (value: string) => void;
};

export function BateriaCreateView({
  nombre,
  orden,
  saving,
  suggestedOrder,
  onBack,
  onCreate,
  onNombreChange,
  onOrdenChange,
}: BateriaCreateViewProps) {
  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6e7_55%,#fff8db_100%)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">Registrar batería</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Define una nueva batería y su orden institucional.
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

        <div className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
            <label className="block">
              <span className="block text-xs font-medium text-stone-700">Nombre de la batería *</span>
              <input
                value={nombre}
                onChange={(event) => onNombreChange(event.target.value)}
                placeholder="Nueva batería"
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

          <aside className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300">Alta inmediata</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              La batería queda disponible para asignar personal apenas se registre.
            </p>
            <button
              type="button"
              onClick={onCreate}
              disabled={saving || nombre.trim() === ""}
              className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
            >
              {saving ? "Creando..." : "Registrar batería"}
            </button>
          </aside>
        </div>
      </article>
    </section>
  );
}
