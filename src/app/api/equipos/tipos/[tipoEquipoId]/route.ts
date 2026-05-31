import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { GENERAL_TIPO_EQUIPO_CLAVE, normalizeEquipoTipoClave } from "@/lib/equipo-tipos";
import { applyTipoEquipoOrder, getOrderedTipoEquipoIds, insertTipoEquipoAtOrder } from "@/lib/tipo-equipo-ordering";

type TipoEquipoPayload = {
  nombre?: string;
  orden?: number | string;
};

function parseTipoEquipoId(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function parseOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

export async function PUT(request: Request, context: { params: Promise<{ tipoEquipoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const { tipoEquipoId: tipoEquipoIdParam } = await context.params;
  const tipoEquipoId = parseTipoEquipoId(tipoEquipoIdParam);
  if (tipoEquipoId === null) {
    return NextResponse.json({ error: "tipoEquipoId inválido." }, { status: 400 });
  }

  const body = (await request.json()) as TipoEquipoPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const orden = parseOrden(body?.orden);
  const claveNormalizada = normalizeEquipoTipoClave(nombre);
  if (!nombre || !claveNormalizada || claveNormalizada === GENERAL_TIPO_EQUIPO_CLAVE || (body?.orden !== undefined && orden === null)) {
    return NextResponse.json(
      { error: "Payload inválido. 'nombre' es obligatorio, no puede resolver a GENERAL y 'orden' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const { existing, updated } = await prisma.$transaction(async (tx) => {
      const currentOrderedIds = await getOrderedTipoEquipoIds(tx);
      const existing = await tx.tipoEquipoCatalogo.findUniqueOrThrow({
        where: { tipoEquipoId },
        select: { tipoEquipoId: true, clave: true, nombre: true, orden: true },
      });

      const currentIndex = currentOrderedIds.findIndex((currentTipoEquipoId) => currentTipoEquipoId === tipoEquipoId);
      const fallbackOrder = currentIndex >= 0 ? currentIndex + 1 : currentOrderedIds.length;
      const finalOrderedIds = insertTipoEquipoAtOrder(currentOrderedIds, tipoEquipoId, orden ?? fallbackOrder);

      await tx.tipoEquipoCatalogo.update({
        where: { tipoEquipoId },
        data: {
          nombre,
        },
      });
      await applyTipoEquipoOrder(tx, finalOrderedIds);

      const updated = await tx.tipoEquipoCatalogo.findUniqueOrThrow({
        where: { tipoEquipoId },
        select: { tipoEquipoId: true, clave: true, nombre: true, orden: true },
      });

      return { existing, updated };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "TIPO_EQUIPO",
      entidadId: String(updated.tipoEquipoId),
      detalle: {
        previo: existing,
        nuevo: updated,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Tipo de equipo no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "Ya existe un tipo de equipo con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo actualizar el tipo de equipo." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ tipoEquipoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  const { tipoEquipoId: tipoEquipoIdParam } = await context.params;
  const tipoEquipoId = parseTipoEquipoId(tipoEquipoIdParam);
  if (tipoEquipoId === null) {
    return NextResponse.json({ error: "tipoEquipoId inválido." }, { status: 400 });
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.tipoEquipoCatalogo.findUniqueOrThrow({
        where: { tipoEquipoId },
        select: {
          tipoEquipoId: true,
          clave: true,
          nombre: true,
          orden: true,
          _count: {
            select: { items: true },
          },
        },
      });
      const remainingIds = await getOrderedTipoEquipoIds(tx, tipoEquipoId);
      const reassigned = await tx.item.updateMany({
        where: { tipoEquipoId },
        data: { tipoEquipoId: null },
      });

      await tx.tipoEquipoCatalogo.delete({
        where: { tipoEquipoId },
      });
      await applyTipoEquipoOrder(tx, remainingIds);

      return {
        existing,
        equiposReasignadosAGeneral: reassigned.count,
      };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "TIPO_EQUIPO",
      entidadId: String(deleted.existing.tipoEquipoId),
      detalle: {
        clave: deleted.existing.clave,
        nombre: deleted.existing.nombre,
        orden: deleted.existing.orden,
        equiposReasignadosAGeneral: deleted.equiposReasignadosAGeneral,
      },
    });

    return NextResponse.json({
      ok: true,
      tipoEquipoId: deleted.existing.tipoEquipoId,
      equiposReasignadosAGeneral: deleted.equiposReasignadosAGeneral,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Tipo de equipo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo eliminar el tipo de equipo." }, { status: 500 });
  }
}
