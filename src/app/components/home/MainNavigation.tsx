"use client";

import { useEffect, useRef, useState, type JSX, type RefObject } from "react";
import type { MainView } from "@/types/views";

type ConfigView = Extract<MainView, "grados" | "baterias" | "equipos" | "firmas" | "usuarios" | "auditoria">;
type SummaryView = Extract<MainView, "equipo_resumen" | "tallas_resumen">;
type CreateView = Extract<MainView, "personal_nuevo" | "equipo_nuevo" | "bateria_nueva" | "grado_nuevo" | "usuarios">;
type StockView = Extract<MainView, "stock" | "stock_actual" | "stock_alta" | "stock_baja" | "stock_historial">;

type MainNavigationProps = {
  activeView: MainView;
  canWrite: boolean;
  isAdmin: boolean;
  showConfigViews: boolean;
  isConfigView: boolean;
  configMenuRef: RefObject<HTMLDivElement | null>;
  onSelectView: (view: MainView) => void;
  onSetConfigViews: (open: boolean) => void;
};

const configViews: Array<{ view: ConfigView; label: string; adminOnly?: boolean; icon: JSX.Element }> = [
  {
    view: "grados",
    label: "Grados Registrados",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    view: "baterias",
    label: "Baterías Registradas",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    view: "equipos",
    label: "Equipos Registrados",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    view: "firmas",
    label: "Firmas institucionales",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10 0V6a3 3 0 10-6 0v2m6 0H7" />
      </svg>
    ),
  },
  {
    view: "usuarios",
    label: "Usuarios Registrados",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    view: "auditoria",
    label: "Auditoría detallada",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m4 6V7m4 10v-3M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const summaryViews: Array<{ view: SummaryView; label: string; shortLabel: string; icon: JSX.Element }> = [
  {
    view: "equipo_resumen",
    label: "Resumen de Equipo en Baterías",
    shortLabel: "Baterías",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M7 3v4m10-4v4M6 12h4v8H6zM14 10h4v10h-4z" />
      </svg>
    ),
  },
  {
    view: "tallas_resumen",
    label: "Resumen por tallas",
    shortLabel: "Tallas",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const createViews: Array<{ view: CreateView; label: string; shortLabel: string; adminOnly?: boolean; icon: JSX.Element }> = [
  {
    view: "personal_nuevo",
    label: "Alta de personal",
    shortLabel: "Personal",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    view: "equipo_nuevo",
    label: "Alta de equipo",
    shortLabel: "Equipo",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    view: "bateria_nueva",
    label: "Alta de batería",
    shortLabel: "Batería",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </svg>
    ),
  },
  {
    view: "grado_nuevo",
    label: "Alta de grado",
    shortLabel: "Grado",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    view: "usuarios",
    label: "Alta de usuario",
    shortLabel: "Usuario",
    adminOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v6m3-3h-6M5 20h8a2 2 0 002-2v-1a4 4 0 00-4-4H9a4 4 0 00-4 4v1a2 2 0 002 2zm8-13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const stockViews: Array<{ view: StockView; label: string; shortLabel: string; icon: JSX.Element }> = [
  {
    view: "stock_actual",
    label: "Estado Actual",
    shortLabel: "Actual",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    ),
  },
  {
    view: "stock_alta",
    label: "Alta de Stock",
    shortLabel: "Alta",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    view: "stock_baja",
    label: "Baja de Stock",
    shortLabel: "Baja",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  },
  {
    view: "stock_historial",
    label: "Historial",
    shortLabel: "Historial",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3M12 3a9 9 0 109 9" />
      </svg>
    ),
  },
];

function viewButtonClass(activeView: MainView, view: MainView) {
  return activeView === view
    ? "ej-view-active rounded-lg px-3 py-2 text-sm font-semibold"
    : "ej-view-idle rounded-lg px-3 py-2 text-sm font-semibold";
}

function configOptionClass(activeView: MainView, view: ConfigView) {
  return activeView === view
    ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
    : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100";
}

function summaryOptionClass(activeView: MainView, view: SummaryView) {
  return activeView === view
    ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
    : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100";
}

function createOptionClass(activeView: MainView, view: CreateView) {
  return activeView === view
    ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
    : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100";
}

function stockOptionClass(activeView: MainView, view: StockView) {
  return activeView === view
    ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
    : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100";
}

function menuContainerClass(isOpen: boolean) {
  return `relative flex-1 ${isOpen ? "z-20" : "z-0"}`;
}

function menuPanelClass(desktopWidthClass: string) {
  return `absolute left-0 right-0 top-full z-30 mt-2 rounded-xl border border-stone-300 bg-white p-2 shadow-xl sm:left-auto sm:right-0 ${desktopWidthClass}`;
}

export function MainNavigation({
  activeView,
  canWrite,
  isAdmin,
  showConfigViews,
  isConfigView,
  configMenuRef,
  onSelectView,
  onSetConfigViews,
}: MainNavigationProps) {
  const [showSummaryViews, setShowSummaryViews] = useState(false);
  const [showCreateViews, setShowCreateViews] = useState(false);
  const [showStockViews, setShowStockViews] = useState(false);
  const summaryMenuRef = useRef<HTMLDivElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const stockMenuRef = useRef<HTMLDivElement | null>(null);
  const isSummaryView = activeView === "equipo_resumen" || activeView === "tallas_resumen";
  const isStockView =
    activeView === "stock" ||
    activeView === "stock_actual" ||
    activeView === "stock_alta" ||
    activeView === "stock_baja" ||
    activeView === "stock_historial";
  const isCreateView =
    activeView === "personal_nuevo" ||
    activeView === "equipo_nuevo" ||
    activeView === "bateria_nueva" ||
    activeView === "grado_nuevo" ||
    activeView === "usuarios";

  function closeLocalMenus() {
    setShowSummaryViews(false);
    setShowCreateViews(false);
    setShowStockViews(false);
  }

  function closeAllMenus() {
    closeLocalMenus();
    onSetConfigViews(false);
  }

  function handleSelectView(view: MainView) {
    closeAllMenus();
    onSelectView(view);
  }

  function handleToggleStockViews() {
    const next = !showStockViews;
    setShowStockViews(next);
    setShowSummaryViews(false);
    setShowCreateViews(false);
    onSetConfigViews(false);
  }

  function handleToggleSummaryViews() {
    const next = !showSummaryViews;
    setShowSummaryViews(next);
    setShowStockViews(false);
    setShowCreateViews(false);
    onSetConfigViews(false);
  }

  function handleToggleCreateViews() {
    const next = !showCreateViews;
    setShowCreateViews(next);
    setShowStockViews(false);
    setShowSummaryViews(false);
    onSetConfigViews(false);
  }

  function handleToggleConfigViews() {
    closeLocalMenus();
    onSetConfigViews(!showConfigViews);
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (createMenuRef.current && event.target instanceof Node && !createMenuRef.current.contains(event.target)) {
        setShowCreateViews(false);
      }
      if (stockMenuRef.current && event.target instanceof Node && !stockMenuRef.current.contains(event.target)) {
        setShowStockViews(false);
      }
      if (!summaryMenuRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (summaryMenuRef.current.contains(event.target)) return;
      setShowSummaryViews(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowCreateViews(false);
      setShowStockViews(false);
      setShowSummaryViews(false);
    }

    if (!showSummaryViews && !showCreateViews && !showStockViews) return;

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showSummaryViews, showCreateViews, showStockViews]);

  return (
    <section className="ej-card relative isolate z-[220] mt-4 overflow-visible rounded-2xl p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Navegación</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={() => handleSelectView("personal")} className={`${viewButtonClass(activeView, "personal")} group relative flex-1 overflow-hidden transition-all`}>
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Personal</span>
          </div>
        </button>
        <button type="button" onClick={() => handleSelectView("hoja_matrix")} className={`${viewButtonClass(activeView, "hoja_matrix")} group relative flex-1 overflow-hidden transition-all`}>
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <span>Hoja Matriz</span>
          </div>
        </button>
        <div ref={stockMenuRef} className={menuContainerClass(showStockViews)}>
          <button
            type="button"
            onClick={handleToggleStockViews}
            aria-haspopup="menu"
            aria-expanded={showStockViews}
            aria-controls="menu-stock"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isStockView || showStockViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7H4m16 5H4m16 5H4M8 4v16" />
            </svg>
            <span>Stock</span>
            <svg className={`h-3 w-3 transition-transform ${showStockViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showStockViews ? (
            <div
              id="menu-stock"
              role="menu"
              className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de stock</p>
              <div className="grid grid-cols-1 gap-1.5">
                {stockViews.map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => handleSelectView(item.view)}
                    className={stockOptionClass(activeView, item.view)}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div ref={summaryMenuRef} className={menuContainerClass(showSummaryViews)}>
          <button
            type="button"
            onClick={handleToggleSummaryViews}
            aria-haspopup="menu"
            aria-expanded={showSummaryViews}
            aria-controls="menu-resumenes"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isSummaryView || showSummaryViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M4 12h10M4 5h16" />
            </svg>
            <span>Resúmenes</span>
            <svg className={`h-3 w-3 transition-transform ${showSummaryViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSummaryViews ? (
            <div
              id="menu-resumenes"
              role="menu"
              className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de resumen</p>
              <div className="grid grid-cols-1 gap-1.5">
                {summaryViews.map((item) => (
                  <button
                    key={item.view}
                    type="button"
                    onClick={() => handleSelectView(item.view)}
                    className={summaryOptionClass(activeView, item.view)}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {canWrite ? (
          <div ref={createMenuRef} className={menuContainerClass(showCreateViews)}>
            <button
              type="button"
              onClick={handleToggleCreateViews}
              aria-haspopup="menu"
              aria-expanded={showCreateViews}
              aria-controls="menu-altas"
              className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                isCreateView || showCreateViews ? "ej-view-active" : "ej-view-idle"
              }`}
            >
              <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Altas</span>
              <svg className={`h-3 w-3 transition-transform ${showCreateViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showCreateViews ? (
              <div
                id="menu-altas"
                role="menu"
                className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
              >
                <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Pantallas de alta</p>
                <div className="grid grid-cols-1 gap-1.5">
                {createViews
                    .filter((item) => item.view !== "bateria_nueva" && item.view !== "grado_nuevo")
                    .filter((item) => (item.adminOnly ? isAdmin : true))
                    .map((item) => (
                      <button
                        key={item.view}
                        type="button"
                        onClick={() => handleSelectView(item.view)}
                        className={createOptionClass(activeView, item.view)}
                      >
                        {item.icon}
                        <span className="hidden sm:inline">{item.label}</span>
                        <span className="sm:hidden">{item.shortLabel}</span>
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <button type="button" onClick={() => handleSelectView("formularios")} className={`${viewButtonClass(activeView, "formularios")} group relative flex-1 overflow-hidden transition-all`}>
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m-9 12h12a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Formularios</span>
          </div>
        </button>
        <div ref={configMenuRef} className={menuContainerClass(showConfigViews)}>
          <button
            type="button"
            onClick={handleToggleConfigViews}
            aria-haspopup="menu"
            aria-expanded={showConfigViews}
            aria-controls="menu-configuracion"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isConfigView || showConfigViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Configuración</span>
            <svg className={`h-3 w-3 transition-transform ${showConfigViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showConfigViews ? (
            <div
              id="menu-configuracion"
              role="menu"
              className={menuPanelClass("sm:w-[360px] sm:min-w-[360px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de configuración</p>
              <div className="grid grid-cols-1 gap-1.5">
                {configViews
                  .filter((item) => item.view !== "grados" && item.view !== "baterias")
                  .filter((item) => (item.adminOnly ? isAdmin : true))
                  .map((item) => (
                    <button key={item.view} type="button" onClick={() => handleSelectView(item.view)} className={configOptionClass(activeView, item.view)}>
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
