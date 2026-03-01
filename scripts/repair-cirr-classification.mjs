import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CDO_SERV_BATTERY_NAME = "Cdo. y Serv.";
const LEGACY_CIRR_BATTERY_NAMES = ["S/ CIRR", "Cursando CIRR"];
const CIRR_GRADE_BY_LEGACY_BATTERY = {
  "S/ CIRR": {
    abreviacion: "Sdo 1° S/CIRR",
    nombreCompleto: "Soldado Primero Sin CIRR",
  },
  "Cursando CIRR": {
    abreviacion: "Sdo 1° C/CIRR",
    nombreCompleto: "Soldado Primero Cursando CIRR",
  },
};

async function main() {
  const cdoServ = await prisma.bateria.upsert({
    where: { nombre: CDO_SERV_BATTERY_NAME },
    update: {},
    create: { nombre: CDO_SERV_BATTERY_NAME },
    select: { bateriaId: true, nombre: true },
  });

  const gradeByLegacyBattery = new Map();
  for (const legacyBatteryName of LEGACY_CIRR_BATTERY_NAMES) {
    const grade = CIRR_GRADE_BY_LEGACY_BATTERY[legacyBatteryName];
    const rango = await prisma.rango.upsert({
      where: { abreviacion: grade.abreviacion },
      update: { nombreCompleto: grade.nombreCompleto },
      create: {
        abreviacion: grade.abreviacion,
        nombreCompleto: grade.nombreCompleto,
      },
      select: { rangoId: true, abreviacion: true, nombreCompleto: true },
    });

    gradeByLegacyBattery.set(legacyBatteryName, rango);
  }

  const legacyBatteries = await prisma.bateria.findMany({
    where: {
      nombre: {
        in: LEGACY_CIRR_BATTERY_NAMES,
      },
    },
    select: {
      bateriaId: true,
      nombre: true,
    },
  });

  let updatedPeople = 0;

  for (const legacyBattery of legacyBatteries) {
    const targetGrade = gradeByLegacyBattery.get(legacyBattery.nombre);
    if (!targetGrade) continue;

    const result = await prisma.personal.updateMany({
      where: {
        bateriaId: legacyBattery.bateriaId,
      },
      data: {
        rangoId: targetGrade.rangoId,
        bateriaId: cdoServ.bateriaId,
      },
    });

    updatedPeople += result.count;
  }

  let deletedBatteries = 0;

  for (const legacyBatteryName of LEGACY_CIRR_BATTERY_NAMES) {
    const remaining = await prisma.personal.count({
      where: {
        bateria: {
          nombre: legacyBatteryName,
        },
      },
    });

    if (remaining > 0) continue;

    const deleted = await prisma.bateria.deleteMany({
      where: {
        nombre: legacyBatteryName,
      },
    });

    deletedBatteries += deleted.count;
  }

  console.log(`Personas corregidas: ${updatedPeople}`);
  console.log(`Baterias legacy eliminadas: ${deletedBatteries}`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Reparacion fallida: ${message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
