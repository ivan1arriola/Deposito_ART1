/**
 * Tests para handlers de operaciones de Registros (movimientos)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createRegistroHandler,
  updateRegistroHandler,
  loadRegistrosHandler,
  saveRegistroHandler,
} from "@/lib/handlers-registros";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("Handlers de Registros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRegistroPayload = {
    ci: "1234567890",
    tipo: "ENTREGA" as const,
    fecha: "2024-02-26",
    comentarios: "Entrega de equipamiento",
    equipos: [
      { equipoId: "ITEM1", cantidad: 1 },
      { equipoId: "ITEM2", cantidad: 2 },
    ],
  };

  describe("createRegistroHandler", () => {
    it("debería crear registro exitosamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ registroId: "REG123" });

      await createRegistroHandler(mockRegistroPayload, { onSuccess });

      expect(onSuccess).toHaveBeenCalled();
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/registros",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("debería manejar errores de validación de equipos", async () => {
      const onError = vi.fn();
      const invalidPayload = { ...mockRegistroPayload, equipos: [] };
      vi.mocked(api).mockRejectedValue(new Error("Equipos requeridos"));

      try {
        await createRegistroHandler(invalidPayload, { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("updateRegistroHandler", () => {
    it("debería actualizar registro correctamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updateRegistroHandler("REG123", mockRegistroPayload, { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/registros/REG123",
        expect.objectContaining({ method: "PUT" })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("loadRegistrosHandler", () => {
    it("debería cargar registros y llamar onLoad", async () => {
      const onLoad = vi.fn();
      const mockRegistros = [
        {
          registroId: "REG1",
          ci: "1234567890",
          tipo: "ENTREGA" as const,
          fecha: "2024-02-20",
          comentarios: null,
          equipos: [],
        },
      ];
      vi.mocked(api).mockResolvedValue(mockRegistros);

      await loadRegistrosHandler("1234567890", { onLoad });

      expect(onLoad).toHaveBeenCalledWith(mockRegistros);
    });

    it("debería manejar errores de carga", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("No se pudo conectar"));

      try {
        await loadRegistrosHandler("1234567890", { onError, onLoad: vi.fn() });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("saveRegistroHandler", () => {
    it("debería validar equipos duplicados", async () => {
      const onError = vi.fn();
      const duplicatePayload = {
        ...mockRegistroPayload,
        equipos: [
          { equipoId: "ITEM1", cantidad: 1 },
          { equipoId: "ITEM1", cantidad: 1 }, // Duplicado
        ],
      };

      try {
        await saveRegistroHandler(duplicatePayload, null, { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalledWith(
        "No puedes repetir equipos en un mismo movimiento."
      );
    });

    it("debería distinguir entre creación y actualización", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      // Creación (sin registroId)
      await saveRegistroHandler(mockRegistroPayload, null, { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/registros",
        expect.objectContaining({ method: "POST" })
      );

      vi.clearAllMocks();
      vi.mocked(api).mockResolvedValue({});

      // Actualización (con registroId)
      await saveRegistroHandler(mockRegistroPayload, "REG123", { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/registros/REG123",
        expect.objectContaining({ method: "PUT" })
      );
    });
  });
});
