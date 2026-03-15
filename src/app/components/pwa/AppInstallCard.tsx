"use client";

import { useEffect, useMemo, useState } from "react";

type InstallState = "loading" | "available" | "installed" | "manual";

const DISMISS_KEY = "pwa-install-card-dismissed";

export function AppInstallCard() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("loading");
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const manualMessage = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "";
    }

    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod/.test(ua);

    if (isMobile) {
      return "En Chrome mobile, abre el menu (tres puntos) y toca 'Instalar aplicacion'.";
    }

    return "En Chrome escritorio, usa el icono de instalacion en la barra de direcciones (a la derecha).";
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (wasDismissed) {
      setDismissed(true);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (typeof navigator !== "undefined" && "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

    if (standalone) {
      setInstallState("installed");
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallState("available");
    };

    const handleAppInstalled = () => {
      setInstallState("installed");
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const timeout = window.setTimeout(() => {
      setInstallState((current) => (current === "loading" ? "manual" : current));
    }, 1800);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.clearTimeout(timeout);
    };
  }, []);

  if (dismissed || installState === "installed") {
    return null;
  }

  const install = async () => {
    if (installing) return;
    if (!installEvent) {
      setInstallState("manual");
      return;
    }

    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallState("installed");
      } else {
        setInstallState("manual");
      }
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  return (
    <section className="ej-card mt-4 rounded-2xl border border-stone-300/70 bg-white/85 p-4 sm:p-5" aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Aplicacion instalable</p>
          <h2 className="text-base font-bold text-stone-900 sm:text-lg">Instala Deposito ART1 en Chrome</h2>
          <p className="mt-1 text-sm text-stone-700">
            {installState === "available"
              ? "Instalala para abrir rapido desde el inicio y usarla como app en escritorio o mobile."
              : manualMessage}
          </p>
        </div>

        <div className="flex gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={() => void install()}
            disabled={installing}
            className="ej-button rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {installing ? "Abriendo..." : installState === "available" ? "Descargar app" : "Ver como descargar app"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            Ocultar
          </button>
        </div>
      </div>
    </section>
  );
}
