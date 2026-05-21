import { NextResponse } from "next/server";
import { TipoArticulo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function parseArticuloId(raw: string) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function parseTipoArticulo(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OFICINA") return TipoArticulo.OFICINA;
  if (normalized === "LIMPIEZA") return TipoArticulo.LIMPIEZA;
  return undefined;
}

export async function PUT(req: Request, context: { params: Promise<{ articuloId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo admin puede editar artículos." }, { status: 403 });
  }

  const { articuloId: articuloIdParam } = await context.params;
  const articuloId = parseArticuloId(articuloIdParam);
  if (articuloId === null) return NextResponse.json({ error: "articuloId inválido." }, { status: 400 });

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const nombre = typeof candidate?.nombre === "string" ? candidate.nombre.trim() : "";
  const tipo = parseTipoArticulo(candidate?.tipo);

  if (!nombre || !tipo) {
    return NextResponse.json(
      { error: "Payload inválido. 'nombre' es obligatorio y 'tipo' debe ser OFICINA o LIMPIEZA." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.articulo.update({
      where: { articuloId },
      data: { nombre, tipo },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ARTICULO",
      entidadId: String(updated.articuloId),
      detalle: { nombre: updated.nombre, tipo: updated.tipo },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El artículo ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el artículo." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ articuloId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo admin puede eliminar artículos." }, { status: 403 });
  }

  const { articuloId: articuloIdParam } = await context.params;
  const articuloId = parseArticuloId(articuloIdParam);
  if (articuloId === null) return NextResponse.json({ error: "articuloId inválido." }, { status: 400 });

  try {
    const deleted = await prisma.articulo.delete({
      where: { articuloId },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ARTICULO",
      entidadId: String(deleted.articuloId),
      detalle: { nombre: deleted.nombre, tipo: deleted.tipo },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
      }
      if (code === "P2003") {
        return NextResponse.json(
          { error: "No se puede eliminar el artículo porque tiene movimientos de stock registrados." },
          { status: 409 },
        );
      }
    }

    return NextResponse.json({ error: "No se pudo eliminar el artículo." }, { status: 500 });
  }
}
