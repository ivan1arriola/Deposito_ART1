import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySoldadoWidgetToken } from "@/lib/soldado-widget-auth";

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value: Date | null | undefined) {
  if (!value) return null;
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function parseLimit(value: string | null) {
  if (!value) return 50;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 100);
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

export async function GET(request: Request) {
  const incomingToken = getBearerToken(request);
  const verification = verifySoldadoWidgetToken(incomingToken);
  if (!verification.ok) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeCompleted = (searchParams.get("includeCompleted") ?? "false").trim().toLowerCase() === "true";
  const limit = parseLimit(searchParams.get("limit"));
  const usuarioId = verification.payload.sub;

  const whereBase = { usuarioId };
  const where = includeCompleted ? whereBase : { ...whereBase, completada: false };

  const tareas = await prisma.usuarioRecordatorioTarea.findMany({
    where,
    orderBy: [
      { completada: "asc" },
      { prioridad: "desc" },
      { fechaLimite: "asc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return NextResponse.json({
    usuarioId,
    username: verification.payload.usr,
    generatedAt: new Date().toISOString(),
    total: tareas.length,
    tareas: tareas.map(serializeTask),
  });
}
