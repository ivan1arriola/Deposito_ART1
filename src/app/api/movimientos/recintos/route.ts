import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { TipoMovimiento } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const movimientos = await prisma.movimiento.findMany({
    where: {
      tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION, TipoMovimiento.ASIGNACION] },
      OR: [
        { destinatarioRecinto: { isNot: null } },
        { destinatarioExterno: { isNot: null } }
      ]
    },
    orderBy: [{ fecha: "desc" }, { movimientoId: "desc" }],
    include: {
      destinatarioRecinto: true,
      destinatarioExterno: {
        include: {
          personaExterna: true
        }
      },
      usuarioEntrega: {
        select: {
          nombre: true,
          apellido: true,
          username: true
        }
      },
      items: {
        include: {
          item: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  const rows = movimientos.flatMap((movimiento) => {
    let clase: "INTERNO" | "EXTERNO" = "INTERNO";
    let nombre = "";

    if (movimiento.destinatarioRecinto) {
      clase = movimiento.destinatarioRecinto.clase === "EXTERNO" ? "EXTERNO" : "INTERNO";
      nombre = movimiento.destinatarioRecinto.nombre;
    } else if (movimiento.destinatarioExterno) {
      clase = "EXTERNO";
      nombre = movimiento.destinatarioExterno.personaExterna
        ? `${movimiento.destinatarioExterno.personaExterna.apellido} ${movimiento.destinatarioExterno.personaExterna.nombre}`.trim()
        : "Persona Externa";
    } else {
      return [];
    }

    return movimiento.items.map((detail) => ({
      movimientoId: movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: movimiento.tipo,
      clase,
      nombre,
      item: detail.item.nombre,
      cantidad: detail.cantidad,
      observaciones: movimiento.observaciones,
      usuarioEntrega: movimiento.usuarioEntrega ? `${movimiento.usuarioEntrega.apellido} ${movimiento.usuarioEntrega.nombre}`.trim() || movimiento.usuarioEntrega.username : null,
    }));
  });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows,
  });
}
