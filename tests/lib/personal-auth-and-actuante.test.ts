import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

const { mockBcryptHash, mockBcryptCompare, mockPrisma } = vi.hoisted(() => ({
  mockBcryptHash: vi.fn(),
  mockBcryptCompare: vi.fn(),
  mockPrisma: {
    personal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import {
  adminSetPersonalPassword,
  changePersonalPassword,
  ensurePersonalAuthCompatibility,
  getPersonalAdminUserByCi,
  getPersonalNotificationTarget,
  getPersonalSelfContact,
  getPersonalSessionIdentity,
  listPersonalAdminUsers,
  parsePersonalUsuarioId,
  toPersonalUsuarioId,
  updatePersonalAccountActive,
  updatePersonalSelfContact,
  verifyOrProvisionPersonalCredentials,
} from "@/lib/personal-auth";
import {
  ensurePrestamoActuanteCompatibility,
  fetchPrestamoActuanteByMovimientoIds,
  isSargentoRank,
  upsertPrestamoActuante,
} from "@/lib/prestamo-actuante";
import { formatUruguayanCi, generateRandomUruguayanCi } from "@/lib/ci";

const globalCaches = globalThis as unknown as {
  ensurePersonalAuthPromise?: Promise<void> | null;
  ensurePrestamoActuantePromise?: Promise<void> | null;
};

function makePersonalRecord(
  ci: string,
  overrides?: { withSecondaryNames?: boolean; withBateria?: boolean }
) {
  const withSecondary = overrides?.withSecondaryNames ?? true;
  const withBateria = overrides?.withBateria ?? true;
  return {
    ci,
    apellido1: "Pérez",
    apellido2: withSecondary ? "Gómez" : null,
    nombre1: "Carlos",
    nombre2: withSecondary ? "Luis" : null,
    telefonoContacto: "099123456",
    rangoId: 5,
    createdAt: new Date("2026-01-10T10:00:00.000Z"),
    updatedAt: new Date("2026-01-11T10:00:00.000Z"),
    rango: {
      rangoId: 5,
      tipo: "SUBALTERNO" as const,
      abreviacion: "Cbo.",
      nombreCompleto: "Cabo",
      orden: 20,
    },
    bateria: withBateria ? { nombre: "Batería A" } : null,
  };
}

function makeCredentialRow(
  ci: string,
  overrides?: { activo?: boolean; mailReferencia?: string | null }
) {
  return {
    ci,
    passwordHash: "stored-hash",
    mailReferencia:
      overrides?.mailReferencia !== undefined ? overrides.mailReferencia : "carlos@example.com",
    activo: overrides?.activo ?? true,
    createdAt: new Date("2026-02-01T10:00:00.000Z"),
    updatedAt: new Date("2026-02-02T10:00:00.000Z"),
  };
}

describe("personal-auth.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalCaches.ensurePersonalAuthPromise = null;
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.$executeRaw.mockResolvedValue(1);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockBcryptHash.mockResolvedValue("new-hash");
    mockBcryptCompare.mockResolvedValue(true);
  });

  it("convierte y parsea IDs de usuario personal", () => {
    const ci = generateRandomUruguayanCi();
    expect(toPersonalUsuarioId(formatUruguayanCi(ci))).toBe(`personal:${ci}`);
    expect(parsePersonalUsuarioId("usr-123")).toBeNull();
    expect(parsePersonalUsuarioId("personal:111")).toBeNull();
    expect(parsePersonalUsuarioId(`personal:${formatUruguayanCi(ci)}`)).toBe(ci);
  });

  it("ensurePersonalAuthCompatibility reinicia la promesa si falla y cachea cuando tiene éxito", async () => {
    mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("fallo DDL"));
    await expect(ensurePersonalAuthCompatibility()).rejects.toThrow("fallo DDL");
    expect(globalCaches.ensurePersonalAuthPromise).toBeNull();

    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    await ensurePersonalAuthCompatibility();
    await ensurePersonalAuthCompatibility();
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(4);
  });

  it("verifyOrProvisionPersonalCredentials maneja CI inválida, inexistente, inactiva, provisión inicial y contraseña", async () => {
    const ci = generateRandomUruguayanCi();

    expect(await verifyOrProvisionPersonalCredentials("123", "123")).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    expect(await verifyOrProvisionPersonalCredentials(ci, ci)).toBeNull();

    // Cuenta inactiva
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci, { activo: false })]);
    expect(await verifyOrProvisionPersonalCredentials(ci, ci)).toBeNull();

    // Sin credencial aún + contraseña distinta a CI
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await verifyOrProvisionPersonalCredentials(ci, "otra-clave")).toBeNull();

    // Sin credencial aún + falla al re-obtener credencial tras upsert
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    expect(await verifyOrProvisionPersonalCredentials(ci, ci)).toBeNull();

    // Sin credencial aún + provisión exitosa (sin nombre2/batería y sin mail)
    mockPrisma.personal.findUnique.mockResolvedValueOnce(
      makePersonalRecord(ci, { withSecondaryNames: false, withBateria: false })
    );
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCredentialRow(ci, { mailReferencia: null })]);
    const provisioned = await verifyOrProvisionPersonalCredentials(formatUruguayanCi(ci), ci);
    expect(provisioned?.identity).toMatchObject({
      ci,
      nombre: "Carlos",
      apellido: "Pérez",
      bateriaNombre: null,
      mailReferencia: null,
    });
    expect(mockBcryptHash).toHaveBeenCalledWith(ci, 12);

    // Credencial existente + contraseña incorrecta
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci)]);
    mockBcryptCompare.mockResolvedValueOnce(false);
    expect(await verifyOrProvisionPersonalCredentials(ci, "mal")).toBeNull();

    // Credencial existente + contraseña válida
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      makeCredentialRow(ci, { mailReferencia: "ok@test.com" }),
    ]);
    mockBcryptCompare.mockResolvedValueOnce(true);
    const ok = await verifyOrProvisionPersonalCredentials(ci, "correcta");
    expect(ok?.identity.mailReferencia).toBe("ok@test.com");
  });

  it("getPersonalSessionIdentity valida CI, existencia y estado activo", async () => {
    const ci = generateRandomUruguayanCi();
    expect(await getPersonalSessionIdentity("1")).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await getPersonalSessionIdentity(ci)).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci, { activo: false })]);
    expect(await getPersonalSessionIdentity(ci)).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci, { mailReferencia: null })]);
    const session = await getPersonalSessionIdentity(ci);
    expect(session).toMatchObject({ ci, mailReferencia: null });

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      makeCredentialRow(ci, { mailReferencia: "p@test.com" }),
    ]);
    const sessionWithMail = await getPersonalSessionIdentity(ci);
    expect(sessionWithMail).toMatchObject({ ci, mailReferencia: "p@test.com" });
  });

  it("changePersonalPassword cubre todos los caminos", async () => {
    const ci = generateRandomUruguayanCi();

    expect(await changePersonalPassword("bad", "a", "b")).toEqual({
      ok: false,
      reason: "INVALID_CI",
    });

    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    expect(await changePersonalPassword(ci, ci, "nueva")).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });

    // Sin credencial: contraseña actual != CI
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await changePersonalPassword(ci, "incorrecta", "nueva")).toEqual({
      ok: false,
      reason: "INVALID_CURRENT_PASSWORD",
    });

    // Sin credencial: contraseña actual == CI
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await changePersonalPassword(ci, ci, "nueva")).toEqual({ ok: true, ci });

    // Con credencial: contraseña actual inválida
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci)]);
    mockBcryptCompare.mockResolvedValueOnce(false);
    expect(await changePersonalPassword(ci, "mala", "nueva")).toEqual({
      ok: false,
      reason: "INVALID_CURRENT_PASSWORD",
    });

    // Con credencial: contraseña actual válida
    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci, { activo: false })]);
    mockBcryptCompare.mockResolvedValueOnce(true);
    expect(await changePersonalPassword(ci, "actual", "nueva")).toEqual({ ok: true, ci });
  });

  it("adminSetPersonalPassword, updatePersonalAccountActive, getPersonalAdminUserByCi y listPersonalAdminUsers", async () => {
    const ci1 = generateRandomUruguayanCi();
    const ci2 = generateRandomUruguayanCi();

    // adminSetPersonalPassword casos nulos y éxito
    expect(await adminSetPersonalPassword("bad", "123")).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await adminSetPersonalPassword(ci1, "123")).toBeNull();

    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci1))
      .mockResolvedValueOnce(makePersonalRecord(ci1));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([makeCredentialRow(ci1)]);
    const setRes = await adminSetPersonalPassword(ci1, "NuevaClave");
    expect(setRes?.usuarioId).toBe(`personal:${ci1}`);

    // updatePersonalAccountActive casos nulos, provisión y actualización
    expect(await updatePersonalAccountActive("bad", false)).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await updatePersonalAccountActive(ci1, false)).toBeNull();

    // Sin credencial previa -> crea credencial con hash por defecto
    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci1))
      .mockResolvedValueOnce(makePersonalRecord(ci1));
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCredentialRow(ci1, { activo: false })]);
    const createdDisabled = await updatePersonalAccountActive(ci1, false);
    expect(createdDisabled?.activo).toBe(false);

    // Con credencial previa -> solo actualiza activo
    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci1))
      .mockResolvedValueOnce(makePersonalRecord(ci1));
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([makeCredentialRow(ci1, { activo: false })])
      .mockResolvedValueOnce([makeCredentialRow(ci1, { activo: true })]);
    const enabled = await updatePersonalAccountActive(ci1, true);
    expect(enabled?.activo).toBe(true);

    // getPersonalAdminUserByCi casos nulos y sin credencial
    expect(await getPersonalAdminUserByCi("bad")).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await getPersonalAdminUserByCi(ci1)).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci1));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    const adminDefault = await getPersonalAdminUserByCi(ci1);
    expect(adminDefault).toMatchObject({ activo: true, mailReferencia: null });

    // listPersonalAdminUsers vacío (cubre cis.length === 0) y con registros mixtos
    mockPrisma.$queryRaw.mockClear();
    mockPrisma.personal.findMany.mockResolvedValueOnce([]);
    expect(await listPersonalAdminUsers()).toEqual([]);
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();

    mockPrisma.personal.findMany.mockResolvedValueOnce([
      makePersonalRecord(ci1),
      makePersonalRecord(ci2),
    ]);
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      makeCredentialRow(ci1, { mailReferencia: "u1@test.com" }),
    ]);
    const list = await listPersonalAdminUsers();
    expect(list).toHaveLength(2);
    expect(list[0].mailReferencia).toBe("u1@test.com");
    expect(list[1].mailReferencia).toBeNull();
  });

  it("getPersonalSelfContact, getPersonalNotificationTarget y updatePersonalSelfContact", async () => {
    const ci = generateRandomUruguayanCi();

    expect(await getPersonalSelfContact("bad")).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await getPersonalSelfContact(ci)).toBeNull();

    expect(await getPersonalNotificationTarget("bad")).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await getPersonalNotificationTarget(ci)).toBeNull();

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await getPersonalNotificationTarget(ci)).toEqual({
      ci,
      mailReferencia: null,
      gradoAbreviacion: "Cbo.",
      nombreCompleto: "Pérez Gómez, Carlos Luis",
    });

    mockPrisma.personal.findUnique.mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      makeCredentialRow(ci, { mailReferencia: "noti@test.com" }),
    ]);
    expect(await getPersonalNotificationTarget(ci)).toMatchObject({
      mailReferencia: "noti@test.com",
    });

    // updatePersonalSelfContact inválidos
    expect(await updatePersonalSelfContact("bad", { telefonoContacto: "099111222" })).toBeNull();
    mockPrisma.personal.findUnique.mockResolvedValueOnce(null);
    expect(await updatePersonalSelfContact(ci, { telefonoContacto: "099111222" })).toBeNull();

    // Actualiza teléfono y mail cuando no existe credencial previa
    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci))
      .mockResolvedValueOnce({ ...makePersonalRecord(ci), telefonoContacto: "098765432" });
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCredentialRow(ci, { mailReferencia: "nuevo@test.com" })]);

    const updated1 = await updatePersonalSelfContact(ci, {
      telefonoContacto: "098765432",
      mailReferencia: "nuevo@test.com",
    });
    expect(mockPrisma.personal.update).toHaveBeenCalledWith({
      where: { ci },
      data: { telefonoContacto: "098765432" },
    });
    expect(updated1).toEqual({
      ci,
      telefonoContacto: "098765432",
      mailReferencia: "nuevo@test.com",
    });

    // Actualiza solo mail cuando la credencial ya existe
    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci))
      .mockResolvedValueOnce(makePersonalRecord(ci));
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([makeCredentialRow(ci)])
      .mockResolvedValueOnce([makeCredentialRow(ci, { mailReferencia: null })]);

    const updated2 = await updatePersonalSelfContact(ci, { mailReferencia: null });
    expect(updated2?.mailReferencia).toBeNull();

    // Actualiza solo teléfono sin mailReferencia
    mockPrisma.personal.findUnique
      .mockResolvedValueOnce(makePersonalRecord(ci))
      .mockResolvedValueOnce({ ...makePersonalRecord(ci), telefonoContacto: "091234567" });
    mockPrisma.$queryRaw.mockResolvedValueOnce([makeCredentialRow(ci)]);
    const updated3 = await updatePersonalSelfContact(ci, { telefonoContacto: "091234567" });
    expect(updated3?.telefonoContacto).toBe("091234567");
  });
});

