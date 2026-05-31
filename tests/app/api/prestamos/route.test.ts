import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/prestamos/route";
import { authorizeRequest } from "@/lib/auth";
import { ensurePrestamoActuanteCompatibility, upsertPrestamoActuante } from "@/lib/prestamo-actuante";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { prisma } from "@/lib/prisma";
import { formatUruguayanCi, generateRandomUruguayanCi } from "@/lib/ci";

const mockCreatedPrestamo = {
  movimientoId: BigInt(123),
  tipo: "PRESTAMO",
  fecha: new Date("2026-05-21T00:00:00.000Z"),
  usuarioEntregaId: "usr-1",
  afectaStock: true,
  observaciones: "Grupo Artilleria 2",
  createdAt: new Date("2026-05-21T10:00:00.000Z"),
  updatedAt: new Date("2026-05-21T10:00:00.000Z"),
  usuarioEntrega: {
    usuarioId: "usr-1",
    rango: { abreviacion: "Alf." },
    apellido: "Rodriguez",
    nombre: "Leandro",
    username: "lrodriguez",
      bateria: true
},
  destinatarioPersonal: null,
  destinatarioExterno: null,
  prestamoActivo: {
    reciboNumero: "PR-00000123",
    estado: "PENDIENTE",
    fechaEstimadaDevolucionTexto: "30 dias",
  },
  prestamoHistorial: null,
  items: [
    {
      item: {
        itemId: BigInt(1),
        nombre: "Bolsa Negra P/ Residuos Grande",
        ordenPdf: 1,
      },
      cantidad: 1,
      estadoEntrega: "NUEVO",
      comentarioEntrega: null,
      estadoDevolucion: null,
      comentarioDevolucion: null,
    },
  ],
};

const mockTx = {
  movimiento: {
    create: vi.fn().mockResolvedValue({ movimientoId: BigInt(123) }),
    findUniqueOrThrow: vi.fn().mockResolvedValue(mockCreatedPrestamo),
  },
  movimientoDestinatarioPersonal: {
    create: vi.fn(),
  },
  movimientoDestinatarioExterno: {
    create: vi.fn(),
  },
  personaExterna: {
    upsert: vi.fn(),
  },
  prestamoActivo: {
    create: vi.fn(),
    update: vi.fn(),
  },
  movimientoItem: {
    createMany: vi.fn(),
  },
};

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/notify-admins", () => ({
  notifyAdminOnMovement: vi.fn(),
}));

vi.mock("@/lib/personal-email-notifications", () => ({
  sendPersonalMovementEmailNotification: vi.fn(),
}));

vi.mock("@/lib/prestamo-actuante", () => ({
  ensurePrestamoActuanteCompatibility: vi.fn().mockResolvedValue(undefined),
  fetchPrestamoActuanteByMovimientoIds: vi.fn().mockResolvedValue(new Map()),
  isSargentoRank: vi.fn().mockReturnValue(false),
  upsertPrestamoActuante: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findMany: vi.fn(),
    },
    personal: {
      findFirst: vi.fn(),
    },
    rango: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
      bateria: true
},
}));

