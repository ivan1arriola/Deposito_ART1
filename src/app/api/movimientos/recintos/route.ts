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
      tipo: TipoMovimiento.ASIGNACION,
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

  const rows = movimientos.map((movimiento) => {
    let clase: "INTERNO" | "EXTERNO" = "INTERNO";
    let nombre = "";
    let responsableInfo = undefined;

    if (movimiento.destinatarioRecinto) {
      clase = movimiento.destinatarioRecinto.clase === "EXTERNO" ? "EXTERNO" : "INTERNO";
      nombre = movimiento.destinatarioRecinto.nombre;
    } else if (movimiento.destinatarioExterno) {
      const ext = movimiento.destinatarioExterno.personaExterna;
      if (ext) {
        const unidadDestino = ext.unidadDestino || "";
        clase = unidadDestino.startsWith("Interno a la Unidad") ? "INTERNO" : "EXTERNO";
        nombre = unidadDestino.replace("Interno a la Unidad - ", "").replace("Externo a la Unidad - ", "").trim() || "Persona Externa";
        responsableInfo = {
          ci: ext.ci,
          grado: ext.grado,
          nombre: ext.nombre,
          apellido: ext.apellido,
        };
      } else {
        clase = "EXTERNO";
        nombre = "Persona Externa";
      }
    }

    return {
      movimientoId: movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: movimiento.tipo,
      clase,
      nombre,
      items: movimiento.items.map((detail) => ({
        item: detail.item.nombre,
        cantidad: detail.cantidad,
      })),
      observaciones: movimiento.observaciones,
      usuarioEntrega: movimiento.usuarioEntrega ? `${movimiento.usuarioEntrega.apellido} ${movimiento.usuarioEntrega.nombre}`.trim() || movimiento.usuarioEntrega.username : null,
      responsableInfo,
    };
  }).filter(row => row.nombre !== "");

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows,
  });
}
