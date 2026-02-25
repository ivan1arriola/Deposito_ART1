-- CreateTable
CREATE TABLE "Personal" (
    "id" TEXT NOT NULL,
    "apellido1" TEXT NOT NULL,
    "apellido2" TEXT NOT NULL,
    "nombre1" TEXT NOT NULL,
    "nombre2" TEXT NOT NULL,
    "cedulaIdentidad" TEXT NOT NULL,
    "tallaParka" TEXT NOT NULL,
    "tallaCamisaco" TEXT NOT NULL,
    "tallaPantalon" TEXT NOT NULL,
    "tallaKepi" TEXT NOT NULL,
    "tallaCalzado" TEXT NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Personal_cedulaIdentidad_key" ON "Personal"("cedulaIdentidad");
