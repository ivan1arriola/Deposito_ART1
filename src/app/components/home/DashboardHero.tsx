"use client";

import Image from "next/image";
import { useState, type RefObject } from "react";
import { Box, Button, Chip, Collapse, Divider, Drawer, Grid, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
  const [desktopAccessOpen, setDesktopAccessOpen] = useState(false);
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
  const isDashboardLanding = activeView === "dashboard";
  const showDbInfoInHero = !isDashboardLanding;
  const headerControlBg = isDashboardLanding ? "rgba(10,14,10,0.68)" : "rgba(22,26,20,0.5)";
  const iconButtonBg = isDashboardLanding ? "rgba(9,12,9,0.74)" : "rgba(22,26,20,0.45)";
  const metricCardBg = isDashboardLanding ? "rgba(8,11,8,0.58)" : "rgba(18,22,16,0.42)";
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

  function handleDesktopSelectView(view: MainView) {
    setDesktopAccessOpen(false);
    onSelectView(view);
  }

  return (
    <Paper
      component="section"
      sx={{
        position: "relative",
        overflowX: "hidden",
        overflowY: isDashboardLanding ? "auto" : "hidden",
        borderRadius: isDashboardLanding ? 0 : { xs: 3, sm: 4 },
        minHeight: isDashboardLanding ? "100dvh" : "auto",
        height: isDashboardLanding ? "100dvh" : "auto",
        px: isDashboardLanding ? { xs: 1.75, sm: 2.5, md: 3.5 } : { xs: 2, sm: 3 },
        py: isDashboardLanding ? { xs: 2, sm: 2.8, md: 3.3 } : { xs: 2, sm: 2.5 },
        border: "1px solid rgba(20,20,18,0.65)",
        backgroundColor: isDashboardLanding ? "#2f3a2a" : "#5f6c46",
        backgroundImage: isDashboardLanding
          ? "linear-gradient(110deg, rgba(12,16,11,0.78) 0%, rgba(20,27,18,0.56) 46%, rgba(9,12,10,0.76) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.04) 0 2px, rgba(0,0,0,0) 2px 7px), url('/assets/dashboard-foto.jpg')"
          : "linear-gradient(90deg, rgba(24,27,21,0.5) 0%, rgba(255,255,255,0.04) 40%, rgba(24,27,21,0.45) 100%), repeating-linear-gradient(115deg, rgba(255,255,255,0.03) 0 2px, rgba(0,0,0,0) 2px 7px)",
        backgroundSize: isDashboardLanding ? "auto, auto, cover" : "auto",
        backgroundPosition: isDashboardLanding ? "center, center, center" : "center",
        backgroundRepeat: isDashboardLanding ? "repeat, repeat, no-repeat" : "repeat",
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

      <Stack
        spacing={isDashboardLanding ? { xs: 2, md: 2.8 } : 2}
        sx={{
          position: "relative",
          maxWidth: isDashboardLanding ? 1360 : undefined,
          mx: "auto",
          width: "100%",
        }}
      >
        <Typography
          sx={{
            textAlign: "center",
            fontSize: isDashboardLanding ? { xs: 11, sm: 12 } : { xs: 12, sm: 13 },
            color: "rgba(255,255,255,0.9)",
            lineHeight: 1.1,
            letterSpacing: isDashboardLanding ? "0.04em" : undefined,
          }}
        >
          {`Version: ${appVersion}`}
        </Typography>

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
            px: isDashboardLanding ? { xs: 1, sm: 2 } : undefined,
            py: isDashboardLanding ? 0.75 : undefined,
            borderRadius: isDashboardLanding ? 999 : undefined,
            bgcolor: isDashboardLanding ? "rgba(8,12,9,0.42)" : "transparent",
            border: isDashboardLanding ? "1px solid rgba(255,255,255,0.16)" : "none",
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
                bgcolor: iconButtonBg,
              }}
            >
              <MenuRoundedIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: { xs: "none", md: "grid" },
              gridTemplateColumns: isDashboardLanding
                ? { md: "190px minmax(0, 1fr)", lg: "225px minmax(0, 1fr)", xl: "245px minmax(0, 1fr)" }
                : { md: "170px minmax(0, 1fr)", lg: "220px minmax(0, 1fr)", xl: "240px minmax(0, 1fr)" },
              alignItems: "center",
              columnGap: isDashboardLanding ? { md: 2, lg: 2.6 } : { md: 1.25, lg: 1.8 },
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

            <Stack spacing={isDashboardLanding ? 1.5 : 1.25} sx={{ minWidth: 0 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateRows: "auto auto",
                  rowGap: isDashboardLanding ? { md: 1.15, lg: 1.35 } : { md: 0.85, lg: 1.05 },
                }}
              >
                <Stack
                  spacing={isDashboardLanding ? 1 : 0.7}
                  sx={{
                    minWidth: 0,
                    alignItems: "stretch",
                    width: "100%",
                    order: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      display: "grid",
                      gridTemplateColumns: isDashboardLanding
                        ? { md: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }
                        : "repeat(4, minmax(0, 1fr))",
                      columnGap: { md: 1, lg: 1.25 },
                      rowGap: isDashboardLanding ? { md: 0.9, xl: 0 } : 0,
                      alignItems: "center",
                      p: isDashboardLanding ? { md: 0.85, lg: 1 } : 0,
                      borderRadius: isDashboardLanding ? 2 : 0,
                      bgcolor: isDashboardLanding ? "rgba(9,13,10,0.54)" : "transparent",
                      border: isDashboardLanding ? "1px solid rgba(255,255,255,0.17)" : "none",
                    }}
                  >
                    {showDbInfoInHero ? (
                      <>
                        <Chip
                          size="small"
                          label={`Usuario: ${currentUser.username}`}
                          sx={{
                            ...desktopTopControlSx,
                            color: "common.white",
                            bgcolor: headerControlBg,
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
                            bgcolor: headerControlBg,
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
                      </>
                    ) : (
                      <>
                        <Chip
                          size="small"
                          label="Pantalla de inicio"
                          sx={{
                            ...desktopTopControlSx,
                            color: "common.white",
                            bgcolor: headerControlBg,
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
                          label="Sin datos operativos"
                          sx={{
                            ...desktopTopControlSx,
                            color: "common.white",
                            bgcolor: headerControlBg,
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
                      </>
                    )}
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

                  {!canManageAccount && showDbInfoInHero ? (
                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.9)", textAlign: "right" }}>
                      Modo solo lectura: esta cuenta no puede cambiar credenciales ni datos.
                    </Typography>
                  ) : null}
                </Stack>

                <Typography
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    order: 1,
                    fontSize: isDashboardLanding ? { md: 52, lg: 62, xl: 68 } : { md: 48, lg: 58, xl: 64 },
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

              {isDashboardLanding ? (
                <Stack
                  spacing={1}
                  sx={{
                    p: { md: 1, lg: 1.2 },
                    borderRadius: 2.2,
                    bgcolor: "rgba(8,12,9,0.5)",
                    border: "1px solid rgba(255,255,255,0.17)",
                  }}
                >
                  <Button
                    type="button"
                    onClick={() => setDesktopAccessOpen((current) => !current)}
                    endIcon={
                      <ExpandMoreRoundedIcon
                        sx={{
                          transform: desktopAccessOpen ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 180ms ease",
                        }}
                      />
                    }
                    sx={{
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.28)",
                      bgcolor: "rgba(10,14,10,0.76)",
                      color: "common.white",
                      minHeight: 44,
                      px: 2,
                      justifyContent: "space-between",
                      textTransform: "none",
                      fontWeight: 800,
                      "&:hover": {
                        bgcolor: "rgba(10,14,10,0.84)",
                      },
                    }}
                  >
                    Accesos rápidos
                    </Button>

                  <Collapse in={desktopAccessOpen} timeout={180} unmountOnExit sx={{ pt: 0.2 }}>
                    <MainNavigation
                      activeView={activeView}
                      canWrite={canWrite}
                      isAdmin={isAdmin}
                      showConfigViews={showConfigViews}
                      isConfigView={isConfigView}
                      configMenuRef={configMenuRef}
                      onSelectView={handleDesktopSelectView}
                      onSetConfigViews={onSetConfigViews}
                      embedded
                      hideContainerChrome
                    />
                  </Collapse>
                </Stack>
              ) : (
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
              )}
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
            {showDbInfoInHero ? (
              <>
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
              </>
            ) : (
              <Chip
                size="small"
                label="Pantalla de inicio sin datos operativos"
                sx={{ justifyContent: "flex-start", color: "var(--foreground)", bgcolor: "var(--Blanco)", border: "1px solid var(--brand-sand)" }}
              />
            )}
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

          {!canManageAccount && showDbInfoInHero ? (
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

      {showDbInfoInHero ? (
        <Grid
          container
          spacing={isDashboardLanding ? 1.4 : 1}
          sx={{
            position: "relative",
            mt: isDashboardLanding ? 2.4 : 2,
            maxWidth: isDashboardLanding ? 1360 : undefined,
            mx: isDashboardLanding ? "auto" : undefined,
          }}
        >
          {[
            { label: "Subalternos", value: personalCount },
            { label: "Oficiales/Suboficiales", value: oficialesSuboficialesCount },
            { label: "Equipos registrados", value: equiposRegistradosCount },
            { label: "Movimientos", value: movimientosTotal },
          ].map((metric) => (
            <Grid key={metric.label} size={isDashboardLanding ? { xs: 12, sm: 6, lg: 3 } : { xs: 6, sm: 3 }}>
              <Paper
                sx={{
                  borderRadius: isDashboardLanding ? 2.2 : 1.5,
                  border: "1px solid rgba(255,255,255,0.24)",
                  bgcolor: metricCardBg,
                  backdropFilter: "blur(2px)",
                  px: isDashboardLanding ? 1.6 : 1.25,
                  py: isDashboardLanding ? 1.25 : 1,
                }}
              >
                <Typography sx={{ fontSize: { xs: 9, sm: isDashboardLanding ? 11 : 10 }, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,224,150,0.9)" }}>
                  {metric.label}
                </Typography>
                <Typography sx={{ fontSize: { xs: 24, sm: isDashboardLanding ? 32 : 22 }, fontWeight: 800, color: "common.white", lineHeight: 1.1 }}>
                  {metric.value}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : null}

      {currentUser.rol === "ADMIN" ? (
        <Box sx={{ position: "relative", mt: 2 }}>
          <AdminPushNotifications />
        </Box>
      ) : null}
    </Paper>
  );
}
