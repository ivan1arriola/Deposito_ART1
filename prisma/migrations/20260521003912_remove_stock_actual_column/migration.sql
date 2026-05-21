-- CreateEnum
CREATE TYPE "tipo_stock_operacion" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'EDITOR', 'READ_ONLY');

-- CreateEnum
CREATE TYPE "tipo_personal" AS ENUM ('SUBALTERNO', 'OFICIAL', 'SUBOFICIAL');

-- CreateEnum
CREATE TYPE "tipo_articulo" AS ENUM ('OFICINA', 'LIMPIEZA');

-- CreateEnum
CREATE TYPE "tipo_articulo_stock_movimiento" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "tipo_movimiento" AS ENUM ('ENTREGA', 'DEVOLUCION', 'PRESTAMO');

-- CreateEnum
CREATE TYPE "estado_prestamo_movimiento" AS ENUM ('PENDIENTE', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "estado_equipo_prestamo" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'MALO');

-- CreateEnum
CREATE TYPE "prioridad_recordatorio" AS ENUM ('NORMAL', 'URGENTE');

-- CreateTable
CREATE TABLE "usuario" (
    "usuario_id" TEXT NOT NULL,
    "grado_id" SMALLINT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mail_referencia" TEXT,
    "mail_verificada_at" TIMESTAMPTZ(6),
    "rol" "user_role" NOT NULL DEFAULT 'EDITOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "usuario_recordatorio_config" (
    "usuario_id" TEXT NOT NULL,
    "mostrar_muneco" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_recordatorio_config_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "usuario_recordatorio_tarea" (
    "tarea_id" BIGSERIAL NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "nota" TEXT,
    "fecha_limite" DATE,
    "prioridad" "prioridad_recordatorio" NOT NULL DEFAULT 'NORMAL',
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_recordatorio_tarea_pkey" PRIMARY KEY ("tarea_id")
);

-- CreateTable
CREATE TABLE "password_reset" (
    "reset_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "token_type" TEXT NOT NULL DEFAULT 'PASSWORD_RESET',
    "mail_snapshot" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_pkey" PRIMARY KEY ("reset_id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "sesion_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("sesion_id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "auditoria_id" BIGSERIAL NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "detalle" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("auditoria_id")
);

-- CreateTable
CREATE TABLE "grado" (
    "grado_id" SMALLSERIAL NOT NULL,
    "tipo" "tipo_personal" NOT NULL,
    "abreviacion" TEXT NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "grado_pkey" PRIMARY KEY ("grado_id")
);

-- CreateTable
CREATE TABLE "bateria" (
    "bateria_id" SMALLSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" SMALLINT NOT NULL,

    CONSTRAINT "bateria_pkey" PRIMARY KEY ("bateria_id")
);

-- CreateTable
CREATE TABLE "articulo" (
    "articulo_id" SMALLSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "tipo_articulo" NOT NULL,

    CONSTRAINT "articulo_pkey" PRIMARY KEY ("articulo_id")
);

-- CreateTable
CREATE TABLE "articulo_entrega_personal" (
    "articulo_entrega_personal_id" BIGSERIAL NOT NULL,
    "personal_ci" TEXT NOT NULL,
    "usuario_entrega_id" TEXT NOT NULL,
    "ordenante_ci" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "comentario" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articulo_entrega_personal_pkey" PRIMARY KEY ("articulo_entrega_personal_id")
);

-- CreateTable
CREATE TABLE "articulo_stock_movimiento" (
    "articulo_stock_movimiento_id" BIGSERIAL NOT NULL,
    "articulo_id" SMALLINT NOT NULL,
    "tipo" "tipo_articulo_stock_movimiento" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "comentario" TEXT,
    "articulo_entrega_personal_id" BIGINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articulo_stock_movimiento_pkey" PRIMARY KEY ("articulo_stock_movimiento_id")
);

-- CreateTable
CREATE TABLE "estanteria" (
    "codigo" VARCHAR(1) NOT NULL,
    "piso" SMALLINT NOT NULL,

    CONSTRAINT "estanteria_pkey" PRIMARY KEY ("codigo","piso")
);

-- CreateTable
CREATE TABLE "talla_tipo" (
    "talla_tipo_id" SMALLSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "talla_tipo_pkey" PRIMARY KEY ("talla_tipo_id")
);

-- CreateTable
CREATE TABLE "item" (
    "item_id" BIGSERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden_pdf" INTEGER NOT NULL,
    "existencia_sie" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "item_codigo_sie" (
    "item_codigo_sie_id" BIGSERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "talla" TEXT NOT NULL DEFAULT '-',
    "item_id" BIGINT NOT NULL,

    CONSTRAINT "item_codigo_sie_pkey" PRIMARY KEY ("item_codigo_sie_id")
);

-- CreateTable
CREATE TABLE "caja" (
    "codigo_deposito_general" INTEGER NOT NULL,
    "estanteria" VARCHAR(1) NOT NULL,
    "piso" SMALLINT NOT NULL,

    CONSTRAINT "caja_pkey" PRIMARY KEY ("codigo_deposito_general")
);

-- CreateTable
CREATE TABLE "caja_item" (
    "codigo_deposito_general" INTEGER NOT NULL,
    "item_id" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "caja_item_pkey" PRIMARY KEY ("codigo_deposito_general","item_id")
);

-- CreateTable
CREATE TABLE "caja_item_codigo_sie" (
    "codigo_deposito_general" INTEGER NOT NULL,
    "item_codigo_sie_id" BIGINT NOT NULL,

    CONSTRAINT "caja_item_codigo_sie_pkey" PRIMARY KEY ("codigo_deposito_general","item_codigo_sie_id")
);

-- CreateTable
CREATE TABLE "personal" (
    "ci" TEXT NOT NULL,
    "apellido1" TEXT NOT NULL,
    "apellido2" TEXT,
    "nombre1" TEXT NOT NULL,
    "nombre2" TEXT,
    "telefono_contacto" TEXT,
    "grado_id" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_pkey" PRIMARY KEY ("ci")
);

-- CreateTable
CREATE TABLE "movimiento" (
    "movimiento_id" BIGSERIAL NOT NULL,
    "tipo" "tipo_movimiento" NOT NULL,
    "fecha" DATE NOT NULL,
    "personal_ci" TEXT NOT NULL,
    "usuario_entrega_id" TEXT NOT NULL,
    "afecta_stock" BOOLEAN NOT NULL DEFAULT true,
    "observaciones" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("movimiento_id")
);

-- CreateTable
CREATE TABLE "movimiento_item" (
    "movimiento_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "estado_entrega" "estado_equipo_prestamo" NOT NULL DEFAULT 'BUENO',
    "comentario_entrega" TEXT,
    "estado_devolucion" "estado_equipo_prestamo",
    "comentario_devolucion" TEXT,

    CONSTRAINT "movimiento_item_pkey" PRIMARY KEY ("movimiento_id","item_id")
);

-- CreateTable
CREATE TABLE "prestamo_activo" (
    "movimiento_id" BIGINT NOT NULL,
    "recibo_numero" TEXT NOT NULL,
    "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'PENDIENTE',
    "fecha_estimada_devolucion_texto" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamo_activo_pkey" PRIMARY KEY ("movimiento_id")
);

-- CreateTable
CREATE TABLE "prestamo_historial" (
    "historial_id" BIGSERIAL NOT NULL,
    "movimiento_id" BIGINT NOT NULL,
    "recibo_numero" TEXT NOT NULL,
    "estado" "estado_prestamo_movimiento" NOT NULL DEFAULT 'DEVUELTO',
    "fecha_devolucion" DATE NOT NULL,
    "fecha_estimada_devolucion_texto" TEXT,
    "usuario_recibe_devolucion_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prestamo_historial_pkey" PRIMARY KEY ("historial_id")
);

-- CreateTable
CREATE TABLE "subalterno" (
    "ci" TEXT NOT NULL,
    "es_reingreso" BOOLEAN NOT NULL DEFAULT false,
    "fecha_ingreso" DATE,
    "fecha_ingreso_original" DATE,
    "bateria_id" SMALLINT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subalterno_pkey" PRIMARY KEY ("ci")
);

-- CreateTable
CREATE TABLE "oficial" (
    "ci" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oficial_pkey" PRIMARY KEY ("ci")
);

-- CreateTable
CREATE TABLE "suboficial" (
    "ci" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suboficial_pkey" PRIMARY KEY ("ci")
);

-- CreateTable
CREATE TABLE "personal_talla" (
    "ci" TEXT NOT NULL,
    "talla_tipo_id" SMALLINT NOT NULL,
    "talla_valor" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "personal_talla_pkey" PRIMARY KEY ("ci","talla_tipo_id")
);

-- CreateTable
CREATE TABLE "observacion" (
    "observacion_id" BIGSERIAL NOT NULL,
    "ci" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "texto" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observacion_pkey" PRIMARY KEY ("observacion_id")
);

-- CreateTable
CREATE TABLE "stock_operacion" (
    "stock_operacion_id" BIGSERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "tipo" "tipo_stock_operacion" NOT NULL,
    "comentarios" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_operacion_pkey" PRIMARY KEY ("stock_operacion_id")
);

-- CreateTable
CREATE TABLE "stock_operacion_item" (
    "stock_operacion_id" BIGINT NOT NULL,
    "item_id" BIGINT NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "stock_operacion_item_pkey" PRIMARY KEY ("stock_operacion_id","item_id")
);

-- CreateTable
CREATE TABLE "config_firma" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "encargado_rango" TEXT NOT NULL,
    "encargado_nombre" TEXT NOT NULL,
    "oficial_rango" TEXT NOT NULL,
    "oficial_nombre" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_firma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_usuario_key" ON "usuario"("usuario");

-- CreateIndex
CREATE INDEX "usuario_grado_id_idx" ON "usuario"("grado_id");

-- CreateIndex
CREATE INDEX "usuario_recordatorio_tarea_usuario_id_completada_prioridad__idx" ON "usuario_recordatorio_tarea"("usuario_id", "completada", "prioridad", "fecha_limite");

-- CreateIndex
CREATE INDEX "password_reset_usuario_id_idx" ON "password_reset"("usuario_id");

-- CreateIndex
CREATE INDEX "password_reset_expires_at_idx" ON "password_reset"("expires_at");

-- CreateIndex
CREATE INDEX "password_reset_token_type_expires_at_idx" ON "password_reset"("token_type", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_token_hash_key" ON "sesion"("token_hash");

-- CreateIndex
CREATE INDEX "sesion_usuario_id_idx" ON "sesion"("usuario_id");

-- CreateIndex
CREATE INDEX "sesion_expires_at_idx" ON "sesion"("expires_at");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at" DESC);

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_created_at_idx" ON "auditoria"("usuario_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "grado_tipo_orden_idx" ON "grado"("tipo", "orden");

-- CreateIndex
CREATE INDEX "grado_orden_idx" ON "grado"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "grado_tipo_abreviacion_key" ON "grado"("tipo", "abreviacion");

-- CreateIndex
CREATE UNIQUE INDEX "grado_tipo_nombre_completo_key" ON "grado"("tipo", "nombre_completo");

-- CreateIndex
CREATE UNIQUE INDEX "grado_grado_id_tipo_key" ON "grado"("grado_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "bateria_nombre_key" ON "bateria"("nombre");

-- CreateIndex
CREATE INDEX "bateria_orden_idx" ON "bateria"("orden");

-- CreateIndex
CREATE UNIQUE INDEX "articulo_nombre_key" ON "articulo"("nombre");

-- CreateIndex
CREATE INDEX "articulo_tipo_idx" ON "articulo"("tipo");

-- CreateIndex
CREATE INDEX "articulo_entrega_personal_personal_ci_fecha_idx" ON "articulo_entrega_personal"("personal_ci", "fecha" DESC);

-- CreateIndex
CREATE INDEX "articulo_entrega_personal_usuario_entrega_id_fecha_idx" ON "articulo_entrega_personal"("usuario_entrega_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "articulo_entrega_personal_ordenante_ci_fecha_idx" ON "articulo_entrega_personal"("ordenante_ci", "fecha" DESC);

-- CreateIndex
CREATE INDEX "articulo_stock_movimiento_articulo_id_created_at_idx" ON "articulo_stock_movimiento"("articulo_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "articulo_stock_movimiento_tipo_created_at_idx" ON "articulo_stock_movimiento"("tipo", "created_at" DESC);

-- CreateIndex
CREATE INDEX "articulo_stock_movimiento_articulo_entrega_personal_id_crea_idx" ON "articulo_stock_movimiento"("articulo_entrega_personal_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "talla_tipo_nombre_key" ON "talla_tipo"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "item_nombre_key" ON "item"("nombre");

-- CreateIndex
CREATE INDEX "item_codigo_sie_item_id_idx" ON "item_codigo_sie"("item_id");

-- CreateIndex
CREATE INDEX "item_codigo_sie_codigo_idx" ON "item_codigo_sie"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "item_codigo_sie_codigo_talla_item_id_key" ON "item_codigo_sie"("codigo", "talla", "item_id");

-- CreateIndex
CREATE INDEX "caja_estanteria_piso_idx" ON "caja"("estanteria", "piso");

-- CreateIndex
CREATE INDEX "caja_item_item_id_idx" ON "caja_item"("item_id");

-- CreateIndex
CREATE INDEX "caja_item_codigo_sie_item_codigo_sie_id_idx" ON "caja_item_codigo_sie"("item_codigo_sie_id");

-- CreateIndex
CREATE INDEX "personal_grado_id_idx" ON "personal"("grado_id");

-- CreateIndex
CREATE INDEX "movimiento_personal_ci_fecha_idx" ON "movimiento"("personal_ci", "fecha" DESC);

-- CreateIndex
CREATE INDEX "movimiento_tipo_fecha_idx" ON "movimiento"("tipo", "fecha" DESC);

-- CreateIndex
CREATE INDEX "movimiento_usuario_entrega_id_fecha_idx" ON "movimiento"("usuario_entrega_id", "fecha" DESC);

-- CreateIndex
CREATE INDEX "movimiento_item_item_id_idx" ON "movimiento_item"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "prestamo_activo_recibo_numero_key" ON "prestamo_activo"("recibo_numero");

-- CreateIndex
CREATE INDEX "prestamo_activo_estado_created_at_idx" ON "prestamo_activo"("estado", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "prestamo_historial_movimiento_id_key" ON "prestamo_historial"("movimiento_id");

-- CreateIndex
CREATE UNIQUE INDEX "prestamo_historial_recibo_numero_key" ON "prestamo_historial"("recibo_numero");

-- CreateIndex
CREATE INDEX "prestamo_historial_fecha_devolucion_idx" ON "prestamo_historial"("fecha_devolucion" DESC);

-- CreateIndex
CREATE INDEX "prestamo_historial_usuario_recibe_devolucion_id_fecha_devol_idx" ON "prestamo_historial"("usuario_recibe_devolucion_id", "fecha_devolucion" DESC);

-- CreateIndex
CREATE INDEX "subalterno_bateria_id_idx" ON "subalterno"("bateria_id");

-- CreateIndex
CREATE INDEX "observacion_ci_fecha_idx" ON "observacion"("ci", "fecha" DESC);

-- CreateIndex
CREATE INDEX "stock_operacion_fecha_idx" ON "stock_operacion"("fecha" DESC);

-- CreateIndex
CREATE INDEX "stock_operacion_item_item_id_idx" ON "stock_operacion_item"("item_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_grado_id_fkey" FOREIGN KEY ("grado_id") REFERENCES "grado"("grado_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_recordatorio_config" ADD CONSTRAINT "usuario_recordatorio_config_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_recordatorio_tarea" ADD CONSTRAINT "usuario_recordatorio_tarea_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset" ADD CONSTRAINT "password_reset_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_entrega_personal" ADD CONSTRAINT "articulo_entrega_personal_personal_ci_fkey" FOREIGN KEY ("personal_ci") REFERENCES "personal"("ci") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_entrega_personal" ADD CONSTRAINT "articulo_entrega_personal_usuario_entrega_id_fkey" FOREIGN KEY ("usuario_entrega_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_entrega_personal" ADD CONSTRAINT "articulo_entrega_personal_ordenante_ci_fkey" FOREIGN KEY ("ordenante_ci") REFERENCES "personal"("ci") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_stock_movimiento" ADD CONSTRAINT "articulo_stock_movimiento_articulo_id_fkey" FOREIGN KEY ("articulo_id") REFERENCES "articulo"("articulo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articulo_stock_movimiento" ADD CONSTRAINT "articulo_stock_movimiento_articulo_entrega_personal_id_fkey" FOREIGN KEY ("articulo_entrega_personal_id") REFERENCES "articulo_entrega_personal"("articulo_entrega_personal_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_codigo_sie" ADD CONSTRAINT "item_codigo_sie_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja" ADD CONSTRAINT "caja_estanteria_piso_fkey" FOREIGN KEY ("estanteria", "piso") REFERENCES "estanteria"("codigo", "piso") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_item" ADD CONSTRAINT "caja_item_codigo_deposito_general_fkey" FOREIGN KEY ("codigo_deposito_general") REFERENCES "caja"("codigo_deposito_general") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_item" ADD CONSTRAINT "caja_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_item_codigo_sie" ADD CONSTRAINT "caja_item_codigo_sie_codigo_deposito_general_fkey" FOREIGN KEY ("codigo_deposito_general") REFERENCES "caja"("codigo_deposito_general") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caja_item_codigo_sie" ADD CONSTRAINT "caja_item_codigo_sie_item_codigo_sie_id_fkey" FOREIGN KEY ("item_codigo_sie_id") REFERENCES "item_codigo_sie"("item_codigo_sie_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal" ADD CONSTRAINT "personal_grado_id_fkey" FOREIGN KEY ("grado_id") REFERENCES "grado"("grado_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_personal_ci_fkey" FOREIGN KEY ("personal_ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento" ADD CONSTRAINT "movimiento_usuario_entrega_id_fkey" FOREIGN KEY ("usuario_entrega_id") REFERENCES "usuario"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_item" ADD CONSTRAINT "movimiento_item_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimiento_item" ADD CONSTRAINT "movimiento_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("item_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_activo" ADD CONSTRAINT "prestamo_activo_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_historial" ADD CONSTRAINT "prestamo_historial_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "movimiento"("movimiento_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestamo_historial" ADD CONSTRAINT "prestamo_historial_usuario_recibe_devolucion_id_fkey" FOREIGN KEY ("usuario_recibe_devolucion_id") REFERENCES "usuario"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subalterno" ADD CONSTRAINT "subalterno_ci_fkey" FOREIGN KEY ("ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subalterno" ADD CONSTRAINT "subalterno_bateria_id_fkey" FOREIGN KEY ("bateria_id") REFERENCES "bateria"("bateria_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oficial" ADD CONSTRAINT "oficial_ci_fkey" FOREIGN KEY ("ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suboficial" ADD CONSTRAINT "suboficial_ci_fkey" FOREIGN KEY ("ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_talla" ADD CONSTRAINT "personal_talla_ci_fkey" FOREIGN KEY ("ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_talla" ADD CONSTRAINT "personal_talla_talla_tipo_id_fkey" FOREIGN KEY ("talla_tipo_id") REFERENCES "talla_tipo"("talla_tipo_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observacion" ADD CONSTRAINT "observacion_ci_fkey" FOREIGN KEY ("ci") REFERENCES "personal"("ci") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operacion_item" ADD CONSTRAINT "stock_operacion_item_stock_operacion_id_fkey" FOREIGN KEY ("stock_operacion_id") REFERENCES "stock_operacion"("stock_operacion_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operacion_item" ADD CONSTRAINT "stock_operacion_item_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
