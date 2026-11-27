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

    it("debería ejecutar onSaved al guardar y tolerar callbacks omitidos", async () => {
      const onSuccess = vi.fn();
      const onSaved = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await saveRegistroHandler(mockRegistroPayload, null, { onSuccess, onSaved });
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onSaved).toHaveBeenCalledOnce();

      await expect(saveRegistroHandler(mockRegistroPayload, "REG9", {})).resolves.toBeUndefined();
    });

    it("debería tolerar callbacks vacíos cuando hay equipos duplicados", async () => {
      const duplicatePayload = {
        ...mockRegistroPayload,
        equipos: [
          { equipoId: "ITEM1", cantidad: 1 },
          { equipoId: "ITEM1", cantidad: 2 },
        ],
      };

      await expect(saveRegistroHandler(duplicatePayload, null, {})).rejects.toThrow(
        "No puedes repetir equipos en un mismo movimiento."
      );
    });

    it("debería manejar errores de API con Error, con rechazo no-Error y sin onError", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Stock insuficiente"));

      await expect(saveRegistroHandler(mockRegistroPayload, null, { onError })).rejects.toThrow(
        "Stock insuficiente"
      );
      expect(onError).toHaveBeenCalledWith("Stock insuficiente");

      vi.mocked(api).mockRejectedValue("fallo inesperado");
      await expect(saveRegistroHandler(mockRegistroPayload, "REG1", { onError })).rejects.toBe(
        "fallo inesperado"
      );
      expect(onError).toHaveBeenCalledWith("No se pudo guardar el movimiento.");

      await expect(saveRegistroHandler(mockRegistroPayload, null, {})).rejects.toBe(
        "fallo inesperado"
      );
    });
  });

  describe("cobertura adicional de create, update y loadRegistrosHandler", () => {
    it("createRegistroHandler debería cubrir error no-Error y callbacks omitidos", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue("fallo");

      await expect(createRegistroHandler(mockRegistroPayload, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenCalledWith("No se pudo registrar el movimiento.");

      vi.mocked(api).mockResolvedValue({});
      await expect(createRegistroHandler(mockRegistroPayload, {})).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("error"));
      await expect(createRegistroHandler(mockRegistroPayload, {})).rejects.toThrow("error");
    });

    it("updateRegistroHandler debería cubrir errores Error, no-Error y callbacks omitidos", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Registro no encontrado"));

      await expect(updateRegistroHandler("REG1", mockRegistroPayload, { onError })).rejects.toThrow(
        "Registro no encontrado"
      );
      expect(onError).toHaveBeenCalledWith("Registro no encontrado");

      vi.mocked(api).mockRejectedValue(0);
      await expect(updateRegistroHandler("REG1", mockRegistroPayload, { onError })).rejects.toBe(0);
      expect(onError).toHaveBeenCalledWith("No se pudo actualizar el movimiento.");

      vi.mocked(api).mockResolvedValue({});
      await expect(updateRegistroHandler("REG1", mockRegistroPayload, {})).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("fallo"));
      await expect(updateRegistroHandler("REG1", mockRegistroPayload, {})).rejects.toThrow("fallo");
    });

    it("loadRegistrosHandler debería llamar onSuccess, codificar ci y usar mensaje por defecto", async () => {
      const onLoad = vi.fn();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue([]);

      await loadRegistrosHandler("123/45", { onLoad, onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/registros?ci=123%2F45&limit=200");
      expect(onLoad).toHaveBeenCalledWith([]);
      expect(onSuccess).toHaveBeenCalledOnce();

      vi.mocked(api).mockRejectedValue("desconexión");
      await expect(loadRegistrosHandler("123", { onLoad, onError })).rejects.toBe("desconexión");
      expect(onError).toHaveBeenCalledWith("No se pudo cargar los movimientos.");

      await expect(loadRegistrosHandler("123", { onLoad })).rejects.toBe("desconexión");
    });
  });
});
