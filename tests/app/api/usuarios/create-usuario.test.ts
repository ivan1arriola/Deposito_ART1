import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/usuarios/route";
import { authorizeRequest, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { sendEmailVerificationMagicLinkEmail } from "@/lib/auth-email";

vi.mock("@/lib/auth", () => ({
  authorizeRequest: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  logAudit: vi.fn(),
}));

vi.mock("@/lib/auth-email", () => ({
  sendEmailVerificationMagicLinkEmail: vi.fn(),
}));

vi.mock("@/lib/password-reset", () => ({
  ensurePasswordResetCompatibility: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rango: {
      findUnique: vi.fn(),
    },
    usuario: {
      create: vi.fn(),
    },
  },
}));

describe("POST /api/usuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockRequest(body: unknown) {
    return new Request("http://localhost:3000/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("retorna 403 si el usuario no tiene permisos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    } as never);

    const req = createMockRequest({});
    const res = await POST(req);

    expect(res.status).toBe(403);
  });

  it("retorna 400 si el payload es incompleto o invalido", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "admin-1" },
    } as never);

    const req = createMockRequest({
      rangoId: 1,
      nombre: "", // invalido
      apellido: "Perez",
      usuario: "jperez",
      password: "pass", // corto
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Payload inválido");
  });

  it("retorna 400 si el rangoId no existe en la base de datos", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "admin-1" },
    } as never);
    vi.mocked(prisma.rango.findUnique as never).mockResolvedValue(null as never);

    const req = createMockRequest({
      rangoId: 99,
      nombre: "Juan",
      apellido: "Perez",
      usuario: "jperez",
      password: "password123",
    });
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Grado invalido.");
  });

  it("crea el usuario correctamente y registra auditoria", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "admin-1" },
    } as never);
    vi.mocked(hashPassword).mockResolvedValue("hashed_secret");
    vi.mocked(prisma.rango.findUnique as never).mockResolvedValue({
      rangoId: 1,
      abreviacion: "Sgto.",
    } as never);

    const mockCreatedUser = {
      usuarioId: "usr-999",
      rangoId: 1,
      rango: {
        rangoId: 1,
        tipo: "SUBOFICIAL",
        abreviacion: "Sgto.",
        nombreCompleto: "Sargento",
        orden: 3,
      },
      nombre: "Juan",
      apellido: "Perez",
      username: "jperez",
      mailReferencia: "jperez@ejercito.mil.uy",
      mailVerificadaAt: null,
      rol: "EDITOR",
      activo: true,
      createdAt: new Date("2026-05-17T10:00:00Z"),
      updatedAt: new Date("2026-05-17T10:00:00Z"),
    };
    vi.mocked(prisma.usuario.create as never).mockResolvedValue(mockCreatedUser as never);

    const req = createMockRequest({
      rangoId: 1,
      nombre: "Juan",
      apellido: "Perez",
      usuario: "jperez",
      password: "SuperSecretPassword!",
      mailReferencia: "jperez@ejercito.mil.uy",
      rol: "EDITOR",
    });

    const res = await POST(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.usuarioId).toBe("usr-999");
    expect(data.username).toBe("jperez");
    expect(data.grado).toBe("Sgto.");

    expect(prisma.usuario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          rangoId: 1,
          nombre: "Juan",
          apellido: "Perez",
          username: "jperez",
          passwordHash: "hashed_secret",
          mailReferencia: "jperez@ejercito.mil.uy",
          mailVerificadaAt: null,
          rol: "EDITOR",
          activo: true,
        },
      }),
    );

    expect(sendEmailVerificationMagicLinkEmail).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        usuarioId: "usr-999",
        mailReferencia: "jperez@ejercito.mil.uy",
      }),
    );

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        usuarioId: "admin-1",
        accion: "CREATE",
        entidad: "USUARIO",
        entidadId: "usr-999",
      }),
    );
  });

  it("retorna 409 si el usuario ya existe (P2002)", async () => {
    vi.mocked(authorizeRequest).mockResolvedValue({
      ok: true,
      user: { usuarioId: "admin-1" },
    } as never);
    vi.mocked(hashPassword).mockResolvedValue("hashed_secret");
    vi.mocked(prisma.rango.findUnique as never).mockResolvedValue({
      rangoId: 1,
      abreviacion: "Sgto.",
    } as never);

    const errorP2002 = { code: "P2002" };
    vi.mocked(prisma.usuario.create as never).mockRejectedValue(errorP2002 as never);

    const req = createMockRequest({
      rangoId: 1,
      nombre: "Juan",
      apellido: "Perez",
      usuario: "jperez",
      password: "SuperSecretPassword!",
    });

    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("El usuario ya existe.");
  });
});
