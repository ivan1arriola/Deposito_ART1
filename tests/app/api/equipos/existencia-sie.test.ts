import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
}));

const mockTx = vi.hoisted(() => ({
  equipo: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  auditoria: {
    create: vi.fn(),
  },
}));

const mockPrisma = vi.hoisted(() => ({
  $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
}));

vi.mock("@/lib/auth", () => mockAuth);
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { PATCH } from "@/app/api/equipos/[equipoId]/route";

describe("PATCH /api/equipos/[equipoId] (#23 existencia SIE y concurrencia)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.authorizeRequest.mockResolvedValue({
      ok: true,
      user: { usuarioId: "u-admin", rol: "ADMIN" },
    });
  });

  it("rechaza usuarios no administradores con 403", async () => {
    mockAuth.authorizeRequest.mockResolvedValueOnce({
      ok: true,
      user: { usuarioId: "u-editor", rol: "EDITOR" },
    });

    const res = await PATCH(
      new Request("http://localhost/api/equipos/1", {
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: 10 }),
      }),
      { params: Promise.resolve({ equipoId: "1" }) }
    );
    expect(res.status).toBe(403);
  });

  it("rechaza existenciaSie negativa o no entera con 400", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/equipos/1", {
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: -3 }),
      }),
      { params: Promise.resolve({ equipoId: "1" }) }
    );
    expect(res.status).toBe(400);
  });

  it("actualiza existenciaSie y registra auditoría en la misma transacción", async () => {
    mockTx.equipo.findUnique.mockResolvedValueOnce({
      equipoId: 1n,
      nombre: "Casco",
      existenciaSie: 10,
    });
    mockTx.equipo.updateMany.mockResolvedValueOnce({ count: 1 });
    mockTx.auditoria.create.mockResolvedValueOnce({});

    const res = await PATCH(
      new Request("http://localhost/api/equipos/1", {
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: 15, expectedExistenciaSie: 10 }),
      }),
      { params: Promise.resolve({ equipoId: "1" }) }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ equipoId: "1", existenciaSie: 15 });
    expect(mockTx.equipo.updateMany).toHaveBeenCalledWith({
      where: { equipoId: 1n, existenciaSie: 10 },
      data: { existenciaSie: 15 },
    });
    expect(mockTx.auditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        accion: "UPDATE",
        entidad: "EQUIPO",
        entidadId: "1",
        detalle: {
          evento: "EQUIPO_EXISTENCIA_SIE_UPDATE",
          previo: { existenciaSie: 10 },
          nuevo: { existenciaSie: 15 },
        },
      }),
    });
  });

  it("devuelve 409 con currentExistenciaSie si otro usuario ya modificó el valor", async () => {
    mockTx.equipo.findUnique.mockResolvedValueOnce({
      equipoId: 1n,
      nombre: "Casco",
      existenciaSie: 22,
    });

    const res = await PATCH(
      new Request("http://localhost/api/equipos/1", {
        method: "PATCH",
        body: JSON.stringify({ existenciaSie: 15, expectedExistenciaSie: 10 }),
      }),
      { params: Promise.resolve({ equipoId: "1" }) }
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "La existencia SIE fue modificada por otro usuario.",
      currentExistenciaSie: 22,
    });
    expect(mockTx.equipo.updateMany).not.toHaveBeenCalled();
    expect(mockTx.auditoria.create).not.toHaveBeenCalled();
  });
});
