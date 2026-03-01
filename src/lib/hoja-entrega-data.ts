import { Prisma, TipoRegistro } from "@prisma/client";
import { isValidUruguayanCi } from "@/lib/ci";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { buildHojaObservaciones, type HojaObservacion } from "@/lib/hoja-entrega-observaciones";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";

type RegistroWithItems = {
  fecha: Date;
  items: Array<{
    cantidad: number;
    item: {
      nombre: string;
    };
  }>;
};

type MatrixColumn = {
  fecha: string | null;
  items: Array<{ nombre: string; cantidad: number }>;
};

export type HojaEntregaMatrixRow = {
  item: string;
  entrega: number[];
  entregaTotal: number;
  devolucion: number[];
  devolucionTotal: number;
};

export type HojaEntregaSheetData = {
  persona: {
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    esReingreso: boolean;
    fechaIngreso: string | null;
    fechaIngresoOriginal: string | null;
    rango: string;
    rangoAbreviacion: string;
    bateria: string | null;
    tallas: {
      PARKA: string;
      CAMISACO: string;
      PANTALON: string;
      KEPI: string;
      CALZADO: string;
    };
  };
  entregas: Array<{ fecha: string | null }>;
  devoluciones: Array<{ fecha: string | null }>;
  matrix: HojaEntregaMatrixRow[];
  firmas: {
    encargadoTexto: string;
    encargadoRango: string;
    encargadoNombre: string;
    oficialTexto: string;
    oficialRango: string;
    oficialNombre: string;
  };
  observaciones: HojaObservacion[];
};

const hojaEntregaPersonalInclude = {
  rango: true,
  bateria: true,
  tallas: {
    include: { tallaTipo: true },
  },
  registros: {
    where: {
      tipo: { in: [TipoRegistro.ENTREGA, TipoRegistro.DEVOLUCION] },
    },
    orderBy: { fecha: "asc" },
    include: {
      items: {
        include: { item: true },
      },
    },
  },
  observaciones: {
    orderBy: { fecha: "asc" },
  },
} as const satisfies Prisma.PersonalInclude;

type HojaEntregaPersonalRecord = Prisma.PersonalGetPayload<{
  include: typeof hojaEntregaPersonalInclude;
}>;

function aggregateItems(records: RegistroWithItems[]) {
  const map = new Map<string, number>();
  for (const record of records) {
    for (const detail of record.items) {
      const key = detail.item.nombre;
      map.set(key, (map.get(key) ?? 0) + detail.cantidad);
    }
  }
  return Array.from(map.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
}

function toSixColumns(records: RegistroWithItems[]): MatrixColumn[] {
  const sorted = [...records].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const columns: MatrixColumn[] = [];

  if (sorted.length > 5) {
    const oldRecords = sorted.slice(0, sorted.length - 5);
    const recentRecords = sorted.slice(-5);
    const cutoffRecord = oldRecords[oldRecords.length - 1] ?? null;

    columns.push({
      fecha: cutoffRecord ? cutoffRecord.fecha.toISOString() : null,
      items: aggregateItems(oldRecords),
    });

    columns.push(
      ...recentRecords.map((record) => ({
        fecha: record.fecha.toISOString(),
        items: record.items.map((detail) => ({
          nombre: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  } else {
    columns.push(
      ...sorted.map((record) => ({
        fecha: record.fecha.toISOString(),
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
  return itemsOrder.map((itemName) => {
    const entrega = Array.from({ length: 6 }, (_, idx) => {
      const found = entregas[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });
    const devolucion = Array.from({ length: 6 }, (_, idx) => {
      const found = devoluciones[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });
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
  const entregas = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.ENTREGA));
  const devoluciones = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.DEVOLUCION));
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
      esReingreso: persona.esReingreso,
      fechaIngreso: persona.fechaIngreso ? persona.fechaIngreso.toISOString() : null,
      fechaIngresoOriginal: persona.fechaIngresoOriginal ? persona.fechaIngresoOriginal.toISOString() : null,
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
    observaciones: buildHojaObservaciones(persona.observaciones, persona.registros),
  };
}

function extractDateParts(value: string | Date | null | undefined) {
  if (!value) return null;

  if (typeof value === "string") {
    const isoLike = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoLike) {
      return {
        year: isoLike[1],
        month: isoLike[2],
        day: isoLike[3],
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

export function getHojaEntregaDatePart(value: string | null | undefined, part: "day" | "month" | "year"): string {
  const parts = extractDateParts(value);
  if (!parts) return "";
  return parts[part];
}

export function formatHojaEntregaDisplayDate(value: string | Date | null | undefined) {
  const parts = extractDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export async function getHojaEntregaData(ci: string): Promise<HojaEntregaSheetData | null> {
  if (!isValidUruguayanCi(ci)) {
    return null;
  }

  const [persona, itemCatalog, firmas] = await Promise.all([
    prisma.personal.findUnique({
      where: { ci },
      include: hojaEntregaPersonalInclude,
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
  const [personas, itemCatalog, firmas] = await Promise.all([
    prisma.personal.findMany({
      include: hojaEntregaPersonalInclude,
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
