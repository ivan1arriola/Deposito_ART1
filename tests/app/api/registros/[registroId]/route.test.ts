import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoMovimiento } from "@/generated/prisma/client";

const mockAuth = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
}));

const mockAudit = vi.hoisted(() => ({
  logAudit: vi.fn(),
}));

const mockCompat = vi.hoisted(() => ({
  ensureMovimientoDestinatarioRecintoCompatibility: vi.fn(),
}));

const mockEmail = vi.hoisted(() => ({
  sendPersonalMovementEmailNotification: vi.fn(),
}));

const mockTx = vi.hoisted(() => ({
  movimiento: { update: vi.fn() },
  movimientoDestinatarioPersonal: { deleteMany: vi.fn(), create: vi.fn() },
  movimientoDestinatarioExterno: { deleteMany: vi.fn(), create: vi.fn() },
  movimientoDestinatarioRecinto: { deleteMany: vi.fn(), create: vi.fn() },
  personaExterna: { upsert: vi.fn() },
  movimientoEquipo: { deleteMany: vi.fn(), createMany: vi.fn() },
}));

const mockPrisma = vi.hoisted(() => ({
  movimiento: {
    findUnique: vi.fn(),
  },
  equipo: {
    findMany: vi.fn(),
  },
  personal: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
}));

vi.mock("@/lib/auth", () => mockAuth);
vi.mock("@/lib/audit", () => mockAudit);
vi.mock("@/lib/movimiento-destinatario-recinto-compat", () => mockCompat);
vi.mock("@/lib/personal-email-notifications", () => mockEmail);
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET, PUT } from "@/app/api/registros/[registroId]/route";

