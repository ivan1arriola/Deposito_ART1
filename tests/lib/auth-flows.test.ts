import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";
import type { CredentialsConfig } from "next-auth/providers/credentials";

const {
  mockGetServerSession,
  mockLogAudit,
  mockNotifyAdminOnLogin,
  mockVerifyPassword,
  mockHashPassword,
  mockGetPersonalSessionIdentity,
  mockVerifyOrProvisionPersonalCredentials,
  mockSendMail,
  mockTx,
  mockPrisma,
} = vi.hoisted(() => {
  const tx = {
    passwordResetCode: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  };
  return {
    mockGetServerSession: vi.fn(),
    mockLogAudit: vi.fn(),
    mockNotifyAdminOnLogin: vi.fn(),
    mockVerifyPassword: vi.fn(),
    mockHashPassword: vi.fn(),
    mockGetPersonalSessionIdentity: vi.fn(),
    mockVerifyOrProvisionPersonalCredentials: vi.fn(),
    mockSendMail: vi.fn(),
    mockTx: tx,
    mockPrisma: {
      usuario: {
        findUnique: vi.fn(),
      },
      passwordResetCode: {
        create: vi.fn(),
      },
      $executeRawUnsafe: vi.fn(),
      $transaction: vi.fn(async (callback: (innerTx: typeof tx) => unknown) => callback(tx)),
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config: CredentialsConfig) => ({
    ...config,
    id: "credentials",
    type: "credentials" as const,
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: mockVerifyPassword,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/notify-admins", () => ({
  notifyAdminOnLogin: mockNotifyAdminOnLogin,
}));

vi.mock("@/lib/personal-auth", () => ({
  getPersonalSessionIdentity: mockGetPersonalSessionIdentity,
  verifyOrProvisionPersonalCredentials: mockVerifyOrProvisionPersonalCredentials,
  parsePersonalUsuarioId: (usuarioId: string) => {
    if (!usuarioId.startsWith("personal:")) return null;
    const digits = usuarioId.slice("personal:".length).replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 8 ? digits : null;
  },
}));

vi.mock("@/lib/mailer", () => ({
  sendMail: mockSendMail,
}));

import {
  authorizeRequest,
  getUserFromRequest,
  hashPassword,
  invalidateAuthUserCache,
  verifyPassword,
} from "@/lib/auth";
import { authOptions } from "@/lib/auth-config";
import {
  sendEmailVerificationMagicLinkEmail,
  sendPasswordResetMagicLinkEmail,
} from "@/lib/auth-email";
import {
  consumeMagicLinkToken,
  createEmailVerificationToken,
  createMagicLinkToken,
  createPasswordResetToken,
  ensurePasswordResetCompatibility,
  generateMagicToken,
} from "@/lib/password-reset";
import { generateRandomUruguayanCi } from "@/lib/ci";

type MockCredentialsProvider = {
  authorize: (
    credentials: Record<string, string> | undefined,
    req: { body?: unknown; query?: unknown; headers?: unknown; method?: string }
  ) => Promise<unknown>;
};

describe("auth.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAuthUserCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reexporta hashPassword y verifyPassword", async () => {
    mockHashPassword.mockResolvedValue("hash-x");
    mockVerifyPassword.mockResolvedValue(true);

    expect(await hashPassword("clave")).toBe("hash-x");
    expect(await verifyPassword("clave", "hash-x")).toBe(true);
  });

  it("retorna null si no hay sesión o falta user.id", async () => {
    mockGetServerSession.mockResolvedValueOnce(null);
    expect(await getUserFromRequest()).toBeNull();

    mockGetServerSession.mockResolvedValueOnce({ user: { name: "sin-id" } });
    expect(await getUserFromRequest()).toBeNull();
  });

  it("resuelve usuario de sistema, usa caché por TTL y permite invalidar caché", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));

    mockGetServerSession.mockResolvedValue({
      user: {
        id: "usr-1",
        name: "jperez",
        role: "ADMIN",
        accountType: "SISTEMA",
        personalCi: null,
      },
    });
    mockPrisma.usuario.findUnique.mockResolvedValue({
      usuarioId: "usr-1",
      rangoId: 3,
      nombre: "Juan",
      apellido: "Pérez",
      username: "jperez",
      mailReferencia: "jperez@example.com",
      rol: "ADMIN",
      activo: true,
      rango: { abreviacion: "Sgto." },
    });

    const first = await getUserFromRequest();
    expect(first).toEqual({
      usuarioId: "usr-1",
      rangoId: 3,
      grado: "Sgto.",
      nombre: "Juan",
      apellido: "Pérez",
      username: "jperez",
      mailReferencia: "jperez@example.com",
      rol: "ADMIN",
      activo: true,
      accountType: "SISTEMA",
      personalCi: null,
    });

    // Hit de caché dentro del TTL
    const cached = await getUserFromRequest();
    expect(cached).toEqual(first);
    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledTimes(1);

    // Expiración del TTL
    vi.advanceTimersByTime(10_001);
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "usr-1",
      rangoId: null,
      nombre: "Juan",
      apellido: "Pérez",
      username: "jperez",
      mailReferencia: null,
      rol: "ADMIN",
      activo: true,
      rango: null,
    });

    const refreshed = await getUserFromRequest();
    expect(refreshed?.grado).toBe("Sin grado");
    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledTimes(2);

    // Invalidación puntual
    invalidateAuthUserCache("usr-1");
    await getUserFromRequest();
    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledTimes(3);
  });

  it("deduplica solicitudes concurrentes en vuelo para el mismo usuario", async () => {
    let resolveQuery: ((value: unknown) => void) | null = null;
    mockGetServerSession.mockResolvedValue({
      user: { id: "usr-concurrent", name: "c", role: "EDITOR", accountType: "SISTEMA" },
    });
    mockPrisma.usuario.findUnique.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        })
    );

    const p1 = getUserFromRequest();
    const p2 = getUserFromRequest();
    await vi.waitFor(() => {
      expect(resolveQuery).not.toBeNull();
    });

    resolveQuery!({
      usuarioId: "usr-concurrent",
      rangoId: 1,
      nombre: "Ana",
      apellido: "Gómez",
      username: "agomez",
      mailReferencia: null,
      rol: "EDITOR",
      activo: true,
      rango: { abreviacion: "Alf." },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1?.usuarioId).toBe("usr-concurrent");
    expect(r2).toEqual(r1);
    expect(mockPrisma.usuario.findUnique).toHaveBeenCalledTimes(1);
  });

  it("retorna null cuando el usuario de sistema no existe o está inactivo", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "usr-missing", name: "x", role: "EDITOR", accountType: "SISTEMA" },
    });
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    expect(await getUserFromRequest()).toBeNull();

    invalidateAuthUserCache("usr-missing");
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "usr-missing",
      rangoId: 1,
      nombre: "Inactivo",
      apellido: "Test",
      username: "inactivo",
      mailReferencia: null,
      rol: "EDITOR",
      activo: false,
      rango: null,
    });
    expect(await getUserFromRequest()).toBeNull();
  });

  it("resuelve cuentas PERSONAL por accountType o prefijo personal: y maneja faltantes", async () => {
    const validCi = generateRandomUruguayanCi();

    // accountType PERSONAL sin personalCi ni prefijo válido -> "personal:unknown" -> null
    mockGetServerSession.mockResolvedValueOnce({
      user: {
        id: "sin-prefijo",
        name: "x",
        role: "READ_ONLY",
        accountType: "PERSONAL",
        personalCi: null,
      },
    });
    expect(await getUserFromRequest()).toBeNull();

    // Detectado por prefijo aunque accountType sea otro, identity inexistente -> null
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: `personal:${validCi}`, name: validCi, role: "READ_ONLY", accountType: "SISTEMA" },
    });
    mockGetPersonalSessionIdentity.mockResolvedValueOnce(null);
    expect(await getUserFromRequest()).toBeNull();

    invalidateAuthUserCache();

    // Identity válida
    mockGetServerSession.mockResolvedValueOnce({
      user: {
        id: `personal:${validCi}`,
        name: validCi,
        role: "READ_ONLY",
        accountType: "PERSONAL",
        personalCi: validCi,
      },
    });
    mockGetPersonalSessionIdentity.mockResolvedValueOnce({
      ci: validCi,
      rangoId: 7,
      gradoAbreviacion: "Cbo.",
      nombre: "Luis",
      apellido: "Silva",
      mailReferencia: "luis@example.com",
    });

    const user = await getUserFromRequest();
    expect(user).toEqual({
      usuarioId: `personal:${validCi}`,
      rangoId: 7,
      grado: "Cbo.",
      nombre: "Luis",
      apellido: "Silva",
      username: validCi,
      mailReferencia: "luis@example.com",
      rol: "READ_ONLY",
      activo: true,
      accountType: "PERSONAL",
      personalCi: validCi,
    });
  });

  it("authorizeRequest devuelve 401, 403, 503, 500 y 200 según corresponda", async () => {
    const req = new Request("http://localhost:3000/api/test");

    // 401 sin usuario
    mockGetServerSession.mockResolvedValueOnce(null);
    const res401 = await authorizeRequest(req, "read_data");
    expect(res401.ok).toBe(false);
    if (!res401.ok) expect(res401.response.status).toBe(401);

    // 403 sin permiso
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "usr-ro", name: "ro", role: "READ_ONLY", accountType: "SISTEMA" },
    });
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "usr-ro",
      rangoId: 1,
      nombre: "Solo",
      apellido: "Lectura",
      username: "ro",
      mailReferencia: null,
      rol: "READ_ONLY",
      activo: true,
      rango: null,
    });
    const res403 = await authorizeRequest(req, "write_data");
    expect(res403.ok).toBe(false);
    if (!res403.ok) expect(res403.response.status).toBe(403);

    // 200 autorizado
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "usr-ro", name: "ro", role: "READ_ONLY", accountType: "SISTEMA" },
    });
    const res200 = await authorizeRequest(req, "read_data");
    expect(res200.ok).toBe(true);
    if (res200.ok) expect(res200.user.usuarioId).toBe("usr-ro");

    // 503 base de datos no disponible
    invalidateAuthUserCache();
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "usr-db-err", name: "db", role: "ADMIN", accountType: "SISTEMA" },
    });
    mockPrisma.usuario.findUnique.mockRejectedValue({ code: "P1001" });
    const res503 = await authorizeRequest(req, "read_data");
    expect(res503.ok).toBe(false);
    if (!res503.ok) expect(res503.response.status).toBe(503);

    // 500 error inesperado
    invalidateAuthUserCache();
    mockGetServerSession.mockRejectedValueOnce(new Error("fallo interno"));
    const res500 = await authorizeRequest(req, "read_data");
    expect(res500.ok).toBe(false);
    if (!res500.ok) expect(res500.response.status).toBe(500);
  });
});

