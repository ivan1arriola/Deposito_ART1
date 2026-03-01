import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Intentando conectar a BD...");
  try {
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Conexión a BD exitosa");
    
    // Listar rangos
    const rangos = await prisma.rango.findMany();
    console.log(`✅ Rangos en BD: ${rangos.length}`);
    rangos.forEach(r => console.log(`  - ${r.abreviacion}: ${r.nombreCompleto}`));
    
    // Listar personal
    const personal = await prisma.personal.findMany({ take: 5 });
    console.log(`✅ Personal registrado: ${personal.length} (primeros 5)`);
    personal.forEach(p => console.log(`  - ${p.ci}: ${p.apellido1}, ${p.nombre1}`));
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
