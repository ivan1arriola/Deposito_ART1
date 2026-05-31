import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { compareRanks } from "@/lib/rank-order";
import type { HojaMatrixData, HojaMatrixRow } from "@/types/views";

export const SIN_BATERIA_LABEL = "Sin batería";

type GetHojaMatrixOptions = {
  bateria?: string | null;
};

function movimientoFactor(tipo: TipoMovimiento) {
  if (tipo === TipoMovimiento.DEVOLUCION) return -1;
  return 1;
}

function normalizeBatteryFilter(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function compareMatrixRows(a: HojaMatrixRow, b: HojaMatrixRow) {
  const byGrado = compareRanks(
    { abreviacion: a.gradoAbreviacion, orden: a.gradoOrden },
    { abreviacion: b.gradoAbreviacion, orden: b.gradoOrden },
  );
  if (byGrado !== 0) return byGrado;

  const byBateriaOrden = compareOptionalOrder(a.bateriaOrden, b.bateriaOrden);
  if (byBateriaOrden !== 0) return byBateriaOrden;

  if (a.bateria && !b.bateria) return -1;
  if (!a.bateria && b.bateria) return 1;

  const byBateria = (a.bateria ?? "").localeCompare(b.bateria ?? "", "es", { sensitivity: "base" });
  if (byBateria !== 0) return byBateria;

  const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
  if (byApellido1 !== 0) return byApellido1;

  const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", { sensitivity: "base" });
  if (byApellido2 !== 0) return byApellido2;

  const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
  if (byNombre1 !== 0) return byNombre1;

  const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
  if (byNombre2 !== 0) return byNombre2;

  return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
}

export async function getHojaMatrixData(options: GetHojaMatrixOptions = {}): Promise<HojaMatrixData> {
  const bateria = normalizeBatteryFilter(options.bateria);

  const equipos = await prisma.equipo.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { equipoId: true, nombre: true },
  });

  const equipoIds = equipos.map((equipo) => equipo.equipoId);
  const itemIndexById = new Map(equipoIds.map((equipoId, index) => [equipoId.toString(), index]));

  const personalWhere: Prisma.PersonalWhereInput = {
    rango: { tipo: TipoPersonal.SUBALTERNO },
    ...(bateria === null
      ? {}
      : bateria === SIN_BATERIA_LABEL
        ? { }
        : { }),
  };

  const personal = await prisma.personal.findMany({
    where: personalWhere,
    include: {
      rango: {
        select: { abreviacion: true, nombreCompleto: true, orden: true },
      },
      bateria: {
                    select: { nombre: true, orden: true },
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

  const rows: HojaMatrixRow[] = personal.map((persona) => {
    const totales = Array.from({ length: equipos.length }, () => 0);

    for (const destinatarioMovimiento of persona.movimientosDestinatario) {
      const movimiento = destinatarioMovimiento.movimiento;
      const factor = movimientoFactor(movimiento.tipo);
      for (const detail of movimiento.equipos) {
        const index = itemIndexById.get(detail.equipoId.toString());
        if (index === undefined) continue;
        totales[index] += detail.cantidad * factor;
      }
    }

    const totalGeneral = totales.reduce((acc, value) => acc + value, 0);

    return {
      ci: persona.ci,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      nombre1: persona.nombre1,
      nombre2: persona.nombre2,
      bateria: persona.bateria?.nombre ?? null,
      bateriaOrden: persona.bateria?.orden ?? null,
      grado: persona.rango.nombreCompleto,
      gradoOrden: persona.rango.orden,
      gradoAbreviacion: persona.rango.abreviacion,
      totales,
      totalGeneral,
    };
  });

  rows.sort(compareMatrixRows);

  return {
    generatedAt: formatDateTimeForDisplay(new Date()),
    equipos: equipos.map((equipo) => ({
      equipoId: equipo.equipoId.toString(),
      equipoId: equipo.equipoId.toString(),
      nombre: equipo.nombre,
    })),
    rows,
  };
}
