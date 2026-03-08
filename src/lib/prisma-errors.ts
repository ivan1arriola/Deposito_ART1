type PrismaErrorWithCode = {
  code?: unknown;
  message?: unknown;
};

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as PrismaErrorWithCode).message;
    if (typeof message === "string") return message;
  }
  return "";
}

export function getPrismaErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || !error || !("code" in error)) return null;
  const code = (error as PrismaErrorWithCode).code;
  return typeof code === "string" ? code : null;
}

export function hasConstraintName(error: unknown, constraintName: string) {
  const message = extractErrorMessage(error);
  if (!message) return false;
  return message.includes(`constraint "${constraintName}"`);
}

