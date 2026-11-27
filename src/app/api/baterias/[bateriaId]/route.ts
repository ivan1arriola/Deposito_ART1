import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { LEGACY_CIRR_BATTERY_NAMES } from "@/lib/cirr-classification";
import { moveCatalogId } from "@/lib/catalog-order";

function parseOptionalOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function isLegacyBatteryName(nombre: string) {
  return LEGACY_CIRR_BATTERY_NAMES.includes(nombre as (typeof LEGACY_CIRR_BATTERY_NAMES)[number]);
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
  if (bateriaId === null)
    return NextResponse.json({ error: "bateriaId invalido." }, { status: 400 });

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const nombre = typeof candidate?.nombre === "string" ? candidate.nombre.trim() : "";
  const orden = parseOptionalOrden(candidate?.orden);
  if (!nombre || orden === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio; 'orden' debe ser entero positivo." },
      { status: 400 }
    );
  }

  if (isLegacyBatteryName(nombre)) {
    return NextResponse.json(
      { error: "Esa categoria corresponde a un grado, no a una bateria." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.bateria.findMany({
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { bateriaId: true, nombre: true, orden: true },
      });
      const current = existing.find((entry) => entry.bateriaId === bateriaId);
      const updatedBateria = await tx.bateria.update({
        where: { bateriaId },
        data: { nombre },
      });
      const visibleIds = existing
        .filter((entry) => !isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId);
      const legacyIds = existing
        .filter((entry) => isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId);
      const orderedIds = [
        ...moveCatalogId(visibleIds, bateriaId, orden ?? current?.orden ?? visibleIds.length),
        ...legacyIds.filter((currentBateriaId) => currentBateriaId !== bateriaId),
      ];

      for (const [index, currentBateriaId] of orderedIds.entries()) {
        await tx.bateria.update({
          where: { bateriaId: currentBateriaId },
          data: { orden: index + 1 },
        });
      }

      return {
        ...updatedBateria,
        orden: orderedIds.indexOf(bateriaId) + 1,
        previoNombre: current?.nombre,
        previoOrden: current?.orden,
      };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "BATERIA",
      entidadId: String(updated.bateriaId),
      detalle: {
        previo: { nombre: updated.previoNombre, orden: updated.previoOrden },
        nuevo: { nombre: updated.nombre, orden: updated.orden },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Bateria no encontrada." }, { status: 404 });
      if (code === "P2002")
        return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar la bateria." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ bateriaId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { bateriaId: bateriaIdParam } = await context.params;
  const bateriaId = parseBateriaId(bateriaIdParam);
  if (bateriaId === null)
    return NextResponse.json({ error: "bateriaId invalido." }, { status: 400 });

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.bateria.findMany({
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { bateriaId: true, nombre: true },
      });
      const deletedBateria = await tx.bateria.delete({ where: { bateriaId } });

      const visibleIds = existing
        .filter((entry) => !isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId)
        .filter((currentBateriaId) => currentBateriaId !== bateriaId);
      const legacyIds = existing
        .filter((entry) => isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId)
        .filter((currentBateriaId) => currentBateriaId !== bateriaId);

      for (const [index, currentBateriaId] of [...visibleIds, ...legacyIds].entries()) {
        await tx.bateria.update({
          where: { bateriaId: currentBateriaId },
          data: { orden: index + 1 },
        });
      }

      return deletedBateria;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "BATERIA",
      entidadId: String(deleted.bateriaId),
      detalle: { nombre: deleted.nombre, orden: deleted.orden },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Bateria no encontrada." }, { status: 404 });
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar la bateria porque tiene personal asociado." },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ error: "No se pudo eliminar la bateria." }, { status: 500 });
  }
}
