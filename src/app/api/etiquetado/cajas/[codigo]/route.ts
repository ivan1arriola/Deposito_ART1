import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    caja?: unknown;
    cajaItem?: unknown;
  };
  return typeof candidate.caja !== "undefined" && typeof candidate.cajaItem !== "undefined";
}

function parseCodigoCaja(value: string) {
  const parsed = Number(decodeURIComponent(value).trim());
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 99999999) return null;
  return parsed;
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
  const codigoDepositoGeneral = parseCodigoCaja(codigoParam);
  if (codigoDepositoGeneral === null) {
    return NextResponse.json({ error: "Codigo de caja invalido." }, { status: 400 });
  }

  const existing = await prisma.caja.findUnique({
    where: { codigoDepositoGeneral },
    include: {
      items: {
        include: {
          item: {
            select: {
              itemId: true,
              nombre: true,
            },
          },
        },
      },
      codigosSIE: {
        include: {
          itemCodigoSIE: {
            select: {
              codigo: true,
              talla: true,
              item: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Caja no encontrada." }, { status: 404 });
  }

  try {
    await prisma.caja.delete({
      where: { codigoDepositoGeneral },
    });

    const itemNombres =
      existing.items.length > 0
        ? existing.items
            .map((entry) => entry.item.nombre)
            .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        : Array.from(new Set(existing.codigosSIE.map((entry) => entry.itemCodigoSIE.item.nombre))).sort((a, b) =>
            a.localeCompare(b, "es", { sensitivity: "base" },
          ));

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "CAJA",
      entidadId: String(existing.codigoDepositoGeneral),
      detalle: {
        codigoDepositoGeneral: existing.codigoDepositoGeneral,
        itemIds: existing.items.map((entry) => entry.item.itemId.toString()),
        itemNombres,
        cantidad: existing.cantidad,
        estanteria: existing.estanteria,
        codigosSIE: existing.codigosSIE.map((entry) => ({
          codigo: entry.itemCodigoSIE.codigo,
          talla: entry.itemCodigoSIE.talla,
        })),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la caja." }, { status: 500 });
  }
}
