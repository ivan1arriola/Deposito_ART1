import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { prisma } from "@/lib/prisma";
import { hasPermission, type Permission } from "@/lib/permissions";

export type AuthUser = {
  usuarioId: string;
  rangoId: number;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  rol: UserRole;
  activo: boolean;
};

const AUTH_USER_CACHE_TTL_MS = 10 * 1000;
type CachedAuthUser = {
  user: AuthUser | null;
  expiresAt: number;
};

const authUserCache = new Map<string, CachedAuthUser>();
const authUserInflight = new Map<string, Promise<AuthUser | null>>();

function getCachedAuthUser(userId: string) {
  const cached = authUserCache.get(userId);
  if (!cached || cached.expiresAt <= Date.now()) return undefined;
  return cached.user;
}

function setCachedAuthUser(userId: string, user: AuthUser | null) {
  authUserCache.set(userId, {
    user,
    expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
  });
}

export function invalidateAuthUserCache(userId?: string) {
  if (userId) {
    authUserCache.delete(userId);
    authUserInflight.delete(userId);
    return;
  }
  authUserCache.clear();
  authUserInflight.clear();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const cached = getCachedAuthUser(userId);
  if (cached !== undefined) return cached;

  if (!authUserInflight.has(userId)) {
    authUserInflight.set(
      userId,
      prisma.usuario
        .findUnique({
          where: { usuarioId: userId },
          select: {
            usuarioId: true,
            rangoId: true,
            nombre: true,
            apellido: true,
            username: true,
            rol: true,
            activo: true,
            rango: {
              select: {
                abreviacion: true,
              },
            },
          },
        })
        .then((usuario) => {
          if (!usuario || !usuario.activo) {
            setCachedAuthUser(userId, null);
            return null;
          }

          const authUser: AuthUser = {
            usuarioId: usuario.usuarioId,
            rangoId: usuario.rangoId,
            grado: usuario.rango.abreviacion,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            username: usuario.username,
            rol: usuario.rol,
            activo: usuario.activo,
          };
          setCachedAuthUser(userId, authUser);
          return authUser;
        })
        .finally(() => {
          authUserInflight.delete(userId);
        }),
    );
  }

  return authUserInflight.get(userId) ?? null;
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
