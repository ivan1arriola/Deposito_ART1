"use client";

import type { RefObject } from "react";
import type { MainView } from "@/types/views";
import { MainNavigation } from "./MainNavigation";

type HomeNavbarProps = {
  activeView: MainView;
  canWrite: boolean;
  isAdmin: boolean;
  showConfigViews: boolean;
  isConfigView: boolean;
  configMenuRef: RefObject<HTMLDivElement | null>;
  onSelectView: (view: MainView) => void;
  onSetConfigViews: (open: boolean) => void;
};

export function HomeNavbar({
  activeView,
  canWrite,
  isAdmin,
  showConfigViews,
  isConfigView,
  configMenuRef,
  onSelectView,
  onSetConfigViews,
}: HomeNavbarProps) {
  return (
    <MainNavigation
      activeView={activeView}
      canWrite={canWrite}
      isAdmin={isAdmin}
      showConfigViews={showConfigViews}
      isConfigView={isConfigView}
      configMenuRef={configMenuRef}
      onSelectView={onSelectView}
      onSetConfigViews={onSetConfigViews}
    />
  );
}
