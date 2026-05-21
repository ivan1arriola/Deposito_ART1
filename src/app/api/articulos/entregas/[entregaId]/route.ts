import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function parseEntregaId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ entregaId: string }> }
) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { entregaId: entregaIdParam } = await context.params;
  const entregaId = parseEntregaId(entregaIdParam);
  if (entregaId === null) {
    return NextResponse.json({ error: "entregaId inválido." }, { status: 400 });
  }

  // 1. Check if the delivery exists
  const existing = await prisma.articuloEntregaPersonal.findUnique({
    where: { articuloEntregaPersonalId: entregaId },
    include: {
      personal: {
        select: {
          nombre1: true,
          apellido1: true,
        },
      },
      movimientosStock: {
        include: {
          articulo: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "La entrega no existe o ya fue eliminada." },
      { status: 404 }
    );
  }

  try {
    // 2. Perform the deletion inside a transaction
    await prisma.$transaction(async (tx) => {
      // First, delete the movements (due to RESTRICT constraint)
      await tx.articuloStockMovimiento.deleteMany({
        where: { articuloEntregaPersonalId: entregaId },
      });

      // Second, delete the main delivery record
      await tx.articuloEntregaPersonal.delete({
        where: { articuloEntregaPersonalId: entregaId },
      });
    });

    // 3. Log audit trail
    const pNombre = `${existing.personal.apellido1}, ${existing.personal.nombre1}`;
    const itemsSummary = existing.movimientosStock
      .map((m) => `${m.articulo.nombre} (x${m.cantidad})`)
      .join(", ");

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ARTICULO_ENTREGA",
      entidadId: String(entregaId),
      detalle: {
        evento: "ARTICULO_ENTREGA_ELIMINADA",
        personalCi: existing.personalCi,
        personalNombre: pNombre,
        comentarioOriginal: existing.comentario,
        items: itemsSummary,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "No se pudo eliminar el registro de entrega de artículos." },
      { status: 500 }
    );
  }
}
