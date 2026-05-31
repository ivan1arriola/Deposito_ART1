import { useCallback, useState } from "react";
import type { PapeleraRecord } from "@/app/types/home";

type UsePapeleraOptions = {
  onStatusChange: (message: string) => void;
  onDataChanged: () => void | Promise<void>;
};

export function usePapelera({ onStatusChange, onDataChanged }: UsePapeleraOptions) {
  const [records, setRecords] = useState<PapeleraRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/papelera");

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        onStatusChange(data?.error || "No se pudo cargar la papelera.");
        return;
      }

      const data = (await response.json()) as PapeleraRecord[];
      setRecords(data);
    } catch {
      onStatusChange("Error de red al cargar la papelera.");
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  const restore = useCallback(
    async (papeleraId: string) => {
      try {
        const response = await fetch(`/api/papelera/${papeleraId}/restore`, {
          method: "POST",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          onStatusChange(data?.error || "No se pudo restaurar.");
          return;
        }

        onStatusChange("Restaurado con éxito.");
        await load();
        await onDataChanged();
      } catch {
        onStatusChange("Error de red al restaurar.");
      }
    },
    [load, onDataChanged, onStatusChange],
  );

  const removePermanent = useCallback(
    async (papeleraId: string) => {
      try {
        const response = await fetch(`/api/papelera/${papeleraId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          onStatusChange(data?.error || "No se pudo eliminar permanentemente.");
          return;
        }

        onStatusChange("Eliminado permanentemente.");
        await load();
      } catch {
        onStatusChange("Error de red al eliminar permanentemente.");
      }
    },
    [load, onStatusChange],
  );

  return {
    records,
    loading,
    load,
    restore,
    removePermanent,
  };
}
