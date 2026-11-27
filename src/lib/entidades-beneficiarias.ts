import { normalizeSearchText } from "@/lib/spanish-text";

export type EntidadBeneficiariaClase = "INTERNO" | "EXTERNO";

export type EntidadBeneficiariaItem = {
  entidadBeneficiariaId?: number;
  clase: EntidadBeneficiariaClase;
  nombre: string;
  activo: boolean;
  isDefaultSeed?: boolean;
};

export const DEFAULT_INTERNAL_BENEFICIARY_ENTITIES: readonly string[] = [
  "Batería Comando",
  "Batería A",
  "Batería B",
  "PAM",
  "Alojamiento de Señores Oficiales",
  "Guardia de Prevención",
  "Despacho de Capitán Batería A",
  "Despacho de Capitán Batería B",
  "Despacho de Capitán Batería Comando",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "Batería CIR",
  "Habilitación",
  "Perrera",
  "Administración",
  "Rancho",
  "Despacho Batería A",
  "Despacho de Batería B",
  "Despacho Batería Comando",
  "Casino de Señores Oficiales",
  "Enfermería",
  "Alojamiento Femenino",
  "Caballeriza",
  "Casino de Suboficiales",
  "Guarnición",
  "Taller",
  "Lavandería",
  "Carpintería",
  "Herrería",
  "Depósito de UTH",
];

export function normalizeEntidadBeneficiariaKey(nombre: string) {
  return normalizeSearchText(nombre).replace(/\s+/g, " ").trim();
}

export function parseEntidadBeneficiariaClase(value: unknown): EntidadBeneficiariaClase | null {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (raw === "INTERNO") return "INTERNO";
  if (raw === "EXTERNO") return "EXTERNO";
  return null;
}

export function extractEntidadLabelFromUnidadDestino(unidadDestino: string): {
  clase: EntidadBeneficiariaClase;
  nombre: string;
} | null {
  const trimmed = unidadDestino.trim();
  if (!trimmed || trimmed === "-") return null;
  if (trimmed.startsWith("Interno a la Unidad - ")) {
    const nombre = trimmed.replace("Interno a la Unidad - ", "").trim();
    return nombre ? { clase: "INTERNO", nombre } : null;
  }
  if (trimmed.startsWith("Externo a la Unidad - ")) {
    const nombre = trimmed.replace("Externo a la Unidad - ", "").trim();
    return nombre ? { clase: "EXTERNO", nombre } : null;
  }
  return { clase: "EXTERNO", nombre: trimmed };
}

export function sortEntidadesBeneficiariasEs<T extends { nombre: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}

export function mergeEntidadesBeneficiariasCatalog(
  dbEntidades: EntidadBeneficiariaItem[],
  historicalEntidades: Array<{ clase: EntidadBeneficiariaClase; nombre: string }>
): EntidadBeneficiariaItem[] {
  const byKey = new Map<string, EntidadBeneficiariaItem>();

  for (const item of dbEntidades) {
    const norm = normalizeEntidadBeneficiariaKey(item.nombre);
    if (!norm) continue;
    byKey.set(`${item.clase}:${norm}`, {
      ...item,
      nombre: item.nombre.trim(),
    });
  }

  for (const defaultName of DEFAULT_INTERNAL_BENEFICIARY_ENTITIES) {
    const norm = normalizeEntidadBeneficiariaKey(defaultName);
    const key = `INTERNO:${norm}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clase: "INTERNO",
        nombre: defaultName,
        activo: true,
        isDefaultSeed: true,
      });
    }
  }

  for (const hist of historicalEntidades) {
    const norm = normalizeEntidadBeneficiariaKey(hist.nombre);
    if (!norm) continue;
    const key = `${hist.clase}:${norm}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        clase: hist.clase,
        nombre: hist.nombre.trim(),
        activo: true,
        isDefaultSeed: false,
      });
    }
  }

  return sortEntidadesBeneficiariasEs(Array.from(byKey.values()));
}