describe("/api/registros/[registroId] (#14 protección de responsable)", () => {
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
    mockPrisma.equipo.findMany.mockResolvedValue([{ equipoId: 1n, nombre: "Casco" }]);
  });

  const makeRecintoMovimiento = (
    overrides?: Partial<{
      responsableGrado: string | null;
      responsableNombre: string | null;
      responsableApellido: string | null;
      responsableCi: string | null;
      observaciones: string | null;
    }>
  ) => ({
    movimientoId: 50n,
    tipo: TipoMovimiento.ASIGNACION,
    fecha: new Date("2026-05-10T00:00:00.000Z"),
    afectaStock: true,
    observaciones: overrides?.observaciones ?? "Observación inicial",
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
      nombre: "Guardia de Prevención",
      responsableGrado:
        overrides?.responsableGrado !== undefined ? overrides.responsableGrado : "Sgto.",
      responsableNombre:
        overrides?.responsableNombre !== undefined ? overrides.responsableNombre : "Carlos",
      responsableApellido:
        overrides?.responsableApellido !== undefined ? overrides.responsableApellido : "Gómez",
      responsableCi: overrides?.responsableCi !== undefined ? overrides.responsableCi : "12345672",
    },
    equipos: [
      {
        equipoId: 1n,
        cantidad: 2,
        equipo: { equipoId: 1n, nombre: "Casco", ordenPdf: 1 },
      },
    ],
  });

  it("GET devuelve recintoResponsableInfo y destinatarioExternoInfo completos", async () => {
    mockPrisma.movimiento.findUnique.mockResolvedValueOnce(makeRecintoMovimiento());

    const res = await GET(new Request("http://localhost/api/registros/50"), {
      params: Promise.resolve({ registroId: "50" }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      recintoResponsableInfo: {
        grado: string;
        nombre: string;
        apellido: string;
        ci: string;
      } | null;
      destinatarioExternoInfo: unknown;
    };
    expect(data.recintoResponsableInfo).toEqual({
      grado: "Sgto.",
      nombre: "Carlos",
      apellido: "Gómez",
      ci: "12345672",
    });
    expect(data.destinatarioExternoInfo).toBeNull();
  });

  it("PUT editando solo observaciones sin enviar destinatarioRecinto conserva los 4 campos del responsable", async () => {
    const existing = makeRecintoMovimiento();
    mockPrisma.movimiento.findUnique.mockResolvedValueOnce(existing);

    const req = new Request("http://localhost/api/registros/50", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "ASIGNACION",
        destinatarioTipo: "RECINTO",
        recintoClase: "INTERNO",
        recintoNombre: "Guardia de Prevención",
        fecha: "10/05/2026",
        comentarios: "Observación actualizada",
        equipos: [{ equipoId: "1", cantidad: 2 }],
      }),
    });

    const putRes = await PUT(req, { params: Promise.resolve({ registroId: "50" }) });
    expect(putRes.status).toBe(200);

    expect(mockTx.movimientoDestinatarioRecinto.create).toHaveBeenCalledWith({
      data: {
        movimientoId: 50n,
        clase: "INTERNO",
        nombre: "Guardia de Prevención",
        responsableGrado: "Sgto.",
        responsableNombre: "Carlos",
        responsableApellido: "Gómez",
        responsableCi: "12345672",
      },
    });
    expect(mockAudit.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        detalle: expect.objectContaining({
          destinatarioAnterior: expect.objectContaining({
            recinto: expect.objectContaining({
              responsable: {
                grado: "Sgto.",
                nombre: "Carlos",
                apellido: "Gómez",
                ci: "12345672",
              },
            }),
          }),
        }),
      })
    );
  });

  it("PUT con cambio parcial explícito actualiza los campos enviados y conserva los omitidos", async () => {
    mockPrisma.movimiento.findUnique.mockResolvedValueOnce(makeRecintoMovimiento());

    const req = new Request("http://localhost/api/registros/50", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: "ASIGNACION",
        destinatarioTipo: "RECINTO",
        destinatarioRecinto: {
          nombre: "María",
        },
        fecha: "10/05/2026",
        equipos: [{ equipoId: "1", cantidad: 2 }],
      }),
    });

    const putRes = await PUT(req, { params: Promise.resolve({ registroId: "50" }) });
    expect(putRes.status).toBe(200);
    expect(mockTx.movimientoDestinatarioRecinto.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        responsableGrado: "Sgto.",
        responsableNombre: "María",
        responsableApellido: "Gómez",
        responsableCi: "12345672",
      }),
    });
  });

  it("GET y PUT soportan asignaciones externas históricas con identificador SD- sin perder datos", async () => {
    const externalExisting = {
      ...makeRecintoMovimiento(),
      destinatarioRecinto: null,
      destinatarioExterno: {
        personaExterna: {
          ci: "SD-0001",
          grado: "Tte.",
          nombre: "Luis",
          apellido: "Sosa",
          unidadDestino: "Batería A",
        },
      },
    };
    mockPrisma.movimiento.findUnique.mockResolvedValue(externalExisting);

    const getRes = await GET(new Request("http://localhost/api/registros/50"), {
      params: Promise.resolve({ registroId: "50" }),
    });
    expect(getRes.status).toBe(200);
    const getBody = (await getRes.json()) as {
      destinatarioExternoInfo: {
        ci: string;
        grado: string;
        nombre: string;
        apellido: string;
        unidadDestino: string;
      } | null;
    };
    expect(getBody.destinatarioExternoInfo).toEqual({
      ci: "SD-0001",
      grado: "Tte.",
      nombre: "Luis",
      apellido: "Sosa",
      unidadDestino: "Batería A",
    });

    const putRes = await PUT(
      new Request("http://localhost/api/registros/50", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "ASIGNACION",
          destinatarioTipo: "EXTERNO",
          destinatarioExterno: {
            grado: "Tte.",
            nombre: "Luis",
            apellido: "Sosa",
            ci: "SD-0001",
            unidadDestino: "Batería A",
          },
          fecha: "10/05/2026",
          comentarios: "Editado",
          equipos: [{ equipoId: "1", cantidad: 3 }],
        }),
      }),
      { params: Promise.resolve({ registroId: "50" }) }
    );
    expect(putRes.status).toBe(200);
    expect(mockTx.personaExterna.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ci: "SD-0001" },
      })
    );
  });
});
