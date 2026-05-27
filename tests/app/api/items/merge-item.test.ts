import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/items/[itemId]/route";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { applyItemOrder, getOrderedItemIds } from "@/lib/item-ordering";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/item-ordering", () => ({
  applyItemOrder: vi.fn().mockResolvedValue(undefined),
  getOrderedItemIds: vi.fn().mockResolvedValue(["20", "30"]),
  insertItemAtOrder: vi.fn(),
}));

const mockTx = {
  item: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  movimientoItem: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  stockOperacionItem: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  cajaItem: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  itemCodigoSIE: {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cajaItemCodigoSIE: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => {
      return callback(mockTx);
    }),
  },
}));

describe("POST /api/items/[itemId] (Merge unificar equipos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/items/10", {
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

    const req = createMockRequest({ targetItemId: "20" });
    const res = await POST(req, { params: Promise.resolve({ itemId: "10" }) });

    expect(res.status).toBe(403);
  });

  it("retorna 400 si se intenta unificar el mismo equipo origen y destino", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);

    const req = createMockRequest({ targetItemId: "10" });
    const res = await POST(req, { params: Promise.resolve({ itemId: "10" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("distintos para unificar");
  });

  it("unifica equipos migrando movimientos, stock, cajas y codigos SIE de forma completa", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);

    mockTx.item.findUniqueOrThrow.mockImplementation(async ({ where }: { where: { itemId: bigint } }) => {
      if (where.itemId === BigInt(10)) return { itemId: BigInt(10), nombre: "Botas Viejas", activo: true, existenciaSie: 5 };
      if (where.itemId === BigInt(20)) return { itemId: BigInt(20), nombre: "Botas Nuevas", activo: true, existenciaSie: 15 };
      throw new Error("Item not found");
    });

    mockTx.movimientoItem.findMany.mockImplementation(async ({ where }: { where: { itemId: bigint } }) => {
      if (where.itemId === BigInt(10)) {
        return [
          {
            movimientoId: BigInt(100),
            cantidad: 2,
            estadoEntrega: "BUENO",
            comentarioEntrega: "entregado",
            estadoDevolucion: null,
            comentarioDevolucion: null,
          },
        ];
      }
      return [];
    });

    mockTx.stockOperacionItem.findMany.mockImplementation(async ({ where }: { where: { itemId: bigint } }) => {
      if (where.itemId === BigInt(10)) {
        return [{ stockOperacionId: BigInt(50), cantidad: 10 }];
      }
      return [];
    });

    mockTx.cajaItem.findMany.mockImplementation(async ({ where }: { where: { itemId: bigint } }) => {
      if (where.itemId === BigInt(10)) {
        return [{ codigoDepositoGeneral: "CAJA_01", cantidad: 4 }];
      }
      return [];
    });

    mockTx.itemCodigoSIE.findMany.mockImplementation(async ({ where }: { where: { itemId: bigint } }) => {
      if (where.itemId === BigInt(10)) {
        return [
          { itemCodigoSIEId: BigInt(1), codigo: "SIE_001", talla: "42" },
          { itemCodigoSIEId: BigInt(2), codigo: "SIE_002", talla: "44" },
        ];
      }
      if (where.itemId === BigInt(20)) {
        return [{ itemCodigoSIEId: BigInt(99), codigo: "SIE_001", talla: "42" }]; // Codigo SIE_001 ya existe en el target
      }
      return [];
    });

    mockTx.cajaItemCodigoSIE.findMany.mockResolvedValue([
      { codigoDepositoGeneral: "CAJA_01", itemCodigoSIEId: BigInt(1) },
    ]);
    mockTx.cajaItemCodigoSIE.findUnique.mockResolvedValue(null);

    const req = createMockRequest({ targetItemId: "20" });
    const res = await POST(req, { params: Promise.resolve({ itemId: "10" }) });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.sourceItem.nombre).toBe("Botas Viejas");
    expect(data.targetItem.nombre).toBe("Botas Nuevas");
    expect(data.resumen.totalMovimientosAfectados).toBe(2); // 1 mov + 1 stock

    expect(mockTx.movimientoItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          movimientoId: BigInt(100),
          itemId: BigInt(20),
          cantidad: 2,
          estadoEntrega: "BUENO",
          comentarioEntrega: "entregado",
          estadoDevolucion: null,
          comentarioDevolucion: null,
        },
      }),
    );
    expect(mockTx.movimientoItem.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { movimientoId_itemId: { movimientoId: BigInt(100), itemId: BigInt(10) } },
      }),
    );

    expect(mockTx.stockOperacionItem.upsert).toHaveBeenCalled();
    expect(mockTx.stockOperacionItem.delete).toHaveBeenCalled();

    expect(mockTx.cajaItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigoDepositoGeneral_itemId: { codigoDepositoGeneral: "CAJA_01", itemId: BigInt(20) } },
        update: { cantidad: { increment: 4 } },
        create: { codigoDepositoGeneral: "CAJA_01", itemId: BigInt(20), cantidad: 4 },
      }),
    );
    expect(mockTx.cajaItem.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigoDepositoGeneral_itemId: { codigoDepositoGeneral: "CAJA_01", itemId: BigInt(10) } },
      }),
    );

    expect(mockTx.cajaItemCodigoSIE.create).toHaveBeenCalledWith({
      data: { codigoDepositoGeneral: "CAJA_01", itemCodigoSIEId: BigInt(99) },
    });
    expect(mockTx.itemCodigoSIE.delete).toHaveBeenCalledWith({
      where: { itemCodigoSIEId: BigInt(1) },
    });

    expect(mockTx.itemCodigoSIE.update).toHaveBeenCalledWith({
      where: { itemCodigoSIEId: BigInt(2) },
      data: { itemId: BigInt(20) },
    });

    expect(mockTx.item.update).toHaveBeenCalledWith({
      where: { itemId: BigInt(20) },
      data: { existenciaSie: { increment: 5 } },
    });

    expect(mockTx.item.delete).toHaveBeenCalledWith({
      where: { itemId: BigInt(10) },
    });

    expect(logAudit).toHaveBeenCalled();
  });
});
