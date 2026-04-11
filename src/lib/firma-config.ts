import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";

export type FirmaConfig = {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
  updatedAt: string | null;
};

const DEFAULT_FIRMA_CONFIG: FirmaConfig = {
  encargadoRango: "Sgto.",
  encargadoNombre: "Wilson Lara",
  oficialRango: "-Tte.2º",
  oficialNombre: "Gerardo Otero",
  updatedAt: null,
};

export const TEXTO_ENCARGADO = 'El Encargado del Depósito General del Grp. "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1.';
export const TEXTO_OFICIAL = 'El Oficial de Administración del Grp. "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1.';

type FirmaRow = {
  encargado_rango: string;
  encargado_nombre: string;
  oficial_rango: string;
  oficial_nombre: string;
  updated_at: Date;
};

let firmaConfigTableReadyPromise: Promise<void> | null = null;

async function ensureFirmaConfigTable() {
  if (!firmaConfigTableReadyPromise) {
    firmaConfigTableReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS config_firma (
          id SMALLINT PRIMARY KEY,
          encargado_rango TEXT NOT NULL,
          encargado_nombre TEXT NOT NULL,
          oficial_rango TEXT NOT NULL,
          oficial_nombre TEXT NOT NULL,
          updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
        );
      `);

      await prisma.$executeRaw`
        INSERT INTO config_firma (id, encargado_rango, encargado_nombre, oficial_rango, oficial_nombre)
        VALUES (1, ${DEFAULT_FIRMA_CONFIG.encargadoRango}, ${DEFAULT_FIRMA_CONFIG.encargadoNombre}, ${DEFAULT_FIRMA_CONFIG.oficialRango}, ${DEFAULT_FIRMA_CONFIG.oficialNombre})
        ON CONFLICT (id) DO NOTHING;
      `;
    })().catch((error) => {
      firmaConfigTableReadyPromise = null;
      throw error;
    });
  }

  await firmaConfigTableReadyPromise;
}

function fromRow(row: FirmaRow | undefined): FirmaConfig {
  if (!row) return { ...DEFAULT_FIRMA_CONFIG };
  return {
    encargadoRango: row.encargado_rango,
    encargadoNombre: row.encargado_nombre,
    oficialRango: row.oficial_rango,
    oficialNombre: row.oficial_nombre,
    updatedAt: formatDateTimeForDisplay(row.updated_at),
  };
}

function isMissingConfigFirmaTableError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== "P2010") {
    return false;
  }

  const metaCode = typeof error.meta?.code === "string" ? error.meta.code : "";
  const metaMessage = typeof error.meta?.message === "string" ? error.meta.message : "";
  return metaCode === "42P01" || metaMessage.toLowerCase().includes("config_firma");
}

async function queryFirmaConfigRows() {
  return prisma.$queryRaw<FirmaRow[]>`
    SELECT encargado_rango, encargado_nombre, oficial_rango, oficial_nombre, updated_at
    FROM config_firma
    WHERE id = 1
    LIMIT 1;
  `;
}

export async function getFirmaConfig(): Promise<FirmaConfig> {
  try {
    const rows = await queryFirmaConfigRows();
    if (rows[0]) {
      return fromRow(rows[0]);
    }
  } catch (error) {
    if (!isMissingConfigFirmaTableError(error)) {
      throw error;
    }
  }

  await ensureFirmaConfigTable();
  const rows = await queryFirmaConfigRows();
  return fromRow(rows[0]);
}

export async function updateFirmaConfig(input: {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
}): Promise<FirmaConfig> {
  await ensureFirmaConfigTable();

  const rows = await prisma.$queryRaw<FirmaRow[]>`
    UPDATE config_firma
    SET
      encargado_rango = ${input.encargadoRango},
      encargado_nombre = ${input.encargadoNombre},
      oficial_rango = ${input.oficialRango},
      oficial_nombre = ${input.oficialNombre},
      updated_at = NOW()
    WHERE id = 1
    RETURNING encargado_rango, encargado_nombre, oficial_rango, oficial_nombre, updated_at;
  `;

  return fromRow(rows[0]);
}
