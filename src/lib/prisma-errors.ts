type PrismaErrorWithCode = {
  code?: unknown;
  message?: unknown;
};

const UNAVAILABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
const UNAVAILABLE_MESSAGE_SNIPPETS = [
  "Can't reach database server",
  "Server has closed the connection",
  "Connection terminated unexpectedly",
];
const MISSING_COLUMN_PREFIX = "The column `";

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

export function isPrismaDatabaseUnavailable(error: unknown) {
  const code = getPrismaErrorCode(error);
  if (code && UNAVAILABLE_CODES.has(code)) return true;

  const message = extractErrorMessage(error);
  if (!message) return false;
  return UNAVAILABLE_MESSAGE_SNIPPETS.some((snippet) => message.includes(snippet));
}

export function hasPrismaMissingColumn(error: unknown, columnName: string) {
  const message = extractErrorMessage(error);
  if (!message) return false;
  return message.includes(`${MISSING_COLUMN_PREFIX}${columnName}\``) && message.includes("does not exist");
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RetryOptions = {
  attempts?: number;
  delayMs?: number;
};

export async function withPrismaReadRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}) {
  const attempts = Math.max(1, options.attempts ?? 2);
  const delayMs = Math.max(0, options.delayMs ?? 250);

  let attempt = 0;
  while (attempt < attempts) {
    try {
      return await operation();
    } catch (error) {
      attempt += 1;
      if (attempt >= attempts || !isPrismaDatabaseUnavailable(error)) {
        throw error;
      }
      await delay(delayMs);
    }
  }

  return operation();
}
