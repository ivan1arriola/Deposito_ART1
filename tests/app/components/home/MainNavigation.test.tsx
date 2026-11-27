// @vitest-environment jsdom
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MainNavigation } from "@/app/components/home/MainNavigation";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setViewportMatch(isMobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("899.95px") ? isMobile : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("MainNavigation (#13, #21, #22)", () => {
  it("en escritorio colapsado abre popover fuera de overflow, expone ARIA, cierra con Escape y devuelve el foco", async () => {
    setViewportMatch(false);
    const onSelectView = vi.fn();

    render(
      <MainNavigation
        activeView="stock_total"
        canWrite={true}
        isAdmin={true}
        showConfigViews={false}
        isConfigView={false}
        configMenuRef={createRef<HTMLDivElement>()}
        onSelectView={onSelectView}
        onSetConfigViews={vi.fn()}
        onOpenSearch={vi.fn()}
        collapsed={true}
        onToggleCollapsed={vi.fn()}
      />
    );

    const stockTrigger = screen.getByRole("button", { name: "Stock" });
    expect(stockTrigger.getAttribute("aria-expanded")).toBe("false");
    expect(stockTrigger.getAttribute("aria-controls")).toBeNull();

    fireEvent.click(stockTrigger);
    expect(stockTrigger.getAttribute("aria-expanded")).toBe("true");
    const panelId = stockTrigger.getAttribute("aria-controls");
    expect(panelId).toBe("submenu-stock");

    const stockTotalBtn = await screen.findByRole("button", { name: "Stock de Equipos" });
    expect(stockTotalBtn.getAttribute("aria-current")).toBe("page");

    const region = screen.getByRole("region", { name: "Stock" });
    fireEvent.keyDown(region, { key: "Escape" });

    await waitFor(() => {
      expect(stockTrigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(stockTrigger);
    });

    fireEvent.click(stockTrigger);
    fireEvent.click(await screen.findByRole("button", { name: "Catálogo de Equipos" }));
    expect(onSelectView).toHaveBeenCalledWith("equipos");
  });

  it("en móvil ignora collapsed sin disparar onToggleCollapsed y mantiene grupos e ítems accesibles", () => {
    setViewportMatch(true);
    const onToggleCollapsed = vi.fn();

    render(
      <MainNavigation
        activeView="dashboard"
        canWrite={true}
        isAdmin={false}
        showConfigViews={false}
        isConfigView={false}
        configMenuRef={createRef<HTMLDivElement>()}
        onSelectView={vi.fn()}
        onSetConfigViews={vi.fn()}
        collapsed={true}
        onToggleCollapsed={onToggleCollapsed}
      />
    );

    expect(onToggleCollapsed).not.toHaveBeenCalled();
    const homeButton = screen.getByRole("button", { name: "Página Principal" });
    expect(homeButton.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Personal subalterno" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Asignaciones a Recintos" })).toBeTruthy();
  });
});
