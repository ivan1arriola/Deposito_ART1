import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/equipos/[equipoId]/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/equipo-ordering", () => ({
  applyEquipoOrder: vi.fn().mockResolvedValue(undefined),
  getOrderedEquipoIds: vi.fn().mockResolvedValue(["20", "30"]),
  insertEquipoAtOrder: vi.fn(),
}));

const mockTx = {
  equipo: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  movimientoEquipo: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  stockOperacionEquipo: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  cajaEquipo: {
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  equipoCodigoSIE: {
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  cajaEquipoCodigoSIE: {
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

describe("POST /api/equipos/[equipoId] (Merge unificar equipos)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/equipos/10", {
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

    const req = createMockRequest({ targetEquipoId: "20" });
    const res = await POST(req, { params: Promise.resolve({ equipoId: "10" }) });

    expect(res.status).toBe(403);
  });

  it("retorna 400 si se intenta unificar el mismo equipo origen y destino", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);

    const req = createMockRequest({ targetEquipoId: "10" });
    const res = await POST(req, { params: Promise.resolve({ equipoId: "10" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("distintos para unificar");
  });

  it("unifica equipos migrando movimientos, stock, cajas y codigos SIE de forma completa", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-1" },
    } as never);

    mockTx.equipo.findUniqueOrThrow.mockImplementation(async ({ where }: { where: { equipoId: bigint } }) => {
      if (where.equipoId === BigInt(10)) return { equipoId: BigInt(10), nombre: "Botas Viejas", activo: true, existenciaSie: 5 };
      if (where.equipoId === BigInt(20)) return { equipoId: BigInt(20), nombre: "Botas Nuevas", activo: true, existenciaSie: 15 };
      throw new Error("Equipo not found");
    });

    mockTx.movimientoEquipo.findMany.mockImplementation(async ({ where }: { where: { equipoId: bigint } }) => {
      if (where.equipoId === BigInt(10)) {
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

    mockTx.stockOperacionEquipo.findMany.mockImplementation(async ({ where }: { where: { equipoId: bigint } }) => {
      if (where.equipoId === BigInt(10)) {
        return [{ stockOperacionId: BigInt(50), cantidad: 10 }];
      }
      return [];
    });

    mockTx.cajaEquipo.findMany.mockImplementation(async ({ where }: { where: { equipoId: bigint } }) => {
      if (where.equipoId === BigInt(10)) {
        return [{ codigoDepositoGeneral: "CAJA_01", cantidad: 4 }];
      }
      return [];
    });

    mockTx.equipoCodigoSIE.findMany.mockImplementation(async ({ where }: { where: { equipoId: bigint } }) => {
      if (where.equipoId === BigInt(10)) {
        return [
          { equipoCodigoSIEId: BigInt(1), codigo: "SIE_001", talla: "42" },
          { equipoCodigoSIEId: BigInt(2), codigo: "SIE_002", talla: "44" },
        ];
      }
      if (where.equipoId === BigInt(20)) {
        return [{ equipoCodigoSIEId: BigInt(99), codigo: "SIE_001", talla: "42" }]; // Codigo SIE_001 ya existe en el target
      }
      return [];
    });

    mockTx.cajaEquipoCodigoSIE.findMany.mockResolvedValue([
      { codigoDepositoGeneral: "CAJA_01", equipoCodigoSIEId: BigInt(1) },
    ]);
    mockTx.cajaEquipoCodigoSIE.findUnique.mockResolvedValue(null);

    const req = createMockRequest({ targetEquipoId: "20" });
    const res = await POST(req, { params: Promise.resolve({ equipoId: "10" }) });

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.sourceEquipo.nombre).toBe("Botas Viejas");
    expect(data.targetEquipo.nombre).toBe("Botas Nuevas");
    expect(data.resumen.totalMovimientosAfectados).toBe(2); // 1 mov + 1 stock

    expect(mockTx.movimientoEquipo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: {
          movimientoId: BigInt(100),
          equipoId: BigInt(20),
          cantidad: 2,
          estadoEntrega: "BUENO",
          comentarioEntrega: "entregado",
          estadoDevolucion: null,
          comentarioDevolucion: null,
        },
      }),
    );
    expect(mockTx.movimientoEquipo.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { movimientoId_equipoId: { movimientoId: BigInt(100), equipoId: BigInt(10) } },
      }),
    );

    expect(mockTx.stockOperacionEquipo.upsert).toHaveBeenCalled();
    expect(mockTx.stockOperacionEquipo.delete).toHaveBeenCalled();

    expect(mockTx.cajaEquipo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigoDepositoGeneral_equipoId: { codigoDepositoGeneral: "CAJA_01", equipoId: BigInt(20) } },
        update: { cantidad: { increment: 4 } },
        create: { codigoDepositoGeneral: "CAJA_01", equipoId: BigInt(20), cantidad: 4 },
      }),
    );
    expect(mockTx.cajaEquipo.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigoDepositoGeneral_equipoId: { codigoDepositoGeneral: "CAJA_01", equipoId: BigInt(10) } },
      }),
    );

    expect(mockTx.cajaEquipoCodigoSIE.create).toHaveBeenCalledWith({
      data: { codigoDepositoGeneral: "CAJA_01", equipoCodigoSIEId: BigInt(99) },
    });
    expect(mockTx.equipoCodigoSIE.delete).toHaveBeenCalledWith({
      where: { equipoCodigoSIEId: BigInt(1) },
    });

    expect(mockTx.equipoCodigoSIE.update).toHaveBeenCalledWith({
      where: { equipoCodigoSIEId: BigInt(2) },
      data: { equipoId: BigInt(20) },
    });

    expect(mockTx.equipo.update).toHaveBeenCalledWith({
      where: { equipoId: BigInt(20) },
      data: { existenciaSie: { increment: 5 } },
    });

    expect(mockTx.equipo.delete).toHaveBeenCalledWith({
      where: { equipoId: BigInt(10) },
    });

    expect(logAudit).toHaveBeenCalled();
  });
});
