import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL no esta definido.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const candidate = client as PrismaClient & {
    stockOperacion?: unknown;
    stockOperacionItem?: unknown;
    subalterno?: unknown;
    oficial?: unknown;
    suboficial?: unknown;
    movimiento?: unknown;
    movimientoItem?: unknown;
    prestamoActivo?: unknown;
    prestamoHistorial?: unknown;
  };
  return (
    typeof candidate.stockOperacion !== "undefined" &&
    typeof candidate.stockOperacionItem !== "undefined" &&
    typeof candidate.subalterno !== "undefined" &&
    typeof candidate.oficial !== "undefined" &&
    typeof candidate.suboficial !== "undefined" &&
    typeof candidate.movimiento !== "undefined" &&
    typeof candidate.movimientoItem !== "undefined" &&
    typeof candidate.prestamoActivo !== "undefined" &&
    typeof candidate.prestamoHistorial !== "undefined"
  );
}

export const prisma =
  hasCurrentDelegates(globalForPrisma.prisma) ? globalForPrisma.prisma! : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
