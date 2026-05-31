import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createRangoHandler,
  updateRangoHandler,
  deleteRangoHandler,
  createEquipoHandler,
  createEquipoTipoHandler,
  deleteEquipoTipoHandler,
  ingresarStockArticuloHandler,
  updateEquipoHandler,
  updateEquipoTipoHandler,
  mergeEquipoHandler,
  updateMultipleEquipoOrdersHandler,
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

  it("deberia crear un tipo de equipo y propagar la respuesta al callback", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const response = [{ clave: "FRI", nombre: "F.R.I", orden: 1, esGeneral: false }];
    vi.mocked(api).mockResolvedValue(response);

    await createEquipoTipoHandler("F.R.I", 1, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos/tipos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ nombre: "F.R.I", orden: 1 }),
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
    expect(onError).not.toHaveBeenCalled();
  });

  it("deberia actualizar un tipo de equipo con nombre y orden", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({ tipoEquipoId: 4, nombre: "Asalto", orden: 2 });

    await updateEquipoTipoHandler(4, "Asalto", 2, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos/tipos/4",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ nombre: "Asalto", orden: 2 }),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
  });

  it("deberia informar cuantos equipos pasan a General al borrar un tipo", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const response = { ok: true, tipoEquipoId: 4, equiposReasignadosAGeneral: 3 };
    vi.mocked(api).mockResolvedValue(response);

    await deleteEquipoTipoHandler(4, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos/tipos/4",
      expect.objectContaining({
        method: "DELETE",
      }),
    );
    expect(onSuccess).toHaveBeenCalledWith(response);
    expect(onError).not.toHaveBeenCalled();
  });

  it("deberia enviar el estado de aparicion en hoja al crear un equipo", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await createEquipoHandler("Parka Pixelada", "GENERAL", true, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          nombre: "Parka Pixelada",
          tipo: "GENERAL",
          activo: true,
        }),
      }),
    );
  });

  it("deberia permitir actualizar un equipo con el orden y visibilidad en hoja", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await updateEquipoHandler("12", "Parka Pixelada", "FRI", true, 4, { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos/12",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ nombre: "Parka Pixelada", tipo: "FRI", activo: true, ordenPdf: 4 }),
      }),
    );
  });

  it("deberia guardar el orden visible de hoja en una sola llamada", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await updateMultipleEquipoOrdersHandler(["12", "18", "25"], { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ orderedItemIds: ["12", "18", "25"], activo: true }),
      }),
    );
  });

  it("deberia unificar un equipo enviando el destino seleccionado", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await mergeEquipoHandler("12", "18", { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/equipos/12",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetEquipoId: "18" }),
      }),
    );
  });
});

describe("Handlers de Catalogos - Articulos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deberia registrar un ingreso de stock de articulo con payload completo", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockResolvedValue({});

    await ingresarStockArticuloHandler(7, 12, "Compra mensual", { onSuccess, onError });

    expect(vi.mocked(api)).toHaveBeenCalledWith(
      "/api/articulos/ingresos",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articuloId: 7,
          cantidad: 12,
          comentarios: "Compra mensual",
        }),
      }),
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("deberia propagar el mensaje de error del ingreso de stock", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    vi.mocked(api).mockRejectedValue(new Error("Artículo no encontrado"));

    await expect(
      ingresarStockArticuloHandler(404, 2, undefined, { onSuccess, onError }),
    ).rejects.toThrow("Artículo no encontrado");

    expect(onError).toHaveBeenCalledWith("Artículo no encontrado");
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
