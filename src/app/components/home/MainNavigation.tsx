"use client";

import { useState, type JSX, type MouseEvent, type RefObject } from "react";
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
  { view: "baterias", label: "Baterias registradas", icon: icons.cajas },
  { view: "firmas", label: "Firmas institucionales", icon: icons.lock, adminOnly: true },
  { view: "recordatorios", label: "Recordatorios", icon: icons.bell },
  { view: "usuarios", label: "Usuarios registrados", icon: icons.users, adminOnly: true },
  { view: "auditoria", label: "Auditoria detallada", icon: icons.audit, adminOnly: true },
];

const createViews: Array<NavOption<CreateView>> = [
  { view: "personal_nuevo", label: "Alta de subalterno", shortLabel: "Subalterno", icon: icons.altas },
  { view: "oficial_nuevo", label: "Alta de oficial", shortLabel: "Oficial", icon: icons.altas },
  { view: "suboficial_nuevo", label: "Alta de suboficial", shortLabel: "Suboficial", icon: icons.altas },
  { view: "bateria_nueva", label: "Alta de bateria", shortLabel: "Bateria", icon: icons.altas, adminOnly: true },
  { view: "grado_nuevo", label: "Alta de grado", shortLabel: "Grado", icon: icons.altas, adminOnly: true },
  { view: "usuario_nuevo", label: "Alta de usuario", shortLabel: "Usuario", icon: icons.altas, adminOnly: true },
];

const stockViews: Array<NavOption<StockView>> = [
  { view: "equipo_nuevo", label: "Alta de equipo", shortLabel: "Alta Eq.", icon: icons.altas, writeOnly: true },
  { view: "equipos", label: "Equipos registrados", shortLabel: "Equipos", icon: icons.stock },
  { view: "stock_total", label: "Total de items", shortLabel: "Total", icon: icons.resumen },
  { view: "stock_actual", label: "Deposito interno", shortLabel: "Deposito", icon: icons.stock },
  { view: "stock_alta", label: "Alta de stock", shortLabel: "Alta", icon: icons.altas },
  { view: "stock_baja", label: "Baja de stock", shortLabel: "Baja", icon: icons.minus },
  { view: "stock_historial", label: "Historial", shortLabel: "Historial", icon: icons.history },
];

const etiquetadoViews: Array<NavOption<EtiquetadoView>> = [
  { view: "etiquetado_codigos_sie", label: "Codigos SIE", shortLabel: "Codigos", icon: icons.codigo },
  { view: "etiquetado_listado_cajas", label: "Listado de cajas", shortLabel: "Cajas", icon: icons.cajas },
  { view: "etiquetado_imprimir_todas", label: "Imprimir todas", shortLabel: "Imprimir", icon: icons.imprimir },
];

const personalViews: Array<NavOption<Extract<MainView, "personal" | "hoja_matrix" | "equipo_resumen">>> = [
  { view: "personal", label: "Personal subalterno", icon: icons.personal },
  { view: "hoja_matrix", label: "Hoja matriz", icon: icons.matrix },
  { view: "equipo_resumen", label: "Resumen de equipo en baterias", icon: icons.resumenEquipo },
];

const oficialesViews: Array<NavOption<Extract<MainView, "oficiales" | "suboficiales" | "oficiales_suboficiales_resumen">>> = [
  { view: "oficiales", label: "Oficiales", icon: icons.oficiales },
  { view: "suboficiales", label: "Suboficiales", icon: icons.oficiales },
  { view: "oficiales_suboficiales_resumen", label: "Resumen de talles (ambos)", icon: icons.resumen },
];

function navButtonSx(active: boolean) {
  return {
    px: 2.25,
    justifyContent: "space-between",
    width: { xs: "100%", sm: "auto" },
    minWidth: { sm: 170 },
    minHeight: 44,
    borderRadius: 2,
    borderWidth: "1px",
    borderColor: active ? "var(--EscudoVerde)" : "var(--brand-sand)",
    bgcolor: active ? "var(--EscudoAmarillo)" : "var(--Blanco)",
    color: active ? "var(--EscudoAzul)" : "var(--foreground)",
    fontWeight: 600,
    textTransform: "none",
    "&:hover": {
      borderColor: active ? "var(--EscudoVerde)" : "var(--brand-moss)",
      bgcolor: active ? "var(--EscudoAmarillo)" : "var(--EscudoGris)",
    },
  };
}

