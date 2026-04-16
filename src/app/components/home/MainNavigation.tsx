"use client";

import { useState, type JSX, type MouseEvent, type ReactNode, type RefObject } from "react";
import {
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
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
import type { MainView } from "@/types/views";

type ConfigView = Extract<MainView, "grados" | "baterias" | "equipos" | "recordatorios" | "firmas" | "usuarios" | "auditoria" | "usuario_nuevo">;
type CreateView = Extract<MainView, "personal_nuevo" | "oficial_nuevo" | "suboficial_nuevo">;
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
  embedded?: boolean;
  expandSubmenus?: boolean;
  hideContainerChrome?: boolean;
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
};

const configViews: Array<NavOption<ConfigView>> = [
  { view: "grados", label: "Grados registrados", icon: icons.resumen },
  { view: "baterias", label: "Baterías registradas", icon: icons.cajas },
  { view: "firmas", label: "Firmas institucionales", icon: icons.lock, adminOnly: true },
  { view: "recordatorios", label: "Recordatorios", icon: icons.bell },
  { view: "usuarios", label: "Usuarios registrados", icon: icons.users, adminOnly: true },
  { view: "usuario_nuevo", label: "Alta de usuario", icon: icons.altas, adminOnly: true },
  { view: "auditoria", label: "Auditoría detallada", icon: icons.audit, adminOnly: true },
];

const createViews: Array<NavOption<CreateView>> = [
  { view: "personal_nuevo", label: "Alta de subalterno", shortLabel: "Subalterno", icon: icons.altas },
  { view: "oficial_nuevo", label: "Alta de oficial", shortLabel: "Oficial", icon: icons.altas },
  { view: "suboficial_nuevo", label: "Alta de suboficial", shortLabel: "Suboficial", icon: icons.altas },
];

const stockViews: Array<NavOption<StockView>> = [
  { view: "equipo_nuevo", label: "Alta de equipo", shortLabel: "Alta Eq.", icon: icons.altas, writeOnly: true },
  { view: "equipos", label: "Equipos registrados", shortLabel: "Equipos", icon: icons.stock },
  { view: "stock_total", label: "Total de items", shortLabel: "Total", icon: icons.resumen },
  { view: "stock_actual", label: "Depósito interno", shortLabel: "Depósito", icon: icons.stock },
  { view: "stock_alta", label: "Alta de stock", shortLabel: "Alta", icon: icons.altas },
  { view: "stock_baja", label: "Baja de stock", shortLabel: "Baja", icon: icons.minus },
  { view: "stock_historial", label: "Historial", shortLabel: "Historial", icon: icons.history },
];

const etiquetadoViews: Array<NavOption<EtiquetadoView>> = [
  { view: "etiquetado_codigos_sie", label: "Códigos SIE", shortLabel: "Códigos", icon: icons.codigo },
  { view: "etiquetado_listado_cajas", label: "Listado de cajas", shortLabel: "Cajas", icon: icons.cajas },
  { view: "etiquetado_imprimir_todas", label: "Imprimir todas", shortLabel: "Imprimir", icon: icons.imprimir },
];

const personalViews: Array<NavOption<Extract<MainView, "personal" | "hoja_matrix" | "equipo_resumen" | "movimientos_fuera_hoja">>> = [
  { view: "personal", label: "Personal subalterno", icon: icons.personal },
  { view: "hoja_matrix", label: "Hoja matriz", icon: icons.matrix },
  { view: "equipo_resumen", label: "Resumen de equipo en baterías", icon: icons.resumenEquipo },
  { view: "movimientos_fuera_hoja", label: "Movimientos fuera de hoja", icon: icons.history },
];

const oficialesViews: Array<NavOption<Extract<MainView, "oficiales" | "suboficiales" | "oficiales_resumen" | "suboficiales_resumen">>> = [
  { view: "oficiales", label: "Oficiales", icon: icons.oficiales },
  { view: "suboficiales", label: "Suboficiales", icon: icons.oficiales },
  { view: "oficiales_resumen", label: "Resumen de talles (oficiales)", icon: icons.resumen },
  { view: "suboficiales_resumen", label: "Resumen de talles (suboficiales)", icon: icons.resumen },
];

