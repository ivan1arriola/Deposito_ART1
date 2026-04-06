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

export async function POST(request: Request) {
  const incomingToken = getBearerToken(request);
  const verification = verifySoldadoWidgetToken(incomingToken);

  if (!verification.ok || !verification.payload) {
    await prisma.auditoria.create({
      data: {
        accion: "CREATE_TAREA_WIDGET",
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

  try {
    const body = await request.json();
    const { titulo, nota, fechaLimite, prioridad } = body;

    // Validación básica
    if (!titulo || typeof titulo !== "string" || titulo.trim().length === 0) {
      return NextResponse.json(
        { error: "titulo is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const validPrioridades = ["NORMAL", "URGENTE"];
    const tarea = await prisma.usuarioRecordatorioTarea.create({
      data: {
        usuarioId,
        titulo: titulo.trim(),
        nota: nota ? String(nota).trim() : null,
        fechaLimite: fechaLimite ? new Date(fechaLimite) : null,
        prioridad:
          prioridad && validPrioridades.includes(prioridad)
            ? prioridad
            : "NORMAL",
      },
    });

    // Auditoría
    await prisma.auditoria.create({
      data: {
        accion: "CREATE_TAREA_WIDGET",
        entidad: "UsuarioRecordatorioTarea",
        entidadId: tarea.tareaId.toString(),
        detalle: { resultado: `SUCCESS (tareaId: ${tarea.tareaId})` },
        usuarioId,
      },
    });

    return NextResponse.json(serializeTask(tarea), { status: 201 });
  } catch (error) {
    console.error("Error creating tarea:", error);
    await prisma.auditoria.create({
      data: {
        accion: "CREATE_TAREA_WIDGET",
        entidad: "UsuarioRecordatorioTarea",
        detalle: {
          resultado: `ERROR: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
        usuarioId,
      },
    });
    return NextResponse.json(
      { error: "Failed to create tarea" },
      { status: 500 }
    );
  }
}
