import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { markResetCodeUsed, verifyResetCode } from "@/lib/password-reset";

type ResetConfirmPayload = {
  username: string;
  code: string;
  newPassword: string;
};

function isValidPayload(body: unknown): body is ResetConfirmPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.username === "string" &&
    candidate.username.trim() !== "" &&
    typeof candidate.code === "string" &&
    candidate.code.trim() !== "" &&
    typeof candidate.newPassword === "string" &&
    candidate.newPassword.length >= 8
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  const query = body.username.trim();
  const code = body.code.trim();

  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        activo: true,
        username: query,
      },
      select: {
        usuarioId: true,
        username: true,
        grado: true,
        nombre: true,
        apellido: true,
        mailReferencia: true,
      },
    });

    for (const usuario of usuarios) {
      const record = await verifyResetCode(usuario.usuarioId, code);
      if (!record) continue;

      const passwordHash = await hashPassword(body.newPassword);
      await prisma.usuario.update({
        where: { usuarioId: usuario.usuarioId },
        data: { passwordHash },
      });
      await markResetCodeUsed(record.resetId);

      await logAudit({
        usuarioId: usuario.usuarioId,
        accion: "PASSWORD_RESET",
        entidad: "AUTH",
        entidadId: usuario.usuarioId,
        detalle: {
          username: usuario.username,
          grado: usuario.grado,
          nombre: usuario.nombre,
          apellido: usuario.apellido,
          mailReferencia: usuario.mailReferencia,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Codigo invalido o expirado." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la contrasena." }, { status: 500 });
  }
}
