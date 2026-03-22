import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCajaPayload = {
  codigoDepositoGeneral?: string | number;
  cantidad?: string | number;
  estanteria?: string;
  itemIds?: Array<string | number>;
  codigosSIE?: string[];
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    item?: unknown;
    estanteria?: unknown;
    itemCodigoSIE?: unknown;
    caja?: unknown;
    cajaItem?: unknown;
    cajaItemCodigoSIE?: unknown;
  };
  return (
    typeof candidate.item !== "undefined" &&
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.itemCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined" &&
    typeof candidate.cajaItem !== "undefined" &&
    typeof candidate.cajaItemCodigoSIE !== "undefined"
  );
}

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function parseCodigoDepositoGeneral(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 99999999) return null;
  return parsed;
}

function parseCantidad(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 99999) return null;
  return parsed;
}

function parseItemId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function normalizeEstanteria(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return null;
  return normalized;
}

function normalizeCodigoSIE(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
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

  const body = (await request.json()) as CreateCajaPayload;
  const codigoDepositoGeneral = parseCodigoDepositoGeneral(body.codigoDepositoGeneral);
  const cantidad = parseCantidad(body.cantidad);
  const estanteria = normalizeEstanteria(body.estanteria);
  const rawItemIds = Array.isArray(body.itemIds) ? body.itemIds : [];
  const itemIdsParsed = rawItemIds.map(parseItemId);
  if (itemIdsParsed.some((itemId) => itemId === null)) {
    return NextResponse.json({ error: "Equipos invalidos seleccionados." }, { status: 400 });
  }
  const itemIds = Array.from(
    new Set((itemIdsParsed as bigint[]).map((itemId) => itemId.toString())),
  ).map((itemId) => BigInt(itemId));

  const rawCodigosSIE = Array.isArray(body.codigosSIE) ? body.codigosSIE : [];
  const codigosSIENormalizados = rawCodigosSIE.map(normalizeCodigoSIE);
  if (codigosSIENormalizados.some((codigo) => codigo === null)) {
    return NextResponse.json(
      { error: "Codigos SIE invalidos. Formatos validos: 8 digitos o 3 letras y 2 numeros." },
      { status: 400 },
    );
  }
  const codigosSIE = Array.from(new Set(codigosSIENormalizados as string[]));

  if (codigoDepositoGeneral === null || cantidad === null || !estanteria || itemIds.length === 0) {
    return NextResponse.json(
      { error: "Payload invalido. codigo de caja, cantidad, nombre de estanteria y equipos son obligatorios." },
      { status: 400 },
    );
  }

  const [estanteriaRegistrada, itemsFound] = await Promise.all([
    prisma.estanteria.findFirst({
      where: { codigo: estanteria },
      select: { codigo: true },
    }),
    prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, nombre: true },
    }),
  ]);

  if (!estanteriaRegistrada) {
    return NextResponse.json({ error: "La estanteria no existe. Registrala primero." }, { status: 400 });
  }
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos seleccionados no existen." }, { status: 400 });
  }

  const itemIdSet = new Set(itemIds.map((itemId) => itemId.toString()));
  const itemNameById = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemNombres = Array.from(itemNameById.values()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  if (codigosSIE.length > 0) {
    const codesFound = await prisma.itemCodigoSIE.findMany({
      where: {
        codigo: { in: codigosSIE },
      },
      include: {
        item: {
          select: {
            itemId: true,
            nombre: true,
          },
        },
      },
    });
    const foundSet = new Set(codesFound.map((entry) => entry.codigo.toUpperCase()));
    const missing = codigosSIE.filter((codigo) => !foundSet.has(codigo));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Los siguientes codigos SIE no existen: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const codigosFueraDeEquipos = Array.from(
      new Set(
        codesFound
          .filter((entry) => !itemIdSet.has(entry.item.itemId.toString()))
          .map((entry) => entry.codigo),
      ),
    );
    if (codigosFueraDeEquipos.length > 0) {
      return NextResponse.json(
        { error: `Estos codigos SIE no pertenecen a los equipos seleccionados: ${codigosFueraDeEquipos.join(", ")}` },
        { status: 400 },
      );
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.caja.create({
        data: {
          codigoDepositoGeneral,
          estanteria,
          cantidad,
        },
      });

      await tx.cajaItem.createMany({
        data: itemIds.map((itemId) => ({
          codigoDepositoGeneral,
          itemId,
        })),
      });

      if (codigosSIE.length > 0) {
        await tx.cajaItemCodigoSIE.createMany({
          data: codigosSIE.map((codigoSIE) => ({
            codigoDepositoGeneral,
            codigoSIE,
          })),
        });
      }
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "CAJA",
      entidadId: String(codigoDepositoGeneral),
      detalle: {
        codigoDepositoGeneral,
        itemIds: itemIds.map((itemId) => itemId.toString()),
        itemNombres,
        cantidad,
        estanteria,
        codigosSIE,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe una caja con ese codigo de deposito general." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear la caja." }, { status: 500 });
  }
}
