import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/articulos/entregas/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { calcularStockArticulo } from "@/lib/stock-calc";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/stock-calc", () => ({
  calcularStockArticulo: vi.fn(),
  lockArticulosForUpdate: vi.fn(),
}));

const mockTx = {
  personal: {
    findUnique: vi.fn(),
  },
  articulo: {
    findMany: vi.fn(),
  },
  articuloEntregaPersonal: {
    create: vi.fn(),
  },
  articuloStockMovimiento: {
    createMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

describe("POST /api/articulos/entregas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/articulos/entregas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const res = await POST(
      createMockRequest({
        personalCi: "12345672",
        ordenanteCi: "12345688",
        equipos: [{ articuloId: 1, cantidad: 2 }],
      })
    );

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 si el payload es invalido", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-1",
        grado: "Tte.",
        apellido: "Perez",
        nombre: "Ana",
        username: "aperez",
      },
    } as never);

    const res = await POST(
      createMockRequest({
        personalCi: "12345672",
        ordenanteCi: "12345688",
        equipos: [{ articuloId: 1, cantidad: -1 }],
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Cada equipo debe incluir");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 404 si el personal destinatario no existe", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-1",
        grado: "Tte.",
        apellido: "Perez",
        nombre: "Ana",
        username: "aperez",
      },
    } as never);
    mockTx.personal.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
      ci: "12345688",
      apellido1: "Lopez",
      apellido2: null,
      nombre1: "Mario",
      nombre2: null,
      rango: { nombreCompleto: "Capitán", abreviacion: "Cap." },
      bateria: true,
    });
    mockTx.articulo.findMany.mockResolvedValue([
      {
        articuloId: 1,
        nombre: "Block de Hojas A4",
        tipo: "OFICINA",
      },
    ]);

    const res = await POST(
      createMockRequest({
        personalCi: "12345672",
        ordenanteCi: "12345688",
        equipos: [{ articuloId: 1, cantidad: 2 }],
      })
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Personal destinatario no encontrado.");
    expect(mockTx.articuloEntregaPersonal.create).not.toHaveBeenCalled();
    expect(mockTx.articuloStockMovimiento.createMany).not.toHaveBeenCalled();
  });

  it("retorna 409 si no hay stock suficiente", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-1",
        grado: "Tte.",
        apellido: "Perez",
        nombre: "Ana",
        username: "aperez",
      },
    } as never);
    mockTx.personal.findUnique
      .mockResolvedValueOnce({
        ci: "12345672",
        apellido1: "Gomez",
        apellido2: null,
        nombre1: "Luis",
        nombre2: null,
        rango: { nombreCompleto: "Soldado", abreviacion: "Sdo." },
        bateria: true,
      })
      .mockResolvedValueOnce({
        ci: "12345688",
        apellido1: "Lopez",
        apellido2: null,
        nombre1: "Mario",
        nombre2: null,
        rango: { nombreCompleto: "Capitán", abreviacion: "Cap." },
        bateria: true,
      });
    mockTx.articulo.findMany.mockResolvedValue([
      {
        articuloId: 1,
        nombre: "Block de Hojas A4",
        tipo: "OFICINA",
      },
    ]);
    // Stock computed dynamically: only 1 available, requesting 3
    vi.mocked(calcularStockArticulo).mockResolvedValue(1);

    const res = await POST(
      createMockRequest({
        personalCi: "12345672",
        ordenanteCi: "12345688",
        fecha: "2026-05-20",
        comentario: "Entrega semanal",
        equipos: [{ articuloId: 1, cantidad: 3 }],
      })
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Stock insuficiente");
    expect(mockTx.articuloEntregaPersonal.create).not.toHaveBeenCalled();
    expect(mockTx.articuloStockMovimiento.createMany).not.toHaveBeenCalled();
  });

  it("crea la entrega y registra los movimientos de egreso", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-admin",
        grado: "Tte.",
        apellido: "Perez",
        nombre: "Ana",
        username: "aperez",
      },
    } as never);
    mockTx.personal.findUnique
      .mockResolvedValueOnce({
        ci: "12345672",
        apellido1: "Gomez",
        apellido2: null,
        nombre1: "Luis",
        nombre2: null,
        rango: { nombreCompleto: "Soldado", abreviacion: "Sdo." },
        bateria: true,
      })
      .mockResolvedValueOnce({
        ci: "12345688",
        apellido1: "Lopez",
        apellido2: null,
        nombre1: "Mario",
        nombre2: null,
        rango: { nombreCompleto: "Capitán", abreviacion: "Cap." },
        bateria: true,
      });
    mockTx.articulo.findMany.mockResolvedValue([
      {
        articuloId: 1,
        nombre: "Block de Hojas A4",
        tipo: "OFICINA",
      },
      {
        articuloId: 2,
        nombre: "Lavandina",
        tipo: "LIMPIEZA",
      },
    ]);

    // Stock validation: enough stock for both equipos
    vi.mocked(calcularStockArticulo)
      .mockResolvedValueOnce(40) // validation: art 1 has 40
      .mockResolvedValueOnce(12) // validation: art 2 has 12
      .mockResolvedValueOnce(35) // after egreso: art 1 has 35
      .mockResolvedValueOnce(10); // after egreso: art 2 has 10

    mockTx.articuloEntregaPersonal.create.mockResolvedValue({
      articuloEntregaPersonalId: BigInt("301"),
      personalCi: "12345672",
      usuarioEntregaId: "usr-admin",
      ordenanteCi: "12345688",
      fecha: new Date("2026-05-20T00:00:00.000Z"),
      comentario: "Entrega semanal",
    });
    mockTx.articuloStockMovimiento.createMany.mockResolvedValue({ count: 2 });

    const res = await POST(
      createMockRequest({
        personalCi: "12345672",
        ordenanteCi: "12345688",
        fecha: "2026-05-20",
        comentario: "Entrega semanal",
        equipos: [
          { articuloId: 1, cantidad: 5 },
          { articuloId: 2, cantidad: 2 },
        ],
      })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      entregaId: "301",
      personalCi: "12345672",
      usuarioEntregaId: "usr-admin",
      ordenanteCi: "12345688",
      fecha: "20/05/2026",
      comentario: "Entrega semanal",
      equipos: [
        {
          articuloId: 1,
          nombre: "Block de Hojas A4",
          tipo: "OFICINA",
          cantidad: 5,
          stockActual: 35,
        },
        {
          articuloId: 2,
          nombre: "Lavandina",
          tipo: "LIMPIEZA",
          cantidad: 2,
          stockActual: 10,
        },
      ],
    });

    expect(mockTx.articuloEntregaPersonal.create).toHaveBeenCalledWith({
      data: {
        personalCi: "12345672",
        usuarioEntregaId: "usr-admin",
        ordenanteCi: "12345688",
        fecha: expect.any(Date),
        comentario: "Entrega semanal",
      },
      select: {
        articuloEntregaPersonalId: true,
        personalCi: true,
        usuarioEntregaId: true,
        ordenanteCi: true,
        fecha: true,
        comentario: true,
      },
    });

    // Movements are created (not updateMany on stockActual!)
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledWith({
      data: [
        {
          articuloId: 1,
          tipo: "EGRESO",
          cantidad: 5,
          comentario: "Entrega semanal",
          articuloEntregaPersonalId: BigInt("301"),
        },
        {
          articuloId: 2,
          tipo: "EGRESO",
          cantidad: 2,
          comentario: "Entrega semanal",
          articuloEntregaPersonalId: BigInt("301"),
        },
      ],
    });
    expect(logAudit).toHaveBeenCalledWith({
      usuarioId: "usr-admin",
      accion: "CREATE",
      entidad: "ARTICULO_ENTREGA_PERSONAL",
      entidadId: "301",
      detalle: expect.objectContaining({
        evento: "STOCK_ARTICULO_EGRESO",
        usuarioEntrega: "Tte. Perez, Ana",
        fechaMovimiento: "20/05/2026",
        comentarios: "Entrega semanal",
        totalUnidades: 7,
        articulos: [
          { nombre: "Block de Hojas A4", cantidad: 5 },
          { nombre: "Lavandina", cantidad: 2 },
        ],
      }),
    });
  });
});
