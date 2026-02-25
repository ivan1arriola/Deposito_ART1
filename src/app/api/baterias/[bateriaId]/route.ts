import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type BateriaPayload = {
  nombre: string;
};

function isValidPayload(body: unknown): body is BateriaPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.nombre === "string" && candidate.nombre.trim() !== "";
}

function parseBateriaId(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function PUT(req: Request, context: { params: Promise<{ bateriaId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { bateriaId: bateriaIdParam } = await context.params;
  const bateriaId = parseBateriaId(bateriaIdParam);
  if (bateriaId === null) return NextResponse.json({ error: "bateriaId invalido." }, { status: 400 });

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. 'nombre' es obligatorio." }, { status: 400 });
  }

  try {
    const updated = await prisma.bateria.update({
      where: { bateriaId },
      data: { nombre: body.nombre.trim() },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "BATERIA",
      entidadId: String(updated.bateriaId),
      detalle: { nombre: updated.nombre },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Bateria no encontrada." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar la bateria." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ bateriaId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { bateriaId: bateriaIdParam } = await context.params;
  const bateriaId = parseBateriaId(bateriaIdParam);
  if (bateriaId === null) return NextResponse.json({ error: "bateriaId invalido." }, { status: 400 });

  try {
    const deleted = await prisma.bateria.delete({ where: { bateriaId } });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "BATERIA",
      entidadId: String(deleted.bateriaId),
      detalle: { nombre: deleted.nombre },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Bateria no encontrada." }, { status: 404 });
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar la bateria porque tiene personal asociado." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json({ error: "No se pudo eliminar la bateria." }, { status: 500 });
  }
}
