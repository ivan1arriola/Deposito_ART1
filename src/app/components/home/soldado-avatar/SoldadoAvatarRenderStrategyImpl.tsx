"use client";

import type { ReactNode } from "react";
import type {
  SoldadoAvatarRenderContext,
  SoldadoAvatarRenderStrategy,
} from "./SoldadoAvatarRenderStrategy";
import { clasicoSoldadoAvatarRenderStrategy } from "./strategies/ClasicoSoldadoAvatarRenderStrategy";
import { tacticoSoldadoAvatarRenderStrategy } from "./strategies/TacticoSoldadoAvatarRenderStrategy";

const defaultSoldadoAvatarRenderStrategy: SoldadoAvatarRenderStrategy =
  clasicoSoldadoAvatarRenderStrategy;

class SoldadoAvatarStrategyFactory {
  constructor(private readonly strategies: SoldadoAvatarRenderStrategy[]) {}

  resolve(context: SoldadoAvatarRenderContext): SoldadoAvatarRenderStrategy {
    return this.strategies.find((strategy) => strategy.canHandle(context)) ?? defaultSoldadoAvatarRenderStrategy;
  }
}

const soldadoAvatarStrategyFactory = new SoldadoAvatarStrategyFactory([
  tacticoSoldadoAvatarRenderStrategy,
  clasicoSoldadoAvatarRenderStrategy,
]);

export function renderSoldadoAvatar(context: SoldadoAvatarRenderContext): ReactNode {
  const strategy = soldadoAvatarStrategyFactory.resolve(context);
  return strategy.render(context);
}
