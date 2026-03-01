import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type UsuarioPayload = {
  grado: string;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  mailReferencia?: string | null;
  rol?: UserRole;
  activo?: boolean;
};

function isValidPayload(body: unknown): body is UsuarioPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.grado !== "string" || candidate.grado.trim() === "") return false;
  if (typeof candidate.nombre !== "string" || candidate.nombre.trim() === "") return false;
  if (typeof candidate.apellido !== "string" || candidate.apellido.trim() === "") return false;
  if (typeof candidate.usuario !== "string" || candidate.usuario.trim() === "") return false;
  if (typeof candidate.password !== "string" || candidate.password.length < 8) return false;
  if (candidate.mailReferencia !== undefined && candidate.mailReferencia !== null && typeof candidate.mailReferencia !== "string") return false;
  if (candidate.rol !== undefined && typeof candidate.rol !== "string") return false;
  return true;
}

function roleFromValue(value: unknown): UserRole {
  if (value === "ADMIN" || value === "EDITOR") return value;
  return "EDITOR";
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }, { username: "asc" }],
    select: {
      usuarioId: true,
      grado: true,
      nombre: true,
      apellido: true,
      username: true,
      mailReferencia: true,
      rol: true,
      activo: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Grado, nombre, apellido, usuario y contrasena (min 8 caracteres) son obligatorios." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(body.password);

  try {
    const created = await prisma.usuario.create({
      data: {
        grado: body.grado.trim(),
        nombre: body.nombre.trim(),
        apellido: body.apellido.trim(),
        username: body.usuario.trim(),
        passwordHash,
        mailReferencia: body.mailReferencia?.trim() ? body.mailReferencia.trim() : null,
        rol: roleFromValue(body.rol),
        activo: body.activo === undefined ? true : Boolean(body.activo),
      },
      select: {
        usuarioId: true,
        grado: true,
        nombre: true,
        apellido: true,
        username: true,
        mailReferencia: true,
        rol: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "USUARIO",
      entidadId: created.usuarioId,
      detalle: {
        grado: created.grado,
        nombre: created.nombre,
        apellido: created.apellido,
        username: created.username,
        mailReferencia: created.mailReferencia,
        rol: created.rol,
        activo: created.activo,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El usuario ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }
}
