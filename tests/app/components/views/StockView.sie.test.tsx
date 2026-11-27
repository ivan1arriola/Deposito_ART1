// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StockView } from "@/app/components/views/StockView";
import type { StockViewProps } from "@/app/components/views/stock/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function buildProps(overrides?: Partial<StockViewProps>): StockViewProps {
  return {
    section: "total",
    data: {
      generatedAt: "27/11/2026 10:00",
      resumen: [
        {
          equipoId: "1",
          nombre: "Casco",
          tipo: "GENERAL",
          tipoEquipoId: null,
          tipoLabel: "General",
          tipoOrden: 1,
          ordenPdf: 1,
          apareceEnHoja: true,
          existenciaSie: 10,
          stockSubalternos: 2,
          stockAsignacion: 1,
          stockPrestamo: 1,
          stockDeposito: 6,
          stockUnidad: 10,
          stockPersonal: 2,
          stockTotal: 10,
          stockActual: 6,
        },
      ],
      historial: [],
      prestamos: [],
    },
    loading: false,
    error: null,
    canWrite: true,
    isAdmin: true,
    equipos: [],
    draft: {
      tipo: "INGRESO",
      fecha: "27/11/2026",
      comentarios: "",
      equipos: [{ equipoId: "", cantidad: "1" }],
    },
    saving: false,
    maxDate: "2026-11-27",
    onDraftChange: vi.fn(),
    onDraftItemChange: vi.fn(),
    onAddItem: vi.fn(),
    onRemoveEquipo: vi.fn(),
    onSubmit: vi.fn(),
    personal: [],
    oficialesSuboficiales: [],
    prestamoDraft: {
      clasePrestamo: "INTERNO",
      destinatarioTipo: "PERSONAL",
      destinatarioCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
      actuanteCi: "",
      fechaPrestamo: "27/11/2026",
      fechaEstimadaDevolucionTexto: "",
      comentarios: "",
      equipos: [{ equipoId: "", cantidad: "1", estadoEntrega: "NUEVO", comentarioEntrega: "" }],
    },
    prestamoSaving: false,
    returningPrestamoId: null,
    onPrestamoDraftChange: vi.fn(),
    onPrestamoItemChange: vi.fn(),
    onAddPrestamoItem: vi.fn(),
    onRemovePrestamoItem: vi.fn(),
    onSubmitPrestamo: vi.fn(),
    onSubmitPrestamoAndPrint: vi.fn(),
    onReturnPrestamo: vi.fn(),
    onReload: vi.fn(),
    ...overrides,
  };
}

describe("StockView edición explícita de existencia SIE (#23)", () => {
  it("perder el foco conserva el borrador sin persistir y muestra Guardar/Cancelar y Original", () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    render(<StockView {...buildProps()} />);
    const input = screen.getByLabelText("Existencia del SIE para Casco") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "18" } });
    fireEvent.blur(input);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(input.value).toBe("18");
    expect(screen.getByText("Original: 10")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
  });

  it("Escape cancela el borrador y restaura el valor original", () => {
    render(<StockView {...buildProps()} />);
    const input = screen.getByLabelText("Existencia del SIE para Casco") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "18" } });
    expect(input.value).toBe("18");

    fireEvent.keyDown(input, { key: "Escape" });
    expect(input.value).toBe("10");
    expect(screen.queryByRole("button", { name: "Guardar" })).toBeNull();
  });

  it("Guardar envía expectedExistenciaSie y muestra conflicto 409 conservando el borrador", async () => {
    const onReload = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: "La existencia SIE fue modificada por otro usuario.",
            currentExistenciaSie: 25,
          }),
          { status: 409 }
        )
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ equipoId: "1", existenciaSie: 18 }), { status: 200 })
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<StockView {...buildProps({ onReload })} />);
    const input = screen.getByLabelText("Existencia del SIE para Casco") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/Otro usuario modificó el SIE\. Valor vigente: 25/i).length
      ).toBeGreaterThan(0);
    });
    expect(input.value).toBe("18");
    expect(screen.getByText("Original: 25")).toBeTruthy();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/equipos/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: 18, expectedExistenciaSie: 10 }),
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => {
      expect(onReload).toHaveBeenCalledTimes(1);
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/equipos/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: 18, expectedExistenciaSie: 25 }),
      })
    );
  });
});
