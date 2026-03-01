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
const email = `${username.trim().toLowerCase().replace(/\s+/g, ".")}@usuarios.local`;

if (!username || !password || password.length < 8) {
  console.error("Uso: npm run user:create -- --username admin --password <min8> [--role ADMIN|EDITOR]");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.usuario.findUnique({ where: { username } });

  if (existing) {
    const updated = await prisma.usuario.update({
      where: { username },
      data: { email, passwordHash, rol: role, activo: true },
      select: { usuarioId: true, username: true, rol: true, activo: true },
    });
    console.log("Usuario actualizado:", updated);
  } else {
    const created = await prisma.usuario.create({
      data: { username, email, passwordHash, rol: role, activo: true },
      select: { usuarioId: true, username: true, rol: true, activo: true },
    });
    console.log("Usuario creado:", created);
  }
} finally {
  await prisma.$disconnect();
}
