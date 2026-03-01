import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  const personalCount = await prisma.personal.count();
  const registroCount = await prisma.registro.count();
  const itemCount = await prisma.item.count();
  const registroItemCount = await prisma.registroItem.count();
  
  console.log('📊 Estado de la Base de Datos:');
  console.log('├─ Personal: ' + personalCount + ' registros');
  console.log('├─ Movimientos (Registro): ' + registroCount + ' registros');
  console.log('├─ Items: ' + itemCount + ' artículos');
  console.log('└─ Detalles (RegistroItem): ' + registroItemCount + ' líneas');
  
  await prisma.$disconnect();
}

check().catch(e => { console.error(e); process.exit(1); });
