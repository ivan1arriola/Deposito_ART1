"use client";

import { useEffect, useMemo, useState } from "react";

type InstallState = "loading" | "available" | "installed" | "manual";

const DISMISS_KEY = "pwa-install-card-dismissed";

type AppInstallCardProps = {
  compact?: boolean;
};

export function AppInstallCard({ compact = false }: AppInstallCardProps) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installState, setInstallState] = useState<InstallState>("loading");
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isMobileClient, setIsMobileClient] = useState<boolean | null>(null);

  const manualMessages = useMemo(() => {
    if (isMobileClient === null) {
      return {
        full: "En Chrome, abre el menú (tres puntos) o usa el ícono de instalación de la barra.",
        compact: "Chrome: menú (tres puntos) o ícono de instalación.",
      };
    }

    if (isMobileClient) {
      return {
        full: "En Chrome mobile, abre el menú (tres puntos) y toca 'Instalar aplicación'.",
        compact: "Chrome mobile: menú (tres puntos) > Instalar aplicación.",
      };
    }

    return {
      full: "En Chrome escritorio, usa el ícono de instalación en la barra de direcciones (a la derecha).",
      compact: "Chrome escritorio: usa el ícono de instalación de la barra.",
    };
  }, [isMobileClient]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent.toLowerCase();
    setIsMobileClient(/android|iphone|ipad|ipod/.test(ua));

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    if (wasDismissed) {
      setDismissed(true);
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (typeof navigator !== "undefined" &&
        "standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

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

  const summaryText =
    installState === "available"
      ? compact
        ? "Instálala para abrir rápido desde Inicio."
        : "Instálala para abrir rápido desde el inicio y usarla como app en escritorio o mobile."
      : compact
        ? manualMessages.compact
        : manualMessages.full;

  const primaryLabel = installing
    ? "Abriendo..."
    : installState === "available"
      ? compact
        ? "Instalar app"
        : "Descargar app"
      : compact
        ? "Cómo instalar"
        : "Ver cómo descargar app";

  return (
    <section
      className={`ej-card mt-4 rounded-2xl border border-stone-300/70 bg-white/85 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}
      aria-live="polite"
    >
      <div className={`flex flex-col gap-3 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Aplicación instalable</p>
          <h2 className={`${compact ? "text-sm sm:text-base" : "text-base sm:text-lg"} font-bold text-stone-900`}>Instala Depósito ART1 en Chrome</h2>
          <p className={`${compact ? "text-xs" : "text-sm"} mt-1 text-stone-700`}>{summaryText}</p>
        </div>

        <div className={`gap-2 ${compact ? "grid grid-cols-2" : "flex sm:shrink-0"}`}>
          <button
            type="button"
            onClick={() => void install()}
            disabled={installing}
            className={`ej-button rounded-xl ${compact ? "px-3 py-2 text-xs sm:text-sm" : "px-4 py-2 text-sm"} font-semibold disabled:opacity-60`}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className={`rounded-xl border border-stone-300 bg-white ${compact ? "px-3 py-2 text-xs sm:text-sm" : "px-4 py-2 text-sm"} font-semibold text-stone-700 transition hover:bg-stone-100`}
          >
            {compact ? "Cerrar" : "Ocultar"}
          </button>
        </div>
      </div>
    </section>
  );
}
