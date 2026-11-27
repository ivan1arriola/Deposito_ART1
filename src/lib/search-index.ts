import { normalizeSearchText } from "@/lib/spanish-text";

export type SearchIndexEntry<T> = {
  value: T;
  normalizedText: string;
  digitsText: string;
};

type BuildSearchIndexOptions<T> = {
  text: (value: T) => string;
  digits?: (value: T) => string;
};

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function buildSearchIndex<T>(
  values: T[],
  options: BuildSearchIndexOptions<T>
): SearchIndexEntry<T>[] {
  return values.map((value) => ({
    value,
    normalizedText: normalizeSearchText(options.text(value)),
    digitsText: normalizeDigits(options.digits ? options.digits(value) : ""),
  }));
}

export function filterSearchIndex<T>(index: SearchIndexEntry<T>[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  const queryDigits = normalizeDigits(query);

  if (normalizedQuery === "" && queryDigits === "") {
    return index.map((entry) => entry.value);
  }

  return index
    .filter((entry) => {
      const matchesText = normalizedQuery !== "" && entry.normalizedText.includes(normalizedQuery);
      const matchesDigits = queryDigits !== "" && entry.digitsText.includes(queryDigits);
      return matchesText || matchesDigits;
    })
    .map((entry) => entry.value);
}
