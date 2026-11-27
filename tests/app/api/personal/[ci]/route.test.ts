import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/personal/[ci]/route";
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
      update: vi.fn(),
    },
    movimiento: {
      findMany: vi.fn(),
    },
    movimientoEquipo: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

function createRequest(ci: string) {
  return new Request(`http://localhost:3000/api/personal/${encodeURIComponent(ci)}`, {
    method: "DELETE",
  });
}

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
    tipo: "SUBALTERNO",
    esReingreso: true,
    fechaIngreso: new Date("2024-05-20T00:00:00.000Z"),
    fechaIngresoOriginal: new Date("2021-03-10T00:00:00.000Z"),
    bateriaId: 3,
    createdAt: new Date("2021-03-10T10:30:00.000Z"),
    rango: {
      rangoId: 7,
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
      { tallaTipoId: 4, tallaValor: "54", tallaTipo: { tallaTipoId: 4, nombre: "KEPI" } },
    ],
    observaciones: [
      { observacionId: BigInt(1), texto: "Observación de prueba", fecha: new Date("2024-05-18T00:00:00.000Z") },
    ],
  };
}

describe("DELETE /api/personal/[ci]", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockAuthorizedUser();
    vi.mocked(prisma.personal.findUnique).mockResolvedValue(basePersonalRecord() as never);
    vi.mocked(prisma.movimiento.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.movimientoEquipo.findMany).mockResolvedValue([] as never);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it("marca al personal como pendiente de devolución cuando tiene préstamos o vestuario pendiente", async () => {
    vi.mocked(prisma.movimiento.findMany).mockResolvedValue([
      {
        movimientoId: BigInt(77),
        fecha: new Date("2024-05-22T00:00:00.000Z"),
        prestamoActivo: { reciboNumero: "PR-00000077" },
        equipos: [{ equipo: { nombre: "Linterna tactica" }, cantidad: 1 }],
      },
    ] as never);
    vi.mocked(prisma.movimientoEquipo.findMany).mockResolvedValue([
      {
        cantidad: 2,
        equipo: { nombre: "Casco balistico" },
        movimiento: { tipo: "ENTREGA" },
      },
      {
        cantidad: 1,
        equipo: { nombre: "Casco balistico" },
        movimiento: { tipo: "DEVOLUCION" },
      },
    ] as never);

    const response = await DELETE(createRequest("51067524"), {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "PENDIENTE_DEVOLUCION",
      ci: "51067524",
      outstandingLoans: [
        {
          movimientoId: "77",
          reciboNumero: "PR-00000077",
          fecha: "2024-05-22T00:00:00.000Z",
          equipos: [{ nombre: "Linterna tactica", cantidad: 1 }],
        },
      ],
      outstandingVestuario: [{ nombre: "Casco balistico", cantidad: 1 }],
    });

    expect(prisma.personal.update).toHaveBeenCalledWith({
      where: { ci: "51067524" },
      data: { baja: true },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: "admin-1",
        accion: "UPDATE",
        entidad: "PERSONAL",
        entidadId: "51067524",
        detalle: expect.objectContaining({
          evento: "PERSONAL_DADO_DE_BAJA_PENDIENTE",
          loansCount: 1,
          vestuarioCount: 1,
        }),
      }),
    );
  });

  it("transfiere al historial toda la información cuando no hay pendientes", async () => {
    const response = await DELETE(createRequest("51067524"), {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "HISTORIAL",
      ci: "51067524",
    });

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
          { tipo: "KEPI", valor: "54" },
        ],
        observaciones: [
          { texto: "Observación de prueba", fecha: new Date("2024-05-18T00:00:00.000Z") },
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
          evento: "PERSONAL_DADO_DE_BAJA_HISTORIAL",
        }),
      }),
    );
  });

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const response = await DELETE(createRequest("51067524"), {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(403);
  });

  it("retorna 400 si la cédula es inválida", async () => {
    const response = await DELETE(createRequest("123"), {
      params: Promise.resolve({ ci: "123" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "CI inválida.",
    });
  });

  it("retorna 404 si el personal no existe", async () => {
    vi.mocked(prisma.personal.findUnique).mockResolvedValue(null as never);

    const response = await DELETE(createRequest("51067524"), {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Personal no encontrado.",
    });
  });

  it("retorna 500 si ocurre un error al procesar la baja", async () => {
    vi.mocked(prisma.personal.findUnique).mockRejectedValueOnce(new Error("db down"));

    const response = await DELETE(createRequest("51067524"), {
      params: Promise.resolve({ ci: "51067524" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "No se pudo procesar la baja del personal.",
    });
  });
});
