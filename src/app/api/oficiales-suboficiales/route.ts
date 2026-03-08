import { NextResponse } from "next/server";
import { TipoPersonal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const oficialesSuboficiales = await prisma.personal.findMany({
    where: {
      tipo: {
        in: [TipoPersonal.OFICIAL, TipoPersonal.SUBOFICIAL],
      },
    },
    select: {
      ci: true,
      tipo: true,
      nombre1: true,
      nombre2: true,
      apellido1: true,
      apellido2: true,
      rangoId: true,
      rango: {
        select: {
          rangoId: true,
          abreviacion: true,
          nombreCompleto: true,
          orden: true,
        },
      },
      tallas: {
        select: {
          tallaTipo: { select: { nombre: true } },
          tallaValor: true,
        },
        orderBy: { tallaTipoId: "asc" },
      },
    },
    orderBy: [
      { tipo: "asc" },
      { rango: { orden: "asc" } },
      { apellido1: "asc" },
      { nombre1: "asc" },
    ],
  });

  return NextResponse.json(
    oficialesSuboficiales.map((registro) => ({
      ci: registro.ci,
      nombre: [registro.nombre1, registro.nombre2].filter(Boolean).join(" ").trim(),
      apellido: [registro.apellido1, registro.apellido2].filter(Boolean).join(" ").trim(),
      tipo: registro.tipo === TipoPersonal.OFICIAL ? "OFICIAL" : "SUBOFICIAL",
      gradoMandoId: registro.rangoId,
      gradoMando: {
        gradoMandoId: registro.rango.rangoId,
        abreviacion: registro.rango.abreviacion,
        nombreCompleto: registro.rango.nombreCompleto,
        orden: registro.rango.orden,
      },
      tallas: registro.tallas,
    })),
  );
}
