import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type LoginPayload = {
  username: string;
  password: string;
};

function isValidPayload(body: unknown): body is LoginPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.username === "string" &&
    candidate.username.trim() !== "" &&
    typeof candidate.password === "string" &&
    candidate.password.trim() !== ""
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Usuario y contrasena son obligatorios." }, { status: 400 });
  }

  const username = body.username.trim();
  const password = body.password;

  try {
    const user = await prisma.usuario.findUnique({
      where: { username },
    });

    if (!user || !user.activo) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ error: "Credenciales invalidas." }, { status: 401 });
    }

    const session = await createSession(user.usuarioId);
    const response = NextResponse.json({
      user: {
        usuarioId: user.usuarioId,
        username: user.username,
        rol: user.rol,
      },
    });
    setSessionCookie(response, session.rawToken, session.expiresAt);

    await logAudit({
      usuarioId: user.usuarioId,
      accion: "LOGIN",
      entidad: "AUTH",
      entidadId: user.usuarioId,
    });

    return response;
  } catch {
    return NextResponse.json({ error: "No se pudo leer la base de datos." }, { status: 503 });
  }
}
