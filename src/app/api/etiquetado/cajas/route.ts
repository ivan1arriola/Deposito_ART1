import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCajaPayload = {
  codigoDepositoGeneral?: string | number;
  estanteria?: string;
  piso?: string | number;
  equipos?: Array<{
    equipoId?: string | number;
    cantidad?: string | number;
  }>;
  codigosSIEIds?: Array<string | number>;
};

type ParsedCajaItem = {
  equipoId: bigint;
  cantidad: number;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    equipo?: unknown;
    estanteria?: unknown;
    equipoCodigoSIE?: unknown;
    caja?: unknown;
    cajaEquipo?: unknown;
    cajaEquipoCodigoSIE?: unknown;
  };
  return (
    typeof candidate.equipo !== "undefined" &&
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.equipoCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined" &&
    typeof candidate.cajaEquipo !== "undefined" &&
    typeof candidate.cajaEquipoCodigoSIE !== "undefined"
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
    const candidate = entry as { equipoId?: unknown; cantidad?: unknown };
    const equipoId = parseItemId(candidate.equipoId);
    const cantidad = parseCantidad(candidate.cantidad);
    if (equipoId === null || cantidad === null) return null;
    parsed.push({ equipoId, cantidad });
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
  const parsedItems = parseCajaItems(body.equipos);
  if (!parsedItems || parsedItems.length === 0) {
    return NextResponse.json(
      { error: "Payload invalido. Debes enviar al menos un equipo con cantidad valida." },
      { status: 400 },
    );
  }
  const cantidadesByItemId = new Map<string, number>();
  for (const entry of parsedItems) {
    const key = entry.equipoId.toString();
    cantidadesByItemId.set(key, (cantidadesByItemId.get(key) ?? 0) + entry.cantidad);
  }
  const equipos = Array.from(cantidadesByItemId.entries()).map(([equipoId, cantidad]) => ({
    equipoId: BigInt(equipoId),
    cantidad,
  }));
  const equipoIds = equipos.map((entry) => entry.equipoId);
  const cantidadTotal = equipos.reduce((sum, entry) => sum + entry.cantidad, 0);
  const codigosSIEIds = parseCodigoSIEIds(body.codigosSIEIds);
  if (codigosSIEIds === null) {
    return NextResponse.json({ error: "Payload invalido. codigosSIEIds debe ser una lista de IDs numericos." }, { status: 400 });
  }

  if (!estanteria || piso === null || equipoIds.length === 0 || cantidadTotal <= 0) {
    return NextResponse.json(
      { error: "Payload invalido. nombre de estanteria, piso y equipos con cantidad son obligatorios." },
      { status: 400 },
    );
  }

  const [estanteriaRegistrada, equiposFound] = await Promise.all([
    prisma.estanteria.findUnique({
      where: {
        codigo_piso: {
          codigo: estanteria,
          piso,
        },
      },
      select: { codigo: true, piso: true },
    }),
    prisma.equipo.findMany({
      where: { equipoId: { in: equipoIds } },
      select: { equipoId: true, nombre: true },
    }),
  ]);

  if (!estanteriaRegistrada) {
    return NextResponse.json({ error: "La estanteria en ese piso no existe. Registrala primero." }, { status: 400 });
  }
  if (equiposFound.length !== equipoIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos seleccionados no existen." }, { status: 400 });
  }

  const equipoIdSet = new Set(equipoIds.map((equipoId) => equipoId.toString()));
  const equipoNameById = new Map(equiposFound.map((equipo) => [equipo.equipoId.toString(), equipo.nombre]));
  const equipoNombres = Array.from(equipoNameById.values()).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  let codigosSIEDetalle: Array<{
    codigoSIEId: string;
    codigo: string;
    talla: string;
    equipoId: string;
    equipoNombre: string;
  }> = [];

  if (codigosSIEIds.length > 0) {
    const codesFound = await prisma.equipoCodigoSIE.findMany({
      where: {
        equipoCodigoSIEId: { in: codigosSIEIds },
      },
      include: {
        equipo: {
          select: {
            equipoId: true,
            nombre: true,
          },
        },
      },
    });
    const foundSet = new Set(codesFound.map((entry) => entry.equipoCodigoSIEId.toString()));
    const missing = codigosSIEIds
      .map((entry) => entry.toString())
      .filter((codigoSIEId) => !foundSet.has(codigoSIEId));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Los siguientes IDs de codigos SIE no existen: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const codeById = new Map(codesFound.map((entry) => [entry.equipoCodigoSIEId.toString(), entry]));
    codigosSIEDetalle = codigosSIEIds
      .map((entry) => codeById.get(entry.toString()))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map((entry) => ({
        codigoSIEId: entry.equipoCodigoSIEId.toString(),
        codigo: entry.codigo,
        talla: entry.talla,
        equipoId: entry.equipo.equipoId.toString(),
        equipoNombre: entry.equipo.nombre,
      }));

    const codigosFueraDeEquipos = Array.from(
      new Set(
        codigosSIEDetalle
          .filter((entry) => !equipoIdSet.has(entry.equipoId))
          .map((entry) => `${entry.codigo} (${entry.equipoNombre}, talla ${entry.talla})`),
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

        await tx.cajaEquipo.createMany({
          data: equipos.map((entry) => ({
            codigoDepositoGeneral: codigoAsignado,
            equipoId: entry.equipoId,
            cantidad: entry.cantidad,
          })),
        });

        if (codigosSIEIds.length > 0) {
          await tx.cajaEquipoCodigoSIE.createMany({
            data: codigosSIEIds.map((equipoCodigoSIEId) => ({
              codigoDepositoGeneral: codigoAsignado,
              equipoCodigoSIEId,
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
          equipos: equipos.map((entry) => ({
            equipoId: entry.equipoId.toString(),
            cantidad: entry.cantidad,
          })),
          equipoNombres,
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
