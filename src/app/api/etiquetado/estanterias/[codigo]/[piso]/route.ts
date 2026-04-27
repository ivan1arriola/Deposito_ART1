import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function hasEtiquetadoDelegates() {
  const candidate = prisma as typeof prisma & {
    estanteria?: unknown;
    caja?: unknown;
  };
  return typeof candidate.estanteria !== "undefined" && typeof candidate.caja !== "undefined";
}

function normalizeNombreEstanteria(value: string) {
  const raw = decodeURIComponent(value).trim().toUpperCase();
  if (!/^[A-Z]$/.test(raw)) return null;
  return raw;
}

function parsePiso(value: string) {
  const parsed = Number(decodeURIComponent(value).trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 2) return null;
  return parsed;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ codigo: string; piso: string }> },
) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  if (!hasEtiquetadoDelegates()) {
    return NextResponse.json(
      { error: "El cliente Prisma de etiquetado no esta listo. Reinicia el servidor de desarrollo." },
      { status: 503 },
    );
  }

  const { codigo: codigoParam, piso: pisoParam } = await context.params;
  const codigo = normalizeNombreEstanteria(codigoParam);
  const piso = parsePiso(pisoParam);

  if (!codigo || piso === null) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const cajasUsandoCodigo = await prisma.caja.count({
    where: { estanteria: codigo, piso },
  });
  if (cajasUsandoCodigo > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar la estanteria porque hay cajas registradas con ese nombre de estanteria." },
      { status: 409 },
    );
  }

  try {
    const removed = await prisma.estanteria.delete({
      where: {
        codigo_piso: {
          codigo,
          piso,
        },
      },
      select: {
        codigo: true,
        piso: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ESTANTERIA",
      entidadId: `${removed.codigo}-${removed.piso}`,
      detalle: {
        nombreEstanteria: removed.codigo,
        codigo: removed.codigo,
        piso: removed.piso,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Estanteria no encontrada." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar la estanteria." }, { status: 500 });
  }
}
