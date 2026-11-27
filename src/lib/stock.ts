import { Prisma, TipoMovimiento, TipoStockOperacion } from "@/generated/prisma/client";
import {
  MOVIMIENTO_TIPO_ASIGNACION,
  MOVIMIENTO_TIPO_DEVOLUCION,
  MOVIMIENTO_TIPO_ENTREGA,
} from "@/lib/tipo-movimiento";

type PrismaRawLike = Pick<Prisma.TransactionClient, "$queryRaw">;

export function movimientoStockDeltaFactor(
  tipo: TipoMovimiento | "ENTREGA" | "DEVOLUCION" | "ASIGNACION" | "PRESTAMO"
) {
  switch (tipo) {
    case MOVIMIENTO_TIPO_ENTREGA:
    case "ENTREGA":
    case MOVIMIENTO_TIPO_ASIGNACION:
    case "ASIGNACION":
    case TipoMovimiento.PRESTAMO:
    case "PRESTAMO":
      return -1;
    case MOVIMIENTO_TIPO_DEVOLUCION:
    case "DEVOLUCION":
      return 1;
    default:
      return 0;
  }
}

export function stockOperacionDeltaFactor(tipo: TipoStockOperacion | "INGRESO" | "EGRESO") {
  switch (tipo) {
    case TipoStockOperacion.INGRESO:
    case "INGRESO":
      return 1;
    default:
      return -1;
  }
}

type AggregateRow = {
  equipoId: bigint | number | string;
  total: bigint | number | string | null;
};

function toSafeInteger(value: AggregateRow["total"]) {
  if (value === null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "bigint") return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsToItemMap(rows: AggregateRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(String(row.equipoId), toSafeInteger(row.total));
  }
  return map;
}

export async function buildStockSummaryMaps(prisma: PrismaRawLike) {
  const [unidadRows, personalRows, asignacionRows, prestamoRows] = await Promise.all([
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        soi.equipo_id AS "equipoId",
        SUM(CASE WHEN so.tipo = 'INGRESO' THEN soi.cantidad ELSE -soi.cantidad END)::bigint AS total
      FROM stock_operacion_equipo soi
      INNER JOIN stock_operacion so
        ON so.stock_operacion_id = soi.stock_operacion_id
      GROUP BY soi.equipo_id
    `,
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        mi.equipo_id AS "equipoId",
        SUM(
          CASE
            WHEN m.tipo = 'ENTREGA' THEN mi.cantidad
            WHEN m.tipo = 'DEVOLUCION' THEN -mi.cantidad
            ELSE 0
          END
        )::bigint AS total
      FROM movimiento_equipo mi
      INNER JOIN movimiento m
        ON m.movimiento_id = mi.movimiento_id
      INNER JOIN movimiento_destinatario_personal mdp
        ON mdp.movimiento_id = m.movimiento_id
      WHERE m.tipo IN ('ENTREGA', 'DEVOLUCION')
        AND COALESCE(m.anulado, FALSE) = FALSE
      GROUP BY mi.equipo_id
    `,
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        mi.equipo_id AS "equipoId",
        SUM(mi.cantidad)::bigint AS total
      FROM movimiento_equipo mi
      INNER JOIN movimiento m
        ON m.movimiento_id = mi.movimiento_id
      WHERE m.tipo = 'ASIGNACION'
        AND COALESCE(m.anulado, FALSE) = FALSE
      GROUP BY mi.equipo_id
    `,
    prisma.$queryRaw<AggregateRow[]>`
      SELECT
        mi.equipo_id AS "equipoId",
        SUM(mi.cantidad)::bigint AS total
      FROM prestamo_activo pa
      INNER JOIN movimiento_equipo mi
        ON mi.movimiento_id = pa.movimiento_id
      GROUP BY mi.equipo_id
    `,
  ]);

  return {
    unidadByItem: rowsToItemMap(unidadRows),
    personalByItem: rowsToItemMap(personalRows),
    asignacionByItem: rowsToItemMap(asignacionRows),
    prestamoByItem: rowsToItemMap(prestamoRows),
  };
}
