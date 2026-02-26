/**
 * Utilidades para dates y validaciones
 */

export function getDatePart(dateString: string): string {
  if (!dateString) return "";
  return dateString.slice(0, 10);
}

export function parseDateInput(value: string): {
  year: number;
  month: number;
  day: number;
  valid: boolean;
} {
  const parts = value.split("-");
  if (parts.length !== 3) {
    return { year: 0, month: 0, day: 0, valid: false };
  }
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  
  const valid = !isNaN(year) && !isNaN(month) && !isNaN(day) &&
    month >= 1 && month <= 12 &&
    day >= 1 && day <= 31;
  
  return { year, month, day, valid };
}

export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString + "T00:00:00Z");
    return new Intl.DateTimeFormat("es-UY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}
