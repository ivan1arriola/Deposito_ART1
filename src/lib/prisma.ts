import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const candidate = client as PrismaClient & {
    stockOperacion?: unknown;
    stockOperacionItem?: unknown;
  };
  return typeof candidate.stockOperacion !== "undefined" && typeof candidate.stockOperacionItem !== "undefined";
}

export const prisma =
  hasCurrentDelegates(globalForPrisma.prisma) ? globalForPrisma.prisma! : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
