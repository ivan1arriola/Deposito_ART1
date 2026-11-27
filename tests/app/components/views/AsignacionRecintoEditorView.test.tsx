// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AsignacionRecintoEditorView } from "@/app/components/views/AsignacionRecintoEditorView";
import type { Articulo, Equipo, Personal, Rango } from "@/types/entities";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const SAMPLE_EQUIPOS: Equipo[] = [
  {
    equipoId: "1",
    nombre: "Casco táctico",
    tipo: "EQUIPO_COMBATE",
    tipoLabel: "Combate",
    tipoOrden: 1,
    activo: true,
    ordenPdf: 1,
    existenciaSie: 10,
  },
  {
    equipoId: "2",
    nombre: "Binocular nocturno",
    tipo: "OPTICA",
    tipoLabel: "Óptica",
    tipoOrden: 2,
    activo: false,
    ordenPdf: 2,
    existenciaSie: 4,
  },
];

const SAMPLE_ARTICULOS: Articulo[] = [
  { articuloId: 10, nombre: "Resma A4", tipo: "OFICINA", stockActual: 15 },
  { articuloId: 11, nombre: "Detergente 5L", tipo: "LIMPIEZA", stockActual: 6 },
];

const SAMPLE_PERSONAL: Personal[] = [
  {
    ci: "51234567",
    apellido1: "Pérez",
    apellido2: null,
    nombre1: "Juan",
    nombre2: null,
    telefonoContacto: null,
    esReingreso: false,
    fechaIngreso: "01/01/2020",
    fechaIngresoOriginal: "01/01/2020",
    rangoId: 1,
    rango: { rangoId: 1, abreviacion: "Cbo. 1ro.", nombreCompleto: "Cabo de Primera", orden: 1 },
    bateriaId: 1,
    bateria: { bateriaId: 1, nombre: "Batería A", orden: 1 },
    tallas: [],
  },
];

const SAMPLE_RANGOS: Rango[] = [
  { rangoId: 1, abreviacion: "Tte. 1ro.", nombreCompleto: "Teniente Primero", orden: 1 },
];

function jsonResponse(payload: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    text: async () => JSON.stringify(payload),
  } as Response);
}

