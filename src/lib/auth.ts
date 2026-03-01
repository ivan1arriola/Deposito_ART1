import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export type AuthUser = {
  usuarioId: string;
  username: string;
  rol: UserRole;
  activo: boolean;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

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

export async function authorizeRequest(
  request: Request,
  permission: Permission,
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: NextResponse }> {
  const user = await getUserFromRequest();
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
