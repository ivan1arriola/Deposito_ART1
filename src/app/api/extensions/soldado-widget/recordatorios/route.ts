import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value: Date | null | undefined) {
  if (!value) return null;
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function parseBooleanParam(value: string | null) {
  if (value === null) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseLimit(value: string | null) {
  if (!value) return 5;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return 5;
  return Math.min(parsed, 20);
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return "";
  return token.trim();
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
  const extensionToken = process.env.SOLDADO_WIDGET_EXTENSION_TOKEN?.trim() ?? "";
  if (extensionToken === "") {
    return NextResponse.json(
      { error: "Extensiones de widget no habilitadas en este entorno." },
      { status: 503 },
    );
  }

  const incomingToken = getBearerToken(request);
  if (incomingToken === "" || incomingToken !== extensionToken) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const usuarioId = (searchParams.get("usuarioId") ?? "").trim();
  if (usuarioId.length < 8 || usuarioId.length > 64) {
    return NextResponse.json({ error: "usuarioId invalido." }, { status: 400 });
  }

  const includeCompleted = parseBooleanParam(searchParams.get("includeCompleted"));
  const limit = parseLimit(searchParams.get("limit"));

  const usuario = await prisma.usuario.findUnique({
    where: { usuarioId },
    select: { usuarioId: true, activo: true },
  });
  if (!usuario || !usuario.activo) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const whereBase = { usuarioId };
  const whereVisible = includeCompleted ? whereBase : { ...whereBase, completada: false };

  const [tasks, pendingCount, urgentCount, nextDueTask] = await Promise.all([
    prisma.usuarioRecordatorioTarea.findMany({
      where: whereVisible,
      orderBy: [{ completada: "asc" }, { prioridad: "desc" }, { fechaLimite: "asc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.usuarioRecordatorioTarea.count({ where: { usuarioId, completada: false } }),
    prisma.usuarioRecordatorioTarea.count({
      where: {
        usuarioId,
        completada: false,
        prioridad: "URGENTE",
      },
    }),
    prisma.usuarioRecordatorioTarea.findFirst({
      where: { usuarioId, completada: false, fechaLimite: { not: null } },
      orderBy: { fechaLimite: "asc" },
      select: { fechaLimite: true },
    }),
  ]);

  return NextResponse.json({
    usuarioId,
    generatedAt: new Date().toISOString(),
    summary: {
      pendingCount,
      urgentCount,
      nextDueDate: toIsoDate(nextDueTask?.fechaLimite),
    },
    tasks: tasks.map(serializeTask),
  });
}
