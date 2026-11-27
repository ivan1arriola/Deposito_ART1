import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  try {
    const registros = await prisma.papeleraRegistro.findMany({
      select: {
        papeleraId: true,
        tipo: true,
        nombre: true,
        originalId: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(registros);
  } catch (_error) {
    return NextResponse.json({ error: "No se pudo obtener la papelera." }, { status: 500 });
  }
}
