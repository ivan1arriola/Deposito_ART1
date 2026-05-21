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

export async function GET(req: Request, context: { params: Promise<{ articuloId: string }> }) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const { articuloId: articuloIdParam } = await context.params;
  const articuloId = parseArticuloId(articuloIdParam);
  if (articuloId === null) return NextResponse.json({ error: "articuloId inválido." }, { status: 400 });

  try {
    const articulo = await prisma.articulo.findUnique({
      where: { articuloId },
    });

    if (!articulo) {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }

    const stockMovimientos = await prisma.articuloStockMovimiento.findMany({
      where: { articuloId },
      include: {
        articuloEntregaPersonal: {
          include: {
            personal: {
              include: {
                rango: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const movimientos = stockMovimientos.map((m) => {
      const entrega = m.articuloEntregaPersonal;
      let destinatario = null;
      if (entrega && entrega.personal) {
        const p = entrega.personal;
        destinatario = `${p.rango.abreviacion} ${p.apellido1} ${p.nombre1}`;
      }

      return {
        articuloStockMovimientoId: String(m.articuloStockMovimientoId),
        tipo: m.tipo,
        cantidad: m.cantidad,
        comentario: m.comentario,
        createdAt: m.createdAt.toISOString(),
        destinatario,
        fechaEntrega: entrega ? entrega.fecha.toISOString().split("T")[0] : null,
      };
    });

    return NextResponse.json({
      articulo,
      movimientos,
    });
  } catch (error) {
    return NextResponse.json({ error: "No se pudieron obtener los detalles del artículo." }, { status: 500 });
  }
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
    const deletionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.articulo.findUnique({
        where: { articuloId },
      });

      if (!existing) {
        throw new Error("P2025"); // Simulate not found
      }

      // 1. Get all related ArticuloStockMovimiento
      const stockMovimientos = await tx.articuloStockMovimiento.findMany({
        where: { articuloId },
      });

      // 2. Identify and fetch ArticuloEntregaPersonal that are affected
      const affectedEntregaIds = Array.from(
        new Set(
          stockMovimientos
            .map((m) => m.articuloEntregaPersonalId)
            .filter((id): id is bigint => id !== null)
        )
      );

      const affectedEntregas = affectedEntregaIds.length > 0
        ? await tx.articuloEntregaPersonal.findMany({
            where: { articuloEntregaPersonalId: { in: affectedEntregaIds } },
            include: { movimientosStock: true },
          })
        : [];

      // Determine which ones will become empty (i.e. only contain movements of this article)
      const emptyEntregas = affectedEntregas.filter((entrega) =>
        entrega.movimientosStock.every((m) => m.articuloId === articuloId)
      );
      const emptyEntregaIds = emptyEntregas.map((e) => e.articuloEntregaPersonalId);

      // Serialize everything
      const payload = JSON.parse(
        JSON.stringify(
          {
            articulo: existing,
            stockMovimientos,
            emptyEntregas,
          },
          (key, value) => (typeof value === "bigint" ? value.toString() : value)
        )
      );

      // Create PapeleraRegistro
      await tx.papeleraRegistro.create({
        data: {
          tipo: "ARTICULO",
          nombre: existing.nombre,
          originalId: String(existing.articuloId),
          payload,
        },
      });

      // Delete from active tables
      // Since onDelete on stockMovimiento -> Article is Restrict, we must delete stockMovimientos first
      await tx.articuloStockMovimiento.deleteMany({
        where: { articuloId },
      });

      // Delete empty deliveries
      if (emptyEntregaIds.length > 0) {
        await tx.articuloEntregaPersonal.deleteMany({
          where: { articuloEntregaPersonalId: { in: emptyEntregaIds } },
        });
      }

      // Finally delete the Articulo
      const removed = await tx.articulo.delete({
        where: { articuloId },
      });

      return { removed };
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ARTICULO",
      entidadId: String(deletionResult.removed.articuloId),
      detalle: { nombre: deletionResult.removed.nombre, tipo: deletionResult.removed.tipo },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "P2025") {
      return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
    }
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "Artículo no encontrado." }, { status: 404 });
      }
    }

    return NextResponse.json({ error: "No se pudo eliminar el artículo." }, { status: 500 });
  }
}
