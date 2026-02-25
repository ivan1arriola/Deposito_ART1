import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  usuarioId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: unknown;
};

export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditoria.create({
      data: {
        usuarioId: input.usuarioId ?? null,
        accion: input.accion,
        entidad: input.entidad,
        entidadId: input.entidadId ?? null,
        detalle:
          input.detalle === undefined
            ? undefined
            : input.detalle === null
              ? Prisma.JsonNull
              : (input.detalle as Prisma.InputJsonValue),
      },
    });
  } catch {
    // No romper el flujo principal por fallo de auditoria.
  }
}