describe("POST /api/prestamos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  function mockBaseLookups() {
    vi.mocked(prisma.item.findMany).mockResolvedValue([
      { itemId: BigInt(1), nombre: "Bolsa Negra P/ Residuos Grande" },
    ] as never);
    vi.mocked(prisma.rango.findUnique).mockResolvedValue({ orden: 40 } as never);
  }

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/prestamos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("acepta un prestamo pendiente con actuante seleccionado", async () => {
    mockAuthorizedUser();
    mockBaseLookups();
    vi.mocked(prisma.personal.findFirst).mockResolvedValue({
      ci: "51067524",
      apellido1: "Rodriguez",
      apellido2: "Straneo",
      nombre1: "Leandro",
      nombre2: null,
      rango: {
        tipo: "OFICIAL",
        abreviacion: "Alf.",
        nombreCompleto: "Alferez",
        orden: 5,
      },
        bateria: true
    } as never);

    const res = await POST(
      createMockRequest({
        clasePrestamo: "PENDIENTE",
        actuanteCi: "5.106.752-4",
        fechaPrestamo: "21/05/2026",
        fechaEstimadaDevolucionTexto: "30 dias",
        comentarios: "Grupo Artilleria 2",
        items: [{ itemId: "1", cantidad: 1, estadoEntrega: "NUEVO" }],
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({
      prestamoId: "123",
      clasePrestamo: "PENDIENTE",
      destinatarioCi: null,
      actuanteCi: "51067524",
      reciboNumero: "PR-00000123",
    });

    expect(prisma.personal.findFirst).toHaveBeenCalledWith({
      where: { ci: "51067524" },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { tipo: true, abreviacion: true, nombreCompleto: true, orden: true } },
          bateria: true
    },
    });

    expect(mockTx.movimientoDestinatarioPersonal.create).not.toHaveBeenCalled();
    expect(mockTx.movimientoDestinatarioExterno.create).not.toHaveBeenCalled();
    expect(mockTx.personaExterna.upsert).not.toHaveBeenCalled();
    expect(upsertPrestamoActuante).toHaveBeenCalledWith(mockTx, BigInt(123), "51067524");
    expect(ensurePrestamoActuanteCompatibility).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(notifyAdminOnMovement).toHaveBeenCalled();
    expect(sendPersonalMovementEmailNotification).not.toHaveBeenCalled();
  });

  it("acepta un prestamo interno y guarda destinatario personal", async () => {
    mockAuthorizedUser();
    mockBaseLookups();
    const destinatarioCi = generateRandomUruguayanCi();
    vi.mocked(prisma.personal.findFirst)
      .mockResolvedValueOnce({
        ci: destinatarioCi,
        apellido1: "Gonzalez",
        apellido2: null,
        nombre1: "Maria",
        nombre2: null,
        rango: {
          tipo: "SUBALTERNO",
          abreviacion: "Cbo.",
          nombreCompleto: "Cabo",
          orden: 20,
        },
          bateria: true
    } as never)
      .mockResolvedValueOnce({
        ci: "51067524",
        apellido1: "Rodriguez",
        apellido2: "Straneo",
        nombre1: "Leandro",
        nombre2: null,
        rango: {
          tipo: "OFICIAL",
          abreviacion: "Alf.",
          nombreCompleto: "Alferez",
          orden: 5,
        },
          bateria: true
    } as never);

    const res = await POST(
      createMockRequest({
        clasePrestamo: "INTERNO",
        destinatarioTipo: "PERSONAL",
        destinatarioCi: formatUruguayanCi(destinatarioCi),
        actuanteCi: "5.106.752-4",
        fechaPrestamo: "21/05/2026",
        fechaEstimadaDevolucionTexto: "30 dias",
        comentarios: "Grupo Artilleria 2",
        items: [{ itemId: "1", cantidad: 1, estadoEntrega: "NUEVO" }],
      }),
    );

    expect(res.status).toBe(201);
    expect(prisma.personal.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ ci: destinatarioCi }),
      }),
    );
    expect(mockTx.movimientoDestinatarioPersonal.create).toHaveBeenCalledWith({
      data: {
        movimientoId: BigInt(123),
        ci: destinatarioCi,
      },
    });
    expect(mockTx.movimientoDestinatarioExterno.create).not.toHaveBeenCalled();
    expect(mockTx.personaExterna.upsert).not.toHaveBeenCalled();
  });

  it("acepta un prestamo externo y crea persona externa", async () => {
    mockAuthorizedUser();
    mockBaseLookups();
    vi.mocked(prisma.personal.findFirst).mockResolvedValue({
      ci: "51067524",
      apellido1: "Rodriguez",
      apellido2: "Straneo",
      nombre1: "Leandro",
      nombre2: null,
      rango: {
        tipo: "OFICIAL",
        abreviacion: "Alf.",
        nombreCompleto: "Alferez",
        orden: 5,
      },
        bateria: true
    } as never);

    const res = await POST(
      createMockRequest({
        clasePrestamo: "EXTERNO",
        destinatarioExterno: {
          grado: "Sgto.",
          nombre: "Juan",
          apellido: "Perez",
          ci: formatUruguayanCi(generateRandomUruguayanCi()),
          unidadDestino: "Unidad X",
        },
        actuanteCi: "5.106.752-4",
        fechaPrestamo: "21/05/2026",
        fechaEstimadaDevolucionTexto: "30 dias",
        comentarios: "Grupo Artilleria 2",
        items: [{ itemId: "1", cantidad: 1, estadoEntrega: "NUEVO" }],
      }),
    );

    expect(res.status).toBe(201);
    expect(mockTx.movimientoDestinatarioPersonal.create).not.toHaveBeenCalled();
    expect(mockTx.movimientoDestinatarioExterno.create).toHaveBeenCalledWith({
      data: {
        movimientoId: BigInt(123),
        personaExternaCi: expect.any(String),
      },
    });
    expect(mockTx.personaExterna.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ grado: "Sgto.", nombre: "Juan", apellido: "Perez", unidadDestino: "Unidad X" }),
      }),
    );
  });
});