/**
 * Tests para handlers de operaciones de Personal
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createPersonalHandler,
  updatePersonalHandler,
  deletePersonalHandler,
} from "@/lib/handlers-personal";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("Handlers de Personal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPersonalPayload = {
    ci: "1234567890",
    apellido1: "Pérez",
    apellido2: "García",
    nombre1: "Juan",
    nombre2: "Carlos",
    telefonoContacto: "099123456",
    esReingreso: false,
    fechaIngreso: "2023-01-15",
    fechaIngresoOriginal: "",
    rangoId: "1",
    bateriaId: "1",
    tCabeza: "M",
    tRemera: "L",
    tPantalon: "L",
    tZapatos: "42",
    tCasaca: "L",
  };

  describe("createPersonalHandler", () => {
    it("debería crear personal exitosamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ ci: mockPersonalPayload.ci });

      await createPersonalHandler(mockPersonalPayload, { onSuccess });

      expect(onSuccess).toHaveBeenCalled();
      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/personal",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("debería manejar errores de validación", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("CI inválido"));

      try {
        await createPersonalHandler(mockPersonalPayload, { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalledWith("CI inválido");
    });
  });

  describe("updatePersonalHandler", () => {
    it("debería actualizar personal correctamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updatePersonalHandler(mockPersonalPayload.ci, mockPersonalPayload, {
        onSuccess,
      });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        `/api/personal/${mockPersonalPayload.ci}`,
        expect.objectContaining({ method: "PUT" })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("deletePersonalHandler", () => {
    it("debería eliminar personal correctamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await deletePersonalHandler(mockPersonalPayload.ci, { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        `/api/personal/${mockPersonalPayload.ci}`,
        expect.objectContaining({ method: "DELETE" })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería reportar error si no encuentra el personal", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Personal no encontrado"));

      try {
        await deletePersonalHandler("9999999999", { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });
});
