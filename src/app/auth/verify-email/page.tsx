"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type VerifyState = "checking" | "success" | "error";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const hasToken = token !== "";
  const [state, setState] = useState<VerifyState>(hasToken ? "checking" : "error");
  const [message, setMessage] = useState(
    hasToken ? "Validando enlace..." : "El enlace es invalido o no contiene token."
  );
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!token) return;

    const run = async () => {
      try {
        const response = await fetch("/api/auth/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setState("error");
          setMessage(data.error ?? "No se pudo validar el correo.");
          return;
        }

        setState("success");
        setMessage("Correo validado correctamente.");
      } catch {
        setState("error");
        setMessage("No se pudo validar el correo.");
      }
    };

    void run();
  }, [token]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl equipos-center justify-center px-4 py-8">
      <section className="w-full rounded-2xl border border-stone-300 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-black text-stone-900">Validacion de correo</h1>
        <p
          className={`mt-3 text-sm ${state === "error" ? "text-rose-700" : state === "success" ? "text-emerald-700" : "text-stone-700"}`}
        >
          {message}
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-block rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
