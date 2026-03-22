import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type UpdateCodigoSIEPayload = {
  codigo?: string;
  talla?: string | null;
  itemId?: string | number;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    item?: unknown;
    itemCodigoSIE?: unknown;
    cajaItemCodigoSIE?: unknown;
  };
  return (
    typeof candidate.item !== "undefined" &&
    typeof candidate.itemCodigoSIE !== "undefined" &&
    typeof candidate.cajaItemCodigoSIE !== "undefined"
  );
}

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function normalizeCodigoSIE(value: string) {
  const normalized = decodeURIComponent(value).trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function normalizeCodigoSIEInput(value: unknown) {
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

export async function PUT(request: Request, context: { params: Promise<{ codigo: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const { codigo: codigoParam } = await context.params;
  const originalCodigo = normalizeCodigoSIE(codigoParam);
  if (!originalCodigo) {
    return NextResponse.json({ error: "Codigo SIE invalido." }, { status: 400 });
  }

  const body = (await request.json()) as UpdateCodigoSIEPayload;
  const codigo = normalizeCodigoSIEInput(body.codigo);
  const talla = normalizeTalla(body.talla);
  const itemId = parseItemId(body.itemId);

  if (!codigo || itemId === null) {
    return NextResponse.json(
      { error: "Payload invalido. codigo e item son obligatorios. Formatos validos: 8 digitos o 3 letras y 2 numeros." },
      { status: 400 },
    );
  }

  const [existing, item] = await Promise.all([
    prisma.itemCodigoSIE.findUnique({
      where: { codigo: originalCodigo },
      include: {
        item: {
          select: { itemId: true, nombre: true },
        },
      },
    }),
    prisma.item.findUnique({
      where: { itemId },
      select: { itemId: true, nombre: true },
    }),
  ]);

  if (!existing) {
    return NextResponse.json({ error: "Codigo SIE no encontrado." }, { status: 404 });
  }
  if (!item) {
    return NextResponse.json({ error: "El item seleccionado no existe." }, { status: 400 });
  }

  const cajasVinculadas = await prisma.cajaItemCodigoSIE.count({
    where: { codigoSIE: existing.codigo },
  });

  if (existing.itemId.toString() !== itemId.toString() && cajasVinculadas > 0) {
    return NextResponse.json(
      { error: "No se puede cambiar el item de un codigo SIE que ya esta vinculado a cajas." },
      { status: 409 },
    );
  }

  try {
    if (originalCodigo === codigo) {
      const updated = await prisma.itemCodigoSIE.update({
        where: { codigo: originalCodigo },
        data: { talla, itemId },
        include: {
          item: {
            select: { itemId: true, nombre: true },
          },
        },
      });

      await logAudit({
        usuarioId: auth.user.usuarioId,
        accion: "UPDATE",
        entidad: "CODIGO_SIE",
        entidadId: updated.codigo,
        detalle: {
          codigoAntes: existing.codigo,
          codigoDespues: updated.codigo,
          tallaAntes: existing.talla,
          tallaDespues: updated.talla,
          itemIdAntes: existing.item.itemId.toString(),
          itemIdDespues: updated.item.itemId.toString(),
          itemNombreAntes: existing.item.nombre,
          itemNombreDespues: updated.item.nombre,
          cajasVinculadas,
        },
      });

      return NextResponse.json({
        codigo: updated.codigo,
        talla: updated.talla,
        itemId: updated.item.itemId.toString(),
        itemNombre: updated.item.nombre,
      });
    }

    const targetExists = await prisma.itemCodigoSIE.findUnique({
      where: { codigo },
      select: { codigo: true },
    });
    if (targetExists) {
      return NextResponse.json({ error: "Ese codigo SIE ya existe." }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.itemCodigoSIE.create({
        data: {
          codigo,
          talla,
          itemId,
        },
      });

      await tx.cajaItemCodigoSIE.updateMany({
        where: { codigoSIE: originalCodigo },
        data: { codigoSIE: codigo },
      });

      await tx.itemCodigoSIE.delete({
        where: { codigo: originalCodigo },
      });

      return tx.itemCodigoSIE.findUnique({
        where: { codigo },
        include: {
          item: {
            select: { itemId: true, nombre: true },
          },
        },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "No se pudo actualizar el codigo SIE." }, { status: 500 });
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "CODIGO_SIE",
      entidadId: updated.codigo,
      detalle: {
        codigoAntes: existing.codigo,
        codigoDespues: updated.codigo,
        tallaAntes: existing.talla,
        tallaDespues: updated.talla,
        itemIdAntes: existing.item.itemId.toString(),
        itemIdDespues: updated.item.itemId.toString(),
        itemNombreAntes: existing.item.nombre,
        itemNombreDespues: updated.item.nombre,
        cajasVinculadasMigradas: cajasVinculadas,
      },
    });

    return NextResponse.json({
      codigo: updated.codigo,
      talla: updated.talla,
      itemId: updated.item.itemId.toString(),
      itemNombre: updated.item.nombre,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ese codigo SIE ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el codigo SIE." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ codigo: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const { codigo: codigoParam } = await context.params;
  const codigo = normalizeCodigoSIE(codigoParam);
  if (!codigo) {
    return NextResponse.json({ error: "Codigo SIE invalido." }, { status: 400 });
  }

  const existing = await prisma.itemCodigoSIE.findUnique({
    where: { codigo },
    include: {
      item: {
        select: { itemId: true, nombre: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Codigo SIE no encontrado." }, { status: 404 });
  }

  const cajasVinculadas = await prisma.cajaItemCodigoSIE.count({
    where: {
      codigoSIE: existing.codigo,
    },
  });

  try {
    await prisma.itemCodigoSIE.delete({
      where: {
        codigo: existing.codigo,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "CODIGO_SIE",
      entidadId: existing.codigo,
      detalle: {
        codigo: existing.codigo,
        talla: existing.talla,
        itemId: existing.item.itemId.toString(),
        itemNombre: existing.item.nombre,
        cajasVinculadasEliminadas: cajasVinculadas,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el codigo SIE." }, { status: 500 });
  }
}
