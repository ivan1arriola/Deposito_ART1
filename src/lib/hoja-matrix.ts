import { TipoRegistro } from "@prisma/client";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { compareRanks } from "@/lib/rank-order";
import type { HojaMatrixData, HojaMatrixRow } from "@/types/views";

export const SIN_BATERIA_LABEL = "Sin batería";

type GetHojaMatrixOptions = {
  bateria?: string | null;
};

function registroFactor(tipo: TipoRegistro) {
  if (tipo === TipoRegistro.DEVOLUCION) return -1;
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

  const items = await prisma.item.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { itemId: true, nombre: true },
  });

  const itemIds = items.map((item) => item.itemId);
  const itemIndexById = new Map(itemIds.map((itemId, index) => [itemId.toString(), index]));

  const personal = await prisma.personal.findMany({
    where:
      bateria === null
        ? undefined
        : bateria === SIN_BATERIA_LABEL
          ? { bateriaId: null }
          : { bateria: { nombre: bateria } },
    include: {
      rango: {
        select: { abreviacion: true, nombreCompleto: true, orden: true },
      },
      bateria: {
        select: { nombre: true, orden: true },
      },
      registros: {
        include: {
          items: {
            where: itemIds.length > 0 ? { itemId: { in: itemIds } } : undefined,
            select: {
              itemId: true,
              cantidad: true,
            },
          },
        },
      },
    },
  });

  const rows: HojaMatrixRow[] = personal.map((persona) => {
    const totales = Array.from({ length: items.length }, () => 0);

    for (const registro of persona.registros) {
      const factor = registroFactor(registro.tipo);
      for (const detail of registro.items) {
        const index = itemIndexById.get(detail.itemId.toString());
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
    items: items.map((item) => ({
      itemId: item.itemId.toString(),
      nombre: item.nombre,
    })),
    rows,
  };
}
