import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

type UpdateCodigoSIEPayload = {
  codigo?: string;
  talla?: string | null;
  equipoId?: string | number;
};

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    equipo?: unknown;
    equipoCodigoSIE?: unknown;
    cajaEquipoCodigoSIE?: unknown;
  };
  return (
    typeof candidate.equipo !== "undefined" &&
    typeof candidate.equipoCodigoSIE !== "undefined" &&
    typeof candidate.cajaEquipoCodigoSIE !== "undefined"
  );
}

const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

function normalizeCodigoSIE(value: string) {
  const normalized = decodeURIComponent(value).trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function normalizeCodigoSIEInput(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!SIE_CODE_REGEX.test(normalized)) return null;
  return normalized;
}

function normalizeTalla(value: unknown) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized.length > 0 ? normalized : "-";
}

function parseItemId(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseCodigoSIEId(value: string | null) {
  if (!value) return null;
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

export async function PUT(request: Request, context: { params: Promise<{ codigo: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const { codigo: codigoParam } = await context.params;
  const originalCodigo = normalizeCodigoSIE(codigoParam);
  if (!originalCodigo) {
    return NextResponse.json({ error: "Codigo SIE invalido." }, { status: 400 });
  }

  const url = new URL(request.url);
  const codigoSIEId = parseCodigoSIEId(url.searchParams.get("id"));
  if (codigoSIEId === null) {
    return NextResponse.json({ error: "Falta id del codigo SIE a editar." }, { status: 400 });
  }

  const body = (await request.json()) as UpdateCodigoSIEPayload;
  const codigo = normalizeCodigoSIEInput(body.codigo);
  const talla = normalizeTalla(body.talla);
  const equipoId = parseItemId(body.equipoId);

  if (!codigo || equipoId === null) {
    return NextResponse.json(
      { error: "Payload invalido. codigo e equipo son obligatorios. Formatos validos: 8 digitos o 3 letras y 2 numeros." },
      { status: 400 },
    );
  }

  const [existing, equipo] = await Promise.all([
    prisma.equipoCodigoSIE.findUnique({
      where: { equipoCodigoSIEId: codigoSIEId },
      include: {
        equipo: {
          select: { equipoId: true, nombre: true },
        },
      },
    }),
    prisma.equipo.findUnique({
      where: { equipoId },
      select: { equipoId: true, nombre: true },
    }),
  ]);

  if (!existing) {
    return NextResponse.json({ error: "Codigo SIE no encontrado." }, { status: 404 });
  }
  if (existing.codigo !== originalCodigo) {
    return NextResponse.json({ error: "El codigo SIE indicado no coincide con el registro seleccionado." }, { status: 409 });
  }
  if (!equipo) {
    return NextResponse.json({ error: "El equipo seleccionado no existe." }, { status: 400 });
  }

  const cajasVinculadas = await prisma.cajaEquipoCodigoSIE.count({
    where: { equipoCodigoSIEId: existing.equipoCodigoSIEId },
  });

  if (existing.equipoId.toString() !== equipoId.toString() && cajasVinculadas > 0) {
    return NextResponse.json(
      { error: "No se puede cambiar el equipo de un codigo SIE que ya esta vinculado a cajas." },
      { status: 409 },
    );
  }

  try {
    const updated = await prisma.equipoCodigoSIE.update({
      where: { equipoCodigoSIEId: existing.equipoCodigoSIEId },
      data: { codigo, talla, equipoId },
      include: {
        equipo: {
          select: { equipoId: true, nombre: true },
        },
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "CODIGO_SIE",
      entidadId: updated.equipoCodigoSIEId.toString(),
      detalle: {
        codigoSIEId: updated.equipoCodigoSIEId.toString(),
        codigoAntes: existing.codigo,
        codigoDespues: updated.codigo,
        tallaAntes: existing.talla,
        tallaDespues: updated.talla,
        equipoIdAntes: existing.equipo.equipoId.toString(),
        equipoIdDespues: updated.equipo.equipoId.toString(),
        equipoNombreAntes: existing.equipo.nombre,
        equipoNombreDespues: updated.equipo.nombre,
        cajasVinculadas,
      },
    });

    return NextResponse.json({
      codigoSIEId: updated.equipoCodigoSIEId.toString(),
      codigo: updated.codigo,
      talla: updated.talla,
      equipoId: updated.equipo.equipoId.toString(),
      equipoNombre: updated.equipo.nombre,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Ya existe un codigo SIE con la misma combinacion de codigo, talla e equipo." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el codigo SIE." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ codigo: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const { codigo: codigoParam } = await context.params;
  const codigo = normalizeCodigoSIE(codigoParam);
  if (!codigo) {
    return NextResponse.json({ error: "Codigo SIE invalido." }, { status: 400 });
  }

  const url = new URL(request.url);
  const codigoSIEId = parseCodigoSIEId(url.searchParams.get("id"));
  if (codigoSIEId === null) {
    return NextResponse.json({ error: "Falta id del codigo SIE a eliminar." }, { status: 400 });
  }

  const existing = await prisma.equipoCodigoSIE.findUnique({
    where: { equipoCodigoSIEId: codigoSIEId },
    include: {
      equipo: {
        select: { equipoId: true, nombre: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Codigo SIE no encontrado." }, { status: 404 });
  }
  if (existing.codigo !== codigo) {
    return NextResponse.json({ error: "El codigo SIE indicado no coincide con el registro seleccionado." }, { status: 409 });
  }

  const cajasVinculadas = await prisma.cajaEquipoCodigoSIE.count({
    where: {
      equipoCodigoSIEId: existing.equipoCodigoSIEId,
    },
  });

  try {
    await prisma.equipoCodigoSIE.delete({
      where: {
        equipoCodigoSIEId: existing.equipoCodigoSIEId,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "CODIGO_SIE",
      entidadId: existing.equipoCodigoSIEId.toString(),
      detalle: {
        codigoSIEId: existing.equipoCodigoSIEId.toString(),
        codigo: existing.codigo,
        talla: existing.talla,
        equipoId: existing.equipo.equipoId.toString(),
        equipoNombre: existing.equipo.nombre,
        cajasVinculadasEliminadas: cajasVinculadas,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el codigo SIE." }, { status: 500 });
  }
}
