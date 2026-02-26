import { TipoRegistro } from "@prisma/client";
import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compareRankAbbreviation } from "@/lib/rank-order";

type MatrixItem = {
  itemId: string;
  nombre: string;
};

type MatrixRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  grado: string;
  gradoAbreviacion: string;
  totales: number[];
  totalGeneral: number;
};

function registroFactor(tipo: TipoRegistro) {
  if (tipo === TipoRegistro.DEVOLUCION) return -1;
  return 1;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const items = await prisma.item.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { itemId: true, nombre: true },
  });

  const itemIds = items.map((item) => item.itemId);
  const itemIndexById = new Map(itemIds.map((itemId, index) => [itemId.toString(), index]));

  const personal = await prisma.personal.findMany({
    include: {
      rango: {
        select: { abreviacion: true, nombreCompleto: true },
      },
      bateria: {
        select: { nombre: true },
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

  personal.sort((a, b) => {
    if (a.bateria?.nombre && !b.bateria?.nombre) return -1;
    if (!a.bateria?.nombre && b.bateria?.nombre) return 1;
    const byBateria = (a.bateria?.nombre ?? "").localeCompare(b.bateria?.nombre ?? "", "es", { sensitivity: "base" });
    if (byBateria !== 0) return byBateria;

    const byGrado = compareRankAbbreviation(a.rango.abreviacion, b.rango.abreviacion);
    if (byGrado !== 0) return byGrado;

    const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
    if (byApellido1 !== 0) return byApellido1;
    const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", { sensitivity: "base" });
    if (byApellido2 !== 0) return byApellido2;
    const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
    if (byNombre1 !== 0) return byNombre1;
    const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
    if (byNombre2 !== 0) return byNombre2;
    return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
  });

  const rows: MatrixRow[] = personal.map((persona) => {
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
      grado: persona.rango.nombreCompleto,
      gradoAbreviacion: persona.rango.abreviacion,
      totales,
      totalGeneral,
    };
  });

  const serializedItems: MatrixItem[] = items.map((item) => ({
    itemId: item.itemId.toString(),
    nombre: item.nombre,
  }));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    items: serializedItems,
    rows,
  });
}
