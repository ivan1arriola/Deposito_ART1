import type { TipoRegistro } from "@prisma/client";

type PersonalObservacionInput = {
  fecha: string | Date;
  texto: string | null | undefined;
};

type RegistroObservacionInput = {
  fecha: string | Date;
  tipo: TipoRegistro | "ENTREGA" | "DEVOLUCION";
  comentarios: string | null | undefined;
};

export type HojaObservacion = {
  fecha: string;
  texto: string;
};

function toObservationTimestamp(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function toObservationIso(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function buildHojaObservaciones(
  observacionesPersonal: PersonalObservacionInput[],
  registros: RegistroObservacionInput[],
): HojaObservacion[] {
  const personal = observacionesPersonal
    .map((observacion) => {
      const texto = observacion.texto?.trim();
      const fecha = toObservationIso(observacion.fecha);
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

  const movimientos = registros
    .map((registro) => {
      const comentarios = registro.comentarios?.trim();
      const fecha = toObservationIso(registro.fecha);
      if (!comentarios || !fecha) return null;
      if (registro.tipo !== "ENTREGA" && registro.tipo !== "DEVOLUCION") return null;

      return {
        fecha,
        texto: `${registro.tipo === "ENTREGA" ? "Entrega" : "Devolucion"}: ${comentarios}`,
        sortOrder: registro.tipo === "ENTREGA" ? 1 : 2,
        sortTime: toObservationTimestamp(registro.fecha),
      };
    })
    .filter(
      (
        observacion,
      ): observacion is { fecha: string; texto: string; sortOrder: number; sortTime: number } => observacion !== null,
    );

  return [...personal, ...movimientos]
    .sort((a, b) => a.sortTime - b.sortTime || a.sortOrder - b.sortOrder || a.texto.localeCompare(b.texto, "es"))
    .map(({ fecha, texto }) => ({ fecha, texto }));
}
