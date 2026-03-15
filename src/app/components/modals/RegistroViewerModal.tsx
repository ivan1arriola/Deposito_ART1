"use client";

import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay } from "@/lib/date-helpers";
import { LoadingInline, PaginationControls } from "@/app/components/shared";
import type { Role } from "@/types/entities";
import type { RegistroView, RegistroViewerState } from "@/types/views";
import { ModalFrame } from "./ModalFrame";

type RegistroViewerModalProps = {
  viewer: RegistroViewerState | null;
  rows: RegistroView[];
  canWrite: boolean;
  canDelete: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  roleLabel: (role: Role | null | undefined) => string;
  onRectify: (registro: RegistroView) => void;
  onDelete: (registro: RegistroView) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onClose: () => void;
};

export function RegistroViewerModal({
  viewer,
  rows,
  canWrite,
  canDelete,
  page,
  pageSize,
  totalItems,
  roleLabel,
  onRectify,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onClose,
}: RegistroViewerModalProps) {
  if (!viewer) return null;

  return (
    <ModalFrame onClose={onClose} size="xl" closeOnBackdrop={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">Visualizador de Entregas / Devoluciones</h3>
          <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(viewer.ci)}`}</p>
          <p className="text-xs font-medium text-stone-700">{`Subalterno: ${viewer.nombre}`}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white">
          Cerrar
        </button>
      </div>

      <div className="mt-3 max-h-[60vh] space-y-2 overflow-auto pr-1">
        {viewer.loading ? (
          <LoadingInline
            label="Cargando movimientos..."
            textClassName="text-sm font-medium text-stone-600"
          />
        ) : null}
        {!viewer.loading && viewer.error ? (
          <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{viewer.error}</p>
        ) : null}
        {!viewer.loading && !viewer.error && totalItems === 0 ? (
          <p className="text-sm text-stone-600">No hay movimientos registrados para esta persona.</p>
        ) : null}
        {!viewer.loading && !viewer.error
          ? rows.map((registro) => (
              <div key={registro.registroId} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-stone-900">{formatDateOnlyForDisplay(registro.fecha)}</p>
                  <div className="flex items-center gap-2">
                    {canWrite && registro.tipo !== "AJUSTE" ? (
                      <button
                        type="button"
                        onClick={() => onRectify(registro)}
                        className="rounded bg-sky-700 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Rectificar
                      </button>
                    ) : null}
                    {canDelete && registro.tipo !== "AJUSTE" ? (
                      <button
                        type="button"
                        onClick={() => onDelete(registro)}
                        className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold text-white"
                      >
                        Eliminar
                      </button>
                    ) : null}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        registro.tipo === "ENTREGA"
                          ? "bg-emerald-100 text-emerald-800"
                          : registro.tipo === "DEVOLUCION"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      {registro.tipo}
                    </span>
                  </div>
                </div>
                {registro.auditoria ? (
                  <p className="mt-1 text-xs text-stone-700">
                    {`${registro.auditoria.accion === "UPDATE" ? "Rectificado por" : "Registrado por"}: ${
                      registro.auditoria.usuario?.username ?? "Sistema"
                    } (${roleLabel(registro.auditoria.usuario?.rol ?? null)}) - Auditoría BD #${registro.auditoria.auditoriaId}`}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-stone-500">Sin referencia de auditoría para este movimiento.</p>
                )}
                {registro.comentarios ? <p className="mt-1 text-xs text-stone-700">{registro.comentarios}</p> : null}
                <p className="mt-1 text-xs text-stone-600">Afecta stock: Si</p>
                <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {registro.items.map((item) => (
                    <p key={`${registro.registroId}-${item.itemId}`} className="text-xs text-stone-700">
                      <span className="font-semibold">{item.cantidad}x</span> {item.nombre}
                    </p>
                  ))}
                </div>
              </div>
            ))
          : null}
      </div>
      {!viewer.loading && !viewer.error && totalItems > 0 ? (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          itemLabel="movimientos"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          className="mt-3"
        />
      ) : null}
    </ModalFrame>
  );
}
