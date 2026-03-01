/**
 * Tests para handlers de catálogos (Rango, Bateria, Item)
 * 
 * Estos tests demuestran cómo validar: 
 * - Manejo de errores
 * - Llamadas correctas a API
 * - Callbacks ejecutados apropiadamente
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createRangoHandler,
  updateRangoHandler,
  deleteRangoHandler,
  createItemHandler,
  updateItemHandler,
} from "@/lib/handlers-catalog";

// Mock del módulo de API
vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

declare const api: any;
describe("Handlers de Catálogos - Rangos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRangoHandler", () => {
    it("debería llamar a onSuccess cuando la creación es exitosa", async () => {
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

    it("debería llamar a onError con mensaje cuando falla", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const errorMessage = "Error de conexión";
      vi.mocked(api).mockRejectedValue(new Error(errorMessage));

      try {
        await createRangoHandler("Ten.", "Teniente", 2, {
          onSuccess,
          onError,
        });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalledWith(errorMessage);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("debería hacer llamada POST a /api/rangos", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await createRangoHandler("Ten.", "Teniente", 2, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/rangos", expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }));
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/rangos", expect.objectContaining({
        body: JSON.stringify({ abreviacion: "Ten.", nombreCompleto: "Teniente", orden: 2 }),
      }));
    });
  });

  describe("updateRangoHandler", () => {
    it("debería hacer llamada PUT a /api/rangos/:id", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updateRangoHandler(1, "Ten.", "Teniente", 3, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/rangos/1", expect.objectContaining({
        method: "PUT",
      }));
    });

    it("debería manejar errores correctamente", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("No encontrado"));

      try {
        await updateRangoHandler(999, "Ten.", "Teniente", 3, { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalledWith("No encontrado");
    });
  });

  describe("deleteRangoHandler", () => {
    it("debería hacer llamada DELETE a /api/rangos/:id", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await deleteRangoHandler(1, { onSuccess, onError });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/rangos/1", expect.objectContaining({
        method: "DELETE",
      }));
    });
  });
});

describe("Handlers de Catálogos - Equipos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("debería enviar los códigos opcionales al crear un equipo", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await createItemHandler(
      "Parka Pixelada",
      true,
      [
        { codigo: "PK-001", aclaracion: "Deposito" },
        { codigo: "PK-002", aclaracion: "" },
      ],
      { onSuccess, onError },
    );

    expect(vi.mocked(api)).toHaveBeenCalledWith("/api/items", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        nombre: "Parka Pixelada",
        activo: true,
        codigos: [
          { codigo: "PK-001", aclaracion: "Deposito" },
          { codigo: "PK-002", aclaracion: "" },
        ],
      }),
    }));
  });

  it("debería permitir actualizar un equipo sin reenviar códigos", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await updateItemHandler("12", "Parka Pixelada", true, 4, undefined, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith("/api/items/12", expect.objectContaining({
      method: "PUT",
      body: JSON.stringify({ nombre: "Parka Pixelada", activo: true, ordenPdf: 4, codigos: undefined }),
    }));
  });
});
