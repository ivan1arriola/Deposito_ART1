import { prisma } from "@/lib/prisma";

export type EtiquetaCajaPrintData = {
  codigoDepositoGeneral: number;
  estanteria: string;
  piso: string;
  cantidad: number;
  equipos: Array<{
    itemId: string;
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

  const [cajas, estanterias] = await Promise.all([
    prisma.caja.findMany({
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
    }),
    prisma.estanteria.findMany({
      select: {
        codigo: true,
        piso: true,
      },
      orderBy: [{ piso: "asc" }, { codigo: "asc" }],
    }),
  ]);

  const pisosByEstanteria = new Map<string, number[]>();
  for (const estanteria of estanterias) {
    const current = pisosByEstanteria.get(estanteria.codigo) ?? [];
    current.push(estanteria.piso);
    pisosByEstanteria.set(estanteria.codigo, current);
  }

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
          .filter((talla): talla is string => typeof talla === "string" && talla.length > 0 && talla !== "-"),
      ),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    const equiposBase =
      caja.items.length > 0
        ? caja.items
            .map((entry) => ({
              itemId: entry.item.itemId.toString(),
              itemNombre: entry.item.nombre,
              cantidad: entry.cantidad,
            }))
            .sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }))
        : Array.from(
            new Map(
              codigosSIEConEquipo.map((codigo) => [
                codigo.itemId,
                {
                  itemId: codigo.itemId,
                  itemNombre: codigo.itemNombre,
                  cantidad: codigosSIEConEquipo.filter((entry) => entry.itemId === codigo.itemId).length || 1,
                },
              ]),
            ).values(),
          ).sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }));

    const equipos = equiposBase.map((equipo) => {
      const codigosEquipo = codigosSIEConEquipo
        .filter((codigo) => codigo.itemId === equipo.itemId)
        .map((codigo) => ({ codigo: codigo.codigo, talla: codigo.talla }));

      return {
        itemId: equipo.itemId,
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
      piso: resolvePisoForEstanteria(pisosByEstanteria.get(caja.estanteria) ?? []),
      cantidad: cantidadTotal > 0 ? cantidadTotal : caja.cantidad,
      equipos,
      itemNombres,
      codigosSIE,
      tallas,
    };
  });
}

function resolvePisoForEstanteria(pisos: number[]) {
  if (pisos.length === 0) return "-";
  return String(pisos[0]);
}

export async function getListadoCajasPrintData(): Promise<CajaListadoPrintData[]> {
  const [cajas, estanterias] = await Promise.all([
    getEtiquetasCajaData(),
    prisma.estanteria.findMany({
      select: {
        codigo: true,
        piso: true,
      },
      orderBy: [{ piso: "asc" }, { codigo: "asc" }],
    }),
  ]);

  const pisosByEstanteria = new Map<string, number[]>();
  for (const estanteria of estanterias) {
    const current = pisosByEstanteria.get(estanteria.codigo) ?? [];
    current.push(estanteria.piso);
    pisosByEstanteria.set(estanteria.codigo, current);
  }

  return cajas
    .flatMap((caja) => {
      const pisos = pisosByEstanteria.get(caja.estanteria) ?? [];
      const pisoPrincipal = pisos.length > 0 ? pisos[0] : Number.POSITIVE_INFINITY;
      const baseRow = {
        piso: resolvePisoForEstanteria(pisos),
        estanteria: caja.estanteria,
        codigoDepositoGeneral: caja.codigoDepositoGeneral,
        pisoPrincipal,
      };

      if (caja.equipos.length === 0) {
        return [
          {
            ...baseRow,
            contenido: "-",
            cantidad: caja.cantidad,
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