describe("AsignacionRecintoEditorView (#15, #17, #18, #25, #34)", () => {
  it("carga catálogo de entidades sin error y muestra categorías completas de equipos y artículos", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes("/api/entidades-beneficiarias")) {
        return jsonResponse({
          entidades: [
            { clase: "INTERNO", nombre: "S1", activo: true },
            { clase: "EXTERNO", nombre: "Brigada No. 5", activo: true },
          ],
        });
      }
      if (url === "/api/articulos") {
        return jsonResponse(SAMPLE_ARTICULOS);
      }
      return jsonResponse({});
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AsignacionRecintoEditorView
        equiposOrdenados={SAMPLE_EQUIPOS}
        personal={SAMPLE_PERSONAL}
        rangos={SAMPLE_RANGOS}
        baterias={[{ bateriaId: 1, nombre: "Batería A", orden: 1 }]}
        maxFechaIngreso="2026-11-27"
        onBack={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const entidadSelect = await screen.findByLabelText("Detalle de Entidad");
    await waitFor(() => {
      expect(entidadSelect.innerHTML).toContain("S1");
      expect(entidadSelect.innerHTML).toContain("Batería A");
    });

    const searchInput = screen.getByLabelText("Buscar entidad interna");
    fireEvent.change(searchInput, { target: { value: "S1" } });
    expect(entidadSelect.innerHTML).toContain("S1");
    expect(entidadSelect.innerHTML).not.toContain("Guardia de Prevención");

    const equipoSelect = screen.getByLabelText("Equipo #1");
    expect(equipoSelect.innerHTML).toContain("Binocular nocturno (fuera de hoja)");
    expect(equipoSelect.innerHTML).toContain('label="Combate"');
    expect(equipoSelect.innerHTML).toContain('label="Óptica"');

    fireEvent.click(screen.getByRole("button", { name: /Agregar artículo/i }));
    const articuloSelect = await screen.findByLabelText("Artículo #1");
    await waitFor(() => {
      expect(articuloSelect.innerHTML).toContain("Resma A4 (Stock: 15)");
      expect(articuloSelect.innerHTML).toContain("Detergente 5L (Stock: 6)");
    });
  });

  it("valida campos inline, enfoca el primer error y conserva el borrador", async () => {
    globalThis.fetch = vi.fn(() => jsonResponse({ entidades: [] })) as unknown as typeof fetch;

    render(
      <AsignacionRecintoEditorView
        equiposOrdenados={SAMPLE_EQUIPOS}
        articulosCatalogo={SAMPLE_ARTICULOS}
        personal={SAMPLE_PERSONAL}
        maxFechaIngreso="2026-11-27"
        onBack={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const comentariosInput = screen.getByLabelText(
      "Comentarios generales (opcional)"
    ) as HTMLInputElement;
    fireEvent.change(comentariosInput, { target: { value: "Entrega de prueba" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    const entidadSelect = screen.getByLabelText("Detalle de Entidad");
    expect(entidadSelect.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(entidadSelect);
    expect(comentariosInput.value).toBe("Entrega de prueba");
    expect(screen.getByText("Debes indicar la entidad beneficiaria.")).toBeTruthy();
  });

  it("permite guardar artículos + equipos, previene doble envío y soporta Reintentar impresión", async () => {
    const onSuccess = vi.fn();
    let resolvePost: (value: Response) => void = () => undefined;
    const postBodies: Array<Record<string, unknown>> = [];

    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/api/entidades-beneficiarias")) {
        return jsonResponse({
          entidades: [{ clase: "INTERNO", nombre: "S1", activo: true }],
        });
      }
      if (url === "/api/registros" && init?.method === "POST") {
        postBodies.push(JSON.parse(String(init.body)));
        return new Promise<Response>((resolve) => {
          resolvePost = resolve;
        });
      }
      return jsonResponse({});
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    render(
      <AsignacionRecintoEditorView
        equiposOrdenados={SAMPLE_EQUIPOS}
        articulosCatalogo={SAMPLE_ARTICULOS}
        personal={SAMPLE_PERSONAL}
        maxFechaIngreso="2026-11-27"
        onBack={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    const entidadSelect = await screen.findByLabelText("Detalle de Entidad");
    await waitFor(() => {
      expect(entidadSelect.innerHTML).toContain("S1");
    });
    fireEvent.change(entidadSelect, { target: { value: "S1" } });

    const destInput = screen.getByPlaceholderText(
      "Buscar destinatario por grado, apellido, nombre o CI"
    );
    fireEvent.focus(destInput);
    fireEvent.mouseDown(await screen.findByText(/Cbo\. 1ro\. Pérez, Juan/));

    fireEvent.change(screen.getByLabelText("Equipo #1"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Cantidad equipo #1"), { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /Agregar artículo/i }));
    fireEvent.change(screen.getByLabelText("Artículo #1"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Cantidad artículo #1"), { target: { value: "3" } });

    const summary = screen.getByLabelText("Resumen de la operación");
    expect(summary.textContent).toContain("1 eq. (2 u.) · 1 art. (3 u.)");

    const saveAndPrintBtn = screen.getByRole("button", { name: "Guardar e imprimir" });
    fireEvent.click(saveAndPrintBtn);
    fireEvent.click(saveAndPrintBtn);

    expect(postBodies).toHaveLength(1);
    expect(postBodies[0].articulos).toEqual([{ articuloId: 10, cantidad: 3 }]);
    expect(postBodies[0].equipos).toEqual([{ equipoId: "2", cantidad: 2 }]);

    resolvePost({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ ok: true, registroId: "456" }),
    } as Response);

    const retryButton = await screen.findByRole("button", { name: "Reintentar impresión" });
    expect(openSpy).toHaveBeenCalledWith(
      "/api/registros/456/recibo",
      "_blank",
      "noopener,noreferrer"
    );
    expect(onSuccess).not.toHaveBeenCalled();

    openSpy.mockReturnValue({} as Window);
    fireEvent.click(retryButton);
    expect(openSpy).toHaveBeenCalledTimes(2);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("en modo edición carga el detalle, conserva responsable histórico y envía PUT", async () => {
    const onSuccess = vi.fn();
    const putPayloads: Array<Record<string, unknown>> = [];

    globalThis.fetch = vi.fn((url: string, init?: RequestInit) => {
      if (url.includes("/api/entidades-beneficiarias")) {
        return jsonResponse({
          entidades: [{ clase: "INTERNO", nombre: "S3", activo: true }],
        });
      }
      if (url === "/api/registros/789" && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          registroId: "789",
          fecha: "20/11/2026",
          tipo: "ASIGNACION",
          anulado: false,
          comentarios: "Obs original",
          destinatarioTipo: "EXTERNO",
          recintoClase: null,
          recintoNombre: null,
          recintoResponsableInfo: null,
          destinatarioExternoInfo: {
            grado: "Tte. 1ro.",
            nombre: "Carlos",
            apellido: "Silva",
            ci: "SD-1700000000",
            unidadDestino: "Interno a la Unidad - Entidad Histórica",
          },
          equipos: [],
          articulos: [{ articuloId: 10, nombre: "Resma A4", tipo: "OFICINA", cantidad: 4 }],
        });
      }
      if (url === "/api/registros/789" && init?.method === "PUT") {
        putPayloads.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return jsonResponse({ ok: true, registroId: "789" });
      }
      return jsonResponse({});
    }) as unknown as typeof fetch;

    render(
      <AsignacionRecintoEditorView
        registroId="789"
        equiposOrdenados={SAMPLE_EQUIPOS}
        articulosCatalogo={SAMPLE_ARTICULOS}
        personal={SAMPLE_PERSONAL}
        maxFechaIngreso="2026-11-27"
        onBack={vi.fn()}
        onSuccess={onSuccess}
      />
    );

    expect(await screen.findByText(/Responsable histórico registrado:/)).toBeTruthy();
    const entidadSelect = screen.getByLabelText("Detalle de Entidad") as HTMLSelectElement;
    expect(entidadSelect.value).toBe("Entidad Histórica");

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
    expect(putPayloads).toHaveLength(1);
    const putPayload = putPayloads[0];
    expect(putPayload.destinatarioExterno).toEqual({
      grado: "Tte. 1ro.",
      ci: "SD-1700000000",
      nombre: "Carlos",
      apellido: "Silva",
      unidadDestino: "Interno a la Unidad - Entidad Histórica",
    });
    expect(putPayload.articulos).toEqual([{ articuloId: 10, cantidad: 4 }]);
  });
});
