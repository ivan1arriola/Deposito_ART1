/**
 * Tests para handlers de usuarios y autenticación
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createUsuarioHandler,
  updateUsuarioProfileHandler,
  changeUserRoleHandler,
  changeUserPasswordHandler,
  toggleUserActiveHandler,
  confirmUserEmailHandler,
  deleteUsuarioHandler,
  saveFirmaConfigHandler,
} from "@/lib/handlers-usuarios";

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("Handlers de Usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUsuarioHandler", () => {
    it("deberia crear usuario con perfil completo", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ usuarioId: "USR123" });

      await createUsuarioHandler(
        {
          rangoId: 1,
          nombre: "Juan",
          apellido: "Perez",
          usuario: "jperez",
          password: "password123",
          mailReferencia: "jperez@referencia.local",
          rol: "EDITOR",
        },
        { onSuccess },
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            rangoId: 1,
            nombre: "Juan",
            apellido: "Perez",
            usuario: "jperez",
            password: "password123",
            mailReferencia: "jperez@referencia.local",
            rol: "EDITOR",
            activo: true,
          }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("updateUsuarioProfileHandler", () => {
    it("deberia actualizar datos base del usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await updateUsuarioProfileHandler(
        "USR123",
        {
          rangoId: 2,
          nombre: "Mario",
          apellido: "Gomez",
          usuario: "mgomez",
          mailReferencia: "",
        },
        { onSuccess },
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            rangoId: 2,
            nombre: "Mario",
            apellido: "Gomez",
            usuario: "mgomez",
            mailReferencia: "",
          }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("changeUserRoleHandler", () => {
    it("deberia cambiar rol de usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await changeUserRoleHandler("USR123", "READ_ONLY", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ rol: "READ_ONLY" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("changeUserPasswordHandler", () => {
    it("deberia cambiar la contraseña de otro usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await changeUserPasswordHandler("USR123", "NuevaClave123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ password: "NuevaClave123" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("toggleUserActiveHandler", () => {
    it("deberia cambiar estado activo/inactivo", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await toggleUserActiveHandler("USR123", false, { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: false }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("deleteUsuarioHandler", () => {
    it("deberia eliminar usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await deleteUsuarioHandler("USR123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("saveFirmaConfigHandler", () => {
    it("deberia guardar configuración de firmas", async () => {
      const onSave = vi.fn();
      vi.mocked(api).mockResolvedValue({
        encargadoRango: "Teniente",
        encargadoNombre: "Juan Perez",
        oficialRango: "Mayor",
        oficialNombre: "Carlos Garcia",
        updatedAt: new Date().toISOString(),
      });

      await saveFirmaConfigHandler("Teniente", "Juan Perez", "Mayor", "Carlos Garcia", { onSave });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/firma-config",
        expect.objectContaining({ method: "PUT" }),
      );
      expect(onSave).toHaveBeenCalled();
    });

    it("debería llamar onSuccess además de onSave y manejar errores", async () => {
      const onSave = vi.fn();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const config = { encargadoRango: "Cap.", encargadoNombre: "Ana", oficialRango: "May.", oficialNombre: "Luis" };
      vi.mocked(api).mockResolvedValue(config);

      await saveFirmaConfigHandler("Cap.", "Ana", "May.", "Luis", { onSave, onSuccess });
      expect(onSave).toHaveBeenCalledWith(config);
      expect(onSuccess).toHaveBeenCalledOnce();

      vi.mocked(api).mockRejectedValue(new Error("Permiso denegado"));
      await expect(
        saveFirmaConfigHandler("Cap.", "Ana", "May.", "Luis", { onSave, onError }),
      ).rejects.toThrow("Permiso denegado");
      expect(onError).toHaveBeenCalledWith("Permiso denegado");

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(
        saveFirmaConfigHandler("Cap.", "Ana", "May.", "Luis", { onSave, onError }),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenCalledWith("No se pudo guardar la configuración.");

      await expect(
        saveFirmaConfigHandler("Cap.", "Ana", "May.", "Luis", { onSave }),
      ).rejects.toBe("fallo");
    });
  });

  describe("confirmUserEmailHandler", () => {
    it("debería confirmar el correo del usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await confirmUserEmailHandler("USR123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/usuarios/USR123", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmarMail: true }),
      });
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  describe("cobertura de ramas, errores y callbacks opcionales en usuarios", () => {
    it("debería usar rangoId null cuando se omite al crear usuario", async () => {
      vi.mocked(api).mockResolvedValue({});

      await createUsuarioHandler(
        {
          nombre: "Ana",
          apellido: "López",
          usuario: "alopez",
          password: "Password123",
          mailReferencia: "alopez@referencia.local",
          rol: "ADMIN",
        },
        {},
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangoId: null,
          nombre: "Ana",
          apellido: "López",
          usuario: "alopez",
          password: "Password123",
          mailReferencia: "alopez@referencia.local",
          rol: "ADMIN",
          activo: true,
        }),
      });
    });

    it("debería cubrir éxito sin callbacks en todos los handlers de usuarios", async () => {
      vi.mocked(api).mockResolvedValue({});

      await expect(
        updateUsuarioProfileHandler(
          "U1",
          { nombre: "A", apellido: "B", usuario: "ab", mailReferencia: "" },
          {},
        ),
      ).resolves.toBeUndefined();
      await expect(changeUserRoleHandler("U1", "EDITOR", {})).resolves.toBeUndefined();
      await expect(changeUserPasswordHandler("U1", "Clave1234", {})).resolves.toBeUndefined();
      await expect(toggleUserActiveHandler("U1", true, {})).resolves.toBeUndefined();
      await expect(confirmUserEmailHandler("U1", {})).resolves.toBeUndefined();
      await expect(deleteUsuarioHandler("U1", {})).resolves.toBeUndefined();
    });

    it("debería reportar Error, mensaje por defecto y tolerar ausencia de onError", async () => {
      const onError = vi.fn();
      const baseInput = {
        rangoId: null,
        nombre: "A",
        apellido: "B",
        usuario: "ab",
        mailReferencia: "",
      };

      vi.mocked(api).mockRejectedValue(new Error("Error específico"));
      await expect(
        createUsuarioHandler({ ...baseInput, password: "123", rol: "EDITOR" }, { onError }),
      ).rejects.toThrow("Error específico");
      await expect(updateUsuarioProfileHandler("U1", baseInput, { onError })).rejects.toThrow(
        "Error específico",
      );
      await expect(changeUserRoleHandler("U1", "ADMIN", { onError })).rejects.toThrow(
        "Error específico",
      );
      await expect(changeUserPasswordHandler("U1", "123", { onError })).rejects.toThrow(
        "Error específico",
      );
      await expect(toggleUserActiveHandler("U1", false, { onError })).rejects.toThrow(
        "Error específico",
      );
      await expect(confirmUserEmailHandler("U1", { onError })).rejects.toThrow("Error específico");
      await expect(deleteUsuarioHandler("U1", { onError })).rejects.toThrow("Error específico");
      expect(onError).toHaveBeenCalledTimes(7);

      vi.mocked(api).mockRejectedValue("fallo");
      await expect(
        createUsuarioHandler({ ...baseInput, password: "123", rol: "EDITOR" }, { onError }),
      ).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo crear el usuario.");

      await expect(updateUsuarioProfileHandler("U1", baseInput, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el usuario.");

      await expect(changeUserRoleHandler("U1", "ADMIN", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el rol.");

      await expect(changeUserPasswordHandler("U1", "123", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar la contraseña.");

      await expect(toggleUserActiveHandler("U1", false, { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo actualizar el estado.");

      await expect(confirmUserEmailHandler("U1", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo confirmar el correo.");

      await expect(deleteUsuarioHandler("U1", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenLastCalledWith("No se pudo eliminar el usuario.");

      await expect(
        createUsuarioHandler({ ...baseInput, password: "123", rol: "EDITOR" }, {}),
      ).rejects.toBe("fallo");
      await expect(updateUsuarioProfileHandler("U1", baseInput, {})).rejects.toBe("fallo");
      await expect(changeUserRoleHandler("U1", "ADMIN", {})).rejects.toBe("fallo");
      await expect(changeUserPasswordHandler("U1", "123", {})).rejects.toBe("fallo");
      await expect(toggleUserActiveHandler("U1", false, {})).rejects.toBe("fallo");
      await expect(confirmUserEmailHandler("U1", {})).rejects.toBe("fallo");
      await expect(deleteUsuarioHandler("U1", {})).rejects.toBe("fallo");
    });
  });
});