function menuPaperSx() {
  return {
    mt: 1,
    p: 0.5,
    borderRadius: 2,
    width: "min(360px, calc(100vw - 2rem))",
    maxWidth: "calc(100vw - 2rem)",
    border: "1px solid",
    borderColor: "var(--brand-sand)",
    bgcolor: "var(--Blanco)",
    color: "var(--foreground)",
  };
}

const menuHeaderSx = {
  px: 2,
  py: 0.75,
  color: "var(--EscudoAzul)",
  fontWeight: 700,
  letterSpacing: 0.6,
};

const menuDividerSx = {
  mb: 0.5,
  borderColor: "var(--brand-sand)",
};

const menuItemSx = {
  borderRadius: 1,
  mx: 0.5,
  color: "var(--foreground)",
  "&:hover": {
    bgcolor: "var(--EscudoGris)",
  },
  "&.Mui-selected": {
    bgcolor: "var(--EscudoAmarillo)",
    color: "var(--EscudoAzul)",
  },
  "&.Mui-selected:hover": {
    bgcolor: "var(--EscudoAmarillo)",
  },
};

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
}: MainNavigationProps) {
  const [menuAnchors, setMenuAnchors] = useState<Partial<Record<MenuKey, HTMLElement | null>>>({});
  const isConfigMenuOpen = Boolean(menuAnchors.config) && showConfigViews;

  const isPersonalView = activeView === "personal" || activeView === "hoja_matrix" || activeView === "equipo_resumen";
  const isOficialesSuboficialesView =
    activeView === "oficiales" || activeView === "suboficiales" || activeView === "oficiales_suboficiales_resumen";
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
    activeView === "suboficial_nuevo" ||
    activeView === "bateria_nueva" ||
    activeView === "grado_nuevo" ||
    activeView === "usuario_nuevo";

  function isMenuOpen(menu: MenuKey) {
    if (menu === "config") return isConfigMenuOpen;
    return Boolean(menuAnchors[menu]);
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
      variant="outlined"
      sx={{
        mt: 2,
        p: { xs: 2, sm: 2.5 },
        borderRadius: 3,
        position: "relative",
        zIndex: 220,
        bgcolor: "var(--EscudoGris)",
        borderColor: "var(--brand-sand)",
        color: "var(--foreground)",
        fontFamily: 'var(--fuentePrincipal, "Liberation Sans", sans-serif)',
      }}
    >
      <Typography variant="subtitle2" sx={{ color: "var(--EscudoAzul)", fontWeight: 700, letterSpacing: 1 }}>
        NAVEGACION
      </Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap gap={1.2} sx={{ mt: 1.5 }}>
          <Button
            variant="outlined"
            onClick={handleToggleMenu("personal")}
            startIcon={icons.personal}
            endIcon={<ChevronIcon open={isMenuOpen("personal")} />}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen("personal")}
            aria-controls="menu-personal-subalterno"
            sx={navButtonSx(isPersonalView || isMenuOpen("personal"))}
          >
            Personal subalterno
          </Button>
          <Menu
            id="menu-personal-subalterno"
            anchorEl={menuAnchors.personal}
            open={isMenuOpen("personal")}
            onClose={() => closeMenu("personal")}
            PaperProps={{ sx: menuPaperSx() }}
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

          <Button
            variant="outlined"
            onClick={handleToggleMenu("oficiales")}
            startIcon={icons.oficiales}
            endIcon={<ChevronIcon open={isMenuOpen("oficiales")} />}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen("oficiales")}
            aria-controls="menu-oficiales-suboficiales"
            sx={navButtonSx(isOficialesSuboficialesView || isMenuOpen("oficiales"))}
          >
            Oficiales y suboficiales
          </Button>
          <Menu
            id="menu-oficiales-suboficiales"
            anchorEl={menuAnchors.oficiales}
            open={isMenuOpen("oficiales")}
            onClose={() => closeMenu("oficiales")}
            PaperProps={{ sx: menuPaperSx() }}
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

          <Button
            variant="outlined"
            onClick={handleToggleMenu("stock")}
            startIcon={icons.stock}
            endIcon={<ChevronIcon open={isMenuOpen("stock")} />}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen("stock")}
            aria-controls="menu-stock"
            sx={navButtonSx(isStockView || isMenuOpen("stock"))}
          >
            Stock y equipos
          </Button>
          <Menu
            id="menu-stock"
            anchorEl={menuAnchors.stock}
            open={isMenuOpen("stock")}
            onClose={() => closeMenu("stock")}
            PaperProps={{ sx: menuPaperSx() }}
            MenuListProps={{ "aria-label": "Vistas de stock y equipos" }}
          >
            <Typography variant="overline" sx={menuHeaderSx}>
              Vistas de stock y equipos
            </Typography>
            <Divider sx={menuDividerSx} />
            {stockViews
              .filter((item) => (item.writeOnly ? canWrite : true))
              .map((item) => (
                <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                  <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                  <ListItemText>{labelForViewport(item.label, item.shortLabel)}</ListItemText>
                </MenuItem>
              ))}
          </Menu>

          <Button
            variant="outlined"
            onClick={handleToggleMenu("etiquetado")}
            startIcon={icons.etiquetado}
            endIcon={<ChevronIcon open={isMenuOpen("etiquetado")} />}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen("etiquetado")}
            aria-controls="menu-etiquetado"
            sx={navButtonSx(isEtiquetadoView || isMenuOpen("etiquetado"))}
          >
            Etiquetado
          </Button>
          <Menu
            id="menu-etiquetado"
            anchorEl={menuAnchors.etiquetado}
            open={isMenuOpen("etiquetado")}
            onClose={() => closeMenu("etiquetado")}
            PaperProps={{ sx: menuPaperSx() }}
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

          <Button
            variant="outlined"
            onClick={() => handleSelectView("tallas_resumen")}
            startIcon={icons.resumen}
            sx={{ ...navButtonSx(isSummaryView), minWidth: { sm: 190 } }}
          >
            Resumen de tallas
          </Button>

          {canWrite ? (
            <>
              <Button
                variant="outlined"
                onClick={handleToggleMenu("create")}
                startIcon={icons.altas}
                endIcon={<ChevronIcon open={isMenuOpen("create")} />}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen("create")}
                aria-controls="menu-altas"
                sx={navButtonSx(isCreateView || isMenuOpen("create"))}
              >
                Altas
              </Button>
              <Menu
                id="menu-altas"
                anchorEl={menuAnchors.create}
                open={isMenuOpen("create")}
                onClose={() => closeMenu("create")}
                PaperProps={{ sx: menuPaperSx() }}
                MenuListProps={{ "aria-label": "Pantallas de alta" }}
              >
                <Typography variant="overline" sx={menuHeaderSx}>
                  Pantallas de alta
                </Typography>
                <Divider sx={menuDividerSx} />
                {createViews
                  .filter((item) => (item.adminOnly ? isAdmin : true))
                  .map((item) => (
                    <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                      <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                      <ListItemText>{labelForViewport(item.label, item.shortLabel)}</ListItemText>
                    </MenuItem>
                  ))}
              </Menu>
            </>
          ) : null}

          <Button
            variant="outlined"
            onClick={() => handleSelectView("formularios")}
            startIcon={icons.prestamos}
            sx={{ ...navButtonSx(activeView === "formularios"), minWidth: { sm: 176 } }}
          >
            Prestamos
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
              sx={navButtonSx(isConfigView || isMenuOpen("config"))}
            >
              Configuracion
            </Button>
            <Menu
              id="menu-configuracion"
              anchorEl={menuAnchors.config}
              open={isMenuOpen("config")}
              onClose={() => closeMenu("config")}
              disablePortal
              PaperProps={{ sx: { ...menuPaperSx(), width: "min(420px, calc(100vw - 2rem))" } }}
              MenuListProps={{ "aria-label": "Vistas de configuracion" }}
            >
              <Typography variant="overline" sx={menuHeaderSx}>
                Vistas de configuracion
              </Typography>
              <Divider sx={menuDividerSx} />
              {configViews
                .filter((item) => (item.adminOnly ? isAdmin : true))
                .map((item) => (
                  <MenuItem key={item.view} selected={activeView === item.view} onClick={() => handleSelectView(item.view)} sx={menuItemSx}>
                    <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
                    <ListItemText>{item.label}</ListItemText>
                  </MenuItem>
                ))}
            </Menu>
          </Box>
      </Stack>
    </Paper>
  );
}
