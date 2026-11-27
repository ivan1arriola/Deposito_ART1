import { NextResponse } from "next/server";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  try {
    // 1. Fetch all personnel currently flagged as "baja: true" (outstanding returns)
    const pendingBajas = await prisma.personal.findMany({
      where: { baja: true },
      include: {
        rango: true,
        bateria: true,
      },
    });

    const pendingList = await Promise.all(
      pendingBajas.map(async (p) => {
        // Calculate active loans
        const activeLoans = await prisma.movimiento.findMany({
          where: {
            destinatarioPersonal: { is: { ci: p.ci } },
            tipo: TipoMovimiento.PRESTAMO,
            prestamoActivo: { isNot: null },
          },
          include: {
            equipos: { include: { equipo: true } },
            prestamoActivo: true,
          },
        });

        // Calculate vestuario balance
        const vestuarioMovements = await prisma.movimientoEquipo.findMany({
          where: {
            movimiento: {
              destinatarioPersonal: { is: { ci: p.ci } },
              tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
            },
          },
          include: {
            equipo: true,
            movimiento: true,
          },
        });

        const vestuarioBalances: Record<string, { nombre: string; cantidad: number }> = {};
        for (const vm of vestuarioMovements) {
          const nombre = vm.equipo.nombre;
          if (!vestuarioBalances[nombre]) {
            vestuarioBalances[nombre] = { nombre, cantidad: 0 };
          }
          if (vm.movimiento.tipo === TipoMovimiento.ENTREGA) {
            vestuarioBalances[nombre].cantidad += vm.cantidad;
          } else {
            vestuarioBalances[nombre].cantidad -= vm.cantidad;
          }
        }
        const outstandingVestuario = Object.values(vestuarioBalances).filter((b) => b.cantidad > 0);

        return {
          ci: p.ci,
          apellido1: p.apellido1,
          apellido2: p.apellido2,
          nombre1: p.nombre1,
          nombre2: p.nombre2,
          telefonoContacto: p.telefonoContacto,
          grado: p.rango.nombreCompleto,
          gradoAbreviacion: p.rango.abreviacion,
          bateria: p.bateria?.nombre ?? null,
          tipo:
            p.rango.tipo === TipoPersonal.SUBALTERNO
              ? "SUBALTERNO"
              : p.rango.tipo === TipoPersonal.OFICIAL
                ? "OFICIAL"
                : "SUBOFICIAL",
          outstandingLoans: activeLoans.map((l) => ({
            movimientoId: l.movimientoId.toString(),
            reciboNumero: l.prestamoActivo?.reciboNumero,
            fecha: l.fecha,
            equipos: l.equipos.map((i) => ({ nombre: i.equipo.nombre, cantidad: i.cantidad })),
          })),
          outstandingVestuario,
        };
      })
    );

    // 2. Fetch all fully archived personal history records
    const historyRecords = await prisma.personalHistorial.findMany({
      orderBy: { bajaAt: "desc" },
    });

    const historyList = await Promise.all(
      historyRecords.map(async (h) => {
        const rango = await prisma.rango.findUnique({
          where: { rangoId: h.rangoId },
          select: { abreviacion: true, nombreCompleto: true },
        });

        return {
          ci: h.ci,
          apellido1: h.apellido1,
          apellido2: h.apellido2,
          nombre1: h.nombre1,
          nombre2: h.nombre2,
          telefonoContacto: h.telefonoContacto,
          grado: rango?.nombreCompleto ?? "Grado desconocido",
          gradoAbreviacion: rango?.abreviacion ?? "GD",
          bajaAt: h.bajaAt,
          tipo: h.tipo,
          tallas: h.tallas,
          observaciones: h.observaciones,
        };
      })
    );

    return NextResponse.json({
      pendientes: pendingList,
      historial: historyList,
    });
  } catch (error) {
    console.log("Error al obtener lista de bajas:", error);
    return NextResponse.json(
      { error: "No se pudo recuperar la información de bajas." },
      { status: 500 }
    );
  }
}
