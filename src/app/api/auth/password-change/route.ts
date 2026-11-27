import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, hashPassword, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rangoAbreviacionLabel } from "@/lib/formatters";
import { hasPermission } from "@/lib/permissions";
import { changePersonalPassword } from "@/lib/personal-auth";

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
  if (!hasPermission(user.rol, "change_own_password", user.accountType)) {
    return NextResponse.json(
      { error: "No autorizado para cambiar credenciales." },
      { status: 403 }
    );
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  if (user.accountType === "PERSONAL") {
    if (!user.personalCi) {
      return NextResponse.json(
        { error: "No se pudo identificar la cuenta de personal." },
        { status: 400 }
      );
    }

    const result = await changePersonalPassword(
      user.personalCi,
      body.currentPassword,
      body.newPassword
    );
    if (!result.ok) {
      if (result.reason === "INVALID_CURRENT_PASSWORD") {
        return NextResponse.json({ error: "Contraseña actual invalida." }, { status: 400 });
      }
      if (result.reason === "NOT_FOUND") {
        return NextResponse.json({ error: "Cuenta de personal no encontrada." }, { status: 404 });
      }
      return NextResponse.json({ error: "CI invalida." }, { status: 400 });
    }

    await logAudit({
      usuarioId: null,
      accion: "PASSWORD_CHANGE_PERSONAL",
      entidad: "AUTH",
      entidadId: result.ci,
      detalle: {
        accountType: "PERSONAL",
        ci: result.ci,
      },
    });

    return NextResponse.json({ ok: true });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { usuarioId: user.usuarioId },
      select: {
        usuarioId: true,
        username: true,
        rango: { select: { abreviacion: true } },
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
      return NextResponse.json({ error: "Contraseña actual invalida." }, { status: 400 });
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
        grado: rangoAbreviacionLabel(usuario.rango),
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        mailReferencia: usuario.mailReferencia,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 500 });
  }
}
