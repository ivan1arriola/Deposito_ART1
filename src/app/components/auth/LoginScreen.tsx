"use client";

import Image from "next/image";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { AppInstallCard } from "@/app/components/pwa/AppInstallCard";
import { LoadingOverlay } from "@/app/components/shared";

type LoginMode = "USUARIO" | "PERSONAL";

type InitMessage = {
  type: "success" | "info";
  text: string;
} | null;

type InitCredentials = {
  username: string;
  password: string;
} | null;

type LoginScreenProps = {
  status: string;
  loginMode: LoginMode;
  loginUsername: string;
  loginPassword: string;
  showLoginPassword: boolean;
  loading: boolean;
  loginLoading: boolean;
  showResetRequest: boolean;
  resetUsername: string;
  resetRequestLoading: boolean;
  resetRequestMessage: string;
  initMessage: InitMessage;
  showInitCredentials: boolean;
  initCredentials: InitCredentials;
  isLoginGlobalBusy: boolean;
  loginBusyLabel: string;
  onSelectPersonalLogin: () => void;
  onSelectSystemLogin: () => void;
  onHideInitCredentials: () => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLoginUsernameChange: (value: string) => void;
  onLoginUsernamePaste: (event: ClipboardEvent<HTMLInputElement>) => void;
  onLoginUsernameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onLoginPasswordChange: (value: string) => void;
  onToggleLoginPasswordVisibility: () => void;
  onToggleResetRequest: () => void;
  onResetUsernameChange: (value: string) => void;
  onResetRequestSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function LoginScreen({
  status,
  loginMode,
  loginUsername,
  loginPassword,
  showLoginPassword,
  loading,
  loginLoading,
  showResetRequest,
  resetUsername,
  resetRequestLoading,
  resetRequestMessage,
  initMessage,
  showInitCredentials,
  initCredentials,
  isLoginGlobalBusy,
  loginBusyLabel,
  onSelectPersonalLogin,
  onSelectSystemLogin,
  onHideInitCredentials,
  onLoginSubmit,
  onLoginUsernameChange,
  onLoginUsernamePaste,
  onLoginUsernameKeyDown,
  onLoginPasswordChange,
  onToggleLoginPasswordVisibility,
  onToggleResetRequest,
  onResetUsernameChange,
  onResetRequestSubmit,
}: LoginScreenProps) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-7xl equipos-center justify-center px-3 py-4 sm:px-6 sm:py-6">
      <section className="ej-login-shell lg:grid-cols-[1fr_minmax(360px,440px)]">
        <div className="ej-login-aside relative hidden p-8 lg:flex lg:equipos-center lg:justify-center xl:p-10">
          <Image
            src="/assets/logo-deposito.png"
            alt="Logo Depósito"
            width={420}
            height={420}
            priority
            className="h-auto w-full max-w-[clamp(300px,34vw,460px)] object-contain"
          />
        </div>

        <div className="relative overflow-y-auto p-5 sm:p-8 lg:flex lg:equipos-center lg:p-10">
          <div className="w-full lg:mx-auto lg:max-w-[460px]">
            <div className="mb-4 flex justify-center lg:hidden">
              <Image
                src="/assets/logo-deposito.png"
                alt="Logo Depósito"
                width={220}
                height={220}
                priority
                className="h-auto w-36 object-contain sm:w-44"
              />
            </div>
            <div className="ej-login-card p-4 sm:p-5">
              <h1 className="ej-login-title mt-1 text-3xl font-black tracking-tight sm:text-4xl">Iniciar sesión</h1>
              <p className="ej-login-status mt-2 text-sm" suppressHydrationWarning>
                {status}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-1">
                <button
                  type="button"
                  onClick={onSelectPersonalLogin}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    loginMode === "PERSONAL"
                      ? "bg-[var(--color-ejercito-blue)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Personal por cédula
                </button>
                <button
                  type="button"
                  onClick={onSelectSystemLogin}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    loginMode === "USUARIO"
                      ? "bg-[var(--color-ejercito-blue)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Usuario del sistema
                </button>
              </div>

              {loginMode === "PERSONAL" ? (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-[var(--color-text-secondary)]">Ingresa con tu cédula (solo números, sin puntos ni guiones) y contraseña.</p>
                  <p className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                    <span className="font-semibold">Nota:</span> La contraseña inicial es tu misma cédula.
                  </p>
                </div>
              ) : null}

              {initMessage && showInitCredentials && initCredentials ? (
                <div
                  className={`mt-4 rounded-2xl border px-3 py-2 text-sm ${
                    initMessage.type === "success"
                      ? "border-[rgb(31,103,40,0.45)] bg-[rgb(31,103,40,0.1)] text-[var(--color-text-primary)]"
                      : "border-[rgb(27,117,170,0.45)] bg-[rgb(27,117,170,0.1)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <p className="font-semibold">{initMessage.text}</p>
                  <div className="mt-3 space-y-1 rounded border border-current/20 bg-[var(--color-surface-base)] p-2 text-xs">
                    <p>
                      <strong>Usuario:</strong> <code className="font-mono">{initCredentials.username}</code>
                    </p>
                    <p>
                      <strong>Contraseña:</strong> <code className="font-mono">{initCredentials.password}</code>
                    </p>
                  </div>
                  <p className="mt-2 text-xs italic">Guarda estas credenciales en un lugar seguro.</p>
                  <button
                    type="button"
                    onClick={onHideInitCredentials}
                    className="mt-2 w-full rounded px-2 py-1 text-xs font-semibold hover:bg-current/10"
                  >
                    Entendido
                  </button>
                </div>
              ) : null}

              <form onSubmit={onLoginSubmit} className="mt-5 space-y-3">
                <input
                  value={loginUsername}
                  onChange={(event) => onLoginUsernameChange(event.target.value)}
                  onPaste={onLoginUsernamePaste}
                  onKeyDown={onLoginUsernameKeyDown}
                  placeholder={loginMode === "PERSONAL" ? "Cédula" : "Usuario"}
                  inputMode={loginMode === "PERSONAL" ? "numeric" : undefined}
                  pattern={loginMode === "PERSONAL" ? "[0-9]*" : undefined}
                  maxLength={loginMode === "PERSONAL" ? 8 : undefined}
                  className="ej-login-input px-3 py-2 text-sm"
                />
                <div className="relative">
                  <input
                    value={loginPassword}
                    onChange={(event) => onLoginPasswordChange(event.target.value)}
                    placeholder="Contraseña"
                    type={showLoginPassword ? "text" : "password"}
                    className="ej-login-input px-3 py-2 pr-20 text-sm"
                  />
                  <button
                    type="button"
                    onClick={onToggleLoginPasswordVisibility}
                    aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute inset-y-0 right-2 my-1 inline-flex w-8 equipos-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {showLoginPassword ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.89 1 12c.92-2.6 2.68-4.8 4.94-6.06" />
                        <path d="M9.9 4.24A11.24 11.24 0 0 1 12 4c5 0 9.27 3.11 11 8a11.8 11.8 0 0 1-1.67 3.01" />
                        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <button type="submit" disabled={loading || loginLoading} className="ej-login-submit px-3 py-2.5 text-sm disabled:opacity-60">
                  {loading || loginLoading ? "Ingresando..." : "Entrar"}
                </button>
              </form>

              {loginMode === "USUARIO" ? (
                <>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onToggleResetRequest}
                      className="ej-login-link text-xs font-semibold underline underline-offset-2"
                    >
                      {showResetRequest ? "Ocultar recuperación de contraseña" : "Olvidé mi contraseña"}
                    </button>
                  </div>

                  {showResetRequest ? (
                    <form onSubmit={onResetRequestSubmit} className="ej-login-reset mt-3 space-y-2 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Recuperar acceso</p>
                      <input
                        value={resetUsername}
                        onChange={(event) => onResetUsernameChange(event.target.value)}
                        placeholder="Usuario"
                        className="ej-login-input px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={resetRequestLoading}
                        className="w-full rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
                      >
                        {resetRequestLoading ? "Enviando..." : "Enviar enlace mágico"}
                      </button>
                      {resetRequestMessage ? <p className="text-xs text-[var(--color-text-secondary)]">{resetRequestMessage}</p> : null}
                    </form>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-xs text-[var(--color-text-secondary)]">Si olvidaste la contraseña, solicita el restablecimiento a un administrador.</p>
              )}
            </div>

            <AppInstallCard compact />
          </div>
        </div>
      </section>
      <LoadingOverlay visible={isLoginGlobalBusy} label={loginBusyLabel} />
    </main>
  );
}
