"use client";

export function FormulariosPlaceholder() {
  return (
    <section className="mt-6">
      <article className="ej-card overflow-hidden rounded-3xl p-0">
        <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#fff7ed_55%,#fef3c7_100%)] px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Próxima vista</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">Formularios</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Este espacio queda reservado para futuros formularios operativos y administrativos.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50/80 p-5">
            <p className="text-sm font-semibold text-stone-900">Módulo en preparación</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Cuando se implemente, acá podrás centralizar formularios especiales sin mezclarlos con personal, equipos o configuración.
            </p>
          </div>

          <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Pendiente</p>
            <p className="mt-3 text-sm font-semibold text-stone-900">Vista reservada para desarrollo futuro</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              El botón ya forma parte de la navegación de la SPA. La lógica funcional se puede agregar después sin volver a tocar la estructura principal.
            </p>
          </aside>
        </div>
      </article>
    </section>
  );
}
