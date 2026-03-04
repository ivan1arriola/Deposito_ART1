import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { applyItemOrder, getOrderedItemIds, insertItemAtOrder } from "@/lib/item-ordering";

type ItemPayload = {
  nombre: string;
  activo?: boolean;
  ordenPdf?: number;
};

type ReorderItemsPayload = {
  orderedItemIds: Array<string | number>;
};

function isValidOrder(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

function parseItemId(value: string | number) {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function isValidReorderPayload(body: unknown): body is ReorderItemsPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return Array.isArray(candidate.orderedItemIds) && candidate.orderedItemIds.length > 0;
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

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const items = await prisma.item.findMany({
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json(items.map(serializeItem));
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as ItemPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";

  if (!nombre || !isValidOrder(body?.ordenPdf)) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const isActive = body.activo === undefined ? true : Boolean(body.activo);
    const created = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.item.create({
        data: {
          nombre,
          activo: isActive,
          ordenPdf: 1,
        },
      });

      const orderedIds = await getOrderedItemIds(tx, isActive, createdItem.itemId);
      const nextOrder = insertItemAtOrder(orderedIds, createdItem.itemId, body.ordenPdf ?? orderedIds.length + 1);
      await applyItemOrder(tx, nextOrder);

      return tx.item.findUniqueOrThrow({
        where: { itemId: createdItem.itemId },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ITEM",
      entidadId: created.itemId.toString(),
      detalle: {
        nombre: created.nombre,
        activo: created.activo,
        ordenPdf: created.ordenPdf,
      },
    });

    return NextResponse.json(serializeItem(created), { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El equipo ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el equipo." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as ReorderItemsPayload;
  if (!isValidReorderPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. orderedItemIds es obligatorio." }, { status: 400 });
  }

  const orderedItemIds = body.orderedItemIds.map(parseItemId);
  if (orderedItemIds.some((itemId) => itemId === null)) {
    return NextResponse.json({ error: "orderedItemIds contiene IDs invalidos." }, { status: 400 });
  }

  const parsedIds = orderedItemIds as bigint[];
  const uniqueIds = new Set(parsedIds.map((itemId) => itemId.toString()));
  if (uniqueIds.size !== parsedIds.length) {
    return NextResponse.json({ error: "No se puede repetir un item en el nuevo orden." }, { status: 400 });
  }

  try {
    const reordered = await prisma.$transaction(async (tx) => {
      const activeItems = await tx.item.findMany({
        where: { activo: true },
        orderBy: [{ ordenPdf: "asc" }, { itemId: "asc" }],
        select: { itemId: true, nombre: true, activo: true, ordenPdf: true },
      });

      const activeIds = activeItems.map((item) => item.itemId.toString());
      if (parsedIds.length !== activeIds.length) {
        throw new Error("El reordenamiento debe incluir todos los equipos visibles en hoja.");
      }

      const hasSameIds =
        activeIds.every((itemId) => uniqueIds.has(itemId)) &&
        Array.from(uniqueIds).every((itemId) => activeIds.includes(itemId));

      if (!hasSameIds) {
        throw new Error("El reordenamiento no coincide con los equipos visibles en hoja.");
      }

      await applyItemOrder(tx, parsedIds);

      return tx.item.findMany({
        where: { itemId: { in: parsedIds } },
        orderBy: [{ ordenPdf: "asc" }, { itemId: "asc" }],
        select: { itemId: true, nombre: true, activo: true, ordenPdf: true },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: null,
      detalle: {
        evento: "ITEM_ORDER_BULK_UPDATE",
        totalItems: reordered.length,
        items: reordered.map((item) => ({
          itemId: item.itemId.toString(),
          nombre: item.nombre,
          ordenPdf: item.ordenPdf,
        })),
      },
    });

    return NextResponse.json(reordered.map(serializeItem));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el orden de los equipos.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
