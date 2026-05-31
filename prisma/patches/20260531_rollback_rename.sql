ALTER TABLE "equipos" RENAME TO "item";
ALTER TABLE "item" RENAME COLUMN "equipo_id" TO "item_id";

ALTER TABLE "caja_equipo" RENAME TO "caja_item";
ALTER TABLE "caja_item" RENAME COLUMN "equipo_id" TO "item_id";

ALTER TABLE "equipo_codigo_sie" RENAME TO "item_codigo_sie";
ALTER TABLE "item_codigo_sie" RENAME COLUMN "equipo_id" TO "item_id";
ALTER TABLE "item_codigo_sie" RENAME COLUMN "equipo_codigo_sie_id" TO "item_codigo_sie_id";

ALTER TABLE "caja_equipo_codigo_sie" RENAME TO "caja_item_codigo_sie";
ALTER TABLE "caja_item_codigo_sie" RENAME COLUMN "equipo_codigo_sie_id" TO "item_codigo_sie_id";

ALTER TABLE "movimiento_equipo" RENAME TO "movimiento_item";
ALTER TABLE "movimiento_item" RENAME COLUMN "equipo_id" TO "item_id";

ALTER TABLE "stock_operacion_equipo" RENAME TO "stock_operacion_item";
ALTER TABLE "stock_operacion_item" RENAME COLUMN "equipo_id" TO "item_id";
