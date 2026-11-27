import { NextResponse } from "next/server";
import { TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";

export async function POST(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI inválida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded))
    return NextResponse.json({ error: "CI inválida." }, { status: 400 });

  try {
    const personalRecord = await prisma.personal.findUnique({
      where: { ci: ciDecoded },
      include: {
        rango: true,
        bateria: true,
        tallas: { include: { tallaTipo: true } },
        observaciones: true,
      },
    });

    if (!personalRecord) {
      return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create history record
      const tipo =
        personalRecord.rango.tipo === TipoPersonal.SUBALTERNO
          ? "SUBALTERNO"
          : personalRecord.rango.tipo === TipoPersonal.OFICIAL
            ? "OFICIAL"
            : "SUBOFICIAL";

      await tx.personalHistorial.create({
        data: {
          ci: ciDecoded,
          apellido1: personalRecord.apellido1,
          apellido2: personalRecord.apellido2,
          nombre1: personalRecord.nombre1,
          nombre2: personalRecord.nombre2,
          telefonoContacto: personalRecord.telefonoContacto,
          rangoId: personalRecord.rangoId,
          createdAt: personalRecord.createdAt,
          tipo,
          esReingreso: personalRecord.esReingreso ?? null,
          fechaIngreso: personalRecord.fechaIngreso ?? null,
          fechaIngresoOriginal: personalRecord.fechaIngresoOriginal ?? null,
          bateriaId: personalRecord.bateriaId ?? null,
          tallas: personalRecord.tallas.map((t) => ({
            tipo: t.tallaTipo.nombre,
            valor: t.tallaValor,
          })),
          observaciones: personalRecord.observaciones.map((o) => ({
            texto: o.texto,
            fecha: o.fecha,
          })),
        },
      });

      // 2. Perform same physical cleanup as before
      await tx.personalTalla.deleteMany({ where: { ci: ciDecoded } });
      await tx.observacion.deleteMany({ where: { ci: ciDecoded } });
      await tx.movimientoEquipo.deleteMany({
        where: { movimiento: { destinatarioPersonal: { is: { ci: ciDecoded } } } },
      });
      await tx.movimiento.deleteMany({
        where: { destinatarioPersonal: { is: { ci: ciDecoded } } },
      });

      await tx.personal.delete({ where: { ci: ciDecoded } });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        evento: "PERSONAL_CONFIRMAR_BAJA_HISTORIAL",
        ci: ciDecoded,
        nombre: `${personalRecord.apellido1}, ${personalRecord.nombre1}`,
        motivo: "Se confirmó devolución total y se transfirió a historial",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.log("Error al confirmar devolución y baja:", error);
    return NextResponse.json(
      { error: "No se pudo confirmar la baja del personal." },
      { status: 500 }
    );
  }
}
