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
  equipos: Array<{
    cantidad: number;
    equipo: {
      nombre: string;
      activo: boolean;
    };
  }>;
};

type MatrixColumn = {
  fecha: string | null;
  equipos: Array<{ nombre: string; cantidad: number }>;
};

export type MovimientoFueraHojaRow = {
  movimientoId: string;
  fecha: string;
  tipo: TipoMovimiento;
  ci: string;
  persona: string;
  gradoAbreviacion: string;
  gradoOrden: number | null;
  equipo: string;
  cantidad: number;
  observaciones: string | null;
};


const hojaEntregaPersonalSelect = {
  ci: true,
  apellido1: true,
  apellido2: true,
  nombre1: true,
  nombre2: true,
  esReingreso: true,
  fechaIngreso: true,
  fechaIngresoOriginal: true,
  rango: {
    select: {
      abreviacion: true,
      nombreCompleto: true,
      orden: true,
    },
  },
  bateria: {
          select: {
            nombre: true,
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
  movimientosDestinatario: {
    where: {
      movimiento: {
        tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
      },
    },
    orderBy: { movimiento: { fecha: "asc" } },
    select: {
      movimiento: {
        select: {
          fecha: true,
          tipo: true,
          observaciones: true,
          equipos: {
            select: {
              cantidad: true,
              equipo: {
                select: {
                  nombre: true,
                  activo: true,
                },
              },
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
    for (const detail of record.equipos) {
      const key = detail.equipo.nombre;
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
      equipos: aggregateItems(oldMovimientos),
    });

    columns.push(
      ...recentMovimientos.map((movimiento) => ({
        fecha: formatDateOnlyFromDate(movimiento.fecha),
        equipos: movimiento.equipos.map((detail) => ({
          nombre: detail.equipo.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  } else {
    columns.push(
      ...sorted.map((record) => ({
        fecha: formatDateOnlyFromDate(record.fecha),
        equipos: record.equipos.map((detail) => ({
          nombre: detail.equipo.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  }

  while (columns.length < 6) {
    columns.push({ fecha: null, equipos: [] });
  }

  return columns.slice(0, 6);
}

function buildMatrix(itemsOrder: string[], entregas: MatrixColumn[], devoluciones: MatrixColumn[]): HojaEntregaMatrixRow[] {
  const entregaMaps = entregas.map((column) => new Map(column.equipos.map((equipo) => [equipo.nombre, equipo.cantidad])));
  const devolucionMaps = devoluciones.map((column) => new Map(column.equipos.map((equipo) => [equipo.nombre, equipo.cantidad])));

  return itemsOrder.map((itemName) => {
    const entrega = Array.from({ length: 6 }, (_, idx) => entregaMaps[idx]?.get(itemName) ?? 0);
    const devolucion = Array.from({ length: 6 }, (_, idx) => devolucionMaps[idx]?.get(itemName) ?? 0);
    const entregaTotal = entrega.reduce((acc, value) => acc + value, 0);
    const devolucionRegistradaTotal = devolucion.reduce((acc, value) => acc + value, 0);

    return {
      equipo: itemName,
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
  const movimientos = persona.movimientosDestinatario.map((entry) => entry.movimiento);
  const entregas = toSixColumns(movimientos.filter((movimiento) => movimiento.tipo === TipoMovimiento.ENTREGA));
  const devoluciones = toSixColumns(movimientos.filter((movimiento) => movimiento.tipo === TipoMovimiento.DEVOLUCION));
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
      esReingreso: persona.esReingreso ?? false,
      fechaIngreso: formatDateOnlyFromDate(persona.fechaIngreso ?? null),
      fechaIngresoOriginal: formatDateOnlyFromDate(persona.fechaIngresoOriginal ?? null),
      rango: persona.rango.nombreCompleto,
      rangoAbreviacion: persona.rango.abreviacion,
      bateria: persona.bateria?.nombre ?? null,
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
    observaciones: buildHojaObservaciones(persona.observaciones, movimientos),
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
    prisma.equipo.findMany({
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
    itemCatalog.map((equipo) => equipo.nombre),
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
    prisma.equipo.findMany({
      where: { activo: true },
      orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
      select: { nombre: true },
    }),
    getFirmaConfig(),
  ]);

  const itemOrder = itemCatalog.map((equipo) => equipo.nombre);

  return [...personas]
    .sort(comparePersonalByHierarchy)
    .map((persona) => mapPersonaToHojaEntregaData(persona, itemOrder, firmas));
}

export async function getMovimientosFueraHojaData(): Promise<MovimientoFueraHojaRow[]> {
  const movimientos = await prisma.movimiento.findMany({
    where: {
      tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
      equipos: {
        some: {
          equipo: {
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
                  abreviacion: true,
                  orden: true,
                },
              },
            },
          },
        },
      },
      equipos: {
        where: {
          equipo: {
            activo: false,
          },
        },
        select: {
          cantidad: true,
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  });

  return movimientos.flatMap((movimiento) => {
    const destinatario = movimiento.destinatarioPersonal?.personal;
    if (!destinatario) return [];

    const persona = [
      destinatario.apellido1,
      destinatario.apellido2,
      destinatario.nombre1,
      destinatario.nombre2,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return movimiento.equipos.map((detail) => ({
      movimientoId: movimiento.movimientoId.toString(),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: movimiento.tipo,
      ci: destinatario.ci,
      persona,
      gradoAbreviacion: destinatario.rango.abreviacion,
      gradoOrden: destinatario.rango.orden ?? null,
      equipo: detail.equipo.nombre,
      cantidad: detail.cantidad,
      observaciones: movimiento.observaciones,
    }));
  });
}
