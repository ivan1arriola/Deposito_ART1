import "server-only";

import { randomUUID } from "node:crypto";
import type {
  HojasEntregaEmailJobMetrics,
  HojasEntregaEmailJobSnapshot,
  HojasEntregaEmailJobStatus,
  HojasEntregaEmailJobStep,
} from "@/lib/hojas-entrega-email-job";
import { prisma } from "@/lib/prisma";

type HojasEntregaEmailJobRecord = HojasEntregaEmailJobSnapshot & {
  userId: string;
};

type HojasEntregaEmailJobUpdate = Partial<
  Pick<
    HojasEntregaEmailJobRecord,
    "status" | "step" | "progress" | "message" | "to" | "fileName" | "hojas" | "error" | "metrics"
  >
>;

type HojasEntregaEmailJobRow = {
  job_id: string;
  user_id: string;
  status: string;
  step: string;
  progress: number;
  message: string;
  to_email: string | null;
  file_name: string | null;
  hojas: number | null;
  error: string | null;
  metrics_json: unknown | null;
  created_at: Date;
  updated_at: Date;
};

const VALID_JOB_STATUSES: readonly HojasEntregaEmailJobStatus[] = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
];
const VALID_JOB_STEPS: readonly HojasEntregaEmailJobStep[] = [
  "queued",
  "loading-data",
  "rendering-pdf",
  "preparing-email",
  "sending-email",
  "completed",
  "failed",
  "cancelled",
];

const JOBS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS hojas_entrega_email_job (
  job_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES usuario(usuario_id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  step TEXT NOT NULL,
  progress INTEGER NOT NULL,
  message TEXT NOT NULL,
  to_email TEXT NULL,
  file_name TEXT NULL,
  hojas INTEGER NULL,
  error TEXT NULL,
  metrics_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const JOBS_TABLE_ALTER_DDL = [
  "ALTER TABLE hojas_entrega_email_job ADD COLUMN IF NOT EXISTS metrics_json JSONB NULL;",
];

const JOBS_TABLE_INDEXES_DDL = [
  "CREATE INDEX IF NOT EXISTS idx_hojas_entrega_email_job_user_updated ON hojas_entrega_email_job(user_id, updated_at DESC);",
  "CREATE INDEX IF NOT EXISTS idx_hojas_entrega_email_job_status_updated ON hojas_entrega_email_job(status, updated_at DESC);",
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_hojas_entrega_email_job_user_active ON hojas_entrega_email_job(user_id) WHERE status IN ('queued', 'running');",
];

const JOBS_TABLE_CLEANUP_SQL = `
DELETE FROM hojas_entrega_email_job
WHERE
  (status IN ('completed', 'failed', 'cancelled') AND updated_at < NOW() - INTERVAL '24 hours')
  OR
  (status NOT IN ('completed', 'failed', 'cancelled') AND updated_at < NOW() - INTERVAL '30 minutes');
`;
const CLEANUP_MIN_INTERVAL_MS = 60_000;

function parseStatus(value: string): HojasEntregaEmailJobStatus {
  if (VALID_JOB_STATUSES.includes(value as HojasEntregaEmailJobStatus)) {
    return value as HojasEntregaEmailJobStatus;
  }
  return "failed";
}

function parseStep(value: string): HojasEntregaEmailJobStep {
  if (VALID_JOB_STEPS.includes(value as HojasEntregaEmailJobStep)) {
    return value as HojasEntregaEmailJobStep;
  }
  return "failed";
}

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

function normalizeMetricValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  return Math.round(value);
}

function normalizeMetrics(value: unknown): HojasEntregaEmailJobMetrics | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<HojasEntregaEmailJobMetrics>;
  return {
    loadingMs: normalizeMetricValue(candidate.loadingMs),
    renderingMs: normalizeMetricValue(candidate.renderingMs),
    sendingMs: normalizeMetricValue(candidate.sendingMs),
    totalMs: normalizeMetricValue(candidate.totalMs),
  };
}

function parseMetricsJson(value: unknown): HojasEntregaEmailJobMetrics | null {
  if (typeof value === "string") {
    try {
      return normalizeMetrics(JSON.parse(value));
    } catch {
      return null;
    }
  }
  return normalizeMetrics(value);
}

