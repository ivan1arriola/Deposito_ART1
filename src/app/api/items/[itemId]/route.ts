import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { applyItemOrder, getOrderedItemIds, insertItemAtOrder } from "@/lib/item-ordering";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";

type ItemPayload = {
  nombre: string;
  activo?: boolean;
  ordenPdf?: number;
};

type ItemMergePayload = {
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

function serializeItem(item: {
  itemId: bigint;
  nombre: string;
  activo: boolean;
  ordenPdf: number;
}) {
  return {
    itemId: item.itemId.toString(),
    nombre: item.nombre,
    activo: item.activo,
    ordenPdf: item.ordenPdf,
  };
}

type DeleteImpactData = {
  impacto: {
    item: {
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
            personalCi: true,
            personal: {
              select: {
                apellido1: true,
                apellido2: true,
                nombre1: true,
                nombre2: true,
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
        select: { codigoSIE: true },
      },
    },
    orderBy: [{ codigoDepositoGeneral: "asc" }],
  });

  const normalizedRegistros = movimientos
    .map((movimiento) => {
      const persona = [
        movimiento.personal.apellido1,
        movimiento.personal.apellido2,
        movimiento.personal.nombre1,
        movimiento.personal.nombre2,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      return {
        movimientoId: movimiento.movimientoId.toString(),
        fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
        tipo: movimiento.tipo,
        ci: movimiento.personalCi,
        persona,
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
      new Set(caja.codigosSIE.map((codigo) => codigo.codigoSIE)),
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
};

export async function GET(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  try {
    const item = await prisma.item.findUniqueOrThrow({
      where: { itemId },
      select: { itemId: true, nombre: true },
    });
    const { impacto } = await buildDeleteImpactData(prisma, itemId, item.nombre);
    return NextResponse.json(impacto);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
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
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  const body = (await req.json()) as ItemMergePayload;
  const targetItemIdRaw = body?.targetItemId;
  if (typeof targetItemIdRaw !== "string" && typeof targetItemIdRaw !== "number") {
    return NextResponse.json({ error: "Payload invalido. targetItemId es obligatorio." }, { status: 400 });
  }

  const targetItemId = parseItemId(String(targetItemIdRaw));
  if (targetItemId === null) {
    return NextResponse.json({ error: "targetItemId invalido." }, { status: 400 });
  }

  if (targetItemId === sourceItemId) {
    return NextResponse.json({ error: "Debes seleccionar dos equipos distintos para unificar." }, { status: 400 });
  }

  try {
    const mergeResult = await prisma.$transaction(async (tx) => {
      const [sourceItem, targetItem] = await Promise.all([
        tx.item.findUniqueOrThrow({
          where: { itemId: sourceItemId },
          select: { itemId: true, nombre: true, activo: true },
        }),
        tx.item.findUniqueOrThrow({
          where: { itemId: targetItemId },
          select: { itemId: true, nombre: true, activo: true },
        }),
      ]);

      const remainingIdsInSourceGroup = await getOrderedItemIds(tx, sourceItem.activo, sourceItemId);

      const [sourceMovimientoItems, sourceStockItems] = await Promise.all([
        tx.movimientoItem.findMany({
          where: { itemId: sourceItemId },
          select: { movimientoId: true, cantidad: true },
        }),
        tx.stockOperacionItem.findMany({
          where: { itemId: sourceItemId },
          select: { stockOperacionId: true, cantidad: true },
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
    });

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
        itemId: mergeResult.sourceItem.itemId.toString(),
        nombre: mergeResult.sourceItem.nombre,
      },
      targetItem: {
        itemId: mergeResult.targetItem.itemId.toString(),
        nombre: mergeResult.targetItem.nombre,
      },
      resumen: mergeResult.resumen,
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
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
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
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
        select: {
          itemId: true,
          activo: true,
          ordenPdf: true,
        },
      });

      const nextActive = body.activo === undefined ? existing.activo : Boolean(body.activo);
      if (nextActive !== existing.activo) {
        const oldGroupIds = await getOrderedItemIds(tx, existing.activo, itemId);

        await tx.item.update({
          where: { itemId },
          data: {
            nombre,
            activo: nextActive,
            ordenPdf: 1,
          },
        });

        await applyItemOrder(tx, oldGroupIds);

        const newGroupIds = await getOrderedItemIds(tx, nextActive, itemId);
        const nextOrderedIds = insertItemAtOrder(newGroupIds, itemId, body.ordenPdf ?? newGroupIds.length + 1);
        await applyItemOrder(tx, nextOrderedIds);
      } else {
        const currentGroupIds = await getOrderedItemIds(tx, nextActive, itemId);
        const nextOrderedIds = insertItemAtOrder(currentGroupIds, itemId, body.ordenPdf ?? existing.ordenPdf);

        await tx.item.update({
          where: { itemId },
          data: {
            nombre,
            activo: nextActive,
            ordenPdf: 1,
          },
        });

        await applyItemOrder(tx, nextOrderedIds);
      }

      return tx.item.findUniqueOrThrow({
        where: { itemId },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "ITEM",
      entidadId: updated.itemId.toString(),
      detalle: {
        nombre: updated.nombre,
        activo: updated.activo,
        ordenPdf: updated.ordenPdf,
      },
    });

    return NextResponse.json(serializeItem(updated));
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
      if (code === "P2002") return NextResponse.json({ error: "El nombre ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo actualizar el equipo." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { itemId: itemIdParam } = await context.params;
  const itemId = parseItemId(itemIdParam);
  if (itemId === null) {
    return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
  }

  try {
    const deletionResult = await prisma.$transaction(async (tx) => {
      const existing = await tx.item.findUniqueOrThrow({
        where: { itemId },
        select: {
          itemId: true,
          nombre: true,
          activo: true,
        },
      });

      const { impacto, affectedMovimientoIds, affectedStockOperacionIds } = await buildDeleteImpactData(
        tx,
        itemId,
        existing.nombre,
      );
      const remainingIds = await getOrderedItemIds(tx, existing.activo, itemId);

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
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "ITEM",
      entidadId: deletionResult.removed.itemId.toString(),
      detalle: {
        nombre: deletionResult.removed.nombre,
        impacto: deletionResult.impacto.resumen,
        advertencia:
          "Accion destructiva. Se elimino el equipo junto a sus codigos SIE, apariciones en cajas y movimientos vacios relacionados.",
      },
    });

    return NextResponse.json({ ok: true, impacto: deletionResult.impacto.resumen });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Item no encontrado." }, { status: 404 });
    }

    return NextResponse.json({ error: "No se pudo eliminar el equipo." }, { status: 500 });
  }
}
