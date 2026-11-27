import { prisma } from "@/lib/prisma";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";

export type FirmaConfig = {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
  updatedAt: string | null;
};

export const DEFAULT_FIRMA_CONFIG: FirmaConfig = {
  encargadoRango: "Sgto.",
  encargadoNombre: "Wilson Lara",
  oficialRango: "Tte.2º",
  oficialNombre: "Gerardo Otero",
  updatedAt: null,
};

export const TEXTO_ENCARGADO =
  'El Encargado del Depósito General del Grp. "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1.';
export const TEXTO_OFICIAL =
  'El Oficial de Administración del Grp. "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1.';

export async function getFirmaConfig(): Promise<FirmaConfig> {
  const config = await prisma.configFirma.findUnique({
    where: { id: 1 },
  });

  if (!config) {
    // Si no existe, lo creamos con los valores por defecto.
    const created = await prisma.configFirma.create({
      data: {
        id: 1,
        encargadoRango: DEFAULT_FIRMA_CONFIG.encargadoRango,
        encargadoNombre: DEFAULT_FIRMA_CONFIG.encargadoNombre,
        oficialRango: DEFAULT_FIRMA_CONFIG.oficialRango,
        oficialNombre: DEFAULT_FIRMA_CONFIG.oficialNombre,
      },
    });
    return {
      encargadoRango: created.encargadoRango,
      encargadoNombre: created.encargadoNombre,
      oficialRango: created.oficialRango,
      oficialNombre: created.oficialNombre,
      updatedAt: formatDateTimeForDisplay(created.updatedAt),
    };
  }

  return {
    encargadoRango: config.encargadoRango,
    encargadoNombre: config.encargadoNombre,
    oficialRango: config.oficialRango,
    oficialNombre: config.oficialNombre,
    updatedAt: formatDateTimeForDisplay(config.updatedAt),
  };
}

export async function updateFirmaConfig(input: {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
}): Promise<FirmaConfig> {
  const updated = await prisma.configFirma.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...input,
    },
    update: {
      ...input,
    },
  });

  return {
    encargadoRango: updated.encargadoRango,
    encargadoNombre: updated.encargadoNombre,
    oficialRango: updated.oficialRango,
    oficialNombre: updated.oficialNombre,
    updatedAt: formatDateTimeForDisplay(updated.updatedAt),
  };
}
