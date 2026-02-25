import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type RangoPayload = {
  nombre: string;
};

function isValidPayload(body: unknown): body is RangoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.nombre === "string" && candidate.nombre.trim() !== "";
}

function parseRangoId(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function PUT(req: Request, context: { params: Promise<{ rangoId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { rangoId: rangoIdParam } = await context.params;
  const rangoId = parseRangoId(rangoIdParam);
  if (rangoId === null) return NextResponse.json({ error: "rangoId (grado del personal) invalido." }, { status: 400 });

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. 'nombre' es obligatorio." }, { status: 400 });
  }

  try {
    const updated = await prisma.rango.update({
      where: { rangoId },
      data: { nombre: body.nombre.trim() },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(updated.rangoId),
      detalle: { nombre: updated.nombre },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Grado del personal no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el grado del personal." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ rangoId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { rangoId: rangoIdParam } = await context.params;
  const rangoId = parseRangoId(rangoIdParam);
  if (rangoId === null) return NextResponse.json({ error: "rangoId (grado del personal) invalido." }, { status: 400 });

  try {
    const deleted = await prisma.rango.delete({ where: { rangoId } });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(deleted.rangoId),
      detalle: { nombre: deleted.nombre },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Grado del personal no encontrado." }, { status: 404 });
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar el grado del personal porque tiene personal asociado." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json({ error: "No se pudo eliminar el grado del personal." }, { status: 500 });
  }
}
