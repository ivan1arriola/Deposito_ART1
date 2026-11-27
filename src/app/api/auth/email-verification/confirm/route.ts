import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { consumeMagicLinkToken } from "@/lib/password-reset";
import { rangoAbreviacionLabel } from "@/lib/formatters";
import { normalizeEmailAddress } from "@/lib/email-address";

type EmailVerifyConfirmPayload = {
  token: string;
};

function isValidPayload(body: unknown): body is EmailVerifyConfirmPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.token === "string" && candidate.token.trim() !== "";
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Token invalido." }, { status: 400 });
  }

  try {
    const tokenRecord = await consumeMagicLinkToken({
      token: body.token.trim(),
      purpose: "EMAIL_VERIFY",
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

    if (!usuario || !usuario.activo || !usuario.mailReferencia) {
      return NextResponse.json({ error: "Enlace invalido o expirado." }, { status: 400 });
    }

    if (tokenRecord.mailSnapshot) {
      const currentMail = normalizeEmailAddress(usuario.mailReferencia);
      const snapshotMail = normalizeEmailAddress(tokenRecord.mailSnapshot);
      if (currentMail !== snapshotMail) {
        return NextResponse.json(
          { error: "El correo del usuario fue modificado. Solicita un nuevo enlace." },
          { status: 400 }
        );
      }
    }

    await prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { mailVerificadaAt: new Date() },
    });

    await logAudit({
      usuarioId: usuario.usuarioId,
      accion: "EMAIL_VERIFIED",
      entidad: "AUTH",
      entidadId: usuario.usuarioId,
      detalle: {
        username: usuario.username,
        grado: rangoAbreviacionLabel(usuario.rango),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: usuario.mailReferencia,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo validar el correo." }, { status: 500 });
  }
}
