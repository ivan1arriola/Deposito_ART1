import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const username = getArg("username");
const password = getArg("password");
const roleInput = getArg("role", "ADMIN").toUpperCase();
const role = ["ADMIN", "EDITOR"].includes(roleInput) ? roleInput : "ADMIN";
const grado = getArg("grado", "S/D").trim() || "S/D";
const nombre = getArg("nombre", username).trim() || username;
const apellido = getArg("apellido", "S/D").trim() || "S/D";
const mailReferenciaArg = getArg("mail", "").trim();
const mailReferencia = mailReferenciaArg || null;

if (!username || !password || password.length < 8) {
  console.error("Uso: npm run user:create -- --username admin --password <min8> [--role ADMIN|EDITOR] [--grado S/D] [--nombre Nombre] [--apellido Apellido] [--mail mail@dominio]");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.usuario.findUnique({ where: { username } });

  if (existing) {
    const updated = await prisma.usuario.update({
      where: { username },
      data: { grado, nombre, apellido, passwordHash, mailReferencia, rol: role, activo: true },
      select: { usuarioId: true, username: true, rol: true, activo: true },
    });
    console.log("Usuario actualizado:", updated);
  } else {
    const created = await prisma.usuario.create({
      data: { grado, nombre, apellido, username, passwordHash, mailReferencia, rol: role, activo: true },
      select: { usuarioId: true, username: true, rol: true, activo: true },
    });
    console.log("Usuario creado:", created);
  }
} finally {
  await prisma.$disconnect();
}
