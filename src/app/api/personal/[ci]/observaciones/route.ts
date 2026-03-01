import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { logAudit } from "@/lib/audit";
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
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isFutureDate(rawValue: string) {
  const today = new Date();
  const todayValue = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return rawValue.trim() > todayValue;
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
    fecha: observacion.fecha.toISOString(),
    texto: observacion.texto,
    createdAt: observacion.createdAt.toISOString(),
  };
}

export async function GET(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const persona = await prisma.personal.findUnique({
    where: { ci: ciDecoded },
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
    return NextResponse.json({ error: "La fecha de la observacion es invalida." }, { status: 400 });
  }
  if (isFutureDate(body.fecha)) {
    return NextResponse.json({ error: "La fecha de la observacion no puede ser futura." }, { status: 400 });
  }

  const texto = body.texto.trim();

  const persona = await prisma.personal.findUnique({
    where: { ci: ciDecoded },
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
        fecha: body.fecha.trim(),
        texto,
      },
    });

    return NextResponse.json(
      serializeObservacion(created),
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la observacion." }, { status: 500 });
  }
}
