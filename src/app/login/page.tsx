"use client";

import { FormEvent, useEffect, useState } from "react";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json()) as T | { error?: string };
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? data.error : "Error";
    throw new Error(message || "Error");
  }
  return data as T;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Ingresa tus credenciales.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(async () => {
      try {
        await api<{ user: { usuarioId: string } }>("/api/auth/me");
        window.location.href = "/";
      } catch {
        // Sin sesion: permanecer en login
      }
    }, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      await api("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      window.location.href = "/";
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "No se pudo iniciar sesion.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-2xl border border-stone-300/80 bg-white/90 p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Soldados App</p>
        <h1 className="mt-2 text-2xl font-bold text-stone-900">Iniciar sesion</h1>
        <p className="mt-2 text-sm text-stone-600">{status}</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Usuario"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
