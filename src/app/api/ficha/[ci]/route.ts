import { NextResponse } from "next/server";
import { TipoRegistro } from "@prisma/client";
import { authorizeRequest } from "@/lib/auth";
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

function sliceSix(records: RegistroWithItems[]) {
  return records
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    .slice(0, 6)
    .map((record) => ({
      fecha: record.fecha.toISOString(),
      items: record.items.map((detail) => ({
        nombre: detail.item.nombre,
        cantidad: detail.cantidad,
      })),
    }));
}

function buildMatrix(
  itemsOrder: string[],
  entregas: Array<{ items: Array<{ nombre: string; cantidad: number }> }>,
  devoluciones: Array<{ items: Array<{ nombre: string; cantidad: number }> }>,
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

  const entregas = sliceSix(persona.registros.filter((record) => record.tipo === TipoRegistro.ENTREGA));
  const devoluciones = sliceSix(persona.registros.filter((record) => record.tipo === TipoRegistro.DEVOLUCION));
  const itemCatalog = await prisma.item.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
    select: { nombre: true },
  });

  const itemOrder = itemCatalog.map((item) => item.nombre);
  const matrix = buildMatrix(itemOrder, entregas, devoluciones);

  const tallas = persona.tallas.reduce<Record<string, string>>((acc, talla) => {
    acc[talla.tallaTipo.nombre] = talla.tallaValor;
    return acc;
  }, {});

  return NextResponse.json({
    persona: {
      ci: persona.ci,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2,
      nombre1: persona.nombre1,
      nombre2: persona.nombre2,
      fechaIngreso: persona.fechaIngreso ? persona.fechaIngreso.toISOString() : null,
      gradoPersonal: persona.rango.abreviacion,
      bateria: persona.bateria.nombre,
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
    observaciones: persona.observaciones.map((obs) => ({
      fecha: obs.fecha.toISOString(),
      texto: obs.texto,
    })),
  });
}
