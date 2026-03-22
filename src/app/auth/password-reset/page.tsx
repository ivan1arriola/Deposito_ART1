"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type ViewState = "form" | "submitting" | "success";

export default function PasswordResetPage() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const hasToken = token !== "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [state, setState] = useState<ViewState>("form");

  const submitDisabled = useMemo(
    () =>
      state === "submitting" ||
      newPassword.trim().length < 8 ||
      confirmPassword.trim() === "",
    [confirmPassword, newPassword, state],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasToken) {
      setError("El enlace es inválido.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La confirmación no coincide.");
      return;
    }

    setError("");
    setState("submitting");
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se pudo restablecer la contraseña.");
        setState("form");
        return;
      }
      setState("success");
    } catch {
      setError("No se pudo restablecer la contraseña.");
      setState("form");
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl items-center justify-center px-4 py-8">
      <section className="w-full rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-stone-900">Restablecer contraseña</h1>
        {!hasToken ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-stone-700">El enlace es inválido o no contiene token.</p>
            <Link href="/" className="inline-block rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800">
              Volver al inicio
            </Link>
          </div>
        ) : state === "success" ? (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-emerald-700">Contraseña actualizada correctamente.</p>
            <Link href="/" className="inline-block rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800">
              Ir a iniciar sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Nueva contraseña"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirmar nueva contraseña"
              className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitDisabled}
              className="w-full rounded-xl bg-stone-900 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {state === "submitting" ? "Guardando..." : "Actualizar contraseña"}
            </button>
            {error ? <p className="text-xs text-rose-700">{error}</p> : null}
          </form>
        )}
      </section>
    </main>
  );
}

