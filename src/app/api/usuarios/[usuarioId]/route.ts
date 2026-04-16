import { NextResponse } from "next/server";
import { type Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, getUserFromRequest, hashPassword, invalidateAuthUserCache } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendEmailVerificationMagicLinkEmail } from "@/lib/auth-email";
import { ensurePasswordResetCompatibility } from "@/lib/password-reset";
import {
  adminSetPersonalPassword,
  getPersonalAdminUserByCi,
  parsePersonalUsuarioId,
  updatePersonalAccountActive,
} from "@/lib/personal-auth";

type UsuarioUpdatePayload = {
  rangoId?: number | string;
  nombre?: string;
  apellido?: string;
  usuario?: string;
  mailReferencia?: string | null;
  confirmarMail?: boolean;
  password?: string;
  rol?: UserRole;
  activo?: boolean;
};

function roleFromValue(value: unknown): UserRole | null {
  if (value === "ADMIN" || value === "EDITOR" || value === "READ_ONLY") return value;
  return null;
}

function parseRangoId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

const USUARIO_SELECT = {
  usuarioId: true,
  rangoId: true,
  rango: {
    select: {
      rangoId: true,
      tipo: true,
      abreviacion: true,
      nombreCompleto: true,
      orden: true,
    },
  },
  nombre: true,
  apellido: true,
  username: true,
  mailReferencia: true,
  mailVerificadaAt: true,
  rol: true,
  activo: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UsuarioSelect;

type UsuarioRecord = Prisma.UsuarioGetPayload<{ select: typeof USUARIO_SELECT }>;

function serializeUsuario(usuario: UsuarioRecord) {
  return {
    usuarioId: usuario.usuarioId,
    rangoId: usuario.rangoId,
    rango: usuario.rango,
    grado: usuario.rango.abreviacion,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    username: usuario.username,
    mailReferencia: usuario.mailReferencia,
    mailVerificadaAt: usuario.mailVerificadaAt ? formatDateTimeForDisplay(usuario.mailVerificadaAt) : null,
    rol: usuario.rol,
    activo: usuario.activo,
    createdAt: formatDateTimeForDisplay(usuario.createdAt),
    updatedAt: formatDateTimeForDisplay(usuario.updatedAt),
    accountType: "SISTEMA" as const,
    personalCi: null,
  };
}

export async function PUT(request: Request, context: { params: Promise<{ usuarioId: string }> }) {
  const { usuarioId } = await context.params;
  await ensurePasswordResetCompatibility();
  const actor = await getUserFromRequest();
  if (!actor) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const personalCi = parsePersonalUsuarioId(usuarioId);
  if (personalCi) {
    const isAdmin = actor.accountType === "SISTEMA" && actor.rol === "ADMIN";
    if (!isAdmin) {
      return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
    }

    const body = (await request.json()) as UsuarioUpdatePayload;
    const hasUnsupportedFields =
      body.rangoId !== undefined ||
      body.nombre !== undefined ||
      body.apellido !== undefined ||
      body.usuario !== undefined ||
      body.mailReferencia !== undefined ||
      body.confirmarMail !== undefined ||
      body.rol !== undefined;
    if (hasUnsupportedFields) {
      return NextResponse.json(
        { error: "Las cuentas de personal solo admiten cambio de contraseña y estado." },
        { status: 400 },
      );
    }

    if (body.password === undefined && body.activo === undefined) {
      return NextResponse.json({ error: "No hay campos para actualizar." }, { status: 400 });
    }

    if (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 8)) {
      return NextResponse.json({ error: "Contraseña inválida. Mínimo 8 caracteres." }, { status: 400 });
    }

    let updated = await getPersonalAdminUserByCi(personalCi);
    if (!updated) {
      return NextResponse.json({ error: "Cuenta personal no encontrada." }, { status: 404 });
    }

    if (body.password !== undefined) {
      const changed = await adminSetPersonalPassword(personalCi, body.password);
      if (!changed) {
        return NextResponse.json({ error: "Cuenta personal no encontrada." }, { status: 404 });
      }
      updated = changed;
    }

    if (body.activo !== undefined) {
      const changedActive = await updatePersonalAccountActive(personalCi, Boolean(body.activo));
      if (!changedActive) {
        return NextResponse.json({ error: "Cuenta personal no encontrada." }, { status: 404 });
      }
      updated = changedActive;
    }

    await logAudit({
      usuarioId: actor.usuarioId,
      accion: "UPDATE",
      entidad: "PERSONAL_AUTH",
      entidadId: personalCi,
      detalle: {
        ci: personalCi,
        updatedFields: [
          ...(body.password !== undefined ? ["password"] : []),
          ...(body.activo !== undefined ? ["activo"] : []),
        ],
        activo: updated.activo,
      },
    });
    invalidateAuthUserCache(updated.usuarioId);

    return NextResponse.json(updated);
  }

  const isSelfUpdate = actor.usuarioId === usuarioId;
  const isAdmin = actor.accountType === "SISTEMA" && actor.rol === "ADMIN";
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
      rangoId: true,
      username: true,
      nombre: true,
      apellido: true,
      mailReferencia: true,
      mailVerificadaAt: true,
      rol: true,
      activo: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (!isAdmin && (body.rol !== undefined || body.activo !== undefined || body.password !== undefined || body.confirmarMail !== undefined)) {
    return NextResponse.json(
      { error: "Solo el administrador puede cambiar rol, estado, contraseñas ajenas o verificar correos." },
      { status: 403 },
    );
  }

  const data: {
    rangoId?: number;
    nombre?: string;
    apellido?: string;
    username?: string;
    mailReferencia?: string | null;
    mailVerificadaAt?: Date | null;
    passwordHash?: string;
    rol?: UserRole;
    activo?: boolean;
  } = {};
  let shouldSendVerification = false;

  if (body.rangoId !== undefined) {
    const rangoId = parseRangoId(body.rangoId);
    if (!rangoId) {
      return NextResponse.json({ error: "Grado invalido." }, { status: 400 });
    }
    const rango = await prisma.rango.findUnique({
      where: { rangoId },
      select: { rangoId: true },
    });
    if (!rango) {
      return NextResponse.json({ error: "Grado invalido." }, { status: 400 });
    }
    data.rangoId = rangoId;
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
    const nextMail = body.mailReferencia?.trim() ? normalizeEmailAddress(body.mailReferencia) : null;
    if (nextMail && !isValidEmailAddress(nextMail)) {
      return NextResponse.json({ error: "Mail de referencia invalido." }, { status: 400 });
    }

    const previousMail = existing.mailReferencia ? normalizeEmailAddress(existing.mailReferencia) : null;
    const mailChanged = previousMail !== nextMail;

    data.mailReferencia = nextMail;
    if (mailChanged) {
      data.mailVerificadaAt = null;
      shouldSendVerification = nextMail !== null;
    }
  }

  if (body.confirmarMail !== undefined) {
    if (typeof body.confirmarMail !== "boolean") {
      return NextResponse.json({ error: "Accion de verificacion invalida." }, { status: 400 });
    }

    const effectiveMail = data.mailReferencia !== undefined ? data.mailReferencia : existing.mailReferencia;
    if (!effectiveMail) {
      return NextResponse.json({ error: "El usuario no tiene mail de referencia." }, { status: 400 });
    }

    data.mailVerificadaAt = body.confirmarMail ? new Date() : null;
    if (body.confirmarMail) shouldSendVerification = false;
  }

  if (body.password !== undefined) {
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ error: "Contraseña inválida. Mínimo 8 caracteres." }, { status: 400 });
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
      select: USUARIO_SELECT,
    });
    let verificationEmailSent = false;
    if (shouldSendVerification && updated.mailReferencia) {
      try {
        await sendEmailVerificationMagicLinkEmail(request, {
          usuarioId: updated.usuarioId,
          username: updated.username,
          nombre: updated.nombre,
          apellido: updated.apellido,
          mailReferencia: updated.mailReferencia,
        });
        verificationEmailSent = true;
      } catch {
        verificationEmailSent = false;
      }
    }

    await logAudit({
      usuarioId: actor.usuarioId,
      accion: "UPDATE",
      entidad: "USUARIO",
      entidadId: updated.usuarioId,
      detalle: {
        grado: updated.rango.abreviacion,
        nombre: updated.nombre,
        apellido: updated.apellido,
        username: updated.username,
        mailReferencia: updated.mailReferencia,
        mailVerificadaAt: updated.mailVerificadaAt,
        verificationEmailSent,
        rol: updated.rol,
        activo: updated.activo,
        updatedFields: Object.keys(data),
      },
    });
    invalidateAuthUserCache(updated.usuarioId);

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
  const personalCi = parsePersonalUsuarioId(usuarioId);

  if (personalCi) {
    return NextResponse.json(
      { error: "Las cuentas de personal no se eliminan. Usa activar/desactivar para controlar el acceso." },
      { status: 400 },
    );
  }

  if (usuarioId === auth.user.usuarioId) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario." }, { status: 400 });
  }

  const target = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: {
      usuarioId: true,
      rango: { select: { abreviacion: true } },
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
        grado: target.rango.abreviacion,
        nombre: target.nombre,
        apellido: target.apellido,
        username: target.username,
        rol: target.rol,
      },
    });
    invalidateAuthUserCache(target.usuarioId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el usuario." }, { status: 500 });
  }
}
