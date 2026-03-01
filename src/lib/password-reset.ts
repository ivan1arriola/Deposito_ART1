import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const RESET_CODE_TTL_MINUTES = 5;

function hashResetCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateResetCode() {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

export async function createResetCode(usuarioId: string) {
  const code = generateResetCode();
  const codeHash = hashResetCode(code);
  const expiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetCode.create({
    data: {
      usuarioId,
      codeHash,
      expiresAt,
    },
  });

  return { code, expiresAt };
}

export async function verifyResetCode(usuarioId: string, code: string) {
  const codeHash = hashResetCode(code);
  const now = new Date();

  const record = await prisma.passwordResetCode.findFirst({
    where: {
      usuarioId,
      codeHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  return record;
}

export async function markResetCodeUsed(resetId: string) {
  await prisma.passwordResetCode.update({
    where: { resetId },
    data: { usedAt: new Date() },
  });
}
