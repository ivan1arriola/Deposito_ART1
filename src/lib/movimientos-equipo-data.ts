import "server-only";

import { TipoMovimiento } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { prisma } from "@/lib/prisma";
import type { EquipoMovimientoCatalogItem, EquipoMovimientoViewRow } from "@/types/views";

export type MovimientosEquipoData = {
  items: EquipoMovimientoCatalogItem[];
  selectedItem: EquipoMovimientoCatalogItem | null;
  rows: EquipoMovimientoViewRow[];
};

export function parseEquipoMovimientoItemId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function buildPrestamoEstadoLabel(
  prestamoActivoEstado: "PENDIENTE" | "DEVUELTO" | null,
  prestamoHistorialEstado: "PENDIENTE" | "DEVUELTO" | null,
) {
  if (prestamoActivoEstado === "PENDIENTE") return "PENDIENTE" as const;
  if (prestamoActivoEstado === "DEVUELTO") return "DEVUELTO" as const;
  if (prestamoHistorialEstado === "DEVUELTO") return "DEVUELTO" as const;
  if (prestamoHistorialEstado === "PENDIENTE") return "PENDIENTE" as const;
  return null;
}

export function buildMovimientoTipoLabel(
  tipo: EquipoMovimientoViewRow["tipo"],
  prestamoEstado: EquipoMovimientoViewRow["prestamoEstado"],
  clasePrestamo: EquipoMovimientoViewRow["clasePrestamo"],
) {
  if (tipo === "ENTREGA") return "Entrega";
  if (tipo === "DEVOLUCION") return "Devolución";
  if (clasePrestamo === "EXTERNO" && prestamoEstado === "PENDIENTE") return "Préstamo externo (pendiente)";
  if (clasePrestamo === "EXTERNO" && prestamoEstado === "DEVUELTO") return "Préstamo externo (devuelto)";
  if (clasePrestamo === "INTERNO" && prestamoEstado === "PENDIENTE") return "Préstamo interno (pendiente)";
  if (clasePrestamo === "INTERNO" && prestamoEstado === "DEVUELTO") return "Préstamo interno (devuelto)";
  if (prestamoEstado === "PENDIENTE") return "Préstamo pendiente";
  if (prestamoEstado === "DEVUELTO") return "Préstamo devuelto";
  return "Préstamo";
}

export async function getMovimientosEquipoData(itemId: bigint | null = null): Promise<MovimientosEquipoData> {
  const catalog = await prisma.item.findMany({
    orderBy: [{ nombre: "asc" }, { itemId: "asc" }],
    select: {
      itemId: true,
      nombre: true,
      activo: true,
    },
  });

  const items: EquipoMovimientoCatalogItem[] = catalog.map((item) => ({
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    activo: item.activo,
  }));

  if (!itemId) {
    return {
      items,
      selectedItem: null,
      rows: [],
    };
  }

  const selectedRecord = catalog.find((item) => item.itemId === itemId);
  if (!selectedRecord) {
    return {
      items,
      selectedItem: null,
      rows: [],
    };
  }

  const movimientoItems = await prisma.movimientoItem.findMany({
    where: {
      itemId,
      movimiento: {
        tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION, TipoMovimiento.PRESTAMO] },
      },
    },
    select: {
      cantidad: true,
      movimiento: {
        select: {
          movimientoId: true,
          fecha: true,
          tipo: true,
          observaciones: true,
          destinatarioPersonal: {
            select: {
              personal: {
                select: {
                  ci: true,
                  apellido1: true,
                  apellido2: true,
                  nombre1: true,
                  nombre2: true,
                  rango: {
                    select: {
                      tipo: true,
                      abreviacion: true,
                      nombreCompleto: true,
                      orden: true,
                    },
                  },
                },
              },
            },
          },
          destinatarioExterno: {
            select: {
              personaExterna: {
                select: {
                  ci: true,
                  grado: true,
                  nombre: true,
                  apellido: true,
                  unidadDestino: true,
                },
              },
            },
          },
          prestamoActivo: {
            select: {
              estado: true,
            },
          },
          prestamoHistorial: {
            select: {
              estado: true,
            },
          },
        },
      },
    },
    orderBy: [{ movimiento: { fecha: "desc" } }, { movimientoId: "desc" }],
  });

  const rows: EquipoMovimientoViewRow[] = movimientoItems.map((movimientoItem) => {
    const prestamoEstado =
      movimientoItem.movimiento.tipo === TipoMovimiento.PRESTAMO
        ? buildPrestamoEstadoLabel(
            movimientoItem.movimiento.prestamoActivo?.estado ?? null,
            movimientoItem.movimiento.prestamoHistorial?.estado ?? null,
          )
        : null;
    const destinatario = resolveDestinatarioMovimiento(movimientoItem.movimiento);
    const clasePrestamo = movimientoItem.movimiento.tipo === TipoMovimiento.PRESTAMO ? destinatario?.clase ?? "PENDIENTE" : null;

    return {
      movimientoId: movimientoItem.movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimientoItem.movimiento.fecha) ?? "",
      tipo: movimientoItem.movimiento.tipo,
      tipoLabel: buildMovimientoTipoLabel(movimientoItem.movimiento.tipo, prestamoEstado, clasePrestamo),
      prestamoEstado,
      clasePrestamo,
      ci: destinatario?.ci ?? null,
      perfilCi: destinatario?.perfilCi ?? null,
      persona: destinatario?.nombre ?? "Destinatario pendiente",
      gradoAbreviacion: destinatario?.gradoAbreviacion ?? destinatario?.grado ?? "Pendiente",
      gradoOrden: destinatario?.gradoOrden ?? null,
      cantidad: movimientoItem.cantidad,
      observaciones: movimientoItem.movimiento.observaciones,
    };
  });

  return {
    items,
    selectedItem: {
      itemId: selectedRecord.itemId.toString(),
      nombre: selectedRecord.nombre,
      activo: selectedRecord.activo,
    },
    rows,
  };
}
