import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    item?: unknown;
    estanteria?: unknown;
    itemCodigoSIE?: unknown;
    caja?: unknown;
    cajaItem?: unknown;
  };
  return (
    typeof candidate.item !== "undefined" &&
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.itemCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined" &&
    typeof candidate.cajaItem !== "undefined"
  );
}

function normalizeTallaForSort(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeTalla(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : "-";
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const [items, estanterias, codigosSIE, cajas] = await Promise.all([
    prisma.item.findMany({
      orderBy: [{ nombre: "asc" }, { itemId: "asc" }],
      select: {
        itemId: true,
        nombre: true,
        activo: true,
      },
    }),
    prisma.estanteria.findMany({
      orderBy: [{ piso: "asc" }, { codigo: "asc" }],
      select: {
        codigo: true,
        piso: true,
      },
    }),
    prisma.itemCodigoSIE.findMany({
      include: {
        item: {
          select: {
            itemId: true,
            nombre: true,
          },
        },
      },
      orderBy: [
        { item: { nombre: "asc" } },
        { codigo: "asc" },
        { talla: "asc" },
        { itemCodigoSIEId: "asc" },
      ],
    }),
    prisma.caja.findMany({
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
                itemCodigoSIEId: true,
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
  ]);

  const data: EtiquetadoDashboardData = {
    generatedAt: formatDateTimeForDisplay(new Date()),
    items: items.map((item) => ({
      itemId: item.itemId.toString(),
      nombre: item.nombre,
      activo: item.activo,
    })),
    estanterias: estanterias.map((estanteria) => ({
      codigo: estanteria.codigo,
      piso: estanteria.piso,
      etiqueta: `${estanteria.codigo} Piso ${estanteria.piso}`,
    })),
    codigosSIE: codigosSIE.map((codigoSIE) => ({
      codigoSIEId: codigoSIE.itemCodigoSIEId.toString(),
      codigo: codigoSIE.codigo,
      talla: normalizeTalla(codigoSIE.talla),
      itemId: codigoSIE.itemId.toString(),
      itemNombre: codigoSIE.item.nombre,
    })),
    cajas: cajas.map((caja) => {
      const codigosConEquipo = caja.codigosSIE
        .map((codigo) => ({
          codigoSIEId: codigo.itemCodigoSIE.itemCodigoSIEId.toString(),
          codigo: codigo.itemCodigoSIE.codigo,
          talla: normalizeTalla(codigo.itemCodigoSIE.talla),
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

      const codigos = codigosConEquipo.map((codigo) => ({
        codigoSIEId: codigo.codigoSIEId,
        codigo: codigo.codigo,
        talla: codigo.talla,
      }));

      const tallas = Array.from(
        new Set(
          codigos
            .map((codigo) => codigo.talla.trim())
            .filter((talla) => talla.length > 0 && talla !== "-"),
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
                codigosConEquipo.map((codigo) => [
                  codigo.itemId,
                  {
                    itemId: codigo.itemId,
                    itemNombre: codigo.itemNombre,
                    cantidad: codigosConEquipo.filter((entry) => entry.itemId === codigo.itemId).length || 1,
                  },
                ]),
              ).values(),
            ).sort((a, b) => a.itemNombre.localeCompare(b.itemNombre, "es", { sensitivity: "base" }));

      const equipos = equiposBase.map((equipo) => {
        const codigosSIEEquipo = codigosConEquipo
          .filter((codigo) => codigo.itemId === equipo.itemId)
          .map((codigo) => ({
            codigoSIEId: codigo.codigoSIEId,
            codigo: codigo.codigo,
            talla: codigo.talla,
          }));

        return {
          itemId: equipo.itemId,
          itemNombre: equipo.itemNombre,
          cantidad: equipo.cantidad,
          codigosSIE: codigosSIEEquipo,
          sinCodigo: codigosSIEEquipo.length === 0,
        };
      });

      const itemNombres = equipos.map((equipo) => equipo.itemNombre);
      const cantidadTotal = equipos.reduce((sum, equipo) => sum + equipo.cantidad, 0);

      return {
        codigoDepositoGeneral: caja.codigoDepositoGeneral,
        estanteria: caja.estanteria,
        piso: caja.piso,
        cantidad: cantidadTotal > 0 ? cantidadTotal : codigosConEquipo.length,
        equipos,
        itemNombres,
        codigosSIE: codigos,
        tallas,
      };
    }),
  };

  return NextResponse.json(data);
}
