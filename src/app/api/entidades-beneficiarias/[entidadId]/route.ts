import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  normalizeEntidadBeneficiariaKey,
  parseEntidadBeneficiariaClase,
} from "@/lib/entidades-beneficiarias";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/user-role";

function parseEntidadId(raw: string) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function PATCH(req: Request, context: { params: Promise<{ entidadId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar entidades beneficiarias." },
      { status: 403 }
    );
  }

  const { entidadId: rawId } = await context.params;
  const entidadBeneficiariaId = parseEntidadId(rawId);
  if (entidadBeneficiariaId === null) {
    return NextResponse.json({ error: "entidadId inválido." }, { status: 400 });
  }

  const body = (await req.json()) as {
    clase?: unknown;
    nombre?: unknown;
    activo?: unknown;
  };

  try {
    const existing = await prisma.entidadBeneficiaria.findUnique({
      where: { entidadBeneficiariaId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entidad no encontrada." }, { status: 404 });
    }

    const nextClase =
      body.clase !== undefined
        ? parseEntidadBeneficiariaClase(body.clase)
        : existing.clase === "EXTERNO"
          ? "EXTERNO"
          : "INTERNO";
    if (!nextClase) {
      return NextResponse.json({ error: "Clase inválida." }, { status: 400 });
    }

    const nextNombre =
      body.nombre !== undefined
        ? typeof body.nombre === "string"
          ? body.nombre.trim()
          : ""
        : existing.nombre;
    const nextNormalizado = normalizeEntidadBeneficiariaKey(nextNombre);
    if (!nextNombre || !nextNormalizado) {
      return NextResponse.json({ error: "Nombre inválido." }, { status: 400 });
    }

    const nextActivo = typeof body.activo === "boolean" ? body.activo : existing.activo;

    const duplicate = await prisma.entidadBeneficiaria.findUnique({
      where: {
        clase_nombreNormalizado: {
          clase: nextClase,
          nombreNormalizado: nextNormalizado,
        },
      },
    });
    if (duplicate && duplicate.entidadBeneficiariaId !== entidadBeneficiariaId) {
      return NextResponse.json(
        { error: "Ya existe otra entidad con ese nombre en la misma clase." },
        { status: 409 }
      );
    }

    const updated = await prisma.entidadBeneficiaria.update({
      where: { entidadBeneficiariaId },
      data: {
        clase: nextClase,
        nombre: nextNombre,
        nombreNormalizado: nextNormalizado,
        activo: nextActivo,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ENTIDAD_BENEFICIARIA",
      entidadId: String(updated.entidadBeneficiariaId),
      detalle: {
        previo: {
          clase: existing.clase,
          nombre: existing.nombre,
          activo: existing.activo,
        },
        nuevo: {
          clase: updated.clase,
          nombre: updated.nombre,
          activo: updated.activo,
        },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la entidad." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ entidadId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json(
      { error: "Solo un administrador puede desactivar entidades beneficiarias." },
      { status: 403 }
    );
  }

  const { entidadId: rawId } = await context.params;
  const entidadBeneficiariaId = parseEntidadId(rawId);
  if (entidadBeneficiariaId === null) {
    return NextResponse.json({ error: "entidadId inválido." }, { status: 400 });
  }

  try {
    const existing = await prisma.entidadBeneficiaria.findUnique({
      where: { entidadBeneficiariaId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Entidad no encontrada." }, { status: 404 });
    }

    const updated = await prisma.entidadBeneficiaria.update({
      where: { entidadBeneficiariaId },
      data: { activo: false },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ENTIDAD_BENEFICIARIA",
      entidadId: String(updated.entidadBeneficiariaId),
      detalle: {
        evento: "ENTIDAD_BENEFICIARIA_DESACTIVADA",
        clase: updated.clase,
        nombre: updated.nombre,
      },
    });

    return NextResponse.json({ ok: true, entidad: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo desactivar la entidad." }, { status: 500 });
  }
}
