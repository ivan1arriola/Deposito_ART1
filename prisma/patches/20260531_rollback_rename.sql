ALTER TABLE "equipos" RENAME TO "equipo";
ALTER TABLE "equipo" RENAME COLUMN "equipo_id" TO "equipo_id";

ALTER TABLE "caja_equipo" RENAME TO "caja_equipo";
ALTER TABLE "caja_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";

ALTER TABLE "equipo_codigo_sie" RENAME TO "equipo_codigo_sie";
ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "equipo_id" TO "equipo_id";
ALTER TABLE "equipo_codigo_sie" RENAME COLUMN "equipo_codigo_sie_id" TO "item_codigo_sie_id";

ALTER TABLE "caja_equipo_codigo_sie" RENAME TO "caja_equipo_codigo_sie";
ALTER TABLE "caja_equipo_codigo_sie" RENAME COLUMN "equipo_codigo_sie_id" TO "item_codigo_sie_id";

ALTER TABLE "movimiento_equipo" RENAME TO "movimiento_equipo";
ALTER TABLE "movimiento_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";

ALTER TABLE "stock_operacion_equipo" RENAME TO "stock_operacion_equipo";
ALTER TABLE "stock_operacion_equipo" RENAME COLUMN "equipo_id" TO "equipo_id";
