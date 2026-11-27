import { NextResponse } from "next/server";
import type {
  EstadoEquipoPrestamo,
  EstadoPrestamoMovimiento,
  TipoArticulo,
  TipoArticuloStockMovimiento,
  TipoMovimiento,
  TipoStockOperacion,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

type TrashEquipoPayload = {
  equipo: {
    equipoId: string;
    nombre: string;
    activo: boolean;
    ordenPdf: number;
    existenciaSie: number;
  };
  cajaEquipos?: Array<{
    codigoDepositoGeneral: number | string;
    equipoId: string;
    cantidad: number;
  }>;
  equipoCodigosSIE?: Array<{
    equipoCodigoSIEId: string;
    codigo: string;
    talla: string;
    equipoId: string;
  }>;
  cajaItemCodigosSIE?: Array<{
    codigoDepositoGeneral: number | string;
    equipoCodigoSIEId: string;
  }>;
  deletedMovimientos?: Array<{
    movimientoId: string;
    tipo: TipoMovimiento;
    fecha: string;
    usuarioEntregaId: string;
    afectaStock: boolean;
    observaciones: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  deletedMovimientoDestinatariosPersonal?: Array<{
    movimientoId: string;
    ci: string;
  }>;
  deletedMovimientoDestinatariosExterno?: Array<{
    movimientoId: string;
    personaExternaCi: string;
  }>;
  deletedMovimientoDestinatariosRecinto?: Array<{
    movimientoId: string;
    clase: string;
    nombre: string;
    responsableGrado: string | null;
    responsableNombre: string | null;
    responsableApellido: string | null;
    responsableCi: string | null;
  }>;
  deletedPrestamosActivos?: Array<{
    movimientoId: string;
    reciboNumero: string;
    estado: EstadoPrestamoMovimiento;
    fechaEstimadaDevolucionTexto: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
  deletedPrestamosHistoriales?: Array<{
    movimientoId: string;
    reciboNumero: string;
    estado: EstadoPrestamoMovimiento;
    fechaDevolucion: string;
    fechaEstimadaDevolucionTexto: string | null;
    usuarioRecibeDevolucionId: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }>;
  deletedStockOperaciones?: Array<{
    stockOperacionId: string;
    tipo: TipoStockOperacion;
    fecha: string;
    comentarios: string | null;
    createdAt: string;
  }>;
  movimientoEquipos?: Array<{
    movimientoId: string;
    equipoId: string;
    cantidad: number;
    estadoEntrega: EstadoEquipoPrestamo;
    comentarioEntrega: string | null;
    estadoDevolucion: EstadoEquipoPrestamo | null;
    comentarioDevolucion: string | null;
  }>;
  stockOperacionEquipos?: Array<{
    stockOperacionId: string;
    equipoId: string;
    cantidad: number;
  }>;
};

type TrashArticuloPayload = {
  articulo: {
    articuloId: number | string;
    nombre: string;
    tipo: TipoArticulo;
  };
  emptyEntregas?: Array<{
    articuloEntregaPersonalId: string;
    personalCi: string;
    usuarioEntregaId: string;
    ordenanteCi: string;
    fecha: string;
    comentario: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  stockMovimientos?: Array<{
    articuloStockMovimientoId: string;
    articuloId: number | string;
    tipo: TipoArticuloStockMovimiento;
    cantidad: number;
    comentario: string | null;
    articuloEntregaPersonalId: string | null;
    createdAt: string;
  }>;
};

export async function POST(req: Request, context: { params: Promise<{ papeleraId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { papeleraId } = await context.params;

  try {
    const restoreResult = await prisma.$transaction(async (tx) => {
      const registro = await tx.papeleraRegistro.findUnique({
        where: { papeleraId },
      });

      if (!registro) {
        throw new Error("P2025");
      }

      if (registro.tipo === "EQUIPO") {
        const payload = registro.payload as unknown as TrashEquipoPayload;

        // 1. Check duplicate name
        const duplicate = await tx.equipo.findUnique({
          where: { nombre: payload.equipo.nombre },
        });
        if (duplicate) {
          throw new Error("DUPLICATE_NAME");
        }

        // 2. Restore Equipo
        await tx.equipo.create({
          data: {
            equipoId: BigInt(payload.equipo.equipoId),
            nombre: payload.equipo.nombre,
            activo: payload.equipo.activo,
            ordenPdf: payload.equipo.ordenPdf,
            existenciaSie: payload.equipo.existenciaSie,
          },
        });

        // 3. Restore CajaEquipo
        for (const ci of payload.cajaEquipos || []) {
          await tx.cajaEquipo.create({
            data: {
              codigoDepositoGeneral: Number(ci.codigoDepositoGeneral),
              equipoId: BigInt(ci.equipoId),
              cantidad: ci.cantidad,
            },
          });
        }

        // 4. Restore EquipoCodigoSIE
        for (const sie of payload.equipoCodigosSIE || []) {
          await tx.equipoCodigoSIE.create({
            data: {
              equipoCodigoSIEId: BigInt(sie.equipoCodigoSIEId),
              codigo: sie.codigo,
              talla: sie.talla,
              equipoId: BigInt(sie.equipoId),
            },
          });
        }

        // 5. Restore CajaItemCodigoSIE
        for (const ccs of payload.cajaItemCodigosSIE || []) {
          await tx.cajaEquipoCodigoSIE.create({
            data: {
              codigoDepositoGeneral: Number(ccs.codigoDepositoGeneral),
              equipoCodigoSIEId: BigInt(ccs.equipoCodigoSIEId),
            },
          });
        }

        // 6. Restore empty Movimiento records
        for (const mov of payload.deletedMovimientos || []) {
          const existingMov = await tx.movimiento.findUnique({
            where: { movimientoId: BigInt(mov.movimientoId) },
          });
          if (!existingMov) {
            await tx.movimiento.create({
              data: {
                movimientoId: BigInt(mov.movimientoId),
                tipo: mov.tipo,
                fecha: new Date(mov.fecha),
                usuarioEntregaId: mov.usuarioEntregaId,
                afectaStock: mov.afectaStock,
                observaciones: mov.observaciones,
                createdAt: new Date(mov.createdAt),
                updatedAt: new Date(mov.updatedAt),
              },
            });
          }
        }

        // 7. Restore MovimientoDestinatarioPersonal
        for (const dp of payload.deletedMovimientoDestinatariosPersonal || []) {
          const existingDp = await tx.movimientoDestinatarioPersonal.findUnique({
            where: { movimientoId: BigInt(dp.movimientoId) },
          });
          if (!existingDp) {
            await tx.movimientoDestinatarioPersonal.create({
              data: {
                movimientoId: BigInt(dp.movimientoId),
                ci: dp.ci,
              },
            });
          }
        }

        // 8. Restore MovimientoDestinatarioExterno
        for (const de of payload.deletedMovimientoDestinatariosExterno || []) {
          const existingDe = await tx.movimientoDestinatarioExterno.findUnique({
            where: { movimientoId: BigInt(de.movimientoId) },
          });
          if (!existingDe) {
            await tx.movimientoDestinatarioExterno.create({
              data: {
                movimientoId: BigInt(de.movimientoId),
                personaExternaCi: de.personaExternaCi,
              },
            });
          }
        }

        // 9. Restore MovimientoDestinatarioRecinto
        for (const dr of payload.deletedMovimientoDestinatariosRecinto || []) {
          const existingDr = await tx.movimientoDestinatarioRecinto.findUnique({
            where: { movimientoId: BigInt(dr.movimientoId) },
          });
          if (!existingDr) {
            await tx.movimientoDestinatarioRecinto.create({
              data: {
                movimientoId: BigInt(dr.movimientoId),
                clase: dr.clase,
                nombre: dr.nombre,
                responsableGrado: dr.responsableGrado,
                responsableNombre: dr.responsableNombre,
                responsableApellido: dr.responsableApellido,
                responsableCi: dr.responsableCi,
              },
            });
          }
        }

        // 10. Restore PrestamoActivo
        for (const pa of payload.deletedPrestamosActivos || []) {
          const existingPa = await tx.prestamoActivo.findUnique({
            where: { movimientoId: BigInt(pa.movimientoId) },
          });
          if (!existingPa) {
            await tx.prestamoActivo.create({
              data: {
                movimientoId: BigInt(pa.movimientoId),
                reciboNumero: pa.reciboNumero,
                estado: pa.estado,
                fechaEstimadaDevolucionTexto: pa.fechaEstimadaDevolucionTexto,
                createdAt: pa.createdAt ? new Date(pa.createdAt) : undefined,
                updatedAt: pa.updatedAt ? new Date(pa.updatedAt) : undefined,
              },
            });
          }
        }

        // 11. Restore PrestamoHistorial
        for (const ph of payload.deletedPrestamosHistoriales || []) {
          const existingPh = await tx.prestamoHistorial.findUnique({
            where: { movimientoId: BigInt(ph.movimientoId) },
          });
          if (!existingPh) {
            await tx.prestamoHistorial.create({
              data: {
                movimientoId: BigInt(ph.movimientoId),
                reciboNumero: ph.reciboNumero,
                estado: ph.estado,
                fechaDevolucion: new Date(ph.fechaDevolucion),
                fechaEstimadaDevolucionTexto: ph.fechaEstimadaDevolucionTexto,
                usuarioRecibeDevolucionId: ph.usuarioRecibeDevolucionId,
                createdAt: ph.createdAt ? new Date(ph.createdAt) : undefined,
                updatedAt: ph.updatedAt ? new Date(ph.updatedAt) : undefined,
              },
            });
          }
        }

        // 12. Restore empty StockOperacion records
        for (const so of payload.deletedStockOperaciones || []) {
          const existingSo = await tx.stockOperacion.findUnique({
            where: { stockOperacionId: BigInt(so.stockOperacionId) },
          });
          if (!existingSo) {
            await tx.stockOperacion.create({
              data: {
                stockOperacionId: BigInt(so.stockOperacionId),
                tipo: so.tipo,
                fecha: new Date(so.fecha),
                comentarios: so.comentarios,
                createdAt: new Date(so.createdAt),
              },
            });
          }
        }

        // 13. Restore MovimientoEquipo
        for (const mi of payload.movimientoEquipos || []) {
          await tx.movimientoEquipo.create({
            data: {
              movimientoId: BigInt(mi.movimientoId),
              equipoId: BigInt(mi.equipoId),
              cantidad: mi.cantidad,
              estadoEntrega: mi.estadoEntrega,
              comentarioEntrega: mi.comentarioEntrega,
              estadoDevolucion: mi.estadoDevolucion,
              comentarioDevolucion: mi.comentarioDevolucion,
            },
          });
        }

        // 14. Restore StockOperacionEquipo
        for (const soi of payload.stockOperacionEquipos || []) {
          await tx.stockOperacionEquipo.create({
            data: {
              stockOperacionId: BigInt(soi.stockOperacionId),
              equipoId: BigInt(soi.equipoId),
              cantidad: soi.cantidad,
            },
          });
        }
      } else if (registro.tipo === "ARTICULO") {
        const payload = registro.payload as unknown as TrashArticuloPayload;

        // 1. Check duplicate name
        const duplicate = await tx.articulo.findFirst({
          where: { nombre: payload.articulo.nombre },
        });
        if (duplicate) {
          throw new Error("DUPLICATE_NAME");
        }

        // 2. Restore Articulo
        await tx.articulo.create({
          data: {
            articuloId: Number(payload.articulo.articuloId),
            nombre: payload.articulo.nombre,
            tipo: payload.articulo.tipo,
          },
        });

        // 3. Restore ArticuloEntregaPersonal records
        for (const ent of payload.emptyEntregas || []) {
          const existingEnt = await tx.articuloEntregaPersonal.findUnique({
            where: { articuloEntregaPersonalId: BigInt(ent.articuloEntregaPersonalId) },
          });
          if (!existingEnt) {
            await tx.articuloEntregaPersonal.create({
              data: {
                articuloEntregaPersonalId: BigInt(ent.articuloEntregaPersonalId),
                personalCi: ent.personalCi,
                usuarioEntregaId: ent.usuarioEntregaId,
                ordenanteCi: ent.ordenanteCi,
                fecha: new Date(ent.fecha),
                comentario: ent.comentario,
                createdAt: new Date(ent.createdAt),
                updatedAt: new Date(ent.updatedAt),
              },
            });
          }
        }

        // 4. Restore ArticuloStockMovimiento
        for (const sm of payload.stockMovimientos || []) {
          await tx.articuloStockMovimiento.create({
            data: {
              articuloStockMovimientoId: BigInt(sm.articuloStockMovimientoId),
              articuloId: Number(sm.articuloId),
              tipo: sm.tipo,
              cantidad: sm.cantidad,
              comentario: sm.comentario,
              articuloEntregaPersonalId: sm.articuloEntregaPersonalId
                ? BigInt(sm.articuloEntregaPersonalId)
                : null,
              createdAt: new Date(sm.createdAt),
            },
          });
        }
      }

      // Delete from recycle bin
      await tx.papeleraRegistro.delete({
        where: { papeleraId },
      });

      return registro;
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "RESTORE_TRASH",
      entidad: restoreResult.tipo,
      entidadId: restoreResult.originalId,
      detalle: {
        nombre: restoreResult.nombre,
        mensaje: "Registro restaurado con éxito de la papelera con todas sus relaciones.",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "P2025") {
        return NextResponse.json(
          { error: "Registro no encontrado en la papelera." },
          { status: 404 }
        );
      }
      if (error.message === "DUPLICATE_NAME") {
        return NextResponse.json(
          {
            error:
              "Ya existe un elemento activo con ese nombre. Cambia el nombre del activo para poder restaurar.",
          },
          { status: 409 }
        );
      }
    }
    return NextResponse.json({ error: "No se pudo restaurar el registro." }, { status: 500 });
  }
}
