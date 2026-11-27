// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonalActions } from "@/app/components/personal/PersonalActions";
import { PersonalFilters } from "@/app/components/personal/PersonalFilters";

afterEach(cleanup);

function actions(canWrite: boolean) {
  const handlers = {
    onToggleEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleTallas: vi.fn(),
    onEntrega: vi.fn(),
    onDevolucion: vi.fn(),
    onObservacion: vi.fn(),
    onViewMoves: vi.fn(),
    onOpenProfile: vi.fn(),
    onOpenSheet: vi.fn(),
  };
  render(<PersonalActions canWrite={canWrite} editing={false} tallasOpen={false} {...handlers} />);
  return handlers;
}

describe("Directorio de personal subalterno", () => {
  it("mantiene ficha y entrega visibles y conserva las acciones secundarias", () => {
    const handlers = actions(true);
    fireEvent.click(screen.getByRole("button", { name: "Ver ficha" }));
    fireEvent.click(screen.getByRole("button", { name: "Entrega" }));
    expect(handlers.onOpenProfile).toHaveBeenCalledOnce();
    expect(handlers.onEntrega).toHaveBeenCalledOnce();
    expect(screen.queryByText("Devolución")).toBeNull();

    const more = screen.getByRole("button", { name: "Más acciones" });
    fireEvent.click(more);
    expect(more.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(screen.getByRole("menuitem", { name: "Devolución" }));
    expect(handlers.onDevolucion).toHaveBeenCalledOnce();
  });

  it("ofrece acciones de consulta a un rol de solo lectura", () => {
    actions(false);
    expect(screen.queryByRole("button", { name: "Entrega" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Más acciones" }));
    expect(screen.getByRole("menuitem", { name: "Hoja de entrega" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Borrar" })).toBeNull();
  });

  it("identifica el panel de filtros móvil y ofrece un selector de batería", () => {
    const onBateriaFilterChange = vi.fn();
    render(
      <PersonalFilters
        searchCedula=""
        searchApellidos=""
        searchNombres=""
        bateriaFilter="ALL"
        baterias={[{ bateriaId: 1, nombre: "Batería de prueba", orden: 1 }]}
        hasFilters={false}
        onSearchCedulaChange={vi.fn()}
        onSearchApellidosChange={vi.fn()}
        onSearchNombresChange={vi.fn()}
        onBateriaFilterChange={onBateriaFilterChange}
        onClear={vi.fn()}
      />
    );
    const toggle = screen.getByRole("button", { name: "Filtros" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByRole("combobox", { name: "Batería" }), { target: { value: "1" } });
    expect(onBateriaFilterChange).toHaveBeenCalledWith("1");
  });
});
