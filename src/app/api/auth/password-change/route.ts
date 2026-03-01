import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { markResetCodeUsed, verifyResetCode } from "@/lib/password-reset";

type PasswordChangePayload = {
  currentPassword?: string;
  code?: string;
  newPassword: string;
};

function isValidPayload(body: unknown): body is PasswordChangePayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.newPassword === "string" && candidate.newPassword.length >= 8;
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : null;
  const code = typeof body.code === "string" ? body.code.trim() : null;

  if (!currentPassword && !code) {
    return NextResponse.json({ error: "Debe ingresar la contraseña anterior o un codigo." }, { status: 400 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { usuarioId: user.usuarioId },
      select: { usuarioId: true, username: true, email: true, passwordHash: true },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (currentPassword) {
      const ok = await verifyPassword(currentPassword, usuario.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Contraseña anterior invalida." }, { status: 400 });
      }
    } else if (code) {
      const record = await verifyResetCode(usuario.usuarioId, code);
      if (!record) {
        return NextResponse.json({ error: "Codigo invalido o expirado." }, { status: 400 });
      }
      await markResetCodeUsed(record.resetId);
    }

    const passwordHash = await hashPassword(body.newPassword);
    await prisma.usuario.update({
      where: { usuarioId: usuario.usuarioId },
      data: { passwordHash },
    });

    await logAudit({
      usuarioId: usuario.usuarioId,
      accion: "PASSWORD_CHANGE",
      entidad: "AUTH",
      entidadId: usuario.usuarioId,
      detalle: { username: usuario.username, email: usuario.email },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });
  }
}
