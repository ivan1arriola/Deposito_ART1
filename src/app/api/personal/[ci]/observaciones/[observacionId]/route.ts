import { NextResponse } from "next/server";
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

function parseObservacionId(raw: string) {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return null;
  return BigInt(value);
}

function parseDateOnly(value: string) {
  return dateInputToDate(value);
}

export async function PUT(req: Request, context: { params: Promise<{ ci: string; observacionId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { ci, observacionId: observacionIdParam } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  const observacionId = parseObservacionId(observacionIdParam);
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!observacionId) return NextResponse.json({ error: "observacionId invalido." }, { status: 400 });

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

  const existing = await prisma.observacion.findFirst({
    where: {
      observacionId,
      ci: ciDecoded,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Observación no encontrada." }, { status: 404 });
  }

  const texto = body.texto.trim();

  try {
    const updated = await prisma.observacion.update({
      where: { observacionId },
      data: {
        fecha,
        texto,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "OBSERVACION",
      entidadId: updated.observacionId.toString(),
      detalle: {
        previo: {
          ci: ciDecoded,
          fecha: formatDateOnlyFromDate(existing.fecha),
          texto: existing.texto,
        },
        nuevo: {
          ci: ciDecoded,
          fecha: formatDateOnlyFromDate(updated.fecha),
          texto: updated.texto,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      observacionId: updated.observacionId.toString(),
      ci: updated.ci,
      fecha: formatDateOnlyFromDate(updated.fecha),
      texto: updated.texto,
      createdAt: formatDateTimeForDisplay(updated.createdAt),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la observación." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ ci: string; observacionId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { ci, observacionId: observacionIdParam } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  const observacionId = parseObservacionId(observacionIdParam);
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!observacionId) return NextResponse.json({ error: "observacionId invalido." }, { status: 400 });

  const existing = await prisma.observacion.findFirst({
    where: {
      observacionId,
      ci: ciDecoded,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Observación no encontrada." }, { status: 404 });
  }

  try {
    await prisma.observacion.delete({
      where: { observacionId },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "OBSERVACION",
      entidadId: observacionId.toString(),
      detalle: {
        ci: ciDecoded,
        fecha: formatDateOnlyFromDate(existing.fecha),
        texto: existing.texto,
      },
    });

    return NextResponse.json({ ok: true, observacionId: observacionId.toString(), ci: ciDecoded });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la observación." }, { status: 500 });
  }
}
