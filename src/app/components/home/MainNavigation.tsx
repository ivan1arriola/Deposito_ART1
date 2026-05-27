"use client";

import { useState, type JSX, type MouseEvent, type ReactNode, type RefObject } from "react";
import {
  Box,
  Button,
  Collapse,
  Divider,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
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
import type { MainView } from "@/types/views";

type ConfigView = Extract<MainView, "grados" | "baterias" | "equipos" | "recordatorios" | "firmas" | "usuarios" | "auditoria" | "usuario_nuevo" | "papelera">;
type ArticuloView = Extract<MainView, "articulos" | "articulo_nuevo" | "articulo_stock_ingreso" | "articulo_entrega_personal" | "articulo_entregas_historial">;
type CreateView = Extract<MainView, "personal_nuevo" | "oficial_nuevo" | "suboficial_nuevo">;
type StockView = Extract<
  MainView,
  "stock" | "stock_total" | "stock_actual" | "stock_alta" | "stock_baja" | "stock_historial" | "stock_prestamos" | "equipos" | "equipo_nuevo" | "movimientos_por_equipo" | "equipos_unificar"
>;
type PrestamosView = Extract<MainView, "prestamos_registrar" | "prestamos_vigentes" | "prestamos_historial" | "movimientos_recintos" | "formularios">;
type TallasResumenView = Extract<
  MainView,
  "tallas_resumen" | "tallas_resumen_subalternos_unidad" | "tallas_resumen_subalternos_bateria" | "tallas_resumen_oficiales_suboficiales"
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

type MenuKey = "personal" | "oficiales" | "stock" | "etiquetado" | "create" | "config";
type NavOption<T extends MainView> = {
  view: T;
  label: string;
  shortLabel?: string;
  icon: JSX.Element;
  adminOnly?: boolean;
  writeOnly?: boolean;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <ExpandMoreRoundedIcon
      fontSize="small"
      sx={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 180ms ease",
      }}
    />
  );
}

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
    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
  { view: "articulo_entrega_personal", label: "Entrega a personal", icon: icons.prestamos, writeOnly: true },
  { view: "articulo_entregas_historial", label: "Historial de entregas", icon: icons.history },
  { view: "articulo_stock_ingreso", label: "Ingreso de stock", icon: icons.altas, writeOnly: true },
  { view: "articulo_nuevo", label: "Alta de artículo", icon: icons.altas, adminOnly: true },
];

const createViews: Array<NavOption<CreateView>> = [
  { view: "personal_nuevo", label: "Alta de subalterno", shortLabel: "Subalterno", icon: icons.altas },
  { view: "oficial_nuevo", label: "Alta de oficial", shortLabel: "Oficial", icon: icons.altas },
  { view: "suboficial_nuevo", label: "Alta de suboficial", shortLabel: "Suboficial", icon: icons.altas },
];

const stockViews: Array<NavOption<StockView>> = [
  { view: "equipo_nuevo", label: "Alta de equipo", shortLabel: "Alta Eq.", icon: icons.altas, writeOnly: true },
  { view: "equipos", label: "Catálogo de Equipos", shortLabel: "Equipos", icon: icons.stock },
  { view: "equipos_unificar", label: "Unificar Equipos", shortLabel: "Unificar", icon: icons.stock, writeOnly: true },
  { view: "stock_total", label: "Stock de Equipos", shortLabel: "Total", icon: icons.resumen },
  { view: "stock_actual", label: "Stock de Equipos en Depósito", shortLabel: "Depósito", icon: icons.stock },
  { view: "stock_alta", label: "Alta de stock", shortLabel: "Alta", icon: icons.altas },
  { view: "stock_baja", label: "Baja de stock", shortLabel: "Baja", icon: icons.minus },
  { view: "stock_historial", label: "Historial de Stock", shortLabel: "Historial", icon: icons.history },
  { view: "movimientos_por_equipo", label: "Movimientos por equipo", shortLabel: "Movimientos", icon: icons.history },
];

