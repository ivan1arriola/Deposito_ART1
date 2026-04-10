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
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const desktopTopControlSx = {
    width: "100%",
    minWidth: 0,
    minHeight: 40,
    height: 40,
    borderRadius: 999,
    whiteSpace: "nowrap" as const,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
  };

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
        border: "1px solid rgba(20,20,18,0.65)",
        backgroundColor: "#5f6c46",
        backgroundImage:
          "linear-gradient(90deg, rgba(24,27,21,0.5) 0%, rgba(255,255,255,0.04) 40%, rgba(24,27,21,0.45) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0) 2px 7px)",
        color: "common.white",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09), var(--shadow-md)",
      }}
    >
      {[
        { top: 8, left: 8 },
        { top: 8, right: 8 },
        { bottom: 8, left: 8 },
        { bottom: 8, right: 8 },
      ].map((corner) => (
        <Box
          key={`hero-corner-${Object.entries(corner)
            .map(([axis, value]) => `${axis}-${value}`)
            .join("-")}`}
          aria-hidden
          sx={{
            position: "absolute",
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "1px solid rgba(0,0,0,0.65)",
            background: "radial-gradient(circle at 30% 30%, #d8d8d8 0%, #898989 45%, #4d4d4d 100%)",
            ...corner,
          }}
        />
      ))}

      <Stack spacing={2} sx={{ position: "relative" }}>
        <Typography
          sx={{
            alignSelf: { xs: "flex-start", md: "center" },
            fontSize: { xs: 9, sm: 10 },
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: { xs: "0.14em", sm: "0.2em" },
            color: "rgba(255,224,150,0.9)",
            lineHeight: 1.1,
            pl: { xs: 0.25, sm: 0.5 },
            textAlign: { xs: "left", md: "center" },
            textShadow: "0 1px 1px rgba(0,0,0,0.55)",
          }}
        >
          {'Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1'}
        </Typography>

        <Stack spacing={{ xs: 1.5, md: 1.35 }}>
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
                }}
              />
            </Box>

            <Box sx={{ minWidth: 0, textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: { xs: 30, sm: 38 },
                  fontWeight: 900,
                  lineHeight: 1.01,
                  mt: 0.35,
                  letterSpacing: "-0.015em",
                  WebkitTextStroke: "0.4px rgba(0,0,0,0.32)",
                }}
              >
                Depósito General
              </Typography>
            </Box>

            <IconButton
              type="button"
              aria-label="Abrir menú"
              onClick={() => setMobileMenuOpen(true)}
              sx={{
                color: "common.white",
                border: "1px solid rgba(255,255,255,0.24)",
                bgcolor: "rgba(22,26,20,0.45)",
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: { md: "170px minmax(0, 1fr)", lg: "220px minmax(0, 1fr)", xl: "240px minmax(0, 1fr)" },
              alignItems: "center",
              columnGap: { md: 1.25, lg: 1.8 },
            }}
          >
            <Box sx={{ width: "100%", flexShrink: 0 }}>
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
                }}
              />
            </Box>

            <Stack spacing={1.25} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateRows: "auto auto",
                  rowGap: { md: 0.5, lg: 0.75 },
                }}
              >
                <Stack
                  spacing={0.7}
                  sx={{
                    minWidth: 0,
                    alignItems: "stretch",
                    width: "100%",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      columnGap: { md: 1, lg: 1.25 },
                      alignItems: "center",
                    }}
                  >
                    <Chip
                      size="small"
                      label={`Usuario: ${currentUser.username}`}
                      sx={{
                        ...desktopTopControlSx,
                        color: "common.white",
                        bgcolor: "rgba(22,26,20,0.5)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        "& .MuiChip-label": {
                          width: "100%",
                          px: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "center",
                        },
                      }}
                    />
                    <Chip
                      size="small"
                      label={`Rol: ${roleLabel(currentUser.rol)}`}
                      sx={{
                        ...desktopTopControlSx,
                        color: "common.white",
                        bgcolor: "rgba(22,26,20,0.5)",
                        border: "1px solid rgba(255,255,255,0.22)",
                        "& .MuiChip-label": {
                          width: "100%",
                          px: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "center",
                        },
                      }}
                    />
                    <Button
                      type="button"
                      onClick={onReload}
                      disabled={loading}
                      size="small"
                      variant="contained"
                      color="secondary"
                      sx={{
                        ...desktopTopControlSx,
                        bgcolor: "rgba(34,40,30,0.88)",
                        color: "common.white",
                        border: "1px solid rgba(255,255,255,0.26)",
                        "&:hover": {
                          bgcolor: "rgba(34,40,30,1)",
                        },
                      }}
                    >
                      Recargar
                    </Button>
                    <Button
                      type="button"
                      onClick={onLogout}
                      size="small"
                      color="error"
                      variant="contained"
                      sx={{
                        ...desktopTopControlSx,
                        border: "1px solid rgba(0,0,0,0.42)",
                      }}
                    >
                      Cerrar sesión
                    </Button>
                  </Box>

                  {!canManageAccount ? (
                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", textAlign: "right" }}>
                      Modo solo lectura: esta cuenta no puede cambiar credenciales ni datos.
                    </Typography>
                  ) : null}
                  <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", textAlign: "right" }}>
                    {`Version: ${appVersion}`}
                  </Typography>
                </Stack>

                <Typography
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    fontSize: { md: 48, lg: 58, xl: 64 },
                    fontWeight: 900,
                    lineHeight: 0.98,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    letterSpacing: "-0.018em",
                    WebkitTextStroke: "0.55px rgba(0,0,0,0.48)",
                    textShadow: "0 2px 3px rgba(0,0,0,0.5)",
                  }}
                >
                  Depósito General
                </Typography>
              </Box>

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
            </Stack>
          </Box>
        </Stack>
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
            bgcolor: "var(--color-surface-base)",
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
            <Chip
              size="small"
              label={`Version: ${appVersion}`}
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
            <Paper sx={{ borderRadius: 1.5, border: "1px solid rgba(255,255,255,0.24)", bgcolor: "rgba(18,22,16,0.42)", px: 1.25, py: 1 }}>
              <Typography sx={{ fontSize: { xs: 9, sm: 10 }, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,224,150,0.9)" }}>
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
