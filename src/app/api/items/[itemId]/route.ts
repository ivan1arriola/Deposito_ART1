import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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

function isValidPayload(body: unknown): body is ItemPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  const hasValidName = typeof candidate.nombre === "string" && candidate.nombre.trim() !== "";
  const hasValidOrder =
    candidate.ordenPdf === undefined ||
    (typeof candidate.ordenPdf === "number" && Number.isInteger(candidate.ordenPdf) && candidate.ordenPdf > 0);
  return hasValidName && hasValidOrder;
}

function serializeItem(item: { itemId: bigint; nombre: string; activo: boolean; ordenPdf: number }) {
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

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.item.update({
      where: { itemId },
      data: {
        nombre: body.nombre.trim(),
        activo: body.activo === undefined ? true : Boolean(body.activo),
        ordenPdf: body.ordenPdf === undefined ? 9999 : body.ordenPdf,
      },
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

    return NextResponse.json({ error: "No se pudo actualizar el item." }, { status: 500 });
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
    const deleted = await prisma.item.delete({
      where: { itemId },
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
          { error: "No se puede eliminar el item porque tiene registros asociados." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "No se pudo eliminar el item." }, { status: 500 });
  }
}
