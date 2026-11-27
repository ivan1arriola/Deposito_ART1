import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import type { EtiquetadoDashboardData } from "@/types/etiquetado";

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    equipo?: unknown;
    estanteria?: unknown;
    equipoCodigoSIE?: unknown;
    caja?: unknown;
    cajaEquipo?: unknown;
  };
  return (
    typeof candidate.equipo !== "undefined" &&
    typeof candidate.estanteria !== "undefined" &&
    typeof candidate.equipoCodigoSIE !== "undefined" &&
    typeof candidate.caja !== "undefined" &&
    typeof candidate.cajaEquipo !== "undefined"
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
      {
        error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo.",
      },
      { status: 503 }
    );
  }

  const [equipos, estanterias, codigosSIE, cajas] = await Promise.all([
    prisma.equipo.findMany({
      orderBy: [{ nombre: "asc" }, { equipoId: "asc" }],
      select: {
        equipoId: true,
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
    prisma.equipoCodigoSIE.findMany({
      include: {
        equipo: {
          select: {
            equipoId: true,
            nombre: true,
          },
        },
      },
      orderBy: [
        { equipo: { nombre: "asc" } },
        { codigo: "asc" },
        { talla: "asc" },
        { equipoCodigoSIEId: "asc" },
      ],
    }),
    prisma.caja.findMany({
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
                equipoCodigoSIEId: true,
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
    }),
  ]);

  const data: EtiquetadoDashboardData = {
    generatedAt: formatDateTimeForDisplay(new Date()),
    equipos: equipos.map((equipo) => ({
      equipoId: equipo.equipoId.toString(),
      nombre: equipo.nombre,
      activo: equipo.activo,
    })),
    estanterias: estanterias.map((estanteria) => ({
      codigo: estanteria.codigo,
      piso: estanteria.piso,
      etiqueta: `${estanteria.codigo} Piso ${estanteria.piso}`,
    })),
    codigosSIE: codigosSIE.map((codigoSIE) => ({
      codigoSIEId: codigoSIE.equipoCodigoSIEId.toString(),
      codigo: codigoSIE.codigo,
      talla: normalizeTalla(codigoSIE.talla),
      equipoId: codigoSIE.equipoId.toString(),
      equipoNombre: codigoSIE.equipo.nombre,
    })),
    cajas: cajas.map((caja) => {
      const codigosConEquipo = caja.codigosSIE
        .map((codigo) => ({
          codigoSIEId: codigo.equipoCodigoSIE.equipoCodigoSIEId.toString(),
          codigo: codigo.equipoCodigoSIE.codigo,
          talla: normalizeTalla(codigo.equipoCodigoSIE.talla),
          equipoId: codigo.equipoCodigoSIE.equipo.equipoId.toString(),
          equipoNombre: codigo.equipoCodigoSIE.equipo.nombre,
        }))
        .sort((a, b) => {
          const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
          if (byCodigo !== 0) return byCodigo;
          return normalizeTallaForSort(a.talla).localeCompare(
            normalizeTallaForSort(b.talla),
            "es",
            {
              sensitivity: "base",
            }
          );
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
            .filter((talla) => talla.length > 0 && talla !== "-")
        )
      ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

      const equiposBase =
        caja.equipos.length > 0
          ? caja.equipos
              .map((entry) => ({
                equipoId: entry.equipo.equipoId.toString(),
                equipoNombre: entry.equipo.nombre,
                cantidad: entry.cantidad,
              }))
              .sort((a, b) =>
                a.equipoNombre.localeCompare(b.equipoNombre, "es", { sensitivity: "base" })
              )
          : Array.from(
              new Map(
                codigosConEquipo.map((codigo) => [
                  codigo.equipoId,
                  {
                    equipoId: codigo.equipoId,
                    equipoNombre: codigo.equipoNombre,
                    cantidad:
                      codigosConEquipo.filter((entry) => entry.equipoId === codigo.equipoId)
                        .length || 1,
                  },
                ])
              ).values()
            ).sort((a, b) =>
              a.equipoNombre.localeCompare(b.equipoNombre, "es", { sensitivity: "base" })
            );

      const equipos = equiposBase.map((equipo) => {
        const codigosSIEEquipo = codigosConEquipo
          .filter((codigo) => codigo.equipoId === equipo.equipoId)
          .map((codigo) => ({
            codigoSIEId: codigo.codigoSIEId,
            codigo: codigo.codigo,
            talla: codigo.talla,
          }));

        return {
          equipoId: equipo.equipoId,
          equipoNombre: equipo.equipoNombre,
          cantidad: equipo.cantidad,
          codigosSIE: codigosSIEEquipo,
          sinCodigo: codigosSIEEquipo.length === 0,
        };
      });

      const equipoNombres = equipos.map((equipo) => equipo.equipoNombre);
      const cantidadTotal = equipos.reduce((sum, equipo) => sum + equipo.cantidad, 0);

      return {
        codigoDepositoGeneral: caja.codigoDepositoGeneral,
        estanteria: caja.estanteria,
        piso: caja.piso,
        cantidad: cantidadTotal > 0 ? cantidadTotal : codigosConEquipo.length,
        equipos,
        equipoNombres,
        codigosSIE: codigos,
        tallas,
      };
    }),
  };

  return NextResponse.json(data);
}
