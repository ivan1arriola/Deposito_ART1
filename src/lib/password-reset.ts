import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeEmailAddress } from "@/lib/email-address";

export type MagicLinkPurpose = "PASSWORD_RESET" | "EMAIL_VERIFY";

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 20;
const DEFAULT_EMAIL_VERIFY_TTL_MINUTES = 24 * 60;

let ensureSchemaPromise: Promise<void> | null = null;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizePurpose(purpose: MagicLinkPurpose) {
  return purpose;
}

function tokenExpiryFromMinutes(ttlMinutes: number) {
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

export function generateMagicToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function ensureMagicLinkSchema() {
  if (ensureSchemaPromise) return ensureSchemaPromise;

  ensureSchemaPromise = (async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "mail_verificada_at" TIMESTAMPTZ(6);'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "password_reset" ADD COLUMN IF NOT EXISTS "token_type" TEXT NOT NULL DEFAULT \'PASSWORD_RESET\';'
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "password_reset" ADD COLUMN IF NOT EXISTS "mail_snapshot" TEXT;'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "password_reset_token_type_expires_at_idx" ON "password_reset"("token_type", "expires_at");'
    );
  })().catch((error) => {
    ensureSchemaPromise = null;
    throw error;
  });

  return ensureSchemaPromise;
}

export async function createMagicLinkToken(input: {
  usuarioId: string;
  purpose: MagicLinkPurpose;
  mailSnapshot?: string | null;
  ttlMinutes?: number;
}) {
  await ensureMagicLinkSchema();

  const ttlMinutes =
    input.ttlMinutes ??
    (input.purpose === "PASSWORD_RESET"
      ? DEFAULT_PASSWORD_RESET_TTL_MINUTES
      : DEFAULT_EMAIL_VERIFY_TTL_MINUTES);

  const token = generateMagicToken();
  const expiresAt = tokenExpiryFromMinutes(ttlMinutes);

  await prisma.passwordResetCode.create({
    data: {
      usuarioId: input.usuarioId,
      codeHash: hashToken(token),
      tokenType: normalizePurpose(input.purpose),
      mailSnapshot: input.mailSnapshot ? normalizeEmailAddress(input.mailSnapshot) : null,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function createPasswordResetToken(usuarioId: string, mailSnapshot?: string | null) {
  return createMagicLinkToken({
    usuarioId,
    purpose: "PASSWORD_RESET",
    mailSnapshot,
    ttlMinutes: DEFAULT_PASSWORD_RESET_TTL_MINUTES,
  });
}

export async function createEmailVerificationToken(usuarioId: string, mailSnapshot: string) {
  return createMagicLinkToken({
    usuarioId,
    purpose: "EMAIL_VERIFY",
    mailSnapshot,
    ttlMinutes: DEFAULT_EMAIL_VERIFY_TTL_MINUTES,
  });
}

export async function consumeMagicLinkToken(input: { token: string; purpose: MagicLinkPurpose }) {
  await ensureMagicLinkSchema();
  const tokenHash = hashToken(input.token.trim());
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetCode.findFirst({
      where: {
        codeHash: tokenHash,
        tokenType: normalizePurpose(input.purpose),
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
      select: {
        resetId: true,
        usuarioId: true,
        mailSnapshot: true,
        expiresAt: true,
      },
    });

    if (!record) return null;

    const updateResult = await tx.passwordResetCode.updateMany({
      where: {
        resetId: record.resetId,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return record;
  });
}

export async function ensurePasswordResetCompatibility() {
  await ensureMagicLinkSchema();
}
