import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getNextItemOrder, normalizeItemOrders } from "@/lib/item-ordering";

type ItemPayload = {
  nombre: string;
  activo?: boolean;
  ordenPdf?: number;
};

function parseItemId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function isValidOrder(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

function serializeItem(item: {
  itemId: bigint;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
}) {
  return {
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    activo: item.activo,
    ordenPdf: item.ordenPdf,
  };
}

export async function PUT(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ItemPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre || !isValidOrder(body?.ordenPdf)) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          activo: true,
          ordenPdf: true,
        },
      });

      const nextActive = body.activo === undefined ? existing.activo : Boolean(body.activo);
      const nextOrder =
        nextActive !== existing.activo
          ? await getNextItemOrder(tx, nextActive)
          : body.ordenPdf === undefined
            ? existing.ordenPdf
            : body.ordenPdf;

      await tx.item.update({
        where: { itemId },
        data: {
          nombre,
          activo: nextActive,
          ordenPdf: nextOrder,
        },
      });

      await normalizeItemOrders(tx, nextActive);
      if (existing.activo !== nextActive) {
        await normalizeItemOrders(tx, existing.activo);
      }

      return tx.item.findUniqueOrThrow({
        where: { itemId },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: updated.itemId.toString(),
      detalle: {
        nombre: updated.nombre,
        activo: updated.activo,
        ordenPdf: updated.ordenPdf,
      },
    });

    return NextResponse.json(serializeItem(updated));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          nombre: true,
          activo: true,
        },
      });

      const removed = await tx.item.delete({
        where: { itemId },
      });

      await normalizeItemOrders(tx, existing.activo);

      return removed;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ITEM",
      entidadId: deleted.itemId.toString(),
      detalle: {
        nombre: deleted.nombre,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar el equipo porque tiene registros asociados." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
