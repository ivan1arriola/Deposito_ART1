import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { moveCatalogId } from "@/lib/catalog-order";

function parseOptionalOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseRangoId(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function PUT(req: Request, context: { params: Promise<{ rangoId: string }> }) {
  const auth = await authorizeRequest(req, "manage_users");
  if (!auth.ok) return auth.response;

  const { rangoId: rangoIdParam } = await context.params;
  const rangoId = parseRangoId(rangoIdParam);
  if (rangoId === null) return NextResponse.json({ error: "rangoId (grado del personal) invalido." }, { status: 400 });

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const abreviacion = typeof candidate?.abreviacion === "string" ? candidate.abreviacion.trim() : "";
  const nombreCompleto = typeof candidate?.nombreCompleto === "string" ? candidate.nombreCompleto.trim() : "";
  const orden = parseOptionalOrden(candidate?.orden);

  if (!abreviacion || !nombreCompleto || orden === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'abreviacion' y 'nombreCompleto' son obligatorios; 'orden' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rango.findMany({
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
        select: { rangoId: true, orden: true },
      });
      const current = existing.find((entry) => entry.rangoId === rangoId);
      const updatedRango = await tx.rango.update({
        where: { rangoId },
        data: {
          abreviacion,
          nombreCompleto,
        },
      });
      const orderedIds = moveCatalogId(
        existing.map((entry) => entry.rangoId),
        rangoId,
        orden ?? current?.orden ?? existing.length,
      );

      for (const [index, currentRangoId] of orderedIds.entries()) {
        await tx.rango.update({
          where: { rangoId: currentRangoId },
          data: { orden: index + 1 },
        });
      }

      return { ...updatedRango, orden: orderedIds.indexOf(rangoId) + 1 };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(updated.rangoId),
      detalle: { abreviacion: updated.abreviacion, nombreCompleto: updated.nombreCompleto, orden: updated.orden },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Grado del personal no encontrado." }, { status: 404 });
      if (code === "P2002") {
        return NextResponse.json({ error: "La abreviacion o el nombre completo ya existe." }, { status: 409 });
      }
    }
    return NextResponse.json({ error: "No se pudo actualizar el grado del personal." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ rangoId: string }> }) {
  const auth = await authorizeRequest(req, "manage_users");
  if (!auth.ok) return auth.response;

  const { rangoId: rangoIdParam } = await context.params;
  const rangoId = parseRangoId(rangoIdParam);
  if (rangoId === null) return NextResponse.json({ error: "rangoId (grado del personal) invalido." }, { status: 400 });

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.rango.findMany({
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
        select: { rangoId: true },
      });
      const deletedRango = await tx.rango.delete({ where: { rangoId } });

      for (const [index, currentRangoId] of existing
        .map((entry) => entry.rangoId)
        .filter((currentRangoId) => currentRangoId !== rangoId)
        .entries()) {
        await tx.rango.update({
          where: { rangoId: currentRangoId },
          data: { orden: index + 1 },
        });
      }

      return deletedRango;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(deleted.rangoId),
      detalle: { abreviacion: deleted.abreviacion, nombreCompleto: deleted.nombreCompleto, orden: deleted.orden },
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
