import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { createResetCode } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";

type ResetRequestPayload = {
  usernameOrEmail: string;
};

function isValidPayload(body: unknown): body is ResetRequestPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.usernameOrEmail === "string" && candidate.usernameOrEmail.trim() !== "";
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "username o email es obligatorio." }, { status: 400 });
  }

  const query = body.usernameOrEmail.trim();

  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        OR: [{ username: query }, { email: query }],
      },
      select: { usuarioId: true, username: true, email: true, rol: true },
    });

    for (const usuario of usuarios) {
      const { code, expiresAt } = await createResetCode(usuario.usuarioId);
      await sendPasswordResetEmail(usuario.email, code);

      await logAudit({
        usuarioId: usuario.usuarioId,
        accion: "PASSWORD_RESET_REQUEST",
        entidad: "AUTH",
        entidadId: usuario.usuarioId,
        detalle: { username: usuario.username, email: usuario.email, expiresAt },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar el correo." }, { status: 503 });
  }
}
