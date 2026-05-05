import "server-only";
import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { isValidUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { buildHojaObservaciones } from "@/lib/hoja-entrega-observaciones";
import type { HojaEntregaMatrixRow, HojaEntregaSheetData } from "@/lib/hoja-entrega-sheet";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";

export type { HojaEntregaMatrixRow, HojaEntregaSheetData } from "@/lib/hoja-entrega-sheet";
export { formatHojaEntregaDisplayDate, getHojaEntregaDatePart } from "@/lib/hoja-entrega-sheet";

type MovimientoWithItems = {
  fecha: Date;
  tipo: TipoMovimiento;
  observaciones: string | null;
  items: Array<{
    cantidad: number;
    item: {
      nombre: string;
      activo: boolean;
    };
  }>;
};

type MatrixColumn = {
  fecha: string | null;
  items: Array<{ nombre: string; cantidad: number }>;
};

export type MovimientoFueraHojaRow = {
  movimientoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  ci: string;
  persona: string;
  gradoAbreviacion: string;
  gradoOrden: number | null;
  item: string;
  cantidad: number;
  observaciones: string | null;
};


const hojaEntregaPersonalSelect = {
  ci: true,
  apellido1: true,
  apellido2: true,
  nombre1: true,
  nombre2: true,
  rango: {
    select: {
      abreviacion: true,
      nombreCompleto: true,
      orden: true,
    },
  },
  subalterno: {
    select: {
      esReingreso: true,
      fechaIngreso: true,
      fechaIngresoOriginal: true,
      bateria: {
        select: {
          nombre: true,
        },
      },
    },
  },
  tallas: {
    select: {
      tallaValor: true,
      tallaTipo: {
        select: {
          nombre: true,
        },
      },
    },
  },
  movimientos: {
    where: {
      tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
    },
    orderBy: { fecha: "asc" },
    select: {
      fecha: true,
      tipo: true,
      observaciones: true,
      items: {
        select: {
          cantidad: true,
          item: {
            select: {
              nombre: true,
              activo: true,
            },
          },
        },
      },
    },
  },
  observaciones: {
    orderBy: { fecha: "asc" },
    select: {
      fecha: true,
      texto: true,
    },
  },
} as const satisfies Prisma.PersonalSelect;

type HojaEntregaPersonalRecord = Prisma.PersonalGetPayload<{
  select: typeof hojaEntregaPersonalSelect;
}>;

function aggregateItems(records: MovimientoWithItems[]) {
  const map = new Map<string, number>();
  for (const record of records) {
    for (const detail of record.items) {
      const key = detail.item.nombre;
      map.set(key, (map.get(key) ?? 0) + detail.cantidad);
    }
  }
  return Array.from(map.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
}

function toSixColumns(records: MovimientoWithItems[]): MatrixColumn[] {
  const sorted = records;
  const columns: MatrixColumn[] = [];

  if (sorted.length > 5) {
    const oldMovimientos = sorted.slice(0, sorted.length - 5);
    const recentMovimientos = sorted.slice(-5);
    const cutoffRecord = oldMovimientos[oldMovimientos.length - 1] ?? null;

    columns.push({
      fecha: cutoffRecord ? formatDateOnlyFromDate(cutoffRecord.fecha) : null,
      items: aggregateItems(oldMovimientos),
    });

    columns.push(
      ...recentMovimientos.map((movimiento) => ({
        fecha: formatDateOnlyFromDate(movimiento.fecha),
        items: movimiento.items.map((detail) => ({
          nombre: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  } else {
    columns.push(
      ...sorted.map((record) => ({
        fecha: formatDateOnlyFromDate(record.fecha),
        items: record.items.map((detail) => ({
          nombre: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  }

  while (columns.length < 6) {
    columns.push({ fecha: null, items: [] });
  }

  return columns.slice(0, 6);
}

function buildMatrix(itemsOrder: string[], entregas: MatrixColumn[], devoluciones: MatrixColumn[]): HojaEntregaMatrixRow[] {
  const entregaMaps = entregas.map((column) => new Map(column.items.map((item) => [item.nombre, item.cantidad])));
  const devolucionMaps = devoluciones.map((column) => new Map(column.items.map((item) => [item.nombre, item.cantidad])));

  return itemsOrder.map((itemName) => {
    const entrega = Array.from({ length: 6 }, (_, idx) => entregaMaps[idx]?.get(itemName) ?? 0);
    const devolucion = Array.from({ length: 6 }, (_, idx) => devolucionMaps[idx]?.get(itemName) ?? 0);
    const entregaTotal = entrega.reduce((acc, value) => acc + value, 0);
    const devolucionRegistradaTotal = devolucion.reduce((acc, value) => acc + value, 0);

    return {
      item: itemName,
      entrega,
      entregaTotal,
      devolucion,
      devolucionTotal: entregaTotal - devolucionRegistradaTotal,
    };
  });
}

function mapPersonaToHojaEntregaData(
  persona: HojaEntregaPersonalRecord,
  itemOrder: string[],
  firmas: Awaited<ReturnType<typeof getFirmaConfig>>,
): HojaEntregaSheetData {
  const entregas = toSixColumns(persona.movimientos.filter((movimiento) => movimiento.tipo === TipoMovimiento.ENTREGA));
  const devoluciones = toSixColumns(
    persona.movimientos.filter((movimiento) => movimiento.tipo === TipoMovimiento.DEVOLUCION),
  );
  const tallas = persona.tallas.reduce<Record<string, string>>((acc, talla) => {
    acc[talla.tallaTipo.nombre] = talla.tallaValor;
    return acc;
  }, {});

  return {
    persona: {
      ci: persona.ci,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      nombre1: persona.nombre1,
      nombre2: persona.nombre2,
      esReingreso: persona.subalterno?.esReingreso ?? false,
      fechaIngreso: formatDateOnlyFromDate(persona.subalterno?.fechaIngreso ?? null),
      fechaIngresoOriginal: formatDateOnlyFromDate(persona.subalterno?.fechaIngresoOriginal ?? null),
      rango: persona.rango.nombreCompleto,
      rangoAbreviacion: persona.rango.abreviacion,
      bateria: persona.subalterno?.bateria?.nombre ?? null,
      tallas: {
        PARKA: tallas.PARKA ?? "-",
        CAMISACO: tallas.CAMISACO ?? "-",
        PANTALON: tallas.PANTALON ?? "-",
        KEPI: tallas.KEPI ?? "-",
        CALZADO: tallas.CALZADO ?? "-",
      },
    },
    entregas: entregas.map((column) => ({ fecha: column.fecha })),
    devoluciones: devoluciones.map((column) => ({ fecha: column.fecha })),
    matrix: buildMatrix(itemOrder, entregas, devoluciones),
    firmas: {
      encargadoTexto: TEXTO_ENCARGADO,
      encargadoRango: firmas.encargadoRango || "Sargento",
      encargadoNombre: firmas.encargadoNombre || "NOMBRE",
      oficialTexto: TEXTO_OFICIAL,
      oficialRango: firmas.oficialRango || "Oficial",
      oficialNombre: firmas.oficialNombre || "NOMBRE",
    },
    observaciones: buildHojaObservaciones(persona.observaciones, persona.movimientos),
  };
}

export async function getHojaEntregaData(ci: string): Promise<HojaEntregaSheetData | null> {
  if (!isValidUruguayanCi(ci)) {
    return null;
  }

  const [persona, itemCatalog, firmas] = await Promise.all([
    prisma.personal.findFirst({
      where: {
        ci,
        rango: { tipo: TipoPersonal.SUBALTERNO },
      },
      select: hojaEntregaPersonalSelect,
    }),
    prisma.item.findMany({
      where: { activo: true },
      orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
      select: { nombre: true },
    }),
    getFirmaConfig(),
  ]);

  if (!persona) {
    return null;
  }

  return mapPersonaToHojaEntregaData(
    persona,
    itemCatalog.map((item) => item.nombre),
    firmas,
  );
}

export async function getAllHojasEntregaData(): Promise<HojaEntregaSheetData[]> {
  // Mantener la misma base de datos/mapeo que la hoja individual para evitar divergencias de formato.
  const [personas, itemCatalog, firmas] = await Promise.all([
    prisma.personal.findMany({
      where: {
        rango: { tipo: TipoPersonal.SUBALTERNO },
      },
      select: hojaEntregaPersonalSelect,
    }),
    prisma.item.findMany({
      where: { activo: true },
      orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
      select: { nombre: true },
    }),
    getFirmaConfig(),
  ]);

  const itemOrder = itemCatalog.map((item) => item.nombre);

  return [...personas]
    .sort(comparePersonalByHierarchy)
    .map((persona) => mapPersonaToHojaEntregaData(persona, itemOrder, firmas));
}

export async function getMovimientosFueraHojaData(): Promise<MovimientoFueraHojaRow[]> {
  const movimientos = await prisma.movimiento.findMany({
    where: {
      tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
      items: {
        some: {
          item: {
            activo: false,
          },
        },
      },
    },
    orderBy: [{ fecha: "desc" }, { movimientoId: "desc" }],
    select: {
      movimientoId: true,
      fecha: true,
      tipo: true,
      observaciones: true,
      personal: {
        select: {
          ci: true,
          apellido1: true,
          apellido2: true,
          nombre1: true,
          nombre2: true,
          rango: {
            select: {
              abreviacion: true,
              orden: true,
            },
          },
        },
      },
      items: {
        where: {
          item: {
            activo: false,
          },
        },
        select: {
          cantidad: true,
          item: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  return movimientos.flatMap((movimiento) => {
    const persona = [
      movimiento.personal.apellido1,
      movimiento.personal.apellido2,
      movimiento.personal.nombre1,
      movimiento.personal.nombre2,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return movimiento.items.map((detail) => ({
      movimientoId: movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: movimiento.tipo,
      ci: movimiento.personal.ci,
      persona,
      gradoAbreviacion: movimiento.personal.rango.abreviacion,
      gradoOrden: movimiento.personal.rango.orden ?? null,
      item: detail.item.nombre,
      cantidad: detail.cantidad,
      observaciones: movimiento.observaciones,
    }));
  });
}
