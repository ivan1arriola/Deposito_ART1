import type { TipoMovimiento } from "@/generated/prisma/client";
import { dateInputToDate, formatDateOnlyForDisplay } from "@/lib/date-helpers";

type PersonalObservacionInput = {
  fecha: string | Date;
  texto: string | null | undefined;
};

type MovimientoObservacionInput = {
  fecha: string | Date;
  tipo: TipoMovimiento | "ENTREGA" | "DEVOLUCION";
  observaciones: string | null | undefined;
};

export type HojaObservacion = {
  fecha: string;
  texto: string;
};

function toObservationTimestamp(value: string | Date) {
  const parsed = value instanceof Date ? value : dateInputToDate(value) ?? new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function toObservationDate(value: string | Date) {
  const formatted = formatDateOnlyForDisplay(value);
  return formatted || null;
}

export function buildHojaObservaciones(
  observacionesPersonal: PersonalObservacionInput[],
  movimientos: MovimientoObservacionInput[],
): HojaObservacion[] {
  const personal = observacionesPersonal
    .map((observacion) => {
      const texto = observacion.texto?.trim();
      const fecha = toObservationDate(observacion.fecha);
      if (!texto || !fecha) return null;

      return {
        fecha,
        texto,
        sortOrder: 0,
        sortTime: toObservationTimestamp(observacion.fecha),
      };
    })
    .filter(
      (
        observacion,
      ): observacion is { fecha: string; texto: string; sortOrder: number; sortTime: number } => observacion !== null,
    );

  const movimientosNormalizados = movimientos
    .map((movimiento) => {
      const comentarios = movimiento.observaciones?.trim();
      const fecha = toObservationDate(movimiento.fecha);
      if (!comentarios || !fecha) return null;
      if (movimiento.tipo !== "ENTREGA" && movimiento.tipo !== "DEVOLUCION") return null;

      return {
        fecha,
        texto: `${movimiento.tipo === "ENTREGA" ? "Entrega" : "Devolución"}: ${comentarios}`,
        sortOrder: movimiento.tipo === "ENTREGA" ? 1 : 2,
        sortTime: toObservationTimestamp(movimiento.fecha),
      };
    })
    .filter(
      (
        observacion,
      ): observacion is { fecha: string; texto: string; sortOrder: number; sortTime: number } => observacion !== null,
    );

  return [...personal, ...movimientosNormalizados]
    .sort((a, b) => a.sortTime - b.sortTime || a.sortOrder - b.sortOrder || a.texto.localeCompare(b.texto, "es"))
    .map(({ fecha, texto }) => ({ fecha, texto }));
}
