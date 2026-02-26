import { prisma } from "@/lib/prisma";

export type FirmaConfig = {
  encargadoTexto: string;
  oficialTexto: string;
  updatedAt: string | null;
};

const DEFAULT_FIRMA_CONFIG: FirmaConfig = {
  encargadoTexto: 'El Encargado del Deposito General del Grp. "Brig. Gral. Manuel Oribe" de Artilleria 105mm No. 1.',
  oficialTexto: 'El Oficial de Administracion del Grp."Brig. "Gral. Manuel Oribe" de Artilleria 105mm No. 1.',
  updatedAt: null,
};

type FirmaRow = {
  encargado_texto: string;
  oficial_texto: string;
  updated_at: Date;
};

async function ensureFirmaConfigTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS config_firma (
      id SMALLINT PRIMARY KEY,
      encargado_texto TEXT NOT NULL,
      oficial_texto TEXT NOT NULL,
      updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRaw`
    INSERT INTO config_firma (id, encargado_texto, oficial_texto)
    VALUES (1, ${DEFAULT_FIRMA_CONFIG.encargadoTexto}, ${DEFAULT_FIRMA_CONFIG.oficialTexto})
    ON CONFLICT (id) DO NOTHING;
  `;
}

function fromRow(row: FirmaRow | undefined): FirmaConfig {
  if (!row) return { ...DEFAULT_FIRMA_CONFIG };
  return {
    encargadoTexto: row.encargado_texto,
    oficialTexto: row.oficial_texto,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getFirmaConfig(): Promise<FirmaConfig> {
  await ensureFirmaConfigTable();

  const rows = await prisma.$queryRaw<FirmaRow[]>`
    SELECT encargado_texto, oficial_texto, updated_at
    FROM config_firma
    WHERE id = 1
    LIMIT 1;
  `;

  return fromRow(rows[0]);
}

export async function updateFirmaConfig(input: { encargadoTexto: string; oficialTexto: string }): Promise<FirmaConfig> {
  await ensureFirmaConfigTable();

  const rows = await prisma.$queryRaw<FirmaRow[]>`
    UPDATE config_firma
    SET
      encargado_texto = ${input.encargadoTexto},
      oficial_texto = ${input.oficialTexto},
      updated_at = NOW()
    WHERE id = 1
    RETURNING encargado_texto, oficial_texto, updated_at;
  `;

  return fromRow(rows[0]);
}

