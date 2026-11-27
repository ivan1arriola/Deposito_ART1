"use client";

import { useEffect, useState } from "react";

type PushState = "checking" | "unsupported" | "blocked" | "ready" | "active" | "error";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function parseError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: string };
    if (body?.error && body.error.trim() !== "") return body.error.trim();
  } catch {
    // noop
  }
  return fallback;
}

async function getPushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await registration.update().catch(() => undefined);
  return registration;
}

export function AdminPushNotifications({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const check = async () => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        setMessage("Este navegador no soporta notificaciones push.");
        return;
      }

      const isLocalhost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!window.isSecureContext && !isLocalhost) {
        setState("blocked");
        setMessage("Notificaciones push requieren HTTPS.");
        return;
      }

      if (Notification.permission === "denied") {
        setState("blocked");
        setMessage("Las notificaciones estan bloqueadas en el navegador.");
        return;
      }

      try {
        const registration = await getPushRegistration();
        const current = await registration.pushManager.getSubscription();
        if (current) {
          setState("active");
          setMessage("Notificaciones activas en este dispositivo.");
          return;
        }
        setState("ready");
        setMessage("Activa notificaciones para recibir movimientos e inicios de sesión.");
      } catch {
        setState("error");
        setMessage("No se pudo verificar el estado de notificaciones.");
      }
    };

    void check();
  }, []);

  const activate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("blocked");
        setMessage("Permiso de notificaciones no concedido.");
        return;
      }

      const keyResponse = await fetch("/api/notifications/public-key", { cache: "no-store" });
      if (!keyResponse.ok) {
        const details = await parseError(
          keyResponse,
          "No se pudo obtener clave publica de notificaciones."
        );
        throw new Error(details);
      }
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      if (!publicKey || publicKey.trim() === "") {
        throw new Error("La clave pública de notificaciones es inválida.");
      }

      const registration = await getPushRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64ToUint8Array(publicKey),
        }));

      const subscribeResponse = await fetch("/api/notifications/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!subscribeResponse.ok) {
        const details = await parseError(subscribeResponse, "No se pudo registrar la suscripcion.");
        throw new Error(details);
      }

      setState("active");
      setMessage("Notificaciones activas en este dispositivo.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Error al activar notificaciones.");
    } finally {
      setBusy(false);
    }
  };

  // Evita ruido visual constante en el dashboard:
  // mostrar solo cuando hay accion pendiente o error.
  if (state === "checking" || state === "unsupported" || state === "active") {
    return null;
  }

  return (
    <article
      className={
        compact
          ? "flex h-full flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2"
          : "rounded-[28px] border border-[rgba(214,198,150,0.26)] bg-[linear-gradient(180deg,rgba(244,241,229,0.95)_0%,rgba(227,223,207,0.93)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.46)]"
      }
    >
      <div className={compact ? "min-w-0 flex-1 basis-44" : undefined}>
        <p
          className={
            compact
              ? "text-sm font-semibold text-stone-900"
              : "text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-ejercito-blue)]"
          }
        >
          Notificaciones admin
        </p>
        <p
          className={
            compact ? "text-xs text-stone-700" : "mt-2 text-sm text-[var(--color-text-secondary)]"
          }
        >
          {message}
        </p>
      </div>
      <div className={compact ? undefined : "mt-3 flex flex-wrap gap-2"}>
        {state === "ready" || state === "error" || state === "blocked" ? (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={busy}
            className={
              compact
                ? "min-h-11 rounded-lg bg-amber-200 px-2.5 text-xs font-semibold text-stone-900 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 disabled:opacity-50"
                : "rounded-xl border border-[rgba(145,111,26,0.78)] bg-[linear-gradient(180deg,rgba(255,210,74,0.98)_0%,rgba(214,170,38,0.98)_100%)] px-3 py-2 text-xs font-bold text-[var(--color-ejercito-black)] transition hover:bg-[linear-gradient(180deg,rgba(242,198,62,0.98)_0%,rgba(196,154,28,0.98)_100%)] disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {busy ? "Activando..." : "Activar notificaciones"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
