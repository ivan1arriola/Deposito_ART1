"use client";

export function FormulariosPlaceholder() {
  return (
    <section className="mt-6">
      <article className="ej-card overflow-hidden rounded-3xl p-0">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-5 py-5 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Próxima vista</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Formularios</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
            Este espacio queda reservado para futuros formularios operativos y administrativos.
          </p>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-2xl border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-5">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Módulo en preparación</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              Cuando se implemente, acá podrás centralizar formularios especiales sin mezclarlos con personal, equipos o configuración.
            </p>
          </div>

          <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-brown)]">Pendiente</p>
            <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">Vista reservada para desarrollo futuro</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              El botón ya forma parte de la navegación de la SPA. La lógica funcional se puede agregar después sin volver a tocar la estructura principal.
            </p>
          </aside>
        </div>
      </article>
    </section>
  );
}
