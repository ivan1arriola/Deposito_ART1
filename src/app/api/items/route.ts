import { NextResponse } from "next/server";
import { TipoItem } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { hasPrismaMissingColumn, isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";

import { applyItemOrder } from "@/lib/item-ordering";

type ItemPayload = {
  nombre: string;
  tipo?: TipoItem | string;
  activo?: boolean;
  ordenPdf?: number;
};

type ReorderItemsPayload = {
  orderedItemIds: Array<string | number>;
  activo?: boolean;
};

function parseItemId(value: string | number) {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseTipoItem(value: unknown) {
  if (typeof value === "undefined") return TipoItem.GENERAL;
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === TipoItem.GENERAL) return TipoItem.GENERAL;
  if (raw === TipoItem.FRI) return TipoItem.FRI;
  return null;
}

function isValidReorderPayload(body: unknown): body is ReorderItemsPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return Array.isArray(candidate.orderedItemIds) && candidate.orderedItemIds.length > 0;
}

function serializeItem(item: {
  itemId: bigint;
  nombre: string;
  tipo: TipoItem;
  activo: boolean;
  ordenPdf: number;
  existenciaSie: number;
}) {
  return {
    equipoId: item.itemId.toString(),
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    tipo: item.tipo,
    activo: item.activo,
    ordenPdf: item.ordenPdf,
    existenciaSie: item.existenciaSie,
  };
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const items = await withPrismaReadRetry(() =>
      prisma.item.findMany({
        orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
      }),
    );

    return NextResponse.json(items.map(serializeItem));
  } catch (error: unknown) {
    if (isPrismaDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
        { status: 503 },
      );
    }
    if (hasPrismaMissingColumn(error, "item.tipo")) {
      return NextResponse.json(
        { error: "La base de datos no tiene la columna item.tipo. Ejecuta `npm run db:patch:add-item-tipo` y recarga la app." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "No se pudieron cargar los equipos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as ItemPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const tipo = parseTipoItem(body?.tipo);

  if (!nombre || tipo === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'tipo' debe ser GENERAL o FRI." },
      { status: 400 },
    );
  }

  try {
    const isActive = body.activo === undefined ? true : Boolean(body.activo);
    const highestOrderItem = await prisma.item.findFirst({
      where: { activo: isActive },
      orderBy: [{ ordenPdf: "desc" }],
      select: { ordenPdf: true },
    });

    const baseOffset = isActive ? 0 : 10000;
    const currentMax = highestOrderItem?.ordenPdf ?? baseOffset;
    const nextOrder = Math.max(currentMax, baseOffset) + 1;

    const created = await prisma.item.create({
      data: {
        nombre,
        tipo,
        activo: isActive,
        ordenPdf: nextOrder,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ITEM",
      entidadId: created.itemId.toString(),
      detalle: {
        nombre: created.nombre,
        tipo: created.tipo,
        activo: created.activo,
        ordenPdf: created.ordenPdf,
        existenciaSie: created.existenciaSie,
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

  const isActive = body.activo === undefined ? true : Boolean(body.activo);

  try {
    const reordered = await prisma.$transaction(async (tx) => {
      const targetItems = await tx.item.findMany({
        where: { activo: isActive },
        orderBy: [{ ordenPdf: "asc" }, { itemId: "asc" }],
        select: { itemId: true, nombre: true, tipo: true, activo: true, ordenPdf: true, existenciaSie: true },
      });

      const targetIds = targetItems.map((item) => item.itemId.toString());
      if (parsedIds.length !== targetIds.length) {
        throw new Error(`El reordenamiento debe incluir todos los equipos ${isActive ? "visibles" : "ocultos"} en hoja.`);
      }

      const hasSameIds =
        targetIds.every((itemId) => uniqueIds.has(itemId)) &&
        Array.from(uniqueIds).every((itemId) => targetIds.includes(itemId));

      if (!hasSameIds) {
        throw new Error(`El reordenamiento no coincide con los equipos ${isActive ? "visibles" : "ocultos"} en hoja.`);
      }

      await applyItemOrder(tx, parsedIds, isActive ? 0 : 10000);

      return tx.item.findMany({
        where: { itemId: { in: parsedIds } },
        orderBy: [{ ordenPdf: "asc" }, { itemId: "asc" }],
        select: { itemId: true, nombre: true, tipo: true, activo: true, ordenPdf: true, existenciaSie: true },
      });
    }, { maxWait: 5_000, timeout: 20_000 });

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
          tipo: item.tipo,
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