const prestamosViews: Array<NavOption<PrestamosView>> = [
  { view: "prestamos_registrar", label: "Registrar prestamo", shortLabel: "Registrar", icon: icons.altas, writeOnly: true },
  { view: "prestamos_vigentes", label: "Prestamos vigentes", shortLabel: "Vigentes", icon: icons.prestamos },
  { view: "prestamos_historial", label: "Historial de Préstamos", shortLabel: "Historial", icon: icons.history },
  { view: "movimientos_recintos", label: "Asignaciones a Recintos", shortLabel: "Recintos", icon: icons.history },
];

const etiquetadoViews: Array<NavOption<EtiquetadoView>> = [
  { view: "etiquetado_codigos_sie", label: "Códigos SIE", shortLabel: "Códigos", icon: icons.codigo },
  { view: "etiquetado_listado_cajas", label: "Listado de cajas", shortLabel: "Cajas", icon: icons.cajas },
  { view: "etiquetado_imprimir_todas", label: "Imprimir todas", shortLabel: "Imprimir", icon: icons.imprimir },
];

const personalViews: Array<NavOption<Extract<MainView, "personal" | "hoja_matrix" | "equipo_resumen" | "movimientos_fuera_hoja" | "personal_bajas">>> = [
  { view: "personal", label: "Personal subalterno", icon: icons.personal },
  { view: "hoja_matrix", label: "Hoja matriz", icon: icons.matrix },
  { view: "equipo_resumen", label: "Resumen de equipo en baterías", icon: icons.resumenEquipo },
  { view: "movimientos_fuera_hoja", label: "Movimientos fuera de hoja", icon: icons.history },
  { view: "personal_bajas", label: "Bajas y devoluciones", icon: icons.trash },
];

const oficialesViews: Array<NavOption<Extract<MainView, "oficiales" | "suboficiales" | "oficiales_resumen" | "suboficiales_resumen">>> = [
  { view: "oficiales", label: "Oficiales", icon: icons.oficiales },
  { view: "suboficiales", label: "Suboficiales", icon: icons.oficiales },
  { view: "oficiales_resumen", label: "Resumen de talles (oficiales)", icon: icons.resumen },
  { view: "suboficiales_resumen", label: "Resumen de talles (suboficiales)", icon: icons.resumen },
];

const tallasResumenViews: Array<NavOption<TallasResumenView>> = [
  { view: "tallas_resumen", label: "Panel general", icon: icons.resumen },
  { view: "tallas_resumen_subalternos_unidad", label: "Subalternos (unidad)", icon: icons.resumen },
  { view: "tallas_resumen_subalternos_bateria", label: "Subalternos por batería", icon: icons.resumen },
  { view: "tallas_resumen_oficiales_suboficiales", label: "Oficiales y suboficiales", icon: icons.resumen },
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
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    "& .MuiButton-startIcon": {
      margin: 0,
      color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.6)",
      transition: "margin 0.2s",
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

function inlineSubmenuButtonSx(active: boolean, compact: boolean) {
  return {
    justifyContent: "flex-start",
    minWidth: 0,
    minHeight: 36,
    borderRadius: "8px",
    border: "1px solid",
    borderColor: active ? "rgba(255, 204, 0, 0.3)" : "transparent",
    bgcolor: active ? "rgba(255, 204, 0, 0.12)" : "transparent",
    color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.65)",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    textTransform: "none",
    px: 1.5,
    ml: 1,
    width: "calc(100% - 8px)",
    transition: "all 0.15s ease",
    "& .MuiButton-startIcon": {
      fontSize: "1rem",
      marginRight: 1.25,
      opacity: 0.8,
    },
    "&:hover": {
      color: "rgba(255, 255, 255, 0.95)",
      bgcolor: "rgba(255, 255, 255, 0.06)",
    },
  };
}

