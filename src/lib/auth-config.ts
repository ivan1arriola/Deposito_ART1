import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnLogin } from "@/lib/notify-admins";

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

        const user = await prisma.usuario.findUnique({
          where: { username: credentials.username },
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

        if (!user || !user.activo) {
          throw new Error("Credenciales inválidas");
        }

        const validPassword = await verifyPassword(credentials.password, user.passwordHash);

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
            grado: user.rango.abreviacion,
            nombre: user.nombre,
            apellido: user.apellido,
            rol: user.rol,
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
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
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
