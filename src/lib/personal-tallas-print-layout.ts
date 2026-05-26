import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";

type TallaRow = Partial<Record<TallaKey, string>>;

const HEADER_PRIORITY = 1.18;
const MIN_COLUMN_WEIGHT = 5;

function normalizePrintableValue(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ");
  if (!normalized || normalized === "-") return "Sin dato";
  return normalized;
}

function measureWrappedText(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return 0;

  const longestWord = normalized.split(" ").reduce((max, word) => Math.max(max, word.length), 0);
  return Math.max(longestWord, Math.ceil(normalized.length * 0.62));
}

export function buildDynamicTallaColumnWidths(totalWidthPercent: number, rows: readonly TallaRow[]): Record<TallaKey, string> {
  const weights = TALLA_KEYS.map((key) => {
    const headerWeight = measureWrappedText(TALLA_LABELS[key]) * HEADER_PRIORITY;
    const contentWeight = rows.reduce((max, row) => {
      return Math.max(max, measureWrappedText(normalizePrintableValue(row[key])));
    }, 0);

    return Math.max(MIN_COLUMN_WEIGHT, headerWeight, contentWeight);
  });

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

  let assignedWidth = 0;

  return TALLA_KEYS.reduce(
    (acc, key, index) => {
      const rawWidth = (totalWidthPercent * weights[index]) / totalWeight;
      const width =
        index === TALLA_KEYS.length - 1
          ? Number((totalWidthPercent - assignedWidth).toFixed(2))
          : Number(rawWidth.toFixed(2));

      assignedWidth += width;
      acc[key] = `${width.toFixed(2)}%`;
      return acc;
    },
    {} as Record<TallaKey, string>,
  );
}
