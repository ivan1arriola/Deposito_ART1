import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { applyEquipoOrder, getOrderedEquipoIds, insertEquipoAtOrder } from "@/lib/equipo-ordering";
import { GENERAL_TIPO_EQUIPO_CLAVE, normalizeEquipoTipoClave } from "@/lib/equipo-tipos";
import { serializeEquipoTipoData, tipoEquipoRelationSelect } from "@/lib/equipo-tipos-data";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import { isAdminRole } from "@/lib/user-role";

type EquipoPayload = {
  nombre: string;
  tipo?: string;
  tipoEquipoId?: number | string | null;
  activo?: boolean;
  ordenPdf?: number;
};

type EquipoExistenciaSiePayload = {
  existenciaSie?: unknown;
};

type EquipoMergePayload = {
  targetEquipoId?: string | number;
};

type TipoEquipoLookupClient = Pick<Prisma.TransactionClient, "tipoEquipoCatalogo">;

const equipoSelect = {
  equipoId: true,
  nombre: true,
  tipoEquipoId: true,
  tipoEquipo: {
    select: tipoEquipoRelationSelect,
  },
  activo: true,
  ordenPdf: true,
  existenciaSie: true,
} satisfies Prisma.EquipoSelect;

function parseItemId(value: string) {
  const raw = value.trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function isValidOrder(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

function parseNullableTipoEquipoId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function resolveTipoEquipoId(
  client: TipoEquipoLookupClient,
  body: EquipoPayload
): Promise<number | null | undefined> {
  if (Object.prototype.hasOwnProperty.call(body, "tipoEquipoId")) {
    const parsed = parseNullableTipoEquipoId(body.tipoEquipoId);
    if (
      body.tipoEquipoId !== null &&
      body.tipoEquipoId !== undefined &&
      body.tipoEquipoId !== "" &&
      parsed === null
    ) {
      return undefined;
    }
    if (parsed === null) return null;

    const existing = await client.tipoEquipoCatalogo.findUnique({
      where: { tipoEquipoId: parsed },
      select: { tipoEquipoId: true },
    });
    return existing?.tipoEquipoId;
  }

  if (typeof body.tipo === "undefined") return null;

  const normalized = normalizeEquipoTipoClave(String(body.tipo ?? ""));
  if (!normalized || normalized === GENERAL_TIPO_EQUIPO_CLAVE) return null;

  const existing = await client.tipoEquipoCatalogo.findUnique({
    where: { clave: normalized },
    select: { tipoEquipoId: true },
  });
  return existing?.tipoEquipoId;
}

function parseExistenciaSie(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function serializeEquipo(equipo: {
  equipoId: bigint;
  nombre: string;
  tipoEquipoId: number | null;
  tipoEquipo?: {
    tipoEquipoId: number;
    clave: string;
    nombre: string;
    orden: number;
  } | null;
  activo: boolean;
  ordenPdf: number;
  existenciaSie: number;
}) {
  const tipo = serializeEquipoTipoData(equipo);

  return {
    equipoId: equipo.equipoId.toString(),
    nombre: equipo.nombre,
    ...tipo,
    activo: equipo.activo,
    ordenPdf: equipo.ordenPdf,
    existenciaSie: equipo.existenciaSie,
  };
}

type DeleteImpactData = {
  impacto: {
    equipo: {
      equipoId: string;
      nombre: string;
    };
    resumen: {
      totalMovimientos: number;
      totalRegistros: number;
      totalStock: number;
      movimientosQueSeEliminan: number;
      movimientosQueSeActualizan: number;
      totalCodigosSIE: number;
      totalCodigosSIEEnCajas: number;
      totalAparicionesEquipoEnCajas: number;
      totalCajasAfectadas: number;
      cajasQueQuedanSinEquipos: number;
    };
    codigosSIE: Array<{
      codigo: string;
      talla: string | null;
      aparicionesEnCajas: number;
    }>;
    cajas: Array<{
      codigoDepositoGeneral: number;
      estanteria: string;
      totalEquiposEnCaja: number;
      tieneRelacionEquipoDirecta: boolean;
      codigosSIERelacionados: string[];
      quedaSinEquipos: boolean;
    }>;
    registros: Array<{
      movimientoId: string;
      fecha: string;
      tipo: string;
      ci: string;
      persona: string;
      cantidadItems: number;
      seEliminaMovimiento: boolean;
    }>;
    stock: Array<{
      movimientoId: string;
      fecha: string;
      tipo: string;
      cantidadItems: number;
      seEliminaMovimiento: boolean;
    }>;
  };
  affectedMovimientoIds: bigint[];
  affectedStockOperacionIds: bigint[];
};

async function buildDeleteImpactData(
  tx: Prisma.TransactionClient,
  equipoId: bigint,
  equipoNombre: string
): Promise<DeleteImpactData> {
  const movimientoRefs = await tx.movimientoEquipo.findMany({
    where: { equipoId },
    select: { movimientoId: true },
  });
  const stockRefs = await tx.stockOperacionEquipo.findMany({
    where: { equipoId },
    select: { stockOperacionId: true },
  });
  const affectedMovimientoIds = Array.from(
    new Set(movimientoRefs.map((ref) => ref.movimientoId.toString()))
  ).map((id) => BigInt(id));
  const affectedStockOperacionIds = Array.from(
    new Set(stockRefs.map((ref) => ref.stockOperacionId.toString()))
  ).map((id) => BigInt(id));

  const [movimientos, stockOperaciones, codigosSIE, cajaEquipoRefs] = await Promise.all([
    affectedMovimientoIds.length > 0
      ? tx.movimiento.findMany({
          where: { movimientoId: { in: affectedMovimientoIds } },
          select: {
            movimientoId: true,
            fecha: true,
            tipo: true,
            destinatarioPersonal: {
              select: {
                personal: {
                  select: {
                    ci: true,
                    apellido1: true,
                    apellido2: true,
                    nombre1: true,
                    nombre2: true,
                    rango: {
                      select: {
                        abreviacion: true,
                        nombreCompleto: true,
                        tipo: true,
                      },
                    },
                    bateria: {
                      select: {
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
            destinatarioExterno: {
              select: {
                personaExterna: {
                  select: {
                    ci: true,
                    grado: true,
                    nombre: true,
                    apellido: true,
                    unidadDestino: true,
                  },
                },
              },
            },
            destinatarioRecinto: {
              select: {
                clase: true,
                nombre: true,
              },
            },
            _count: {
              select: { equipos: true },
            },
          },
        })
      : Promise.resolve([]),
    affectedStockOperacionIds.length > 0
      ? tx.stockOperacion.findMany({
          where: { stockOperacionId: { in: affectedStockOperacionIds } },
          select: {
            stockOperacionId: true,
            fecha: true,
            tipo: true,
            _count: {
              select: { equipos: true },
            },
          },
        })
      : Promise.resolve([]),
    tx.equipoCodigoSIE.findMany({
      where: { equipoId },
      select: {
        codigo: true,
        talla: true,
        _count: {
          select: { cajas: true },
        },
      },
      orderBy: [{ codigo: "asc" }],
    }),
    tx.cajaEquipo.findMany({
      where: { equipoId },
      select: { codigoDepositoGeneral: true },
    }),
  ]);

  const cajaIdsConRelacionEquipo = Array.from(
    new Set(cajaEquipoRefs.map((entry) => entry.codigoDepositoGeneral))
  );

  const cajasAfectadas = await tx.caja.findMany({
    where: {
      OR: [
        { codigosSIE: { some: { equipoCodigoSIE: { equipoId } } } },
        ...(cajaIdsConRelacionEquipo.length > 0
          ? [{ codigoDepositoGeneral: { in: cajaIdsConRelacionEquipo } }]
          : []),
      ],
    },
    select: {
      codigoDepositoGeneral: true,
      estanteria: true,
      _count: {
        select: { equipos: true },
      },
      equipos: {
        where: { equipoId },
        select: { equipoId: true },
      },
      codigosSIE: {
        where: { equipoCodigoSIE: { equipoId } },
        select: {
          equipoCodigoSIE: {
            select: {
              codigo: true,
            },
          },
        },
      },
    },
    orderBy: [{ codigoDepositoGeneral: "asc" }],
  });

  const normalizedRegistros = movimientos
    .map((movimiento) => {
      const destinatario = resolveDestinatarioMovimiento(movimiento);
      return {
        movimientoId: movimiento.movimientoId.toString(),
        fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
        tipo: movimiento.tipo,
        ci: destinatario?.ci ?? "",
        persona: destinatario?.etiqueta ?? "Destinatario pendiente",
        cantidadItems: movimiento._count.equipos,
        seEliminaMovimiento: movimiento._count.equipos <= 1,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.movimientoId.localeCompare(a.movimientoId));

  const normalizedStock = stockOperaciones
    .map((stockOperacion) => ({
      movimientoId: stockOperacion.stockOperacionId.toString(),
      fecha: formatDateOnlyFromDate(stockOperacion.fecha) ?? "",
      tipo: stockOperacion.tipo,
      cantidadItems: stockOperacion._count.equipos,
      seEliminaMovimiento: stockOperacion._count.equipos <= 1,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.movimientoId.localeCompare(a.movimientoId));

  const normalizedCodigosSIE = codigosSIE.map((codigo) => ({
    codigo: codigo.codigo,
    talla: codigo.talla,
    aparicionesEnCajas: codigo._count.cajas,
  }));

  const normalizedCajas = cajasAfectadas.map((caja) => {
    const codigosSIERelacionados = Array.from(
      new Set(caja.codigosSIE.map((codigo) => codigo.equipoCodigoSIE.codigo))
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const tieneRelacionEquipoDirecta = caja.equipos.length > 0;
    const quedaSinEquipos = tieneRelacionEquipoDirecta ? caja._count.equipos <= 1 : false;

    return {
      codigoDepositoGeneral: caja.codigoDepositoGeneral,
      estanteria: caja.estanteria,
      totalEquiposEnCaja: caja._count.equipos,
      tieneRelacionEquipoDirecta,
      codigosSIERelacionados,
      quedaSinEquipos,
    };
  });

  const movimientosQueSeEliminan =
    normalizedRegistros.filter((mov) => mov.seEliminaMovimiento).length +
    normalizedStock.filter((mov) => mov.seEliminaMovimiento).length;
  const totalMovimientos = normalizedRegistros.length + normalizedStock.length;
  const totalAparicionesEquipoEnCajas = new Set(
    cajaEquipoRefs.map((entry) => entry.codigoDepositoGeneral)
  ).size;
  const totalCodigosSIEEnCajas = normalizedCodigosSIE.reduce(
    (acc, codigo) => acc + codigo.aparicionesEnCajas,
    0
  );
  const cajasQueQuedanSinEquipos = normalizedCajas.filter((caja) => caja.quedaSinEquipos).length;

  return {
    impacto: {
      equipo: {
        equipoId: equipoId.toString(),
        nombre: equipoNombre,
      },
      resumen: {
        totalMovimientos,
        totalRegistros: normalizedRegistros.length,
        totalStock: normalizedStock.length,
        movimientosQueSeEliminan,
        movimientosQueSeActualizan: totalMovimientos - movimientosQueSeEliminan,
        totalCodigosSIE: normalizedCodigosSIE.length,
        totalCodigosSIEEnCajas,
        totalAparicionesEquipoEnCajas,
        totalCajasAfectadas: normalizedCajas.length,
        cajasQueQuedanSinEquipos,
      },
      codigosSIE: normalizedCodigosSIE,
      cajas: normalizedCajas,
      registros: normalizedRegistros,
      stock: normalizedStock,
    },
    affectedMovimientoIds,
    affectedStockOperacionIds,
  };
}

export const equipoByIdRouteTestables = {
  parseItemId,
  isValidOrder,
  parseExistenciaSie,
};

export async function GET(request: Request, context: { params: Promise<{ equipoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  const { equipoId: equipoIdParam } = await context.params;
  const equipoId = parseItemId(equipoIdParam);
  if (equipoId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  try {
    await ensureMovimientoDestinatarioRecintoCompatibility();
    const equipo = await prisma.equipo.findUniqueOrThrow({
      where: { equipoId },
      select: { equipoId: true, nombre: true },
    });
    const { impacto } = await buildDeleteImpactData(prisma, equipoId, equipo.nombre);
    return NextResponse.json(impacto);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Payload invalido.")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "No se pudo calcular el impacto de borrado." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ equipoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  const { equipoId: sourceEquipoIdParam } = await context.params;
  const sourceEquipoId = parseItemId(sourceEquipoIdParam);
  if (sourceEquipoId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await request.json()) as EquipoMergePayload;
  const targetEquipoIdRaw = body?.targetEquipoId ?? body?.targetEquipoId;
  if (typeof targetEquipoIdRaw !== "string" && typeof targetEquipoIdRaw !== "number") {
    return NextResponse.json(
      { error: "Payload invalido. targetEquipoId es obligatorio." },
      { status: 400 }
    );
  }

  const targetEquipoId = parseItemId(String(targetEquipoIdRaw));
  if (targetEquipoId === null) {
    return NextResponse.json({ error: "targetEquipoId invalido." }, { status: 400 });
  }

  if (targetEquipoId === sourceEquipoId) {
    return NextResponse.json(
      { error: "Debes seleccionar dos equipos distintos para unificar." },
      { status: 400 }
    );
  }

  try {
    const mergeResult = await prisma.$transaction(
      async (tx) => {
        const [sourceEquipo, targetEquipo] = await Promise.all([
          tx.equipo.findUniqueOrThrow({
            where: { equipoId: sourceEquipoId },
            select: { equipoId: true, nombre: true, activo: true, existenciaSie: true },
          }),
          tx.equipo.findUniqueOrThrow({
            where: { equipoId: targetEquipoId },
            select: { equipoId: true, nombre: true, activo: true, existenciaSie: true },
          }),
        ]);

        const remainingIdsInSourceGroup = await getOrderedEquipoIds(
          tx,
          sourceEquipo.activo,
          sourceEquipoId
        );

        const [
          sourceMovimientoEquipos,
          sourceStockEquipos,
          sourceCajaEquipos,
          sourceCodigosSIE,
          targetCodigosSIE,
        ] = await Promise.all([
          tx.movimientoEquipo.findMany({
            where: { equipoId: sourceEquipoId },
            select: {
              movimientoId: true,
              cantidad: true,
              estadoEntrega: true,
              comentarioEntrega: true,
              estadoDevolucion: true,
              comentarioDevolucion: true,
            },
          }),
          tx.stockOperacionEquipo.findMany({
            where: { equipoId: sourceEquipoId },
            select: { stockOperacionId: true, cantidad: true },
          }),
          tx.cajaEquipo.findMany({
            where: { equipoId: sourceEquipoId },
          }),
          tx.equipoCodigoSIE.findMany({
            where: { equipoId: sourceEquipoId },
            select: { equipoCodigoSIEId: true, codigo: true, talla: true },
          }),
          tx.equipoCodigoSIE.findMany({
            where: { equipoId: targetEquipoId },
            select: { equipoCodigoSIEId: true, codigo: true, talla: true },
          }),
        ]);

        const [targetMovimientoEquipos, targetStockEquipos] = await Promise.all([
          sourceMovimientoEquipos.length > 0
            ? tx.movimientoEquipo.findMany({
                where: {
                  equipoId: targetEquipoId,
                  movimientoId: { in: sourceMovimientoEquipos.map((entry) => entry.movimientoId) },
                },
                select: { movimientoId: true },
              })
            : Promise.resolve([]),
          sourceStockEquipos.length > 0
            ? tx.stockOperacionEquipo.findMany({
                where: {
                  equipoId: targetEquipoId,
                  stockOperacionId: {
                    in: sourceStockEquipos.map((entry) => entry.stockOperacionId),
                  },
                },
                select: { stockOperacionId: true },
              })
            : Promise.resolve([]),
        ]);

        const movimientoTargetIds = new Set(
          targetMovimientoEquipos.map((entry) => entry.movimientoId.toString())
        );
        const stockTargetIds = new Set(
          targetStockEquipos.map((entry) => entry.stockOperacionId.toString())
        );

        for (const sourceMovimientoEquipo of sourceMovimientoEquipos) {
          await tx.movimientoEquipo.upsert({
            where: {
              movimientoId_equipoId: {
                movimientoId: sourceMovimientoEquipo.movimientoId,
                equipoId: targetEquipoId,
              },
            },
            update: {
              cantidad: { increment: sourceMovimientoEquipo.cantidad },
            },
            create: {
              movimientoId: sourceMovimientoEquipo.movimientoId,
              equipoId: targetEquipoId,
              cantidad: sourceMovimientoEquipo.cantidad,
              estadoEntrega: sourceMovimientoEquipo.estadoEntrega,
              comentarioEntrega: sourceMovimientoEquipo.comentarioEntrega,
              estadoDevolucion: sourceMovimientoEquipo.estadoDevolucion,
              comentarioDevolucion: sourceMovimientoEquipo.comentarioDevolucion,
            },
          });

          await tx.movimientoEquipo.delete({
            where: {
              movimientoId_equipoId: {
                movimientoId: sourceMovimientoEquipo.movimientoId,
                equipoId: sourceEquipoId,
              },
            },
          });
        }

        for (const sourceStockEquipo of sourceStockEquipos) {
          await tx.stockOperacionEquipo.upsert({
            where: {
              stockOperacionId_equipoId: {
                stockOperacionId: sourceStockEquipo.stockOperacionId,
                equipoId: targetEquipoId,
              },
            },
            update: {
              cantidad: { increment: sourceStockEquipo.cantidad },
            },
            create: {
              stockOperacionId: sourceStockEquipo.stockOperacionId,
              equipoId: targetEquipoId,
              cantidad: sourceStockEquipo.cantidad,
            },
          });

          await tx.stockOperacionEquipo.delete({
            where: {
              stockOperacionId_equipoId: {
                stockOperacionId: sourceStockEquipo.stockOperacionId,
                equipoId: sourceEquipoId,
              },
            },
          });
        }

        for (const sourceCajaEquipo of sourceCajaEquipos) {
          await tx.cajaEquipo.upsert({
            where: {
              codigoDepositoGeneral_equipoId: {
                codigoDepositoGeneral: sourceCajaEquipo.codigoDepositoGeneral,
                equipoId: targetEquipoId,
              },
            },
            update: {
              cantidad: { increment: sourceCajaEquipo.cantidad },
            },
            create: {
              codigoDepositoGeneral: sourceCajaEquipo.codigoDepositoGeneral,
              equipoId: targetEquipoId,
              cantidad: sourceCajaEquipo.cantidad,
            },
          });

          await tx.cajaEquipo.delete({
            where: {
              codigoDepositoGeneral_equipoId: {
                codigoDepositoGeneral: sourceCajaEquipo.codigoDepositoGeneral,
                equipoId: sourceEquipoId,
              },
            },
          });
        }

        const targetMap = new Map(
          targetCodigosSIE.map((codigo) => [
            `${codigo.codigo}:::${codigo.talla}`,
            codigo.equipoCodigoSIEId,
          ])
        );

        for (const sourceCodigo of sourceCodigosSIE) {
          const key = `${sourceCodigo.codigo}:::${sourceCodigo.talla}`;
          const existingTargetId = targetMap.get(key);

          if (existingTargetId !== undefined) {
            const cajasAsociadas = await tx.cajaEquipoCodigoSIE.findMany({
              where: { equipoCodigoSIEId: sourceCodigo.equipoCodigoSIEId },
            });

            for (const caja of cajasAsociadas) {
              const exists = await tx.cajaEquipoCodigoSIE.findUnique({
                where: {
                  codigoDepositoGeneral_equipoCodigoSIEId: {
                    codigoDepositoGeneral: caja.codigoDepositoGeneral,
                    equipoCodigoSIEId: existingTargetId,
                  },
                },
              });
              if (!exists) {
                await tx.cajaEquipoCodigoSIE.create({
                  data: {
                    codigoDepositoGeneral: caja.codigoDepositoGeneral,
                    equipoCodigoSIEId: existingTargetId,
                  },
                });
              }
            }

            await tx.cajaEquipoCodigoSIE.deleteMany({
              where: { equipoCodigoSIEId: sourceCodigo.equipoCodigoSIEId },
            });
            await tx.equipoCodigoSIE.delete({
              where: { equipoCodigoSIEId: sourceCodigo.equipoCodigoSIEId },
            });
          } else {
            await tx.equipoCodigoSIE.update({
              where: { equipoCodigoSIEId: sourceCodigo.equipoCodigoSIEId },
              data: { equipoId: targetEquipoId },
            });
          }
        }

        await tx.equipo.update({
          where: { equipoId: targetEquipoId },
          data: { existenciaSie: { increment: sourceEquipo.existenciaSie } },
        });

        await tx.equipo.delete({
          where: { equipoId: sourceEquipoId },
        });

        await applyEquipoOrder(tx, remainingIdsInSourceGroup, sourceEquipo.activo ? 0 : 10000);

        const unidadesRegistrosReasignadas = sourceMovimientoEquipos.reduce(
          (total, entry) => total + entry.cantidad,
          0
        );
        const unidadesStockReasignadas = sourceStockEquipos.reduce(
          (total, entry) => total + entry.cantidad,
          0
        );
        const registrosConsolidados = sourceMovimientoEquipos.filter((entry) =>
          movimientoTargetIds.has(entry.movimientoId.toString())
        ).length;
        const stockConsolidados = sourceStockEquipos.filter((entry) =>
          stockTargetIds.has(entry.stockOperacionId.toString())
        ).length;

        return {
          sourceEquipo,
          targetEquipo,
          resumen: {
            totalRegistrosAfectados: sourceMovimientoEquipos.length,
            totalStockAfectados: sourceStockEquipos.length,
            totalMovimientosAfectados: sourceMovimientoEquipos.length + sourceStockEquipos.length,
            registrosConsolidados,
            stockConsolidados,
            unidadesRegistrosReasignadas,
            unidadesStockReasignadas,
            unidadesTotalesReasignadas: unidadesRegistrosReasignadas + unidadesStockReasignadas,
          },
        };
      },
      { maxWait: 5_000, timeout: 20_000 }
    );

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "EQUIPO",
      entidadId: mergeResult.targetEquipo.equipoId.toString(),
      detalle: {
        evento: "EQUIPO_UNIFICADO",
        equipoOrigenId: mergeResult.sourceEquipo.equipoId.toString(),
        equipoOrigen: mergeResult.sourceEquipo.nombre,
        equipoDestinoId: mergeResult.targetEquipo.equipoId.toString(),
        equipoDestino: mergeResult.targetEquipo.nombre,
        totalMovimientosAfectados: mergeResult.resumen.totalMovimientosAfectados,
        totalRegistrosAfectados: mergeResult.resumen.totalRegistrosAfectados,
        totalStockAfectados: mergeResult.resumen.totalStockAfectados,
        registrosConsolidados: mergeResult.resumen.registrosConsolidados,
        stockConsolidados: mergeResult.resumen.stockConsolidados,
        unidadesTotalesReasignadas: mergeResult.resumen.unidadesTotalesReasignadas,
      },
    });

    return NextResponse.json({
      ok: true,
      sourceEquipo: {
        equipoId: mergeResult.sourceEquipo.equipoId.toString(),
        nombre: mergeResult.sourceEquipo.nombre,
      },
      targetEquipo: {
        equipoId: mergeResult.targetEquipo.equipoId.toString(),
        nombre: mergeResult.targetEquipo.nombre,
      },
      resumen: mergeResult.resumen,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo unificar el equipo." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ equipoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const { equipoId: equipoIdParam } = await context.params;
  const equipoId = parseItemId(equipoIdParam);
  if (equipoId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await request.json()) as EquipoPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre || !isValidOrder(body?.ordenPdf)) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.equipo.findUniqueOrThrow({
          where: { equipoId },
          select: equipoSelect,
        });

        const nextActive = body.activo === undefined ? existing.activo : Boolean(body.activo);
        const resolvedTipoEquipoId = await resolveTipoEquipoId(tx, body);
        const nextTipoEquipoId =
          body.tipo === undefined && !Object.prototype.hasOwnProperty.call(body, "tipoEquipoId")
            ? existing.tipoEquipoId
            : resolvedTipoEquipoId;
        if (typeof nextTipoEquipoId === "undefined") {
          throw new Error("Payload inválido. El tipo de equipo indicado no existe.");
        }

        if (nextActive !== existing.activo) {
          const oldGroupIds = await getOrderedEquipoIds(tx, existing.activo, equipoId);

          await tx.equipo.update({
            where: { equipoId },
            data: {
              nombre,
              tipoEquipoId: nextTipoEquipoId,
              activo: nextActive,
              ordenPdf: 1,
            },
          });

          await applyEquipoOrder(tx, oldGroupIds, existing.activo ? 0 : 10000);

          const newGroupIds = await getOrderedEquipoIds(tx, nextActive, equipoId);
          const nextOrderedIds = insertEquipoAtOrder(
            newGroupIds,
            equipoId,
            body.ordenPdf ?? newGroupIds.length + 1
          );
          await applyEquipoOrder(tx, nextOrderedIds, nextActive ? 0 : 10000);
        } else {
          const currentGroupIds = await getOrderedEquipoIds(tx, nextActive, equipoId);
          const nextOrderedIds = insertEquipoAtOrder(
            currentGroupIds,
            equipoId,
            body.ordenPdf ?? existing.ordenPdf
          );

          await tx.equipo.update({
            where: { equipoId },
            data: {
              nombre,
              tipoEquipoId: nextTipoEquipoId,
              activo: nextActive,
              ordenPdf: 1,
            },
          });

          await applyEquipoOrder(tx, nextOrderedIds, nextActive ? 0 : 10000);
        }

        const updatedRecord = await tx.equipo.findUniqueOrThrow({
          where: { equipoId },
          select: equipoSelect,
        });

        const previoTipo = serializeEquipoTipoData(existing);
        const nuevoTipo = serializeEquipoTipoData(updatedRecord);

        return {
          ...updatedRecord,
          previo: {
            nombre: existing.nombre,
            tipo: previoTipo.tipo,
            tipoEquipoId: existing.tipoEquipoId,
            activo: existing.activo,
            ordenPdf: existing.ordenPdf,
            existenciaSie: existing.existenciaSie,
          },
          nuevoTipo,
        };
      },
      { maxWait: 5_000, timeout: 20_000 }
    );

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "EQUIPO",
      entidadId: updated.equipoId.toString(),
      detalle: {
        previo: updated.previo,
        nuevo: {
          nombre: updated.nombre,
          tipo: updated.nuevoTipo.tipo,
          tipoEquipoId: updated.tipoEquipoId,
          activo: updated.activo,
          ordenPdf: updated.ordenPdf,
          existenciaSie: updated.existenciaSie,
        },
      },
    });

    return NextResponse.json(serializeEquipo(updated));
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Payload inválido.")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
      if (code === "P2002")
        return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ equipoId: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;
  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json(
      { error: "Solo un administrador puede actualizar la existencia del SIE." },
      { status: 403 }
    );
  }

  const { equipoId: equipoIdParam } = await context.params;
  const equipoId = parseItemId(equipoIdParam);
  if (equipoId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await request.json()) as EquipoExistenciaSiePayload;
  const existenciaSie = parseExistenciaSie(body?.existenciaSie);
  if (existenciaSie === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'existenciaSie' debe ser un entero mayor o igual a 0." },
      { status: 400 }
    );
  }

  try {
    const current = await prisma.equipo.findUnique({
      where: { equipoId },
      select: { existenciaSie: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    const updated = await prisma.equipo.update({
      where: { equipoId },
      data: { existenciaSie },
      select: {
        equipoId: true,
        nombre: true,
        existenciaSie: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "EQUIPO",
      entidadId: updated.equipoId.toString(),
      detalle: {
        evento: "EQUIPO_EXISTENCIA_SIE_UPDATE",
        previo: { existenciaSie: current.existenciaSie },
        nuevo: { existenciaSie: updated.existenciaSie },
      },
    });

    return NextResponse.json({
      equipoId: updated.equipoId.toString(),
      existenciaSie: updated.existenciaSie,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "No se pudo actualizar la existencia del SIE." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ equipoId: string }> }) {
  const auth = await authorizeRequest(request, "delete_data");
  if (!auth.ok) return auth.response;

  const { equipoId: equipoIdParam } = await context.params;
  const equipoId = parseItemId(equipoIdParam);
  if (equipoId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  try {
    await ensureMovimientoDestinatarioRecintoCompatibility();

    const deletionResult = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.equipo.findUniqueOrThrow({
          where: { equipoId },
          select: {
            equipoId: true,
            nombre: true,
            activo: true,
            ordenPdf: true,
            existenciaSie: true,
          },
        });

        const { impacto, affectedMovimientoIds, affectedStockOperacionIds } =
          await buildDeleteImpactData(tx, equipoId, existing.nombre);
        const remainingIds = await getOrderedEquipoIds(tx, existing.activo, equipoId);

        const cajaEquipos = await tx.cajaEquipo.findMany({
          where: { equipoId },
        });

        const equipoCodigosSIE = await tx.equipoCodigoSIE.findMany({
          where: { equipoId },
        });

        const equipoCodigoSIEIds = equipoCodigosSIE.map((codigo) => codigo.equipoCodigoSIEId);
        const cajaItemCodigosSIE =
          equipoCodigoSIEIds.length > 0
            ? await tx.cajaEquipoCodigoSIE.findMany({
                where: { equipoCodigoSIEId: { in: equipoCodigoSIEIds } },
              })
            : [];

        const movimientoEquipos = await tx.movimientoEquipo.findMany({
          where: { equipoId },
        });

        const stockOperacionEquipos = await tx.stockOperacionEquipo.findMany({
          where: { equipoId },
        });

        const emptyMovimientoIds = [];
        for (const movimientoId of affectedMovimientoIds) {
          const count = await tx.movimientoEquipo.count({
            where: { movimientoId },
          });
          const countThisEquipo = movimientoEquipos.filter(
            (movimientoEquipo) => movimientoEquipo.movimientoId === movimientoId
          ).length;
          if (count === countThisEquipo) {
            emptyMovimientoIds.push(movimientoId);
          }
        }

        const deletedMovimientos =
          emptyMovimientoIds.length > 0
            ? await tx.movimiento.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const deletedMovimientoDestinatariosPersonal =
          emptyMovimientoIds.length > 0
            ? await tx.movimientoDestinatarioPersonal.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const deletedMovimientoDestinatariosExterno =
          emptyMovimientoIds.length > 0
            ? await tx.movimientoDestinatarioExterno.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const deletedMovimientoDestinatariosRecinto =
          emptyMovimientoIds.length > 0
            ? await tx.movimientoDestinatarioRecinto.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const deletedPrestamosActivos =
          emptyMovimientoIds.length > 0
            ? await tx.prestamoActivo.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const deletedPrestamosHistoriales =
          emptyMovimientoIds.length > 0
            ? await tx.prestamoHistorial.findMany({
                where: { movimientoId: { in: emptyMovimientoIds } },
              })
            : [];

        const emptyStockOperacionIds = [];
        for (const stockOperacionId of affectedStockOperacionIds) {
          const count = await tx.stockOperacionEquipo.count({
            where: { stockOperacionId },
          });
          const countThisEquipo = stockOperacionEquipos.filter(
            (stockOperacionEquipo) => stockOperacionEquipo.stockOperacionId === stockOperacionId
          ).length;
          if (count === countThisEquipo) {
            emptyStockOperacionIds.push(stockOperacionId);
          }
        }

        const deletedStockOperaciones =
          emptyStockOperacionIds.length > 0
            ? await tx.stockOperacion.findMany({
                where: { stockOperacionId: { in: emptyStockOperacionIds } },
              })
            : [];

        const payload = JSON.parse(
          JSON.stringify(
            {
              equipo: existing,
              cajaEquipos,
              equipoCodigosSIE,
              cajaItemCodigosSIE,
              movimientoEquipos,
              stockOperacionEquipos,
              deletedMovimientos,
              deletedMovimientoDestinatariosPersonal,
              deletedMovimientoDestinatariosExterno,
              deletedMovimientoDestinatariosRecinto,
              deletedPrestamosActivos,
              deletedPrestamosHistoriales,
              deletedStockOperaciones,
            },
            (key, value) => (typeof value === "bigint" ? value.toString() : value)
          )
        );

        await tx.papeleraRegistro.create({
          data: {
            tipo: "EQUIPO",
            nombre: existing.nombre,
            originalId: String(existing.equipoId),
            payload,
          },
        });

        await tx.movimientoEquipo.deleteMany({
          where: { equipoId },
        });
        await tx.stockOperacionEquipo.deleteMany({
          where: { equipoId },
        });
        await tx.cajaEquipoCodigoSIE.deleteMany({
          where: { equipoCodigoSIE: { equipoId } },
        });
        await tx.equipoCodigoSIE.deleteMany({
          where: { equipoId },
        });
        await tx.cajaEquipo.deleteMany({
          where: { equipoId },
        });

        if (affectedMovimientoIds.length > 0) {
          await tx.movimiento.deleteMany({
            where: {
              movimientoId: { in: affectedMovimientoIds },
              equipos: { none: {} },
            },
          });
        }

        if (affectedStockOperacionIds.length > 0) {
          await tx.stockOperacion.deleteMany({
            where: {
              stockOperacionId: { in: affectedStockOperacionIds },
              equipos: { none: {} },
            },
          });
        }

        const removed = await tx.equipo.delete({
          where: { equipoId },
        });

        await applyEquipoOrder(tx, remainingIds, existing.activo ? 0 : 10000);

        return {
          removed,
          impacto,
        };
      },
      { maxWait: 5_000, timeout: 20_000 }
    );

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "EQUIPO",
      entidadId: deletionResult.removed.equipoId.toString(),
      detalle: {
        nombre: deletionResult.removed.nombre,
        impacto: deletionResult.impacto.resumen,
        advertencia:
          "Equipo enviado a la papelera junto a sus codigos SIE, apariciones en cajas y movimientos vacios relacionados.",
      },
    });

    return NextResponse.json({ ok: true, impacto: deletionResult.impacto.resumen });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025")
        return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
