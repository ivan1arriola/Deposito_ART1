import "server-only";

import { type Prisma } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import {
  type ArticuloEntregaHistorialEntry,
  type ArticuloEntregaHistorialItem,
} from "@/lib/articulo-entregas-history";
import { rangoAbreviacionLabel } from "@/lib/formatters";
import { prisma } from "@/lib/prisma";

const articuloEntregaHistorialInclude = {
  personal: {
    select: {
      ci: true,
      nombre1: true,
      nombre2: true,
      apellido1: true,
      apellido2: true,
      rango: {
        select: {
          abreviacion: true,
          nombreCompleto: true,
        },
      },
    },
  },
  ordenante: {
    select: {
      ci: true,
      nombre1: true,
      nombre2: true,
      apellido1: true,
      apellido2: true,
      rango: {
        select: {
          abreviacion: true,
          nombreCompleto: true,
        },
      },
    },
  },
  usuarioEntrega: {
    select: {
      usuarioId: true,
      nombre: true,
      apellido: true,
      rango: {
        select: {
          abreviacion: true,
        },
      },
    },
  },
  movimientosStock: {
    include: {
      articulo: {
        select: {
          nombre: true,
          tipo: true,
        },
      },
    },
  },
} satisfies Prisma.ArticuloEntregaPersonalInclude;

function buildMilitaryLabel(personal: {
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: { abreviacion: string };
}) {
  const apellidos = `${personal.apellido1} ${personal.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
  const nombres = `${personal.nombre1} ${personal.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
  return `${personal.rango.abreviacion} ${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
}

function buildUsuarioEntregaLabel(usuario: {
  apellido: string;
  nombre: string;
  rango: { abreviacion: string } | null;
}) {
  return `${rangoAbreviacionLabel(usuario.rango, "")} ${usuario.apellido}, ${usuario.nombre}`.replace(/\s+/g, " ").trim();
}

function compareItemsByName(left: ArticuloEntregaHistorialItem, right: ArticuloEntregaHistorialItem) {
  return left.nombre.localeCompare(right.nombre, "es");
}

function serializeArticuloEntregaHistorialEntry(
  entrega: Prisma.ArticuloEntregaPersonalGetPayload<{ include: typeof articuloEntregaHistorialInclude }>,
): ArticuloEntregaHistorialEntry {
  return {
    articuloEntregaPersonalId: String(entrega.articuloEntregaPersonalId),
    personalCi: entrega.personalCi,
    personalLabel: buildMilitaryLabel(entrega.personal),
    ordenanteCi: entrega.ordenanteCi,
    ordenanteLabel: buildMilitaryLabel(entrega.ordenante),
    usuarioEntregaId: entrega.usuarioEntregaId,
    usuarioEntregaLabel: buildUsuarioEntregaLabel(entrega.usuarioEntrega),
    fecha: formatDateOnlyFromDate(entrega.fecha) ?? "",
    comentario: entrega.comentario,
    equipos: entrega.movimientosStock
      .map((movimiento) => ({
        articuloId: movimiento.articuloId,
        nombre: movimiento.articulo.nombre,
        tipo: movimiento.articulo.tipo,
        cantidad: movimiento.cantidad,
      }))
      .sort(compareItemsByName),
  };
}

export async function listArticuloEntregasHistorial() {
  const entregas = await prisma.articuloEntregaPersonal.findMany({
    include: articuloEntregaHistorialInclude,
    orderBy: {
      fecha: "desc",
    },
  });

  return entregas.map(serializeArticuloEntregaHistorialEntry);
}
