import { TipoMovimiento, type Prisma } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import type { StockItemTraceData } from "@/types/views";

type PrismaItemTraceLike = Pick<Prisma.TransactionClient, "item" | "movimientoItem" | "prestamoActivo">;

export function parseStockTraceItemId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

export function parseStockTraceColumn(value: unknown): "SUBALTERNOS" | "PRESTAMO" | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "SUBALTERNOS") return "SUBALTERNOS";
  if (raw === "PRESTAMO") return "PRESTAMO";
  return null;
}

export function hasStockItemTraceDelegates(client: unknown = prisma) {
  const candidate = client as PrismaItemTraceLike & {
    item?: unknown;
    movimientoItem?: unknown;
    prestamoActivo?: unknown;
  };
  return (
    typeof candidate.item !== "undefined" &&
    typeof candidate.movimientoItem !== "undefined" &&
    typeof candidate.prestamoActivo !== "undefined"
  );
}

function buildPersonalLabel(personal: {
  rango: { abreviacion: string; tipo: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL" };
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
}) {
  const apellidos = `${personal.apellido1} ${personal.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
  const nombres = `${personal.nombre1} ${personal.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
  return `${personal.rango.abreviacion} ${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
}

export async function buildStockItemTraceData(itemId: bigint, client: PrismaItemTraceLike = prisma) {
  const item = await client.item.findUnique({
    where: { itemId },
    select: {
      itemId: true,
      nombre: true,
    },
  });
  if (!item) return null;

  const [movimientoItems, prestamosActivos] = await Promise.all([
    client.movimientoItem.findMany({
      where: {
        itemId,
        movimiento: {
          tipo: {
            in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION],
          },
        },
      },
      include: {
        movimiento: {
          select: {
            movimientoId: true,
            tipo: true,
            fecha: true,
            observaciones: true,
            createdAt: true,
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
      },
      orderBy: [
        { movimiento: { fecha: "desc" } },
        { movimiento: { createdAt: "desc" } },
      ],
    }),
    client.prestamoActivo.findMany({
      where: {
        movimiento: {
          items: {
            some: {
              itemId,
            },
          },
        },
      },
      select: {
        movimientoId: true,
        reciboNumero: true,
        estado: true,
        movimiento: {
          select: {
            movimientoId: true,
            fecha: true,
            observaciones: true,
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
                    tipo: true,
                  },
                },
              },
            },
            items: {
              where: {
                itemId,
              },
              select: {
                cantidad: true,
              },
            },
          },
        },
      },
      orderBy: [
        { movimiento: { fecha: "desc" } },
        { createdAt: "desc" },
      ],
    }),
  ]);

  const subalternosByCi = new Map<
    string,
    {
      ci: string;
      persona: string;
      bateria: string | null;
      tipoPersonal: "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
      cantidadNeta: number;
      movimientos: StockItemTraceData["subalternos"][number]["movimientos"];
    }
  >();
  for (const movimientoItem of movimientoItems) {
    const tipoMovimiento = movimientoItem.movimiento.tipo;
    if (tipoMovimiento !== TipoMovimiento.ENTREGA && tipoMovimiento !== TipoMovimiento.DEVOLUCION) continue;
    const ci = movimientoItem.movimiento.personal.ci;
    const delta = tipoMovimiento === TipoMovimiento.ENTREGA ? movimientoItem.cantidad : -movimientoItem.cantidad;
    const existing = subalternosByCi.get(ci);
    if (existing) {
      existing.cantidadNeta += delta;
      existing.movimientos.push({
        movimientoId: movimientoItem.movimiento.movimientoId.toString(),
        tipo: tipoMovimiento,
        fecha: formatDateOnlyFromDate(movimientoItem.movimiento.fecha) ?? "",
        cantidad: movimientoItem.cantidad,
        delta,
        observaciones: movimientoItem.movimiento.observaciones ?? null,
      });
      continue;
    }
    subalternosByCi.set(ci, {
      ci,
      persona: buildPersonalLabel(movimientoItem.movimiento.personal),
      bateria: movimientoItem.movimiento.personal.subalterno?.bateria?.nombre ?? null,
      tipoPersonal: movimientoItem.movimiento.personal.rango.tipo,
      cantidadNeta: delta,
      movimientos: [
        {
          movimientoId: movimientoItem.movimiento.movimientoId.toString(),
          tipo: tipoMovimiento,
          fecha: formatDateOnlyFromDate(movimientoItem.movimiento.fecha) ?? "",
          cantidad: movimientoItem.cantidad,
          delta,
          observaciones: movimientoItem.movimiento.observaciones ?? null,
        },
      ],
    });
  }

  const subalternos = Array.from(subalternosByCi.values())
    .filter((entry) => entry.cantidadNeta !== 0)
    .sort((a, b) => {
      if (b.cantidadNeta !== a.cantidadNeta) return b.cantidadNeta - a.cantidadNeta;
      return a.persona.localeCompare(b.persona, "es", { sensitivity: "base" });
    })
    .map((entry) => ({
      ci: entry.ci,
      persona: entry.persona,
      bateria: entry.bateria,
      tipoPersonal: entry.tipoPersonal,
      cantidadNeta: entry.cantidadNeta,
      movimientos: entry.movimientos
        .slice()
        .sort((a, b) => {
          const fechaDiff = b.fecha.localeCompare(a.fecha);
          if (fechaDiff !== 0) return fechaDiff;
          const movimientoA = BigInt(a.movimientoId);
          const movimientoB = BigInt(b.movimientoId);
          if (movimientoA === movimientoB) return 0;
          return movimientoB > movimientoA ? 1 : -1;
        }),
    }));

  const prestamos = prestamosActivos
    .map((prestamo) => ({
      prestamoId: prestamo.movimientoId.toString(),
      reciboNumero: prestamo.reciboNumero,
      estado: prestamo.estado,
      fechaPrestamo: formatDateOnlyFromDate(prestamo.movimiento.fecha) ?? "",
      destinatarioCi: prestamo.movimiento.personal.ci,
      destinatarioEtiqueta: buildPersonalLabel(prestamo.movimiento.personal),
      observaciones: prestamo.movimiento.observaciones ?? null,
      cantidad: prestamo.movimiento.items.reduce((total, itemMovimiento) => total + itemMovimiento.cantidad, 0),
      movimientoId: prestamo.movimiento.movimientoId.toString(),
    }))
    .filter((prestamo) => prestamo.cantidad !== 0)
    .sort((a, b) => {
      const fechaDiff = b.fechaPrestamo.localeCompare(a.fechaPrestamo);
      if (fechaDiff !== 0) return fechaDiff;
      const prestamoA = BigInt(a.prestamoId);
      const prestamoB = BigInt(b.prestamoId);
      if (prestamoA === prestamoB) return 0;
      return prestamoB > prestamoA ? 1 : -1;
    });

  const payload: StockItemTraceData = {
    itemId: item.itemId.toString(),
    itemNombre: item.nombre,
    totals: {
      subalternos: subalternos.reduce((total, entry) => total + entry.cantidadNeta, 0),
      prestamo: prestamos.reduce((total, entry) => total + entry.cantidad, 0),
    },
    subalternos,
    prestamos,
  };

  return payload;
}
