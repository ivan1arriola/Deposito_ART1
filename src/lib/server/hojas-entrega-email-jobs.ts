import "server-only";

import { randomUUID } from "node:crypto";
import type {
  HojasEntregaEmailJobSnapshot,
  HojasEntregaEmailJobStatus,
  HojasEntregaEmailJobStep,
} from "@/lib/hojas-entrega-email-job";

type HojasEntregaEmailJobRecord = HojasEntregaEmailJobSnapshot & {
  userId: string;
};

type HojasEntregaEmailJobUpdate = Partial<
  Pick<HojasEntregaEmailJobRecord, "status" | "step" | "progress" | "message" | "to" | "fileName" | "hojas" | "error">
>;

const ACTIVE_JOB_TTL_MS = 30 * 60 * 1000;
const FINISHED_JOB_TTL_MS = 24 * 60 * 60 * 1000;

function getStore() {
  const globalStore = globalThis as typeof globalThis & {
    __hojasEntregaEmailJobs?: Map<string, HojasEntregaEmailJobRecord>;
  };

  if (!globalStore.__hojasEntregaEmailJobs) {
    globalStore.__hojasEntregaEmailJobs = new Map<string, HojasEntregaEmailJobRecord>();
  }

  return globalStore.__hojasEntregaEmailJobs;
}

function isFinished(status: HojasEntregaEmailJobStatus) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function cleanupExpiredJobs(store = getStore()) {
  const now = Date.now();
  for (const [jobId, job] of store.entries()) {
    const updatedAtMs = new Date(job.updatedAt).getTime();
    const ttlMs = isFinished(job.status) ? FINISHED_JOB_TTL_MS : ACTIVE_JOB_TTL_MS;
    if (!Number.isFinite(updatedAtMs) || now - updatedAtMs > ttlMs) {
      store.delete(jobId);
    }
  }
}

function toSnapshot(job: HojasEntregaEmailJobRecord): HojasEntregaEmailJobSnapshot {
  return {
    jobId: job.jobId,
    status: job.status,
    step: job.step,
    progress: job.progress,
    message: job.message,
    to: job.to,
    fileName: job.fileName,
    hojas: job.hojas,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export function findActiveHojasEntregaEmailJob(userId: string): HojasEntregaEmailJobSnapshot | null {
  const store = getStore();
  cleanupExpiredJobs(store);

  for (const job of store.values()) {
    if (job.userId === userId && !isFinished(job.status)) {
      return toSnapshot(job);
    }
  }

  return null;
}

export function createHojasEntregaEmailJob(input: {
  userId: string;
  to: string | null;
  message: string;
}): HojasEntregaEmailJobSnapshot {
  const store = getStore();
  cleanupExpiredJobs(store);

  const now = new Date().toISOString();
  const job: HojasEntregaEmailJobRecord = {
    jobId: randomUUID(),
    userId: input.userId,
    status: "queued",
    step: "queued",
    progress: 5,
    message: input.message,
    to: input.to,
    fileName: null,
    hojas: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };

  store.set(job.jobId, job);
  return toSnapshot(job);
}

export function getHojasEntregaEmailJob(jobId: string, userId: string): HojasEntregaEmailJobSnapshot | null {
  const store = getStore();
  cleanupExpiredJobs(store);

  const job = store.get(jobId);
  if (!job || job.userId !== userId) return null;
  return toSnapshot(job);
}

export function updateHojasEntregaEmailJob(jobId: string, patch: HojasEntregaEmailJobUpdate): HojasEntregaEmailJobSnapshot | null {
  const store = getStore();
  cleanupExpiredJobs(store);

  const job = store.get(jobId);
  if (!job) return null;
  if (job.status === "cancelled" && patch.status !== "cancelled") {
    return toSnapshot(job);
  }

  const next: HojasEntregaEmailJobRecord = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.set(jobId, next);
  return toSnapshot(next);
}

export function completeHojasEntregaEmailJob(
  jobId: string,
  patch: Omit<HojasEntregaEmailJobUpdate, "status" | "step" | "progress" | "error"> & { message: string },
): HojasEntregaEmailJobSnapshot | null {
  return updateHojasEntregaEmailJob(jobId, {
    ...patch,
    status: "completed",
    step: "completed",
    progress: 100,
    error: null,
  });
}

export function failHojasEntregaEmailJob(jobId: string, message: string): HojasEntregaEmailJobSnapshot | null {
  return updateHojasEntregaEmailJob(jobId, {
    status: "failed",
    step: "failed",
    progress: 100,
    message,
    error: message,
  });
}

export function setHojasEntregaEmailJobProgress(
  jobId: string,
  input: {
    step: HojasEntregaEmailJobStep;
    progress: number;
    message: string;
    to?: string | null;
    fileName?: string | null;
    hojas?: number | null;
  },
): HojasEntregaEmailJobSnapshot | null {
  return updateHojasEntregaEmailJob(jobId, {
    status: "running",
    step: input.step,
    progress: input.progress,
    message: input.message,
    to: input.to,
    fileName: input.fileName,
    hojas: input.hojas,
    error: null,
  });
}

export function cancelHojasEntregaEmailJob(
  jobId: string,
  userId: string,
  message = "Envio cancelado por el usuario.",
): HojasEntregaEmailJobSnapshot | null {
  const store = getStore();
  cleanupExpiredJobs(store);

  const job = store.get(jobId);
  if (!job || job.userId !== userId) return null;
  if (isFinished(job.status)) return toSnapshot(job);

  const next: HojasEntregaEmailJobRecord = {
    ...job,
    status: "cancelled",
    step: "cancelled",
    progress: 100,
    message,
    error: null,
    updatedAt: new Date().toISOString(),
  };

  store.set(jobId, next);
  return toSnapshot(next);
}

export function isHojasEntregaEmailJobCancelled(jobId: string): boolean {
  const store = getStore();
  cleanupExpiredJobs(store);

  const job = store.get(jobId);
  return job?.status === "cancelled";
}
