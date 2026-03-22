"use client";

import Image from "next/image";
import { useState, type RefObject } from "react";
import { Box, Button, Chip, Divider, Drawer, Grid, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import type { CurrentUser } from "@/types/entities";
import type { MainView } from "@/types/views";
import { AdminPushNotifications } from "./AdminPushNotifications";
import { MainNavigation } from "./MainNavigation";

type DashboardHeroProps = {
  loading: boolean;
  currentUser: CurrentUser;
  activeView: MainView;
  canWrite: boolean;
  isAdmin: boolean;
  showConfigViews: boolean;
  isConfigView: boolean;
  configMenuRef: RefObject<HTMLDivElement | null>;
  canManageAccount: boolean;
  personalCount: number;
  oficialesSuboficialesCount: number;
  equiposRegistradosCount: number;
  movimientosTotal: number;
  roleLabel: (role: CurrentUser["rol"]) => string;
  onSelectView: (view: MainView) => void;
  onSetConfigViews: (open: boolean) => void;
  onReload: () => void;
  onEditOwnUser: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
};

export function DashboardHero({
  loading,
  currentUser,
  activeView,
  canWrite,
  isAdmin,
  showConfigViews,
  isConfigView,
  configMenuRef,
  canManageAccount,
  personalCount,
  oficialesSuboficialesCount,
  equiposRegistradosCount,
  movimientosTotal,
  roleLabel,
  onSelectView,
  onSetConfigViews,
  onReload,
  onLogout,
}: DashboardHeroProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
    onSetConfigViews(false);
  }

  function handleMobileReload() {
    closeMobileMenu();
    onReload();
  }

  function handleMobileLogout() {
    closeMobileMenu();
    onLogout();
  }

  function handleMobileSelectView(view: MainView) {
    closeMobileMenu();
    onSelectView(view);
  }

  return (
    <Paper
      component="section"
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(132deg, rgba(34,34,26,0.95) 0%, rgba(68,79,51,0.92) 58%, rgba(112,104,72,0.88) 100%)",
        color: "common.white",
        boxShadow: "0 28px 80px rgba(15,23,42,0.28)",
      }}
    >
      <Box
        aria-hidden
        sx={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at top right, rgba(186,176,140,0.22), transparent 35%), radial-gradient(circle at bottom left, rgba(102,112,77,0.34), transparent 36%)",
        }}
      />

      <Stack spacing={2} sx={{ position: "relative" }}>
        <Stack spacing={{ xs: 1.5, md: 1.2 }}>
          <Box
            sx={{
              display: { xs: "grid", md: "none" },
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              columnGap: 1.25,
            }}
          >
            <Box sx={{ width: { xs: 72, sm: 84 }, flexShrink: 0 }}>
              <Image
                src="/assets/logo-deposito.png"
                alt="Logo Depósito"
                width={360}
                height={430}
                priority
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.28))",
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0, textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: { xs: 9, sm: 10 },
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: { xs: "0.14em", sm: "0.2em" },
                  color: "#FFCC00",
                }}
              >
                {'Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1'}
              </Typography>
              <Typography sx={{ fontSize: { xs: 30, sm: 38 }, fontWeight: 900, lineHeight: 1.01, mt: 0.35 }}>
                Depósito General
              </Typography>
            </Box>

            <IconButton
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileMenuOpen(true)}
              sx={{
                color: "common.white",
                border: "1px solid rgba(255,255,255,0.28)",
                bgcolor: "rgba(0,0,0,0.24)",
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
              alignItems: "start",
              columnGap: 2,
            }}
          >
            <Box />

            <Box sx={{ minWidth: 0, textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: { xs: 9, sm: 10 },
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: { xs: "0.14em", sm: "0.2em" },
                  color: "#FFCC00",
                }}
              >
                {'Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1'}
              </Typography>
              <Typography sx={{ fontSize: { md: 56, lg: 64, xl: 72 }, fontWeight: 900, lineHeight: 0.98, mt: 0.35 }}>
                Depósito General
              </Typography>
            </Box>

            <Stack spacing={1} sx={{ minWidth: 0, justifySelf: "end", alignItems: "flex-end" }}>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  label={`Usuario: ${currentUser.username}`}
                  sx={{ color: "common.white", bgcolor: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
                <Chip
                  size="small"
                  label={`Rol: ${roleLabel(currentUser.rol)}`}
                  sx={{ color: "common.white", bgcolor: "rgba(0,0,0,0.32)", border: "1px solid rgba(255,255,255,0.2)" }}
                />
              </Stack>

              <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} justifyContent="flex-end">
                <Button
                  type="button"
                  onClick={onReload}
                  disabled={loading}
                  size="small"
                  variant="contained"
                  color="secondary"
                  sx={{ borderRadius: 1.5, minHeight: 34 }}
                >
                  Recargar
                </Button>
                <Button type="button" onClick={onLogout} size="small" color="error" variant="contained" sx={{ borderRadius: 1.5, minHeight: 34 }}>
                  Cerrar sesión
                </Button>
              </Stack>

              {!canManageAccount ? (
                <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.82)", textAlign: "right" }}>
                  Modo solo lectura: esta cuenta no puede cambiar credenciales ni datos.
                </Typography>
              ) : null}
            </Stack>
          </Box>
        </Stack>

        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <Stack direction="row" alignItems="center" gap={{ md: 1.25, lg: 1.8 }}>
            <Box sx={{ flexShrink: 0, pt: 0.25, width: { md: 170, lg: 220, xl: 240 } }}>
              <Image
                src="/assets/logo-deposito.png"
                alt="Logo Depósito"
                width={360}
                height={430}
                priority
                style={{
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.35))",
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <MainNavigation
                activeView={activeView}
                canWrite={canWrite}
                isAdmin={isAdmin}
                showConfigViews={showConfigViews}
                isConfigView={isConfigView}
                configMenuRef={configMenuRef}
                onSelectView={onSelectView}
                onSetConfigViews={onSetConfigViews}
                embedded
              />
            </Box>
          </Stack>
        </Box>
      </Stack>

      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={closeMobileMenu}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: "min(96vw, 520px)",
            p: 1.5,
            bgcolor: "var(--EscudoGris)",
            color: "var(--foreground)",
          },
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "var(--EscudoAzul)" }}>
              Menú
            </Typography>
            <IconButton type="button" aria-label="Cerrar menú" onClick={closeMobileMenu}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>

          <Stack direction="column" spacing={1}>
            <Chip
              size="small"
              label={`Usuario: ${currentUser.username}`}
              sx={{ justifyContent: "flex-start", color: "var(--foreground)", bgcolor: "var(--Blanco)", border: "1px solid var(--brand-sand)" }}
            />
            <Chip
              size="small"
              label={`Rol: ${roleLabel(currentUser.rol)}`}
              sx={{ justifyContent: "flex-start", color: "var(--foreground)", bgcolor: "var(--Blanco)", border: "1px solid var(--brand-sand)" }}
            />
          </Stack>

          <Stack direction="column" spacing={1}>
            <Button type="button" onClick={handleMobileReload} disabled={loading} fullWidth variant="contained" color="secondary" sx={{ borderRadius: 1.5 }}>
              Recargar
            </Button>
            <Button type="button" onClick={handleMobileLogout} fullWidth color="error" variant="contained" sx={{ borderRadius: 1.5 }}>
              Cerrar sesión
            </Button>
          </Stack>

          {!canManageAccount ? (
            <Typography sx={{ fontSize: 12, color: "var(--EscudoAzul)" }}>
              Modo solo lectura: esta cuenta no puede cambiar credenciales ni datos.
            </Typography>
          ) : null}

          <Divider />

          <MainNavigation
            activeView={activeView}
            canWrite={canWrite}
            isAdmin={isAdmin}
            showConfigViews={showConfigViews}
            isConfigView={isConfigView}
            configMenuRef={configMenuRef}
            onSelectView={handleMobileSelectView}
            onSetConfigViews={onSetConfigViews}
            expandSubmenus
          />
        </Stack>
      </Drawer>

      <Grid container spacing={1} sx={{ position: "relative", mt: 2 }}>
        {[
          { label: "Subalternos", value: personalCount },
          { label: "Oficiales/Suboficiales", value: oficialesSuboficialesCount },
          { label: "Equipos registrados", value: equiposRegistradosCount },
          { label: "Movimientos", value: movimientosTotal },
        ].map((metric) => (
          <Grid key={metric.label} size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ borderRadius: 1.5, border: "1px solid rgba(186,176,140,0.35)", bgcolor: "rgba(0,0,0,0.3)", px: 1.25, py: 1 }}>
              <Typography sx={{ fontSize: { xs: 9, sm: 10 }, textTransform: "uppercase", letterSpacing: "0.08em", color: "#BAB08C" }}>
                {metric.label}
              </Typography>
              <Typography sx={{ fontSize: { xs: 19, sm: 22 }, fontWeight: 800, color: "common.white", lineHeight: 1.1 }}>
                {metric.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {currentUser.rol === "ADMIN" ? (
        <Box sx={{ position: "relative", mt: 2 }}>
          <AdminPushNotifications />
        </Box>
      ) : null}
    </Paper>
  );
}
