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

function parseItemId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

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

export async function PUT(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

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
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          activo: true,
          ordenPdf: true,
        },
      });

      const nextActive = body.activo === undefined ? existing.activo : Boolean(body.activo);
      const nextOrder =
        nextActive !== existing.activo
          ? await getNextItemOrder(tx, nextActive)
          : body.ordenPdf === undefined
            ? existing.ordenPdf
            : body.ordenPdf;

      await tx.item.update({
        where: { itemId },
        data: {
          nombre,
          activo: nextActive,
          ordenPdf: nextOrder,
        },
      });

      if (codigosResult.codigos !== undefined) {
        await tx.itemCodigo.deleteMany({ where: { itemId } });
        if (codigosResult.codigos.length > 0) {
          await tx.itemCodigo.createMany({
            data: codigosResult.codigos.map((codigo) => ({
              itemId,
              codigo: codigo.codigo,
              aclaracion: codigo.aclaracion,
              orden: codigo.orden,
            })),
          });
        }
      }

      await normalizeItemOrders(tx, nextActive);
      if (existing.activo !== nextActive) {
        await normalizeItemOrders(tx, existing.activo);
      }

      return tx.item.findUniqueOrThrow({
        where: { itemId },
        include: {
          codigos: {
            orderBy: [{ orden: "asc" }, { itemCodigoId: "asc" }],
          },
        },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: updated.itemId.toString(),
      detalle: {
        nombre: updated.nombre,
        activo: updated.activo,
        ordenPdf: updated.ordenPdf,
        codigos: updated.codigos.map((codigo) => ({
          codigo: codigo.codigo,
          aclaracion: codigo.aclaracion,
        })),
      },
    });

    return NextResponse.json(serializeItem(updated));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
      if (code === "P2002") {
        return NextResponse.json(
          { error: isCodigoConflict(error) ? "Uno de los codigos ya esta asignado a otro equipo." : "El nombre ya existe." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          nombre: true,
          activo: true,
        },
      });

      const removed = await tx.item.delete({
        where: { itemId },
      });

      await normalizeItemOrders(tx, existing.activo);

      return removed;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ITEM",
      entidadId: deleted.itemId.toString(),
      detalle: {
        nombre: deleted.nombre,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar el equipo porque tiene registros asociados." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
