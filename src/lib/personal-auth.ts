import bcrypt from "bcryptjs";
import { Prisma, TipoPersonal } from "@/generated/prisma/client";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { isValidUruguayanCi, normalizeCi } from "@/lib/ci";
import { prisma } from "@/lib/prisma";

const PERSONAL_USER_ID_PREFIX = "personal:";
const BCRYPT_SALT_ROUNDS = 12;

let ensurePersonalAuthPromise: Promise<void> | null = null;

const PERSONAL_IDENTITY_SELECT = {
  ci: true,
  tipo: true,
  apellido1: true,
  apellido2: true,
  nombre1: true,
  nombre2: true,
  telefonoContacto: true,
  rangoId: true,
  createdAt: true,
  updatedAt: true,
  rango: {
    select: {
      rangoId: true,
      tipo: true,
      abreviacion: true,
      nombreCompleto: true,
      orden: true,
    },
  },
  subalterno: {
    select: {
      bateria: {
        select: {
          nombre: true,
        },
      },
    },
  },
} as const satisfies Prisma.PersonalSelect;

type PersonalIdentityRecord = Prisma.PersonalGetPayload<{
  select: typeof PERSONAL_IDENTITY_SELECT;
}>;

type PersonalCredentialRow = {
  ci: string;
  passwordHash: string;
  mailReferencia: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonalAuthIdentity = {
  ci: string;
  tipo: TipoPersonal;
  rangoId: number;
  rango: {
    rangoId: number;
    tipo: TipoPersonal;
    abreviacion: string;
    nombreCompleto: string;
    orden: number;
  };
  gradoAbreviacion: string;
  gradoNombre: string;
  nombre: string;
  apellido: string;
  telefonoContacto: string | null;
  mailReferencia: string | null;
  bateriaNombre: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonalAdminUser = {
  usuarioId: string;
  rangoId: number;
  rango: {
    rangoId: number;
    tipo: TipoPersonal;
    abreviacion: string;
    nombreCompleto: string;
    orden: number;
  };
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  mailVerificadaAt: null;
  rol: "READ_ONLY";
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  accountType: "PERSONAL";
  personalCi: string;
};

type PersonalPasswordChangeResult =
  | { ok: true; ci: string }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_CURRENT_PASSWORD" | "INVALID_CI" };

type PersonalContactUpdate = {
  telefonoContacto?: string | null;
  mailReferencia?: string | null;
};

export type PersonalSelfContact = {
  ci: string;
  telefonoContacto: string | null;
  mailReferencia: string | null;
};

function normalizeCiOrNull(ci: string) {
  const normalized = normalizeCi(ci.trim());
  if (!isValidUruguayanCi(normalized)) return null;
  return normalized;
}

function joinName(primary: string, secondary: string | null) {
  return `${primary} ${secondary ?? ""}`.replace(/\s+/g, " ").trim();
}

function toPersonalAuthIdentity(record: PersonalIdentityRecord): PersonalAuthIdentity {
  return {
    ci: record.ci,
    tipo: record.tipo,
    rangoId: record.rangoId,
    rango: {
      rangoId: record.rango.rangoId,
      tipo: record.rango.tipo,
      abreviacion: record.rango.abreviacion,
      nombreCompleto: record.rango.nombreCompleto,
      orden: record.rango.orden,
    },
    gradoAbreviacion: record.rango.abreviacion,
    gradoNombre: record.rango.nombreCompleto,
    nombre: joinName(record.nombre1, record.nombre2),
    apellido: joinName(record.apellido1, record.apellido2),
    telefonoContacto: record.telefonoContacto,
    mailReferencia: null,
    bateriaNombre: record.subalterno?.bateria?.nombre ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toPersonalAdminUser(identity: PersonalAuthIdentity, credential: PersonalCredentialRow | null): PersonalAdminUser {
  return {
    usuarioId: toPersonalUsuarioId(identity.ci),
    rangoId: identity.rangoId,
    rango: identity.rango,
    grado: identity.gradoAbreviacion,
    nombre: identity.nombre,
    apellido: identity.apellido,
    username: identity.ci,
    mailReferencia: credential?.mailReferencia ?? null,
    mailVerificadaAt: null,
    rol: "READ_ONLY",
    activo: credential?.activo ?? true,
    createdAt: formatDateTimeForDisplay(credential?.createdAt ?? identity.createdAt),
    updatedAt: formatDateTimeForDisplay(credential?.updatedAt ?? identity.updatedAt),
    accountType: "PERSONAL",
    personalCi: identity.ci,
  };
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

async function fetchPersonalIdentity(ci: string) {
  const personal = await prisma.personal.findUnique({
    where: { ci },
    select: PERSONAL_IDENTITY_SELECT,
  });

  if (!personal) return null;
  return toPersonalAuthIdentity(personal);
}

async function fetchCredentialByCi(ci: string) {
  const rows = await prisma.$queryRaw<PersonalCredentialRow[]>(Prisma.sql`
    SELECT
      pa."ci",
      pa."password_hash" AS "passwordHash",
      pa."mail_referencia" AS "mailReferencia",
      pa."activo",
      pa."created_at" AS "createdAt",
      pa."updated_at" AS "updatedAt"
    FROM "personal_auth" pa
    WHERE pa."ci" = ${ci}
    LIMIT 1
  `);

  return rows[0] ?? null;
}

async function fetchCredentialMap(cis: string[]) {
  if (cis.length === 0) return new Map<string, PersonalCredentialRow>();

  const rows = await prisma.$queryRaw<PersonalCredentialRow[]>(Prisma.sql`
    SELECT
      pa."ci",
      pa."password_hash" AS "passwordHash",
      pa."mail_referencia" AS "mailReferencia",
      pa."activo",
      pa."created_at" AS "createdAt",
      pa."updated_at" AS "updatedAt"
    FROM "personal_auth" pa
    WHERE pa."ci" IN (${Prisma.join(cis)})
  `);

  return new Map(rows.map((row) => [row.ci, row]));
}

async function upsertCredential(ci: string, passwordHash: string, activo: boolean) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "personal_auth" ("ci", "password_hash", "activo", "created_at", "updated_at")
    VALUES (${ci}, ${passwordHash}, ${activo}, now(), now())
    ON CONFLICT ("ci")
    DO UPDATE SET
      "password_hash" = EXCLUDED."password_hash",
      "activo" = EXCLUDED."activo",
      "updated_at" = now()
  `);
}

async function updateCredentialActiveOnly(ci: string, activo: boolean) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "personal_auth"
    SET "activo" = ${activo}, "updated_at" = now()
    WHERE "ci" = ${ci}
  `);
}

async function updateCredentialMail(ci: string, mailReferencia: string | null) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "personal_auth"
    SET "mail_referencia" = ${mailReferencia}, "updated_at" = now()
    WHERE "ci" = ${ci}
  `);
}

export function toPersonalUsuarioId(ci: string) {
  return `${PERSONAL_USER_ID_PREFIX}${normalizeCi(ci)}`;
}

export function parsePersonalUsuarioId(usuarioId: string) {
  if (!usuarioId.startsWith(PERSONAL_USER_ID_PREFIX)) return null;
  const normalizedCi = normalizeCiOrNull(usuarioId.slice(PERSONAL_USER_ID_PREFIX.length));
  return normalizedCi;
}

export async function ensurePersonalAuthCompatibility() {
  if (ensurePersonalAuthPromise) return ensurePersonalAuthPromise;

  ensurePersonalAuthPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "personal_auth" (
        "ci" TEXT PRIMARY KEY REFERENCES "personal"("ci") ON DELETE CASCADE,
        "password_hash" TEXT NOT NULL,
        "mail_referencia" TEXT,
        "activo" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
      );
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "personal_auth"
      ADD COLUMN IF NOT EXISTS "mail_referencia" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "personal_auth_activo_idx"
      ON "personal_auth" ("activo");
    `);
  })().catch((error) => {
    ensurePersonalAuthPromise = null;
    throw error;
  });

  return ensurePersonalAuthPromise;
}

