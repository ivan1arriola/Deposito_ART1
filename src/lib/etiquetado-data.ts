import { prisma } from "@/lib/prisma";

export type EtiquetaCajaPrintData = {
  codigoDepositoGeneral: number;
  estanteria: string;
  cantidad: number;
  itemNombre: string;
  codigosSIE: Array<{
    codigo: string;
    talla: string | null;
  }>;
  tallas: string[];
};

function normalizeTallaForSort(value: string | null) {
  return (value ?? "").trim().toUpperCase();
}

export async function getEtiquetasCajaData(options: { codigosDepositoGeneral?: number[] } = {}): Promise<EtiquetaCajaPrintData[]> {
  const codigosFiltrados = Array.from(
    new Set(
      (options.codigosDepositoGeneral ?? []).filter(
        (codigo) => Number.isInteger(codigo) && codigo > 0,
      ),
    ),
  );

  const cajas = await prisma.caja.findMany({
    where: codigosFiltrados.length > 0 ? { codigoDepositoGeneral: { in: codigosFiltrados } } : undefined,
    include: {
      item: {
        select: {
          nombre: true,
        },
      },
      codigosSIE: {
        include: {
          itemCodigoSIE: {
            select: {
              codigo: true,
              talla: true,
            },
          },
        },
      },
    },
    orderBy: [{ codigoDepositoGeneral: "asc" }],
  });

  return cajas.map((caja) => {
    const codigosSIE = caja.codigosSIE
      .map((codigo) => ({
        codigo: codigo.itemCodigoSIE.codigo,
        talla: codigo.itemCodigoSIE.talla,
      }))
      .sort((a, b) => {
        const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
        if (byCodigo !== 0) return byCodigo;
        return normalizeTallaForSort(a.talla).localeCompare(normalizeTallaForSort(b.talla), "es", {
          sensitivity: "base",
        });
      });

    const tallas = Array.from(
      new Set(
        codigosSIE
          .map((codigo) => codigo.talla?.trim())
          .filter((talla): talla is string => typeof talla === "string" && talla.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return {
      codigoDepositoGeneral: caja.codigoDepositoGeneral,
      estanteria: caja.estanteria,
      cantidad: caja.cantidad,
      itemNombre: caja.item.nombre,
      codigosSIE,
      tallas,
    };
  });
}
