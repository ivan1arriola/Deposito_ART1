import { LoadingInline } from "@/app/components/shared";

export default function RootLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="ej-loading-message px-5 py-4">
        <LoadingInline
          label="Cargando pagina..."
          size="md"
          textClassName="text-sm font-semibold text-[var(--color-text-secondary)]"
        />
      </div>
    </main>
  );
}
