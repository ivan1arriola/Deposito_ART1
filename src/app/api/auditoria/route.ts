import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "view_audit");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;

  const records = await prisma.auditoria.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      usuario: {
        select: { usuarioId: true, username: true, rol: true },
      },
    },
  });

  return NextResponse.json(
    records.map((record) => ({
      auditoriaId: record.auditoriaId.toString(),
      usuarioId: record.usuarioId,
      usuario: record.usuario
        ? {
            usuarioId: record.usuario.usuarioId,
            username: record.usuario.username,
            rol: record.usuario.rol,
          }
        : null,
      accion: record.accion,
      entidad: record.entidad,
      entidadId: record.entidadId,
      detalle: record.detalle,
      createdAt: record.createdAt,
    })),
  );
}
