/**
 * Tests para handlers de autenticación
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { signIn, signOut } from "next-auth/react";
import { api } from "@/lib/api";
import {
  loginHandler,
  logoutHandler,
  requestPasswordResetHandler,
  changePasswordHandler,
  checkDbInitHandler,
  initializeDatabaseHandler,
} from "@/lib/handlers-auth";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: vi.fn(),
}));

describe("Handlers de Autenticación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loginHandler", () => {
    it("debería llamar a onSuccess cuando signIn devuelve ok sin error", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(signIn).mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "/",
      });

      await loginHandler("admin", "secreto", { onSuccess, onError });

      expect(vi.mocked(signIn)).toHaveBeenCalledWith("credentials", {
        username: "admin",
        password: "secreto",
        redirect: false,
      });
      expect(onSuccess).toHaveBeenCalledOnce();
      expect(onError).not.toHaveBeenCalled();
    });

    it("debería traducir el error CredentialsSignin a mensaje legible", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(signIn).mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });

      await loginHandler("admin", "mal", { onSuccess, onError });

      expect(onError).toHaveBeenCalledWith("Credenciales inválidas");
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("debería propagar otro error devuelto por signIn", async () => {
      const onError = vi.fn();
      vi.mocked(signIn).mockResolvedValue({
        error: "Usuario deshabilitado",
        status: 403,
        ok: false,
        url: null,
      });

      await loginHandler("admin", "clave", { onError });

      expect(onError).toHaveBeenCalledWith("Usuario deshabilitado");
    });

    it("debería usar el mensaje por defecto cuando signIn no retorna error ni ok", async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      vi.mocked(signIn).mockResolvedValue(undefined);

      await loginHandler("admin", "clave", { onSuccess, onError });

      expect(onError).toHaveBeenCalledWith("No se pudo iniciar sesión.");
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("debería capturar una excepción Error y notificar a onError", async () => {
      const onError = vi.fn();
      vi.mocked(signIn).mockRejectedValue(new Error("Fallo de red"));

      await loginHandler("admin", "clave", { onError });

      expect(onError).toHaveBeenCalledWith("Fallo de red");
    });

    it("debería capturar un rechazo no-Error y usar el mensaje por defecto", async () => {
      const onError = vi.fn();
      vi.mocked(signIn).mockRejectedValue("error desconocido");

      await loginHandler("admin", "clave", { onError });

      expect(onError).toHaveBeenCalledWith("No se pudo iniciar sesión.");
    });

    it("debería tolerar callbacks opcionales omitidos en éxito y error", async () => {
      vi.mocked(signIn).mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "/",
      });
      await expect(loginHandler("admin", "clave", {})).resolves.toBeUndefined();

      vi.mocked(signIn).mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });
      await expect(loginHandler("admin", "clave", {})).resolves.toBeUndefined();

      vi.mocked(signIn).mockResolvedValue(undefined);
      await expect(loginHandler("admin", "clave", {})).resolves.toBeUndefined();

      vi.mocked(signIn).mockRejectedValue(new Error("boom"));
      await expect(loginHandler("admin", "clave", {})).resolves.toBeUndefined();
    });
  });

  describe("logoutHandler", () => {
    it("debería cerrar sesión y llamar a onSuccess", async () => {
      const onSuccess = vi.fn();
      vi.mocked(signOut).mockResolvedValue({ url: "/login" });

      await logoutHandler({ onSuccess });

      expect(vi.mocked(signOut)).toHaveBeenCalledWith({ redirect: false });
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("debería llamar a onSuccess incluso si signOut lanza error", async () => {
      const onSuccess = vi.fn();
      vi.mocked(signOut).mockRejectedValue(new Error("Error de cierre de sesión"));

      await logoutHandler({ onSuccess });

      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("debería tolerar callbacks vacíos al cerrar sesión", async () => {
      vi.mocked(signOut).mockResolvedValue({ url: "/login" });

      await expect(logoutHandler({})).resolves.toBeUndefined();
    });
  });

  describe("requestPasswordResetHandler", () => {
    it("debería solicitar enlace de recuperación y devolver respuesta", async () => {
      const onSuccess = vi.fn();
      const response = { ok: true as const, message: "Enlace enviado" };
      vi.mocked(api).mockResolvedValue(response);

      const result = await requestPasswordResetHandler("jperez", { onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "jperez" }),
      });
      expect(onSuccess).toHaveBeenCalledWith(response);
      expect(result).toEqual(response);
    });

    it("debería propagar mensaje de Error y relanzar la excepción", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Usuario no encontrado"));

      await expect(requestPasswordResetHandler("nadie", { onError })).rejects.toThrow(
        "Usuario no encontrado"
      );
      expect(onError).toHaveBeenCalledWith("Usuario no encontrado");
    });

    it("debería usar mensaje por defecto ante error no-Error y tolerar callbacks omitidos", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue("fallo");

      await expect(requestPasswordResetHandler("jperez", { onError })).rejects.toBe("fallo");
      expect(onError).toHaveBeenCalledWith("No se pudo enviar el enlace.");

      vi.mocked(api).mockResolvedValue({ ok: true, message: "OK" });
      await expect(requestPasswordResetHandler("jperez", {})).resolves.toEqual({
        ok: true,
        message: "OK",
      });

      vi.mocked(api).mockRejectedValue(new Error("error"));
      await expect(requestPasswordResetHandler("jperez", {})).rejects.toThrow("error");
    });
  });

  describe("changePasswordHandler", () => {
    it("debería cambiar la contraseña correctamente", async () => {
      const onSuccess = vi.fn();
      vi.mocked(api).mockResolvedValue({ ok: true });

      await changePasswordHandler(
        { currentPassword: "vieja", newPassword: "nueva" },
        { onSuccess }
      );

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/auth/password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: "vieja", newPassword: "nueva" }),
      });
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it("debería notificar mensaje de Error y usar mensaje por defecto en fallo no-Error", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Contraseña actual incorrecta"));

      await expect(
        changePasswordHandler({ currentPassword: "x", newPassword: "y" }, { onError })
      ).rejects.toThrow("Contraseña actual incorrecta");
      expect(onError).toHaveBeenCalledWith("Contraseña actual incorrecta");

      vi.mocked(api).mockRejectedValue(42);
      await expect(
        changePasswordHandler({ currentPassword: "x", newPassword: "y" }, { onError })
      ).rejects.toBe(42);
      expect(onError).toHaveBeenCalledWith("No se pudo cambiar la contraseña.");
    });

    it("debería tolerar callbacks vacíos al cambiar contraseña", async () => {
      vi.mocked(api).mockResolvedValue({});
      await expect(
        changePasswordHandler({ currentPassword: "a", newPassword: "b" }, {})
      ).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("fallo"));
      await expect(
        changePasswordHandler({ currentPassword: "a", newPassword: "b" }, {})
      ).rejects.toThrow("fallo");
    });
  });

  describe("checkDbInitHandler", () => {
    it("debería retornar el estado de inicialización cuando la API responde", async () => {
      vi.mocked(api).mockResolvedValue({ needsInit: true, userCount: 0 });

      const result = await checkDbInitHandler();

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/db-init");
      expect(result).toEqual({ needsInit: true, userCount: 0 });
    });

    it("debería retornar fallback seguro cuando falla la consulta", async () => {
      vi.mocked(api).mockRejectedValue(new Error("Sin conexión"));

      const result = await checkDbInitHandler();

      expect(result).toEqual({ needsInit: false, userCount: 0 });
    });
  });

  describe("initializeDatabaseHandler", () => {
    it("debería inicializar la base de datos y pasar el resultado a onSuccess", async () => {
      const onSuccess = vi.fn();
      const response = {
        initialized: true,
        message: "Base inicializada",
        credentials: { username: "admin", password: "123" },
      };
      vi.mocked(api).mockResolvedValue(response);

      await initializeDatabaseHandler({ onSuccess });

      expect(vi.mocked(api)).toHaveBeenCalledWith("/api/db-init", { method: "POST" });
      expect(onSuccess).toHaveBeenCalledWith(response);
    });

    it("debería reportar Error y mensaje por defecto ante fallo no-Error", async () => {
      const onError = vi.fn();
      vi.mocked(api).mockRejectedValue(new Error("Ya inicializada"));

      await expect(initializeDatabaseHandler({ onError })).rejects.toThrow("Ya inicializada");
      expect(onError).toHaveBeenCalledWith("Ya inicializada");

      vi.mocked(api).mockRejectedValue(null);
      await expect(initializeDatabaseHandler({ onError })).rejects.toBeNull();
      expect(onError).toHaveBeenCalledWith("No se pudo inicializar la base de datos.");
    });

    it("debería tolerar callbacks vacíos al inicializar la base", async () => {
      vi.mocked(api).mockResolvedValue({ initialized: true, message: "OK" });
      await expect(initializeDatabaseHandler({})).resolves.toBeUndefined();

      vi.mocked(api).mockRejectedValue(new Error("error"));
      await expect(initializeDatabaseHandler({})).rejects.toThrow("error");
    });
  });
});