describe("auth-config.ts", () => {
  const credentialsProvider = authOptions.providers[0] as unknown as MockCredentialsProvider;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza credenciales incompletas", async () => {
    await expect(credentialsProvider.authorize(undefined, {})).rejects.toThrow(
      "Credenciales incompletas"
    );
    await expect(
      credentialsProvider.authorize({ username: "ana", password: "" }, {})
    ).rejects.toThrow("Credenciales incompletas");
  });

  it("rechaza usuario de sistema inactivo o con contraseña incorrecta", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "u1",
      username: "ana",
      mailReferencia: null,
      rol: "EDITOR",
      activo: false,
      passwordHash: "hash",
      nombre: "Ana",
      apellido: "López",
      rango: null,
    });

    await expect(
      credentialsProvider.authorize({ username: "ana", password: "123" }, {})
    ).rejects.toThrow("Credenciales inválidas");

    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "u1",
      username: "ana",
      mailReferencia: null,
      rol: "EDITOR",
      activo: true,
      passwordHash: "hash",
      nombre: "Ana",
      apellido: "López",
      rango: { abreviacion: "Alf." },
    });
    mockVerifyPassword.mockResolvedValueOnce(false);

    await expect(
      credentialsProvider.authorize({ username: "ana", password: "bad" }, {})
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("autentica usuario de sistema aunque falle la notificación push", async () => {
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "u1",
      username: "ana",
      mailReferencia: "ana@example.com",
      rol: "EDITOR",
      activo: true,
      passwordHash: "hash",
      nombre: "Ana",
      apellido: "López",
      rango: { abreviacion: "Alf." },
    });
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockNotifyAdminOnLogin.mockRejectedValueOnce(new Error("push error"));

    const result = await credentialsProvider.authorize({ username: "  ana  ", password: "ok" }, {});

    expect(result).toEqual({
      id: "u1",
      name: "ana",
      email: "ana@example.com",
      role: "EDITOR",
      accountType: "SISTEMA",
      personalCi: null,
    });
    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({ accion: "LOGIN", entidad: "AUTH", usuarioId: "u1" })
    );

    // Usuario sin mail ni rango
    mockPrisma.usuario.findUnique.mockResolvedValueOnce({
      usuarioId: "u2",
      username: "dev",
      mailReferencia: null,
      rol: "DESARROLLADOR",
      activo: true,
      passwordHash: "hash",
      nombre: "Dev",
      apellido: "Sys",
      rango: null,
    });
    mockVerifyPassword.mockResolvedValueOnce(true);

    const devResult = await credentialsProvider.authorize({ username: "dev", password: "ok" }, {});
    expect(devResult).toEqual({
      id: "u2",
      name: "dev",
      email: undefined,
      role: "DESARROLLADOR",
      accountType: "SISTEMA",
      personalCi: null,
    });
  });

  it("autentica personal por CI válida y maneja fallo o rechazo de credenciales", async () => {
    const validCi = generateRandomUruguayanCi();

    // Usuario no existe y CI inválida
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    await expect(
      credentialsProvider.authorize({ username: "invalido", password: "123" }, {})
    ).rejects.toThrow("Credenciales inválidas");

    // CI válida pero credenciales personales inválidas
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    mockVerifyOrProvisionPersonalCredentials.mockResolvedValueOnce(null);
    await expect(
      credentialsProvider.authorize({ username: validCi, password: "wrong" }, {})
    ).rejects.toThrow("Credenciales inválidas");

    // CI válida con fallo en notifyAdminOnLogin silenciado y con mailReferencia
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    mockVerifyOrProvisionPersonalCredentials.mockResolvedValueOnce({
      identity: {
        ci: validCi,
        gradoAbreviacion: "Cbo.",
        nombre: "Carlos",
        apellido: "Ruiz",
        mailReferencia: "carlos@example.com",
      },
    });
    mockNotifyAdminOnLogin.mockRejectedValueOnce(new Error("push down"));

    const okPersonal = await credentialsProvider.authorize(
      { username: validCi, password: validCi },
      {}
    );
    expect(okPersonal).toEqual({
      id: `personal:${validCi}`,
      name: validCi,
      email: "carlos@example.com",
      role: "READ_ONLY",
      accountType: "PERSONAL",
      personalCi: validCi,
    });

    // CI válida sin mailReferencia
    mockPrisma.usuario.findUnique.mockResolvedValueOnce(null);
    mockVerifyOrProvisionPersonalCredentials.mockResolvedValueOnce({
      identity: {
        ci: validCi,
        gradoAbreviacion: "Sdo.",
        nombre: "Mario",
        apellido: "Sosa",
        mailReferencia: null,
      },
    });
    const okNoMail = await credentialsProvider.authorize(
      { username: validCi, password: validCi },
      {}
    );
    expect(okNoMail).toMatchObject({ email: undefined, accountType: "PERSONAL" });
  });

  it("ejecuta callbacks jwt y session con y sin usuario", async () => {
    type JwtFn = NonNullable<NonNullable<typeof authOptions.callbacks>["jwt"]>;
    type SessionFn = NonNullable<NonNullable<typeof authOptions.callbacks>["session"]>;
    const jwtCb = authOptions.callbacks!.jwt as JwtFn;
    const sessionCb = authOptions.callbacks!.session as SessionFn;

    const baseToken = { id: "old", role: "READ_ONLY" };
    const unchangedToken = await jwtCb({
      token: baseToken,
      user: undefined as unknown as Parameters<JwtFn>[0]["user"],
      account: null,
    });
    expect(unchangedToken).toEqual(baseToken);

    const updatedToken = await jwtCb({
      token: { id: "", role: "" },
      user: {
        id: "u1",
        role: "ADMIN",
        accountType: "SISTEMA",
        personalCi: undefined,
      },
      account: null,
    });
    expect(updatedToken).toEqual({
      id: "u1",
      role: "ADMIN",
      accountType: "SISTEMA",
      personalCi: null,
    });

    const sessionWithUser = await sessionCb({
      session: {
        expires: "2026-12-31",
        user: {
          id: "",
          name: "Ana",
          role: "",
          accountType: "",
        },
      },
      token: { id: "u1", role: "ADMIN", accountType: "PERSONAL", personalCi: "12345678" },
      user: {
        id: "u1",
        role: "ADMIN",
        accountType: "PERSONAL",
        email: "a@b.com",
        emailVerified: null,
      },
      newSession: undefined,
      trigger: "update",
    });
    expect(sessionWithUser.user).toMatchObject({
      id: "u1",
      role: "ADMIN",
      accountType: "PERSONAL",
      personalCi: "12345678",
    });

    const sessionWithUndefinedCi = await sessionCb({
      session: {
        expires: "2026-12-31",
        user: {
          id: "",
          name: "Ana",
          role: "",
          accountType: "",
        },
      },
      token: { id: "u2", role: "EDITOR", accountType: "SISTEMA" },
      user: {
        id: "u2",
        role: "EDITOR",
        accountType: "SISTEMA",
        email: "e@b.com",
        emailVerified: null,
      },
      newSession: undefined,
      trigger: "update",
    });
    expect(sessionWithUndefinedCi.user.personalCi).toBeNull();

    const sessionWithoutUser = await sessionCb({
      session: { expires: "2026-12-31" } as unknown as Parameters<SessionFn>[0]["session"],
      token: { id: "u1", role: "ADMIN" },
      user: {
        id: "u1",
        role: "ADMIN",
        accountType: "SISTEMA",
        email: "a@b.com",
        emailVerified: null,
      },
      newSession: undefined,
      trigger: "update",
    });
    expect(sessionWithoutUser).toEqual({ expires: "2026-12-31" });
  });
});

