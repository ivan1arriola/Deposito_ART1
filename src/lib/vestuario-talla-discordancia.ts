import { TALLA_LABELS, TALLA_OPTIONS, type TallaKey, normalizeTallaValue } from "./tallas";
import { stripDiacritics } from "./spanish-text";

const VESTUARIO_KEYWORDS: Record<TallaKey, string[]> = {
  PARKA: ["PARKA"],
  CAMISACO: ["CAMISACO"],
  PANTALON: ["PANTALON"],
  KEPI: ["KEPI", "BIRRETE"],
  CALZADO: ["CALZADO", "BOTA", "BOTIN", "BORCEGUI"],
};

function normalizeText(value: string) {
  return stripDiacritics(value).toUpperCase();
}

function inferTallaKeyFromItemName(nombreItem: string): TallaKey | null {
  const normalizedName = normalizeText(nombreItem);

  for (const key of ["PARKA", "CAMISACO", "PANTALON", "KEPI", "CALZADO"] as const) {
    if (VESTUARIO_KEYWORDS[key].some((keyword) => normalizedName.includes(keyword))) {
      return key;
    }
  }

  return null;
}

function inferDeclaredTalla(nombreItem: string, key: TallaKey): string | null {
  const normalizedName = normalizeText(nombreItem);
  const tokens = normalizedName.split(/[^A-Z0-9]+/).filter(Boolean);
  const allowed = new Set(TALLA_OPTIONS[key]);

  for (const token of tokens) {
    if (allowed.has(token)) {
      return token;
    }
  }

  return null;
}

export type VestuarioTallaDiscordancia = {
  itemNombre: string;
  tallaKey: TallaKey;
  talleVestuario: string;
  tallePersonal: string | null;
};

export function findVestuarioTallaDiscordancias(
  personalTallas: Partial<Record<TallaKey, string>>,
  equipos: Array<{ nombre: string }>,
): VestuarioTallaDiscordancia[] {
  const discordancias: VestuarioTallaDiscordancia[] = [];

  for (const equipo of equipos) {
    const tallaKey = inferTallaKeyFromItemName(equipo.nombre);
    if (!tallaKey) continue;

    const talleVestuario = inferDeclaredTalla(equipo.nombre, tallaKey);
    if (!talleVestuario) continue;

    const tallePersonal = normalizeTallaValue(tallaKey, personalTallas[tallaKey] ?? null);
    if (tallePersonal === talleVestuario) continue;

    discordancias.push({
      itemNombre: equipo.nombre,
      tallaKey,
      talleVestuario,
      tallePersonal,
    });
  }

  return discordancias;
}

export function buildVestuarioTallaDiscordanciaMessage(
  movimientoIndex: number,
  discordancia: VestuarioTallaDiscordancia,
) {
  return `Movimiento #${movimientoIndex + 1}: discordancia de talle en "${discordancia.itemNombre}" (${TALLA_LABELS[discordancia.tallaKey]}). Vestuario: ${discordancia.talleVestuario}. Personal: ${discordancia.tallePersonal ?? "Sin dato"}.`;
}
