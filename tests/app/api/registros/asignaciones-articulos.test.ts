import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoMovimiento } from "@/generated/prisma/client";

const mockAuth = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
}));

const mockAudit = vi.hoisted(() => ({
  logAudit: vi.fn(),
}));

const mockNotify = vi.hoisted(() => ({
  notifyAdminOnMovement: vi.fn(),
}));

const mockEmail = vi.hoisted(() => ({
  sendPersonalMovementEmailNotification: vi.fn(),
}));

const mockCompat = vi.hoisted(() => ({
  ensureMovimientoDestinatarioRecintoCompatibility: vi.fn(),
}));

const mockStockCalc = vi.hoisted(() => ({
  calcularStockArticulo: vi.fn(),
  lockArticulosForUpdate: vi.fn(),
}));

const mockTx = vi.hoisted(() => ({
  movimiento: {
    create: vi.fn().mockResolvedValue({ movimientoId: 800n }),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  movimientoDestinatarioPersonal: { deleteMany: vi.fn(), create: vi.fn() },
  movimientoDestinatarioExterno: { deleteMany: vi.fn(), create: vi.fn() },
  movimientoDestinatarioRecinto: { deleteMany: vi.fn(), create: vi.fn() },
  movimientoEquipo: { deleteMany: vi.fn(), createMany: vi.fn() },
  movimientoArticulo: { deleteMany: vi.fn(), createMany: vi.fn(), count: vi.fn() },
  articulo: { findMany: vi.fn(), findUnique: vi.fn() },
  articuloStockMovimiento: { createMany: vi.fn(), findMany: vi.fn() },
  auditoria: { create: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  equipo: { findMany: vi.fn() },
  personal: { findMany: vi.fn() },
  movimiento: { findUnique: vi.fn() },
  $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
}));

vi.mock("@/lib/auth", () => mockAuth);
vi.mock("@/lib/audit", () => mockAudit);
vi.mock("@/lib/notify-admins", () => mockNotify);
vi.mock("@/lib/personal-email-notifications", () => mockEmail);
vi.mock("@/lib/movimiento-destinatario-recinto-compat", () => mockCompat);
vi.mock("@/lib/stock-calc", () => mockStockCalc);
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { POST } from "@/app/api/registros/route";
import { DELETE, PUT } from "@/app/api/registros/[registroId]/route";
import { DELETE as DELETE_ARTICULO } from "@/app/api/articulos/[articuloId]/route";

describe("Asignaciones con Equipos y Artículos (#17)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.authorizeRequest.mockResolvedValue({
      ok: true,
      user: {
        usuarioId: "u-admin",
        rol: "ADMIN",
        grado: "Cap.",
        nombre: "Ana",
        apellido: "Pérez",
      },
    });
    mockCompat.ensureMovimientoDestinatarioRecintoCompatibility.mockResolvedValue(undefined);
    mockTx.movimiento.create.mockResolvedValue({ movimientoId: 800n });
    mockTx.articulo.findMany.mockResolvedValue([
      { articuloId: 7, nombre: "Alcohol en gel", tipo: "LIMPIEZA" },
    ]);
    mockStockCalc.calcularStockArticulo.mockResolvedValue(10);
  });

  it("POST permite asignar solo artículos bloqueando stock y registrando egreso y auditoría en una transacción", async () => {
    const res = await POST(
      new Request("http://localhost/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ASIGNACION",
          destinatarioTipo: "RECINTO",
          recintoClase: "INTERNO",
          recintoNombre: "Enfermería",
          fecha: "10/05/2026",
          equipos: [],
          articulos: [{ articuloId: 7, cantidad: 3 }],
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockStockCalc.lockArticulosForUpdate).toHaveBeenCalledWith(mockTx, [7]);
    expect(mockTx.movimientoEquipo.createMany).not.toHaveBeenCalled();
    expect(mockTx.movimientoArticulo.createMany).toHaveBeenCalledWith({
      data: [{ movimientoId: 800n, articuloId: 7, cantidad: 3 }],
    });
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          articuloId: 7,
          tipo: "EGRESO",
          cantidad: 3,
          movimientoId: 800n,
        }),
      ],
    });
    expect(mockTx.auditoria.create).toHaveBeenCalledTimes(1);
  });

  it("POST devuelve 409 si no hay stock suficiente del artículo", async () => {
    mockStockCalc.calcularStockArticulo.mockResolvedValueOnce(1);

    const res = await POST(
      new Request("http://localhost/api/registros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ASIGNACION",
          destinatarioTipo: "RECINTO",
          recintoClase: "INTERNO",
          recintoNombre: "Enfermería",
          fecha: "10/05/2026",
          articulos: [{ articuloId: 7, cantidad: 3 }],
        }),
      })
    );

    expect(res.status).toBe(409);
    expect(mockTx.movimientoArticulo.createMany).not.toHaveBeenCalled();
  });

  it("PUT preserva artículos existentes cuando el cliente los omite y compensa deltas cuando los edita", async () => {
    const existingWithArticulos = {
      movimientoId: 800n,
      tipo: TipoMovimiento.ASIGNACION,
      fecha: new Date("2026-05-10T00:00:00.000Z"),
      afectaStock: true,
      observaciones: "Obs",
      anulado: false,
      usuarioEntregaId: "u-admin",
      usuarioEntrega: {
        usuarioId: "u-admin",
        username: "admin",
        nombre: "Ana",
        apellido: "Pérez",
        rango: { abreviacion: "Cap." },
      },
      destinatarioPersonal: null,
      destinatarioExterno: null,
      destinatarioRecinto: {
        clase: "INTERNO",
        nombre: "Enfermería",
        responsableGrado: null,
        responsableNombre: null,
        responsableApellido: null,
        responsableCi: null,
      },
      equipos: [
        { equipoId: 1n, cantidad: 1, equipo: { equipoId: 1n, nombre: "Casco", ordenPdf: 1 } },
      ],
      articulos: [
        {
          articuloId: 7,
          cantidad: 3,
          articulo: { articuloId: 7, nombre: "Alcohol en gel", tipo: "LIMPIEZA" },
        },
      ],
    };

    mockPrisma.equipo.findMany.mockResolvedValue([{ equipoId: 1n, nombre: "Casco" }]);
    mockPrisma.movimiento.findUnique.mockResolvedValue(existingWithArticulos);

    const putOmit = await PUT(
      new Request("http://localhost/api/registros/800", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ASIGNACION",
          fecha: "10/05/2026",
          comentarios: "Sin tocar artículos",
          equipos: [{ equipoId: "1", cantidad: 1 }],
        }),
      }),
      { params: Promise.resolve({ registroId: "800" }) }
    );
    expect(putOmit.status).toBe(200);
    expect(mockTx.movimientoArticulo.deleteMany).not.toHaveBeenCalled();

    const putEdit = await PUT(
      new Request("http://localhost/api/registros/800", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ASIGNACION",
          fecha: "10/05/2026",
          equipos: [{ equipoId: "1", cantidad: 1 }],
          articulos: [{ articuloId: 7, cantidad: 5 }],
        }),
      }),
      { params: Promise.resolve({ registroId: "800" }) }
    );
    expect(putEdit.status).toBe(200);
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          articuloId: 7,
          tipo: "EGRESO",
          cantidad: 2,
          movimientoId: 800n,
        }),
      ],
    });
  });

  it("DELETE anula lógicamente una asignación una sola vez e ignora anulaciones repetidas", async () => {
    const baseExisting = {
      movimientoId: 800n,
      tipo: TipoMovimiento.ASIGNACION,
      fecha: new Date("2026-05-10T00:00:00.000Z"),
      afectaStock: true,
      observaciones: "Obs",
      anulado: false,
      usuarioEntregaId: "u-admin",
      usuarioEntrega: {
        usuarioId: "u-admin",
        username: "admin",
        nombre: "Ana",
        apellido: "Pérez",
        rango: { abreviacion: "Cap." },
      },
      destinatarioPersonal: null,
      destinatarioExterno: null,
      destinatarioRecinto: {
        clase: "INTERNO",
        nombre: "Enfermería",
        responsableGrado: null,
        responsableNombre: null,
        responsableApellido: null,
        responsableCi: null,
      },
      equipos: [],
      articulos: [
        {
          articuloId: 7,
          cantidad: 3,
          articulo: { articuloId: 7, nombre: "Alcohol en gel", tipo: "LIMPIEZA" },
        },
      ],
    };
    mockPrisma.movimiento.findUnique.mockResolvedValue(baseExisting);
    mockTx.movimiento.findUnique
      .mockResolvedValueOnce({
        movimientoId: 800n,
        anulado: false,
        articulos: [{ articuloId: 7, cantidad: 3 }],
      })
      .mockResolvedValueOnce({
        movimientoId: 800n,
        anulado: true,
        articulos: [{ articuloId: 7, cantidad: 3 }],
      });
    mockTx.movimiento.updateMany.mockResolvedValueOnce({ count: 1 });

    const del1 = await DELETE(
      new Request("http://localhost/api/registros/800", { method: "DELETE" }),
      { params: Promise.resolve({ registroId: "800" }) }
    );
    expect(del1.status).toBe(200);
    expect(await del1.json()).toMatchObject({ ok: true, anulado: true, alreadyAnulado: false });
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledTimes(1);
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          articuloId: 7,
          tipo: "INGRESO",
          cantidad: 3,
          movimientoId: 800n,
        }),
      ],
    });

    const del2 = await DELETE(
      new Request("http://localhost/api/registros/800", { method: "DELETE" }),
      { params: Promise.resolve({ registroId: "800" }) }
    );
    expect(del2.status).toBe(200);
    expect(await del2.json()).toMatchObject({ ok: true, anulado: true, alreadyAnulado: true });
    expect(mockTx.articuloStockMovimiento.createMany).toHaveBeenCalledTimes(1);
  });

  it("DELETE /api/articulos/[articuloId] rechaza con 409 si el artículo tiene historial de asignaciones", async () => {
    mockTx.articulo.findUnique.mockResolvedValueOnce({ articuloId: 7, nombre: "Alcohol" });
    mockTx.movimientoArticulo.count.mockResolvedValueOnce(1);
    mockTx.articuloStockMovimiento.findMany.mockResolvedValueOnce([]);

    const res = await DELETE_ARTICULO(
      new Request("http://localhost/api/articulos/7", { method: "DELETE" }),
      { params: Promise.resolve({ articuloId: "7" }) }
    );
    expect(res.status).toBe(409);
  });
});
