import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateTaskPayload = {
  titulo?: unknown;
  nota?: unknown;
  fechaLimite?: unknown;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(value: Date | null | undefined) {
  if (!value) return null;
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (
    utcDate.getUTCFullYear() !== year ||
    utcDate.getUTCMonth() !== month - 1 ||
    utcDate.getUTCDate() !== day
  ) {
    return null;
  }
  return utcDate;
}

function serializeTask(task: {
  tareaId: bigint;
  titulo: string;
  nota: string | null;
  fechaLimite: Date | null;
  completada: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    tareaId: task.tareaId.toString(),
    titulo: task.titulo,
    nota: task.nota ?? "",
    fechaLimite: toIsoDate(task.fechaLimite),
    completada: task.completada,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const tareas = await prisma.usuarioRecordatorioTarea.findMany({
    where: { usuarioId: user.usuarioId },
    orderBy: [{ completada: "asc" }, { fechaLimite: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tareas.map(serializeTask));
}

export async function POST(request: Request) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateTaskPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const titulo = typeof body.titulo === "string" ? body.titulo.trim() : "";
  if (titulo.length < 2) {
    return NextResponse.json({ error: "El titulo debe tener al menos 2 caracteres." }, { status: 400 });
  }
  if (titulo.length > 140) {
    return NextResponse.json({ error: "El titulo no puede superar 140 caracteres." }, { status: 400 });
  }

  const notaRaw = typeof body.nota === "string" ? body.nota.trim() : "";
  if (notaRaw.length > 2500) {
    return NextResponse.json({ error: "La nota no puede superar 2500 caracteres." }, { status: 400 });
  }
  const nota = notaRaw === "" ? null : notaRaw;

  let fechaLimite: Date | null = null;
  if (typeof body.fechaLimite === "string" && body.fechaLimite.trim() !== "") {
    const parsed = parseIsoDate(body.fechaLimite.trim());
    if (!parsed) {
      return NextResponse.json({ error: "La fecha limite es invalida." }, { status: 400 });
    }
    fechaLimite = parsed;
  }

  const created = await prisma.usuarioRecordatorioTarea.create({
    data: {
      usuarioId: user.usuarioId,
      titulo,
      nota,
      fechaLimite,
    },
  });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "CREATE",
    entidad: "RECORDATORIO_TAREA",
    entidadId: created.tareaId.toString(),
    detalle: {
      titulo: created.titulo,
      fechaLimite: toIsoDate(created.fechaLimite),
    },
  });

  return NextResponse.json(serializeTask(created), { status: 201 });
}
