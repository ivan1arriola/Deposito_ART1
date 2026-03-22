import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    itemCodigoSIE?: unknown;
    cajaItemCodigoSIE?: unknown;
  };
  return typeof candidate.itemCodigoSIE !== "undefined" && typeof candidate.cajaItemCodigoSIE !== "undefined";
}

function normalizeCodigoSIE(value: string) {
  const normalized = decodeURIComponent(value).trim().toUpperCase();
  if (normalized.length < 3 || normalized.length > 40) return null;
  if (!/^[A-Z0-9\-./]+$/.test(normalized)) return null;
  return normalized;
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
      itemId: existing.itemId,
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
