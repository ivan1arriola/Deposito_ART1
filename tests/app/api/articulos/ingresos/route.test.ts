import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/articulos/ingresos/route";
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
}));

const mockTx = {
  articulo: {
    findUnique: vi.fn(),
  },
  articuloStockMovimiento: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

describe("POST /api/articulos/ingresos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/articulos/ingresos", {
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

    const res = await POST(createMockRequest({ articuloId: 1, cantidad: 12 }));

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 400 si el payload es invalido", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);

    const res = await POST(createMockRequest({ articuloId: 1, cantidad: -5 }));

    expect(res.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 404 si el articulo no existe", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);
    mockTx.articulo.findUnique.mockResolvedValue(null);

    const res = await POST(createMockRequest({ articuloId: 99, cantidad: 10 }));

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Artículo no encontrado.");
  });

  it("actualiza el stock del articulo y registra auditoria", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);
    mockTx.articulo.findUnique.mockResolvedValue({
      articuloId: 1,
      nombre: "Block de Hojas A4",
      tipo: "OFICINA",
    });
    mockTx.articuloStockMovimiento.create.mockResolvedValue({
      articuloStockMovimientoId: BigInt("500"),
    });
    // After creating the INGRESO movement, stock is computed as 22
    vi.mocked(calcularStockArticulo).mockResolvedValue(22);

    const res = await POST(
      createMockRequest({ articuloId: 1, cantidad: 12, comentarios: "Compra mensual" })
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      articuloId: 1,
      nombre: "Block de Hojas A4",
      tipo: "OFICINA",
      stockActual: 22,
    });

    // Verify that only a movement record was created (no update to stockActual column)
    expect(mockTx.articulo.findUnique).toHaveBeenCalledWith({
      where: { articuloId: 1 },
      select: {
        articuloId: true,
        nombre: true,
        tipo: true,
      },
    });
    expect(mockTx.articuloStockMovimiento.create).toHaveBeenCalledWith({
      data: {
        articuloId: 1,
        tipo: "INGRESO",
        cantidad: 12,
        comentario: "Compra mensual",
      },
      select: {
        articuloStockMovimientoId: true,
      },
    });

    // Stock is computed dynamically after the movement
    expect(calcularStockArticulo).toHaveBeenCalledWith(1, mockTx);

    expect(logAudit).toHaveBeenCalledWith({
      usuarioId: "usr-1",
      accion: "UPDATE",
      entidad: "ARTICULO_STOCK",
      entidadId: "500",
      detalle: {
        articuloId: 1,
        articulo: "Block de Hojas A4",
        tipo: "OFICINA",
        tipoMovimiento: "INGRESO",
        cantidadIngresada: 12,
        stockActual: 22,
        comentario: "Compra mensual",
      },
    });
  });
});
