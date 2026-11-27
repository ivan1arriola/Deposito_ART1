"use client";

import Image from "next/image";
import type { RefObject } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/Dialog";
import type { MainView } from "@/types/views";
import { MainNavigation } from "./MainNavigation";

type AppShellSidebarProps = {
  appVersion: string;
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  activeView: MainView;
  canWrite: boolean;
  isAdmin: boolean;
  showConfigViews: boolean;
  isConfigView: boolean;
  configMenuRef: RefObject<HTMLDivElement | null>;
  currentUser: { username: string; rol: string } | null;
  roleLabel: string;
  metrics: {
    personalCount: number;
    oficialesSuboficialesCount: number;
    equiposCount: number;
    movimientosTotal: number;
  };
  onToggleCollapsed: () => void;
  onCloseMobileMenu: () => void;
  onSelectView: (view: MainView) => void;
  onOpenSearch: () => void;
  onSetConfigViews: (open: boolean) => void;
  onReload: () => void;
  onLogout: () => void;
};

export function AppShellSidebar({
  appVersion,
  sidebarCollapsed,
  mobileMenuOpen,
  activeView,
  canWrite,
  isAdmin,
  showConfigViews,
  isConfigView,
  configMenuRef,
  currentUser,
  roleLabel,
  metrics,
  onToggleCollapsed,
  onCloseMobileMenu,
  onSelectView,
  onOpenSearch,
  onSetConfigViews,
  onReload,
  onLogout,
}: AppShellSidebarProps) {
  const renderSidebarContent = (isMobileDrawer: boolean) => {
    const isCollapsedSidebar = !isMobileDrawer && sidebarCollapsed;

    return (
      <>
        <div className="mb-8 mt-2 flex flex-col items-center gap-4 overflow-hidden px-2">
          <p
            className={`self-start text-[11px] font-bold text-white/50 transition-opacity duration-200 ${
              isCollapsedSidebar ? "opacity-0" : "opacity-100"
            }`}
          >
            Versión: {appVersion}
          </p>

          <div
            className={`my-2 h-auto transition-[width] duration-300 ease-out ${
              isCollapsedSidebar ? "w-[45px]" : "w-[100px]"
            }`}
          >
            <Image
              src="/assets/logo-deposito.png"
              alt="Logo Depósito"
              width={200}
              height={240}
              className="h-auto w-full drop-shadow-[0_0_12px_rgba(255,255,255,0.15)] transition-opacity duration-200"
            />
          </div>

          <div className={isCollapsedSidebar ? "hidden" : "block text-center"}>
            <p className="mb-1 text-[13px] font-extrabold italic leading-tight text-white/90">
              Grupo &quot;Brigadier General Manuel Oribe&quot; de Artillería 105mm No. 1
            </p>
            <p className="text-xl font-black uppercase tracking-[0.02em] text-[var(--color-ejercito-gold)]">
              Depósito General
            </p>
          </div>

          <hr className="w-full border-0 border-t border-white/10" />

          <p
            className={`self-start pl-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/40 transition-opacity duration-200 ${
              isCollapsedSidebar ? "opacity-0" : "opacity-100"
            }`}
          >
            {!isCollapsedSidebar && "Menú Principal"}
          </p>
        </div>

        <MainNavigation
          activeView={activeView}
          canWrite={canWrite}
          isAdmin={isAdmin}
          showConfigViews={showConfigViews}
          isConfigView={isConfigView}
          configMenuRef={configMenuRef}
          collapsed={isCollapsedSidebar}
          onToggleCollapsed={isMobileDrawer ? undefined : onToggleCollapsed}
          onSelectView={(view) => {
            onSelectView(view);
            onCloseMobileMenu();
          }}
          onOpenSearch={() => {
            onOpenSearch();
            onCloseMobileMenu();
          }}
          onSetConfigViews={onSetConfigViews}
          embedded
        />

        <div className="mb-4 mt-8">
          <hr className="mb-6 border-0 border-t border-white/10" />

          {/* User Info Section */}
          <div className="mb-8 flex flex-col gap-3 px-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="mb-1 text-[10px] font-bold uppercase text-white/40">
                Usuario Conectado
              </p>
              <p className="text-sm font-bold text-white">{currentUser?.username || "---"}</p>
              <p className="text-xs font-semibold text-[var(--color-ejercito-gold)]">{roleLabel}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onReload}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md border border-white/20 px-2.5 text-[11px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              >
                Recargar
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-md bg-[var(--color-ejercito-red)] px-2.5 text-[11px] font-semibold text-white shadow-[0_4px_12px_rgba(211,47,47,0.2)] transition-colors hover:bg-[#b10d1c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Metrics Section */}
          <p className="mb-3 pl-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white/40">
            Resumen del Sistema
          </p>

          <div className="grid grid-cols-2 gap-2.5 px-1">
            {[
              { label: "Subalternos", value: metrics.personalCount },
              { label: "Oficiales/Sub", value: metrics.oficialesSuboficialesCount },
              { label: "Equipos", value: metrics.equiposCount },
              { label: "Movimientos", value: metrics.movimientosTotal },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex flex-col rounded-md border border-white/5 bg-black/20 p-3"
              >
                <span className="text-[9px] font-bold uppercase text-white/50">{metric.label}</span>
                <span className="mt-0.5 text-lg font-black text-white">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      {/* Sidebar - Desktop Only (>= 900px) */}
      <nav
        aria-label="Menú principal"
        data-home-sidebar="true"
        className={`sticky top-0 z-[1200] hidden h-screen shrink-0 overflow-y-auto overflow-x-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(22,28,22,0.98)_0%,rgba(15,20,15,0.99)_100%)] p-4 shadow-[4px_0_24px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-[width] duration-300 ease-out min-[900px]:block ${
          sidebarCollapsed ? "w-[80px]" : "w-[280px] lg:w-[300px]"
        }`}
      >
        {renderSidebarContent(false)}
      </nav>

      {/* Drawer - Mobile Only (< 900px) */}
      <Dialog
        open={mobileMenuOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onCloseMobileMenu();
        }}
      >
        <DialogContent
          variant="drawer-left"
          aria-label="Menú principal móvil"
          className="w-[280px]"
        >
          <DialogTitle className="sr-only">Menú principal móvil</DialogTitle>
          <DialogDescription className="sr-only">
            Navegación principal del sistema de depósito
          </DialogDescription>
          {renderSidebarContent(true)}
        </DialogContent>
      </Dialog>
    </>
  );
}
