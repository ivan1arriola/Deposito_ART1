import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export const SESSION_COOKIE_NAME = "soldados_session";
const SESSION_DURATION_MINUTES = 15;

export type AuthUser = {
  usuarioId: string;
  username: string;
  rol: UserRole;
  activo: boolean;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(";").map((value) => value.trim());
  const pair = parts.find((entry) => entry.startsWith(`${name}=`));
  if (!pair) return null;
  return decodeURIComponent(pair.split("=")[1] ?? "");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(usuarioId: string) {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000);

  await prisma.sesion.create({
    data: {
      tokenHash,
      usuarioId,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getUserFromRequest(request: Request): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return null;

  // Obtener datos completos del usuario desde la base de datos
  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId: session.user.id },
  });

  if (!usuario || !usuario.activo) return null;

  return {
    usuarioId: usuario.usuarioId,
    username: usuario.username,
    rol: usuario.rol,
    activo: usuario.activo,
  };
}

export async function deleteSessionFromRequest(request: Request) {
  // NextAuth maneja la eliminación de sesiones automáticamente
  return;
}

export async function authorizeRequest(
  request: Request,
  permission: Permission,
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: NextResponse }> {
  const user = await getUserFromRequest(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  if (!hasPermission(user.rol, permission)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
