import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type TaskConfigPayload = {
  mostrarMuneco?: unknown;
};

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "SISTEMA") {
    return NextResponse.json({ error: "Las cuentas de personal no tienen acceso a recordatorios." }, { status: 403 });
  }

  const config = await prisma.usuarioRecordatorioConfig.findUnique({
    where: { usuarioId: user.usuarioId },
    select: { mostrarMuneco: true },
  });

  return NextResponse.json({
    mostrarMuneco: config?.mostrarMuneco ?? true,
  });
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "SISTEMA") {
    return NextResponse.json({ error: "Las cuentas de personal no tienen acceso a recordatorios." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as TaskConfigPayload | null;
  if (!body || typeof body !== "object" || typeof body.mostrarMuneco !== "boolean") {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const updated = await prisma.usuarioRecordatorioConfig.upsert({
    where: { usuarioId: user.usuarioId },
    create: {
      usuarioId: user.usuarioId,
      mostrarMuneco: body.mostrarMuneco,
    },
    update: {
      mostrarMuneco: body.mostrarMuneco,
    },
    select: { mostrarMuneco: true },
  });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "UPDATE",
    entidad: "RECORDATORIO_CONFIG",
    entidadId: user.usuarioId,
    detalle: { mostrarMuneco: updated.mostrarMuneco },
  });

  return NextResponse.json(updated);
}
