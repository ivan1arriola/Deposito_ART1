import { NextResponse } from "next/server";
import { TipoPersonal } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { logAudit } from "@/lib/audit";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  formatDateTimeForDisplay,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";

type ObservacionPayload = {
  fecha: string;
  texto: string;
};

function isValidPayload(body: unknown): body is ObservacionPayload {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.fecha === "string" &&
    candidate.fecha.trim() !== "" &&
    typeof candidate.texto === "string" &&
    candidate.texto.trim() !== ""
  );
}

function parseDateOnly(value: string) {
  return dateInputToDate(value);
}

function serializeObservacion(observacion: {
  observacionId: bigint;
  ci: string;
  fecha: Date;
  texto: string;
  createdAt: Date;
}) {
  return {
    observacionId: observacion.observacionId.toString(),
    ci: observacion.ci,
    fecha: formatDateOnlyFromDate(observacion.fecha) ?? "",
    texto: observacion.texto,
    createdAt: formatDateTimeForDisplay(observacion.createdAt),
  };
}

export async function GET(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const persona = await prisma.personal.findFirst({
    where: { ci: ciDecoded, tipo: TipoPersonal.SUBALTERNO },
    select: { ci: true },
  });
  if (!persona) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  const observaciones = await prisma.observacion.findMany({
    where: { ci: ciDecoded },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(observaciones.map(serializeObservacion));
}

export async function POST(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa fecha y texto." }, { status: 400 });
  }

  const fecha = parseDateOnly(body.fecha);
  if (!fecha) {
    return NextResponse.json({ error: "La fecha de la observación es invalida." }, { status: 400 });
  }
  if (isDateInputAfterToday(body.fecha)) {
    return NextResponse.json({ error: "La fecha de la observación no puede ser futura." }, { status: 400 });
  }

  const texto = body.texto.trim();

  const persona = await prisma.personal.findFirst({
    where: { ci: ciDecoded, tipo: TipoPersonal.SUBALTERNO },
    select: { ci: true },
  });
  if (!persona) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  try {
    const created = await prisma.observacion.create({
      data: {
        ci: ciDecoded,
        fecha,
        texto,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "OBSERVACION",
      entidadId: created.observacionId.toString(),
      detalle: {
        ci: ciDecoded,
        fecha: formatDateOnlyForDisplay(body.fecha),
        texto,
      },
    });

    return NextResponse.json(
      serializeObservacion(created),
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la observación." }, { status: 500 });
  }
}
