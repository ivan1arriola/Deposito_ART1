import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createRangoHandler,
  updateRangoHandler,
  deleteRangoHandler,
  createItemHandler,
  updateItemHandler,
} from "@/lib/handlers-catalog";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("Handlers de Catalogos - Rangos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRangoHandler", () => {
    it("deberia llamar a onSuccess cuando la creacion es exitosa", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({ rangoId: 1 });

      await createRangoHandler("Ten.", "Teniente", 2, {
        onSuccess,
        onError,
      });

      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });

    it("deberia llamar a onError con mensaje cuando falla", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Error de conexion"));

      try {
        await createRangoHandler("Ten.", "Teniente", 2, {
          onSuccess,
          onError,
        });
      } catch {
        // Error esperado.
      }

      expect(onError).toHaveBeenCalledWith("Error de conexion");
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("deberia hacer llamada POST a /api/rangos", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await createRangoHandler("Ten.", "Teniente", 2, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/rangos",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ abreviacion: "Ten.", nombreCompleto: "Teniente", orden: 2 }),
        }),
      );
    });
  });

  describe("updateRangoHandler", () => {
    it("deberia hacer llamada PUT a /api/rangos/:id", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updateRangoHandler(1, "Ten.", "Teniente", 3, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/rangos/1",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });

    it("deberia manejar errores correctamente", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("No encontrado"));

      try {
        await updateRangoHandler(999, "Ten.", "Teniente", 3, { onError, onSuccess: vi.fn() });
      } catch {
        // Error esperado.
      }

      expect(onError).toHaveBeenCalledWith("No encontrado");
    });
  });

  describe("deleteRangoHandler", () => {
    it("deberia hacer llamada DELETE a /api/rangos/:id", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await deleteRangoHandler(1, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/rangos/1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });
});

describe("Handlers de Catalogos - Equipos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deberia enviar el estado de aparicion en hoja al crear un equipo", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await createItemHandler("Parka Pixelada", true, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/items",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          nombre: "Parka Pixelada",
          activo: true,
        }),
      }),
    );
  });

  it("deberia permitir actualizar un equipo con el orden y visibilidad en hoja", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await updateItemHandler("12", "Parka Pixelada", true, 4, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/items/12",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ nombre: "Parka Pixelada", activo: true, ordenPdf: 4 }),
      }),
    );
  });
});
