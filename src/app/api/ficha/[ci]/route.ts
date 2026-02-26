import { NextResponse } from "next/server";
import { TipoRegistro } from "@prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { prisma } from "@/lib/prisma";
import { isValidUruguayanCi } from "@/lib/ci";

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

// 6 columnas en orden cronologico (1 viejo -> 6 nuevo).
// Si hay mas de 5 registros:
// - col 6: mas nuevo
// - col 2: 5to mas nuevo
// - col 1: acumulado del 6to mas nuevo hacia atras, con fecha del 6to mas nuevo.
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

function buildMatrix(
  itemsOrder: string[],
  entregas: MatrixColumn[],
  devoluciones: MatrixColumn[],
) {
  return itemsOrder.map((itemName) => {
    const entrega = Array.from({ length: 6 }, (_, idx) => {
      const found = entregas[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });
    const devolucion = Array.from({ length: 6 }, (_, idx) => {
      const found = devoluciones[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });

    return {
      item: itemName,
      entrega,
      entregaTotal: entrega.reduce((acc, value) => acc + value, 0),
      devolucion,
      devolucionTotal: devolucion.reduce((acc, value) => acc + value, 0),
    };
  });
}

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciValue)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const persona = await prisma.personal.findUnique({
    where: { ci: ciValue },
    include: {
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
    },
  });

  if (!persona) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  const entregas = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.ENTREGA));
  const devoluciones = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.DEVOLUCION));
  const itemCatalog = await prisma.item.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { nombre: true },
  });

  const itemOrder = itemCatalog.map((item) => item.nombre);
  const matrix = buildMatrix(itemOrder, entregas, devoluciones);

  const tallas = persona.tallas.reduce<Record<string, string>>((acc, talla) => {
    acc[talla.tallaTipo.nombre] = talla.tallaValor;
    return acc;
  }, {});
  const firmas = await getFirmaConfig();

  return NextResponse.json({
    persona: {
      ci: persona.ci,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      nombre1: persona.nombre1,
      nombre2: persona.nombre2,
      fechaIngreso: persona.fechaIngreso ? persona.fechaIngreso.toISOString() : null,
      gradoPersonal: persona.rango.abreviacion,
      bateria: persona.bateria?.nombre ?? null,
      tallas: {
        PARKA: tallas.PARKA ?? "",
        CAMISACO: tallas.CAMISACO ?? "",
        PANTALON: tallas.PANTALON ?? "",
        KEPI: tallas.KEPI ?? "",
        CALZADO: tallas.CALZADO ?? "",
      },
    },
    entregas,
    devoluciones,
    matrix,
    itemOrder,
    firmas: {
      encargadoTexto: TEXTO_ENCARGADO,
      encargadoRango: firmas.encargadoRango,
      encargadoNombre: firmas.encargadoNombre,
      oficialTexto: TEXTO_OFICIAL,
      oficialRango: firmas.oficialRango,
      oficialNombre: firmas.oficialNombre,
    },
    observaciones: persona.observaciones.map((obs) => ({
      fecha: obs.fecha.toISOString(),
      texto: obs.texto,
    })),
  });
}
