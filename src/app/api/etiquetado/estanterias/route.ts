import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type CreateEstanteriaPayload = {
  codigo?: string;
  piso?: string | number;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    estanteria?: unknown;
  };
  return typeof candidate.estanteria !== "undefined";
}

function normalizeCodigo(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]$/.test(raw)) return null;
  return raw;
}

function parsePiso(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2) return null;
  return parsed;
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as CreateEstanteriaPayload;
  const codigo = normalizeCodigo(body.codigo);
  const piso = parsePiso(body.piso);

  if (!codigo || piso === null) {
    return NextResponse.json(
      { error: "Payload invalido. Usa codigo de una letra o numero y piso 1 o 2." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.estanteria.create({
      data: {
        codigo,
        piso,
      },
      select: {
        codigo: true,
        piso: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ESTANTERIA",
      entidadId: `${created.codigo}-${created.piso}`,
      detalle: {
        codigo: created.codigo,
        piso: created.piso,
      },
    });

    return NextResponse.json(
      {
        codigo: created.codigo,
        piso: created.piso,
        etiqueta: `${created.piso}${created.codigo}`,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Esa estanteria ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear la estanteria." }, { status: 500 });
  }
}
