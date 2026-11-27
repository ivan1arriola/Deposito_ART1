"use client";

import type { ReactNode } from "react";
import { SoldadoRecordatorioWidget } from "./SoldadoRecordatorioWidget";
import type {
  SoldadoRecordatorioWidgetRenderContext,
  SoldadoWidgetRenderStrategy,
} from "./SoldadoRecordatorioWidgetStrategy";

const hiddenWhenWidgetDisabledStrategy: SoldadoWidgetRenderStrategy = {
  canHandle: (context) => !context.config.mostrarMuneco,
  render: () => null,
};

const hiddenInRecordatoriosViewStrategy: SoldadoWidgetRenderStrategy = {
  canHandle: (context) => context.activeView === "recordatorios",
  render: () => null,
};

const defaultVisibleStrategy: SoldadoWidgetRenderStrategy = {
  canHandle: () => true,
  render: (context) => (
    <SoldadoRecordatorioWidget
      tasks={context.tasks}
      loading={context.loading}
      saving={context.saving}
      displayName={context.displayName}
      variant={context.soldadoVariant}
      onCreateTask={context.onCreateTask}
      onToggleTask={context.onToggleTask}
      onOpenConfig={context.onOpenConfig}
    />
  ),
};

class SoldadoWidgetStrategyFactory {
  constructor(private readonly strategies: SoldadoWidgetRenderStrategy[]) {}

  resolve(context: SoldadoRecordatorioWidgetRenderContext): SoldadoWidgetRenderStrategy {
    return (
      this.strategies.find((strategy) => strategy.canHandle(context)) ?? defaultVisibleStrategy
    );
  }
}

const soldadoWidgetStrategyFactory = new SoldadoWidgetStrategyFactory([
  hiddenWhenWidgetDisabledStrategy,
  hiddenInRecordatoriosViewStrategy,
  defaultVisibleStrategy,
]);

export function renderSoldadoRecordatorioWidget(
  context: SoldadoRecordatorioWidgetRenderContext
): ReactNode {
  const strategy = soldadoWidgetStrategyFactory.resolve(context);
  return strategy.render(context);
}
