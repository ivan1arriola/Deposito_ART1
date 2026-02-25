import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type ItemPayload = {
  nombre: string;
  requiereTalle?: boolean;
  activo?: boolean;
};

function isValidPayload(body: unknown): body is ItemPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.nombre === "string" && candidate.nombre.trim() !== "";
}

function serializeItem(item: { itemId: bigint; nombre: string; requiereTalle: boolean; activo: boolean }) {
  return {
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    requiereTalle: item.requiereTalle,
    activo: item.activo,
  };
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const items = await prisma.item.findMany({
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(items.map(serializeItem));
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. 'nombre' es obligatorio." }, { status: 400 });
  }

  try {
    const created = await prisma.item.create({
      data: {
        nombre: body.nombre.trim(),
        requiereTalle: Boolean(body.requiereTalle),
        activo: body.activo === undefined ? true : Boolean(body.activo),
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ITEM",
      entidadId: created.itemId.toString(),
      detalle: {
        nombre: created.nombre,
        requiereTalle: created.requiereTalle,
        activo: created.activo,
      },
    });

    return NextResponse.json(serializeItem(created), { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El item ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el item." }, { status: 500 });
  }
}
