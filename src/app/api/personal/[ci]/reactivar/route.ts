import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { buildSubalternoPersonalData } from "@/lib/personal-subalterno-data";
import { getTallaTipoIdMap } from "@/lib/reference-data-cache";
import type { TallaKey } from "@/lib/tallas";

export async function POST(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI inválida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI inválida." }, { status: 400 });

  try {
    const historyRecord = await prisma.personalHistorial.findUnique({
      where: { ci: ciDecoded },
    });

    if (!historyRecord) {
      return NextResponse.json({ error: "No se encontró registro en historial para reactivar." }, { status: 404 });
    }

    const existingActive = await prisma.personal.findUnique({
      where: { ci: ciDecoded },
    });

    if (existingActive) {
      return NextResponse.json({ error: "El personal ya se encuentra activo en el sistema." }, { status: 409 });
    }

    const tallas = (historyRecord.tallas as Array<{ tipo: string; valor: string }>) || [];
    const observaciones = (historyRecord.observaciones as Array<{ texto: string; fecha: string }>) || [];

    const tallaTipoMap = await getTallaTipoIdMap();

    await prisma.$transaction(async (tx) => {
      // 1. Recreate Personal record
      await tx.personal.create({
        data: {
          ci: ciDecoded,
          apellido1: historyRecord.apellido1,
          apellido2: historyRecord.apellido2,
          nombre1: historyRecord.nombre1,
          nombre2: historyRecord.nombre2,
          ...buildSubalternoPersonalData({
            telefonoContacto: historyRecord.telefonoContacto,
            rangoId: historyRecord.rangoId,
            esReingreso: historyRecord.esReingreso,
            fechaIngreso: historyRecord.fechaIngreso,
            fechaIngresoOriginal: historyRecord.fechaIngresoOriginal,
            bateriaId: historyRecord.bateriaId,
          }),
          createdAt: historyRecord.createdAt,
          baja: false, // Ensure they are fully active now!
        },
      });

      // 2. Recreate Category specifics
      if (historyRecord.tipo === "SUBALTERNO") {
        
      } else if (historyRecord.tipo === "OFICIAL") {
        
      } else {
        
      }

      // 3. Recreate Tallas
      if (tallas.length > 0) {
        const tallasToCreate = tallas
          .map((t) => {
            const tallaTipoId = tallaTipoMap.get(t.tipo as TallaKey);
            if (!tallaTipoId || !t.valor) return null;
            return {
              ci: ciDecoded,
              tallaTipoId,
              tallaValor: t.valor,
            };
          })
          .filter((equipo): equipo is { ci: string; tallaTipoId: number; tallaValor: string } => equipo !== null);

        if (tallasToCreate.length > 0) {
          await tx.personalTalla.createMany({
            data: tallasToCreate,
          });
        }
      }

      // 4. Recreate Observaciones
      if (observaciones.length > 0) {
        await tx.observacion.createMany({
          data: observaciones.map((o) => ({
            ci: ciDecoded,
            texto: o.texto,
            fecha: o.fecha ? new Date(o.fecha) : new Date(),
          })),
        });
      }

      // 5. Remove from History
      await tx.personalHistorial.delete({
        where: { ci: ciDecoded },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        evento: "PERSONAL_REACTIVADO_HISTORIAL",
        ci: ciDecoded,
        nombre: `${historyRecord.apellido1}, ${historyRecord.nombre1}`,
        motivo: "Reactivado desde el historial administrativo de bajas",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("Error al reactivar personal:", error);
    return NextResponse.json({ error: "No se pudo reactivar el personal desde el historial." }, { status: 500 });
  }
}
