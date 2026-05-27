import { TipoMovimiento } from "@/generated/prisma/client";

export const MOVIMIENTO_TIPO_ENTREGA = TipoMovimiento.ENTREGA;
export const MOVIMIENTO_TIPO_DEVOLUCION = TipoMovimiento.DEVOLUCION;
export const MOVIMIENTO_TIPO_PRESTAMO = TipoMovimiento.PRESTAMO;

// Keep ASIGNACION as a literal fallback so runtime code does not depend on
// the generated enum object already being hot-reloaded with the new member.
export const MOVIMIENTO_TIPO_ASIGNACION = "ASIGNACION" as TipoMovimiento;

export const MOVIMIENTO_TIPOS_REGISTRO: TipoMovimiento[] = [
  MOVIMIENTO_TIPO_ENTREGA,
  MOVIMIENTO_TIPO_DEVOLUCION,
  MOVIMIENTO_TIPO_ASIGNACION,
];

export const MOVIMIENTO_TIPOS_REGISTRO_Y_PRESTAMO: TipoMovimiento[] = [
  ...MOVIMIENTO_TIPOS_REGISTRO,
  MOVIMIENTO_TIPO_PRESTAMO,
];
