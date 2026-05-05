"use client";

import { useState, type JSX, type MouseEvent, type ReactNode, type RefObject } from "react";
import {
  Box,
  Button,
  Collapse,
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
type PrestamosView = Extract<MainView, "prestamos_registrar" | "prestamos_vigentes" | "prestamos_historial" | "formularios">;
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

const prestamosViews: Array<NavOption<PrestamosView>> = [
  { view: "prestamos_registrar", label: "Registrar prestamo", shortLabel: "Registrar", icon: icons.altas, writeOnly: true },
  { view: "prestamos_vigentes", label: "Prestamos vigentes", shortLabel: "Vigentes", icon: icons.prestamos },
  { view: "prestamos_historial", label: "Historial", shortLabel: "Historial", icon: icons.history },
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

const tallasResumenViews: Array<NavOption<TallasResumenView>> = [
  { view: "tallas_resumen", label: "Panel general", icon: icons.resumen },
  { view: "tallas_resumen_subalternos_unidad", label: "Subalternos (unidad)", icon: icons.resumen },
  { view: "tallas_resumen_subalternos_bateria", label: "Subalternos por batería", icon: icons.resumen },
  { view: "tallas_resumen_oficiales_suboficiales", label: "Oficiales y suboficiales", icon: icons.resumen },
];

function navButtonSx(active: boolean, compact: boolean) {
  return {
    position: "relative",
    px: 1.5,
    justifyContent: "flex-start",
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
      marginRight: 1.5,
      color: active ? "var(--color-ejercito-gold)" : "rgba(255, 255, 255, 0.6)",
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
  children,
}: {
  title: string;
  icon: JSX.Element;
  compact: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

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
  const isCreateView =
    activeView === "personal_nuevo" ||
    activeView === "oficial_nuevo" ||
    activeView === "suboficial_nuevo";
  const filteredStockViews = stockViews.filter((item) => (item.writeOnly ? canWrite : true));
  const filteredPrestamosViews = prestamosViews.filter((item) => (item.writeOnly ? canWrite : true));
  const filteredCreateViews = createViews.filter((item) => (item.adminOnly ? isAdmin : true));
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
      <Button
        variant="text"
        onClick={() => handleSelectView("dashboard")}
        startIcon={icons.dashboard}
        sx={navButtonSx(isDashboardView, false)}
      >
        Página Principal
      </Button>

      <ExpandedMenuGroup title="Personal" icon={icons.personal} compact={false}>
        {personalViews.map((item) => (
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

      <ExpandedMenuGroup title="Oficiales" icon={icons.oficiales} compact={false}>
        {oficialesViews.map((item) => (
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

      <ExpandedMenuGroup title="Stock" icon={icons.stock} compact={false}>
        {filteredStockViews.map((item) => (
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

      <ExpandedMenuGroup title="Etiquetado" icon={icons.etiquetado} compact={false}>
        {etiquetadoViews.map((item) => (
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

      <ExpandedMenuGroup title="Resumen de tallas" icon={icons.resumen} compact={false}>
        {tallasResumenViews.map((item) => (
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

      {canWrite ? (
        <ExpandedMenuGroup title="Altas" icon={icons.altas} compact={false}>
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

      <ExpandedMenuGroup title="Préstamos" icon={icons.prestamos} compact={false}>
        {filteredPrestamosViews.map((item) => (
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

      <ExpandedMenuGroup title="Configuración" icon={icons.config} compact={false}>
        {filteredConfigViews.map((item) => (
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
    </Box>
  );
}
