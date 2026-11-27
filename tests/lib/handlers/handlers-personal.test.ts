/**
 * Tests para handlers de operaciones de Personal
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createPersonalHandler,
  updatePersonalHandler,
  deletePersonalHandler,
  promoteSargentoToSuboficialHandler,
  createOficialSuboficialHandler,
  updateOficialSuboficialHandler,
  createPersonalObservacionHandler,
  loadPersonalObservacionesHandler,
  updatePersonalObservacionHandler,
  deletePersonalObservacionHandler,
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

  describe("promoteSargentoToSuboficialHandler", () => {
    it("deberia solicitar ascenso de sargento a suboficial con password", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ ok: true, prestamoGenerado: { reciboNumero: "PR-00000001" } });

      await promoteSargentoToSuboficialHandler(mockPersonalPayload.ci, "ClaveAdmin123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        `/api/personal/${mockPersonalPayload.ci}/ascenso-sargento-primero`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ adminPassword: "ClaveAdmin123" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería manejar Error, rechazo no-Error y callbacks omitidos en ascenso", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Contraseña inválida"));

      await expect(
        promoteSargentoToSuboficialHandler(mockPersonalPayload.ci, "mal", { onError }),
      ).rejects.toThrow("Contraseña inválida");
      expect(onError).toHaveBeenCalledWith("Contraseña inválida");

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(
        promoteSargentoToSuboficialHandler(mockPersonalPayload.ci, "mal", { onError }),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenCalledWith("No se pudo completar el ascenso.");

      vi.mocked(api).mockResolvedValue({ ok: true });
      await expect(
        promoteSargentoToSuboficialHandler(mockPersonalPayload.ci, "ok", {}),
      ).resolves.toEqual({ ok: true });

      vi.mocked(api).mockRejectedValue(new Error("err"));
      await expect(
        promoteSargentoToSuboficialHandler(mockPersonalPayload.ci, "ok", {}),
      ).rejects.toThrow("err");
    });
  });

  describe("errores por defecto y callbacks opcionales en personal base", () => {
    it("debería cubrir errores no-Error y callbacks vacíos en crear, actualizar y eliminar", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue("fallo");

      await expect(createPersonalHandler(mockPersonalPayload, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el personal.");

      await expect(updatePersonalHandler("123/4", mockPersonalPayload, { onError })).rejects.toBe(
        "fallo",
      );
      expect(vi.mocked(api)).toHaveBeenLastCalledWith(
        "/api/personal/123%2F4",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el personal.");

      await expect(deletePersonalHandler("123", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar el personal.");

      vi.mocked(api).mockRejectedValue(new Error("Error al actualizar"));
      await expect(updatePersonalHandler("123", mockPersonalPayload, { onError })).rejects.toThrow(
        "Error al actualizar",
      );
      expect(onError).toHaveBeenLastCalledWith("Error al actualizar");

      vi.mocked(api).mockResolvedValue({});
      await expect(createPersonalHandler(mockPersonalPayload, {})).resolves.toBeUndefined();
      await expect(updatePersonalHandler("123", mockPersonalPayload, {})).resolves.toBeUndefined();
      await expect(deletePersonalHandler("123", {})).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("sin callback"));
      await expect(createPersonalHandler(mockPersonalPayload, {})).rejects.toThrow("sin callback");
      await expect(updatePersonalHandler("123", mockPersonalPayload, {})).rejects.toThrow(
        "sin callback",
      );
      await expect(deletePersonalHandler("123", {})).rejects.toThrow("sin callback");
    });
  });

  describe("createOficialSuboficialHandler y updateOficialSuboficialHandler", () => {
    it("debería crear y actualizar oficiales/suboficiales con éxito", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await createOficialSuboficialHandler(mockPersonalPayload, { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/oficiales-suboficiales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPersonalPayload),
      });

      await updateOficialSuboficialHandler("123 45", mockPersonalPayload, { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/oficiales-suboficiales/123%2045", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPersonalPayload),
      });
      expect(onSuccess).toHaveBeenCalledTimes(2);
    });

    it("debería manejar Error, rechazo no-Error y callbacks omitidos", async () => {
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("CI duplicada"));
      await expect(createOficialSuboficialHandler({}, { onError })).rejects.toThrow("CI duplicada");
      expect(onError).toHaveBeenLastCalledWith("CI duplicada");
      await expect(updateOficialSuboficialHandler("1", {}, { onError })).rejects.toThrow(
        "CI duplicada",
      );
      expect(onError).toHaveBeenLastCalledWith("CI duplicada");

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createOficialSuboficialHandler({}, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el personal oficial/suboficial.");
      await expect(updateOficialSuboficialHandler("1", {}, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith(
        "No se pudo actualizar el personal oficial/suboficial.",
      );

      vi.mocked(api).mockResolvedValue({});
      await expect(createOficialSuboficialHandler({}, {})).resolves.toBeUndefined();
      await expect(updateOficialSuboficialHandler("1", {}, {})).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("err"));
      await expect(createOficialSuboficialHandler({}, {})).rejects.toThrow("err");
      await expect(updateOficialSuboficialHandler("1", {}, {})).rejects.toThrow("err");
    });
  });

  describe("Observaciones de Personal", () => {
    it("debería crear, cargar, actualizar y eliminar observaciones con éxito", async () => {
      const onSuccess = vi.fn();
      const obs = { observacionId: "OBS1", detalle: "Sin novedades" };

      vi.mocked(api).mockResolvedValueOnce(obs);
      await createPersonalObservacionHandler("123/4", { detalle: "Sin novedades" }, { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/personal/123%2F4/observaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detalle: "Sin novedades" }),
      });
      expect(onSuccess).toHaveBeenCalledWith(obs);

      vi.mocked(api).mockResolvedValueOnce([obs]);
      const loaded = await loadPersonalObservacionesHandler("123/4", { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/personal/123%2F4/observaciones");
      expect(loaded).toEqual([obs]);
      expect(onSuccess).toHaveBeenCalledWith([obs]);

      const updatedObs = { observacionId: "OBS1", detalle: "Actualizada" };
      vi.mocked(api).mockResolvedValueOnce(updatedObs);
      const updated = await updatePersonalObservacionHandler(
        "123/4",
        "OBS/1",
        { detalle: "Actualizada" },
        { onSuccess },
      );
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/personal/123%2F4/observaciones/OBS%2F1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detalle: "Actualizada" }),
      });
      expect(updated).toEqual(updatedObs);
      expect(onSuccess).toHaveBeenCalledWith(updatedObs);

      vi.mocked(api).mockResolvedValueOnce({ ok: true });
      const deleted = await deletePersonalObservacionHandler("123/4", "OBS/1", { onSuccess });
      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/personal/123%2F4/observaciones/OBS%2F1", {
        method: "DELETE",
      });
      expect(deleted).toEqual({ ok: true });
      expect(onSuccess).toHaveBeenCalledWith({ ok: true });
    });

    it("debería manejar Error, rechazo no-Error y callbacks omitidos en observaciones", async () => {
      const onError = vi.fn();

      vi.mocked(api).mockRejectedValue(new Error("Observación inválida"));
      await expect(createPersonalObservacionHandler("1", {}, { onError })).rejects.toThrow(
        "Observación inválida",
      );
      await expect(loadPersonalObservacionesHandler("1", { onError })).rejects.toThrow(
        "Observación inválida",
      );
      await expect(updatePersonalObservacionHandler("1", "2", {}, { onError })).rejects.toThrow(
        "Observación inválida",
      );
      await expect(deletePersonalObservacionHandler("1", "2", { onError })).rejects.toThrow(
        "Observación inválida",
      );

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(createPersonalObservacionHandler("1", {}, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo registrar la observación.");

      await expect(loadPersonalObservacionesHandler("1", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudieron cargar las observaciones.");

      await expect(updatePersonalObservacionHandler("1", "2", {}, { onError })).rejects.toBe(
        "fallo",
      );
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar la observación.");

      await expect(deletePersonalObservacionHandler("1", "2", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar la observación.");

      vi.mocked(api).mockResolvedValue({});
      await expect(createPersonalObservacionHandler("1", {}, {})).resolves.toBeUndefined();
      await expect(loadPersonalObservacionesHandler("1", {})).resolves.toEqual({});
      await expect(updatePersonalObservacionHandler("1", "2", {}, {})).resolves.toEqual({});
      await expect(deletePersonalObservacionHandler("1", "2", {})).resolves.toEqual({});

      vi.mocked(api).mockRejectedValue(new Error("sin callback"));
      await expect(createPersonalObservacionHandler("1", {}, {})).rejects.toThrow("sin callback");
      await expect(loadPersonalObservacionesHandler("1", {})).rejects.toThrow("sin callback");
      await expect(updatePersonalObservacionHandler("1", "2", {}, {})).rejects.toThrow(
        "sin callback",
      );
      await expect(deletePersonalObservacionHandler("1", "2", {})).rejects.toThrow("sin callback");
    });
  });
});
