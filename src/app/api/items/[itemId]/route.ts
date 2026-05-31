import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { applyItemOrder, getOrderedItemIds, insertItemAtOrder } from "@/lib/item-ordering";
import { GENERAL_TIPO_EQUIPO_CLAVE, normalizeEquipoTipoClave } from "@/lib/equipo-tipos";
import { serializeEquipoTipoData, tipoEquipoRelationSelect } from "@/lib/equipo-tipos-data";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";

type ItemPayload = {
  nombre: string;
  tipo?: string;
  tipoEquipoId?: number | string | null;
  activo?: boolean;
  ordenPdf?: number;
};

type ItemExistenciaSiePayload = {
  existenciaSie?: unknown;
};

type ItemMergePayload = {
  targetEquipoId?: string | number;
  targetItemId?: string | number;
};

function parseItemId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function isValidOrder(value: unknown) {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value > 0);
}

const itemSelect = {
  itemId: true,
  nombre: true,
  tipoEquipoId: true,
  tipoEquipo: {
    select: tipoEquipoRelationSelect,
  },
  activo: true,
  ordenPdf: true,
  existenciaSie: true,
} satisfies Prisma.ItemSelect;

function parseNullableTipoEquipoId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function resolveTipoEquipoId(
  client: Pick<typeof prisma, "tipoEquipoCatalogo">,
  body: ItemPayload,
): Promise<number | null | undefined> {
  if (Object.prototype.hasOwnProperty.call(body, "tipoEquipoId")) {
    const parsed = parseNullableTipoEquipoId(body.tipoEquipoId);
    if (body.tipoEquipoId !== null && body.tipoEquipoId !== undefined && body.tipoEquipoId !== "" && parsed === null) {
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

function serializeItem(item: {
  itemId: bigint;
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
  const tipo = serializeEquipoTipoData(item);

  return {
    equipoId: item.itemId.toString(),
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    ...tipo,
    activo: item.activo,
    ordenPdf: item.ordenPdf,
    existenciaSie: item.existenciaSie,
  };
}

type DeleteImpactData = {
  impacto: {
    item: {
      equipoId: string;
      itemId: string;
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
  tx: Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">,
  itemId: bigint,
  itemNombre: string,
): Promise<DeleteImpactData> {
  const movimientoRefs = await tx.movimientoItem.findMany({
    where: { itemId },
    select: { movimientoId: true },
  });
  const stockRefs = await tx.stockOperacionItem.findMany({
    where: { itemId },
    select: { stockOperacionId: true },
  });
  const affectedMovimientoIds = Array.from(new Set(movimientoRefs.map((ref) => ref.movimientoId.toString()))).map((id) =>
    BigInt(id),
  );
  const affectedStockOperacionIds = Array.from(new Set(stockRefs.map((ref) => ref.stockOperacionId.toString()))).map((id) => BigInt(id));

  const [movimientos, stockOperaciones, codigosSIE, cajaItemRefs] = await Promise.all([
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
                    subalterno: {
                      select: {
                        bateria: {
                          select: {
                            nombre: true,
                          },
                        },
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
              select: { items: true },
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
              select: { items: true },
            },
          },
        })
      : Promise.resolve([]),
    tx.itemCodigoSIE.findMany({
      where: { itemId },
      select: {
        codigo: true,
        talla: true,
        _count: {
          select: { cajas: true },
        },
      },
      orderBy: [{ codigo: "asc" }],
    }),
    tx.cajaItem.findMany({
      where: { itemId },
      select: { codigoDepositoGeneral: true },
    }),
  ]);

  const cajaIdsConRelacionEquipo = Array.from(
    new Set(cajaItemRefs.map((entry) => entry.codigoDepositoGeneral)),
  );

  const cajasAfectadas = await tx.caja.findMany({
    where: {
      OR: [
        { codigosSIE: { some: { itemCodigoSIE: { itemId } } } },
        ...(cajaIdsConRelacionEquipo.length > 0
          ? [{ codigoDepositoGeneral: { in: cajaIdsConRelacionEquipo } }]
          : []),
      ],
    },
    select: {
      codigoDepositoGeneral: true,
      estanteria: true,
      _count: {
        select: { items: true },
      },
      items: {
        where: { itemId },
        select: { itemId: true },
      },
      codigosSIE: {
        where: { itemCodigoSIE: { itemId } },
        select: {
          itemCodigoSIE: {
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
        cantidadItems: movimiento._count.items,
        seEliminaMovimiento: movimiento._count.items <= 1,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.movimientoId.localeCompare(a.movimientoId));

  const normalizedStock = stockOperaciones
    .map((stockOperacion) => ({
      movimientoId: stockOperacion.stockOperacionId.toString(),
      fecha: formatDateOnlyFromDate(stockOperacion.fecha) ?? "",
      tipo: stockOperacion.tipo,
      cantidadItems: stockOperacion._count.items,
      seEliminaMovimiento: stockOperacion._count.items <= 1,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.movimientoId.localeCompare(a.movimientoId));

  const normalizedCodigosSIE = codigosSIE.map((codigo) => ({
    codigo: codigo.codigo,
    talla: codigo.talla,
    aparicionesEnCajas: codigo._count.cajas,
  }));

  const normalizedCajas = cajasAfectadas.map((caja) => {
    const codigosSIERelacionados = Array.from(
      new Set(caja.codigosSIE.map((codigo) => codigo.itemCodigoSIE.codigo)),
    ).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    const tieneRelacionEquipoDirecta = caja.items.length > 0;
    const quedaSinEquipos = tieneRelacionEquipoDirecta ? caja._count.items <= 1 : false;

    return {
      codigoDepositoGeneral: caja.codigoDepositoGeneral,
      estanteria: caja.estanteria,
      totalEquiposEnCaja: caja._count.items,
      tieneRelacionEquipoDirecta,
      codigosSIERelacionados,
      quedaSinEquipos,
    };
  });

  const movimientosQueSeEliminan =
    normalizedRegistros.filter((mov) => mov.seEliminaMovimiento).length +
    normalizedStock.filter((mov) => mov.seEliminaMovimiento).length;
  const totalMovimientos = normalizedRegistros.length + normalizedStock.length;
  const totalAparicionesEquipoEnCajas = new Set(cajaItemRefs.map((entry) => entry.codigoDepositoGeneral)).size;
  const totalCodigosSIEEnCajas = normalizedCodigosSIE.reduce((acc, codigo) => acc + codigo.aparicionesEnCajas, 0);
  const cajasQueQuedanSinEquipos = normalizedCajas.filter((caja) => caja.quedaSinEquipos).length;

  return {
    impacto: {
      item: {
        equipoId: itemId.toString(),
        itemId: itemId.toString(),
        nombre: itemNombre,
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

export const itemByIdRouteTestables = {
  parseItemId,
  isValidOrder,
  parseExistenciaSie,
};

export async function GET(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  try {
    await ensureMovimientoDestinatarioRecintoCompatibility();
    const item = await prisma.item.findUniqueOrThrow({
      where: { itemId },
      select: { itemId: true, nombre: true },
    });
    const { impacto } = await buildDeleteImpactData(prisma, itemId, item.nombre);
    return NextResponse.json(impacto);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("Payload invalido.")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo calcular el impacto de borrado." }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: sourceItemIdParam } = await context.params;
  const sourceItemId = parseItemId(sourceItemIdParam);
  if (sourceItemId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ItemMergePayload;
  const targetItemIdRaw = body?.targetEquipoId ?? body?.targetItemId;
  if (typeof targetItemIdRaw !== "string" && typeof targetItemIdRaw !== "number") {
    return NextResponse.json({ error: "Payload invalido. targetEquipoId es obligatorio." }, { status: 400 });
  }

  const targetItemId = parseItemId(String(targetItemIdRaw));
  if (targetItemId === null) {
    return NextResponse.json({ error: "targetEquipoId invalido." }, { status: 400 });
  }

  if (targetItemId === sourceItemId) {
    return NextResponse.json({ error: "Debes seleccionar dos equipos distintos para unificar." }, { status: 400 });
  }

  try {
    const mergeResult = await prisma.$transaction(async (tx) => {
      const [sourceItem, targetItem] = await Promise.all([
        tx.item.findUniqueOrThrow({
          where: { itemId: sourceItemId },
          select: { itemId: true, nombre: true, activo: true, existenciaSie: true },
        }),
        tx.item.findUniqueOrThrow({
          where: { itemId: targetItemId },
          select: { itemId: true, nombre: true, activo: true, existenciaSie: true },
        }),
      ]);

      const remainingIdsInSourceGroup = await getOrderedItemIds(tx, sourceItem.activo, sourceItemId);

      const [sourceMovimientoItems, sourceStockItems, sourceCajaItems, sourceCodigosSIE, targetCodigosSIE] = await Promise.all([
        tx.movimientoItem.findMany({
          where: { itemId: sourceItemId },
          select: {
            movimientoId: true,
            cantidad: true,
            estadoEntrega: true,
            comentarioEntrega: true,
            estadoDevolucion: true,
            comentarioDevolucion: true,
          },
        }),
        tx.stockOperacionItem.findMany({
          where: { itemId: sourceItemId },
          select: { stockOperacionId: true, cantidad: true },
        }),
        tx.cajaItem.findMany({
          where: { itemId: sourceItemId },
        }),
        tx.itemCodigoSIE.findMany({
          where: { itemId: sourceItemId },
          select: { itemCodigoSIEId: true, codigo: true, talla: true },
        }),
        tx.itemCodigoSIE.findMany({
          where: { itemId: targetItemId },
          select: { itemCodigoSIEId: true, codigo: true, talla: true },
        }),
      ]);

      const [targetMovimientoItems, targetStockItems] = await Promise.all([
        sourceMovimientoItems.length > 0
          ? tx.movimientoItem.findMany({
              where: {
                itemId: targetItemId,
                movimientoId: { in: sourceMovimientoItems.map((entry) => entry.movimientoId) },
              },
              select: { movimientoId: true },
            })
          : Promise.resolve([]),
        sourceStockItems.length > 0
          ? tx.stockOperacionItem.findMany({
              where: {
                itemId: targetItemId,
                stockOperacionId: { in: sourceStockItems.map((entry) => entry.stockOperacionId) },
              },
              select: { stockOperacionId: true },
            })
          : Promise.resolve([]),
      ]);

      const movimientoTargetIds = new Set(targetMovimientoItems.map((entry) => entry.movimientoId.toString()));
      const stockTargetIds = new Set(targetStockItems.map((entry) => entry.stockOperacionId.toString()));

      for (const sourceMovimientoItem of sourceMovimientoItems) {
        await tx.movimientoItem.upsert({
          where: {
            movimientoId_itemId: {
              movimientoId: sourceMovimientoItem.movimientoId,
              itemId: targetItemId,
            },
          },
          update: {
            cantidad: { increment: sourceMovimientoItem.cantidad },
          },
          create: {
            movimientoId: sourceMovimientoItem.movimientoId,
            itemId: targetItemId,
            cantidad: sourceMovimientoItem.cantidad,
            estadoEntrega: sourceMovimientoItem.estadoEntrega,
            comentarioEntrega: sourceMovimientoItem.comentarioEntrega,
            estadoDevolucion: sourceMovimientoItem.estadoDevolucion,
            comentarioDevolucion: sourceMovimientoItem.comentarioDevolucion,
          },
        });

        await tx.movimientoItem.delete({
          where: {
            movimientoId_itemId: {
              movimientoId: sourceMovimientoItem.movimientoId,
              itemId: sourceItemId,
            },
          },
        });
      }

      for (const sourceStockItem of sourceStockItems) {
        await tx.stockOperacionItem.upsert({
          where: {
            stockOperacionId_itemId: {
              stockOperacionId: sourceStockItem.stockOperacionId,
              itemId: targetItemId,
            },
          },
          update: {
            cantidad: { increment: sourceStockItem.cantidad },
          },
          create: {
            stockOperacionId: sourceStockItem.stockOperacionId,
            itemId: targetItemId,
            cantidad: sourceStockItem.cantidad,
          },
        });

        await tx.stockOperacionItem.delete({
          where: {
            stockOperacionId_itemId: {
              stockOperacionId: sourceStockItem.stockOperacionId,
              itemId: sourceItemId,
            },
          },
        });
      }

      for (const sourceCajaItem of sourceCajaItems) {
        await tx.cajaItem.upsert({
          where: {
            codigoDepositoGeneral_itemId: {
              codigoDepositoGeneral: sourceCajaItem.codigoDepositoGeneral,
              itemId: targetItemId,
            },
          },
          update: {
            cantidad: { increment: sourceCajaItem.cantidad },
          },
          create: {
            codigoDepositoGeneral: sourceCajaItem.codigoDepositoGeneral,
            itemId: targetItemId,
            cantidad: sourceCajaItem.cantidad,
          },
        });

        await tx.cajaItem.delete({
          where: {
            codigoDepositoGeneral_itemId: {
              codigoDepositoGeneral: sourceCajaItem.codigoDepositoGeneral,
              itemId: sourceItemId,
            },
          },
        });
      }

      const targetMap = new Map(targetCodigosSIE.map(c => [`${c.codigo}:::${c.talla}`, c.itemCodigoSIEId]));

      for (const sourceCodigo of sourceCodigosSIE) {
        const key = `${sourceCodigo.codigo}:::${sourceCodigo.talla}`;
        const existingTargetId = targetMap.get(key);

        if (existingTargetId !== undefined) {
          const cajasAsociadas = await tx.cajaItemCodigoSIE.findMany({
            where: { itemCodigoSIEId: sourceCodigo.itemCodigoSIEId },
          });

          for (const c of cajasAsociadas) {
            const exists = await tx.cajaItemCodigoSIE.findUnique({
              where: {
                codigoDepositoGeneral_itemCodigoSIEId: {
                  codigoDepositoGeneral: c.codigoDepositoGeneral,
                  itemCodigoSIEId: existingTargetId,
                },
              },
            });
            if (!exists) {
              await tx.cajaItemCodigoSIE.create({
                data: {
                  codigoDepositoGeneral: c.codigoDepositoGeneral,
                  itemCodigoSIEId: existingTargetId,
                },
              });
            }
          }

          await tx.cajaItemCodigoSIE.deleteMany({
            where: { itemCodigoSIEId: sourceCodigo.itemCodigoSIEId },
          });
          await tx.itemCodigoSIE.delete({
            where: { itemCodigoSIEId: sourceCodigo.itemCodigoSIEId },
          });
        } else {
          await tx.itemCodigoSIE.update({
            where: { itemCodigoSIEId: sourceCodigo.itemCodigoSIEId },
            data: { itemId: targetItemId },
          });
        }
      }

      await tx.item.update({
        where: { itemId: targetItemId },
        data: { existenciaSie: { increment: sourceItem.existenciaSie } },
      });

      await tx.item.delete({
        where: { itemId: sourceItemId },
      });

      await applyItemOrder(tx, remainingIdsInSourceGroup);

      const unidadesRegistrosReasignadas = sourceMovimientoItems.reduce((total, entry) => total + entry.cantidad, 0);
      const unidadesStockReasignadas = sourceStockItems.reduce((total, entry) => total + entry.cantidad, 0);
      const registrosConsolidados = sourceMovimientoItems.filter((entry) =>
        movimientoTargetIds.has(entry.movimientoId.toString()),
      ).length;
      const stockConsolidados = sourceStockItems.filter((entry) => stockTargetIds.has(entry.stockOperacionId.toString())).length;

      return {
        sourceItem,
        targetItem,
        resumen: {
          totalRegistrosAfectados: sourceMovimientoItems.length,
          totalStockAfectados: sourceStockItems.length,
          totalMovimientosAfectados: sourceMovimientoItems.length + sourceStockItems.length,
          registrosConsolidados,
          stockConsolidados,
          unidadesRegistrosReasignadas,
          unidadesStockReasignadas,
          unidadesTotalesReasignadas: unidadesRegistrosReasignadas + unidadesStockReasignadas,
        },
      };
    }, { maxWait: 5_000, timeout: 20_000 });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: mergeResult.targetItem.itemId.toString(),
      detalle: {
        evento: "ITEM_UNIFICADO",
        itemOrigenId: mergeResult.sourceItem.itemId.toString(),
        itemOrigen: mergeResult.sourceItem.nombre,
        itemDestinoId: mergeResult.targetItem.itemId.toString(),
        itemDestino: mergeResult.targetItem.nombre,
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
      sourceItem: {
        equipoId: mergeResult.sourceItem.itemId.toString(),
        itemId: mergeResult.sourceItem.itemId.toString(),
        nombre: mergeResult.sourceItem.nombre,
      },
      targetItem: {
        equipoId: mergeResult.targetItem.itemId.toString(),
        itemId: mergeResult.targetItem.itemId.toString(),
        nombre: mergeResult.targetItem.nombre,
      },
      resumen: mergeResult.resumen,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo unificar el equipo." }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ItemPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  if (!nombre || !isValidOrder(body?.ordenPdf)) {
    return NextResponse.json(
      { error: "Payload invalido. 'nombre' es obligatorio y 'ordenPdf' debe ser entero positivo." },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: itemSelect,
      });

      const nextActive = body.activo === undefined ? existing.activo : Boolean(body.activo);
      const resolvedTipoEquipoId = await resolveTipoEquipoId(tx, body);
      const nextTipoEquipoId = body.tipo === undefined && !Object.prototype.hasOwnProperty.call(body, "tipoEquipoId")
        ? existing.tipoEquipoId
        : resolvedTipoEquipoId;
      if (typeof nextTipoEquipoId === "undefined") {
        throw new Error("Payload inválido. El tipo de equipo indicado no existe.");
      }
      if (nextActive !== existing.activo) {
        const oldGroupIds = await getOrderedItemIds(tx, existing.activo, itemId);

        await tx.item.update({
          where: { itemId },
          data: {
            nombre,
            tipoEquipoId: nextTipoEquipoId,
            activo: nextActive,
            ordenPdf: 1,
          },
        });

        await applyItemOrder(tx, oldGroupIds, existing.activo ? 0 : 10000);

        const newGroupIds = await getOrderedItemIds(tx, nextActive, itemId);
        const nextOrderedIds = insertItemAtOrder(newGroupIds, itemId, body.ordenPdf ?? newGroupIds.length + 1);
        await applyItemOrder(tx, nextOrderedIds, nextActive ? 0 : 10000);
      } else {
        const currentGroupIds = await getOrderedItemIds(tx, nextActive, itemId);
        const nextOrderedIds = insertItemAtOrder(currentGroupIds, itemId, body.ordenPdf ?? existing.ordenPdf);

        await tx.item.update({
          where: { itemId },
          data: {
            nombre,
            tipoEquipoId: nextTipoEquipoId,
            activo: nextActive,
            ordenPdf: 1,
          },
        });

        await applyItemOrder(tx, nextOrderedIds, nextActive ? 0 : 10000);
      }

      const updatedRecord = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: itemSelect,
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
    }, { maxWait: 5_000, timeout: 20_000 });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: updated.itemId.toString(),
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

    return NextResponse.json(serializeItem(updated));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo un administrador puede actualizar la existencia del SIE." }, { status: 403 });
  }

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ItemExistenciaSiePayload;
  const existenciaSie = parseExistenciaSie(body?.existenciaSie);
  if (existenciaSie === null) {
    return NextResponse.json(
      { error: "Payload invalido. 'existenciaSie' debe ser un entero mayor o igual a 0." },
      { status: 400 },
    );
  }

  try {
    const current = await prisma.item.findUnique({
      where: { itemId },
      select: { existenciaSie: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    const updated = await prisma.item.update({
      where: { itemId },
      data: { existenciaSie },
      select: {
        itemId: true,
        nombre: true,
        existenciaSie: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: updated.itemId.toString(),
      detalle: {
        evento: "ITEM_EXISTENCIA_SIE_UPDATE",
        previo: { existenciaSie: current.existenciaSie },
        nuevo: { existenciaSie: updated.existenciaSie },
      },
    });

    return NextResponse.json({
      equipoId: updated.itemId.toString(),
      itemId: updated.itemId.toString(),
      existenciaSie: updated.existenciaSie,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo actualizar la existencia del SIE." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  try {
    const deletionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          nombre: true,
          activo: true,
          ordenPdf: true,
          existenciaSie: true,
        },
      });

      const { impacto, affectedMovimientoIds, affectedStockOperacionIds } = await buildDeleteImpactData(
        tx,
        itemId,
        existing.nombre,
      );
      const remainingIds = await getOrderedItemIds(tx, existing.activo, itemId);

      // 1. Fetch related data for backup
      const cajaItems = await tx.cajaItem.findMany({
        where: { itemId },
      });

      const itemCodigosSIE = await tx.itemCodigoSIE.findMany({
        where: { itemId },
      });

      const itemCodigoSIEIds = itemCodigosSIE.map((c) => c.itemCodigoSIEId);
      const cajaItemCodigosSIE = itemCodigoSIEIds.length > 0
        ? await tx.cajaItemCodigoSIE.findMany({
            where: { itemCodigoSIEId: { in: itemCodigoSIEIds } },
          })
        : [];

      const movimientoItems = await tx.movimientoItem.findMany({
        where: { itemId },
      });

      const stockOperacionItems = await tx.stockOperacionItem.findMany({
        where: { itemId },
      });

      // Determine which Movimiento records will become empty and therefore be deleted
      const emptyMovimientoIds = [];
      for (const movId of affectedMovimientoIds) {
        const count = await tx.movimientoItem.count({
          where: { movimientoId: movId },
        });
        const countThisItem = movimientoItems.filter((mi) => mi.movimientoId === movId).length;
        if (count === countThisItem) {
          emptyMovimientoIds.push(movId);
        }
      }

      const deletedMovimientos = emptyMovimientoIds.length > 0
        ? await tx.movimiento.findMany({
            where: { movimientoId: { in: emptyMovimientoIds } },
          })
        : [];

      const deletedMovimientoDestinatariosPersonal = emptyMovimientoIds.length > 0
        ? await tx.movimientoDestinatarioPersonal.findMany({
            where: { movimientoId: { in: emptyMovimientoIds } },
          })
        : [];

      const deletedMovimientoDestinatariosExterno = emptyMovimientoIds.length > 0
        ? await tx.movimientoDestinatarioExterno.findMany({
            where: { movimientoId: { in: emptyMovimientoIds } },
          })
        : [];

      const deletedPrestamosActivos = emptyMovimientoIds.length > 0
        ? await tx.prestamoActivo.findMany({
            where: { movimientoId: { in: emptyMovimientoIds } },
          })
        : [];

      const deletedPrestamosHistoriales = emptyMovimientoIds.length > 0
        ? await tx.prestamoHistorial.findMany({
            where: { movimientoId: { in: emptyMovimientoIds } },
          })
        : [];

      // Determine which StockOperacion records will become empty
      const emptyStockOperacionIds = [];
      for (const stockOpId of affectedStockOperacionIds) {
        const count = await tx.stockOperacionItem.count({
          where: { stockOperacionId: stockOpId },
        });
        const countThisItem = stockOperacionItems.filter((soi) => soi.stockOperacionId === stockOpId).length;
        if (count === countThisItem) {
          emptyStockOperacionIds.push(stockOpId);
        }
      }

      const deletedStockOperaciones = emptyStockOperacionIds.length > 0
        ? await tx.stockOperacion.findMany({
            where: { stockOperacionId: { in: emptyStockOperacionIds } },
          })
        : [];

      // Construct JSON payload converting bigints to strings
      const payload = JSON.parse(
        JSON.stringify(
          {
            item: existing,
            cajaItems,
            itemCodigosSIE,
            cajaItemCodigosSIE,
            movimientoItems,
            stockOperacionItems,
            deletedMovimientos,
            deletedMovimientoDestinatariosPersonal,
            deletedMovimientoDestinatariosExterno,
            deletedPrestamosActivos,
            deletedPrestamosHistoriales,
            deletedStockOperaciones,
          },
          (key, value) => (typeof value === "bigint" ? value.toString() : value)
        )
      );

      // Create PapeleraRegistro
      await tx.papeleraRegistro.create({
        data: {
          tipo: "ITEM",
          nombre: existing.nombre,
          originalId: String(existing.itemId),
          payload,
        },
      });

      // 2. Perform active database deletions
      await tx.movimientoItem.deleteMany({
        where: { itemId },
      });
      await tx.stockOperacionItem.deleteMany({
        where: { itemId },
      });
      await tx.cajaItemCodigoSIE.deleteMany({
        where: { itemCodigoSIE: { itemId } },
      });
      await tx.itemCodigoSIE.deleteMany({
        where: { itemId },
      });
      await tx.cajaItem.deleteMany({
        where: { itemId },
      });

      if (affectedMovimientoIds.length > 0) {
        await tx.movimiento.deleteMany({
          where: {
            movimientoId: { in: affectedMovimientoIds },
            items: { none: {} },
          },
        });
      }

      if (affectedStockOperacionIds.length > 0) {
        await tx.stockOperacion.deleteMany({
          where: {
            stockOperacionId: { in: affectedStockOperacionIds },
            items: { none: {} },
          },
        });
      }

      const removed = await tx.item.delete({
        where: { itemId },
      });

      await applyItemOrder(tx, remainingIds);

      return {
        removed,
        impacto,
      };
    }, { maxWait: 5_000, timeout: 20_000 });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ITEM",
      entidadId: deletionResult.removed.itemId.toString(),
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
      if (code === "P2025") return NextResponse.json({ error: "Equipo no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
