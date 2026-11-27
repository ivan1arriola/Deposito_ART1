"use client";

import {
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Archive,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  History,
  LayoutDashboard,
  LayoutGrid,
  Lock,
  Medal,
  Minus,
  Package,
  PlusCircle,
  Printer,
  QrCode,
  Rows3,
  Search,
  Settings,
  Tag,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { useMediaQuery } from "@/app/hooks/useMediaQuery";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { normalizeSearchText } from "@/lib/spanish-text";
import type { MainView } from "@/types/views";

type ConfigView = Extract<
  MainView,
  | "grados"
  | "baterias"
  | "equipos"
  | "recordatorios"
  | "firmas"
  | "usuarios"
  | "auditoria"
  | "usuario_nuevo"
  | "papelera"
>;
type ArticuloView = Extract<
  MainView,
  | "articulos"
  | "articulo_nuevo"
  | "articulo_stock_ingreso"
  | "articulo_entrega_personal"
  | "articulo_entregas_historial"
>;
type CreateView = Extract<MainView, "personal_nuevo" | "oficial_nuevo" | "suboficial_nuevo">;
type StockView = Extract<
  MainView,
  | "stock"
  | "stock_total"
  | "stock_actual"
  | "stock_alta"
  | "stock_baja"
  | "stock_historial"
  | "stock_prestamos"
  | "equipos"
  | "tipos_equipo"
  | "equipo_nuevo"
  | "movimientos_por_equipo"
  | "equipos_unificar"
>;
type PrestamosView = Extract<
  MainView,
  | "prestamos_registrar"
  | "prestamos_vigentes"
  | "prestamos_historial"
  | "movimientos_recintos"
  | "formularios"
>;
type TallasResumenView = Extract<
  MainView,
  | "tallas_resumen"
  | "tallas_resumen_subalternos_unidad"
  | "tallas_resumen_subalternos_bateria"
  | "tallas_resumen_oficiales_suboficiales"
>;
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
  embedded?: boolean;
  expandSubmenus?: boolean;
  hideContainerChrome?: boolean;
  onOpenSearch?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

type NavOption<T extends MainView> = {
  view: T;
  label: string;
  shortLabel?: string;
  icon: JSX.Element;
  adminOnly?: boolean;
  writeOnly?: boolean;
};

const iconProps = { className: "h-[18px] w-[18px] shrink-0", "aria-hidden": true as const };

const icons = {
  dashboard: <LayoutDashboard {...iconProps} />,
  personal: <UsersRound {...iconProps} />,
  oficiales: <Medal {...iconProps} />,
  stock: <Package {...iconProps} />,
  etiquetado: <Tag {...iconProps} />,
  resumen: <BarChart3 {...iconProps} />,
  altas: <PlusCircle {...iconProps} />,
  prestamos: <FileText {...iconProps} />,
  config: <Settings {...iconProps} />,
  matrix: <LayoutGrid {...iconProps} />,
  resumenEquipo: <Rows3 {...iconProps} />,
  codigo: <QrCode {...iconProps} />,
  cajas: <Archive {...iconProps} />,
  imprimir: <Printer {...iconProps} />,
  bell: <Bell {...iconProps} />,
  lock: <Lock {...iconProps} />,
  users: <Users {...iconProps} />,
  audit: <ClipboardCheck {...iconProps} />,
  minus: <Minus {...iconProps} />,
  history: <History {...iconProps} />,
  trash: <Trash2 {...iconProps} />,
  search: <Search {...iconProps} />,
};

const configViews: Array<NavOption<ConfigView>> = [
  { view: "grados", label: "Grados registrados", icon: icons.resumen },
  { view: "baterias", label: "Baterías registradas", icon: icons.cajas },
  { view: "firmas", label: "Firmas institucionales", icon: icons.lock, adminOnly: true },
  { view: "recordatorios", label: "Recordatorios", icon: icons.bell },
  { view: "usuarios", label: "Usuarios registrados", icon: icons.users, adminOnly: true },
  { view: "usuario_nuevo", label: "Alta de usuario", icon: icons.altas, adminOnly: true },
  { view: "auditoria", label: "Auditoría detallada", icon: icons.audit, adminOnly: true },
  { view: "papelera", label: "Papelera de reciclaje", icon: icons.trash, adminOnly: true },
];

const articuloViews: Array<NavOption<ArticuloView>> = [
  { view: "articulos", label: "Catálogo de Artículos", icon: icons.stock },
  {
    view: "articulo_entrega_personal",
    label: "Entrega a personal",
    icon: icons.prestamos,
    writeOnly: true,
  },
  { view: "articulo_entregas_historial", label: "Historial de entregas", icon: icons.history },
  { view: "articulo_stock_ingreso", label: "Ingreso de stock", icon: icons.altas, writeOnly: true },
  { view: "articulo_nuevo", label: "Alta de artículo", icon: icons.altas, adminOnly: true },
];

const createViews: Array<NavOption<CreateView>> = [
  {
    view: "personal_nuevo",
    label: "Alta de subalterno",
    shortLabel: "Subalterno",
    icon: icons.altas,
  },
  { view: "oficial_nuevo", label: "Alta de oficial", shortLabel: "Oficial", icon: icons.altas },
  {
    view: "suboficial_nuevo",
    label: "Alta de suboficial",
    shortLabel: "Suboficial",
    icon: icons.altas,
  },
];

const stockViews: Array<NavOption<StockView>> = [
  {
    view: "equipo_nuevo",
    label: "Alta de equipo",
    shortLabel: "Alta Eq.",
    icon: icons.altas,
    writeOnly: true,
  },
  { view: "equipos", label: "Catálogo de Equipos", shortLabel: "Equipos", icon: icons.stock },
  { view: "tipos_equipo", label: "Tipos de equipo", shortLabel: "Tipos", icon: icons.resumen },
  {
    view: "equipos_unificar",
    label: "Unificar Equipos",
    shortLabel: "Unificar",
    icon: icons.stock,
    writeOnly: true,
  },
  { view: "stock_total", label: "Stock de Equipos", shortLabel: "Total", icon: icons.resumen },
  {
    view: "stock_actual",
    label: "Stock de Equipos en Depósito",
    shortLabel: "Depósito",
    icon: icons.stock,
  },
  { view: "stock_alta", label: "Alta de stock", shortLabel: "Alta", icon: icons.altas },
  { view: "stock_baja", label: "Baja de stock", shortLabel: "Baja", icon: icons.minus },
  {
    view: "stock_historial",
    label: "Historial de Stock",
    shortLabel: "Historial",
    icon: icons.history,
  },
  {
    view: "movimientos_por_equipo",
    label: "Movimientos por equipo",
    shortLabel: "Movimientos",
    icon: icons.history,
  },
];

const prestamosViews: Array<NavOption<PrestamosView>> = [
  {
    view: "prestamos_registrar",
    label: "Registrar préstamo",
    shortLabel: "Registrar",
    icon: icons.altas,
    writeOnly: true,
  },
  {
    view: "prestamos_vigentes",
    label: "Préstamos vigentes",
    shortLabel: "Vigentes",
    icon: icons.prestamos,
  },
  {
    view: "prestamos_historial",
    label: "Historial de Préstamos",
    shortLabel: "Historial",
    icon: icons.history,
  },
  {
    view: "movimientos_recintos",
    label: "Asignaciones a Recintos",
    shortLabel: "Recintos",
    icon: icons.history,
  },
];

const etiquetadoViews: Array<NavOption<EtiquetadoView>> = [
  {
    view: "etiquetado_codigos_sie",
    label: "Códigos SIE",
    shortLabel: "Códigos",
    icon: icons.codigo,
  },
  {
    view: "etiquetado_listado_cajas",
    label: "Listado de cajas",
    shortLabel: "Cajas",
    icon: icons.cajas,
  },
  {
    view: "etiquetado_imprimir_todas",
    label: "Imprimir todas",
    shortLabel: "Imprimir",
    icon: icons.imprimir,
  },
];

const personalViews: Array<
  NavOption<
    Extract<
      MainView,
      "personal" | "hoja_matrix" | "equipo_resumen" | "movimientos_fuera_hoja" | "personal_bajas"
    >
  >
> = [
  { view: "personal", label: "Personal subalterno", icon: icons.personal },
  { view: "hoja_matrix", label: "Hoja matriz", icon: icons.matrix },
  { view: "equipo_resumen", label: "Resumen de equipo en baterías", icon: icons.resumenEquipo },
  { view: "movimientos_fuera_hoja", label: "Movimientos fuera de hoja", icon: icons.history },
  { view: "personal_bajas", label: "Bajas y devoluciones", icon: icons.trash },
];

const oficialesViews: Array<
  NavOption<
    Extract<MainView, "oficiales" | "suboficiales" | "oficiales_resumen" | "suboficiales_resumen">
  >
> = [
  { view: "oficiales", label: "Oficiales", icon: icons.oficiales },
  { view: "suboficiales", label: "Suboficiales", icon: icons.oficiales },
  { view: "oficiales_resumen", label: "Resumen de talles (oficiales)", icon: icons.resumen },
  { view: "suboficiales_resumen", label: "Resumen de talles (suboficiales)", icon: icons.resumen },
];

const tallasResumenViews: Array<NavOption<TallasResumenView>> = [
  { view: "tallas_resumen", label: "Panel general", icon: icons.resumen },
  { view: "tallas_resumen_subalternos_unidad", label: "Subalternos (unidad)", icon: icons.resumen },
  {
    view: "tallas_resumen_subalternos_bateria",
    label: "Subalternos por batería",
    icon: icons.resumen,
  },
  {
    view: "tallas_resumen_oficiales_suboficiales",
    label: "Oficiales y suboficiales",
    icon: icons.resumen,
  },
];

function navButtonClass(active: boolean, collapsed: boolean) {
  return [
    "relative inline-flex w-full min-w-0 min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl border text-sm backdrop-blur-md transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
    collapsed ? "justify-center px-0" : "justify-start gap-3 px-3",
    active
      ? "border-[rgba(255,204,0,0.4)] bg-[linear-gradient(135deg,rgba(255,204,0,0.25)_0%,rgba(255,204,0,0.1)_100%)] font-bold text-[var(--color-ejercito-gold)] hover:border-[var(--color-ejercito-gold)] hover:bg-[linear-gradient(135deg,rgba(255,204,0,0.35)_0%,rgba(255,204,0,0.15)_100%)]"
      : "border-white/12 bg-white/[0.04] font-medium text-white/85 hover:border-white/30 hover:bg-white/[0.08]",
    "hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)]",
  ].join(" ");
}

function inlineSubmenuButtonClass(active: boolean) {
  return [
    "ml-2 inline-flex min-h-10 w-[calc(100%-8px)] min-w-0 items-center justify-start gap-2.5 rounded-lg border px-3 text-left text-[13px] transition-[background-color,border-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]",
    active
      ? "border-[rgba(255,204,0,0.3)] bg-[rgba(255,204,0,0.12)] font-bold text-[var(--color-ejercito-gold)]"
      : "border-transparent bg-transparent font-medium text-white/80 hover:bg-white/[0.08] hover:text-white",
  ].join(" ");
}

function toSubmenuSlug(title: string) {
  return normalizeSearchText(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ExpandedMenuGroup({
  title,
  icon,
  collapsed,
  hasActiveChild,
  children,
}: {
  title: string;
  icon: JSX.Element;
  collapsed?: boolean;
  hasActiveChild?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = `submenu-${toSubmenuSlug(title)}`;

  const closePopover = (restoreFocus: boolean) => {
    setPopoverOpen(false);
    if (restoreFocus) {
      window.setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  };

  const handleGroupKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    if (collapsed) {
      if (popoverOpen) {
        closePopover(true);
      }
    } else if (isOpen) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  if (collapsed) {
    return (
      <div className="mb-2 flex justify-center">
        <Popover
          open={popoverOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) {
              closePopover(false);
            } else {
              setPopoverOpen(true);
            }
          }}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <button
                  ref={triggerRef}
                  type="button"
                  aria-label={title}
                  aria-expanded={popoverOpen}
                  aria-controls={popoverOpen ? panelId : undefined}
                  aria-haspopup="true"
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] ${
                    popoverOpen || hasActiveChild
                      ? "bg-[rgba(255,204,0,0.14)] text-[var(--color-ejercito-gold)]"
                      : "bg-transparent text-white/70"
                  } hover:bg-white/[0.08]`}
                >
                  {icon}
                </button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">{title}</TooltipContent>
          </Tooltip>

          <PopoverContent
            id={panelId}
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              closePopover(true);
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
            }}
          >
            <div onKeyDown={handleGroupKeyDown} role="region" aria-label={title}>
              <p className="mb-1 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.06em] text-[var(--color-ejercito-gold)]">
                {title}
              </p>
              <div className="flex flex-col gap-1" onClick={() => closePopover(false)}>
                {children}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="mb-3" onKeyDown={handleGroupKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-10 w-full items-center justify-start gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold tracking-[0.05em] text-white/65 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
      >
        {icon}
        <span className="flex-1 truncate">{title.toUpperCase()}</span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>
      {isOpen ? (
        <div id={panelId} className="mt-1 flex flex-col gap-1">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MainNavigation({
  activeView,
  canWrite,
  isAdmin,
  onSelectView,
  onSetConfigViews,
  onOpenSearch,
  collapsed = false,
  onToggleCollapsed,
}: MainNavigationProps) {
  const isMobileViewport = useMediaQuery("(max-width: 899.95px)");
  const effectiveCollapsed = isMobileViewport ? false : collapsed;

  const isDashboardView = activeView === "dashboard";
  const filteredStockViews = stockViews.filter((equipo) => (equipo.writeOnly ? canWrite : true));
  const filteredPrestamosViews = prestamosViews.filter((equipo) =>
    equipo.writeOnly ? canWrite : true
  );
  const filteredCreateViews = createViews.filter((equipo) => (equipo.adminOnly ? isAdmin : true));
  const filteredArticuloViews = articuloViews.filter(
    (equipo) => (equipo.adminOnly ? isAdmin : true) && (equipo.writeOnly ? canWrite : true)
  );
  const filteredConfigViews = configViews.filter((equipo) => (equipo.adminOnly ? isAdmin : true));

  function closeAllMenus() {
    onSetConfigViews(false);
  }

  function handleSelectView(view: MainView) {
    closeAllMenus();
    onSelectView(view);
  }

  return (
    <TooltipProvider delayDuration={400}>
      <div
        className="flex w-full flex-col gap-2"
        style={{
          fontFamily: 'var(--fuentePrincipal, "Helvetica Neue", Helvetica, Arial, sans-serif)',
        }}
      >
        {onToggleCollapsed && !isMobileViewport && (
          <div className={`mb-2 flex ${effectiveCollapsed ? "justify-center" : "justify-end"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={effectiveCollapsed ? "Expandir menú" : "Colapsar menú"}
                  aria-expanded={!effectiveCollapsed}
                  onClick={onToggleCollapsed}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/60 transition-colors duration-200 hover:bg-white/[0.06] hover:text-[var(--color-ejercito-gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
                >
                  {effectiveCollapsed ? (
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {effectiveCollapsed ? "Expandir menú" : "Colapsar menú"}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {onOpenSearch && (
          <Tooltip open={effectiveCollapsed ? undefined : false}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Buscar personal"
                onClick={onOpenSearch}
                className={`${navButtonClass(false, effectiveCollapsed)} mb-2 border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.08]`}
              >
                {icons.search}
                {!effectiveCollapsed && <span>Buscar personal</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Buscar personal</TooltipContent>
          </Tooltip>
        )}

        <Tooltip open={effectiveCollapsed ? undefined : false}>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="Página Principal"
              aria-current={isDashboardView ? "page" : undefined}
              onClick={() => handleSelectView("dashboard")}
              className={navButtonClass(isDashboardView, effectiveCollapsed)}
            >
              {icons.dashboard}
              {!effectiveCollapsed && <span>Página Principal</span>}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Página Principal</TooltipContent>
        </Tooltip>

        <ExpandedMenuGroup
          title="Personal"
          icon={icons.personal}
          collapsed={effectiveCollapsed}
          hasActiveChild={personalViews.some((equipo) => equipo.view === activeView)}
        >
          {personalViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Oficiales"
          icon={icons.oficiales}
          collapsed={effectiveCollapsed}
          hasActiveChild={oficialesViews.some((equipo) => equipo.view === activeView)}
        >
          {oficialesViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Stock"
          icon={icons.stock}
          collapsed={effectiveCollapsed}
          hasActiveChild={filteredStockViews.some((equipo) => equipo.view === activeView)}
        >
          {filteredStockViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Etiquetado"
          icon={icons.etiquetado}
          collapsed={effectiveCollapsed}
          hasActiveChild={etiquetadoViews.some((equipo) => equipo.view === activeView)}
        >
          {etiquetadoViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Resumen de tallas"
          icon={icons.resumen}
          collapsed={effectiveCollapsed}
          hasActiveChild={tallasResumenViews.some((equipo) => equipo.view === activeView)}
        >
          {tallasResumenViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        {canWrite ? (
          <ExpandedMenuGroup
            title="Altas de Personal"
            icon={icons.altas}
            collapsed={effectiveCollapsed}
            hasActiveChild={filteredCreateViews.some((equipo) => equipo.view === activeView)}
          >
            {filteredCreateViews.map((equipo) => (
              <button
                key={equipo.view}
                type="button"
                aria-current={activeView === equipo.view ? "page" : undefined}
                onClick={() => handleSelectView(equipo.view)}
                className={inlineSubmenuButtonClass(activeView === equipo.view)}
              >
                {equipo.icon}
                <span className="truncate">{equipo.label}</span>
              </button>
            ))}
          </ExpandedMenuGroup>
        ) : null}

        <ExpandedMenuGroup
          title="Préstamos"
          icon={icons.prestamos}
          collapsed={effectiveCollapsed}
          hasActiveChild={filteredPrestamosViews.some((equipo) => equipo.view === activeView)}
        >
          {filteredPrestamosViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Artículos"
          icon={icons.stock}
          collapsed={effectiveCollapsed}
          hasActiveChild={filteredArticuloViews.some((equipo) => equipo.view === activeView)}
        >
          {filteredArticuloViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup
          title="Configuración"
          icon={icons.config}
          collapsed={effectiveCollapsed}
          hasActiveChild={filteredConfigViews.some((equipo) => equipo.view === activeView)}
        >
          {filteredConfigViews.map((equipo) => (
            <button
              key={equipo.view}
              type="button"
              aria-current={activeView === equipo.view ? "page" : undefined}
              onClick={() => handleSelectView(equipo.view)}
              className={inlineSubmenuButtonClass(activeView === equipo.view)}
            >
              {equipo.icon}
              <span className="truncate">{equipo.label}</span>
            </button>
          ))}
        </ExpandedMenuGroup>

        <ExpandedMenuGroup title="Manuales" icon={icons.prestamos} collapsed={effectiveCollapsed}>
          <button
            type="button"
            onClick={() =>
              window.open("/docs/manual-usuario-final.pdf", "_blank", "noopener,noreferrer")
            }
            className={inlineSubmenuButtonClass(false)}
          >
            {icons.prestamos}
            <span className="truncate">Manual de Usuario Final</span>
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(
                "/docs/presentacion-producto-deposito-art1.pdf",
                "_blank",
                "noopener,noreferrer"
              )
            }
            className={inlineSubmenuButtonClass(false)}
          >
            {icons.prestamos}
            <span className="truncate">Presentación del Producto</span>
          </button>
        </ExpandedMenuGroup>
      </div>
    </TooltipProvider>
  );
}
