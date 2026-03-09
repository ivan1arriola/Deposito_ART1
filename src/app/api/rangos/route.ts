import { NextResponse } from "next/server";
import { TipoPersonal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { moveCatalogId } from "@/lib/catalog-order";
import { invalidateRangoTipoCountCache } from "@/lib/reference-data-cache";

function parseOptionalOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseTipoPersonal(value: string | null) {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "SUBALTERNO") return TipoPersonal.SUBALTERNO;
  if (normalized === "OFICIAL") return TipoPersonal.OFICIAL;
  if (normalized === "SUBOFICIAL") return TipoPersonal.SUBOFICIAL;
  return undefined;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const parsedTipo = parseTipoPersonal(url.searchParams.get("tipo"));
  if (parsedTipo === undefined) {
    return NextResponse.json({ error: "Tipo de personal invalido. Usa SUBALTERNO, OFICIAL o SUBOFICIAL." }, { status: 400 });
  }
  const tipo = parsedTipo ?? TipoPersonal.SUBALTERNO;

  const rangos = await prisma.rango.findMany({
    where: { tipo },
    orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
  });

  return NextResponse.json(rangos);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "manage_users");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const abreviacion = typeof candidate?.abreviacion === "string" ? candidate.abreviacion.trim() : "";
  const nombreCompleto = typeof candidate?.nombreCompleto === "string" ? candidate.nombreCompleto.trim() : "";
  const orden = parseOptionalOrden(candidate?.orden);

  if (!abreviacion || !nombreCompleto || orden === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'abreviacion' y 'nombreCompleto' son obligatorios; 'orden' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const existing = await tx.rango.findMany({
        where: { tipo: TipoPersonal.SUBALTERNO },
        orderBy: [{ orden: "asc" }, { rangoId: "asc" }],
        select: { rangoId: true },
      });
      const createdRango = await tx.rango.create({
        data: {
          tipo: TipoPersonal.SUBALTERNO,
          abreviacion,
          nombreCompleto,
          orden: existing.length + 1,
        },
      });
      const orderedIds = moveCatalogId(existing.map((entry) => entry.rangoId), createdRango.rangoId, orden ?? existing.length + 1);

      for (const [index, rangoId] of orderedIds.entries()) {
        await tx.rango.update({
          where: { rangoId },
          data: { orden: index + 1 },
        });
      }

      return tx.rango.findUniqueOrThrow({ where: { rangoId: createdRango.rangoId } });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(created.rangoId),
      detalle: { abreviacion: created.abreviacion, nombreCompleto: created.nombreCompleto, orden: created.orden },
    });
    invalidateRangoTipoCountCache();

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "La abreviacion o el nombre completo ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el grado del personal." }, { status: 500 });
  }
}
