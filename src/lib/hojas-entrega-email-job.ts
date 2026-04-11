export type HojasEntregaEmailJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export type HojasEntregaEmailJobStep =
  | "queued"
  | "loading-data"
  | "rendering-pdf"
  | "preparing-email"
  | "sending-email"
  | "completed"
  | "failed"
  | "cancelled";

export type HojasEntregaEmailJobMetrics = {
  loadingMs: number | null;
  renderingMs: number | null;
  sendingMs: number | null;
  totalMs: number | null;
};

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
  metrics?: HojasEntregaEmailJobMetrics | null;
  createdAt: string;
  updatedAt: string;
};
