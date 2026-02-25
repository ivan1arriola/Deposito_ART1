-- AlterTable
ALTER TABLE "Personal" ADD COLUMN     "bateriaId" TEXT,
ADD COLUMN     "rangoId" TEXT;

-- CreateTable
CREATE TABLE "Rango" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rango_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bateria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bateria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rango_nombre_key" ON "Rango"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Bateria_nombre_key" ON "Bateria"("nombre");

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_rangoId_fkey" FOREIGN KEY ("rangoId") REFERENCES "Rango"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_bateriaId_fkey" FOREIGN KEY ("bateriaId") REFERENCES "Bateria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial Rango options
INSERT INTO "Rango" ("id", "nombre", "createdAt", "updatedAt") VALUES
('rango_sgto', 'Sgto', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rango_cabo_1', 'Cabo 1°', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rango_cabo_2', 'Cabo 2°', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('rango_sdo_1', 'Sdo 1°', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;

-- Seed initial Bateria options
INSERT INTO "Bateria" ("id", "nombre", "createdAt", "updatedAt") VALUES
('bateria_cdo_serv', 'Cdo. y Serv.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bateria_obus_a', 'Ba. Obus. "A"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bateria_obus_b', 'Ba. Obus. "B"', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bateria_s_cirr', 'S/ CIRR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('bateria_cursando_cirr', 'Cursando CIRR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("nombre") DO NOTHING;
