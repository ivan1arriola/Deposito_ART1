import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auditoria/[auditoriaId]/undo/route";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

const mockTx = {
  auditoria: {
    findUnique: vi.fn(),
  },
  rango: {
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  bateria: {
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  articulo: {
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  equipo: {
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  personal: {
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  personalTalla: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
  observacion: {
    delete: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  papeleraRegistro: {
    findFirst: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback) => {
      return callback(mockTx);
    }),
  },
}));

describe("POST /api/auditoria/[auditoriaId]/undo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest() {
    return new Request("http://localhost:3000/api/auditoria/100/undo", {
      method: "POST",
    });
  }

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "100" }) });

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("retorna 400 si auditoriaId no es un bigint válido", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "invalid-id" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("auditoriaId inválido");
  });

  it("retorna 404 si el registro de auditoría no existe", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    mockTx.auditoria.findUnique.mockResolvedValue(null);

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "100" }) });

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Registro de auditoría no encontrado.");
  });

  it("retorna 400 si la acción ha expirado (más de 5 días)", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    // Date older than 5 days (e.g. 6 days ago)
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

    mockTx.auditoria.findUnique.mockResolvedValue({
      auditoriaId: BigInt(100),
      createdAt: sixDaysAgo,
      entidad: "ARTICULO",
      accion: "UPDATE",
      entidadId: "42",
      detalle: { previo: { nombre: "Viejo" }, nuevo: { nombre: "Nuevo" } },
    });

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "100" }) });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("El límite de 5 días para deshacer este cambio ha expirado.");
  });

  it("deshace un UPDATE de un artículo restaurando su estado previo", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    mockTx.auditoria.findUnique.mockResolvedValue({
      auditoriaId: BigInt(100),
      createdAt: twoDaysAgo,
      entidad: "ARTICULO",
      accion: "UPDATE",
      entidadId: "42",
      detalle: {
        previo: { nombre: "Remera Termica", tipo: "ABRIGO" },
        nuevo: { nombre: "Remera Manga Larga", tipo: "EQUIPO" },
      },
    });

    mockTx.articulo.update.mockResolvedValue({ articuloId: 42, nombre: "Remera Termica" });

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "100" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockTx.articulo.update).toHaveBeenCalledWith({
      where: { articuloId: 42 },
      data: {
        nombre: "Remera Termica",
        tipo: "ABRIGO",
      },
    });
    expect(logAudit).toHaveBeenCalled();
  });

  it("deshace un CREATE de un artículo eliminando la entidad creada", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    mockTx.auditoria.findUnique.mockResolvedValue({
      auditoriaId: BigInt(101),
      createdAt: oneDayAgo,
      entidad: "ARTICULO",
      accion: "CREATE",
      entidadId: "42",
      detalle: { nuevo: { nombre: "Nuevo Articulo", tipo: "EQUIPO" } },
    });

    mockTx.articulo.delete.mockResolvedValue({ articuloId: 42 });

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "101" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockTx.articulo.delete).toHaveBeenCalledWith({
      where: { articuloId: 42 },
    });
    expect(logAudit).toHaveBeenCalled();
  });

  it("deshace un DELETE de un grado recreando el grado eliminado", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "usr-admin" },
    } as never);

    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - 3);

    mockTx.auditoria.findUnique.mockResolvedValue({
      auditoriaId: BigInt(102),
      createdAt: hoursAgo,
      entidad: "GRADO_PERSONAL",
      accion: "DELETE",
      entidadId: "5",
      detalle: { abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 3, tipo: "SUBOFICIAL" },
    });

    mockTx.rango.create.mockResolvedValue({ rangoId: 5 });

    const req = createMockRequest();
    const res = await POST(req, { params: Promise.resolve({ auditoriaId: "102" }) });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockTx.rango.create).toHaveBeenCalledWith({
      data: {
        rangoId: 5,
        tipo: "SUBOFICIAL",
        abreviacion: "Sgto.",
        nombreCompleto: "Sargento",
        orden: 3,
      },
    });
    expect(logAudit).toHaveBeenCalled();
  });
});
