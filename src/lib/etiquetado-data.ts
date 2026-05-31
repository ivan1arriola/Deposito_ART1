import { prisma } from "@/lib/prisma";

export type EtiquetaCajaPrintData = {
  codigoDepositoGeneral: number;
  estanteria: string;
  piso: string;
  cantidad: number;
  equipos: Array<{
    equipoId: string;
    itemNombre: string;
    cantidad: number;
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

export type CajaListadoPrintData = {
  piso: string;
  estanteria: string;
  codigoDepositoGeneral: number;
  contenido: string;
  cantidad: number;
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
      equipos: {
        include: {
          equipo: {
            select: {
              equipoId: true,
              nombre: true,
            },
          },
        },
      },
      codigosSIE: {
        include: {
          equipoCodigoSIE: {
            select: {
              codigo: true,
              talla: true,
              equipo: {
                select: {
                  equipoId: true,
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

  const etiquetas = cajas.map((caja) => {
    const codigosSIEConEquipo = caja.codigosSIE
      .map((codigo) => ({
        codigo: codigo.equipoCodigoSIE.codigo,
        talla: codigo.equipoCodigoSIE.talla,
        equipoId: codigo.equipoCodigoSIE.equipo.equipoId.toString(),
        itemNombre: codigo.equipoCodigoSIE.equipo.nombre,
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
          .filter((talla): talla is string => typeof talla === "string" && talla.length > 0 && talla !== "-"),
      ),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    const equiposBase =
      caja.equipos.length > 0
        ? caja.equipos
            .map((entry) => ({
              equipoId: entry.equipo.equipoId.toString(),
              itemNombre: entry.equipo.nombre,
              cantidad: entry.cantidad,
            }))
            .sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }))
        : Array.from(
            new Map(
              codigosSIEConEquipo.map((codigo) => [
                codigo.equipoId,
                {
                  equipoId: codigo.equipoId,
                  itemNombre: codigo.itemNombre,
                  cantidad: codigosSIEConEquipo.filter((entry) => entry.equipoId === codigo.equipoId).length || 1,
                },
              ]),
            ).values(),
          ).sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }));

    const equipos = equiposBase.map((equipo) => {
      const codigosEquipo = codigosSIEConEquipo
        .filter((codigo) => codigo.equipoId === equipo.equipoId)
        .map((codigo) => ({ codigo: codigo.codigo, talla: codigo.talla }));

      return {
        equipoId: equipo.equipoId,
        itemNombre: equipo.itemNombre,
        cantidad: equipo.cantidad,
        codigosSIE: codigosEquipo,
        sinCodigo: codigosEquipo.length === 0,
      };
    });

    const itemNombres = equipos.map((equipo) => equipo.itemNombre);
    const cantidadTotal = equipos.reduce((sum, equipo) => sum + equipo.cantidad, 0);

    return {
      codigoDepositoGeneral: caja.codigoDepositoGeneral,
      estanteria: caja.estanteria,
      piso: String(caja.piso),
      cantidad: cantidadTotal > 0 ? cantidadTotal : codigosSIEConEquipo.length,
      equipos,
      itemNombres,
      codigosSIE,
      tallas,
    };
  });

  if (codigosFiltrados.length === 0) {
    return etiquetas;
  }

  const ordenPorCodigo = new Map(codigosFiltrados.map((codigo, index) => [codigo, index]));
  return etiquetas.sort((a, b) => {
    const ordenA = ordenPorCodigo.get(a.codigoDepositoGeneral);
    const ordenB = ordenPorCodigo.get(b.codigoDepositoGeneral);
    if (typeof ordenA === "number" && typeof ordenB === "number") {
      return ordenA - ordenB;
    }
    if (typeof ordenA === "number") return -1;
    if (typeof ordenB === "number") return 1;
    return a.codigoDepositoGeneral - b.codigoDepositoGeneral;
  });
}

export async function getListadoCajasPrintData(): Promise<CajaListadoPrintData[]> {
  const cajas = await getEtiquetasCajaData();

  return cajas
    .flatMap((caja) => {
      const pisoPrincipal = Number(caja.piso);
      const baseRow = {
        piso: caja.piso,
        estanteria: caja.estanteria,
        codigoDepositoGeneral: caja.codigoDepositoGeneral,
        pisoPrincipal: Number.isFinite(pisoPrincipal) ? pisoPrincipal : Number.POSITIVE_INFINITY,
      };

      if (caja.equipos.length === 0) {
        return [
          {
            ...baseRow,
            contenido: "-",
            cantidad: 0,
          },
        ];
      }

      return caja.equipos.map((equipo) => ({
        ...baseRow,
        contenido: equipo.itemNombre,
        cantidad: equipo.cantidad,
      }));
    })
    .sort((a, b) => {
      if (a.pisoPrincipal !== b.pisoPrincipal) return a.pisoPrincipal - b.pisoPrincipal;
      const byEstanteria = a.estanteria.localeCompare(b.estanteria, "es", { sensitivity: "base" });
      if (byEstanteria !== 0) return byEstanteria;
      if (a.codigoDepositoGeneral !== b.codigoDepositoGeneral) return a.codigoDepositoGeneral - b.codigoDepositoGeneral;
      return a.contenido.localeCompare(b.contenido, "es", { sensitivity: "base" });
    })
    .map((row) => ({
      piso: row.piso,
      estanteria: row.estanteria,
      codigoDepositoGeneral: row.codigoDepositoGeneral,
      contenido: row.contenido,
      cantidad: row.cantidad,
    }));
}