function menuPaperSx(compact: boolean) {
  return {
    mt: 1,
    p: 1,
    borderRadius: "16px",
    width: "280px",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    bgcolor: "rgba(20, 24, 20, 0.95)",
    backdropFilter: "blur(20px)",
    color: "rgba(255, 255, 255, 0.9)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  };
}

const menuHeaderSx = {
  px: 2,
  py: 1,
  color: "rgba(255, 255, 255, 0.5)",
  fontWeight: 700,
  fontSize: "0.65rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};

const menuDividerSx = {
  my: 1,
  borderColor: "rgba(255, 255, 255, 0.08)",
};

const menuItemSx = {
  borderRadius: "8px",
  mx: 0.5,
  py: 1.2,
  color: "rgba(255, 255, 255, 0.8)",
  transition: "all 0.2s ease",
  "&:hover": {
    bgcolor: "rgba(255, 255, 255, 0.08)",
    color: "#fff",
  },
  "&.Mui-selected": {
    bgcolor: "rgba(255, 204, 0, 0.15)",
    color: "var(--color-ejercito-gold)",
    fontWeight: 700,
  },
  "&.Mui-selected:hover": {
    bgcolor: "rgba(255, 204, 0, 0.2)",
  },
};

function ExpandedMenuGroup({
  title,
  icon,
  compact,
  collapsed,
  children,
}: {
  title: string;
  icon: JSX.Element;
  compact: boolean;
  collapsed?: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (collapsed) {
    return (
      <Box sx={{ mb: 1, display: "flex", justifyContent: "center" }}>
        <Tooltip title={title} placement="right">
          <IconButton
            onClick={() => setIsOpen(!isOpen)}
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              color: isOpen ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.45)",
              bgcolor: isOpen ? "rgba(255, 204, 0, 0.1)" : "transparent",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.04)",
              },
            }}
          >
            {icon}
          </IconButton>
        </Tooltip>
        {/* En modo colapsado, tal vez no queramos mostrar el Collapse o mostrarlo como Popover.
            Por ahora, lo ocultamos para mantener la limpieza. */}
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 1.5 }}>
      <Button
        fullWidth
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          justifyContent: "flex-start",
          px: 1.5,
          py: 1,
          borderRadius: "12px",
          color: "rgba(255, 255, 255, 0.45)",
          textTransform: "none",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.05em",
          "&:hover": {
            bgcolor: "rgba(255, 255, 255, 0.04)",
            color: "rgba(255, 255, 255, 0.9)",
          },
        }}
        startIcon={icon}
        endIcon={
          <ExpandMoreRoundedIcon 
            sx={{ 
              fontSize: "1rem", 
              ml: "auto", 
              transform: isOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s" 
            }} 
          />
        }
      >
        {title.toUpperCase()}
      </Button>
      <Collapse in={isOpen}>
        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
}

