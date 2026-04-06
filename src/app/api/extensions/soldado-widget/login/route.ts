import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isSoldadoWidgetAuthEnabled, issueSoldadoWidgetToken } from "@/lib/soldado-widget-auth";

type LoginBody = {
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  if (!isSoldadoWidgetAuthEnabled()) {
    return NextResponse.json(
      { error: "Autenticacion de Soldado Widget no habilitada en este entorno." },
      { status: 503 },
    );
  }

  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Body JSON invalido." }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y password son requeridos." }, { status: 400 });
  }

  const user = await prisma.usuario.findUnique({
    where: { username },
    select: {
      usuarioId: true,
      username: true,
      nombre: true,
      apellido: true,
      rol: true,
      activo: true,
      passwordHash: true,
    },
  });

  if (!user || !user.activo) {
    return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
  }

  const token = issueSoldadoWidgetToken({
    usuarioId: user.usuarioId,
    username: user.username,
    rol: user.rol,
  });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "LOGIN_WIDGET",
    entidad: "AUTH",
    entidadId: user.usuarioId,
    detalle: {
      origen: "soldado-widget",
      username: user.username,
      rol: user.rol,
    },
  });

  return NextResponse.json({
    accessToken: token.token,
    expiresAt: token.expiresAt.toISOString(),
    usuario: {
      usuarioId: user.usuarioId,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      rol: user.rol,
    },
  });
}
