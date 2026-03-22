import { prisma } from "@/lib/prisma";

export type EtiquetaCajaPrintData = {
  codigoDepositoGeneral: number;
  estanteria: string;
  cantidad: number;
  equipos: Array<{
    itemId: string;
    itemNombre: string;
    codigosSIE: Array<{
      codigo: string;
      talla: string | null;
    }>;
    sinCodigo: boolean;
  }>;
  itemNombres: string[];
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
      items: {
        include: {
          item: {
            select: {
              itemId: true,
              nombre: true,
            },
          },
        },
      },
      codigosSIE: {
        include: {
          itemCodigoSIE: {
            select: {
              codigo: true,
              talla: true,
              item: {
                select: {
                  itemId: true,
                  nombre: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ codigoDepositoGeneral: "asc" }],
  });

  return cajas.map((caja) => {
    const codigosSIEConEquipo = caja.codigosSIE
      .map((codigo) => ({
        codigo: codigo.itemCodigoSIE.codigo,
        talla: codigo.itemCodigoSIE.talla,
        itemId: codigo.itemCodigoSIE.item.itemId.toString(),
        itemNombre: codigo.itemCodigoSIE.item.nombre,
      }))
      .sort((a, b) => {
        const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
        if (byCodigo !== 0) return byCodigo;
        return normalizeTallaForSort(a.talla).localeCompare(normalizeTallaForSort(b.talla), "es", {
          sensitivity: "base",
        });
      });

    const codigosSIE = codigosSIEConEquipo.map((codigo) => ({
      codigo: codigo.codigo,
      talla: codigo.talla,
    }));

    const tallas = Array.from(
      new Set(
        codigosSIE
          .map((codigo) => codigo.talla?.trim())
          .filter((talla): talla is string => typeof talla === "string" && talla.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    const equiposBase =
      caja.items.length > 0
        ? caja.items
            .map((entry) => ({
              itemId: entry.item.itemId.toString(),
              itemNombre: entry.item.nombre,
            }))
            .sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }))
        : Array.from(
            new Map(
              codigosSIEConEquipo.map((codigo) => [codigo.itemId, { itemId: codigo.itemId, itemNombre: codigo.itemNombre }]),
            ).values(),
          ).sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }));

    const equipos = equiposBase.map((equipo) => {
      const codigosEquipo = codigosSIEConEquipo
        .filter((codigo) => codigo.itemId === equipo.itemId)
        .map((codigo) => ({ codigo: codigo.codigo, talla: codigo.talla }));

      return {
        itemId: equipo.itemId,
        itemNombre: equipo.itemNombre,
        codigosSIE: codigosEquipo,
        sinCodigo: codigosEquipo.length === 0,
      };
    });

    const itemNombres = equipos.map((equipo) => equipo.itemNombre);

    return {
      codigoDepositoGeneral: caja.codigoDepositoGeneral,
      estanteria: caja.estanteria,
      cantidad: caja.cantidad,
      equipos,
      itemNombres,
      codigosSIE,
      tallas,
    };
  });
}
