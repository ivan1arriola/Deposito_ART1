import { NextResponse } from "next/server";
import { type Prisma, UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendEmailVerificationMagicLinkEmail } from "@/lib/auth-email";
import { ensurePasswordResetCompatibility } from "@/lib/password-reset";
import { listPersonalAdminUsers } from "@/lib/personal-auth";

type UsuarioPayload = {
  rangoId: number | string;
  nombre: string;
  apellido: string;
  usuario: string;
  password: string;
  mailReferencia?: string | null;
  rol?: UserRole;
  activo?: boolean;
};

function parseRangoId(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function isValidPayload(body: unknown): body is UsuarioPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (parseRangoId(candidate.rangoId) === null) return false;
  if (typeof candidate.nombre !== "string" || candidate.nombre.trim() === "") return false;
  if (typeof candidate.apellido !== "string" || candidate.apellido.trim() === "") return false;
  if (typeof candidate.usuario !== "string" || candidate.usuario.trim() === "") return false;
  if (typeof candidate.password !== "string" || candidate.password.length < 8) return false;
  if (candidate.mailReferencia !== undefined && candidate.mailReferencia !== null && typeof candidate.mailReferencia !== "string") return false;
  if (candidate.rol !== undefined && typeof candidate.rol !== "string") return false;
  return true;
}

function roleFromValue(value: unknown): UserRole {
  if (value === "ADMIN" || value === "EDITOR" || value === "READ_ONLY") return value;
  return "EDITOR";
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

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;
  await ensurePasswordResetCompatibility();

  const [usuariosSistema, usuariosPersonal] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }, { username: "asc" }],
      select: USUARIO_SELECT,
    }),
    listPersonalAdminUsers(),
  ]);

  const usuarios = [
    ...usuariosSistema.map(serializeUsuario),
    ...usuariosPersonal,
  ].sort((left, right) => {
    const byApellido = left.apellido.localeCompare(right.apellido, "es", { sensitivity: "base" });
    if (byApellido !== 0) return byApellido;
    const byNombre = left.nombre.localeCompare(right.nombre, "es", { sensitivity: "base" });
    if (byNombre !== 0) return byNombre;
    return left.username.localeCompare(right.username, "es", { sensitivity: "base" });
  });

  return NextResponse.json(usuarios);
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;
  await ensurePasswordResetCompatibility();

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload inválido. Grado, nombre, apellido, usuario y contraseña (mín. 8 caracteres) son obligatorios." },
      { status: 400 },
    );
  }

  const rangoId = parseRangoId(body.rangoId);
  if (rangoId === null) {
    return NextResponse.json({ error: "Grado invalido." }, { status: 400 });
  }

  const rango = await prisma.rango.findUnique({
    where: { rangoId },
    select: { rangoId: true, abreviacion: true },
  });
  if (!rango) {
    return NextResponse.json({ error: "Grado invalido." }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password);
  const normalizedMail = body.mailReferencia?.trim() ? normalizeEmailAddress(body.mailReferencia) : null;
  if (normalizedMail && !isValidEmailAddress(normalizedMail)) {
    return NextResponse.json({ error: "Mail de referencia invalido." }, { status: 400 });
  }

  try {
    const created = await prisma.usuario.create({
      data: {
        rangoId,
        nombre: body.nombre.trim(),
        apellido: body.apellido.trim(),
        username: body.usuario.trim(),
        passwordHash,
        mailReferencia: normalizedMail,
        mailVerificadaAt: null,
        rol: roleFromValue(body.rol),
        activo: body.activo === undefined ? true : Boolean(body.activo),
      },
      select: USUARIO_SELECT,
    });
    let verificationEmailSent = false;
    if (created.mailReferencia) {
      try {
        await sendEmailVerificationMagicLinkEmail(request, {
          usuarioId: created.usuarioId,
          username: created.username,
          nombre: created.nombre,
          apellido: created.apellido,
          mailReferencia: created.mailReferencia,
        });
        verificationEmailSent = true;
      } catch {
        verificationEmailSent = false;
      }
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "USUARIO",
      entidadId: created.usuarioId,
      detalle: {
        grado: created.rango.abreviacion,
        nombre: created.nombre,
        apellido: created.apellido,
        username: created.username,
        mailReferencia: created.mailReferencia,
        mailVerificadaAt: created.mailVerificadaAt,
        verificationEmailSent,
        rol: created.rol,
        activo: created.activo,
      },
    });

    return NextResponse.json(serializeUsuario(created), { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El usuario ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear el usuario." }, { status: 500 });
  }
}
