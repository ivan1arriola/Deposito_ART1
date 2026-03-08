export const TALLA_KEYS = ["PARKA", "CAMISACO", "PANTALON", "KEPI", "CALZADO"] as const;
export type TallaKey = (typeof TALLA_KEYS)[number];

export const TALLA_LABELS: Record<TallaKey, string> = {
  PARKA: "Parka",
  CAMISACO: "Camisaco",
  PANTALON: "Pantalon",
  KEPI: "Kepi",
  CALZADO: "Calzado",
};

const ROPA_TALLES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"] as const;
const KEPI_TALLES = Array.from({ length: 10 }, (_, index) => String(54 + index));
const CALZADO_TALLES = Array.from({ length: 14 }, (_, index) => String(34 + index));

export const TALLA_OPTIONS: Record<TallaKey, readonly string[]> = {
  PARKA: ROPA_TALLES,
  CAMISACO: ROPA_TALLES,
  PANTALON: ROPA_TALLES,
  KEPI: KEPI_TALLES,
  CALZADO: CALZADO_TALLES,
};

export function normalizeTallaValue(key: TallaKey, value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (key === "PARKA" || key === "CAMISACO" || key === "PANTALON") {
    return trimmed.toUpperCase();
  }

  const numericValue = Number(trimmed);
  if (!Number.isInteger(numericValue)) return trimmed;
  return String(numericValue);
}

export function isAllowedTallaValue(key: TallaKey, value: string | null | undefined): boolean {
  const normalized = normalizeTallaValue(key, value);
  if (!normalized) return true;
  return TALLA_OPTIONS[key].includes(normalized);
}

function hasValidDynamicFormat(key: TallaKey, value: string) {
  if (key === "KEPI" || key === "CALZADO") {
    return /^\d{1,3}$/.test(value);
  }

  // Ropa: solo letras/numeros y separadores simples.
  return /^[A-Z0-9.\-\/ ]{1,20}$/.test(value);
}

function allowedValuesLabel(key: TallaKey) {
  if (key === "PARKA" || key === "CAMISACO" || key === "PANTALON") {
    return "XS, S, M, L, XL, XXL, XXXL";
  }
  if (key === "KEPI") {
    return "54 a 63";
  }
  return "34 a 47";
}

export function validateAndNormalizeTallas(values: Partial<Record<TallaKey, string>>) {
  const normalizedValues: Partial<Record<TallaKey, string>> = {};

  for (const key of TALLA_KEYS) {
    const normalized = normalizeTallaValue(key, values[key]);
    if (!normalized) continue;

    if (!hasValidDynamicFormat(key, normalized)) {
      return {
        ok: false as const,
        error: `Talla ${TALLA_LABELS[key]} invalida. Formato no permitido.`,
      };
    }
    if (!isAllowedTallaValue(key, normalized)) {
      return {
        ok: false as const,
        error: `Talla ${TALLA_LABELS[key]} invalida. Valores permitidos: ${allowedValuesLabel(key)}.`,
      };
    }

    normalizedValues[key] = normalized;
  }

  return {
    ok: true as const,
    values: normalizedValues,
  };
}
