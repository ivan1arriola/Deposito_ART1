"use client";

import type { SoldadoWidgetVariant } from "@/types/entities";
import { renderSoldadoAvatar } from "./SoldadoAvatarRenderStrategyImpl";

type RenderSoldadoAvatarProps = {
  size: number;
  variant: SoldadoWidgetVariant;
};

export function RenderSoldadoAvatar({ size, variant }: RenderSoldadoAvatarProps) {
  return <>{renderSoldadoAvatar({ size, variant })}</>;
}
