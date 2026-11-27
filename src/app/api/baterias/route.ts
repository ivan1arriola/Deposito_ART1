import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { LEGACY_CIRR_BATTERY_NAMES } from "@/lib/cirr-classification";
import { moveCatalogId } from "@/lib/catalog-order";
import { isAdminRole } from "@/lib/user-role";

function parseOptionalOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function isLegacyBatteryName(nombre: string) {
  return LEGACY_CIRR_BATTERY_NAMES.includes(nombre as (typeof LEGACY_CIRR_BATTERY_NAMES)[number]);
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
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json(baterias);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json({ error: "Solo admin puede registrar baterias." }, { status: 403 });
  }

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
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.bateria.findMany({
        orderBy: [{ orden: "asc" }, { nombre: "asc" }],
        select: { bateriaId: true, nombre: true },
      });
      const createdBateria = await tx.bateria.create({
        data: {
          nombre,
          orden: existing.length + 1,
        },
      });
      const visibleIds = existing
        .filter((entry) => !isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId);
      const legacyIds = existing
        .filter((entry) => isLegacyBatteryName(entry.nombre))
        .map((entry) => entry.bateriaId);
      const orderedIds = [
        ...moveCatalogId(visibleIds, createdBateria.bateriaId, orden ?? existing.length + 1),
        ...legacyIds,
      ];

      for (const [index, bateriaId] of orderedIds.entries()) {
        await tx.bateria.update({
          where: { bateriaId },
          data: { orden: index + 1 },
        });
      }

      return tx.bateria.findUniqueOrThrow({ where: { bateriaId: createdBateria.bateriaId } });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "BATERIA",
      entidadId: String(created.bateriaId),
      detalle: { nombre: created.nombre, orden: created.orden },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ error: "La bateria ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear la bateria." }, { status: 500 });
  }
}
