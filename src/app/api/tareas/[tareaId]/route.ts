import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type UpdateTaskPayload = {
  titulo?: unknown;
  nota?: unknown;
  fechaLimite?: unknown;
  completada?: unknown;
  prioridad?: unknown;
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

function parseTaskId(raw: string) {
  const normalized = decodeURIComponent(raw).trim();
  if (!/^\d+$/.test(normalized)) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function parsePriority(value: unknown): "NORMAL" | "URGENTE" | null {
  if (value === "NORMAL" || value === "URGENTE") return value;
  return null;
}

function serializeTask(task: {
  tareaId: bigint;
  usuarioId: string;
  titulo: string;
  nota: string | null;
  fechaLimite: Date | null;
  prioridad: "NORMAL" | "URGENTE";
  completada: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    tareaId: task.tareaId.toString(),
    usuarioId: task.usuarioId,
    titulo: task.titulo,
    nota: task.nota ?? "",
    fechaLimite: toIsoDate(task.fechaLimite),
    prioridad: task.prioridad,
    completada: task.completada,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export async function PUT(request: Request, context: { params: Promise<{ tareaId: string }> }) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "SISTEMA") {
    return NextResponse.json({ error: "Las cuentas de personal no tienen acceso a recordatorios." }, { status: 403 });
  }

  const { tareaId: tareaIdRaw } = await context.params;
  const tareaId = parseTaskId(tareaIdRaw);
  if (!tareaId) {
    return NextResponse.json({ error: "Identificador de tarea invalido." }, { status: 400 });
  }

  const existing = await prisma.usuarioRecordatorioTarea.findFirst({
    where: { tareaId, usuarioId: user.usuarioId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as UpdateTaskPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const data: {
    titulo?: string;
    nota?: string | null;
    fechaLimite?: Date | null;
    completada?: boolean;
    prioridad?: "NORMAL" | "URGENTE";
  } = {};

  if ("titulo" in body) {
    if (typeof body.titulo !== "string") {
      return NextResponse.json({ error: "El titulo es invalido." }, { status: 400 });
    }
    const titulo = body.titulo.trim();
    if (titulo.length < 2 || titulo.length > 140) {
      return NextResponse.json({ error: "El titulo debe tener entre 2 y 140 caracteres." }, { status: 400 });
    }
    data.titulo = titulo;
  }

  if ("nota" in body) {
    if (typeof body.nota !== "string") {
      return NextResponse.json({ error: "La nota es invalida." }, { status: 400 });
    }
    const nota = body.nota.trim();
    if (nota.length > 2500) {
      return NextResponse.json({ error: "La nota no puede superar 2500 caracteres." }, { status: 400 });
    }
    data.nota = nota === "" ? null : nota;
  }

  if ("fechaLimite" in body) {
    if (body.fechaLimite === null || body.fechaLimite === "") {
      data.fechaLimite = null;
    } else if (typeof body.fechaLimite === "string") {
      const parsed = parseIsoDate(body.fechaLimite.trim());
      if (!parsed) {
        return NextResponse.json({ error: "La fecha limite es invalida." }, { status: 400 });
      }
      data.fechaLimite = parsed;
    } else {
      return NextResponse.json({ error: "La fecha limite es invalida." }, { status: 400 });
    }
  }

  if ("completada" in body) {
    if (typeof body.completada !== "boolean") {
      return NextResponse.json({ error: "El estado de completada es invalido." }, { status: 400 });
    }
    data.completada = body.completada;
  }

  if ("prioridad" in body) {
    const prioridad = parsePriority(body.prioridad);
    if (!prioridad) {
      return NextResponse.json({ error: "La prioridad es invalida." }, { status: 400 });
    }
    data.prioridad = prioridad;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay cambios para guardar." }, { status: 400 });
  }

  const updated = await prisma.usuarioRecordatorioTarea.update({
    where: { tareaId },
    data,
  });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "UPDATE",
    entidad: "RECORDATORIO_TAREA",
    entidadId: updated.tareaId.toString(),
    detalle: {
      titulo: updated.titulo,
      completada: updated.completada,
      fechaLimite: toIsoDate(updated.fechaLimite),
      prioridad: updated.prioridad,
    },
  });

  return NextResponse.json(serializeTask(updated));
}

export async function DELETE(request: Request, context: { params: Promise<{ tareaId: string }> }) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "SISTEMA") {
    return NextResponse.json({ error: "Las cuentas de personal no tienen acceso a recordatorios." }, { status: 403 });
  }

  const { tareaId: tareaIdRaw } = await context.params;
  const tareaId = parseTaskId(tareaIdRaw);
  if (!tareaId) {
    return NextResponse.json({ error: "Identificador de tarea invalido." }, { status: 400 });
  }

  const existing = await prisma.usuarioRecordatorioTarea.findFirst({
    where: { tareaId, usuarioId: user.usuarioId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  }

  await prisma.usuarioRecordatorioTarea.delete({ where: { tareaId } });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "DELETE",
    entidad: "RECORDATORIO_TAREA",
    entidadId: existing.tareaId.toString(),
    detalle: {
      titulo: existing.titulo,
      completada: existing.completada,
      fechaLimite: toIsoDate(existing.fechaLimite),
      prioridad: existing.prioridad,
    },
  });

  return NextResponse.json({ ok: true });
}
