import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySoldadoWidgetToken } from "@/lib/soldado-widget-auth";

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

function toIsoDate(value: Date | null | undefined) {
  if (!value) return null;
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function serializeTask(task: {
  tareaId: bigint;
  titulo: string;
  nota: string | null;
  fechaLimite: Date | null;
  prioridad: "NORMAL" | "URGENTE";
  completada: boolean;
  updatedAt: Date;
}) {
  return {
    tareaId: task.tareaId.toString(),
    titulo: task.titulo,
    nota: task.nota ?? "",
    fechaLimite: toIsoDate(task.fechaLimite),
    prioridad: task.prioridad,
    completada: task.completada,
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ tareaId: string }> }
) {
  const incomingToken = getBearerToken(request);
  const verification = verifySoldadoWidgetToken(incomingToken);

  if (!verification.ok || !verification.payload) {
    await prisma.auditoria.create({
      data: {
        accion: "UPDATE_TAREA_WIDGET",
        entidad: "UsuarioRecordatorioTarea",
        detalle: { resultado: "DENIED (invalid_token)" },
        usuarioId: null,
      },
    });
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const usuarioId = verification.payload.sub;
  const { tareaId } = await params;

  try {
    const tareaIdBigInt = BigInt(tareaId);

    // Verificar que la tarea pertenece al usuario
    const existingTarea = await prisma.usuarioRecordatorioTarea.findUnique({
      where: { tareaId: tareaIdBigInt },
    });

    if (!existingTarea) {
      return NextResponse.json(
        { error: "Tarea not found" },
        { status: 404 }
      );
    }

    if (existingTarea.usuarioId !== usuarioId) {
      await prisma.auditoria.create({
        data: {
          accion: "UPDATE_TAREA_WIDGET",
          entidad: "UsuarioRecordatorioTarea",
          entidadId: tareaId,
          detalle: { resultado: `DENIED (ownership_check_failed for tareaId ${tareaId})` },
          usuarioId,
        },
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, nota, fechaLimite, prioridad, completada } = body;

    // Validación: si se proporciona titulo, no debe estar vacío
    if (titulo !== undefined && (!titulo || typeof titulo !== "string" || titulo.trim().length === 0)) {
      return NextResponse.json(
        { error: "titulo must be a non-empty string" },
        { status: 400 }
      );
    }

    const validPrioridades = ["NORMAL", "URGENTE"];
    const updateData: Partial<{
      titulo: string;
      nota: string | null;
      fechaLimite: Date | null;
      prioridad: "NORMAL" | "URGENTE";
      completada: boolean;
    }> = {};

    if (titulo !== undefined) updateData.titulo = titulo.trim();
    if (nota !== undefined) updateData.nota = nota ? String(nota).trim() : null;
    if (fechaLimite !== undefined) updateData.fechaLimite = fechaLimite ? new Date(fechaLimite) : null;
    if (prioridad !== undefined && validPrioridades.includes(prioridad)) {
      updateData.prioridad = prioridad;
    }
    if (completada !== undefined && typeof completada === "boolean") {
      updateData.completada = completada;
    }

    const updatedTarea = await prisma.usuarioRecordatorioTarea.update({
      where: { tareaId: tareaIdBigInt },
      data: updateData,
    });

    // Auditoría
    await prisma.auditoria.create({
      data: {
        accion: "UPDATE_TAREA_WIDGET",
        entidad: "UsuarioRecordatorioTarea",
        entidadId: tareaId,
        detalle: { resultado: `SUCCESS (tareaId: ${tareaId})` },
        usuarioId,
      },
    });

    return NextResponse.json(serializeTask(updatedTarea), { status: 200 });
  } catch (error) {
    console.error("Error updating tarea:", error);
    await prisma.auditoria.create({
      data: {
        accion: "UPDATE_TAREA_WIDGET",
        entidad: "UsuarioRecordatorioTarea",
        entidadId: tareaId,
        detalle: {
          resultado: `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        usuarioId,
      },
    });
    return NextResponse.json(
      { error: "Failed to update tarea" },
      { status: 500 }
    );
  }
}
