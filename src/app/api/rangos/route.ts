import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { compareRankAbbreviation } from "@/lib/rank-order";

type RangoPayload = {
  abreviacion: string;
  nombreCompleto: string;
};

function isValidPayload(body: unknown): body is RangoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.abreviacion === "string" &&
    candidate.abreviacion.trim() !== "" &&
    typeof candidate.nombreCompleto === "string" &&
    candidate.nombreCompleto.trim() !== ""
  );
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const rangos = await prisma.rango.findMany({
    orderBy: { rangoId: "asc" },
  });

  rangos.sort((a, b) => compareRankAbbreviation(a.abreviacion, b.abreviacion));

  return NextResponse.json(rangos);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "manage_users");
  if (!auth.ok) return auth.response;

  const body = await req.json();

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. 'abreviacion' y 'nombreCompleto' son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.rango.create({
      data: {
        abreviacion: body.abreviacion.trim(),
        nombreCompleto: body.nombreCompleto.trim(),
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "GRADO_PERSONAL",
      entidadId: String(created.rangoId),
      detalle: { abreviacion: created.abreviacion, nombreCompleto: created.nombreCompleto },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "La abreviacion o el nombre completo ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el grado del personal." }, { status: 500 });
  }
}
