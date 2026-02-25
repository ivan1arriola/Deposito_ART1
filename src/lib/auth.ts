import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export const SESSION_COOKIE_NAME = "soldados_session";
const SESSION_DURATION_DAYS = 7;

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
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

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
  const sessionToken = getCookie(request, SESSION_COOKIE_NAME);
  if (!sessionToken) return null;

  const tokenHash = hashToken(sessionToken);
  const session = await prisma.sesion.findUnique({
    where: { tokenHash },
    include: { usuario: true },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.sesion.delete({ where: { sesionId: session.sesionId } }).catch(() => null);
    return null;
  }

  if (!session.usuario.activo) return null;

  return {
    usuarioId: session.usuario.usuarioId,
    username: session.usuario.username,
    rol: session.usuario.rol,
    activo: session.usuario.activo,
  };
}

export async function deleteSessionFromRequest(request: Request) {
  const sessionToken = getCookie(request, SESSION_COOKIE_NAME);
  if (!sessionToken) return;

  const tokenHash = hashToken(sessionToken);
  await prisma.sesion.deleteMany({
    where: { tokenHash },
  });
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