describe("password-reset.ts y auth-email.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reintenta ensurePasswordResetCompatibility si falla la migración inicial y luego la reutiliza", async () => {
    mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("tabla bloqueada"));
    await expect(ensurePasswordResetCompatibility()).rejects.toThrow("tabla bloqueada");

    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    await ensurePasswordResetCompatibility();
    await ensurePasswordResetCompatibility();
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(5);
  });

  it("genera y crea tokens de recuperación y verificación de correo", async () => {
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.passwordResetCode.create.mockResolvedValue({ resetId: "r1" });

    const randomToken = generateMagicToken();
    expect(randomToken.length).toBeGreaterThan(20);

    const resetResult = await createPasswordResetToken("usr-1", "  User@Example.COM ");
    expect(resetResult.token).toBeTruthy();
    expect(mockPrisma.passwordResetCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        usuarioId: "usr-1",
        tokenType: "PASSWORD_RESET",
        mailSnapshot: "user@example.com",
      }),
    });

    const customResult = await createMagicLinkToken({
      usuarioId: "usr-2",
      purpose: "PASSWORD_RESET",
      mailSnapshot: null,
      ttlMinutes: 10,
    });
    expect(customResult.token).toBeTruthy();
    expect(mockPrisma.passwordResetCode.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        usuarioId: "usr-2",
        mailSnapshot: null,
      }),
    });

    // Sin ttlMinutes explícito para cubrir ambos valores por defecto
    const defaultResetTtl = await createMagicLinkToken({
      usuarioId: "usr-2",
      purpose: "PASSWORD_RESET",
    });
    expect(defaultResetTtl.token).toBeTruthy();

    const defaultVerifyTtl = await createMagicLinkToken({
      usuarioId: "usr-2",
      purpose: "EMAIL_VERIFY",
    });
    expect(defaultVerifyTtl.token).toBeTruthy();

    const verifyResult = await createEmailVerificationToken("usr-1", "verify@example.com");
    expect(verifyResult.token).toBeTruthy();
    expect(mockPrisma.passwordResetCode.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        tokenType: "EMAIL_VERIFY",
        mailSnapshot: "verify@example.com",
      }),
    });
  });

  it("consumeMagicLinkToken maneja token inexistente, condición de carrera y consumo exitoso", async () => {
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);

    mockTx.passwordResetCode.findFirst.mockResolvedValueOnce(null);
    expect(
      await consumeMagicLinkToken({ token: "no-existe", purpose: "PASSWORD_RESET" })
    ).toBeNull();

    const record = {
      resetId: "reset-1",
      usuarioId: "usr-1",
      mailSnapshot: "a@b.com",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    };
    mockTx.passwordResetCode.findFirst.mockResolvedValueOnce(record);
    mockTx.passwordResetCode.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await consumeMagicLinkToken({ token: "  tok  ", purpose: "PASSWORD_RESET" })).toBeNull();

    mockTx.passwordResetCode.findFirst.mockResolvedValueOnce(record);
    mockTx.passwordResetCode.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await consumeMagicLinkToken({ token: "tok", purpose: "EMAIL_VERIFY" })).toEqual(record);
  });

  it("envía correos de recuperación de contraseña y validación de correo", async () => {
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.passwordResetCode.create.mockResolvedValue({ resetId: "r2" });
    mockSendMail.mockResolvedValue(undefined);

    const request = new Request("https://deposito.art1.mil.uy/api/auth/forgot-password");

    const resetEmail = await sendPasswordResetMagicLinkEmail(request, {
      usuarioId: "usr-1",
      username: "jperez",
      nombre: "Juan",
      apellido: "Pérez",
      mailReferencia: "jperez@example.com",
    });
    expect(resetEmail.expiresAt).toBeInstanceOf(Date);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "jperez@example.com",
        subject: expect.stringContaining("Recuperación de contraseña"),
        text: expect.stringContaining("Hola Juan Pérez"),
        html: expect.stringContaining("/auth/password-reset?token="),
      })
    );

    const verifyEmail = await sendEmailVerificationMagicLinkEmail(request, {
      usuarioId: "usr-2",
      username: "alias_sin_nombre",
      nombre: " ",
      apellido: "",
      mailReferencia: "alias@example.com",
    });
    expect(verifyEmail.expiresAt).toBeInstanceOf(Date);
    expect(mockSendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: "alias@example.com",
        subject: expect.stringContaining("Validación de correo"),
        text: expect.stringContaining("Hola alias_sin_nombre"),
        html: expect.stringContaining("/auth/verify-email?token="),
      })
    );
  });
});

// Evitar warning de import no usado si Prisma type se importa para referencia futura
export type _EnsurePrismaType = Prisma.JsonValue;
