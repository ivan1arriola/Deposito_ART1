import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePgConnectionStringSecurity } from "@/lib/postgres-connection";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

type PrismaClientRuntimeShape = PrismaClient & {
  _runtimeDataModel?: {
    models?: Record<string, { fields?: Array<{ name?: string }> }>;
  };
};

function createPrismaClient() {
  const rawConnectionString = process.env.DATABASE_URL;
  if (!rawConnectionString) {
    throw new Error("DATABASE_URL no esta definido.");
  }

  const connectionString = normalizePgConnectionStringSecurity(rawConnectionString);
  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function hasModelField(client: PrismaClient | undefined, modelName: string, fieldName: string) {
  if (!client) return false;
  const runtimeClient = client as PrismaClientRuntimeShape;
  const fields = runtimeClient._runtimeDataModel?.models?.[modelName]?.fields;
  return Array.isArray(fields) && fields.some((field) => field?.name === fieldName);
}

function hasCurrentDelegates(client: PrismaClient | undefined) {
  if (!client) return false;
  const candidate = client as PrismaClient & {
    articuloStockMovimiento?: unknown;
    articuloEntregaPersonal?: unknown;
    stockOperacion?: unknown;
    stockOperacionItem?: unknown;
    subalterno?: unknown;
    oficial?: unknown;
    suboficial?: unknown;
    movimiento?: unknown;
    movimientoItem?: unknown;
    prestamoActivo?: unknown;
    prestamoHistorial?: unknown;
    configFirma?: unknown;
  };
  return (
    typeof candidate.articuloStockMovimiento !== "undefined" &&
    typeof candidate.articuloEntregaPersonal !== "undefined" &&
    typeof candidate.stockOperacion !== "undefined" &&
    typeof candidate.stockOperacionItem !== "undefined" &&
    typeof candidate.subalterno !== "undefined" &&
    typeof candidate.oficial !== "undefined" &&
    typeof candidate.suboficial !== "undefined" &&
    typeof candidate.movimiento !== "undefined" &&
    typeof candidate.movimientoItem !== "undefined" &&
    typeof candidate.prestamoActivo !== "undefined" &&
    typeof candidate.prestamoHistorial !== "undefined" &&
    typeof candidate.configFirma !== "undefined" &&
    hasModelField(client, "ArticuloStockMovimiento", "cantidad") &&
    hasModelField(client, "ArticuloStockMovimiento", "tipo") &&
    hasModelField(client, "ArticuloEntregaPersonal", "ordenanteCi")
  );
}

if (globalForPrisma.prisma && !hasCurrentDelegates(globalForPrisma.prisma)) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
