import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { stripDiacritics } from "@/lib/spanish-text";

const globalForPrestamoActuante = globalThis as unknown as {
  ensurePrestamoActuantePromise?: Promise<void> | null;
};

function getEnsurePrestamoActuantePromise() {
  return globalForPrestamoActuante.ensurePrestamoActuantePromise ?? null;
}

function setEnsurePrestamoActuantePromise(value: Promise<void> | null) {
  globalForPrestamoActuante.ensurePrestamoActuantePromise = value;
}

type PrestamoActuanteRow = {
  movimientoId: string;
  actuanteCi: string;
  gradoAbreviacion: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
};

function normalizeRankText(value: string | null | undefined) {
  return stripDiacritics(String(value ?? ""))
    .replace(/[º°]/g, "")
    .replace(/[."']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fullName(apellido1: string, apellido2: string | null, nombre1: string, nombre2: string | null) {
  const apellidos = [apellido1, apellido2].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const nombres = [nombre1, nombre2].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  return `${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
}

export function isSargentoRank(abreviacion: string | null | undefined, nombreCompleto: string | null | undefined) {
  const normalized = normalizeRankText(`${abreviacion ?? ""} ${nombreCompleto ?? ""}`);
  return normalized.includes("sargento") || normalized.startsWith("sgto");
}

function formatActuanteLabel(row: PrestamoActuanteRow) {
  return `${row.gradoAbreviacion} ${fullName(row.apellido1, row.apellido2, row.nombre1, row.nombre2)}`
    .replace(/\s+/g, " ")
    .trim();
}

export async function ensurePrestamoActuanteCompatibility() {
  const currentPromise = getEnsurePrestamoActuantePromise();
  if (currentPromise) return currentPromise;

  const nextPromise = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "prestamo_actuante" (
        "movimiento_id" BIGINT PRIMARY KEY REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE,
        "personal_ci" TEXT NOT NULL REFERENCES "personal"("ci") ON DELETE RESTRICT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "prestamo_actuante_personal_ci_idx"
      ON "prestamo_actuante" ("personal_ci");
    `);
  })().catch((error) => {
    setEnsurePrestamoActuantePromise(null);
    throw error;
  });

  setEnsurePrestamoActuantePromise(nextPromise);
  return nextPromise;
}

export async function upsertPrestamoActuante(
  tx: Prisma.TransactionClient,
  movimientoId: bigint,
  actuanteCi: string | null,
) {
  if (!actuanteCi) {
    await tx.$executeRawUnsafe(
      `DELETE FROM "prestamo_actuante" WHERE "movimiento_id" = $1`,
      movimientoId,
    );
    return;
  }

  await tx.$executeRawUnsafe(
    `
      INSERT INTO "prestamo_actuante" ("movimiento_id", "personal_ci")
      VALUES ($1, $2)
      ON CONFLICT ("movimiento_id")
      DO UPDATE SET "personal_ci" = EXCLUDED."personal_ci"
    `,
    movimientoId,
    actuanteCi,
  );
}

export async function fetchPrestamoActuanteByMovimientoIds(movimientoIds: bigint[]) {
  await ensurePrestamoActuanteCompatibility();

  if (movimientoIds.length === 0) {
    return new Map<string, { ci: string; label: string }>();
  }

  const rows = await prisma.$queryRaw<PrestamoActuanteRow[]>(Prisma.sql`
    SELECT
      pa."movimiento_id"::text AS "movimientoId",
      pa."personal_ci" AS "actuanteCi",
      g."abreviacion" AS "gradoAbreviacion",
      p."apellido1" AS "apellido1",
      p."apellido2" AS "apellido2",
      p."nombre1" AS "nombre1",
      p."nombre2" AS "nombre2"
    FROM "prestamo_actuante" pa
    JOIN "personal" p ON p."ci" = pa."personal_ci"
    JOIN "grado" g ON g."grado_id" = p."grado_id"
    WHERE pa."movimiento_id" IN (${Prisma.join(movimientoIds)})
  `);

  const map = new Map<string, { ci: string; label: string }>();
  for (const row of rows) {
    map.set(row.movimientoId, {
      ci: row.actuanteCi,
      label: formatActuanteLabel(row),
    });
  }
  return map;
}
