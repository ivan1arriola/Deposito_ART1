import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCodigoSIEPayload = {
  codigo?: string;
  talla?: string | null;
  equipoId?: string | number;
  allowDuplicateCodigo?: boolean;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    equipo?: unknown;
    equipoCodigoSIE?: unknown;
  };
  return typeof candidate.equipo !== "undefined" && typeof candidate.equipoCodigoSIE !== "undefined";
}

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function normalizeCodigoSIE(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function normalizeTalla(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : "-";
}

function parseItemId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as CreateCodigoSIEPayload;
  const codigo = normalizeCodigoSIE(body.codigo);
  const talla = normalizeTalla(body.talla);
  const equipoId = parseItemId(body.equipoId);
  const allowDuplicateCodigo = body.allowDuplicateCodigo === true;

  if (!codigo || equipoId === null) {
    return NextResponse.json(
      { error: "Payload invalido. codigo e equipo son obligatorios. Formatos validos: 8 digitos o 3 letras y 2 numeros." },
      { status: 400 },
    );
  }

  const equipo = await prisma.equipo.findUnique({
    where: { equipoId },
    select: { equipoId: true, nombre: true },
  });
  if (!equipo) {
    return NextResponse.json({ error: "El equipo seleccionado no existe." }, { status: 400 });
  }

  const existingTuple = await prisma.equipoCodigoSIE.findFirst({
    where: {
      codigo,
      talla,
      equipoId,
    },
    select: { equipoCodigoSIEId: true },
  });
  if (existingTuple) {
    return NextResponse.json({ error: "Ya existe un codigo SIE con la misma combinacion de codigo, talla e equipo." }, { status: 409 });
  }

  if (!allowDuplicateCodigo) {
    const existingSameCodigo = await prisma.equipoCodigoSIE.findMany({
      where: {
        codigo,
        NOT: {
          talla,
          equipoId,
        },
      },
      include: {
        equipo: {
          select: {
            equipoId: true,
            nombre: true,
          },
        },
      },
      orderBy: [{ equipo: { nombre: "asc" } }, { talla: "asc" }],
    });

    if (existingSameCodigo.length > 0) {
      const duplicatesSummary = existingSameCodigo
        .map((entry) => `${entry.equipo.nombre} (talla ${entry.talla})`)
        .join("; ");
      return NextResponse.json(
        {
          error:
            `El codigo SIE ${codigo} ya existe en: ${duplicatesSummary}. ` +
            "Si deseas registrarlo igual, confirma la acción y vuelve a intentar.",
        },
        { status: 409 },
      );
    }
  }

  try {
    const created = await prisma.equipoCodigoSIE.create({
      data: {
        codigo,
        talla,
        equipoId,
      },
      include: {
        equipo: {
          select: { equipoId: true, nombre: true },
        },
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "CODIGO_SIE",
      entidadId: created.equipoCodigoSIEId.toString(),
      detalle: {
        codigoSIEId: created.equipoCodigoSIEId.toString(),
        codigo: created.codigo,
        talla: created.talla,
        equipoId: created.equipo.equipoId.toString(),
        equipoNombre: created.equipo.nombre,
      },
    });

    return NextResponse.json(
      {
        codigoSIEId: created.equipoCodigoSIEId.toString(),
        codigo: created.codigo,
        talla: created.talla,
        equipoId: created.equipo.equipoId.toString(),
        equipoNombre: created.equipo.nombre,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un codigo SIE con la misma combinacion de codigo, talla e equipo." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo registrar el codigo SIE." }, { status: 500 });
  }
}
