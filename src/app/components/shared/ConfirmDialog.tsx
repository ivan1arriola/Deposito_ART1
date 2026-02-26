"use client";

/**
 * Diálogo de confirmación reutilizable
 */
export function ConfirmDialog(props: {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 max-w-sm rounded-lg bg-white shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">{props.title}</h2>
        </div>

        {props.description && (
          <div className="px-6 py-3">
            <p className="text-sm text-gray-600">{props.description}</p>
          </div>
        )}

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={props.onCancel}
            disabled={props.isLoading}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {props.cancelText || "Cancelar"}
          </button>
          <button
            onClick={props.onConfirm}
            disabled={props.isLoading}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
              props.isDangerous
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {props.isLoading ? "Procesando..." : props.confirmText || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
