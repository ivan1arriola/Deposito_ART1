import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type PasswordChangePayload = {
  currentPassword: string;
  newPassword: string;
};

function isValidPayload(body: unknown): body is PasswordChangePayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.currentPassword === "string" &&
    candidate.currentPassword.trim() !== "" &&
    typeof candidate.newPassword === "string" &&
    candidate.newPassword.length >= 8
  );
}

export async function POST(request: Request) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { usuarioId: user.usuarioId },
      select: {
        usuarioId: true,
        username: true,
        grado: true,
        nombre: true,
        apellido: true,
        mailReferencia: true,
        passwordHash: true,
      },
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    const ok = await verifyPassword(body.currentPassword, usuario.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Contrasena actual invalida." }, { status: 400 });
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
      detalle: {
        username: usuario.username,
        grado: usuario.grado,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: usuario.mailReferencia,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la contrasena." }, { status: 500 });
  }
}
