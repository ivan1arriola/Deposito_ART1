import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type UsuarioPayload = {
  username: string;
  password: string;
  rol?: UserRole;
  activo?: boolean;
};

function isValidPayload(body: unknown): body is UsuarioPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.username !== "string" || candidate.username.trim() === "") return false;
  if (typeof candidate.password !== "string" || candidate.password.length < 8) return false;
  if (candidate.rol && typeof candidate.rol !== "string") return false;
  return true;
}

function roleFromValue(value: unknown): UserRole {
  if (value === "ADMIN" || value === "EDITOR" || value === "VIEWER") return value;
  return "VIEWER";
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const usuarios = await prisma.usuario.findMany({
    orderBy: { username: "asc" },
    select: {
      usuarioId: true,
      username: true,
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
      { error: "Payload invalido. username y contrasena (min 8 caracteres) son obligatorios." },
      { status: 400 },
    );
  }

  const username = body.username.trim();
  const passwordHash = await hashPassword(body.password);

  try {
    const created = await prisma.usuario.create({
      data: {
        username,
        passwordHash,
        rol: roleFromValue(body.rol),
        activo: body.activo === undefined ? true : Boolean(body.activo),
      },
      select: {
        usuarioId: true,
        username: true,
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
      detalle: { username: created.username, rol: created.rol, activo: created.activo },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El username ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }
}