async function ensureStoreReady() {
  const globalStore = globalThis as typeof globalThis & {
    __hojasEntregaEmailJobsStoreReady?: Promise<void>;
  };

  if (!globalStore.__hojasEntregaEmailJobsStoreReady) {
    globalStore.__hojasEntregaEmailJobsStoreReady = (async () => {
      await prisma.$executeRawUnsafe(JOBS_TABLE_DDL);
      for (const statement of JOBS_TABLE_ALTER_DDL) {
        await prisma.$executeRawUnsafe(statement);
      }
      for (const statement of JOBS_TABLE_INDEXES_DDL) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      globalStore.__hojasEntregaEmailJobsStoreReady = undefined;
      throw error;
    });
  }

  await globalStore.__hojasEntregaEmailJobsStoreReady;
}

async function cleanupExpiredJobs() {
  await ensureStoreReady();

  const globalStore = globalThis as typeof globalThis & {
    __hojasEntregaEmailJobsLastCleanupAt?: number;
  };
  const now = Date.now();
  if (typeof globalStore.__hojasEntregaEmailJobsLastCleanupAt === "number") {
    const elapsed = now - globalStore.__hojasEntregaEmailJobsLastCleanupAt;
    if (elapsed >= 0 && elapsed < CLEANUP_MIN_INTERVAL_MS) {
      return;
    }
  }

  globalStore.__hojasEntregaEmailJobsLastCleanupAt = now;
  await prisma.$executeRawUnsafe(JOBS_TABLE_CLEANUP_SQL);
}

function isFinished(status: HojasEntregaEmailJobStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function toSnapshot(job: HojasEntregaEmailJobRow): HojasEntregaEmailJobSnapshot {
  return {
    jobId: job.job_id,
    status: parseStatus(job.status),
    step: parseStep(job.step),
    progress: job.progress,
    message: job.message,
    to: job.to_email,
    fileName: job.file_name,
    hojas: job.hojas,
    error: job.error,
    metrics: parseMetricsJson(job.metrics_json),
    createdAt: toIsoDate(job.created_at),
    updatedAt: toIsoDate(job.updated_at),
  };
}

async function getJobById(jobId: string): Promise<HojasEntregaEmailJobRow | null> {
  await ensureStoreReady();
  const rows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    SELECT
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
    FROM hojas_entrega_email_job
    WHERE job_id = ${jobId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findActiveHojasEntregaEmailJob(
  userId: string
): Promise<HojasEntregaEmailJobSnapshot | null> {
  await cleanupExpiredJobs();

  const rows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    SELECT
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
    FROM hojas_entrega_email_job
    WHERE user_id = ${userId}
      AND status NOT IN ('completed', 'failed', 'cancelled')
    ORDER BY updated_at DESC
    LIMIT 1
  `;

  return rows[0] ? toSnapshot(rows[0]) : null;
}

export async function createHojasEntregaEmailJob(input: {
  userId: string;
  to: string | null;
  message: string;
}): Promise<HojasEntregaEmailJobSnapshot> {
  await cleanupExpiredJobs();

  const jobId = randomUUID();
  const rows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    INSERT INTO hojas_entrega_email_job (
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
    )
    VALUES (
      ${jobId},
      ${input.userId},
      'queued',
      'queued',
      5,
      ${input.message},
      ${input.to},
      NULL,
      NULL,
      NULL,
      NULL,
      NOW(),
      NOW()
    )
    RETURNING
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
  `;

  const createdJob = rows[0];
  if (!createdJob) {
    throw new Error("No se pudo crear el seguimiento del envío.");
  }

  return toSnapshot(createdJob);
}

export async function getHojasEntregaEmailJob(
  jobId: string,
  userId: string
): Promise<HojasEntregaEmailJobSnapshot | null> {
  await cleanupExpiredJobs();

  const rows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    SELECT
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
    FROM hojas_entrega_email_job
    WHERE job_id = ${jobId}
      AND user_id = ${userId}
    LIMIT 1
  `;

  return rows[0] ? toSnapshot(rows[0]) : null;
}

export async function updateHojasEntregaEmailJob(
  jobId: string,
  patch: HojasEntregaEmailJobUpdate
): Promise<HojasEntregaEmailJobSnapshot | null> {
  await cleanupExpiredJobs();

  const currentJob = await getJobById(jobId);
  if (!currentJob) return null;

  if (parseStatus(currentJob.status) === "cancelled" && patch.status !== "cancelled") {
    return toSnapshot(currentJob);
  }

  const nextStatus = patch.status ?? parseStatus(currentJob.status);
  const nextStep = patch.step ?? parseStep(currentJob.step);
  const nextProgress = patch.progress ?? currentJob.progress;
  const nextMessage = patch.message ?? currentJob.message;
  const nextTo = patch.to !== undefined ? patch.to : currentJob.to_email;
  const nextFileName = patch.fileName !== undefined ? patch.fileName : currentJob.file_name;
  const nextHojas = patch.hojas !== undefined ? patch.hojas : currentJob.hojas;
  const nextError = patch.error !== undefined ? patch.error : currentJob.error;
  const nextMetrics =
    patch.metrics !== undefined
      ? normalizeMetrics(patch.metrics)
      : parseMetricsJson(currentJob.metrics_json);
  const nextMetricsJson = nextMetrics ? JSON.stringify(nextMetrics) : null;

  const rows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    UPDATE hojas_entrega_email_job
    SET
      status = ${nextStatus},
      step = ${nextStep},
      progress = ${nextProgress},
      message = ${nextMessage},
      to_email = ${nextTo},
      file_name = ${nextFileName},
      hojas = ${nextHojas},
      error = ${nextError},
      metrics_json = CASE
        WHEN ${nextMetricsJson} IS NULL THEN NULL
        ELSE CAST(${nextMetricsJson} AS jsonb)
      END,
      updated_at = NOW()
    WHERE job_id = ${jobId}
    RETURNING
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
  `;

  return rows[0] ? toSnapshot(rows[0]) : null;
}

export async function completeHojasEntregaEmailJob(
  jobId: string,
  patch: Omit<HojasEntregaEmailJobUpdate, "status" | "step" | "progress" | "error"> & {
    message: string;
  }
): Promise<HojasEntregaEmailJobSnapshot | null> {
  return await updateHojasEntregaEmailJob(jobId, {
    ...patch,
    status: "completed",
    step: "completed",
    progress: 100,
    error: null,
  });
}

export async function failHojasEntregaEmailJob(
  jobId: string,
  message: string,
  patch: Omit<HojasEntregaEmailJobUpdate, "status" | "step" | "progress" | "message" | "error"> = {}
): Promise<HojasEntregaEmailJobSnapshot | null> {
  return await updateHojasEntregaEmailJob(jobId, {
    ...patch,
    status: "failed",
    step: "failed",
    progress: 100,
    message,
    error: message,
  });
}

export async function setHojasEntregaEmailJobProgress(
  jobId: string,
  input: {
    step: HojasEntregaEmailJobStep;
    progress: number;
    message: string;
    to?: string | null;
    fileName?: string | null;
    hojas?: number | null;
    metrics?: HojasEntregaEmailJobMetrics | null;
  }
): Promise<HojasEntregaEmailJobSnapshot | null> {
  return await updateHojasEntregaEmailJob(jobId, {
    status: "running",
    step: input.step,
    progress: input.progress,
    message: input.message,
    to: input.to,
    fileName: input.fileName,
    hojas: input.hojas,
    metrics: input.metrics,
    error: null,
  });
}

export async function cancelHojasEntregaEmailJob(
  jobId: string,
  userId: string,
  message = "Envío cancelado por el usuario."
): Promise<HojasEntregaEmailJobSnapshot | null> {
  await cleanupExpiredJobs();

  const currentRows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    SELECT
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
    FROM hojas_entrega_email_job
    WHERE job_id = ${jobId}
      AND user_id = ${userId}
    LIMIT 1
  `;

  const currentJob = currentRows[0];
  if (!currentJob) return null;
  if (isFinished(parseStatus(currentJob.status))) return toSnapshot(currentJob);

  const updatedRows = await prisma.$queryRaw<HojasEntregaEmailJobRow[]>`
    UPDATE hojas_entrega_email_job
    SET
      status = 'cancelled',
      step = 'cancelled',
      progress = 100,
      message = ${message},
      error = NULL,
      updated_at = NOW()
    WHERE job_id = ${jobId}
      AND user_id = ${userId}
    RETURNING
      job_id,
      user_id,
      status,
      step,
      progress,
      message,
      to_email,
      file_name,
      hojas,
      error,
      metrics_json,
      created_at,
      updated_at
  `;

  return updatedRows[0] ? toSnapshot(updatedRows[0]) : null;
}

export async function isHojasEntregaEmailJobCancelled(jobId: string): Promise<boolean> {
  await cleanupExpiredJobs();

  const rows = await prisma.$queryRaw<Array<{ status: string }>>`
    SELECT status
    FROM hojas_entrega_email_job
    WHERE job_id = ${jobId}
    LIMIT 1
  `;
  if (!rows[0]) return false;
  return parseStatus(rows[0].status) === "cancelled";
}
