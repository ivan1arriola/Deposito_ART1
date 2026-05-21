import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePgConnectionStringSecurity } from "../src/lib/postgres-connection";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL no esta definido.");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: normalizePgConnectionStringSecurity(connectionString) });
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    // 1. Create or find the "Desarrollo" rank
    let rango = await prisma.rango.findFirst({
      where: { abreviacion: "Desarrollo" }
    });

    if (!rango) {
      // Find max orden for SUBALTERNO to set our rank as last
      const maxSubalterno = await prisma.rango.findFirst({
        where: { tipo: "SUBALTERNO" },
        orderBy: { orden: "desc" },
        select: { orden: true }
      });
      const nextOrden = (maxSubalterno?.orden ?? 6) + 1;

      rango = await prisma.rango.create({
        data: {
          tipo: "SUBALTERNO",
          abreviacion: "Desarrollo",
          nombreCompleto: "Desarrollo",
          orden: nextOrden
        }
      });
      console.log("Rango 'Desarrollo' creado:", rango);
    } else {
      console.log("El rango 'Desarrollo' ya existe:", rango);
    }

    // 2. Update users with fictitious rank/apellido
    const usersToUpdate = await prisma.usuario.findMany({
      where: {
        OR: [
          { apellido: "S/D" },
          { username: "admin" }
        ]
      }
    });

    console.log(`Encontrados ${usersToUpdate.length} usuarios para actualizar.`);

    for (const user of usersToUpdate) {
      const updated = await prisma.usuario.update({
        where: { usuarioId: user.usuarioId },
        data: {
          rangoId: rango.rangoId,
          apellido: user.apellido === "S/D" ? "Sistema" : user.apellido
        }
      });
      console.log(`Usuario '${user.username}' actualizado. Grado asignado: 'Desarrollo', Apellido: '${updated.apellido}'`);
    }

    console.log("¡Migración de rango de desarrollo completada con éxito!");
  } catch (error) {
    console.error("Error al ejecutar el script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
