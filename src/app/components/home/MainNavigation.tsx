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
  Box,
  Button,
  Collapse,
  IconButton,
  Popover,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AddCircleOutlineRoundedIcon from "@mui/icons-material/AddCircleOutlineRounded";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import GridViewOutlinedIcon from "@mui/icons-material/GridViewOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import Groups2OutlinedIcon from "@mui/icons-material/Groups2Outlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MilitaryTechOutlinedIcon from "@mui/icons-material/MilitaryTechOutlined";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import QueryStatsOutlinedIcon from "@mui/icons-material/QueryStatsOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ViewAgendaOutlinedIcon from "@mui/icons-material/ViewAgendaOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
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

const materialIconProps = { fontSize: "small" as const };

const icons = {
  dashboard: <DashboardOutlinedIcon {...materialIconProps} />,
  personal: <Groups2OutlinedIcon {...materialIconProps} />,
  oficiales: <MilitaryTechOutlinedIcon {...materialIconProps} />,
  stock: <Inventory2OutlinedIcon {...materialIconProps} />,
  etiquetado: <SellOutlinedIcon {...materialIconProps} />,
  resumen: <QueryStatsOutlinedIcon {...materialIconProps} />,
  altas: <AddCircleOutlineRoundedIcon {...materialIconProps} />,
  prestamos: <DescriptionOutlinedIcon {...materialIconProps} />,
  config: <SettingsOutlinedIcon {...materialIconProps} />,
  matrix: <GridViewOutlinedIcon {...materialIconProps} />,
  resumenEquipo: <ViewAgendaOutlinedIcon {...materialIconProps} />,
  codigo: <QrCode2OutlinedIcon {...materialIconProps} />,
  cajas: <InventoryOutlinedIcon {...materialIconProps} />,
  imprimir: <PrintOutlinedIcon {...materialIconProps} />,
  bell: <NotificationsOutlinedIcon {...materialIconProps} />,
  lock: <LockOutlinedIcon {...materialIconProps} />,
  users: <GroupOutlinedIcon {...materialIconProps} />,
  audit: <FactCheckOutlinedIcon {...materialIconProps} />,
  minus: <RemoveOutlinedIcon {...materialIconProps} />,
  history: <HistoryOutlinedIcon {...materialIconProps} />,
  trash: <DeleteOutlineOutlinedIcon {...materialIconProps} />,
  search: (
    <svg
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
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

function navButtonSx(active: boolean, collapsed: boolean) {
  return {
    position: "relative",
    px: collapsed ? 0 : 1.5,
    justifyContent: collapsed ? "center" : "flex-start",
    width: "100%",
    minWidth: 0,
    flexShrink: 0,
    whiteSpace: "nowrap",
    minHeight: 44,
    borderRadius: "12px",
    border: "1px solid",
    borderColor: active ? "rgba(255, 204, 0, 0.4)" : "rgba(255, 255, 255, 0.12)",
    background: active
      ? "linear-gradient(135deg, rgba(255, 204, 0, 0.25) 0%, rgba(255, 204, 0, 0.1) 100%)"
      : "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(12px)",
    color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.85)",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    textTransform: "none",
    transition:
      "background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease",
    "& .MuiButton-startIcon": {
      margin: 0,
      color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.6)",
      transition: "margin 0.2s ease, color 0.2s ease",
      ...(collapsed ? {} : { marginRight: 1.5 }),
    },
    "&:hover": {
      borderColor: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.3)",
      background: active
        ? "linear-gradient(135deg, rgba(255, 204, 0, 0.35) 0%, rgba(255, 204, 0, 0.15) 100%)"
        : "rgba(255, 255, 255, 0.08)",
      transform: "translateY(-1px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    },
  };
}

