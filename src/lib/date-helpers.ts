/**
 * Utilidades de parseo y formato de fechas para todo el sistema.
 * El formato visible y de entrada es siempre DD/MM/AAAA.
 */

export type ParsedDateInput = {
  year: number;
  month: number;
  day: number;
  valid: boolean;
  complete: boolean;
  displayValue: string;
  isoValue: string | null;
  sortKey: string | null;
  date: Date | null;
};

type DateParts = {
  year: string;
  month: string;
  day: string;
};

function pad2(value: number | string) {
  return String(value).padStart(2, "0");
}

function isValidDateParts(year: number, month: number, day: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function buildParts(year: number, month: number, day: number): DateParts | null {
  if (!isValidDateParts(year, month, day)) return null;
  return {
    year: String(year),
    month: pad2(month),
    day: pad2(day),
  };
}

function formatParts(parts: DateParts) {
  return `${parts.day}/${parts.month}/${parts.year}`;
}

function formatIsoParts(parts: DateParts) {
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function buildUtcDate(parts: DateParts) {
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

function localDateParts(date: Date): DateParts {
  return {
    year: String(date.getFullYear()),
    month: pad2(date.getMonth() + 1),
    day: pad2(date.getDate()),
  };
}

function utcDateParts(date: Date): DateParts {
  return {
    year: String(date.getUTCFullYear()),
    month: pad2(date.getUTCMonth() + 1),
    day: pad2(date.getUTCDate()),
  };
}

export function normalizeDateInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function parseDateInput(value: string): ParsedDateInput {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      year: 0,
      month: 0,
      day: 0,
      valid: false,
      complete: false,
      displayValue: "",
      isoValue: null,
      sortKey: null,
      date: null,
    };
  }

  const normalizedInput = trimmed.includes("-") ? trimmed : normalizeDateInput(trimmed);
  const displayMatch = normalizedInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const isoMatch = normalizedInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  let year = 0;
  let month = 0;
  let day = 0;
  let complete = false;

  if (displayMatch) {
    day = Number(displayMatch[1]);
    month = Number(displayMatch[2]);
    year = Number(displayMatch[3]);
    complete = true;
  } else if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
    complete = true;
  }

  const parts = complete ? buildParts(year, month, day) : null;

  return {
    year,
    month,
    day,
    valid: parts !== null,
    complete,
    displayValue: parts
      ? formatParts(parts)
      : displayMatch
        ? normalizedInput
        : normalizeDateInput(trimmed),
    isoValue: parts ? formatIsoParts(parts) : null,
    sortKey: parts ? formatIsoParts(parts).replace(/-/g, "") : null,
    date: parts ? buildUtcDate(parts) : null,
  };
}

export function dateInputToDate(value: string) {
  return parseDateInput(value).date;
}

export function compareDateInputValues(left: string, right: string) {
  const leftParsed = parseDateInput(left);
  const rightParsed = parseDateInput(right);
  if (!leftParsed.valid || !rightParsed.valid || !leftParsed.sortKey || !rightParsed.sortKey)
    return null;
  return leftParsed.sortKey.localeCompare(rightParsed.sortKey);
}

export function isDateInputAfter(left: string, right: string) {
  const comparison = compareDateInputValues(left, right);
  return comparison !== null && comparison > 0;
}

export function isDateInputAfterToday(value: string, today = new Date()) {
  const parsed = parseDateInput(value);
  if (!parsed.valid || !parsed.sortKey) return false;
  const todayParts = localDateParts(today);
  const todayKey = formatIsoParts(todayParts).replace(/-/g, "");
  return parsed.sortKey > todayKey;
}

export function extractDateParts(value: string | Date | null | undefined): DateParts | null {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const displayMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (displayMatch) {
      return buildParts(Number(displayMatch[3]), Number(displayMatch[2]), Number(displayMatch[1]));
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (isoMatch) {
      return buildParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
    }
  }

  if (value instanceof Date) {
    return utcDateParts(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return utcDateParts(parsed);
}

export function formatDateOnlyFromDate(value: Date | null | undefined) {
  if (!value) return null;
  return formatParts(utcDateParts(value));
}

export function formatDateOnlyForDisplay(
  value: string | Date | null | undefined,
  fallback = ""
): string {
  const parts = extractDateParts(value);
  if (!parts) {
    return typeof value === "string" ? value.trim() || fallback : fallback;
  }
  return formatParts(parts);
}

export function formatDateTimeForDisplay(
  value: string | Date | null | undefined,
  fallback = ""
): string {
  if (!value) return fallback;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDateOnlyForDisplay(trimmed, fallback);
  }

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" ? value.trim() || fallback : fallback;
  }

  return formatParts(localDateParts(parsed));
}

export function getTodayDateInput(now = new Date()): string {
  return formatParts(localDateParts(now));
}

export function formatDateTimeExact(value: string | Date | null | undefined): string {
  if (!value) return "";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  const day = pad2(parsed.getDate());
  const month = pad2(parsed.getMonth() + 1);
  const year = parsed.getFullYear();
  const hours = pad2(parsed.getHours());
  const minutes = pad2(parsed.getMinutes());
  const seconds = pad2(parsed.getSeconds());
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}
