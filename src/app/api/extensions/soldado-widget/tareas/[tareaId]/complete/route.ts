import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { verifySoldadoWidgetToken } from "@/lib/soldado-widget-auth";

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tareaId: string }> }
) {
  const incomingToken = getBearerToken(request);
  const verification = verifySoldadoWidgetToken(incomingToken);
  if (!verification.ok) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { tareaId: rawTareaId } = await params;
  const tareaIdRaw = rawTareaId?.trim() ?? "";
  let tareaId: bigint;
  try {
    tareaId = BigInt(tareaIdRaw);
  } catch {
    return NextResponse.json({ error: "ID de tarea invalido." }, { status: 400 });
  }

  const tarea = await prisma.usuarioRecordatorioTarea.findUnique({
    where: { tareaId },
  });

  if (!tarea) {
    return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  }

  if (tarea.usuarioId !== verification.payload.sub) {
    return NextResponse.json(
      { error: "No tienes permiso para modificar esta tarea." },
      { status: 403 }
    );
  }

  const updated = await prisma.usuarioRecordatorioTarea.update({
    where: { tareaId },
    data: { completada: true },
  });

  await logAudit({
    usuarioId: verification.payload.sub,
    accion: "COMPLETE",
    entidad: "RECORDATORIO_TAREA",
    entidadId: tareaId.toString(),
    detalle: {
      titulo: updated.titulo,
      origen: "soldado-widget",
      username: verification.payload.usr,
    },
  });

  return NextResponse.json({
    tareaId: updated.tareaId.toString(),
    titulo: updated.titulo,
    completada: updated.completada,
    updatedAt: updated.updatedAt.toISOString(),
  });
}
