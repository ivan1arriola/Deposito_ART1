"use client";

import { useEffect, useRef, useState, type JSX, type RefObject } from "react";
import type { MainView } from "@/types/views";

type ConfigView = Extract<MainView, "grados" | "baterias" | "equipos" | "recordatorios" | "firmas" | "usuarios" | "auditoria">;
type CreateView = Extract<MainView, "personal_nuevo" | "oficial_nuevo" | "suboficial_nuevo" | "bateria_nueva" | "grado_nuevo" | "usuario_nuevo">;
type StockView = Extract<MainView, "stock" | "stock_total" | "stock_actual" | "stock_alta" | "stock_baja" | "stock_historial" | "stock_prestamos" | "equipos" | "equipo_nuevo">;
type EtiquetadoView = Extract<
  MainView,
  "etiquetado_codigos_sie" | "etiquetado_listado_cajas" | "etiquetado_imprimir_todas"
>;

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
    view: "recordatorios",
    label: "Recordatorios",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 11V9a6 6 0 1112 0v2m-8 4h4m-6 0h8a2 2 0 002-2v-2H6v2a2 2 0 002 2z" />
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

const createViews: Array<{ view: CreateView; label: string; shortLabel: string; adminOnly?: boolean; icon: JSX.Element }> = [
  {
    view: "personal_nuevo",
    label: "Alta de subalterno",
    shortLabel: "Subalterno",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    view: "oficial_nuevo",
    label: "Alta de oficial",
    shortLabel: "Oficial",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17a4 4 0 100-8 4 4 0 000 8zm0 0v4m0-4h4m-4 0H7M5 13a6 6 0 1112 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z" />
      </svg>
    ),
  },
  {
    view: "suboficial_nuevo",
    label: "Alta de suboficial",
    shortLabel: "Suboficial",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17a4 4 0 100-8 4 4 0 000 8zm0 0v4m0-4h4m-4 0H7M5 13a6 6 0 1112 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z" />
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
    view: "usuario_nuevo",
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

const stockViews: Array<{ view: StockView; label: string; shortLabel: string; icon: JSX.Element; writeOnly?: boolean }> = [
  {
    view: "equipo_nuevo",
    label: "Alta de equipo",
    shortLabel: "Alta Eq.",
    writeOnly: true,
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    view: "equipos",
    label: "Equipos Registrados",
    shortLabel: "Equipos",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    view: "stock_total",
    label: "Total de Items",
    shortLabel: "Total",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16M4 12h16M4 19h16" />
      </svg>
    ),
  },
  {
    view: "stock_actual",
    label: "Deposito Interno",
    shortLabel: "Deposito",
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

const etiquetadoViews: Array<{ view: EtiquetadoView; label: string; shortLabel: string; icon: JSX.Element }> = [
  {
    view: "etiquetado_codigos_sie",
    label: "Codigos SIE",
    shortLabel: "Codigos SIE",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6M7 9h10M5 13h14M7 17h10M9 21h6" />
      </svg>
    ),
  },
  {
    view: "etiquetado_listado_cajas",
    label: "Listado de Cajas",
    shortLabel: "Listado Cajas",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    view: "etiquetado_imprimir_todas",
    label: "Imprimir Todas",
    shortLabel: "Imprimir Todas",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V4h12v5M6 14H4v6h16v-6h-2M8 14h8v6H8z" />
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

function groupedOptionClass(activeView: MainView, view: MainView) {
  return activeView === view
    ? "flex w-full items-center gap-2 rounded-lg border border-stone-900 bg-stone-900 px-3 py-2.5 text-left text-sm font-semibold text-white transition-colors"
    : "flex w-full items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition-colors hover:border-stone-400 hover:bg-stone-100";
}

function menuContainerClass(isOpen: boolean) {
  return `relative w-full sm:w-auto sm:min-w-[11rem] sm:flex-none ${isOpen ? "z-20" : "z-0"}`;
}

function menuPanelClass(desktopWidthClass: string) {
  return `absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] overflow-x-hidden rounded-xl border border-stone-300 bg-white p-2 shadow-xl sm:w-auto sm:max-w-none ${desktopWidthClass}`;
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
  const [showPersonalViews, setShowPersonalViews] = useState(false);
  const [showOficialesSuboficialesViews, setShowOficialesSuboficialesViews] = useState(false);
  const [showCreateViews, setShowCreateViews] = useState(false);
  const [showStockViews, setShowStockViews] = useState(false);
  const [showEtiquetadoViews, setShowEtiquetadoViews] = useState(false);
  const personalMenuRef = useRef<HTMLDivElement | null>(null);
  const oficialesSuboficialesMenuRef = useRef<HTMLDivElement | null>(null);
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const stockMenuRef = useRef<HTMLDivElement | null>(null);
  const etiquetadoMenuRef = useRef<HTMLDivElement | null>(null);
  const isPersonalView = activeView === "personal" || activeView === "hoja_matrix" || activeView === "equipo_resumen";
  const isOficialesView = activeView === "oficiales";
  const isSuboficialesView = activeView === "suboficiales";
  const isOficialesSuboficialesResumenView = activeView === "oficiales_suboficiales_resumen";
  const isOficialesSuboficialesView = isOficialesView || isSuboficialesView || isOficialesSuboficialesResumenView;
  const isSummaryView = activeView === "tallas_resumen";
  const isStockView =
    activeView === "stock" ||
    activeView === "equipos" ||
    activeView === "equipo_nuevo" ||
    activeView === "stock_total" ||
    activeView === "stock_actual" ||
    activeView === "stock_alta" ||
    activeView === "stock_baja" ||
    activeView === "stock_historial" ||
    activeView === "stock_prestamos";
  const isEtiquetadoView =
    activeView === "etiquetado_codigos_sie" ||
    activeView === "etiquetado_listado_cajas" ||
    activeView === "etiquetado_imprimir_todas";
  const isCreateView =
    activeView === "personal_nuevo" ||
    activeView === "oficial_nuevo" ||
    activeView === "suboficial_nuevo" ||
    activeView === "bateria_nueva" ||
    activeView === "grado_nuevo" ||
    activeView === "usuario_nuevo";

  function closeLocalMenus() {
    setShowPersonalViews(false);
    setShowOficialesSuboficialesViews(false);
    setShowCreateViews(false);
    setShowStockViews(false);
    setShowEtiquetadoViews(false);
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
    setShowPersonalViews(false);
    setShowOficialesSuboficialesViews(false);
    setShowCreateViews(false);
    setShowEtiquetadoViews(false);
    onSetConfigViews(false);
  }

  function handleTogglePersonalViews() {
    const next = !showPersonalViews;
    setShowPersonalViews(next);
    setShowStockViews(false);
    setShowOficialesSuboficialesViews(false);
    setShowCreateViews(false);
    setShowEtiquetadoViews(false);
    onSetConfigViews(false);
  }

  function handleToggleOficialesSuboficialesViews() {
    const next = !showOficialesSuboficialesViews;
    setShowOficialesSuboficialesViews(next);
    setShowPersonalViews(false);
    setShowStockViews(false);
    setShowCreateViews(false);
    setShowEtiquetadoViews(false);
    onSetConfigViews(false);
  }

  function handleToggleCreateViews() {
    const next = !showCreateViews;
    setShowCreateViews(next);
    setShowPersonalViews(false);
    setShowOficialesSuboficialesViews(false);
    setShowStockViews(false);
    setShowEtiquetadoViews(false);
    onSetConfigViews(false);
  }

  function handleToggleEtiquetadoViews() {
    const next = !showEtiquetadoViews;
    setShowEtiquetadoViews(next);
    setShowPersonalViews(false);
    setShowOficialesSuboficialesViews(false);
    setShowCreateViews(false);
    setShowStockViews(false);
    onSetConfigViews(false);
  }

  function handleToggleConfigViews() {
    closeLocalMenus();
    onSetConfigViews(!showConfigViews);
  }

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (personalMenuRef.current && event.target instanceof Node && !personalMenuRef.current.contains(event.target)) {
        setShowPersonalViews(false);
      }
      if (
        oficialesSuboficialesMenuRef.current &&
        event.target instanceof Node &&
        !oficialesSuboficialesMenuRef.current.contains(event.target)
      ) {
        setShowOficialesSuboficialesViews(false);
      }
      if (createMenuRef.current && event.target instanceof Node && !createMenuRef.current.contains(event.target)) {
        setShowCreateViews(false);
      }
      if (stockMenuRef.current && event.target instanceof Node && !stockMenuRef.current.contains(event.target)) {
        setShowStockViews(false);
      }
      if (etiquetadoMenuRef.current && event.target instanceof Node && !etiquetadoMenuRef.current.contains(event.target)) {
        setShowEtiquetadoViews(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setShowPersonalViews(false);
      setShowOficialesSuboficialesViews(false);
      setShowCreateViews(false);
      setShowStockViews(false);
      setShowEtiquetadoViews(false);
    }

    if (!showPersonalViews && !showOficialesSuboficialesViews && !showCreateViews && !showStockViews && !showEtiquetadoViews) return;

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showPersonalViews, showOficialesSuboficialesViews, showCreateViews, showStockViews, showEtiquetadoViews]);

  return (
    <section className="ej-card relative isolate z-[220] mt-4 overflow-visible rounded-2xl p-3 sm:p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Navegación</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        <div ref={personalMenuRef} className={menuContainerClass(showPersonalViews)}>
          <button
            type="button"
            onClick={handleTogglePersonalViews}
            aria-haspopup="menu"
            aria-expanded={showPersonalViews}
            aria-controls="menu-personal-subalterno"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isPersonalView || showPersonalViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="whitespace-nowrap">Personal subalterno</span>
            <svg className={`h-3 w-3 transition-transform ${showPersonalViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPersonalViews ? (
            <div
              id="menu-personal-subalterno"
              role="menu"
              className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de personal subalterno</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button type="button" onClick={() => handleSelectView("personal")} className={groupedOptionClass(activeView, "personal")}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Personal subalterno</span>
                </button>
                <button type="button" onClick={() => handleSelectView("hoja_matrix")} className={groupedOptionClass(activeView, "hoja_matrix")}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span>Hoja Matriz</span>
                </button>
                <button type="button" onClick={() => handleSelectView("equipo_resumen")} className={groupedOptionClass(activeView, "equipo_resumen")}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M7 3v4m10-4v4M6 12h4v8H6zM14 10h4v10h-4z" />
                  </svg>
                  <span>Resumen de equipo en baterías</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div ref={oficialesSuboficialesMenuRef} className={menuContainerClass(showOficialesSuboficialesViews)}>
          <button
            type="button"
            onClick={handleToggleOficialesSuboficialesViews}
            aria-haspopup="menu"
            aria-expanded={showOficialesSuboficialesViews}
            aria-controls="menu-oficiales-suboficiales"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isOficialesSuboficialesView || showOficialesSuboficialesViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17a4 4 0 100-8 4 4 0 000 8zm0 0v4m0-4h4m-4 0H7M5 13a6 6 0 1112 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z" />
            </svg>
            <span className="whitespace-nowrap">Oficiales y Suboficiales</span>
            <svg className={`h-3 w-3 transition-transform ${showOficialesSuboficialesViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showOficialesSuboficialesViews ? (
            <div
              id="menu-oficiales-suboficiales"
              role="menu"
              className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de oficiales y suboficiales</p>
              <div className="grid grid-cols-1 gap-1.5">
                <button type="button" onClick={() => handleSelectView("oficiales")} className={groupedOptionClass(activeView, "oficiales")}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17a4 4 0 100-8 4 4 0 000 8zm0 0v4m0-4h4m-4 0H7M5 13a6 6 0 1112 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z" />
                  </svg>
                  <span>Oficiales</span>
                </button>
                <button type="button" onClick={() => handleSelectView("suboficiales")} className={groupedOptionClass(activeView, "suboficiales")}>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17a4 4 0 100-8 4 4 0 000 8zm0 0v4m0-4h4m-4 0H7M5 13a6 6 0 1112 0v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z" />
                  </svg>
                  <span>Suboficiales</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectView("oficiales_suboficiales_resumen")}
                  className={groupedOptionClass(activeView, "oficiales_suboficiales_resumen")}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19h16M4 12h10M4 5h16" />
                  </svg>
                  <span>Resumen de talles (ambos)</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
            <span className="whitespace-nowrap">Stock y Equipos</span>
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
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de stock y equipos</p>
              <div className="grid grid-cols-1 gap-1.5">
                {stockViews
                  .filter((item) => (item.writeOnly ? canWrite : true))
                  .map((item) => (
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
        <div ref={etiquetadoMenuRef} className={menuContainerClass(showEtiquetadoViews)}>
          <button
            type="button"
            onClick={handleToggleEtiquetadoViews}
            aria-haspopup="menu"
            aria-expanded={showEtiquetadoViews}
            aria-controls="menu-etiquetado"
            className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
              isEtiquetadoView || showEtiquetadoViews ? "ej-view-active" : "ej-view-idle"
            }`}
          >
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6M7 9h10M5 13h14M7 17h10M9 21h6" />
            </svg>
            <span className="whitespace-nowrap">Etiquetado</span>
            <svg className={`h-3 w-3 transition-transform ${showEtiquetadoViews ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showEtiquetadoViews ? (
            <div
              id="menu-etiquetado"
              role="menu"
              className={menuPanelClass("sm:w-[300px] sm:min-w-[300px]")}
            >
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">Vistas de etiquetado</p>
              <div className="grid grid-cols-1 gap-1.5">
                {etiquetadoViews.map((viewItem) => (
                  <button
                    key={viewItem.view}
                    type="button"
                    onClick={() => handleSelectView(viewItem.view)}
                    className={groupedOptionClass(activeView, viewItem.view)}
                  >
                    {viewItem.icon}
                    <span className="hidden sm:inline">{viewItem.label}</span>
                    <span className="sm:hidden">{viewItem.shortLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => handleSelectView("tallas_resumen")}
          className={`group flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all sm:w-auto sm:min-w-[13rem] sm:flex-none ${
            isSummaryView ? "ej-view-active" : "ej-view-idle"
          }`}
        >
          <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20V10m5 10V4m5 16v-6M4 20h16" />
          </svg>
          <span className="whitespace-nowrap">Resumen de Tallas</span>
        </button>
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
              <span className="whitespace-nowrap">Altas</span>
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
        <button
          type="button"
          onClick={() => handleSelectView("formularios")}
          className={`${viewButtonClass(activeView, "formularios")} group relative w-full transition-all sm:w-auto sm:min-w-[10.5rem] sm:flex-none`}
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6M9 8h6m-9 12h12a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="whitespace-nowrap">Prestamos</span>
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
            <span className="whitespace-nowrap">Configuración</span>
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
