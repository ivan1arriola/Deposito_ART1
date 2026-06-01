"use client";

import type { FormEvent } from "react";
import { ROLE_OPTIONS, type Rango, type Role } from "@/types/entities";

type UserCreateViewProps = {
  isAdmin: boolean;
  rangoId: string;
  rangoOptions: Rango[];
  nombre: string;
  apellido: string;
  username: string;
  password: string;
  passwordConfirm: string;
  mailReferencia: string;
  role: Role;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRangoIdChange: (value: string) => void;
  onNombreChange: (value: string) => void;
  onApellidoChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onMailReferenciaChange: (value: string) => void;
  onRoleChange: (value: Role) => void;
  roleLabel: (role: Role) => string;
  roleDescription: (role: Role) => string;
  roleScope: (role: Role) => string;
};

export function UserCreateView({
  isAdmin,
  rangoId,
  rangoOptions,
  nombre,
  apellido,
  username,
  password,
  passwordConfirm,
  mailReferencia,
  role,
  onBack,
  onSubmit,
  onRangoIdChange,
  onNombreChange,
  onApellidoChange,
  onUsernameChange,
  onPasswordChange,
  onPasswordConfirmChange,
  onMailReferenciaChange,
  onRoleChange,
  roleLabel,
  roleDescription,
  roleScope,
}: UserCreateViewProps) {
  const canSubmit =
    isAdmin &&
    nombre.trim() !== "" &&
    apellido.trim() !== "" &&
    username.trim() !== "" &&
    password.trim() !== "" &&
    passwordConfirm.trim() !== "";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:equipos-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Alta de usuario</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Crea una cuenta nueva para acceso al sistema y define su nivel de permisos.
              </p>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)]"
            >
              Volver
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={rangoId}
                onChange={(event) => onRangoIdChange(event.target.value)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                disabled={!isAdmin}
              >
                <option value="">Grado (opcional)</option>
                {rangoOptions.map((rango) => (
                  <option key={`user-rango-${rango.rangoId}`} value={String(rango.rangoId)}>
                    {`${rango.abreviacion} - ${rango.nombreCompleto}`}
                  </option>
                ))}
              </select>
              <input
                value={nombre}
                onChange={(event) => onNombreChange(event.target.value)}
                placeholder="Nombre *"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                disabled={!isAdmin}
              />
              <input
                value={apellido}
                onChange={(event) => onApellidoChange(event.target.value)}
                placeholder="Apellido *"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                disabled={!isAdmin}
              />
              <input
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                placeholder="Usuario *"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Contraseña (min. 8) *"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                type="password"
                disabled={!isAdmin}
              />
              <input
                value={passwordConfirm}
                onChange={(event) => onPasswordConfirmChange(event.target.value)}
                placeholder="Repetir contraseña *"
                className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                type="password"
                disabled={!isAdmin}
              />
            </div>

            <input
              value={mailReferencia}
              onChange={(event) => onMailReferenciaChange(event.target.value)}
              placeholder="Mail de referencia (opcional)"
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              disabled={!isAdmin}
            />

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {ROLE_OPTIONS.map((option) => {
                const selected = role === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onRoleChange(option)}
                    disabled={!isAdmin}
                    className={`rounded-2xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      selected
                        ? "border-[var(--color-ejercito-blue)] bg-[var(--color-ejercito-blue)] text-white shadow-sm"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{roleLabel(option)}</p>
                    <p className={`mt-1 text-xs ${selected ? "text-white/80" : "text-[var(--color-text-secondary)]"}`}>{roleDescription(option)}</p>
                    <p className={`mt-2 text-[11px] font-medium uppercase tracking-wide ${selected ? "text-white/70" : "text-[var(--color-neutral-600)]"}`}>
                      {roleScope(option)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-4 text-white shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">Seguridad</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              El nuevo usuario podrá iniciar sesión de inmediato con el rol seleccionado.
            </p>
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 inline-flex w-full equipos-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)]"
            >
              Crear usuario
            </button>
          </aside>
        </form>
      </article>
    </section>
  );
}
