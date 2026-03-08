import { LoadingInline } from "@/app/components/shared";

export default function RootLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="rounded-2xl border border-stone-300 bg-white/95 px-5 py-4 shadow-lg">
        <LoadingInline
          label="Cargando pagina..."
          size="md"
          textClassName="text-sm font-semibold text-stone-700"
        />
      </div>
    </main>
  );
}
