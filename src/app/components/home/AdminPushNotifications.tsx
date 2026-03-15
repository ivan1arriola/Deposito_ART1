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

export function AdminPushNotifications() {
  const [state, setState] = useState<PushState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const check = async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        setMessage("Este navegador no soporta notificaciones push.");
        return;
      }

      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
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
        setMessage("Activa notificaciones para recibir movimientos e inicios de sesion.");
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
        const details = await parseError(keyResponse, "No se pudo obtener clave publica de notificaciones.");
        throw new Error(details);
      }
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };
      if (!publicKey || publicKey.trim() === "") {
        throw new Error("La clave publica de notificaciones es invalida.");
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

  const deactivate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const registration = await getPushRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        setState("ready");
        setMessage("No habia suscripcion activa.");
        return;
      }

      const unsubscribeResponse = await fetch("/api/notifications/subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!unsubscribeResponse.ok) {
        const details = await parseError(unsubscribeResponse, "No se pudo desactivar la suscripcion.");
        throw new Error(details);
      }
      await subscription.unsubscribe();
      setState("ready");
      setMessage("Notificaciones desactivadas en este dispositivo.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "No se pudo desactivar la suscripcion.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BAB08C]">Notificaciones admin</p>
      <p className="mt-2 text-sm text-white/90">{message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(state === "ready" || state === "error" || state === "blocked") ? (
          <button
            type="button"
            onClick={() => void activate()}
            disabled={busy || state === "unsupported" || state === "checking"}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            {busy ? "Activando..." : "Activar notificaciones"}
          </button>
        ) : null}
        {state === "active" ? (
          <button
            type="button"
            onClick={() => void deactivate()}
            disabled={busy}
            className="rounded-xl border border-rose-200/35 bg-rose-950/20 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-900/30 disabled:opacity-50"
          >
            {busy ? "Desactivando..." : "Desactivar en este dispositivo"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
