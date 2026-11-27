import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { buildSubalternoPersonalData } from "@/lib/personal-subalterno-data";
import { invalidateRangoTipoCountCache, getTallaTipoIdMap } from "@/lib/reference-data-cache";
import {
  type Prisma,
  TipoArticulo,
  TipoMovimiento,
  TipoPersonal,
} from "@/generated/prisma/client";
import type { TallaKey } from "@/lib/tallas";

type UndoTalla = {
  tipo: string;
  valor: string;
};

type UndoPrevio = {
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
  nombre: string;
  tipo: TipoArticulo;
  existenciaSie: number;
  activo: boolean;
  ordenPdf: number;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
  tallas?: UndoTalla[];
  fecha: string | Date;
  texto: string;
};

type UndoDetalle = {
  previo?: UndoPrevio;
  evento?: string;
  tipo?: TipoPersonal;
  abreviacion: string;
  nombreCompleto: string;
  orden: number;
  nombre: string;
  ci: string;
  fecha: string | Date;
  texto: string;
};

type UndoTrashPayload = {
  equipo: {
    equipoId: string | number;
    nombre: string;
    activo: boolean;
    ordenPdf: number;
    existenciaSie: number;
  };
  cajaEquipos?: Array<{
    codigoDepositoGeneral: string | number;
    equipoId: string | number;
    cantidad: number;
  }>;
  equipoCodigosSIE?: Array<{
    equipoCodigoSIEId: string | number;
    codigo: string;
    talla?: string;
    equipoId: string | number;
  }>;
  cajaItemCodigosSIE?: Array<{
    codigoDepositoGeneral: string | number;
    equipoCodigoSIEId: string | number;
  }>;
  deletedMovimientos?: Array<{
    movimientoId: string | number;
    tipo: TipoMovimiento;
    fecha: string;
    usuarioEntregaId: string;
    afectaStock: boolean;
    observaciones: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  deletedMovimientoDestinatariosPersonal?: Array<{
    movimientoId: string | number;
    ci: string;
  }>;
  deletedMovimientoDestinatariosExterno?: Array<{
    movimientoId: string | number;
    personaExternaCi: string;
  }>;
  deletedPrestamosActivos?: Array<{
    movimientoId: string | number;
    reciboNumero: string;
    estado: Prisma.PrestamoActivoUncheckedCreateInput["estado"];
    fechaEstimadaDevolucionTexto: string | null;
    createdAt?: string;
    updatedAt?: string;
  }>;
  deletedPrestamosHistoriales?: Array<{
    movimientoId: string | number;
    reciboNumero: string;
    estado: Prisma.PrestamoHistorialUncheckedCreateInput["estado"];
    fechaDevolucion: string;
    fechaEstimadaDevolucionTexto: string | null;
    usuarioRecibeDevolucionId: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  deletedStockOperaciones?: Array<{
    stockOperacionId: string | number;
    tipo: Prisma.StockOperacionUncheckedCreateInput["tipo"];
    fecha: string;
    comentarios: string | null;
    createdAt: string;
  }>;
  movimientoEquipos?: Array<{
    movimientoId: string | number;
    equipoId: string | number;
    cantidad: number;
    estadoEntrega: Prisma.MovimientoEquipoUncheckedCreateInput["estadoEntrega"];
    comentarioEntrega: string | null;
    estadoDevolucion: Prisma.MovimientoEquipoUncheckedCreateInput["estadoDevolucion"];
    comentarioDevolucion: string | null;
  }>;
  stockOperacionEquipos?: Array<{
    stockOperacionId: string | number;
    equipoId: string | number;
    cantidad: number;
  }>;
  articulo: {
    articuloId: string | number;
    nombre: string;
    tipo: TipoArticulo;
  };
  emptyEntregas?: Array<{
    articuloEntregaPersonalId: string | number;
    personalCi: string;
    usuarioEntregaId: string;
    ordenanteCi: string;
    fecha: string;
    comentario: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  stockMovimientos?: Array<{
    articuloStockMovimientoId: string | number;
    articuloId: string | number;
    tipo: Prisma.ArticuloStockMovimientoUncheckedCreateInput["tipo"];
    cantidad: number;
    comentario: string | null;
    articuloEntregaPersonalId?: string | number;
    createdAt: string;
  }>;
};

function parseAuditoriaId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

export async function POST(req: Request, context: { params: Promise<{ auditoriaId: string }> }) {
  const auth = await authorizeRequest(req, "manage_users");
  if (!auth.ok) return auth.response;

  const { auditoriaId: auditoriaIdParam } = await context.params;
  const auditoriaId = parseAuditoriaId(auditoriaIdParam);
  if (auditoriaId === null) {
    return NextResponse.json({ error: "auditoriaId inválido." }, { status: 400 });
  }

  try {
    const undoResult = await prisma.$transaction(async (tx) => {
      const auditoria = await tx.auditoria.findUnique({
        where: { auditoriaId },
      });

      if (!auditoria) {
        throw new Error("AUDIT_NOT_FOUND");
      }

      const createdDate = new Date(auditoria.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 5) {
        throw new Error("UNDO_EXPIRED");
      }

      const detalle = (auditoria.detalle || {}) as UndoDetalle;
      const entidad = auditoria.entidad;
      const accion = auditoria.accion;
      const entidadId = auditoria.entidadId;

      if (!entidadId) {
        throw new Error("NO_ENTITY_ID");
      }

      // --- 1. REVERSE CREATE (DELETE the entity) ---
      if (accion === "CREATE") {
        if (entidad === "GRADO_PERSONAL") {
          await tx.rango.delete({
            where: { rangoId: Number(entidadId) },
          });
        } else if (entidad === "BATERIA") {
          await tx.bateria.delete({
            where: { bateriaId: Number(entidadId) },
          });
        } else if (entidad === "ARTICULO") {
          await tx.articulo.delete({
            where: { articuloId: Number(entidadId) },
          });
        } else if (entidad === "EQUIPO") {
          await tx.equipo.delete({
            where: { equipoId: BigInt(entidadId) },
          });
        } else if (entidad === "PERSONAL") {
          await tx.personalTalla.deleteMany({ where: { ci: entidadId } });
          
          
          
          await tx.observacion.deleteMany({ where: { ci: entidadId } });
          await tx.personal.delete({ where: { ci: entidadId } });
        } else if (entidad === "OBSERVACION") {
          await tx.observacion.delete({
            where: { observacionId: BigInt(entidadId) },
          });
        } else {
          throw new Error("UNSUPPORTED_UNDO_ENTITY");
        }
      }

      // --- 2. REVERSE UPDATE (RESTORE previo state) ---
      else if (accion === "UPDATE") {
        const previo = detalle.previo;
        if (!previo) {
          throw new Error("NO_PREVIOUS_STATE");
        }

        if (entidad === "GRADO_PERSONAL") {
          await tx.rango.update({
            where: { rangoId: Number(entidadId) },
            data: {
              abreviacion: previo.abreviacion,
              nombreCompleto: previo.nombreCompleto,
              orden: previo.orden,
            },
          });
        } else if (entidad === "BATERIA") {
          await tx.bateria.update({
            where: { bateriaId: Number(entidadId) },
            data: {
              nombre: previo.nombre,
              orden: previo.orden,
            },
          });
        } else if (entidad === "ARTICULO") {
          await tx.articulo.update({
            where: { articuloId: Number(entidadId) },
            data: {
              nombre: previo.nombre,
              tipo: previo.tipo as TipoArticulo,
            },
          });
        } else if (entidad === "EQUIPO") {
          if (detalle.evento === "ITEM_EXISTENCIA_SIE_UPDATE") {
            await tx.equipo.update({
              where: { equipoId: BigInt(entidadId) },
              data: { existenciaSie: previo.existenciaSie },
            });
          } else {
            await tx.equipo.update({
              where: { equipoId: BigInt(entidadId) },
              data: {
                nombre: previo.nombre,
                activo: previo.activo,
                ordenPdf: previo.ordenPdf,
                existenciaSie: previo.existenciaSie,
              },
            });
          }
        } else if (entidad === "PERSONAL") {
          await tx.personal.update({
            where: { ci: entidadId },
            data: {
              apellido1: previo.apellido1,
              apellido2: previo.apellido2,
              nombre1: previo.nombre1,
              nombre2: previo.nombre2,
              telefonoContacto: previo.telefonoContacto,
              rangoId: previo.rangoId,
            },
          });

          // Restore tallas
          await tx.personalTalla.deleteMany({ where: { ci: entidadId } });
          const tallaTipoMap = await getTallaTipoIdMap();
          const tallasToCreate = (previo.tallas || [])
            .map((t: UndoTalla) => {
              const tallaTipoId = tallaTipoMap.get(t.tipo as TallaKey);
              if (!tallaTipoId || !t.valor) return null;
              return {
                ci: entidadId,
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
        } else if (entidad === "OBSERVACION") {
          await tx.observacion.update({
            where: { observacionId: BigInt(entidadId) },
            data: {
              fecha: new Date(previo.fecha),
              texto: previo.texto,
            },
          });
        } else {
          throw new Error("UNSUPPORTED_UNDO_ENTITY");
        }
      }

      // --- 3. REVERSE DELETE (RESTORE/RECREATE entity) ---
      else if (accion === "DELETE") {
        if (entidad === "GRADO_PERSONAL") {
          await tx.rango.create({
            data: {
              rangoId: Number(entidadId),
              tipo: (detalle.tipo || TipoPersonal.SUBALTERNO) as TipoPersonal,
              abreviacion: detalle.abreviacion,
              nombreCompleto: detalle.nombreCompleto,
              orden: detalle.orden,
            },
          });
        } else if (entidad === "BATERIA") {
          await tx.bateria.create({
            data: {
              bateriaId: Number(entidadId),
              nombre: detalle.nombre,
              orden: detalle.orden,
            },
          });
        } else if (entidad === "ARTICULO" || entidad === "EQUIPO") {
          // Find deleted snapshot in recycle bin
          const recycleRecord = await tx.papeleraRegistro.findFirst({
            where: {
              originalId: String(entidadId),
              tipo: entidad === "EQUIPO" ? "EQUIPO" : "ARTICULO",
            },
            orderBy: { createdAt: "desc" },
          });

          if (!recycleRecord) {
            throw new Error("NOT_FOUND_IN_TRASH");
          }

          const payload = recycleRecord.payload as unknown as UndoTrashPayload;

          if (entidad === "EQUIPO") {
            const duplicate = await tx.equipo.findUnique({
              where: { nombre: payload.equipo.nombre },
            });
            if (duplicate) throw new Error("DUPLICATE_NAME");

            await tx.equipo.create({
              data: {
                equipoId: BigInt(payload.equipo.equipoId),
                nombre: payload.equipo.nombre,
                activo: payload.equipo.activo,
                ordenPdf: payload.equipo.ordenPdf,
                existenciaSie: payload.equipo.existenciaSie,
              },
            });

            for (const ci of payload.cajaEquipos || []) {
              await tx.cajaEquipo.create({
                data: {
                  codigoDepositoGeneral: Number(ci.codigoDepositoGeneral),
                  equipoId: BigInt(ci.equipoId),
                  cantidad: ci.cantidad,
                },
              });
            }

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

            for (const ccs of payload.cajaItemCodigosSIE || []) {
              await tx.cajaEquipoCodigoSIE.create({
                data: {
                  codigoDepositoGeneral: Number(ccs.codigoDepositoGeneral),
                  equipoCodigoSIEId: BigInt(ccs.equipoCodigoSIEId),
                },
              });
            }

            for (const mov of payload.deletedMovimientos || []) {
              const existingMov = await tx.movimiento.findUnique({
                where: { movimientoId: BigInt(mov.movimientoId) },
              });
              if (!existingMov) {
                await tx.movimiento.create({
                  data: {
                    movimientoId: BigInt(mov.movimientoId),
                    tipo: mov.tipo as TipoMovimiento,
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

            for (const soi of payload.stockOperacionEquipos || []) {
              await tx.stockOperacionEquipo.create({
                data: {
                  stockOperacionId: BigInt(soi.stockOperacionId),
                  equipoId: BigInt(soi.equipoId),
                  cantidad: soi.cantidad,
                },
              });
            }
          } else {
            // ARTICULO
            const duplicate = await tx.articulo.findFirst({
              where: { nombre: payload.articulo.nombre },
            });
            if (duplicate) throw new Error("DUPLICATE_NAME");

            await tx.articulo.create({
              data: {
                articuloId: Number(payload.articulo.articuloId),
                nombre: payload.articulo.nombre,
                tipo: payload.articulo.tipo as TipoArticulo,
              },
            });

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
            where: { papeleraId: recycleRecord.papeleraId },
          });
        } else if (entidad === "PERSONAL") {
          if (detalle.evento === "PERSONAL_DADO_DE_BAJA_PENDIENTE") {
            await tx.personal.update({
              where: { ci: entidadId },
              data: { baja: false },
            });
          } else if (detalle.evento === "PERSONAL_DADO_DE_BAJA_HISTORIAL") {
            const historyRecord = await tx.personalHistorial.findUnique({
              where: { ci: entidadId },
            });

            if (!historyRecord) {
              throw new Error("NOT_FOUND_IN_HISTORY");
            }

            const existingActive = await tx.personal.findUnique({
              where: { ci: entidadId },
            });
            if (existingActive) throw new Error("ALREADY_ACTIVE");

            const tallas = (historyRecord.tallas as Array<{ tipo: string; valor: string }>) || [];
            const observaciones = (historyRecord.observaciones as Array<{ texto: string; fecha: string }>) || [];
            const tallaTipoMap = await getTallaTipoIdMap();

            await tx.personal.create({
              data: {
                ci: entidadId,
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
                baja: false,
              },
            });

            if (historyRecord.tipo === "SUBALTERNO") {
              
            } else if (historyRecord.tipo === "OFICIAL") {
              
            } else {
              
            }

            if (tallas.length > 0) {
              const tallasToCreate = tallas
                .map((t) => {
                  const tallaTipoId = tallaTipoMap.get(t.tipo as TallaKey);
                  if (!tallaTipoId || !t.valor) return null;
                  return {
                    ci: entidadId,
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

            if (observaciones.length > 0) {
              await tx.observacion.createMany({
                data: observaciones.map((o) => ({
                  ci: entidadId,
                  texto: o.texto,
                  fecha: o.fecha ? new Date(o.fecha) : new Date(),
                })),
              });
            }

            await tx.personalHistorial.delete({
              where: { ci: entidadId },
            });
          }
        } else if (entidad === "OBSERVACION") {
          await tx.observacion.create({
            data: {
              observacionId: BigInt(entidadId),
              ci: detalle.ci,
              fecha: new Date(detalle.fecha),
              texto: detalle.texto,
            },
          });
        } else {
          throw new Error("UNSUPPORTED_UNDO_ENTITY");
        }
      }

      return {
        ok: true,
        entidad,
        accion,
        entidadId,
      };
    });

    if (undoResult.entidad === "GRADO_PERSONAL") {
      invalidateRangoTipoCountCache();
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "REGISTRO",
      entidadId: String(auditoriaId),
      detalle: {
        evento: "UNDO_ACCION_AUDITORIA",
        auditoriaIdRestaurada: String(auditoriaId),
        entidadAfectada: undoResult.entidad,
        accionDeshecha: undoResult.accion,
        entidadIdDeshecho: undoResult.entidadId,
        mensaje: `Fue por un deshacer de la acción #${auditoriaId}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "AUDIT_NOT_FOUND") {
        return NextResponse.json({ error: "Registro de auditoría no encontrado." }, { status: 404 });
      }
      if (error.message === "UNDO_EXPIRED") {
        return NextResponse.json({ error: "El límite de 5 días para deshacer este cambio ha expirado." }, { status: 400 });
      }
      if (error.message === "NO_PREVIOUS_STATE") {
        return NextResponse.json({ error: "No hay estado previo registrado para deshacer este cambio." }, { status: 400 });
      }
      if (error.message === "NOT_FOUND_IN_TRASH") {
        return NextResponse.json({ error: "El elemento ya no se encuentra en la papelera para ser restaurado." }, { status: 410 });
      }
      if (error.message === "DUPLICATE_NAME") {
        return NextResponse.json(
          { error: "Ya existe un elemento activo con ese nombre. Cambia el nombre para evitar conflictos." },
          { status: 409 }
        );
      }
      if (error.message === "ALREADY_ACTIVE") {
        return NextResponse.json({ error: "El personal ya se encuentra activo en el sistema." }, { status: 409 });
      }
      if (error.message === "UNSUPPORTED_UNDO_ENTITY") {
        return NextResponse.json({ error: "Esta entidad no soporta la función de deshacer." }, { status: 400 });
      }
    }
    console.log("Error en Deshacer Auditoría:", error);
    return NextResponse.json({ error: "Error interno al deshacer la acción de auditoría." }, { status: 500 });
  }
}
