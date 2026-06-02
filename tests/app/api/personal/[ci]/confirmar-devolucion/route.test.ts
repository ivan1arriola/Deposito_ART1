import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/personal/[ci]/confirmar-devolucion/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const mockTx = {
  personalHistorial: {
    create: vi.fn(),
  },
  personalTalla: {
    deleteMany: vi.fn(),
  },
  observacion: {
    deleteMany: vi.fn(),
  },
  movimientoEquipo: {
    deleteMany: vi.fn(),
  },
  movimiento: {
    deleteMany: vi.fn(),
  },
  personal: {
    delete: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    personal: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

function mockAuthorizedUser() {
  vi.mocked(authorizeRequest).mockResolvedValue({
    ok: true,
    user: {
      usuarioId: "admin-1",
      rangoId: 2,
      rol: "ADMIN",
      nombre: "Laura",
      apellido: "Gomez",
      username: "lgomez",
      grado: "My.",
    },
  } as never);
}

function basePersonalRecord() {
  return {
    ci: "51067524",
    apellido1: "Rodriguez",
    apellido2: "Silva",
    nombre1: "Luciano",
    nombre2: "Andres",
    telefonoContacto: "099123456",
    rangoId: 7,
    createdAt: new Date("2021-03-10T10:30:00.000Z"),
    esReingreso: true,
    fechaIngreso: new Date("2024-05-20T00:00:00.000Z"),
    fechaIngresoOriginal: new Date("2021-03-10T00:00:00.000Z"),
    bateriaId: 3,
    rango: {
      tipo: "SUBALTERNO",
      abreviacion: "Cbo.",
      nombreCompleto: "Cabo",
      orden: 20,
    },
    bateria: {
      bateriaId: 3,
      nombre: "Bateria B",
      orden: 2,
    },
    tallas: [
      { tallaTipoId: 1, tallaValor: "M", tallaTipo: { tallaTipoId: 1, nombre: "PARKA" } },
      { tallaTipoId: 5, tallaValor: "40", tallaTipo: { tallaTipoId: 5, nombre: "CALZADO" } },
    ],
    observaciones: [
      { observacionId: BigInt(1), texto: "Observacion de prueba", fecha: new Date("2024-05-18T00:00:00.000Z") },
    ],
  };
}

describe("POST /api/personal/[ci]/confirmar-devolucion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizedUser();
    vi.mocked(prisma.personal.findUnique).mockResolvedValue(basePersonalRecord() as never);
  });

  it("confirma la baja y transfiere toda la información al historial", async () => {
    const request = new Request("http://localhost:3000/api/personal/51067524/confirmar-devolucion", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });

    expect(mockTx.personalHistorial.create).toHaveBeenCalledWith({
      data: {
        ci: "51067524",
        apellido1: "Rodriguez",
        apellido2: "Silva",
        nombre1: "Luciano",
        nombre2: "Andres",
        telefonoContacto: "099123456",
        rangoId: 7,
        createdAt: new Date("2021-03-10T10:30:00.000Z"),
        tipo: "SUBALTERNO",
        esReingreso: true,
        fechaIngreso: new Date("2024-05-20T00:00:00.000Z"),
        fechaIngresoOriginal: new Date("2021-03-10T00:00:00.000Z"),
        bateriaId: 3,
        tallas: [
          { tipo: "PARKA", valor: "M" },
          { tipo: "CALZADO", valor: "40" },
        ],
        observaciones: [
          { texto: "Observacion de prueba", fecha: new Date("2024-05-18T00:00:00.000Z") },
        ],
      },
    });
    expect(mockTx.personalTalla.deleteMany).toHaveBeenCalledWith({ where: { ci: "51067524" } });
    expect(mockTx.observacion.deleteMany).toHaveBeenCalledWith({ where: { ci: "51067524" } });
    expect(mockTx.movimientoEquipo.deleteMany).toHaveBeenCalledWith({
      where: { movimiento: { destinatarioPersonal: { is: { ci: "51067524" } } } },
    });
    expect(mockTx.movimiento.deleteMany).toHaveBeenCalledWith({
      where: { destinatarioPersonal: { is: { ci: "51067524" } } },
    });
    expect(mockTx.personal.delete).toHaveBeenCalledWith({ where: { ci: "51067524" } });
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: "admin-1",
        accion: "DELETE",
        entidad: "PERSONAL",
        entidadId: "51067524",
        detalle: expect.objectContaining({
          evento: "PERSONAL_CONFIRMAR_BAJA_HISTORIAL",
        }),
      }),
    );
  });

  it("retorna 400 si la cédula es inválida", async () => {
    const request = new Request("http://localhost:3000/api/personal/abc/confirmar-devolucion", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ ci: "abc" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "CI inválida.",
    });
  });

  it("retorna 404 si el personal no existe", async () => {
    vi.mocked(prisma.personal.findUnique).mockResolvedValue(null as never);

    const request = new Request("http://localhost:3000/api/personal/51067524/confirmar-devolucion", {
      method: "POST",
    });

    const response = await POST(request, {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Personal no encontrado.",
    });
  });
});
