import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { LEGACY_CIRR_BATTERY_NAMES } from "@/lib/cirr-classification";

type BateriaPayload = {
  nombre: string;
};

function isValidPayload(body: unknown): body is BateriaPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.nombre === "string" && candidate.nombre.trim() !== "";
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const baterias = await prisma.bateria.findMany({
    where: {
      nombre: {
        notIn: [...LEGACY_CIRR_BATTERY_NAMES],
      },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(baterias);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo admin puede registrar baterias." }, { status: 403 });
  }

  const body = await req.json();

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. 'nombre' es obligatorio." }, { status: 400 });
  }

  if (LEGACY_CIRR_BATTERY_NAMES.includes(body.nombre.trim() as (typeof LEGACY_CIRR_BATTERY_NAMES)[number])) {
    return NextResponse.json({ error: "Esa categoria corresponde a un grado, no a una bateria." }, { status: 400 });
  }

  try {
    const created = await prisma.bateria.create({
      data: {
        nombre: body.nombre.trim(),
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "BATERIA",
      entidadId: String(created.bateriaId),
      detalle: { nombre: created.nombre },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "La bateria ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear la bateria." }, { status: 500 });
  }
}
