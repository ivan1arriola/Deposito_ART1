"use client";

import Image from "next/image";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
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
  const isPersonal = loginMode === "PERSONAL";
  const isBusy = loading || loginLoading;

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <aside className="login-brand" aria-label="Identidad institucional">
          <div className="login-brand-inner">
            <Image
              src="/assets/logo-deposito.png"
              alt="Escudo del Depósito General"
              width={240}
              height={280}
              priority
              className="login-logo"
            />
            <div>
              <p className="login-brand-kicker">Grupo de Artillería 105 mm N.º 1</p>
              <p className="login-brand-title">Depósito General</p>
              <p className="login-brand-subtitle">Sistema de gestión interna</p>
            </div>
          </div>
        </aside>

        <div className="login-content">
          <div className="login-mobile-brand">
            <Image
              src="/assets/logo-deposito.png"
              alt="Escudo del Depósito General"
              width={96}
              height={112}
              priority
              className="login-mobile-logo"
            />
            <div>
              <p className="login-mobile-title">Depósito General</p>
              <p className="login-mobile-subtitle">Acceso al sistema</p>
            </div>
          </div>

          <div className="login-heading">
            <p className="login-eyebrow">Acceso seguro</p>
            <h1 id="login-title" className="login-title">Iniciar sesión</h1>
            <p className="login-intro">Selecciona el tipo de acceso e ingresa tus datos.</p>
          </div>

          <div className="login-mode" role="group" aria-label="Tipo de acceso">
            <button
              type="button"
              aria-pressed={isPersonal}
              onClick={onSelectPersonalLogin}
              className={`login-mode-button ${isPersonal ? "is-active" : ""}`}
            >
              <span className="login-mode-title">Personal</span>
              <span className="login-mode-description">Ingresar con cédula</span>
            </button>
            <button
              type="button"
              aria-pressed={!isPersonal}
              onClick={onSelectSystemLogin}
              className={`login-mode-button ${!isPersonal ? "is-active" : ""}`}
            >
              <span className="login-mode-title">Usuario del sistema</span>
              <span className="login-mode-description">Ingresar con usuario</span>
            </button>
          </div>

          {initMessage && showInitCredentials && initCredentials ? (
            <div className={`login-notice ${initMessage.type === "success" ? "is-success" : "is-info"}`} role="status">
              <p className="login-notice-title">{initMessage.text}</p>
              <dl className="login-credentials">
                <div>
                  <dt>Usuario</dt>
                  <dd><code>{initCredentials.username}</code></dd>
                </div>
                <div>
                  <dt>Contraseña</dt>
                  <dd><code>{initCredentials.password}</code></dd>
                </div>
              </dl>
              <p className="login-notice-help">Guarda estas credenciales en un lugar seguro.</p>
              <button type="button" onClick={onHideInitCredentials} className="login-secondary-button">
                Entendido
              </button>
            </div>
          ) : null}

          <form onSubmit={onLoginSubmit} className="login-form">
            <div className="login-field-group">
              <label htmlFor="login-username" className="login-label">
                {isPersonal ? "Cédula de identidad" : "Usuario"}
              </label>
              <input
                id="login-username"
                name="username"
                value={loginUsername}
                onChange={(event) => onLoginUsernameChange(event.target.value)}
                onPaste={onLoginUsernamePaste}
                onKeyDown={onLoginUsernameKeyDown}
                placeholder={isPersonal ? "Ej.: 12345678" : "Ingresa tu usuario"}
                inputMode={isPersonal ? "numeric" : undefined}
                pattern={isPersonal ? "[0-9]*" : undefined}
                maxLength={isPersonal ? 8 : undefined}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="login-input"
              />
              {isPersonal ? <p className="login-field-help">Escríbela sin puntos ni guiones.</p> : null}
            </div>

            <div className="login-field-group">
              <label htmlFor="login-password" className="login-label">Contraseña</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  name="password"
                  value={loginPassword}
                  onChange={(event) => onLoginPasswordChange(event.target.value)}
                  placeholder="Ingresa tu contraseña"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="login-input login-password-input"
                />
                <button
                  type="button"
                  onClick={onToggleLoginPasswordVisibility}
                  aria-label={showLoginPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showLoginPassword}
                  className="login-password-toggle"
                >
                  {showLoginPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {isPersonal ? (
                <p className="login-field-help">En el primer ingreso, la contraseña inicial es tu cédula.</p>
              ) : null}
            </div>

            <button type="submit" disabled={isBusy} className="login-submit">
              {isBusy ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="login-status" role="status" aria-live="polite" suppressHydrationWarning>
            {status}
          </p>

          {!isPersonal ? (
            <div className="login-recovery-section">
              <button type="button" onClick={onToggleResetRequest} className="login-recovery-link" aria-expanded={showResetRequest}>
                {showResetRequest ? "Cancelar recuperación" : "¿Olvidaste tu contraseña?"}
              </button>

              {showResetRequest ? (
                <form onSubmit={onResetRequestSubmit} className="login-recovery-form">
                  <div className="login-field-group">
                    <label htmlFor="reset-username" className="login-label">Usuario</label>
                    <input
                      id="reset-username"
                      value={resetUsername}
                      onChange={(event) => onResetUsernameChange(event.target.value)}
                      placeholder="Ingresa tu usuario"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      className="login-input"
                    />
                  </div>
                  <button type="submit" disabled={resetRequestLoading} className="login-secondary-button">
                    {resetRequestLoading ? "Enviando…" : "Enviar enlace de acceso"}
                  </button>
                  {resetRequestMessage ? <p className="login-recovery-message" role="status">{resetRequestMessage}</p> : null}
                </form>
              ) : null}
            </div>
          ) : (
            <p className="login-support-note">Si no puedes ingresar, solicita ayuda a un administrador del sistema.</p>
          )}
        </div>
      </section>

      <LoadingOverlay visible={isLoginGlobalBusy} label={loginBusyLabel} />
    </main>
  );
}
