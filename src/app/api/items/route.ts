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
          ordenPdf: body.ordenPdf ?? (await getNextItemOrder(tx, isActive)),
        },
      });

      await normalizeItemOrders(tx, isActive);

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
