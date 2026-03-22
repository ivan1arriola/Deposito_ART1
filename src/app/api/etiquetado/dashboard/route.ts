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
  };
  return (
    typeof candidate.item !== "undefined" &&
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.itemCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined"
  );
}

function normalizeTallaForSort(value: string | null) {
  return (value ?? "").trim().toUpperCase();
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
      ],
    }),
    prisma.caja.findMany({
      include: {
        codigosSIE: {
          include: {
            itemCodigoSIE: {
              select: {
                codigo: true,
                talla: true,
                item: {
                  select: {
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
      etiqueta: `${estanteria.piso}${estanteria.codigo}`,
    })),
    codigosSIE: codigosSIE.map((codigoSIE) => ({
      codigo: codigoSIE.codigo,
      talla: codigoSIE.talla,
      itemId: codigoSIE.itemId.toString(),
      itemNombre: codigoSIE.item.nombre,
    })),
    cajas: cajas.map((caja) => {
      const codigos = caja.codigosSIE
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
          codigos
            .map((codigo) => codigo.talla?.trim())
            .filter((talla): talla is string => typeof talla === "string" && talla.length > 0),
        ),
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      const itemNombres = Array.from(
        new Set(caja.codigosSIE.map((codigo) => codigo.itemCodigoSIE.item.nombre)),
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      return {
        codigoDepositoGeneral: caja.codigoDepositoGeneral,
        estanteria: caja.estanteria,
        cantidad: caja.cantidad,
        itemNombres,
        codigosSIE: codigos,
        tallas,
      };
    }),
  };

  return NextResponse.json(data);
}