describe("prestamo-actuante.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalCaches.ensurePrestamoActuantePromise = null;
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
  });

  it("identifica rangos de sargento correctamente", () => {
    expect(isSargentoRank("Sgto.", "Sargento")).toBe(true);
    expect(isSargentoRank("Sgto. 1º", null)).toBe(true);
    expect(isSargentoRank(null, "Sargento Primero")).toBe(true);
    expect(isSargentoRank("Tte. 1º", "Teniente Primero")).toBe(false);
    expect(isSargentoRank(null, null)).toBe(false);
  });

  it("ensurePrestamoActuanteCompatibility maneja fallos y caché en globalThis", async () => {
    mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("fallo compat"));
    await expect(ensurePrestamoActuanteCompatibility()).rejects.toThrow("fallo compat");
    expect(globalCaches.ensurePrestamoActuantePromise).toBeNull();

    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    await ensurePrestamoActuanteCompatibility();
    await ensurePrestamoActuanteCompatibility();
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(10);
  });

  it("upsertPrestamoActuante elimina si actuanteCi es null o hace upsert si hay CI", async () => {
    const mockTx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
    } as unknown as Prisma.TransactionClient;

    await upsertPrestamoActuante(mockTx, BigInt(10), null);
    await upsertPrestamoActuante(mockTx, BigInt(10), "51067524");
    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("fetchPrestamoActuanteByMovimientoIds devuelve mapa vacío o formateado", async () => {
    const emptyMap = await fetchPrestamoActuanteByMovimientoIds([]);
    expect(emptyMap.size).toBe(0);
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();

    mockPrisma.$queryRaw.mockResolvedValueOnce([
      {
        movimientoId: "1",
        actuanteCi: "51067524",
        gradoAbreviacion: "Sgto.",
        apellido1: "Rodríguez",
        apellido2: "Lara",
        nombre1: "Wilson",
        nombre2: "Omar",
      },
      {
        movimientoId: "2",
        actuanteCi: "12345672",
        gradoAbreviacion: "Sgto. 1º",
        apellido1: "Pérez",
        apellido2: null,
        nombre1: "Ana",
        nombre2: null,
      },
    ]);

    const result = await fetchPrestamoActuanteByMovimientoIds([BigInt(1), BigInt(2)]);
    expect(result.get("1")).toEqual({
      ci: "51067524",
      label: "Sgto. Rodríguez Lara, Wilson Omar",
    });
    expect(result.get("2")).toEqual({
      ci: "12345672",
      label: "Sgto. 1º Pérez, Ana",
    });
  });
});
