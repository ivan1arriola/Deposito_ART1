import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnLogin } from "@/lib/notify-admins";
import { isValidUruguayanCi, normalizeCi } from "@/lib/ci";
import { verifyOrProvisionPersonalCredentials } from "@/lib/personal-auth";

const authSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
type ExtendedNextAuthOptions = NextAuthOptions & { trustHost?: boolean };

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Credenciales incompletas");
        }

        const usernameInput = credentials.username.trim();
        const passwordInput = credentials.password;
        const user = await prisma.usuario.findUnique({
          where: { username: usernameInput },
          select: {
            usuarioId: true,
            username: true,
            mailReferencia: true,
            rol: true,
            activo: true,
            passwordHash: true,
            nombre: true,
            apellido: true,
            rango: {
              select: {
                abreviacion: true,
              },
            },
          },
        });

        if (user) {
          if (!user.activo) {
            throw new Error("Credenciales inválidas");
          }

          const validPassword = await verifyPassword(passwordInput, user.passwordHash);

          if (!validPassword) {
            throw new Error("Credenciales inválidas");
          }

          await logAudit({
            usuarioId: user.usuarioId,
            accion: "LOGIN",
            entidad: "AUTH",
            entidadId: user.usuarioId,
            detalle: {
              username: user.username,
              grado: user.rango?.abreviacion ?? null,
              nombre: user.nombre,
              apellido: user.apellido,
              rol: user.rol,
              accountType: "SISTEMA",
            },
          });
          try {
            await notifyAdminOnLogin({
              usuarioId: user.usuarioId,
              username: user.username,
              nombre: user.nombre,
              apellido: user.apellido,
              rol: user.rol,
            });
          } catch {
            // No bloquear login por fallas de notificaciones.
          }

          return {
            id: user.usuarioId,
            name: user.username,
            email: user.mailReferencia ?? undefined,
            role: user.rol,
            accountType: "SISTEMA",
            personalCi: null,
          };
        }

        const candidateCi = normalizeCi(usernameInput);
        if (isValidUruguayanCi(candidateCi)) {
          const personalAccount = await verifyOrProvisionPersonalCredentials(candidateCi, passwordInput);
          if (personalAccount) {
            const personalUserId = `personal:${candidateCi}`;

            await logAudit({
              usuarioId: null,
              accion: "LOGIN_PERSONAL",
              entidad: "AUTH",
              entidadId: candidateCi,
              detalle: {
                accountType: "PERSONAL",
                ci: candidateCi,
                username: candidateCi,
                grado: personalAccount.identity.gradoAbreviacion,
                nombre: personalAccount.identity.nombre,
                apellido: personalAccount.identity.apellido,
              },
            });

            try {
              await notifyAdminOnLogin({
                usuarioId: personalUserId,
                username: candidateCi,
                nombre: personalAccount.identity.nombre,
                apellido: personalAccount.identity.apellido,
                rol: "READ_ONLY",
              });
            } catch {
              // No bloquear login por fallas de notificaciones.
            }

            return {
              id: personalUserId,
              name: candidateCi,
              email: personalAccount.identity.mailReferencia ?? undefined,
              role: "READ_ONLY",
              accountType: "PERSONAL",
              personalCi: candidateCi,
            };
          }
        }

        throw new Error("Credenciales inválidas");
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accountType = user.accountType;
        token.personalCi = user.personalCi ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.accountType = token.accountType as string;
        session.user.personalCi = (token.personalCi as string | null | undefined) ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
  secret: authSecret,
} satisfies ExtendedNextAuthOptions;