function inlineSubmenuButtonSx(active: boolean) {
  return {
    justifyContent: "flex-start",
    minWidth: 0,
    minHeight: 40,
    borderRadius: "8px",
    border: "1px solid",
    borderColor: active ? "rgba(255, 204, 0, 0.3)" : "transparent",
    bgcolor: active ? "rgba(255, 204, 0, 0.12)" : "transparent",
    color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.78)",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    textTransform: "none",
    px: 1.5,
    ml: 1,
    width: "calc(100% - 8px)",
    transition: "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
    "& .MuiButton-startIcon": {
      fontSize: "1rem",
      marginRight: 1.25,
      opacity: 0.85,
    },
    "&:hover": {
      color: "rgba(255, 255, 255, 0.98)",
      bgcolor: "rgba(255, 255, 255, 0.08)",
    },
  };
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
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelId = `submenu-${toSubmenuSlug(title)}`;
  const popoverOpen = Boolean(anchorEl);

  const closePopover = (restoreFocus: boolean) => {
    setAnchorEl(null);
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
      <Box sx={{ mb: 1, display: "flex", justifyContent: "center" }}>
        <Tooltip title={title} placement="right">
          <IconButton
            ref={triggerRef}
            aria-label={title}
            aria-expanded={popoverOpen}
            aria-controls={popoverOpen ? panelId : undefined}
            aria-haspopup="true"
            onClick={(event) => {
              if (popoverOpen) {
                closePopover(false);
              } else {
                setAnchorEl(event.currentTarget);
              }
            }}
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              color:
                popoverOpen || hasActiveChild
                  ? "var(--color-ejercito-gold)"
                  : "rgba(255, 255, 255, 0.7)",
              bgcolor: popoverOpen || hasActiveChild ? "rgba(255, 204, 0, 0.14)" : "transparent",
              transition: "background-color 0.2s ease, color 0.2s ease",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.08)",
              },
            }}
          >
            {icon}
          </IconButton>
        </Tooltip>
        <Popover
          id={panelId}
          open={popoverOpen}
          anchorEl={anchorEl}
          onClose={(_event, reason) => closePopover(reason === "escapeKeyDown")}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                ml: 1,
                minWidth: 230,
                maxWidth: 280,
                p: 1.25,
                borderRadius: "12px",
                bgcolor: "rgba(22, 28, 22, 0.98)",
                color: "common.white",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
              },
            },
          }}
        >
          <Box onKeyDown={handleGroupKeyDown} role="region" aria-label={title}>
            <Typography
              sx={{
                px: 1.25,
                py: 0.5,
                mb: 0.5,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "var(--color-ejercito-gold)",
                textTransform: "uppercase",
              }}
            >
              {title}
            </Typography>
            <Stack spacing={0.5} onClick={() => closePopover(false)}>
              {children}
            </Stack>
          </Box>
        </Popover>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 1.5 }} onKeyDown={handleGroupKeyDown}>
      <Button
        ref={triggerRef}
        fullWidth
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          justifyContent: "flex-start",
          minHeight: 40,
          px: 1.5,
          py: 1,
          borderRadius: "12px",
          color: "rgba(255, 255, 255, 0.65)",
          textTransform: "none",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.05em",
          transition: "background-color 0.2s ease, color 0.2s ease",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.06)",
            color: "rgba(255, 255, 255, 0.95)",
          },
        }}
        startIcon={icon}
        endIcon={
          <ExpandMoreRoundedIcon
            sx={{
              fontSize: "1rem",
              ml: "auto",
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        }
      >
        {title.toUpperCase()}
      </Button>
      <Collapse in={isOpen}>
        <Box id={panelId}>
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {children}
          </Stack>
        </Box>
      </Collapse>
    </Box>
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
  const isMobileViewport = useMediaQuery("(max-width:899.95px)", { noSsr: true });
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
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        fontFamily: 'var(--fuentePrincipal, "Helvetica Neue", Helvetica, Arial, sans-serif)',
      }}
    >
      {onToggleCollapsed && !isMobileViewport && (
        <Box
          sx={{
            display: "flex",
            justifyContent: effectiveCollapsed ? "center" : "flex-end",
            mb: 1,
          }}
        >
          <Tooltip title={effectiveCollapsed ? "Expandir menú" : "Colapsar menú"} placement="right">
            <IconButton
              aria-label={effectiveCollapsed ? "Expandir menú" : "Colapsar menú"}
              aria-expanded={!effectiveCollapsed}
              onClick={onToggleCollapsed}
              sx={{
                minWidth: 44,
                minHeight: 44,
                color: "rgba(255, 255, 255, 0.6)",
                "&:hover": {
                  color: "var(--color-ejercito-gold)",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                },
                transition: "background-color 0.2s ease, color 0.2s ease",
              }}
            >
              {effectiveCollapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {onOpenSearch && (
        <Tooltip
          title="Buscar personal"
          placement="right"
          disableHoverListener={!effectiveCollapsed}
        >
          <Button
            variant="text"
            aria-label="Buscar personal"
            onClick={onOpenSearch}
            startIcon={icons.search}
            sx={{
              ...navButtonSx(false, effectiveCollapsed),
              mb: 1,
              bgcolor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.8)",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.08)",
                borderColor: "rgba(255, 255, 255, 0.2)",
              },
            }}
          >
            {!effectiveCollapsed && "Buscar personal"}
          </Button>
        </Tooltip>
      )}

      <Tooltip
        title="Página Principal"
        placement="right"
        disableHoverListener={!effectiveCollapsed}
      >
        <Button
          variant="text"
          aria-label="Página Principal"
          aria-current={isDashboardView ? "page" : undefined}
          onClick={() => handleSelectView("dashboard")}
          startIcon={icons.dashboard}
          sx={navButtonSx(isDashboardView, effectiveCollapsed)}
        >
          {!effectiveCollapsed && "Página Principal"}
        </Button>
      </Tooltip>

      <ExpandedMenuGroup
        title="Personal"
        icon={icons.personal}
        collapsed={effectiveCollapsed}
        hasActiveChild={personalViews.some((equipo) => equipo.view === activeView)}
      >
        {personalViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Oficiales"
        icon={icons.oficiales}
        collapsed={effectiveCollapsed}
        hasActiveChild={oficialesViews.some((equipo) => equipo.view === activeView)}
      >
        {oficialesViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Stock"
        icon={icons.stock}
        collapsed={effectiveCollapsed}
        hasActiveChild={filteredStockViews.some((equipo) => equipo.view === activeView)}
      >
        {filteredStockViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Etiquetado"
        icon={icons.etiquetado}
        collapsed={effectiveCollapsed}
        hasActiveChild={etiquetadoViews.some((equipo) => equipo.view === activeView)}
      >
        {etiquetadoViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Resumen de tallas"
        icon={icons.resumen}
        collapsed={effectiveCollapsed}
        hasActiveChild={tallasResumenViews.some((equipo) => equipo.view === activeView)}
      >
        {tallasResumenViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
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
            <Button
              key={equipo.view}
              variant="text"
              aria-current={activeView === equipo.view ? "page" : undefined}
              startIcon={equipo.icon}
              onClick={() => handleSelectView(equipo.view)}
              sx={inlineSubmenuButtonSx(activeView === equipo.view)}
            >
              {equipo.label}
            </Button>
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
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Artículos"
        icon={icons.stock}
        collapsed={effectiveCollapsed}
        hasActiveChild={filteredArticuloViews.some((equipo) => equipo.view === activeView)}
      >
        {filteredArticuloViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup
        title="Configuración"
        icon={icons.config}
        collapsed={effectiveCollapsed}
        hasActiveChild={filteredConfigViews.some((equipo) => equipo.view === activeView)}
      >
        {filteredConfigViews.map((equipo) => (
          <Button
            key={equipo.view}
            variant="text"
            aria-current={activeView === equipo.view ? "page" : undefined}
            startIcon={equipo.icon}
            onClick={() => handleSelectView(equipo.view)}
            sx={inlineSubmenuButtonSx(activeView === equipo.view)}
          >
            {equipo.label}
          </Button>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Manuales" icon={icons.prestamos} collapsed={effectiveCollapsed}>
        <Button
          variant="text"
          startIcon={icons.prestamos}
          onClick={() =>
            window.open("/docs/manual-usuario-final.pdf", "_blank", "noopener,noreferrer")
          }
          sx={inlineSubmenuButtonSx(false)}
        >
          Manual de Usuario Final
        </Button>
        <Button
          variant="text"
          startIcon={icons.prestamos}
          onClick={() =>
            window.open(
              "/docs/presentacion-producto-deposito-art1.pdf",
              "_blank",
              "noopener,noreferrer"
            )
          }
          sx={inlineSubmenuButtonSx(false)}
        >
          Presentación del Producto
        </Button>
      </ExpandedMenuGroup>
    </Box>
  );
}
