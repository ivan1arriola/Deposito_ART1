// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MovimientosRecintosView } from "@/app/components/views/MovimientosRecintosView";
import type { MovimientoRecintoViewRow } from "@/types/views";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ROWS: MovimientoRecintoViewRow[] = [
  {
    movimientoId: "101",
    fecha: "2026-11-27",
    tipo: "ASIGNACION",
    clase: "INTERNO",
    nombre: "Batería A",
    anulado: false,
    equipos: [{ equipo: "Casco táctico", cantidad: 2 }],
    articulos: [{ articuloId: 5, articulo: "Resma A4", tipo: "OFICINA", cantidad: 3 }],
    observaciones: "Dotación anual",
    usuarioEntrega: "García, Luis",
  },
  {
    movimientoId: "102",
    fecha: "2026-11-26",
    tipo: "ASIGNACION",
    clase: "EXTERNO",
    nombre: "Brigada No. 5",
    anulado: true,
    equipos: [{ equipo: "Carpa", cantidad: 1 }],
    articulos: [],
    observaciones: "Anulada por error de destino",
    usuarioEntrega: "García, Luis",
  },
];

describe("MovimientosRecintosView (#16 y artículos/anuladas)", () => {
  it("muestra acciones con texto visible >=44px, artículos, estado Anulada y detalle completo", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          generatedAt: "2026-11-27T11:00:00.000Z",
          total: ROWS.length,
          rows: ROWS,
        }),
      } as Response)
    ) as unknown as typeof fetch;

    const onRectify = vi.fn();
    const onDelete = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as Window);

    render(
      <MovimientosRecintosView
        canWrite={true}
        canDelete={true}
        onOpenRegistro={vi.fn()}
        onDeleteRegistro={onDelete}
        onRectifyRegistro={onRectify}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Batería A").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("Resma A4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anulada").length).toBeGreaterThan(0);

    const detalleBtn = screen.getAllByRole("button", {
      name: "Ver detalle de asignación Batería A",
    })[0];
    const imprimirBtn = screen.getAllByRole("button", {
      name: "Imprimir recibo de asignación Batería A",
    })[0];
    const editarBtn = screen.getAllByRole("button", {
      name: "Editar asignación Batería A",
    })[0];
    const anularBtn = screen.getAllByRole("button", {
      name: "Anular asignación Batería A",
    })[0];

    expect(detalleBtn.className).toContain("min-h-[44px]");
    expect(imprimirBtn.className).toContain("min-h-[44px]");
    expect(editarBtn.className).toContain("min-h-[44px]");
    expect(anularBtn.className).toContain("min-h-[44px]");

    const editarAnuladaBtn = screen.getAllByRole("button", {
      name: "Editar asignación Brigada No. 5",
    })[0] as HTMLButtonElement;
    const anularAnuladaBtn = screen.getAllByRole("button", {
      name: "Anular asignación Brigada No. 5",
    })[0] as HTMLButtonElement;
    expect(editarAnuladaBtn.disabled).toBe(true);
    expect(anularAnuladaBtn.disabled).toBe(true);

    fireEvent.click(editarBtn);
    expect(onRectify).toHaveBeenCalledWith("101");

    fireEvent.click(imprimirBtn);
    expect(openSpy).toHaveBeenCalledWith(
      "/api/registros/101/recibo",
      "_blank",
      "noopener,noreferrer"
    );

    fireEvent.click(anularBtn);
    expect(onDelete).toHaveBeenCalledWith("101", "2026-11-27", "Batería A", expect.any(Function));

    fireEvent.click(detalleBtn);
    expect(await screen.findByText("Detalle de Asignación")).toBeTruthy();
    expect(screen.getAllByText("Artículos").length).toBeGreaterThanOrEqual(2);
  });

  it("oculta botones de edición/anulación según permisos", async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          generatedAt: "2026-11-27T11:00:00.000Z",
          total: 1,
          rows: [ROWS[0]],
        }),
      } as Response)
    ) as unknown as typeof fetch;

    render(
      <MovimientosRecintosView
        canWrite={false}
        canDelete={false}
        onOpenRegistro={vi.fn()}
        onDeleteRegistro={vi.fn()}
        onRectifyRegistro={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText("Batería A").length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole("button", { name: /Editar asignación/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Anular asignación/i })).toBeNull();
    expect(
      screen.getAllByRole("button", { name: "Ver detalle de asignación Batería A" }).length
    ).toBeGreaterThan(0);
  });
});
