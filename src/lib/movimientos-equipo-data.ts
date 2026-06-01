import "server-only";

import { TipoMovimiento } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import { prisma } from "@/lib/prisma";
import { MOVIMIENTO_TIPOS_REGISTRO_Y_PRESTAMO } from "@/lib/tipo-movimiento";
import type { EquipoMovimientoCatalogEquipo, EquipoMovimientoViewRow } from "@/types/views";

export type MovimientosEquipoData = {
  equipos: EquipoMovimientoCatalogEquipo[];
  selectedItem: EquipoMovimientoCatalogEquipo | null;
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
  if (tipo === "ASIGNACION") return "Asignación";
  if (clasePrestamo === "EXTERNO" && prestamoEstado === "PENDIENTE") return "Préstamo externo (pendiente)";
  if (clasePrestamo === "EXTERNO" && prestamoEstado === "DEVUELTO") return "Préstamo externo (devuelto)";
  if (clasePrestamo === "INTERNO" && prestamoEstado === "PENDIENTE") return "Préstamo interno (pendiente)";
  if (clasePrestamo === "INTERNO" && prestamoEstado === "DEVUELTO") return "Préstamo interno (devuelto)";
  if (prestamoEstado === "PENDIENTE") return "Préstamo pendiente";
  if (prestamoEstado === "DEVUELTO") return "Préstamo devuelto";
  return "Préstamo";
}

export async function getMovimientosEquipoData(equipoId: bigint | null = null): Promise<MovimientosEquipoData> {
  const catalog = await prisma.equipo.findMany({
    orderBy: [{ nombre: "asc" }, { equipoId: "asc" }],
    select: {
      equipoId: true,
      nombre: true,
      activo: true,
    },
  });

  const equipos: EquipoMovimientoCatalogEquipo[] = catalog.map((equipo) => ({
    equipoId: equipo.equipoId.toString(),
    nombre: equipo.nombre,
    activo: equipo.activo,
  }));

  if (!equipoId) {
    return {
      equipos,
      selectedItem: null,
      rows: [],
    };
  }

  const selectedRecord = catalog.find((equipo) => equipo.equipoId === equipoId);
  if (!selectedRecord) {
    return {
      equipos,
      selectedItem: null,
      rows: [],
    };
  }

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const movimientoEquipos = await prisma.movimientoEquipo.findMany({
    where: {
      equipoId,
      movimiento: {
        tipo: { in: MOVIMIENTO_TIPOS_REGISTRO_Y_PRESTAMO },
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
          destinatarioRecinto: {
            select: {
              clase: true,
              nombre: true,
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

  const rows: EquipoMovimientoViewRow[] = movimientoEquipos.map((movimientoEquipo) => {
    const prestamoEstado =
      movimientoEquipo.movimiento.tipo === TipoMovimiento.PRESTAMO
        ? buildPrestamoEstadoLabel(
            movimientoEquipo.movimiento.prestamoActivo?.estado ?? null,
            movimientoEquipo.movimiento.prestamoHistorial?.estado ?? null,
          )
        : null;
    const destinatario = resolveDestinatarioMovimiento(movimientoEquipo.movimiento);
    const clasePrestamo = movimientoEquipo.movimiento.tipo === TipoMovimiento.PRESTAMO ? destinatario?.clase ?? "PENDIENTE" : null;

    return {
      movimientoId: movimientoEquipo.movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimientoEquipo.movimiento.fecha) ?? "",
      tipo: movimientoEquipo.movimiento.tipo,
      tipoLabel: buildMovimientoTipoLabel(movimientoEquipo.movimiento.tipo, prestamoEstado, clasePrestamo),
      prestamoEstado,
      clasePrestamo,
      ci: destinatario?.ci ?? null,
      perfilCi: destinatario?.perfilCi ?? null,
      persona: destinatario?.nombre ?? "Destinatario pendiente",
      gradoAbreviacion: destinatario?.gradoAbreviacion ?? destinatario?.grado ?? "Pendiente",
      gradoOrden: destinatario?.gradoOrden ?? null,
      cantidad: movimientoEquipo.cantidad,
      observaciones: movimientoEquipo.movimiento.observaciones,
    };
  });

  return {
    equipos,
    selectedItem: {
      equipoId: selectedRecord.equipoId.toString(),
      nombre: selectedRecord.nombre,
      activo: selectedRecord.activo,
    },
    rows,
  };
}
