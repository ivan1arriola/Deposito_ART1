import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getPersonalSessionIdentity, parsePersonalUsuarioId } from "@/lib/personal-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
import { hasPermission, type AuthAccountType, type Permission } from "@/lib/permissions";
import { rangoAbreviacionLabel } from "@/lib/formatters";

export type { AuthAccountType };
export { hashPassword, verifyPassword };

export type AuthUser = {
  usuarioId: string;
  rangoId: number | null;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  rol: UserRole;
  activo: boolean;
  accountType: AuthAccountType;
  personalCi: string | null;
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

export async function getUserFromRequest(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const isPersonalAccount =
    session.user.accountType === "PERSONAL" || parsePersonalUsuarioId(session.user.id) !== null;
  const accountType: AuthAccountType = isPersonalAccount ? "PERSONAL" : "SISTEMA";
  const fallbackPersonalCi = parsePersonalUsuarioId(session.user.id);
  const sessionPersonalCi = session.user.personalCi ?? fallbackPersonalCi;
  const cacheKey =
    accountType === "PERSONAL" ? `personal:${sessionPersonalCi ?? "unknown"}` : session.user.id;

  const cached = getCachedAuthUser(cacheKey);
  if (cached !== undefined) return cached;

  if (!authUserInflight.has(cacheKey)) {
    const resolver =
      accountType === "PERSONAL"
        ? withPrismaReadRetry(async () => {
            if (!sessionPersonalCi) {
              setCachedAuthUser(cacheKey, null);
              return null;
            }

            const identity = await getPersonalSessionIdentity(sessionPersonalCi);
            if (!identity) {
              setCachedAuthUser(cacheKey, null);
              return null;
            }

            const authUser: AuthUser = {
              usuarioId: session.user.id,
              rangoId: identity.rangoId,
              grado: identity.gradoAbreviacion,
              nombre: identity.nombre,
              apellido: identity.apellido,
              username: identity.ci,
              mailReferencia: identity.mailReferencia,
              rol: "READ_ONLY",
              activo: true,
              accountType: "PERSONAL",
              personalCi: identity.ci,
            };
            setCachedAuthUser(cacheKey, authUser);
            return authUser;
          })
        : withPrismaReadRetry(() =>
            prisma.usuario.findUnique({
              where: { usuarioId: session.user.id },
              select: {
                usuarioId: true,
                rangoId: true,
                nombre: true,
                apellido: true,
                username: true,
                mailReferencia: true,
                rol: true,
                activo: true,
                rango: {
                  select: {
                    abreviacion: true,
                  },
                },
              },
            })
          ).then((usuario) => {
            if (!usuario || !usuario.activo) {
              setCachedAuthUser(cacheKey, null);
              return null;
            }

            const authUser: AuthUser = {
              usuarioId: usuario.usuarioId,
              rangoId: usuario.rangoId,
              grado: rangoAbreviacionLabel(usuario.rango),
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              username: usuario.username,
              mailReferencia: usuario.mailReferencia,
              rol: usuario.rol,
              activo: usuario.activo,
              accountType: "SISTEMA",
              personalCi: null,
            };
            setCachedAuthUser(cacheKey, authUser);
            return authUser;
          });

    authUserInflight.set(
      cacheKey,
      resolver.finally(() => {
        authUserInflight.delete(cacheKey);
      })
    );
  }

  return authUserInflight.get(cacheKey) ?? null;
}

export async function authorizeRequest(
  request: Request,
  permission: Permission
): Promise<{ ok: true; user: AuthUser } | { ok: false; response: NextResponse }> {
  let user: AuthUser | null = null;
  try {
    user = await getUserFromRequest();
  } catch (error: unknown) {
    if (isPrismaDatabaseUnavailable(error)) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
          { status: 503 }
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: "No se pudo validar la sesión." }, { status: 500 }),
    };
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  if (!hasPermission(user.rol, permission, user.accountType)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 }),
    };
  }

  return { ok: true, user };
}
