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
          grado: "Sgto.",
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
            grado: "Sgto.",
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
          grado: "Tte.",
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
            grado: "Tte.",
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

      await changeUserRoleHandler("USR123", "ADMIN", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith(
        "/api/usuarios/USR123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ rol: "ADMIN" }),
        }),
      );
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  describe("changeUserPasswordHandler", () => {
    it("deberia cambiar la contrasena de otro usuario", async () => {
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
    it("deberia guardar configuracion de firmas", async () => {
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
  });
});
