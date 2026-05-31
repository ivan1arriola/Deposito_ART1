import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { GENERAL_TIPO_EQUIPO_CLAVE, normalizeEquipoTipoClave } from "@/lib/equipo-tipos";
import { serializeEquipoTipoData, tipoEquipoRelationSelect } from "@/lib/equipo-tipos-data";
import { hasPrismaMissingColumn, isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
import { applyItemOrder } from "@/lib/item-ordering";

type ItemPayload = {
  nombre: string;
  tipo?: string;
  tipoEquipoId?: number | string | null;
  activo?: boolean;
  ordenPdf?: number;
};

type ReorderItemsPayload = {
  orderedItemIds: Array<string | number>;
  activo?: boolean;
};

const itemSelect = {
  itemId: true,
  nombre: true,
  tipoEquipoId: true,
  tipoEquipo: {
    select: tipoEquipoRelationSelect,
  },
  activo: true,
  ordenPdf: true,
  existenciaSie: true,
} satisfies Prisma.ItemSelect;

function parseItemId(value: string | number) {
  const raw = String(value).trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseNullableTipoEquipoId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function resolveTipoEquipoId(
  client: Pick<typeof prisma, "tipoEquipoCatalogo">,
  body: ItemPayload,
): Promise<number | null | undefined> {
  if (Object.prototype.hasOwnProperty.call(body, "tipoEquipoId")) {
    const parsed = parseNullableTipoEquipoId(body.tipoEquipoId);
    if (body.tipoEquipoId !== null && body.tipoEquipoId !== undefined && body.tipoEquipoId !== "" && parsed === null) {
      return undefined;
    }
    if (parsed === null) return null;

    const existing = await client.tipoEquipoCatalogo.findUnique({
      where: { tipoEquipoId: parsed },
      select: { tipoEquipoId: true },
    });
    return existing?.tipoEquipoId;
  }

  if (typeof body.tipo === "undefined") return null;

  const normalized = normalizeEquipoTipoClave(String(body.tipo ?? ""));
  if (!normalized || normalized === GENERAL_TIPO_EQUIPO_CLAVE) return null;

  const existing = await client.tipoEquipoCatalogo.findUnique({
    where: { clave: normalized },
    select: { tipoEquipoId: true },
  });
  return existing?.tipoEquipoId;
}

function isValidReorderPayload(body: unknown): body is ReorderItemsPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return Array.isArray(candidate.orderedItemIds) && candidate.orderedItemIds.length > 0;
}

function serializeItem(item: {
  itemId: bigint;
  nombre: string;
  tipoEquipoId: number | null;
  tipoEquipo?: {
    tipoEquipoId: number;
    clave: string;
    nombre: string;
    orden: number;
  } | null;
  activo: boolean;
  ordenPdf: number;
  existenciaSie: number;
}) {
  const tipo = serializeEquipoTipoData(item);

  return {
    equipoId: item.itemId.toString(),
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    ...tipo,
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
        select: itemSelect,
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
    if (hasPrismaMissingColumn(error, "item.tipo_equipo_id")) {
      return NextResponse.json(
        { error: "La base de datos no tiene la relación item.tipo_equipo_id. Ejecuta `npm run db:patch:refactor-tipo-equipo` y recarga la app." },
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
  const tipoEquipoId = await resolveTipoEquipoId(prisma, body);

  if (!nombre || typeof tipoEquipoId === "undefined") {
    return NextResponse.json(
      { error: "Payload inválido. 'nombre' es obligatorio y el tipo de equipo indicado no existe." },
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
        tipoEquipoId,
        activo: isActive,
        ordenPdf: nextOrder,
      },
      select: itemSelect,
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ITEM",
      entidadId: created.itemId.toString(),
      detalle: {
        nombre: created.nombre,
        tipoEquipoId: created.tipoEquipoId,
        tipo: serializeEquipoTipoData(created).tipo,
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
    return NextResponse.json({ error: "Payload inválido. orderedItemIds es obligatorio." }, { status: 400 });
  }

  const orderedItemIds = body.orderedItemIds.map(parseItemId);
  if (orderedItemIds.some((itemId) => itemId === null)) {
    return NextResponse.json({ error: "orderedItemIds contiene IDs inválidos." }, { status: 400 });
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
        select: itemSelect,
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
        select: itemSelect,
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
          tipo: serializeEquipoTipoData(item).tipo,
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
