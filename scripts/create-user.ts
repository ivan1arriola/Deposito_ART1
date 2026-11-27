import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePgConnectionStringSecurity } from "../src/lib/postgres-connection";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  process.exit(1);
}

const adapter = new PrismaPg({
  connectionString: normalizePgConnectionStringSecurity(connectionString),
});
const prisma = new PrismaClient({ adapter });

function getArg(name: string, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const username = getArg("username");
const password = getArg("password");
const roleInput = getArg("role", "ADMIN").toUpperCase();
const role = ["ADMIN", "EDITOR", "READ_ONLY"].includes(roleInput) ? roleInput : "ADMIN";
const rangoIdArgRaw = getArg("rango-id", "").trim();
const gradoArg = getArg("grado", "").trim();
const nombre = getArg("nombre", username).trim() || username;
const apellido = getArg("apellido", "Sistema").trim() || "Sistema";
const mailReferenciaArg = getArg("mail", "").trim();
const mailReferencia = mailReferenciaArg || null;

if (!username || !password || password.length < 8) {
  process.exit(1);
}

async function main() {
  try {
    let defaultRango = await prisma.rango.findFirst({
      where: { abreviacion: "Desarrollo" },
      select: { rangoId: true },
    });

    if (!defaultRango) {
      defaultRango = await prisma.rango.findFirst({
        where: { tipo: "SUBALTERNO" },
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
        select: { rangoId: true },
      });
    }

    let rangoId =
      Number.isInteger(Number(rangoIdArgRaw)) && Number(rangoIdArgRaw) > 0
        ? Number(rangoIdArgRaw)
        : null;

    if (rangoId === null && gradoArg !== "") {
      const foundByLabel = await prisma.rango.findFirst({
        where: {
          OR: [{ abreviacion: gradoArg }, { nombreCompleto: gradoArg }],
        },
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
        select: { rangoId: true },
      });
      rangoId = foundByLabel?.rangoId ?? null;
    }

    if (rangoId === null) {
      rangoId = defaultRango?.rangoId ?? null;
    }

    if (rangoId === null) {
      throw new Error("No se encontro ningun grado para asignar al usuario.");
    }

    const rangoExists = await prisma.rango.findUnique({
      where: { rangoId },
      select: { rangoId: true },
    });
    if (!rangoExists) {
      throw new Error(`El rangoId ${rangoId} no existe.`);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const existing = await prisma.usuario.findUnique({ where: { username } });

    if (existing) {
      const updated = await prisma.usuario.update({
        where: { username },
        data: {
          rangoId,
          nombre,
          apellido,
          passwordHash,
          mailReferencia,
          rol: role as "ADMIN" | "EDITOR" | "READ_ONLY",
          activo: true,
        },
        select: { usuarioId: true, username: true, rol: true, activo: true, rangoId: true },
      });
      console.log("Usuario actualizado:", updated);
    } else {
      const created = await prisma.usuario.create({
        data: {
          rangoId,
          nombre,
          apellido,
          username,
          passwordHash,
          mailReferencia,
          rol: role as "ADMIN" | "EDITOR" | "READ_ONLY",
          activo: true,
        },
        select: { usuarioId: true, username: true, rol: true, activo: true, rangoId: true },
      });
      console.log("Usuario creado:", created);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((_error) => {
  process.exit(1);
});
