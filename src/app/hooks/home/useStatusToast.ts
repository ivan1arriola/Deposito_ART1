import { useEffect, useRef } from "react";
import { toast } from "@/app/components/shared";

type UseStatusToastOptions = {
  status: string;
  enabled: boolean;
  ignoredStatuses: readonly string[];
};

function looksLikeErrorStatus(status: string) {
  const normalized = status.toLowerCase();

  return (
    normalized.includes("no se pudo") ||
    normalized.includes("error") ||
    normalized.includes("inval") ||
    normalized.includes("no tienes permisos") ||
    normalized.includes("solo el administrador") ||
    normalized.includes("no autorizado") ||
    normalized.includes("debes ") ||
    normalized.includes("repetida") ||
    normalized.includes("repetido") ||
    normalized.includes("obligatorio") ||
    normalized.includes("no existe") ||
    normalized.includes("falta")
  );
}

export function useStatusToast({ status, enabled, ignoredStatuses }: UseStatusToastOptions) {
  const lastToastStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastToastStatusRef.current = null;
      return;
    }

    if (!status || status === lastToastStatusRef.current) return;

    lastToastStatusRef.current = status;

    const normalized = status.toLowerCase();
    const shouldIgnore =
      ignoredStatuses.includes(status) ||
      normalized.startsWith("actualizando ") ||
      normalized.startsWith("guardando ") ||
      normalized.endsWith("...");

    if (shouldIgnore) return;

    if (looksLikeErrorStatus(status)) {
      toast.error(status);
      return;
    }

    toast.success(status);
  }, [enabled, ignoredStatuses, status]);
}
