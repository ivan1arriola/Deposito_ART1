import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendEmailVerificationMagicLinkEmail, sendPasswordResetMagicLinkEmail } from "@/lib/auth-email";
import { ensurePasswordResetCompatibility } from "@/lib/password-reset";

type ResetRequestPayload = {
  username: string;
};

function isValidPayload(body: unknown): body is ResetRequestPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.username === "string" && candidate.username.trim() !== "";
}

function genericResponse() {
  return NextResponse.json({
    ok: true,
    message: "Si el usuario existe y tiene correo configurado, se envió un enlace.",
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Usuario es obligatorio." }, { status: 400 });
  }

  const username = body.username.trim();

  try {
    await ensurePasswordResetCompatibility();
    const usuario = await prisma.usuario.findUnique({
      where: { username },
      select: {
        usuarioId: true,
        username: true,
        nombre: true,
        apellido: true,
        activo: true,
        mailReferencia: true,
        mailVerificadaAt: true,
        rango: { select: { abreviacion: true } },
      },
    });

    if (!usuario || !usuario.activo || !usuario.mailReferencia) {
      return genericResponse();
    }

    const normalizedMail = normalizeEmailAddress(usuario.mailReferencia);
    if (!isValidEmailAddress(normalizedMail)) {
      return genericResponse();
    }

    if (usuario.mailVerificadaAt) {
      const { expiresAt } = await sendPasswordResetMagicLinkEmail(request, {
        usuarioId: usuario.usuarioId,
        username: usuario.username,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: normalizedMail,
      });
      await logAudit({
        usuarioId: usuario.usuarioId,
        accion: "PASSWORD_RESET_MAGIC_LINK_SENT",
        entidad: "AUTH",
        entidadId: usuario.usuarioId,
        detalle: {
          username: usuario.username,
          grado: usuario.rango.abreviacion,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          mailReferencia: normalizedMail,
          expiresAt,
        },
      });
      return genericResponse();
    }

    const { expiresAt } = await sendEmailVerificationMagicLinkEmail(request, {
      usuarioId: usuario.usuarioId,
      username: usuario.username,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      mailReferencia: normalizedMail,
    });
    await logAudit({
      usuarioId: usuario.usuarioId,
      accion: "EMAIL_VERIFY_MAGIC_LINK_SENT",
      entidad: "AUTH",
      entidadId: usuario.usuarioId,
      detalle: {
        username: usuario.username,
        grado: usuario.rango.abreviacion,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: normalizedMail,
        motivo: "PASSWORD_RESET_REQUEST",
        expiresAt,
      },
    });
  } catch {
    // Respuesta generica para no exponer estado interno ni existencia de usuarios.
  }

  return genericResponse();
}
