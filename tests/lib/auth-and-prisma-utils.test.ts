import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TipoPersonal, UserRole } from "@/generated/prisma/client";

const mockPrisma = vi.hoisted(() => ({
  tallaTipo: {
    findMany: vi.fn(),
  },
  rango: {
    groupBy: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { hashPassword, verifyPassword } from "@/lib/password";
import { hasPermission, type Permission } from "@/lib/permissions";
import { normalizePgConnectionStringSecurity } from "@/lib/postgres-connection";
import {
  getPrismaErrorCode,
  hasConstraintName,
  hasPrismaMissingColumn,
  isPrismaDatabaseUnavailable,
  withPrismaReadRetry,
} from "@/lib/prisma-errors";
import {
  getRangoCountByTipo,
  getTallaTipoIdMap,
  invalidateRangoTipoCountCache,
} from "@/lib/reference-data-cache";
import {
  ADMIN_ROLE_VALUES,
  canWriteRole,
  isAdminRole,
  isReadOnlyRole,
  WRITE_ROLE_VALUES,
} from "@/lib/user-role";

describe("user-role", () => {
  it("identifica correctamente roles administrativos, de escritura y solo lectura", () => {
    expect(ADMIN_ROLE_VALUES).toEqual(["ADMIN", "DESARROLLADOR"]);
    expect(WRITE_ROLE_VALUES).toEqual(["ADMIN", "DESARROLLADOR", "EDITOR"]);

    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("DESARROLLADOR")).toBe(true);
    expect(isAdminRole("EDITOR")).toBe(false);
    expect(isAdminRole(null)).toBe(false);

    expect(canWriteRole("ADMIN")).toBe(true);
    expect(canWriteRole("DESARROLLADOR")).toBe(true);
    expect(canWriteRole("EDITOR")).toBe(true);
    expect(canWriteRole("READ_ONLY")).toBe(false);
    expect(canWriteRole(undefined)).toBe(false);

    expect(isReadOnlyRole("READ_ONLY")).toBe(true);
    expect(isReadOnlyRole("ADMIN")).toBe(false);
    expect(isReadOnlyRole(123)).toBe(false);
  });
});

describe("permissions", () => {
  const allPermissions: Permission[] = [
    "read_data",
    "write_data",
    "delete_data",
    "manage_users",
    "view_audit",
    "read_own_data",
    "change_own_password",
  ];

  it("evalúa la matriz de permisos para cada rol de SISTEMA y para cuentas PERSONAL", () => {
    for (const perm of allPermissions) {
      expect(hasPermission(UserRole.ADMIN, perm)).toBe(true);
      expect(hasPermission(UserRole.DESARROLLADOR, perm, "SISTEMA")).toBe(true);
    }

    expect(hasPermission(UserRole.EDITOR, "write_data")).toBe(true);
    expect(hasPermission(UserRole.EDITOR, "delete_data")).toBe(true);
    expect(hasPermission(UserRole.EDITOR, "manage_users")).toBe(false);
    expect(hasPermission(UserRole.EDITOR, "view_audit")).toBe(false);

    expect(hasPermission(UserRole.READ_ONLY, "read_data")).toBe(true);
    expect(hasPermission(UserRole.READ_ONLY, "read_own_data")).toBe(true);
    expect(hasPermission(UserRole.READ_ONLY, "write_data")).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY, "change_own_password")).toBe(false);

    expect(hasPermission(UserRole.ADMIN, "read_data", "PERSONAL")).toBe(false);
    expect(hasPermission(UserRole.ADMIN, "read_own_data", "PERSONAL")).toBe(true);
    expect(hasPermission(UserRole.READ_ONLY, "change_own_password", "PERSONAL")).toBe(true);
  });
});

describe("password", () => {
  it("genera hashes bcrypt y verifica contraseñas válidas e inválidas", async () => {
    const hash = await hashPassword("ClaveSegura2026!");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(verifyPassword("ClaveSegura2026!", hash)).resolves.toBe(true);
    await expect(verifyPassword("ClaveIncorrecta", hash)).resolves.toBe(false);
  });
});

describe("postgres-connection", () => {
  it("normaliza sslmode a verify-full salvo cuando uselibpqcompat está activo o no aplica", () => {
    expect(normalizePgConnectionStringSecurity("not-a-valid-url")).toBe("not-a-valid-url");
    expect(
      normalizePgConnectionStringSecurity("mysql://user:pass@host:3306/db?sslmode=require")
    ).toBe("mysql://user:pass@host:3306/db?sslmode=require");
    expect(normalizePgConnectionStringSecurity("postgresql://user:pass@host:5432/db")).toBe(
      "postgresql://user:pass@host:5432/db"
    );
    expect(
      normalizePgConnectionStringSecurity("postgres://user:pass@host:5432/db?sslmode=disable")
    ).toBe("postgres://user:pass@host:5432/db?sslmode=disable");

    expect(
      normalizePgConnectionStringSecurity("postgresql://user:pass@host:5432/db?sslmode=prefer")
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=verify-full");
    expect(
      normalizePgConnectionStringSecurity("postgres://user:pass@host:5432/db?sslmode=REQUIRE")
    ).toBe("postgres://user:pass@host:5432/db?sslmode=verify-full");
    expect(
      normalizePgConnectionStringSecurity("postgresql://user:pass@host:5432/db?sslmode=verify-ca")
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=verify-full");

    expect(
      normalizePgConnectionStringSecurity(
        "postgresql://user:pass@host:5432/db?sslmode=require&uselibpqcompat=true"
      )
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=require&uselibpqcompat=true");
    expect(
      normalizePgConnectionStringSecurity(
        "postgresql://user:pass@host:5432/db?sslmode=require&uselibpqcompat=1"
      )
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=require&uselibpqcompat=1");
    expect(
      normalizePgConnectionStringSecurity(
        "postgresql://user:pass@host:5432/db?sslmode=require&uselibpqcompat=false"
      )
    ).toBe("postgresql://user:pass@host:5432/db?sslmode=verify-full&uselibpqcompat=false");
  });
});

describe("prisma-errors", () => {
  it("extrae códigos de error de Prisma y valida nombres de constraint y columnas faltantes", () => {
    expect(getPrismaErrorCode(null)).toBeNull();
    expect(getPrismaErrorCode("texto")).toBeNull();
    expect(getPrismaErrorCode({})).toBeNull();
    expect(getPrismaErrorCode({ code: 123 })).toBeNull();
    expect(getPrismaErrorCode({ code: "P2002" })).toBe("P2002");

    expect(
      hasConstraintName(new Error('Unique constraint failed on the constraint "uq_ci"'), "uq_ci")
    ).toBe(true);
    expect(hasConstraintName({ message: 'violates constraint "fk_bateria"' }, "fk_bateria")).toBe(
      true
    );
    expect(hasConstraintName({ message: 42 }, "fk_bateria")).toBe(false);
    expect(hasConstraintName("error plano", "fk_bateria")).toBe(false);

    expect(
      hasPrismaMissingColumn(
        new Error("The column `tipo_equipo_id` does not exist"),
        "tipo_equipo_id"
      )
    ).toBe(true);
    expect(
      hasPrismaMissingColumn(new Error("The column `tipo_equipo_id` is invalid"), "tipo_equipo_id")
    ).toBe(false);
    expect(hasPrismaMissingColumn(null, "tipo_equipo_id")).toBe(false);
  });

  it("detecta disponibilidad de base de datos por código y mensaje", () => {
    expect(isPrismaDatabaseUnavailable({ code: "P1001" })).toBe(true);
    expect(isPrismaDatabaseUnavailable({ code: "P1017" })).toBe(true);
    expect(isPrismaDatabaseUnavailable({ code: "P2002", message: "Unique" })).toBe(false);
    expect(isPrismaDatabaseUnavailable(new Error("Can't reach database server at localhost"))).toBe(
      true
    );
    expect(isPrismaDatabaseUnavailable(new Error("Connection terminated unexpectedly"))).toBe(true);
    expect(isPrismaDatabaseUnavailable(new Error("Otro error"))).toBe(false);
    expect(isPrismaDatabaseUnavailable({})).toBe(false);
  });

  it("withPrismaReadRetry reintenta ante errores de disponibilidad y corta ante errores definitivos", async () => {
    const okOp = vi.fn().mockResolvedValue("ok");
    await expect(withPrismaReadRetry(okOp)).resolves.toBe("ok");
    expect(okOp).toHaveBeenCalledTimes(1);

    const transientOp = vi
      .fn()
      .mockRejectedValueOnce({ code: "P1001" })
      .mockResolvedValueOnce("recuperado");
    await expect(withPrismaReadRetry(transientOp, { attempts: 2, delayMs: 0 })).resolves.toBe(
      "recuperado"
    );
    expect(transientOp).toHaveBeenCalledTimes(2);

    const nonRetryableOp = vi.fn().mockRejectedValue(new Error("Sintaxis inválida"));
    await expect(withPrismaReadRetry(nonRetryableOp, { attempts: 3, delayMs: 0 })).rejects.toThrow(
      "Sintaxis inválida"
    );
    expect(nonRetryableOp).toHaveBeenCalledTimes(1);

    const alwaysDownOp = vi.fn().mockRejectedValue({ code: "P1008" });
    await expect(withPrismaReadRetry(alwaysDownOp, { attempts: 2, delayMs: 0 })).rejects.toEqual({
      code: "P1008",
    });
    expect(alwaysDownOp).toHaveBeenCalledTimes(2);
  });
});

describe("reference-data-cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
    vi.clearAllMocks();
    invalidateRangoTipoCountCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cachea, deduplica peticiones en vuelo y expira getTallaTipoIdMap", async () => {
    let resolveQuery!: (value: Array<{ nombre: string; tallaTipoId: number }>) => void;
    mockPrisma.tallaTipo.findMany.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        })
    );

    const p1 = getTallaTipoIdMap();
    const p2 = getTallaTipoIdMap();
    expect(mockPrisma.tallaTipo.findMany).toHaveBeenCalledTimes(1);

    resolveQuery([
      { nombre: "PARKA", tallaTipoId: 1 },
      { nombre: "CALZADO", tallaTipoId: 5 },
    ]);

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(m1.get("PARKA")).toBe(1);
    expect(m2.get("CALZADO")).toBe(5);

    // Hit de caché en caliente
    const m3 = await getTallaTipoIdMap();
    expect(m3.get("PARKA")).toBe(1);
    expect(mockPrisma.tallaTipo.findMany).toHaveBeenCalledTimes(1);

    // Expiración tras TTL (5 min)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    mockPrisma.tallaTipo.findMany.mockResolvedValueOnce([{ nombre: "KEPI", tallaTipoId: 9 }]);
    const m4 = await getTallaTipoIdMap();
    expect(m4.get("KEPI")).toBe(9);
    expect(mockPrisma.tallaTipo.findMany).toHaveBeenCalledTimes(2);
  });

  it("cachea, deduplica, invalida y expira getRangoCountByTipo", async () => {
    let resolveGroupBy!: (value: Array<{ tipo: TipoPersonal; _count: { _all: number } }>) => void;
    mockPrisma.rango.groupBy.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGroupBy = resolve;
        })
    );

    const c1 = getRangoCountByTipo(TipoPersonal.SUBALTERNO);
    const c2 = getRangoCountByTipo(TipoPersonal.OFICIAL);
    expect(mockPrisma.rango.groupBy).toHaveBeenCalledTimes(1);

    resolveGroupBy([{ tipo: TipoPersonal.SUBALTERNO, _count: { _all: 6 } }]);
    await expect(c1).resolves.toBe(6);
    await expect(c2).resolves.toBe(0);

    // Hit de caché en caliente
    await expect(getRangoCountByTipo(TipoPersonal.SUBALTERNO)).resolves.toBe(6);
    expect(mockPrisma.rango.groupBy).toHaveBeenCalledTimes(1);

    // Invalidación manual
    invalidateRangoTipoCountCache();
    mockPrisma.rango.groupBy.mockResolvedValueOnce([
      { tipo: TipoPersonal.OFICIAL, _count: { _all: 4 } },
    ]);
    await expect(getRangoCountByTipo(TipoPersonal.OFICIAL)).resolves.toBe(4);
    expect(mockPrisma.rango.groupBy).toHaveBeenCalledTimes(2);
  });
});
