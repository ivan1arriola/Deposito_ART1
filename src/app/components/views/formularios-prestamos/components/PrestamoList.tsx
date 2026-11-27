import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import type { StockDashboardData } from "@/types/views";
import { estadoBadgeClass, reciboHref } from "../utils";

type PrestamoListProps = {
  equipos: StockDashboardData["prestamos"];
  emptyMessage: string;
  showReturnAction: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  returningPrestamoId: string | null;
  editingPrestamoId: string | null;
  onSelectPrestamo: (prestamo: StockDashboardData["prestamos"][number]) => void;
  onOpenEdit: (prestamo: StockDashboardData["prestamos"][number]) => void;
  onOpenReturn: (prestamo: StockDashboardData["prestamos"][number]) => void;
};

export function PrestamoList({
  equipos,
  emptyMessage,
  showReturnAction,
  isAdmin,
  canWrite,
  returningPrestamoId,
  editingPrestamoId,
  onSelectPrestamo,
  onOpenEdit,
  onOpenReturn,
}: PrestamoListProps) {
  return (
    <div className="space-y-2">
      {equipos.length === 0 ? <p className="text-sm text-stone-600">{emptyMessage}</p> : null}
      {equipos.map((prestamo) => (
        <article
          key={prestamo.prestamoId}
          className="rounded-xl border border-stone-200 bg-stone-50 p-3 md:p-4"
        >
          <div className="flex flex-wrap equipos-start justify-between gap-3">
            <button
              type="button"
              onClick={() => onSelectPrestamo(prestamo)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="flex flex-wrap equipos-center gap-2">
                <p className="text-lg font-semibold leading-tight text-stone-900">
                  {prestamo.reciboNumero}
                </p>
                <span className="rounded-full border border-stone-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                  ID {prestamo.prestamoId}
                </span>
              </div>

              <p className="mt-1 text-sm font-medium text-stone-800">
                {prestamo.destinatarioEtiqueta}
              </p>
              {prestamo.destinatarioCi ? (
                <p className="text-xs text-stone-500">
                  CI {formatUruguayanCi(prestamo.destinatarioCi)}
                </p>
              ) : null}

              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-stone-600 sm:grid-cols-2">
                <p>
                  <span className="font-semibold text-stone-700">Prestado:</span>{" "}
                  {formatDateOnlyForDisplay(prestamo.fechaPrestamo)}
                </p>
                <p>
                  <span className="font-semibold text-stone-700">Estimado:</span>{" "}
                  {prestamo.fechaEstimadaDevolucionTexto?.trim()
                    ? prestamo.fechaEstimadaDevolucionTexto
                    : "No definido"}
                </p>
                <p className="sm:col-span-2">
                  <span className="font-semibold text-stone-700">Por orden de:</span>{" "}
                  {prestamo.actuanteNombre ?? "No registrado"}
                </p>
              </div>

              <p className="mt-2 border-t border-stone-200 pt-2 text-xs text-stone-600">
                <span className="font-semibold text-stone-700">Registrado por:</span>{" "}
                {prestamo.usuarioEntregaNombre || "No registrado"}
              </p>
            </button>

            <div className="flex flex-wrap equipos-center justify-end gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${estadoBadgeClass(prestamo.estado)}`}
              >
                {prestamo.estado}
              </span>
              <button
                type="button"
                onClick={() => onSelectPrestamo(prestamo)}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Ver detalle
              </button>
              <a
                href={reciboHref(prestamo.prestamoId)}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                Recibo
              </a>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => onOpenEdit(prestamo)}
                  disabled={editingPrestamoId === prestamo.prestamoId}
                  className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                >
                  {editingPrestamoId === prestamo.prestamoId ? "Guardando..." : "Editar"}
                </button>
              ) : null}
              {canWrite && showReturnAction && prestamo.estado === "PENDIENTE" ? (
                <button
                  type="button"
                  onClick={() => onOpenReturn(prestamo)}
                  disabled={returningPrestamoId === prestamo.prestamoId}
                  className="rounded bg-emerald-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {returningPrestamoId === prestamo.prestamoId ? "Guardando..." : "Devolver"}
                </button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
