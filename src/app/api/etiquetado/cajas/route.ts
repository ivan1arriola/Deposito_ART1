import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCajaPayload = {
  codigoDepositoGeneral?: string | number;
  estanteria?: string;
  piso?: string | number;
  items?: Array<{
    itemId?: string | number;
    cantidad?: string | number;
  }>;
  codigosSIEIds?: Array<string | number>;
};

type ParsedCajaItem = {
  itemId: bigint;
  cantidad: number;
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

function parsePiso(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2) return null;
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

function parseCodigoSIEId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseCajaItems(value: unknown): ParsedCajaItem[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const parsed: ParsedCajaItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const candidate = entry as { itemId?: unknown; cantidad?: unknown };
    const itemId = parseItemId(candidate.itemId);
    const cantidad = parseCantidad(candidate.cantidad);
    if (itemId === null || cantidad === null) return null;
    parsed.push({ itemId, cantidad });
  }

  return parsed;
}

function parseCodigoSIEIds(value: unknown): bigint[] | null {
  if (typeof value === "undefined") return [];
  if (!Array.isArray(value)) return null;

  const parsed = value.map(parseCodigoSIEId);
  if (parsed.some((entry) => entry === null)) return null;

  return Array.from(new Set((parsed as bigint[]).map((entry) => entry.toString()))).map((entry) => BigInt(entry));
}

