import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { consumeMagicLinkToken } from "@/lib/password-reset";
import { rangoAbreviacionLabel } from "@/lib/formatters";
import { normalizeEmailAddress } from "@/lib/email-address";

type ResetConfirmPayload = {
  token: string;
  newPassword: string;
};

function isValidPayload(body: unknown): body is ResetConfirmPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.token === "string" &&
    candidate.token.trim() !== "" &&
    typeof candidate.newPassword === "string" &&
    candidate.newPassword.length >= 8
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  try {
    const tokenRecord = await consumeMagicLinkToken({
      token: body.token.trim(),
      purpose: "PASSWORD_RESET",
    });

    if (!tokenRecord) {
      return NextResponse.json({ error: "Enlace invalido o expirado." }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { usuarioId: tokenRecord.usuarioId },
      select: {
        usuarioId: true,
        username: true,
        rango: { select: { abreviacion: true } },
        nombre: true,
        apellido: true,
        mailReferencia: true,
        activo: true,
      },
    });

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "Enlace invalido o expirado." }, { status: 400 });
    }

    if (tokenRecord.mailSnapshot && usuario.mailReferencia) {
      const currentMail = normalizeEmailAddress(usuario.mailReferencia);
      const snapshotMail = normalizeEmailAddress(tokenRecord.mailSnapshot);
      if (currentMail !== snapshotMail) {
        return NextResponse.json(
          { error: "El correo del usuario fue modificado. Solicita un nuevo enlace." },
          { status: 400 }
        );
      }
    }

    const passwordHash = await hashPassword(body.newPassword);
    await prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { passwordHash },
    });

    await logAudit({
      usuarioId: usuario.usuarioId,
      accion: "PASSWORD_RESET",
      entidad: "AUTH",
      entidadId: usuario.usuarioId,
      detalle: {
        username: usuario.username,
        grado: rangoAbreviacionLabel(usuario.rango),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: usuario.mailReferencia,
        metodo: "MAGIC_LINK",
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });
  }
}
