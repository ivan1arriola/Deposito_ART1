import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request, context: { params: Promise<{ papeleraId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { papeleraId } = await context.params;

  try {
    const registro = await prisma.papeleraRegistro.findUnique({
      where: { papeleraId },
    });

    if (!registro) {
      return NextResponse.json(
        { error: "Registro no encontrado en la papelera." },
        { status: 404 }
      );
    }

    return NextResponse.json(registro);
  } catch (_error) {
    return NextResponse.json(
      { error: "No se pudo obtener el registro de la papelera." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ papeleraId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { papeleraId } = await context.params;

  try {
    const existing = await prisma.papeleraRegistro.findUnique({
      where: { papeleraId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Registro no encontrado en la papelera." },
        { status: 404 }
      );
    }

    await prisma.papeleraRegistro.delete({
      where: { papeleraId },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "PURGE_TRASH",
      entidad: existing.tipo,
      entidadId: existing.originalId,
      detalle: {
        nombre: existing.nombre,
        mensaje: "Registro eliminado permanentemente de la papelera.",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (_error) {
    return NextResponse.json(
      { error: "No se pudo eliminar permanentemente el registro." },
      { status: 500 }
    );
  }
}
