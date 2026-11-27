import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.hoisted(() => ({
  authorizeRequest: vi.fn(),
}));

const mockAudit = vi.hoisted(() => ({
  logAudit: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  entidadBeneficiaria: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  personaExterna: {
    findMany: vi.fn(),
  },
  movimientoDestinatarioRecinto: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => mockAuth);
vi.mock("@/lib/audit", () => mockAudit);
vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

import { GET, POST } from "@/app/api/entidades-beneficiarias/route";
import { DELETE, PATCH } from "@/app/api/entidades-beneficiarias/[entidadId]/route";

describe("/api/entidades-beneficiarias (#18 catálogo de 34 entidades internas)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.authorizeRequest.mockResolvedValue({
      ok: true,
      user: { usuarioId: "u-admin", rol: "ADMIN" },
    });
    mockPrisma.entidadBeneficiaria.findMany.mockResolvedValue([]);
    mockPrisma.personaExterna.findMany.mockResolvedValue([]);
    mockPrisma.movimientoDestinatarioRecinto.findMany.mockResolvedValue([]);
  });

  it("GET ?format=catalog devuelve las 34 entidades internas ordenadas y sin duplicados", async () => {
    mockPrisma.personaExterna.findMany.mockResolvedValueOnce([
      { unidadDestino: "Interno a la Unidad - Batería Comando" },
      { unidadDestino: "Externo a la Unidad - Brigada N° 2" },
    ]);
    mockPrisma.movimientoDestinatarioRecinto.findMany.mockResolvedValueOnce([
      { clase: "EXTERNO", nombre: "Brigada N° 2" },
    ]);

    const res = await GET(
      new Request("http://localhost/api/entidades-beneficiarias?format=catalog")
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      internas: Array<{ nombre: string }>;
      externas: Array<{ nombre: string }>;
    };
    expect(data.internas).toHaveLength(34);
    expect(data.externas).toHaveLength(1);
    expect(data.externas[0]?.nombre).toBe("Brigada N° 2");
  });

  it("POST exige rol administrador, valida duplicados (409) y crea con auditoría", async () => {
    mockAuth.authorizeRequest.mockResolvedValueOnce({
      ok: true,
      user: { usuarioId: "u-editor", rol: "EDITOR" },
    });
    const res403 = await POST(
      new Request("http://localhost/api/entidades-beneficiarias", {
        method: "POST",
        body: JSON.stringify({ clase: "INTERNO", nombre: "Anexo" }),
      })
    );
    expect(res403.status).toBe(403);

    mockPrisma.entidadBeneficiaria.findUnique.mockResolvedValueOnce({
      entidadBeneficiariaId: 1,
      clase: "INTERNO",
      nombre: "Administración",
      nombreNormalizado: "administracion",
      activo: true,
    });
    const res409 = await POST(
      new Request("http://localhost/api/entidades-beneficiarias", {
        method: "POST",
        body: JSON.stringify({ clase: "INTERNO", nombre: "administracion" }),
      })
    );
    expect(res409.status).toBe(409);

    mockPrisma.entidadBeneficiaria.findUnique.mockResolvedValueOnce(null);
    mockPrisma.entidadBeneficiaria.create.mockResolvedValueOnce({
      entidadBeneficiariaId: 35,
      clase: "INTERNO",
      nombre: "Polvorín Sur",
      nombreNormalizado: "polvorin sur",
      activo: true,
    });
    const res201 = await POST(
      new Request("http://localhost/api/entidades-beneficiarias", {
        method: "POST",
        body: JSON.stringify({ clase: "INTERNO", nombre: "Polvorín Sur" }),
      })
    );
    expect(res201.status).toBe(201);
    expect(mockAudit.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "CREATE", entidad: "ENTIDAD_BENEFICIARIA" })
    );
  });

  it("PATCH edita y DELETE desactiva lógicamente preservando historial", async () => {
    mockPrisma.entidadBeneficiaria.findUnique
      .mockResolvedValueOnce({
        entidadBeneficiariaId: 10,
        clase: "INTERNO",
        nombre: "Taller",
        nombreNormalizado: "taller",
        activo: true,
      })
      .mockResolvedValueOnce(null);
    mockPrisma.entidadBeneficiaria.update.mockResolvedValueOnce({
      entidadBeneficiariaId: 10,
      clase: "INTERNO",
      nombre: "Taller Mecánico",
      nombreNormalizado: "taller mecanico",
      activo: true,
    });

    const patchRes = await PATCH(
      new Request("http://localhost/api/entidades-beneficiarias/10", {
        method: "PATCH",
        body: JSON.stringify({ nombre: "Taller Mecánico" }),
      }),
      { params: Promise.resolve({ entidadId: "10" }) }
    );
    expect(patchRes.status).toBe(200);

    mockPrisma.entidadBeneficiaria.findUnique.mockResolvedValueOnce({
      entidadBeneficiariaId: 10,
      clase: "INTERNO",
      nombre: "Taller Mecánico",
      nombreNormalizado: "taller mecanico",
      activo: true,
    });
    mockPrisma.entidadBeneficiaria.update.mockResolvedValueOnce({
      entidadBeneficiariaId: 10,
      clase: "INTERNO",
      nombre: "Taller Mecánico",
      nombreNormalizado: "taller mecanico",
      activo: false,
    });

    const delRes = await DELETE(
      new Request("http://localhost/api/entidades-beneficiarias/10", { method: "DELETE" }),
      { params: Promise.resolve({ entidadId: "10" }) }
    );
    expect(delRes.status).toBe(200);
    expect(mockPrisma.entidadBeneficiaria.update).toHaveBeenLastCalledWith({
      where: { entidadBeneficiariaId: 10 },
      data: { activo: false },
    });
  });
});