export async function verifyOrProvisionPersonalCredentials(ci: string, password: string) {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const identity = await fetchPersonalIdentity(normalizedCi);
  if (!identity) return null;

  let credential = await fetchCredentialByCi(normalizedCi);

  if (credential && !credential.activo) {
    return null;
  }

  if (!credential) {
    if (password !== normalizedCi) return null;
    const defaultHash = await hashPassword(normalizedCi);
    await upsertCredential(normalizedCi, defaultHash, true);
    credential = await fetchCredentialByCi(normalizedCi);
  }

  if (!credential || !credential.activo) return null;

  const validPassword = await bcrypt.compare(password, credential.passwordHash);
  if (!validPassword) return null;

  return {
    identity: {
      ...identity,
      mailReferencia: credential.mailReferencia ?? null,
    },
  };
}

export async function getPersonalSessionIdentity(ci: string) {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const [identity, credential] = await Promise.all([
    fetchPersonalIdentity(normalizedCi),
    fetchCredentialByCi(normalizedCi),
  ]);

  if (!identity || !credential || !credential.activo) return null;
  return {
    ...identity,
    mailReferencia: credential.mailReferencia ?? null,
  };
}

export async function changePersonalPassword(
  ci: string,
  currentPassword: string,
  newPassword: string,
): Promise<PersonalPasswordChangeResult> {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return { ok: false, reason: "INVALID_CI" };

  const identity = await fetchPersonalIdentity(normalizedCi);
  if (!identity) return { ok: false, reason: "NOT_FOUND" };

  const credential = await fetchCredentialByCi(normalizedCi);

  if (!credential) {
    if (currentPassword !== normalizedCi) {
      return { ok: false, reason: "INVALID_CURRENT_PASSWORD" };
    }

    const nextHash = await hashPassword(newPassword);
    await upsertCredential(normalizedCi, nextHash, true);
    return { ok: true, ci: normalizedCi };
  }

  const validCurrentPassword = await bcrypt.compare(currentPassword, credential.passwordHash);
  if (!validCurrentPassword) {
    return { ok: false, reason: "INVALID_CURRENT_PASSWORD" };
  }

  const nextHash = await hashPassword(newPassword);
  await upsertCredential(normalizedCi, nextHash, credential.activo);
  return { ok: true, ci: normalizedCi };
}

