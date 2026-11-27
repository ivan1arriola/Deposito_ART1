import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createRangoHandler,
  updateRangoHandler,
  deleteRangoHandler,
  createBateriaHandler,
  updateBateriaHandler,
  deleteBateriaHandler,
  createArticuloHandler,
  updateArticuloHandler,
  deleteArticuloHandler,
  createEquipoHandler,
  deleteEquipoHandler,
  loadEquipoDeleteImpactHandler,
  createEquipoTipoHandler,
  deleteEquipoTipoHandler,
  ingresarStockArticuloHandler,
  updateEquipoHandler,
  updateEquipoTipoHandler,
  mergeEquipoHandler,
  updateMultipleEquipoOrdersHandler,
  entregarArticulosPersonalHandler,
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

describe("Handlers de Catálogos - Cobertura completa y errores por defecto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rangos - errores adicionales", () => {
    it("debería usar mensajes por defecto ante rechazos no-Error en rangos", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createRangoHandler("Cbo.", "Cabo", undefined, { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenCalledWith("No se pudo crear el grado.");

      await expect(updateRangoHandler(1, "Cbo.", "Cabo", undefined, { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenCalledWith("No se pudo actualizar el grado.");

      await expect(deleteRangoHandler(1, { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenCalledWith("No se pudo eliminar el grado.");

      vi.mocked(api).mockRejectedValue(new Error("En uso"));
      await expect(deleteRangoHandler(1, { onSuccess, onError })).rejects.toThrow("En uso");
      expect(onError).toHaveBeenCalledWith("En uso");
    });
  });

  describe("Baterías", () => {
    it("debería crear, actualizar y eliminar baterías con éxito", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await createBateriaHandler("1ra Batería", 1, { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/baterias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "1ra Batería", orden: 1 }),
      });

      await updateBateriaHandler(5, "2da Batería", 2, { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/baterias/5", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "2da Batería", orden: 2 }),
      });

      await deleteBateriaHandler(5, { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/baterias/5", { method: "DELETE" });

      expect(onSuccess).toHaveBeenCalledTimes(3);
      expect(onError).not.toHaveBeenCalled();
    });

    it("debería propagar Error y usar mensajes por defecto en baterías", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("Duplicada"));
      await expect(createBateriaHandler("1ra", undefined, { onSuccess, onError })).rejects.toThrow(
        "Duplicada",
      );
      await expect(updateBateriaHandler(1, "1ra", undefined, { onSuccess, onError })).rejects.toThrow(
        "Duplicada",
      );
      await expect(deleteBateriaHandler(1, { onSuccess, onError })).rejects.toThrow("Duplicada");
      expect(onError).toHaveBeenCalledTimes(3);
      expect(onError).toHaveBeenNthCalledWith(1, "Duplicada");

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createBateriaHandler("1ra", undefined, { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear la batería.");

      await expect(updateBateriaHandler(1, "1ra", undefined, { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar la batería.");

      await expect(deleteBateriaHandler(1, { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar la batería.");
    });
  });

  describe("Tipos de equipo - errores", () => {
    it("debería manejar Error y rechazos no-Error en tipos de equipo", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("Error tipo"));
      await expect(createEquipoTipoHandler("T", 1, { onSuccess, onError })).rejects.toThrow(
        "Error tipo",
      );
      await expect(updateEquipoTipoHandler(1, "T", 1, { onSuccess, onError })).rejects.toThrow(
        "Error tipo",
      );
      await expect(deleteEquipoTipoHandler(1, { onSuccess, onError })).rejects.toThrow("Error tipo");

      vi.mocked(api).mockRejectedValue(null);
      await expect(createEquipoTipoHandler("T", undefined, { onSuccess, onError })).rejects.toBeNull();
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el tipo de equipo.");

      await expect(updateEquipoTipoHandler(1, "T", undefined, { onSuccess, onError })).rejects.toBeNull();
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el tipo de equipo.");

      await expect(deleteEquipoTipoHandler(1, { onSuccess, onError })).rejects.toBeNull();
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar el tipo de equipo.");
    });
  });

  describe("Artículos", () => {
    it("debería crear, actualizar y eliminar artículos con éxito", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await createArticuloHandler("Guantes", "CONSUMIBLE", { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/articulos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "Guantes", tipo: "CONSUMIBLE" }),
      });

      await updateArticuloHandler(3, "Guantes térmicos", "CONSUMIBLE", { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/articulos/3", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: "Guantes térmicos", tipo: "CONSUMIBLE" }),
      });

      await deleteArticuloHandler(3, { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/articulos/3", { method: "DELETE" });

      expect(onSuccess).toHaveBeenCalledTimes(3);
    });

    it("debería manejar Error y mensajes por defecto en artículos e ingresos", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("Error artículo"));
      await expect(createArticuloHandler("X", "CONSUMIBLE", { onSuccess, onError })).rejects.toThrow(
        "Error artículo",
      );
      await expect(updateArticuloHandler(1, "X", "CONSUMIBLE", { onSuccess, onError })).rejects.toThrow(
        "Error artículo",
      );
      await expect(deleteArticuloHandler(1, { onSuccess, onError })).rejects.toThrow(
        "Error artículo",
      );

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createArticuloHandler("X", "CONSUMIBLE", { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el artículo.");

      await expect(updateArticuloHandler(1, "X", "CONSUMIBLE", { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el artículo.");

      await expect(deleteArticuloHandler(1, { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar el artículo.");

      await expect(
        ingresarStockArticuloHandler(1, 5, undefined, { onSuccess, onError }),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith(
        "No se pudo registrar el ingreso de stock del artículo.",
      );
    });

    it("debería registrar entrega de artículos a personal y manejar errores", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const respuesta = { ok: true, entregaId: 10 };
      vi.mocked(api).mockResolvedValue(respuesta);

      const result = await entregarArticulosPersonalHandler(
        "12345678",
        "87654321",
        "2026-05-20",
        "Entrega anual",
        [{ articuloId: 7, cantidad: 2 }],
        { onSuccess, onError },
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/articulos/entregas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalCi: "12345678",
          ordenanteCi: "87654321",
          fecha: "2026-05-20",
          comentario: "Entrega anual",
          equipos: [{ articuloId: 7, cantidad: 2 }],
        }),
      });
      expect(onSuccess).toHaveBeenCalledWith(respuesta);
      expect(result).toEqual(respuesta);

      vi.mocked(api).mockRejectedValue(new Error("Sin stock"));
      await expect(
        entregarArticulosPersonalHandler(
          "12345678",
          "87654321",
          "2026-05-20",
          undefined,
          [{ articuloId: 7, cantidad: 2 }],
          { onSuccess, onError },
        ),
      ).rejects.toThrow("Sin stock");
      expect(onError).toHaveBeenLastCalledWith("Sin stock");

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(
        entregarArticulosPersonalHandler(
          "12345678",
          "87654321",
          "2026-05-20",
          undefined,
          [{ articuloId: 7, cantidad: 2 }],
          { onSuccess, onError },
        ),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith(
        "No se pudo registrar la entrega de artículos a personal.",
      );
    });
  });

  describe("Equipos - operaciones faltantes y errores", () => {
    it("debería eliminar un equipo y consultar el impacto de borrado", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const impacto = {
        equipo: { equipoId: "EQ1", nombre: "Casco" },
        resumen: {
          totalMovimientos: 1,
          totalRegistros: 1,
          totalStock: 0,
          movimientosQueSeEliminan: 0,
          movimientosQueSeActualizan: 1,
          totalCodigosSIE: 0,
          totalCodigosSIEEnCajas: 0,
          totalAparicionesEquipoEnCajas: 0,
          totalCajasAfectadas: 0,
          cajasQueQuedanSinEquipos: 0,
        },
        codigosSIE: [],
        cajas: [],
        registros: [],
        stock: [],
      };

      vi.mocked(api).mockResolvedValueOnce(impacto);
      const loaded = await loadEquipoDeleteImpactHandler("EQ1", { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/equipos/EQ1", { method: "GET" });
      expect(onSuccess).toHaveBeenCalledWith(impacto);
      expect(loaded).toEqual(impacto);

      vi.mocked(api).mockResolvedValueOnce({});
      await deleteEquipoHandler("EQ1", { onSuccess, onError });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/equipos/EQ1", { method: "DELETE" });
      expect(onSuccess).toHaveBeenCalledTimes(2);
    });

    it("debería actualizar orden múltiple de equipos con activo=false", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updateMultipleEquipoOrdersHandler(["1", "2"], { onSuccess, onError }, false);
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/equipos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds: ["1", "2"], activo: false }),
      });
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("debería manejar Error y rechazos no-Error en todos los handlers de equipos", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("Error equipo"));
      await expect(createEquipoHandler("Eq", "GENERAL", true, { onSuccess, onError })).rejects.toThrow(
        "Error equipo",
      );
      await expect(
        updateEquipoHandler("1", "Eq", "GENERAL", true, 1, { onSuccess, onError }),
      ).rejects.toThrow("Error equipo");
      await expect(deleteEquipoHandler("1", { onSuccess, onError })).rejects.toThrow("Error equipo");
      await expect(mergeEquipoHandler("1", "2", { onSuccess, onError })).rejects.toThrow(
        "Error equipo",
      );
      await expect(loadEquipoDeleteImpactHandler("1", { onSuccess, onError })).rejects.toThrow(
        "Error equipo",
      );
      await expect(updateMultipleEquipoOrdersHandler(["1"], { onSuccess, onError })).rejects.toThrow(
        "Error equipo",
      );

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createEquipoHandler("Eq", "GENERAL", true, { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el equipo.");

      await expect(
        updateEquipoHandler("1", "Eq", "GENERAL", true, 1, { onSuccess, onError }),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el equipo.");

      await expect(deleteEquipoHandler("1", { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar el equipo.");

      await expect(mergeEquipoHandler("1", "2", { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo unificar el equipo.");

      await expect(loadEquipoDeleteImpactHandler("1", { onSuccess, onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith(
        "No se pudo calcular el impacto de borrado del equipo.",
      );

      await expect(updateMultipleEquipoOrdersHandler(["1"], { onSuccess, onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el orden de PDF.");
    });
  });
});
