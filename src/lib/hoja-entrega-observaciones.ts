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
  equipos?: MovimientoObservacionItemInput[];
};

export type HojaObservacion = {
  fecha: string;
  texto: string;
};

type MovimientoObservacionItemInput = {
  cantidad: number;
  equipo: {
    nombre: string;
    activo: boolean;
  };
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
      if (!fecha) return null;

      const tipoStr = String(movimiento.tipo || "").trim().toUpperCase();
      if (tipoStr !== "ENTREGA" && tipoStr !== "DEVOLUCION") return null;

      // Identificar equipos inactivos (fuera de hoja)
      const itemsFueraHoja = (movimiento.equipos || []).filter((it) => {
        const equipo = it.equipo;
        if (!equipo) return false;
        // Consideramos fuera de hoja si activo NO es explícitamente true
        return equipo.activo !== true;
      });
      const isFueraDeHoja = itemsFueraHoja.length > 0;

      // Si no hay comentarios ni equipos fuera de hoja, no mostramos nada
      if (!comentarios && !isFueraDeHoja) return null;

      let texto = "";
      const labelTipo = tipoStr === "ENTREGA" ? "Entrega" : "Devolución";

      if (isFueraDeHoja) {
        const descripcionItems = itemsFueraHoja
          .map((it) => `${it.cantidad} x ${it.equipo.nombre}`)
          .join(", ");
        
        const manualPart = comentarios ? ` (${comentarios})` : "";
        texto = `${labelTipo} Fuera de Hoja: ${descripcionItems}${manualPart}`;
      } else {
        // Movimiento normal con comentarios
        texto = `${labelTipo}: ${comentarios}`;
      }

      return {
        fecha,
        texto,
        // Cuando la fecha coincide, dejamos "fuera de hoja" al final para mantenerlo visible.
        sortOrder: tipoStr === "ENTREGA" ? (isFueraDeHoja ? 3 : 1) : isFueraDeHoja ? 4 : 2,
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
