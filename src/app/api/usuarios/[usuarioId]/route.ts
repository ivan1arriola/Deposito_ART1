import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type UsuarioUpdatePayload = {
  username?: string;
  password?: string;
  rol?: UserRole;
  activo?: boolean;
};

function roleFromValue(value: unknown): UserRole | null {
  if (value === "ADMIN" || value === "EDITOR" || value === "VIEWER") return value;
  return null;
}

export async function PUT(request: Request, context: { params: Promise<{ usuarioId: string }> }) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const { usuarioId } = await context.params;
  const body = (await request.json()) as UsuarioUpdatePayload;

  const data: {
    username?: string;
    passwordHash?: string;
    rol?: UserRole;
    activo?: boolean;
  } = {};

  if (body.username !== undefined) {
    if (typeof body.username !== "string" || body.username.trim() === "") {
      return NextResponse.json({ error: "username invalido." }, { status: 400 });
    }
    data.username = body.username.trim();
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "contrasena invalida. Minimo 8 caracteres." }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

  if (body.rol !== undefined) {
    const parsedRole = roleFromValue(body.rol);
    if (!parsedRole) return NextResponse.json({ error: "rol invalido." }, { status: 400 });
    data.rol = parsedRole;
  }

  if (body.activo !== undefined) {
    data.activo = Boolean(body.activo);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar." }, { status: 400 });
  }

  try {
    const updated = await prisma.usuario.update({
      where: { usuarioId },
      data,
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
      accion: "UPDATE",
      entidad: "USUARIO",
      entidadId: updated.usuarioId,
      detalle: {
        username: updated.username,
        rol: updated.rol,
        activo: updated.activo,
        updatedFields: Object.keys(data),
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El username ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el usuario." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ usuarioId: string }> }) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const { usuarioId } = await context.params;

  if (usuarioId === auth.user.usuarioId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario." }, { status: 400 });
  }

  const target = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioId: true, rol: true, username: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (target.rol === "ADMIN") {
    const admins = await prisma.usuario.count({ where: { rol: "ADMIN", activo: true } });
    if (admins <= 1) {
      return NextResponse.json({ error: "No puedes eliminar el ultimo admin activo." }, { status: 409 });
    }
  }

  try {
    await prisma.usuario.delete({ where: { usuarioId } });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "USUARIO",
      entidadId: target.usuarioId,
      detalle: { username: target.username, rol: target.rol },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el usuario." }, { status: 500 });
  }
}