function navButtonSx(active: boolean, compact: boolean) {
  return {
    position: "relative",
    px: compact ? { xs: 1.2, sm: 1.6 } : 2.25,
    justifyContent: "center",
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
    whiteSpace: "nowrap",
    minHeight: compact ? { xs: 36, sm: 40 } : 44,
    borderRadius: compact ? 1.5 : 2,
    borderWidth: "1px",
    borderColor: active ? "var(--color-ejercito-gold)" : "var(--color-border-subtle)",
    bgcolor: active ? "var(--color-ejercito-gold)" : "var(--color-surface-base)",
    color: active ? "var(--color-ejercito-black)" : "var(--color-text-primary)",
    fontWeight: compact ? 700 : 600,
    fontSize: compact ? { xs: 12, sm: 13 } : 14,
    textTransform: "none",
    "& .MuiButton-startIcon": {
      position: "absolute",
      left: compact ? 10 : 14,
      margin: 0,
    },
    "& .MuiButton-endIcon": {
      position: "absolute",
      right: compact ? 10 : 14,
      margin: 0,
    },
    "&:hover": {
      borderColor: active ? "var(--color-ejercito-gold)" : "var(--color-ejercito-blue)",
      bgcolor: active ? "var(--color-ejercito-gold)" : "var(--color-surface-muted)",
    },
  };
}

function inlineSubmenuButtonSx(active: boolean, compact: boolean) {
  return {
    justifyContent: "flex-start",
    width: "100%",
    minWidth: 0,
    minHeight: compact ? 34 : 38,
    borderRadius: 1.25,
    borderWidth: "1px",
    borderColor: active ? "var(--color-ejercito-gold)" : compact ? "rgba(255,255,255,0.36)" : "var(--color-border-subtle)",
    bgcolor: active ? "var(--color-ejercito-gold)" : compact ? "rgba(255,255,255,0.12)" : "var(--color-surface-base)",
    color: active ? "var(--color-ejercito-black)" : compact ? "common.white" : "var(--color-text-primary)",
    fontSize: compact ? 12 : 13,
    fontWeight: 600,
    textTransform: "none",
    px: 1.25,
    "&:hover": {
      borderColor: active ? "var(--color-ejercito-gold)" : "var(--color-ejercito-blue)",
      bgcolor: active ? "var(--color-ejercito-gold)" : compact ? "rgba(255,255,255,0.18)" : "var(--color-surface-muted)",
    },
  };
}

function menuPaperSx(compact: boolean) {
  return {
    mt: 1,
    p: 0.5,
    borderRadius: compact ? 1.5 : 2,
    width: compact ? "min(330px, calc(100vw - 1.25rem))" : "min(360px, calc(100vw - 2rem))",
    maxWidth: "calc(100vw - 2rem)",
    border: "1px solid",
    borderColor: "var(--color-border-subtle)",
    bgcolor: "var(--color-surface-base)",
    color: "var(--color-text-primary)",
  };
}

const menuHeaderSx = {
  px: 2,
  py: 0.75,
  color: "var(--color-ejercito-blue)",
  fontWeight: 700,
  letterSpacing: 0.6,
};

const menuDividerSx = {
  mb: 0.5,
  borderColor: "var(--color-border-subtle)",
};

const menuItemSx = {
  borderRadius: 1,
  mx: 0.5,
  color: "var(--color-text-primary)",
  "&:hover": {
    bgcolor: "var(--color-surface-muted)",
  },
  "&.Mui-selected": {
    bgcolor: "var(--color-ejercito-gold)",
    color: "var(--color-ejercito-black)",
  },
  "&.Mui-selected:hover": {
    bgcolor: "var(--color-ejercito-gold)",
  },
};

