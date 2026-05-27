import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/registros/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { prisma } from "@/lib/prisma";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";

const mockTx = {
  movimiento: {
    create: vi.fn().mockResolvedValue({ movimientoId: BigInt(321) }),
  },
  movimientoDestinatarioPersonal: {
    create: vi.fn(),
  },
  movimientoDestinatarioRecinto: {
    create: vi.fn(),
  },
  movimientoDestinatarioExterno: {
    create: vi.fn(),
  },
  personaExterna: {
    upsert: vi.fn(),
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

vi.mock("@/lib/movimiento-destinatario-recinto-compat", () => ({
  ensureMovimientoDestinatarioRecintoCompatibility: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    movimiento: {
      count: vi.fn(),
    },
    item: {
      findMany: vi.fn(),
    },
    personal: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  },
}));

function createRequest(body: unknown) {
  return new Request("http://localhost:3000/api/registros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createGetRequest(url: string) {
  return new Request(url, {
    method: "GET",
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

describe("POST /api/registros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthorizedUser();
    vi.mocked(prisma.movimiento.count).mockResolvedValue(7 as never);
    vi.mocked(prisma.item.findMany).mockResolvedValue([{ itemId: BigInt(1), nombre: "Notebook táctica" }] as never);
  });

  it("incluye ASIGNACION en summary sin inyectar undefined al filtro", async () => {
    const response = await GET(createGetRequest("http://localhost:3000/api/registros?summary=1"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ total: 7 });
    expect(prisma.movimiento.count).toHaveBeenCalledWith({
      where: {
        tipo: {
          in: ["ENTREGA", "DEVOLUCION", "ASIGNACION"],
        },
      },
    });
  });

  it("rechaza entrega a recinto porque entrega y devolución son exclusivas de personal", async () => {
    const response = await POST(
      createRequest({
        destinatarioTipo: "RECINTO",
        recintoClase: "INTERNO",
        recintoNombre: "Polvorín central",
        tipo: "ENTREGA",
        fecha: "26/05/2026",
        items: [{ itemId: "1", cantidad: 1 }],
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Payload invalido"),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("busca destinatarios de entrega solo entre subalternos", async () => {
    vi.mocked(prisma.personal.findMany).mockResolvedValue([] as never);

    const response = await POST(
      createRequest({
        destinatarioTipo: "PERSONAL",
        ci: "5.106.752-4",
        tipo: "ENTREGA",
        fecha: "26/05/2026",
        items: [{ itemId: "1", cantidad: 1 }],
      }),
    );

    expect(prisma.personal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ci: { in: ["5.106.752-4"] },
          rango: { tipo: "SUBALTERNO" },
        }),
      }),
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("subalterno"),
    });
  });

  it("acepta asignación con destinatario externo y crea su vínculo", async () => {
    const response = await POST(
      createRequest({
        destinatarioTipo: "EXTERNO",
        destinatarioExterno: {
          grado: "Tte. 1ro.",
          nombre: "Lucia",
          apellido: "Martinez",
          ci: "5.106.752-4",
          unidadDestino: "Brigada de Infantería No. 5",
        },
        tipo: "ASIGNACION",
        fecha: "26/05/2026",
        comentarios: "Asignación permanente",
        items: [{ itemId: "1", cantidad: 2 }],
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      registroId: "321",
      destinatarioTipo: "EXTERNO",
    });

    expect(ensureMovimientoDestinatarioRecintoCompatibility).toHaveBeenCalled();
    expect(mockTx.personaExterna.upsert).toHaveBeenCalledWith({
      where: { ci: "51067524" },
      create: {
        ci: "51067524",
        grado: "Tte. 1ro.",
        nombre: "Lucia",
        apellido: "Martinez",
        unidadDestino: "Brigada de Infantería No. 5",
      },
      update: {
        grado: "Tte. 1ro.",
        nombre: "Lucia",
        apellido: "Martinez",
        unidadDestino: "Brigada de Infantería No. 5",
      },
    });
    expect(mockTx.movimientoDestinatarioExterno.create).toHaveBeenCalledWith({
      data: {
        movimientoId: BigInt(321),
        personaExternaCi: "51067524",
      },
    });
    expect(logAudit).toHaveBeenCalled();
    expect(notifyAdminOnMovement).toHaveBeenCalled();
    expect(sendPersonalMovementEmailNotification).not.toHaveBeenCalled();
  });
});
