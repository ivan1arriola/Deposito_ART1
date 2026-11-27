import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/personal/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { getRangoCountByTipo, getTallaTipoIdMap } from "@/lib/reference-data-cache";

const mockTx = {
  personal: {
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  personalTalla: {
    createMany: vi.fn(),
  },
  movimiento: {
    create: vi.fn(),
  },
  movimientoDestinatarioPersonal: {
    create: vi.fn(),
  },
  movimientoEquipo: {
    createMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/reference-data-cache", () => ({
  getRangoCountByTipo: vi.fn(),
  getTallaTipoIdMap: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    equipo: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/personal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockAuthorizedUser() {
  vi.mocked(authorizeRequest).mockResolvedValue({
    ok: true,
    user: {
      usuarioId: "usr-1",
      rangoId: 10,
      rol: "EDITOR",
      nombre: "Ana",
      apellido: "Perez",
      username: "aperez",
      grado: "Alf.",
    },
  } as never);
}

function mockReferenceData() {
  vi.mocked(getRangoCountByTipo).mockResolvedValue(4 as never);
  vi.mocked(getTallaTipoIdMap).mockResolvedValue(
    new Map([
      ["PARKA", 1],
      ["CAMISACO", 2],
      ["PANTALON", 3],
      ["KEPI", 4],
      ["CALZADO", 5],
    ]) as never
  );
}

function createValidPayload() {
  return {
    ci: "51067524",
    apellido1: "Rodriguez",
    apellido2: "Silva",
    nombre1: "Luciano",
    nombre2: "Andres",
    telefonoContacto: "+59899123456",
    esReingreso: true,
    fechaIngreso: "20/05/2024",
    fechaIngresoOriginal: "10/03/2021",
    rangoId: 7,
    bateriaId: 3,
    tallas: {
      PARKA: "m",
      CAMISACO: "L",
      PANTALON: "xl",
      KEPI: "54",
      CALZADO: "40",
    },
    movimientos: [
      {
        tipo: "ENTREGA",
        fecha: "21/05/2024",
        comentarios: "Entrega inicial de vestuario",
        equipos: [{ equipoId: "101", cantidad: 2 }],
      },
    ],
  };
}

describe("POST /api/personal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizedUser();
    mockReferenceData();
    vi.mocked(prisma.equipo.findMany).mockResolvedValue([
      { equipoId: BigInt(101), nombre: "Casco balistico" },
    ] as never);
    mockTx.personal.create.mockResolvedValue({ ci: "51067524" });
    mockTx.personal.findUnique.mockResolvedValue({
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
        { tallaTipoId: 2, tallaValor: "L", tallaTipo: { tallaTipoId: 2, nombre: "CAMISACO" } },
        { tallaTipoId: 3, tallaValor: "XL", tallaTipo: { tallaTipoId: 3, nombre: "PANTALON" } },
        { tallaTipoId: 4, tallaValor: "54", tallaTipo: { tallaTipoId: 4, nombre: "KEPI" } },
        { tallaTipoId: 5, tallaValor: "40", tallaTipo: { tallaTipoId: 5, nombre: "CALZADO" } },
      ],
    } as never);
    mockTx.movimiento.create.mockResolvedValue({ movimientoId: BigInt(901) });
  });

  it("crea un subalterno con toda la información y movimientos iniciales", async () => {
    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      ci: "51067524",
      apellido1: "Rodriguez",
      apellido2: "Silva",
      nombre1: "Luciano",
      nombre2: "Andres",
      telefonoContacto: "099123456",
      esReingreso: true,
      fechaIngreso: "20/05/2024",
      fechaIngresoOriginal: "10/03/2021",
      rangoId: 7,
      bateriaId: 3,
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
        { tallaTipoId: 2, tallaValor: "L", tallaTipo: { tallaTipoId: 2, nombre: "CAMISACO" } },
        { tallaTipoId: 3, tallaValor: "XL", tallaTipo: { tallaTipoId: 3, nombre: "PANTALON" } },
        { tallaTipoId: 4, tallaValor: "54", tallaTipo: { tallaTipoId: 4, nombre: "KEPI" } },
        { tallaTipoId: 5, tallaValor: "40", tallaTipo: { tallaTipoId: 5, nombre: "CALZADO" } },
      ],
      movimientosCreados: 1,
    });

    expect(mockTx.personal.create).toHaveBeenCalledWith({
      data: {
        ci: "51067524",
        apellido1: "Rodriguez",
        apellido2: "Silva",
        nombre1: "Luciano",
        nombre2: "Andres",
        telefonoContacto: "099123456",
        tipo: "SUBALTERNO",
        rangoId: 7,
        esReingreso: true,
        fechaIngreso: new Date("2024-05-20T00:00:00.000Z"),
        fechaIngresoOriginal: new Date("2021-03-10T00:00:00.000Z"),
        bateriaId: 3,
      },
    });
    expect(mockTx.personalTalla.createMany).toHaveBeenCalledWith({
      data: [
        { ci: "51067524", tallaTipoId: 1, tallaValor: "M" },
        { ci: "51067524", tallaTipoId: 2, tallaValor: "L" },
        { ci: "51067524", tallaTipoId: 3, tallaValor: "XL" },
        { ci: "51067524", tallaTipoId: 4, tallaValor: "54" },
        { ci: "51067524", tallaTipoId: 5, tallaValor: "40" },
      ],
    });
    expect(prisma.equipo.findMany).toHaveBeenCalledWith({
      where: { equipoId: { in: [BigInt(101)] } },
      select: { equipoId: true, nombre: true },
    });
    expect(mockTx.movimiento.create).toHaveBeenCalledWith({
      data: {
        usuarioEntregaId: "usr-1",
        fecha: new Date("2024-05-21T00:00:00.000Z"),
        tipo: "ENTREGA",
        afectaStock: true,
        observaciones: "Entrega inicial de vestuario",
      },
      select: { movimientoId: true },
    });
    expect(mockTx.movimientoDestinatarioPersonal.create).toHaveBeenCalledWith({
      data: {
        movimientoId: BigInt(901),
        ci: "51067524",
      },
    });
    expect(mockTx.movimientoEquipo.createMany).toHaveBeenCalledWith({
      data: [{ movimientoId: BigInt(901), equipoId: BigInt(101), cantidad: 2 }],
    });
    expect(logAudit).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        usuarioId: "usr-1",
        accion: "CREATE",
        entidad: "PERSONAL",
        entidadId: "51067524",
        detalle: expect.objectContaining({
          ci: "51067524",
          rangoId: 7,
          bateriaId: 3,
          telefonoContacto: "099123456",
          esReingreso: true,
          fechaIngreso: "20/05/2024",
          fechaIngresoOriginal: "10/03/2021",
        }),
      })
    );
    expect(logAudit).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        usuarioId: "usr-1",
        accion: "CREATE",
        entidad: "REGISTRO",
        entidadId: "901",
        detalle: expect.objectContaining({
          evento: "MOVIMIENTO_ALTA_PERSONAL",
          ci: "51067524",
          tipo: "ENTREGA",
          totalEquipos: 1,
          totalUnidades: 2,
          equipos: [{ equipoId: "101", nombre: "Casco balistico", cantidad: 2 }],
        }),
      })
    );
  });

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(403);
  });

  it("retorna 400 si no hay grados de subalterno cargados", async () => {
    vi.mocked(getRangoCountByTipo).mockResolvedValue(0 as never);

    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No se puede registrar personal sin registrar Grados previamente.",
    });
  });

  it("retorna 400 si el payload es inválido", async () => {
    const response = await POST(createRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "Payload invalido. Revisa CI uruguaya valida, apellido1, nombre1 y rangoId (grado del personal).",
    });
  });

  it("retorna 400 si el teléfono no es un celular uruguayo válido", async () => {
    const response = await POST(
      createRequest({
        ...createValidPayload(),
        telefonoContacto: "12345",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "telefonoContacto debe ser un celular uruguayo valido.",
    });
  });

  it("retorna 400 si el reingreso no incluye fecha de ingreso", async () => {
    const response = await POST(
      createRequest({
        ...createValidPayload(),
        fechaIngreso: "",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "fechaIngreso es obligatoria para registrar un reingreso.",
    });
  });

  it("retorna 400 si la fecha de ingreso original es posterior al reingreso", async () => {
    const response = await POST(
      createRequest({
        ...createValidPayload(),
        fechaIngreso: "10/03/2021",
        fechaIngresoOriginal: "20/05/2024",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "fechaIngresoOriginal no puede ser posterior a la fecha de reingreso.",
    });
  });

  it("retorna 400 si alguna talla no es válida", async () => {
    const response = await POST(
      createRequest({
        ...createValidPayload(),
        tallas: {
          ...createValidPayload().tallas,
          KEPI: "99",
        },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Talla Kepi invalida. Valores permitidos: 54 a 63.",
    });
  });

  it("retorna 400 si un equipo inicial no existe", async () => {
    vi.mocked(prisma.equipo.findMany).mockResolvedValue([] as never);

    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Uno o mas equipos de los movimientos iniciales no existen.",
    });
  });

  it("retorna 409 si la cédula ya existe", async () => {
    mockTx.personal.create.mockRejectedValueOnce({ code: "P2002" });

    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "La cedula ya existe.",
    });
  });

  it("retorna 400 si el rango o la batería son inválidos", async () => {
    mockTx.personal.create.mockRejectedValueOnce({ code: "P2003" });

    const response = await POST(createRequest(createValidPayload()));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "rangoId (grado del personal) o bateriaId invalido.",
    });
  });
});
