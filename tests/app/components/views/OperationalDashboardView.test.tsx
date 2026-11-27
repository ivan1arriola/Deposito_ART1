// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OperationalDashboardView } from "@/app/components/views/OperationalDashboardView";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    text: async () => JSON.stringify(payload),
  } as Response);
}

describe("OperationalDashboardView (#31)", () => {
  it("renderiza métricas operativas, acciones según permisos y actividad reciente", async () => {
    globalThis.fetch = vi.fn((url: string) => {
      if (url === "/api/stock") {
        return jsonResponse({
          generatedAt: "2026-11-27T11:00:00Z",
          resumen: [
            {
              equipoId: "1",
              nombre: "Casco",
              tipo: "GENERAL",
              ordenPdf: 1,
              apareceEnHoja: true,
              existenciaSie: 10,
              stockSubalternos: 2,
              stockAsignacion: 1,
              stockPrestamo: 1,
              stockDeposito: -1,
              stockUnidad: 9,
              stockPersonal: 2,
              stockTotal: 9,
              stockActual: -1,
            },
          ],
          historial: [
            {
              id: "10",
              fecha: "2026-11-27",
              tipo: "ENTREGA",
              persona: "Sdo. López",
              totalUnidades: 2,
              comentarios: null,
              equipos: [],
            },
          ],
          prestamos: [
            {
              prestamoId: "50",
              reciboNumero: "P-50",
              estado: "PENDIENTE",
              clasePrestamo: "INTERNO",
              destinatarioEtiqueta: "Sdo. Pérez",
              destinatarioCi: "51234567",
              destinatarioUnidadDestino: null,
              actuanteNombre: null,
              fechaPrestamo: "2026-11-27",
              fechaEstimadaDevolucionTexto: null,
              fechaDevolucion: null,
              comentarios: null,
              equipos: [],
            },
          ],
        });
      }
      return jsonResponse({
        rows: [
          {
            movimientoId: "201",
            fecha: "2026-11-27",
            tipo: "ASIGNACION",
            clase: "INTERNO",
            nombre: "S1",
            anulado: false,
            equipos: [{ equipo: "Casco", cantidad: 1 }],
            articulos: [],
            observaciones: null,
            usuarioEntrega: null,
          },
          {
            movimientoId: "202",
            fecha: "2026-11-26",
            tipo: "ASIGNACION",
            clase: "EXTERNO",
            nombre: "Brigada 5",
            anulado: true,
            equipos: [{ equipo: "Casco", cantidad: 1 }],
            articulos: [],
            observaciones: null,
            usuarioEntrega: null,
          },
        ],
      });
    }) as unknown as typeof fetch;

    const onOpenEntrega = vi.fn();
    const onNavigateView = vi.fn();

    render(
      <OperationalDashboardView
        canWrite={true}
        isAdmin={true}
        onNavigateView={onNavigateView}
        onOpenEntrega={onOpenEntrega}
        onOpenAsignacion={vi.fn()}
        onOpenPrestamo={vi.fn()}
      />
    );

    expect(screen.getByText("Cargando resumen operativo...")).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Asignaciones vigentes")).toBeTruthy();
    });

    expect(screen.getByText("Préstamos pendientes")).toBeTruthy();
    expect(screen.getByText("Diferencias SIE")).toBeTruthy();
    expect(screen.getByText("Stock negativo en depósito")).toBeTruthy();
    expect(screen.getByText("ENTREGA · Sdo. López")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Nueva entrega" }));
    expect(onOpenEntrega).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Auditoría detallada" }));
    expect(onNavigateView).toHaveBeenCalledWith("auditoria");
  });

  it("maneja estado vacío y error con botón Reintentar y oculta escritura sin permisos", async () => {
    let shouldFail = true;
    globalThis.fetch = vi.fn(() => {
      if (shouldFail) {
        return jsonResponse({ error: "Fallo temporal de red" }, false, 500);
      }
      return jsonResponse({ resumen: [], historial: [], prestamos: [], rows: [] });
    }) as unknown as typeof fetch;

    render(
      <OperationalDashboardView
        canWrite={false}
        isAdmin={false}
        onNavigateView={vi.fn()}
        onOpenEntrega={vi.fn()}
        onOpenAsignacion={vi.fn()}
        onOpenPrestamo={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Nueva entrega" })).toBeNull();
    expect(await screen.findByText("Fallo temporal de red")).toBeTruthy();

    shouldFail = false;
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByText("No hay movimientos recientes registrados en el historial de stock.")
    ).toBeTruthy();
    expect(screen.getByText("No hay asignaciones registradas hasta el momento.")).toBeTruthy();
  });
});
