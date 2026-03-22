import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateCajaPayload = {
  codigoDepositoGeneral?: string | number;
  cantidad?: string | number;
  estanteria?: string;
  codigosSIE?: string[];
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    estanteria?: unknown;
    itemCodigoSIE?: unknown;
    caja?: unknown;
    cajaItemCodigoSIE?: unknown;
  };
  return (
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.itemCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined" &&
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

function normalizeEstanteria(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]$/.test(normalized)) return null;
  return normalized;
}

function normalizeCodigoSIE(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 40) return null;
  if (!/^[A-Z0-9\-./]+$/.test(normalized)) return null;
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
  const codigosSIE = Array.from(
    new Set((body.codigosSIE ?? []).map(normalizeCodigoSIE).filter((codigo): codigo is string => codigo !== null)),
  );

  if (codigoDepositoGeneral === null || cantidad === null || !estanteria) {
    return NextResponse.json(
      { error: "Payload invalido. codigo de caja, cantidad y estanteria son obligatorios." },
      { status: 400 },
    );
  }

  const estanteriaRegistrada = await prisma.estanteria.findFirst({
    where: { codigo: estanteria },
    select: { codigo: true },
  });
  if (!estanteriaRegistrada) {
    return NextResponse.json({ error: "La estanteria no existe. Registrala primero." }, { status: 400 });
  }

  let itemNombres: string[] = [];
  if (codigosSIE.length > 0) {
    const codesFound = await prisma.itemCodigoSIE.findMany({
      where: {
        codigo: { in: codigosSIE },
      },
      include: {
        item: {
          select: {
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

    itemNombres = Array.from(new Set(codesFound.map((entry) => entry.item.nombre))).sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" }),
    );
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