function ExpandedMenuGroup({
  title,
  icon,
  compact,
  children,
}: {
  title: string;
  icon: JSX.Element;
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        borderRadius: 1.75,
        border: "1px solid",
        borderColor: compact ? "rgba(255,255,255,0.28)" : "var(--color-border-subtle)",
        bgcolor: compact ? "rgba(255,255,255,0.08)" : "var(--color-surface-muted)",
        p: 1,
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.9} sx={{ px: 0.5, pb: 0.8 }}>
        <Box sx={{ color: compact ? "common.white" : "var(--color-ejercito-blue)", display: "inline-flex" }}>{icon}</Box>
        <Typography sx={{ fontSize: compact ? 12 : 13, fontWeight: 800, color: compact ? "common.white" : "var(--color-ejercito-blue)" }}>
          {title}
        </Typography>
      </Stack>
      <Stack direction="column" gap={0.75}>
        {children}
      </Stack>
    </Box>
  );
}

function labelForViewport(label: string, shortLabel?: string) {
  if (!shortLabel || shortLabel === label) return label;

  return (
    <Box component="span">
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
        {label}
      </Box>
      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
        {shortLabel}
      </Box>
    </Box>
  );
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
}: MainNavigationProps) {
  const [menuAnchors, setMenuAnchors] = useState<Partial<Record<MenuKey, HTMLElement | null>>>({});

  const isDashboardView = activeView === "dashboard";
  const isPersonalView =
    activeView === "personal" ||
    activeView === "hoja_matrix" ||
    activeView === "equipo_resumen" ||
    activeView === "movimientos_fuera_hoja";
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
    activeView === "stock_prestamos";
  const isEtiquetadoView =
    activeView === "etiquetado_codigos_sie" ||
    activeView === "etiquetado_listado_cajas" ||
    activeView === "etiquetado_imprimir_todas";
  const isSummaryView = activeView === "tallas_resumen";
  const isCreateView =
    activeView === "personal_nuevo" ||
    activeView === "oficial_nuevo" ||
    activeView === "suboficial_nuevo";
  const filteredStockViews = stockViews.filter((item) => (item.writeOnly ? canWrite : true));
  const filteredCreateViews = createViews.filter((item) => (item.adminOnly ? isAdmin : true));
  const filteredConfigViews = configViews.filter((item) => (item.adminOnly ? isAdmin : true));
  const navigationGridColumns = expandSubmenus
    ? "1fr"
    : {
        xs: "1fr",
        sm: "repeat(2, minmax(0, 1fr))",
        md: embedded ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
        lg: embedded ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))",
        xl: embedded ? "repeat(3, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
      };

  function getValidAnchor(menu: MenuKey) {
    const anchor = menuAnchors[menu];
    if (!anchor) return null;
    if (!anchor.isConnected) return null;
    const rect = anchor.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return anchor;
  }

  function isMenuOpen(menu: MenuKey) {
    const hasValidAnchor = Boolean(getValidAnchor(menu));
    if (menu === "config") return hasValidAnchor && showConfigViews;
    return hasValidAnchor;
  }

  function closeAllMenus() {
    setMenuAnchors({});
    onSetConfigViews(false);
  }

  function closeMenu(menu: MenuKey) {
    setMenuAnchors((prev) => ({ ...prev, [menu]: null }));
    if (menu === "config") {
      onSetConfigViews(false);
    }
  }

  function handleToggleMenu(menu: MenuKey) {
    return (event: MouseEvent<HTMLButtonElement>) => {
      const current = menuAnchors[menu];
      const isCurrentOpen = menu === "config" ? Boolean(current) && showConfigViews : Boolean(current);

      if (isCurrentOpen) {
        setMenuAnchors({ ...menuAnchors, [menu]: null });
        if (menu === "config") {
          onSetConfigViews(false);
        }
        return;
      }

      setMenuAnchors({ [menu]: event.currentTarget });
      onSetConfigViews(menu === "config");
    };
  }

  function handleSelectView(view: MainView) {
    closeAllMenus();
    onSelectView(view);
  }

  return (
    <Paper
      variant={hideContainerChrome ? "elevation" : "outlined"}
      sx={{
        mt: embedded ? 0 : expandSubmenus ? 0 : 2,
        p: hideContainerChrome ? 0 : embedded ? { xs: 1, sm: 1.25 } : expandSubmenus ? { xs: 1.1, sm: 1.4 } : { xs: 2, sm: 2.5 },
        borderRadius: embedded ? 2 : 3,
        position: "relative",
        zIndex: 220,
        bgcolor: hideContainerChrome ? "transparent" : embedded ? "rgba(255,255,255,0.08)" : "var(--color-surface-muted)",
        borderColor: hideContainerChrome ? "transparent" : embedded ? "rgba(255,255,255,0.24)" : "var(--color-border-subtle)",
        color: embedded ? "common.white" : "var(--color-text-primary)",
        boxShadow: hideContainerChrome ? "none" : undefined,
        fontFamily: 'var(--fuentePrincipal, "Helvetica Neue", Helvetica, Arial, sans-serif)',
      }}
    >
      {!embedded ? (
        <Typography variant="subtitle2" sx={{ color: "var(--color-ejercito-blue)", fontWeight: 700, letterSpacing: 1 }}>
          NAVEGACIÓN
        </Typography>
      ) : null}

      <Box sx={{ mt: embedded ? 0 : 1.5, pb: 0.5 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: navigationGridColumns,
            gap: embedded ? 0.8 : 1.05,
            alignItems: "start",
          }}
        >
          {expandSubmenus ? (
            <>
              <Button
                variant="outlined"
                onClick={() => handleSelectView("dashboard")}
                startIcon={icons.dashboard}
                sx={navButtonSx(isDashboardView, embedded)}
              >
                Pagina Principal
              </Button>

              <ExpandedMenuGroup title="Personal subalterno" icon={icons.personal} compact={embedded}>
                {personalViews.map((item) => (
                  <Button
                    key={item.view}
                    variant="outlined"
                    startIcon={item.icon}
                    onClick={() => handleSelectView(item.view)}
                    sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                  >
                    {item.label}
                  </Button>
                ))}
              </ExpandedMenuGroup>

              <ExpandedMenuGroup title="Oficiales y suboficiales" icon={icons.oficiales} compact={embedded}>
                {oficialesViews.map((item) => (
                  <Button
                    key={item.view}
                    variant="outlined"
                    startIcon={item.icon}
                    onClick={() => handleSelectView(item.view)}
                    sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                  >
                    {item.label}
                  </Button>
                ))}
              </ExpandedMenuGroup>

              <ExpandedMenuGroup title="Stock y equipos" icon={icons.stock} compact={embedded}>
                {filteredStockViews.map((item) => (
                  <Button
                    key={item.view}
                    variant="outlined"
                    startIcon={item.icon}
                    onClick={() => handleSelectView(item.view)}
                    sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                  >
                    {labelForViewport(item.label, item.shortLabel)}
                  </Button>
                ))}
              </ExpandedMenuGroup>

              <ExpandedMenuGroup title="Etiquetado" icon={icons.etiquetado} compact={embedded}>
                {etiquetadoViews.map((item) => (
                  <Button
                    key={item.view}
                    variant="outlined"
                    startIcon={item.icon}
                    onClick={() => handleSelectView(item.view)}
                    sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                  >
                    {labelForViewport(item.label, item.shortLabel)}
                  </Button>
                ))}
              </ExpandedMenuGroup>

              {canWrite ? (
                <ExpandedMenuGroup title="Altas" icon={icons.altas} compact={embedded}>
                  {filteredCreateViews.map((item) => (
                    <Button
                      key={item.view}
                      variant="outlined"
                      startIcon={item.icon}
                      onClick={() => handleSelectView(item.view)}
                      sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                    >
                      {labelForViewport(item.label, item.shortLabel)}
                    </Button>
                  ))}
                </ExpandedMenuGroup>
              ) : null}

              <Box ref={configMenuRef}>
                <ExpandedMenuGroup title="Configuración" icon={icons.config} compact={embedded}>
                  {filteredConfigViews.map((item) => (
                    <Button
                      key={item.view}
                      variant="outlined"
                      startIcon={item.icon}
                      onClick={() => handleSelectView(item.view)}
                      sx={inlineSubmenuButtonSx(activeView === item.view, embedded)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </ExpandedMenuGroup>
              </Box>

              <Button
                variant="outlined"
                onClick={() => handleSelectView("tallas_resumen")}
                startIcon={icons.resumen}
                sx={navButtonSx(isSummaryView, embedded)}
              >
                Resumen de tallas
              </Button>

              <Button
                variant="outlined"
                onClick={() => handleSelectView("formularios")}
                startIcon={icons.prestamos}
                sx={navButtonSx(activeView === "formularios", embedded)}
              >
                Préstamos
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                onClick={() => handleSelectView("dashboard")}
                startIcon={icons.dashboard}
                sx={navButtonSx(isDashboardView, embedded)}
              >
                Pagina Principal
              </Button>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handleToggleMenu("personal")}
                  startIcon={icons.personal}
                  endIcon={<ChevronIcon open={isMenuOpen("personal")} />}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen("personal")}
                  aria-controls="menu-personal-subalterno"
                  sx={navButtonSx(isPersonalView || isMenuOpen("personal"), embedded)}
                >
                  Personal subalterno
                </Button>
                <Menu
                  id="menu-personal-subalterno"
                  anchorEl={getValidAnchor("personal")}
                  open={isMenuOpen("personal")}
                  onClose={() => closeMenu("personal")}
                  PaperProps={{ sx: menuPaperSx(embedded) }}
                  MenuListProps={{ "aria-label": "Vistas de personal subalterno" }}
                >
                  <Typography variant="overline" sx={menuHeaderSx}>
                    Vistas de personal subalterno
                  </Typography>
                  <Divider sx={menuDividerSx} />
                  {personalViews.map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handleToggleMenu("oficiales")}
                  startIcon={icons.oficiales}
                  endIcon={<ChevronIcon open={isMenuOpen("oficiales")} />}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen("oficiales")}
                  aria-controls="menu-oficiales-suboficiales"
                  sx={navButtonSx(isOficialesSuboficialesView || isMenuOpen("oficiales"), embedded)}
                >
                  Oficiales y suboficiales
                </Button>
                <Menu
                  id="menu-oficiales-suboficiales"
                  anchorEl={getValidAnchor("oficiales")}
                  open={isMenuOpen("oficiales")}
                  onClose={() => closeMenu("oficiales")}
                  PaperProps={{ sx: menuPaperSx(embedded) }}
                  MenuListProps={{ "aria-label": "Vistas de oficiales y suboficiales" }}
                >
                  <Typography variant="overline" sx={menuHeaderSx}>
                    Vistas de oficiales y suboficiales
                  </Typography>
                  <Divider sx={menuDividerSx} />
                  {oficialesViews.map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handleToggleMenu("stock")}
                  startIcon={icons.stock}
                  endIcon={<ChevronIcon open={isMenuOpen("stock")} />}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen("stock")}
                  aria-controls="menu-stock"
                  sx={navButtonSx(isStockView || isMenuOpen("stock"), embedded)}
                >
                  Stock y equipos
                </Button>
                <Menu
                  id="menu-stock"
                  anchorEl={getValidAnchor("stock")}
                  open={isMenuOpen("stock")}
                  onClose={() => closeMenu("stock")}
                  PaperProps={{ sx: menuPaperSx(embedded) }}
                  MenuListProps={{ "aria-label": "Vistas de stock y equipos" }}
                >
                  <Typography variant="overline" sx={menuHeaderSx}>
                    Vistas de stock y equipos
                  </Typography>
                  <Divider sx={menuDividerSx} />
                  {filteredStockViews.map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{labelForViewport(item.label, item.shortLabel)}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              <Box>
                <Button
                  variant="outlined"
                  onClick={handleToggleMenu("etiquetado")}
                  startIcon={icons.etiquetado}
                  endIcon={<ChevronIcon open={isMenuOpen("etiquetado")} />}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen("etiquetado")}
                  aria-controls="menu-etiquetado"
                  sx={navButtonSx(isEtiquetadoView || isMenuOpen("etiquetado"), embedded)}
                >
                  Etiquetado
                </Button>
                <Menu
                  id="menu-etiquetado"
                  anchorEl={getValidAnchor("etiquetado")}
                  open={isMenuOpen("etiquetado")}
                  onClose={() => closeMenu("etiquetado")}
                  PaperProps={{ sx: menuPaperSx(embedded) }}
                  MenuListProps={{ "aria-label": "Vistas de etiquetado" }}
                >
                  <Typography variant="overline" sx={menuHeaderSx}>
                    Vistas de etiquetado
                  </Typography>
                  <Divider sx={menuDividerSx} />
                  {etiquetadoViews.map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{labelForViewport(item.label, item.shortLabel)}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>

              <Button variant="outlined" onClick={() => handleSelectView("tallas_resumen")} startIcon={icons.resumen} sx={navButtonSx(isSummaryView, embedded)}>
                Resumen de tallas
              </Button>

              {canWrite ? (
                <Box>
                  <Button
                    variant="outlined"
                    onClick={handleToggleMenu("create")}
                    startIcon={icons.altas}
                    endIcon={<ChevronIcon open={isMenuOpen("create")} />}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen("create")}
                    aria-controls="menu-altas"
                    sx={navButtonSx(isCreateView || isMenuOpen("create"), embedded)}
                  >
                    Altas
                  </Button>
                  <Menu
                    id="menu-altas"
                    anchorEl={getValidAnchor("create")}
                    open={isMenuOpen("create")}
                    onClose={() => closeMenu("create")}
                    PaperProps={{ sx: menuPaperSx(embedded) }}
                    MenuListProps={{ "aria-label": "Pantallas de alta" }}
                  >
                    <Typography variant="overline" sx={menuHeaderSx}>
                      Pantallas de alta
                    </Typography>
                    <Divider sx={menuDividerSx} />
                    {filteredCreateViews.map((item) => (
                      <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                        <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                        <ListItemText>{labelForViewport(item.label, item.shortLabel)}</ListItemText>
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              ) : null}

              <Button variant="outlined" onClick={() => handleSelectView("formularios")} startIcon={icons.prestamos} sx={navButtonSx(activeView === "formularios", embedded)}>
                Préstamos
              </Button>

              <Box ref={configMenuRef}>
                <Button
                  variant="outlined"
                  onClick={handleToggleMenu("config")}
                  startIcon={icons.config}
                  endIcon={<ChevronIcon open={isMenuOpen("config")} />}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen("config")}
                  aria-controls="menu-configuracion"
                  sx={navButtonSx(isConfigView || isMenuOpen("config"), embedded)}
                >
                  Configuración
                </Button>
                <Menu
                  id="menu-configuracion"
                  anchorEl={getValidAnchor("config")}
                  open={isMenuOpen("config")}
                  onClose={() => closeMenu("config")}
                  PaperProps={{ sx: { ...menuPaperSx(embedded), width: "min(420px, calc(100vw - 2rem))" } }}
                  MenuListProps={{ "aria-label": "Vistas de configuración" }}
                >
                  <Typography variant="overline" sx={menuHeaderSx}>
                    Vistas de configuración
                  </Typography>
                  <Divider sx={menuDividerSx} />
                  {filteredConfigViews.map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
