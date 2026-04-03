export type HojasEntregaEmailJobStatus = "queued" | "running" | "completed" | "failed";

export type HojasEntregaEmailJobStep =
  | "queued"
  | "loading-data"
  | "rendering-pdf"
  | "preparing-email"
  | "sending-email"
  | "completed"
  | "failed";

export type HojasEntregaEmailJobSnapshot = {
  jobId: string;
  status: HojasEntregaEmailJobStatus;
  step: HojasEntregaEmailJobStep;
  progress: number;
  message: string;
  to: string | null;
  fileName: string | null;
  hojas: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};
