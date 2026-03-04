import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, getUserFromRequest, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";

type UsuarioUpdatePayload = {
  grado?: string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  mailReferencia?: string | null;
  password?: string;
  rol?: UserRole;
  activo?: boolean;
};

function roleFromValue(value: unknown): UserRole | null {
  if (value === "ADMIN" || value === "EDITOR" || value === "READ_ONLY") return value;
  return null;
}

function serializeUsuario<T extends { createdAt: Date; updatedAt: Date }>(usuario: T) {
  return {
    ...usuario,
    createdAt: formatDateTimeForDisplay(usuario.createdAt),
    updatedAt: formatDateTimeForDisplay(usuario.updatedAt),
  };
}

export async function PUT(request: Request, context: { params: Promise<{ usuarioId: string }> }) {
  const { usuarioId } = await context.params;
  const actor = await getUserFromRequest();
  if (!actor) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const isSelfUpdate = actor.usuarioId === usuarioId;
  const isAdmin = actor.rol === "ADMIN";
  const isReadOnly = actor.rol === "READ_ONLY";
  if (!isAdmin && !isSelfUpdate) {
    return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
  }
  if (isReadOnly) {
    return NextResponse.json({ error: "El rol Solo Lectura no puede modificar usuarios." }, { status: 403 });
  }

  const body = (await request.json()) as UsuarioUpdatePayload;
  const existing = await prisma.usuario.findUnique({
    where: { usuarioId },
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

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (!isAdmin && (body.rol !== undefined || body.activo !== undefined || body.password !== undefined)) {
    return NextResponse.json(
      { error: "Solo el administrador puede cambiar rol, estado o contrasenas ajenas." },
      { status: 403 },
    );
  }

  const data: {
    grado?: string;
    nombre?: string;
    apellido?: string;
    username?: string;
    mailReferencia?: string | null;
    passwordHash?: string;
    rol?: UserRole;
    activo?: boolean;
  } = {};

  if (body.grado !== undefined) {
    if (typeof body.grado !== "string" || body.grado.trim() === "") {
      return NextResponse.json({ error: "Grado invalido." }, { status: 400 });
    }
    data.grado = body.grado.trim();
  }

  if (body.nombre !== undefined) {
    if (typeof body.nombre !== "string" || body.nombre.trim() === "") {
      return NextResponse.json({ error: "Nombre invalido." }, { status: 400 });
    }
    data.nombre = body.nombre.trim();
  }

  if (body.apellido !== undefined) {
    if (typeof body.apellido !== "string" || body.apellido.trim() === "") {
      return NextResponse.json({ error: "Apellido invalido." }, { status: 400 });
    }
    data.apellido = body.apellido.trim();
  }

  if (body.usuario !== undefined) {
    if (typeof body.usuario !== "string" || body.usuario.trim() === "") {
      return NextResponse.json({ error: "Usuario invalido." }, { status: 400 });
    }
    data.username = body.usuario.trim();
  }

  if (body.mailReferencia !== undefined) {
    if (body.mailReferencia !== null && typeof body.mailReferencia !== "string") {
      return NextResponse.json({ error: "Mail de referencia invalido." }, { status: 400 });
    }
    data.mailReferencia = body.mailReferencia?.trim() ? body.mailReferencia.trim() : null;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "Contrasena invalida. Minimo 8 caracteres." }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

  if (body.rol !== undefined) {
    const parsedRole = roleFromValue(body.rol);
    if (!parsedRole) return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
    data.rol = parsedRole;
  }

  if (body.activo !== undefined) {
    data.activo = Boolean(body.activo);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar." }, { status: 400 });
  }

  const nextRole = data.rol ?? existing.rol;
  const nextActive = data.activo ?? existing.activo;

  if (existing.rol === "ADMIN" && nextRole !== "ADMIN") {
    const adminCount = await prisma.usuario.count({ where: { rol: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "Debe existir al menos un usuario administrador." }, { status: 409 });
    }
  }

  if (existing.activo && !nextActive) {
    const activeUsersCount = await prisma.usuario.count({ where: { activo: true } });
    if (activeUsersCount <= 1) {
      return NextResponse.json({ error: "Debe existir al menos un usuario activo." }, { status: 409 });
    }
  }

  try {
    const updated = await prisma.usuario.update({
      where: { usuarioId },
      data,
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
      usuarioId: actor.usuarioId,
      accion: "UPDATE",
      entidad: "USUARIO",
      entidadId: updated.usuarioId,
      detalle: {
        grado: updated.grado,
        nombre: updated.nombre,
        apellido: updated.apellido,
        username: updated.username,
        mailReferencia: updated.mailReferencia,
        rol: updated.rol,
        activo: updated.activo,
        updatedFields: Object.keys(data),
      },
    });

    return NextResponse.json(serializeUsuario(updated));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2002") return NextResponse.json({ error: "El usuario ya existe." }, { status: 409 });
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
    select: {
      usuarioId: true,
      grado: true,
      nombre: true,
      apellido: true,
      username: true,
      rol: true,
      activo: true,
    },
  });

  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (target.rol === "ADMIN") {
    const admins = await prisma.usuario.count({ where: { rol: "ADMIN" } });
    if (admins <= 1) {
      return NextResponse.json({ error: "Debe existir al menos un usuario administrador." }, { status: 409 });
    }
  }

  if (target.activo) {
    const activeUsers = await prisma.usuario.count({ where: { activo: true } });
    if (activeUsers <= 1) {
      return NextResponse.json({ error: "Debe existir al menos un usuario activo." }, { status: 409 });
    }
  }

  try {
    await prisma.usuario.delete({ where: { usuarioId } });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "USUARIO",
      entidadId: target.usuarioId,
      detalle: {
        grado: target.grado,
        nombre: target.nombre,
        apellido: target.apellido,
        username: target.username,
        rol: target.rol,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el usuario." }, { status: 500 });
  }
}
