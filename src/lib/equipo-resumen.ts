import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { compareOptionalOrder } from "@/lib/catalog-order";
import type { EquipoResumenData, EquipoResumenRow } from "@/types/views";

const SIN_BATERIA_LABEL = "Sin batería";

function movimientoFactor(tipo: TipoMovimiento) {
  if (tipo === TipoMovimiento.DEVOLUCION) return -1;
  return 1;
}

function sortResumenRows(a: EquipoResumenRow, b: EquipoResumenRow) {
  const byOrder = compareOptionalOrder(a.orden, b.orden);
  if (byOrder !== 0) return byOrder;
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}

export async function getEquipoResumenData(): Promise<EquipoResumenData> {
  const equipos = await prisma.equipo.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { equipoId: true, nombre: true },
  });

  const equipoIds = equipos.map((equipo) => equipo.equipoId);
  const itemIndexById = new Map(equipoIds.map((equipoId, index) => [equipoId.toString(), index]));

  const personal = await prisma.personal.findMany({
    where: {
      rango: { tipo: TipoPersonal.SUBALTERNO },
    },
    include: {
      bateria: {
                    select: { bateriaId: true, nombre: true, orden: true },
                  },
      movimientosDestinatario: {
        where: {
          movimiento: {
            tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
          },
        },
        include: {
          movimiento: {
            include: {
              equipos: {
                where: equipoIds.length > 0 ? { equipoId: { in: equipoIds } } : undefined,
                select: {
                  equipoId: true,
                  cantidad: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const rowsByBattery = new Map<string, EquipoResumenRow>();
  const unitTotals = Array.from({ length: equipos.length }, () => 0);

  for (const persona of personal) {
    const batteryKey = persona.bateria ? String(persona.bateria.bateriaId) : "NONE";
    const batteryName = persona.bateria?.nombre ?? SIN_BATERIA_LABEL;
    const batteryOrder = persona.bateria?.orden ?? null;

    let summaryRow = rowsByBattery.get(batteryKey);
    if (!summaryRow) {
      summaryRow = {
        key: batteryKey,
        nombre: batteryName,
        orden: batteryOrder,
        totales: Array.from({ length: equipos.length }, () => 0),
        totalGeneral: 0,
      };
      rowsByBattery.set(batteryKey, summaryRow);
    }

    for (const destinatarioMovimiento of persona.movimientosDestinatario) {
      const movimiento = destinatarioMovimiento.movimiento;
      const factor = movimientoFactor(movimiento.tipo);
      for (const detail of movimiento.equipos) {
        const index = itemIndexById.get(detail.equipoId.toString());
        if (index === undefined) continue;
        const delta = detail.cantidad * factor;
        summaryRow.totales[index] += delta;
        summaryRow.totalGeneral += delta;
        unitTotals[index] += delta;
      }
    }
  }

  const unidad: EquipoResumenRow = {
    key: "ALL",
    nombre: "Unidad completa",
    orden: -1,
    totales: unitTotals,
    totalGeneral: unitTotals.reduce((acc, value) => acc + value, 0),
  };

  return {
    generatedAt: formatDateTimeForDisplay(new Date()),
    equipos: equipos.map((equipo) => ({
      equipoId: equipo.equipoId.toString(),
      nombre: equipo.nombre,
    })),
    unidad,
    baterias: Array.from(rowsByBattery.values()).sort(sortResumenRows),
  };
}
