import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

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

      const payload = registro.payload as any;

      if (registro.tipo === "ITEM") {
        // 1. Check duplicate name
        const duplicate = await tx.item.findUnique({
          where: { nombre: payload.item.nombre },
        });
        if (duplicate) {
          throw new Error("DUPLICATE_NAME");
        }

        // 2. Restore Item
        await tx.item.create({
          data: {
            itemId: BigInt(payload.item.itemId),
            nombre: payload.item.nombre,
            activo: payload.item.activo,
            ordenPdf: payload.item.ordenPdf,
            existenciaSie: payload.item.existenciaSie,
          },
        });

        // 3. Restore CajaItem
        for (const ci of payload.cajaItems || []) {
          await tx.cajaItem.create({
            data: {
              codigoDepositoGeneral: Number(ci.codigoDepositoGeneral),
              itemId: BigInt(ci.itemId),
              cantidad: ci.cantidad,
            },
          });
        }

        // 4. Restore ItemCodigoSIE
        for (const sie of payload.itemCodigosSIE || []) {
          await tx.itemCodigoSIE.create({
            data: {
              itemCodigoSIEId: BigInt(sie.itemCodigoSIEId),
              codigo: sie.codigo,
              talla: sie.talla,
              itemId: BigInt(sie.itemId),
            },
          });
        }

        // 5. Restore CajaItemCodigoSIE
        for (const ccs of payload.cajaItemCodigosSIE || []) {
          await tx.cajaItemCodigoSIE.create({
            data: {
              codigoDepositoGeneral: Number(ccs.codigoDepositoGeneral),
              itemCodigoSIEId: BigInt(ccs.itemCodigoSIEId),
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

        // 9. Restore PrestamoActivo
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

        // 10. Restore PrestamoHistorial
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

        // 11. Restore empty StockOperacion records
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

        // 12. Restore MovimientoItem
        for (const mi of payload.movimientoItems || []) {
          await tx.movimientoItem.create({
            data: {
              movimientoId: BigInt(mi.movimientoId),
              itemId: BigInt(mi.itemId),
              cantidad: mi.cantidad,
              estadoEntrega: mi.estadoEntrega,
              comentarioEntrega: mi.comentarioEntrega,
              estadoDevolucion: mi.estadoDevolucion,
              comentarioDevolucion: mi.comentarioDevolucion,
            },
          });
        }

        // 13. Restore StockOperacionItem
        for (const soi of payload.stockOperacionItems || []) {
          await tx.stockOperacionItem.create({
            data: {
              stockOperacionId: BigInt(soi.stockOperacionId),
              itemId: BigInt(soi.itemId),
              cantidad: soi.cantidad,
            },
          });
        }

      } else if (registro.tipo === "ARTICULO") {
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
              articuloEntregaPersonalId: sm.articuloEntregaPersonalId ? BigInt(sm.articuloEntregaPersonalId) : null,
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
        return NextResponse.json({ error: "Registro no encontrado en la papelera." }, { status: 404 });
      }
      if (error.message === "DUPLICATE_NAME") {
        return NextResponse.json(
          { error: "Ya existe un elemento activo con ese nombre. Cambia el nombre del activo para poder restaurar." },
          { status: 409 },
        );
      }
    }
    return NextResponse.json({ error: "No se pudo restaurar el registro." }, { status: 500 });
  }
}
