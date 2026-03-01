/**
 * Tests para handlers de usuarios y autenticación
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import {
  createUsuarioHandler,
  changeUserRoleHandler,
  changeUserPasswordHandler,
  changeUsernameHandler,
  toggleUserActiveHandler,
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
    it("debería crear usuario con validación de contraseña", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ usuarioId: "USR123" });

      await createUsuarioHandler("newuser", "password123", "EDITOR", {
        onSuccess,
      });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            username: "newuser",
            password: "password123",
            rol: "EDITOR",
            activo: true,
          }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería rechazar contraseñas débiles", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(
        new Error("Contraseña debe tener al menos 8 caracteres")
      );

      try {
        await createUsuarioHandler("newuser", "short", "EDITOR", { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("changeUserRoleHandler", () => {
    it("debería cambiar rol de usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await changeUserRoleHandler("USR123", "ADMIN", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ rol: "ADMIN" }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería validar que ADMIN y EDITOR no haya cambios no autorizados", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(
        new Error("No tienes permisos para cambiar este rol")
      );

      try {
        await changeUserRoleHandler("ADMIN_USER", "EDITOR", { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("changeUserPasswordHandler", () => {
    it("debería cambiar la contraseña de otro usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await changeUserPasswordHandler("USR123", "NuevaClave123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ password: "NuevaClave123" }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería propagar errores de validación de contraseña", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("contrasena invalida. Minimo 8 caracteres."));

      try {
        await changeUserPasswordHandler("USR123", "short", { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("changeUsernameHandler", () => {
    it("debería cambiar el nombre de usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await changeUsernameHandler("USR123", "nuevo.usuario", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ username: "nuevo.usuario" }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("toggleUserActiveHandler", () => {
    it("debería cambiar estado activo/inactivo", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await toggleUserActiveHandler("USR123", false, { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ activo: false }),
        })
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("deleteUsuarioHandler", () => {
    it("debería eliminar usuario", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({});

      await deleteUsuarioHandler("USR123", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(onSuccess).toHaveBeenCalled();
    });

    it("debería evitar eliminar último admin", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(
        new Error("No puedes eliminar el último administrador")
      );

      try {
        await deleteUsuarioHandler("LAST_ADMIN", { onError });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("saveFirmaConfigHandler", () => {
    it("debería guardar configuración de firmas", async () => {
      const onSave = vi.fn();
      vi.mocked(api).mockResolvedValue({
        encargadoRango: "Teniente",
        encargadoNombre: "Juan Pérez",
        oficialRango: "Mayor",
        oficialNombre: "Carlos García",
        updatedAt: new Date().toISOString(),
      });

      await saveFirmaConfigHandler(
        "Teniente",
        "Juan Pérez",
        "Mayor",
        "Carlos García",
        { onSave }
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/firma-config",
        expect.objectContaining({ method: "PUT" })
      );
      expect(onSave).toHaveBeenCalled();
    });

    it("debería validar que todos los campos requeridos estén presentes", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(
        new Error("Todos los campos son requeridos")
      );

      try {
        await saveFirmaConfigHandler("", "Juan Pérez", "Mayor", "Carlos García", {
          onError,
        });
      } catch {
        // Error esperado
      }

      expect(onError).toHaveBeenCalled();
    });
  });
});
