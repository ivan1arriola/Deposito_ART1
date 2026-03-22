import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCodigoSIEPayload = {
  codigo?: string;
  talla?: string | null;
  itemId?: string | number;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    item?: unknown;
    itemCodigoSIE?: unknown;
  };
  return typeof candidate.item !== "undefined" && typeof candidate.itemCodigoSIE !== "undefined";
}

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function normalizeCodigoSIE(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function normalizeTalla(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
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
  const itemId = parseItemId(body.itemId);

  if (!codigo || itemId === null) {
    return NextResponse.json(
      { error: "Payload invalido. codigo e item son obligatorios. Formatos validos: 8 digitos o 3 letras y 2 numeros." },
      { status: 400 },
    );
  }

  const item = await prisma.item.findUnique({
    where: { itemId },
    select: { itemId: true, nombre: true },
  });
  if (!item) {
    return NextResponse.json({ error: "El item seleccionado no existe." }, { status: 400 });
  }

  try {
    const created = await prisma.itemCodigoSIE.create({
      data: {
        codigo,
        talla,
        itemId,
      },
      include: {
        item: {
          select: { itemId: true, nombre: true },
        },
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "CODIGO_SIE",
      entidadId: created.codigo,
      detalle: {
        codigo: created.codigo,
        talla: created.talla,
        itemId: created.item.itemId.toString(),
        itemNombre: created.item.nombre,
      },
    });

    return NextResponse.json(
      {
        codigo: created.codigo,
        talla: created.talla,
        itemId: created.item.itemId.toString(),
        itemNombre: created.item.nombre,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ese codigo SIE ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo registrar el codigo SIE." }, { status: 500 });
  }
}
