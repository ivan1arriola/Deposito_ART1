import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getUserFromRequest } from "@/lib/auth";
import { createResetCode } from "@/lib/password-reset";

type ResetRequestPayload = {
  usernameOrEmail: string;
};

function isValidPayload(body: unknown): body is ResetRequestPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.usernameOrEmail === "string" && candidate.usernameOrEmail.trim() !== "";
}

export async function POST(request: Request) {
  const actor = await getUserFromRequest();
  if (!actor) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (actor.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "username o email es obligatorio." }, { status: 400 });
  }

  const query = body.usernameOrEmail.trim();

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        activo: true,
        OR: [{ username: query }, { email: query }],
      },
      select: { usuarioId: true, username: true, email: true, rol: true },
    });

    if (usuario) {
      const { code, expiresAt } = await createResetCode(usuario.usuarioId);
      await logAudit({
        usuarioId: actor.usuarioId,
        accion: "PASSWORD_RESET_REQUEST",
        entidad: "AUTH",
        entidadId: usuario.usuarioId,
        detalle: {
          actorUsername: actor.username,
          username: usuario.username,
          email: usuario.email,
          expiresAt,
          delivery: "DIRECT_CODE",
        },
      });

      return NextResponse.json({
        ok: true,
        code,
        expiresAt: expiresAt.toISOString(),
        username: usuario.username,
      });
    }

    return NextResponse.json({ ok: true, code: null, expiresAt: null, username: null });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el código." }, { status: 503 });
  }
}
