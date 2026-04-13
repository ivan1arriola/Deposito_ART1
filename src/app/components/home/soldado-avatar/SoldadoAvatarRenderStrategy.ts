import type { ReactNode } from "react";
import type { SoldadoWidgetVariant } from "@/types/entities";

export type SoldadoAvatarRenderContext = {
  size: number;
  variant: SoldadoWidgetVariant;
};

export interface SoldadoAvatarRenderStrategy {
  canHandle: (context: SoldadoAvatarRenderContext) => boolean;
  render: (context: SoldadoAvatarRenderContext) => ReactNode;
}
