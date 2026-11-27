const URUGUAYAN_MOBILE_REGEX = /^09\d{7}$/;

export function normalizeUruguayanMobileNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");

  if (digits === "") return null;
  if (digits.length === 9 && digits.startsWith("09")) return digits;
  if (digits.length === 8 && digits.startsWith("9")) return `0${digits}`;
  if (digits.length === 11 && digits.startsWith("5989")) return `0${digits.slice(3)}`;
  if (digits.length === 12 && digits.startsWith("59809")) return digits.slice(3);

  return null;
}

export function normalizeOptionalUruguayanMobileNumber(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim() ?? "";
  if (trimmed === "") return null;
  return normalizeUruguayanMobileNumber(trimmed);
}

export function isValidUruguayanMobileNumber(value: string): boolean {
  const normalized = normalizeUruguayanMobileNumber(value);
  return normalized !== null && URUGUAYAN_MOBILE_REGEX.test(normalized);
}

export function formatUruguayanMobileNumber(value: string | null | undefined): string {
  const normalized = normalizeOptionalUruguayanMobileNumber(value);
  if (!normalized) return "";
  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
}
