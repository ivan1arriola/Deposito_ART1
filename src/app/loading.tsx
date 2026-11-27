import { LoadingBootStatus } from "@/app/components/shared/LoadingBootStatus";

export default function RootLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="ej-loading-message px-5 py-4">
        <LoadingBootStatus />
      </div>
    </main>
  );
}
