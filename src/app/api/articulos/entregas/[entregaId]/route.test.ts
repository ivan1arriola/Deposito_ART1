import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockTx = {
  articuloStockMovimiento: {
    deleteMany: vi.fn(),
  },
  articuloEntregaPersonal: {
    delete: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    articuloEntregaPersonal: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

describe("DELETE /api/articulos/entregas/[entregaId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest() {
    return new Request("http://localhost:3000/api/articulos/entregas/301", {
      method: "DELETE",
    });
  }

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const res = await DELETE(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 404 si la entrega no existe", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-admin",
        rol: "ADMIN",
      },
    } as never);

    vi.mocked(prisma.articuloEntregaPersonal.findUnique).mockResolvedValue(null);

    const res = await DELETE(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("La entrega no existe o ya fue eliminada.");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("elimina la entrega, borra movimientos (stock se recalcula automáticamente) y registra auditoria", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "usr-admin",
        rol: "ADMIN",
      },
    } as never);

    vi.mocked(prisma.articuloEntregaPersonal.findUnique).mockResolvedValue({
      articuloEntregaPersonalId: BigInt("301"),
      personalCi: "12345672",
      comentario: "Entrega semanal",
      personal: {
        nombre1: "Juan",
        apellido1: "Perez",
      },
      movimientosStock: [
        {
          articuloId: 1,
          cantidad: 5,
          articulo: {
            nombre: "Block de Hojas A4",
          },
        },
        {
          articuloId: 2,
          cantidad: 2,
          articulo: {
            nombre: "Lavandina",
          },
        },
      ],
    } as never);

    mockTx.articuloStockMovimiento.deleteMany.mockResolvedValue({ count: 2 } as never);
    mockTx.articuloEntregaPersonal.delete.mockResolvedValue({} as never);

    const res = await DELETE(createMockRequest(), {
      params: Promise.resolve({ entregaId: "301" }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);

    // Stock is computed dynamically from movements - no need to increment stockActual.
    // Simply deleting the movements restores the correct computed stock.

    // Verify correct deletion order inside transaction
    expect(mockTx.articuloStockMovimiento.deleteMany).toHaveBeenCalledWith({
      where: { articuloEntregaPersonalId: BigInt("301") },
    });
    expect(mockTx.articuloEntregaPersonal.delete).toHaveBeenCalledWith({
      where: { articuloEntregaPersonalId: BigInt("301") },
    });

    // Verify audit log
    expect(logAudit).toHaveBeenCalledWith({
      usuarioId: "usr-admin",
      accion: "DELETE",
      entidad: "ARTICULO_ENTREGA",
      entidadId: "301",
      detalle: {
        evento: "ARTICULO_ENTREGA_ELIMINADA",
        personalCi: "12345672",
        personalNombre: "Perez, Juan",
        comentarioOriginal: "Entrega semanal",
        items: "Block de Hojas A4 (x5), Lavandina (x2)",
      },
    });
  });
});