function labelForViewport(label: string, shortLabel?: string) {
  return label;
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
  embedded = false,
  expandSubmenus = false,
  hideContainerChrome = false,
  onOpenSearch,
  collapsed = false,
  onToggleCollapsed,
}: MainNavigationProps) {
  const [menuAnchors, setMenuAnchors] = useState<Partial<Record<MenuKey, HTMLElement | null>>>({});

  const isDashboardView = activeView === "dashboard";
  const isPersonalView =
    activeView === "personal" ||
    activeView === "hoja_matrix" ||
    activeView === "equipo_resumen" ||
    activeView === "movimientos_fuera_hoja" ||
    activeView === "personal_bajas";
  const isOficialesSuboficialesView =
    activeView === "oficiales" ||
    activeView === "suboficiales" ||
    activeView === "oficiales_resumen" ||
    activeView === "suboficiales_resumen";
  const isStockView =
    activeView === "stock" ||
    activeView === "equipos" ||
    activeView === "equipo_nuevo" ||
    activeView === "stock_total" ||
    activeView === "stock_actual" ||
    activeView === "stock_alta" ||
    activeView === "stock_baja" ||
    activeView === "stock_historial" ||
    activeView === "stock_prestamos" ||
    activeView === "movimientos_por_equipo";
  const isEtiquetadoView =
    activeView === "etiquetado_codigos_sie" ||
    activeView === "etiquetado_listado_cajas" ||
    activeView === "etiquetado_imprimir_todas";
  const isCreateView =
    activeView === "personal_nuevo" ||
    activeView === "oficial_nuevo" ||
    activeView === "suboficial_nuevo";
  const filteredStockViews = stockViews.filter((item) => (item.writeOnly ? canWrite : true));
  const filteredPrestamosViews = prestamosViews.filter((item) => (item.writeOnly ? canWrite : true));
  const filteredCreateViews = createViews.filter((item) => (item.adminOnly ? isAdmin : true));
  const filteredArticuloViews = articuloViews.filter((item) => (item.adminOnly ? isAdmin : true) && (item.writeOnly ? canWrite : true));
  const filteredConfigViews = configViews.filter((item) => (item.adminOnly ? isAdmin : true));

  function closeAllMenus() {
    setMenuAnchors({});
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
      {onToggleCollapsed && (
        <Box sx={{ display: "flex", justifyContent: collapsed ? "center" : "flex-end", mb: 1 }}>
          <Tooltip title={collapsed ? "Expandir menú" : "Colapsar menú"} placement="right">
            <IconButton
              onClick={onToggleCollapsed}
              sx={{
                color: "rgba(255, 255, 255, 0.4)",
                "&:hover": { color: "var(--color-ejercito-gold)", bgcolor: "rgba(255, 255, 255, 0.05)" },
                transition: "all 0.2s"
              }}
            >
              {collapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {onOpenSearch && (
        <Tooltip title="Buscar personal" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            onClick={onOpenSearch}
            startIcon={icons.search}
            sx={{
              ...navButtonSx(false, collapsed),
              mb: 1,
              bgcolor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              color: "rgba(255, 255, 255, 0.8)",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.08)",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }
            }}
          >
            {!collapsed && "Buscar personal"}
          </Button>
        </Tooltip>
      )}

      <Tooltip title="Página Principal" placement="right" disableHoverListener={!collapsed}>
        <Button
          variant="text"
          onClick={() => handleSelectView("dashboard")}
          startIcon={icons.dashboard}
          sx={navButtonSx(isDashboardView, collapsed)}
        >
          {!collapsed && "Página Principal"}
        </Button>
      </Tooltip>

      <ExpandedMenuGroup title="Personal" icon={icons.personal} compact={false} collapsed={collapsed}>
        {personalViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Oficiales" icon={icons.oficiales} compact={false} collapsed={collapsed}>
        {oficialesViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Stock" icon={icons.stock} compact={false} collapsed={collapsed}>
        {filteredStockViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Etiquetado" icon={icons.etiquetado} compact={false} collapsed={collapsed}>
        {etiquetadoViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Resumen de tallas" icon={icons.resumen} compact={false} collapsed={collapsed}>
        {tallasResumenViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      {canWrite ? (
        <ExpandedMenuGroup title="Altas de Personal" icon={icons.altas} compact={false}>
          {filteredCreateViews.map((item) => (
            <Button
              key={item.view}
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {item.label}
            </Button>
          ))}
        </ExpandedMenuGroup>
      ) : null}

      <ExpandedMenuGroup title="Préstamos" icon={icons.prestamos} compact={false} collapsed={collapsed}>
        {filteredPrestamosViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              key={item.view}
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Artículos" icon={icons.stock} compact={false} collapsed={collapsed}>
        {filteredArticuloViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Configuración" icon={icons.config} compact={false} collapsed={collapsed}>
        {filteredConfigViews.map((item) => (
          <Tooltip key={item.view} title={item.label} placement="right" disableHoverListener={!collapsed}>
            <Button
              variant="text"
              startIcon={item.icon}
              onClick={() => handleSelectView(item.view)}
              sx={inlineSubmenuButtonSx(activeView === item.view, false)}
            >
              {!collapsed && item.label}
            </Button>
          </Tooltip>
        ))}
      </ExpandedMenuGroup>

      <ExpandedMenuGroup title="Manuales" icon={icons.prestamos} compact={false} collapsed={collapsed}>
        <Tooltip title="Manual de Usuario Final" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            startIcon={icons.prestamos}
            onClick={() => window.open("/docs/manual-usuario-final.pdf", "_blank", "noopener,noreferrer")}
            sx={inlineSubmenuButtonSx(false, false)}
          >
            {!collapsed && "Manual de Usuario Final"}
          </Button>
        </Tooltip>
        <Tooltip title="Presentación del Producto" placement="right" disableHoverListener={!collapsed}>
          <Button
            variant="text"
            startIcon={icons.prestamos}
            onClick={() => window.open("/docs/presentacion-producto-deposito-art1.pdf", "_blank", "noopener,noreferrer")}
            sx={inlineSubmenuButtonSx(false, false)}
          >
            {!collapsed && "Presentación del Producto"}
          </Button>
        </Tooltip>
      </ExpandedMenuGroup>
    </Box>
  );
}