async function buildNextCodigoDepositoGeneral(tx: Pick<typeof prisma, "caja">) {
  const ultimaCaja = await tx.caja.findFirst({
    select: { codigoDepositoGeneral: true },
    orderBy: [{ codigoDepositoGeneral: "desc" }],
  });
  const siguienteCodigo = (ultimaCaja?.codigoDepositoGeneral ?? 0) + 1;
  if (!Number.isInteger(siguienteCodigo) || siguienteCodigo <= 0 || siguienteCodigo > 99999999) {
    throw new Error("No se pudo asignar un numero de caja valido.");
  }
  return siguienteCodigo;
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
  const codigoDepositoGeneralSolicitado =
    typeof body.codigoDepositoGeneral === "undefined" ? null : parseCodigoDepositoGeneral(body.codigoDepositoGeneral);
  if (typeof body.codigoDepositoGeneral !== "undefined" && codigoDepositoGeneralSolicitado === null) {
    return NextResponse.json({ error: "Payload invalido. codigo de caja invalido." }, { status: 400 });
  }
  const estanteria = normalizeEstanteria(body.estanteria);
  const piso = parsePiso(body.piso);
  const parsedItems = parseCajaItems(body.items);
  if (!parsedItems || parsedItems.length === 0) {
    return NextResponse.json(
      { error: "Payload invalido. Debes enviar al menos un equipo con cantidad valida." },
      { status: 400 },
    );
  }
  const cantidadesByItemId = new Map<string, number>();
  for (const entry of parsedItems) {
    const key = entry.itemId.toString();
    cantidadesByItemId.set(key, (cantidadesByItemId.get(key) ?? 0) + entry.cantidad);
  }
  const items = Array.from(cantidadesByItemId.entries()).map(([itemId, cantidad]) => ({
    itemId: BigInt(itemId),
    cantidad,
  }));
  const itemIds = items.map((entry) => entry.itemId);
  const cantidadTotal = items.reduce((sum, entry) => sum + entry.cantidad, 0);
  const codigosSIEIds = parseCodigoSIEIds(body.codigosSIEIds);
  if (codigosSIEIds === null) {
    return NextResponse.json({ error: "Payload invalido. codigosSIEIds debe ser una lista de IDs numericos." }, { status: 400 });
  }

  if (!estanteria || piso === null || itemIds.length === 0 || cantidadTotal <= 0) {
    return NextResponse.json(
      { error: "Payload invalido. nombre de estanteria, piso y equipos con cantidad son obligatorios." },
      { status: 400 },
    );
  }

  const [estanteriaRegistrada, itemsFound] = await Promise.all([
    prisma.estanteria.findUnique({
      where: {
        codigo_piso: {
          codigo: estanteria,
          piso,
        },
      },
      select: { codigo: true, piso: true },
    }),
    prisma.item.findMany({
      where: { itemId: { in: itemIds } },
      select: { itemId: true, nombre: true },
    }),
  ]);

  if (!estanteriaRegistrada) {
    return NextResponse.json({ error: "La estanteria en ese piso no existe. Registrala primero." }, { status: 400 });
  }
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos seleccionados no existen." }, { status: 400 });
  }

  const itemIdSet = new Set(itemIds.map((itemId) => itemId.toString()));
  const itemNameById = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemNombres = Array.from(itemNameById.values()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  let codigosSIEDetalle: Array<{
    codigoSIEId: string;
    codigo: string;
    talla: string;
    itemId: string;
    itemNombre: string;
  }> = [];

  if (codigosSIEIds.length > 0) {
    const codesFound = await prisma.itemCodigoSIE.findMany({
      where: {
        itemCodigoSIEId: { in: codigosSIEIds },
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
    const foundSet = new Set(codesFound.map((entry) => entry.itemCodigoSIEId.toString()));
    const missing = codigosSIEIds
      .map((entry) => entry.toString())
      .filter((codigoSIEId) => !foundSet.has(codigoSIEId));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Los siguientes IDs de codigos SIE no existen: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const codeById = new Map(codesFound.map((entry) => [entry.itemCodigoSIEId.toString(), entry]));
    codigosSIEDetalle = codigosSIEIds
      .map((entry) => codeById.get(entry.toString()))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map((entry) => ({
        codigoSIEId: entry.itemCodigoSIEId.toString(),
        codigo: entry.codigo,
        talla: entry.talla,
        itemId: entry.item.itemId.toString(),
        itemNombre: entry.item.nombre,
      }));

    const codigosFueraDeEquipos = Array.from(
      new Set(
        codigosSIEDetalle
          .filter((entry) => !itemIdSet.has(entry.itemId))
          .map((entry) => `${entry.codigo} (${entry.itemNombre}, talla ${entry.talla})`),
      ),
    );
    if (codigosFueraDeEquipos.length > 0) {
      return NextResponse.json(
        {
          error: `Estos codigos SIE no pertenecen a los equipos seleccionados: ${codigosFueraDeEquipos.join(", ")}`,
        },
        { status: 400 },
      );
    }
  }

  const maxAttempts = codigoDepositoGeneralSolicitado === null ? 3 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const codigoDepositoGeneral = await prisma.$transaction(async (tx) => {
        const codigoAsignado = codigoDepositoGeneralSolicitado ?? (await buildNextCodigoDepositoGeneral(tx));

        await tx.caja.create({
          data: {
            codigoDepositoGeneral: codigoAsignado,
            estanteria,
            piso,
          },
        });

        await tx.cajaItem.createMany({
          data: items.map((entry) => ({
            codigoDepositoGeneral: codigoAsignado,
            itemId: entry.itemId,
            cantidad: entry.cantidad,
          })),
        });

        if (codigosSIEIds.length > 0) {
          await tx.cajaItemCodigoSIE.createMany({
            data: codigosSIEIds.map((itemCodigoSIEId) => ({
              codigoDepositoGeneral: codigoAsignado,
              itemCodigoSIEId,
            })),
          });
        }

        return codigoAsignado;
      });

      await logAudit({
        usuarioId: auth.user.usuarioId,
        accion: "CREATE",
        entidad: "CAJA",
        entidadId: String(codigoDepositoGeneral),
        detalle: {
          codigoDepositoGeneral,
          items: items.map((entry) => ({
            itemId: entry.itemId.toString(),
            cantidad: entry.cantidad,
          })),
          itemNombres,
          cantidad: cantidadTotal,
          estanteria,
          piso,
          codigosSIE: codigosSIEDetalle,
        },
      });

      return NextResponse.json({ ok: true, codigoDepositoGeneral }, { status: 201 });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code: string }).code === "P2002" &&
        codigoDepositoGeneralSolicitado === null &&
        attempt < maxAttempts - 1
      ) {
        continue;
      }

      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        (error as { code: string }).code === "P2002" &&
        codigoDepositoGeneralSolicitado === null
      ) {
        return NextResponse.json({ error: "No se pudo asignar un numero de caja unico. Intenta nuevamente." }, { status: 409 });
      }
      if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
        return NextResponse.json({ error: "Ya existe una caja con ese codigo de deposito general." }, { status: 409 });
      }
      if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2022") {
        return NextResponse.json(
          {
            error:
              "La base de datos de etiquetado esta desactualizada. Aplica la actualizacion de esquema correspondiente.",
          },
          { status: 500 },
        );
      }
      if (error instanceof Error && error.message === "No se pudo asignar un numero de caja valido.") {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ error: "No se pudo crear la caja." }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "No se pudo crear la caja." }, { status: 500 });
}
