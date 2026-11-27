// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StockView } from "@/app/components/views/StockView";
import type { StockViewProps } from "@/app/components/views/stock/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function buildProps(): StockViewProps {
  return {
    section: "total",
    data: {
      generatedAt: "27/11/2026 11:00",
      resumen: [
        {
          equipoId: "1",
          nombre: "Casco balístico",
          tipo: "GENERAL",
          tipoEquipoId: null,
          tipoLabel: "General",
          tipoOrden: 1,
          ordenPdf: 1,
          apareceEnHoja: true,
          existenciaSie: 12,
          stockSubalternos: -2,
          stockAsignacion: 3,
          stockPrestamo: 1,
          stockDeposito: 8,
          stockUnidad: 10,
          stockPersonal: -2,
          stockTotal: 10,
          stockActual: 8,
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
  };
}

describe("StockView accesibilidad, móvil, diferencia SIE e indicador estático (#24, #27)", () => {
  it("muestra acciones identificables, diferencia Unidad vs SIE, vista móvil e indicador estático sin animate-pulse", () => {
    const { container } = render(<StockView {...buildProps()} />);

    expect(container.innerHTML).not.toContain("animate-pulse");

    const subBtn = screen.getByRole("button", {
      name: "Ver detalle de Casco balístico en Subalternos: -2",
    });
    const recBtn = screen.getByRole("button", {
      name: "Ver detalle de Casco balístico en Recintos: 3",
    });
    const presBtn = screen.getByRole("button", {
      name: "Ver detalle de Casco balístico en Préstamo: 1",
    });
    expect(subBtn.textContent).toContain("Negativo");
    expect(recBtn).toBeTruthy();
    expect(presBtn).toBeTruthy();

    expect(screen.getByText("Diferencia")).toBeTruthy();
    expect(screen.getAllByText("-2").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("stock-mobile-GENERAL")).toBeTruthy();
  });
});
