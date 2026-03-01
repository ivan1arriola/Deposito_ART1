import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getNextItemOrder, normalizeItemOrders } from "@/lib/item-ordering";

type ItemPayload = {
  nombre: string;
  activo?: boolean;
  ordenPdf?: number;
  codigos?: Array<{
    codigo: string;
    aclaracion?: string | null;
  }>;
};

function normalizeCodigo(value: string) {
  return value.trim().toUpperCase();
}

function parseCodigos(value: unknown) {
  if (value === undefined) {
    return { ok: true as const, codigos: undefined };
  }

  if (!Array.isArray(value)) {
    return { ok: false as const, error: "Los codigos deben enviarse como una lista." };
  }

  const seen = new Set<string>();
  const codigos: Array<{ codigo: string; aclaracion: string | null; orden: number }> = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false as const, error: "Cada codigo debe incluir un valor valido." };
    }

    const candidate = entry as Record<string, unknown>;
    const codigo = typeof candidate.codigo === "string" ? normalizeCodigo(candidate.codigo) : "";
    const aclaracion = typeof candidate.aclaracion === "string" ? candidate.aclaracion.trim() : "";

    if (!codigo) {
      if (aclaracion) {
        return { ok: false as const, error: "Cada aclaracion debe pertenecer a un codigo." };
      }
      continue;
    }

    if (seen.has(codigo)) {
      return { ok: false as const, error: `El codigo ${codigo} esta repetido en el mismo equipo.` };
    }

    seen.add(codigo);
    codigos.push({
      codigo,
      aclaracion: aclaracion || null,
      orden: codigos.length + 1,
    });
  }

  return { ok: true as const, codigos };
}

function isValidOrder(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

function isCodigoConflict(error: unknown) {
  if (typeof error !== "object" || !error || !("code" in error)) return false;
  if ((error as { code?: string }).code !== "P2002") return false;
  const target = (error as { meta?: { target?: string | string[] } }).meta?.target;
  if (Array.isArray(target)) return target.some((entry) => String(entry).includes("codigo"));
  return typeof target === "string" && target.includes("codigo");
}

function serializeItem(item: {
  itemId: bigint;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
  codigos: Array<{ itemCodigoId: bigint; codigo: string; aclaracion: string | null; orden: number }>;
}) {
  return {
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    activo: item.activo,
    ordenPdf: item.ordenPdf,
    codigos: item.codigos.map((codigo) => ({
      itemCodigoId: codigo.itemCodigoId.toString(),
      codigo: codigo.codigo,
      aclaracion: codigo.aclaracion,
      orden: codigo.orden,
    })),
  };
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const items = await prisma.item.findMany({
    include: {
      codigos: {
        orderBy: [{ orden: "asc" }, { itemCodigoId: "asc" }],
      },
    },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
  });

  return NextResponse.json(items.map(serializeItem));
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const nombre = typeof candidate?.nombre === "string" ? candidate.nombre.trim() : "";
  const codigosResult = parseCodigos(candidate?.codigos);

  if (!nombre || !isValidOrder(candidate?.ordenPdf) || !codigosResult.ok) {
    return NextResponse.json(
      {
        error:
          codigosResult.ok
            ? "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo."
            : codigosResult.error,
      },
      { status: 400 },
    );
  }

  try {
    const isActive = body.activo === undefined ? true : Boolean(body.activo);
    const created = await prisma.$transaction(async (tx) => {
      const createdItem = await tx.item.create({
        data: {
          nombre,
          activo: isActive,
          ordenPdf: body.ordenPdf ?? (await getNextItemOrder(tx, isActive)),
        },
      });

      if (codigosResult.codigos && codigosResult.codigos.length > 0) {
        await tx.itemCodigo.createMany({
          data: codigosResult.codigos.map((codigo) => ({
            itemId: createdItem.itemId,
            codigo: codigo.codigo,
            aclaracion: codigo.aclaracion,
            orden: codigo.orden,
          })),
        });
      }

      await normalizeItemOrders(tx, isActive);

      return tx.item.findUniqueOrThrow({
        where: { itemId: createdItem.itemId },
        include: {
          codigos: {
            orderBy: [{ orden: "asc" }, { itemCodigoId: "asc" }],
          },
        },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ITEM",
      entidadId: created.itemId.toString(),
      detalle: {
        nombre: created.nombre,
        activo: created.activo,
        ordenPdf: created.ordenPdf,
        codigos: created.codigos.map((codigo) => ({
          codigo: codigo.codigo,
          aclaracion: codigo.aclaracion,
        })),
      },
    });

    return NextResponse.json(serializeItem(created), { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json(
        { error: isCodigoConflict(error) ? "Uno de los codigos ya esta asignado a otro equipo." : "El equipo ya existe." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "No se pudo crear el equipo." }, { status: 500 });
  }
}