export async function adminSetPersonalPassword(ci: string, newPassword: string) {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const [identity, currentCredential] = await Promise.all([
    fetchPersonalIdentity(normalizedCi),
    fetchCredentialByCi(normalizedCi),
  ]);
  if (!identity) return null;

  const nextHash = await hashPassword(newPassword);
  await upsertCredential(normalizedCi, nextHash, currentCredential?.activo ?? true);
  return getPersonalAdminUserByCi(normalizedCi);
}

export async function updatePersonalAccountActive(ci: string, activo: boolean) {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const [identity, currentCredential] = await Promise.all([
    fetchPersonalIdentity(normalizedCi),
    fetchCredentialByCi(normalizedCi),
  ]);
  if (!identity) return null;

  if (!currentCredential) {
    const defaultHash = await hashPassword(normalizedCi);
    await upsertCredential(normalizedCi, defaultHash, activo);
  } else {
    await updateCredentialActiveOnly(normalizedCi, activo);
  }

  return getPersonalAdminUserByCi(normalizedCi);
}

export async function getPersonalAdminUserByCi(ci: string) {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const [identity, credential] = await Promise.all([
    fetchPersonalIdentity(normalizedCi),
    fetchCredentialByCi(normalizedCi),
  ]);

  if (!identity) return null;
  return toPersonalAdminUser(identity, credential);
}

export async function listPersonalAdminUsers() {
  await ensurePersonalAuthCompatibility();

  const personal = await prisma.personal.findMany({
    select: PERSONAL_IDENTITY_SELECT,
    orderBy: [{ apellido1: "asc" }, { apellido2: "asc" }, { nombre1: "asc" }, { nombre2: "asc" }],
  });
  const normalized = personal.map(toPersonalAuthIdentity);

  const credentialByCi = await fetchCredentialMap(normalized.map((entry) => entry.ci));
  return normalized.map((identity) => toPersonalAdminUser(identity, credentialByCi.get(identity.ci) ?? null));
}

export async function getPersonalSelfContact(ci: string): Promise<PersonalSelfContact | null> {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const [identity, credential] = await Promise.all([
    fetchPersonalIdentity(normalizedCi),
    fetchCredentialByCi(normalizedCi),
  ]);
  if (!identity) return null;

  return {
    ci: normalizedCi,
    telefonoContacto: identity.telefonoContacto,
    mailReferencia: credential?.mailReferencia ?? null,
  };
}

export async function updatePersonalSelfContact(
  ci: string,
  updates: PersonalContactUpdate,
): Promise<PersonalSelfContact | null> {
  await ensurePersonalAuthCompatibility();

  const normalizedCi = normalizeCiOrNull(ci);
  if (!normalizedCi) return null;

  const identity = await fetchPersonalIdentity(normalizedCi);
  if (!identity) return null;

  if (updates.telefonoContacto !== undefined) {
    await prisma.personal.update({
      where: { ci: normalizedCi },
      data: { telefonoContacto: updates.telefonoContacto },
    });
  }

  if (updates.mailReferencia !== undefined) {
    const credential = await fetchCredentialByCi(normalizedCi);
    if (!credential) {
      const defaultHash = await hashPassword(normalizedCi);
      await upsertCredential(normalizedCi, defaultHash, true);
    }
    await updateCredentialMail(normalizedCi, updates.mailReferencia);
  }

  return getPersonalSelfContact(normalizedCi);
}
