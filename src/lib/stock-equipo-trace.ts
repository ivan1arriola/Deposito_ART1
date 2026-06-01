import { TipoMovimiento, type Prisma } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { buildPersonalDestinatarioEtiqueta, resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { prisma } from "@/lib/prisma";
import type { StockEquipoTraceData } from "@/types/views";

type PrismaItemTraceLike = Pick<Prisma.TransactionClient, "equipo" | "movimientoEquipo" | "prestamoActivo">;

export function parseStockTraceItemId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

export function parseStockTraceColumn(value: unknown): "SUBALTERNOS" | "PRESTAMO" | "RECINTO" | null {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "SUBALTERNOS") return "SUBALTERNOS";
  if (raw === "PRESTAMO") return "PRESTAMO";
  if (raw === "RECINTO") return "RECINTO";
  return null;
}

export function hasStockItemTraceDelegates(client: unknown = prisma) {
  const candidate = client as PrismaItemTraceLike & {
    equipo?: unknown;
    movimientoEquipo?: unknown;
    prestamoActivo?: unknown;
  };
  return (
    typeof candidate.equipo !== "undefined" &&
    typeof candidate.movimientoEquipo !== "undefined" &&
    typeof candidate.prestamoActivo !== "undefined"
  );
}

export async function buildStockEquipoTraceData(equipoId: bigint, client: PrismaItemTraceLike = prisma) {
  const equipo = await client.equipo.findUnique({
    where: { equipoId },
    select: {
      equipoId: true,
      nombre: true,
    },
  });
  if (!equipo) return null;

  const [movimientoEquipos, prestamosActivos] = await Promise.all([
    client.movimientoEquipo.findMany({
      where: {
        equipoId,
        movimiento: {
          tipo: {
            in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION, TipoMovimiento.ASIGNACION],
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
                        tipo: true,
                        nombreCompleto: true,
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
            destinatarioRecinto: {
              select: {
                clase: true,
                nombre: true,
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
          equipos: {
            some: {
              equipoId,
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
                        tipo: true,
                        abreviacion: true,
                        nombreCompleto: true,
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
            equipos: {
              where: {
                equipoId,
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
      movimientos: StockEquipoTraceData["subalternos"][number]["movimientos"];
    }
  >();
  for (const movimientoEquipo of movimientoEquipos) {
    const tipoMovimiento = movimientoEquipo.movimiento.tipo;
    if (tipoMovimiento !== TipoMovimiento.ENTREGA && tipoMovimiento !== TipoMovimiento.DEVOLUCION) continue;
    const personal = movimientoEquipo.movimiento.destinatarioPersonal?.personal;
    if (!personal) continue;
    const ci = personal.ci;
    const delta = tipoMovimiento === TipoMovimiento.ENTREGA ? movimientoEquipo.cantidad : -movimientoEquipo.cantidad;
    const existing = subalternosByCi.get(ci);
    if (existing) {
      existing.cantidadNeta += delta;
      existing.movimientos.push({
        movimientoId: movimientoEquipo.movimiento.movimientoId.toString(),
        tipo: tipoMovimiento,
        fecha: formatDateOnlyFromDate(movimientoEquipo.movimiento.fecha) ?? "",
        cantidad: movimientoEquipo.cantidad,
        delta,
        observaciones: movimientoEquipo.movimiento.observaciones ?? null,
      });
      continue;
    }
    subalternosByCi.set(ci, {
      ci,
      persona: buildPersonalDestinatarioEtiqueta(personal),
      bateria: personal.bateria?.nombre ?? null,
      tipoPersonal: personal.rango.tipo,
      cantidadNeta: delta,
      movimientos: [
        {
          movimientoId: movimientoEquipo.movimiento.movimientoId.toString(),
          tipo: tipoMovimiento,
          fecha: formatDateOnlyFromDate(movimientoEquipo.movimiento.fecha) ?? "",
          cantidad: movimientoEquipo.cantidad,
          delta,
          observaciones: movimientoEquipo.movimiento.observaciones ?? null,
        },
      ],
    });
  }

  const recintosByNombre = new Map<
    string,
    {
      recintoNombre: string;
      cantidadNeta: number;
      movimientos: StockEquipoTraceData["recintos"][number]["movimientos"];
    }
  >();

  for (const movimientoEquipo of movimientoEquipos) {
    const tipoMovimiento = movimientoEquipo.movimiento.tipo;
    if (tipoMovimiento !== TipoMovimiento.ASIGNACION) continue;
    const recinto = movimientoEquipo.movimiento.destinatarioRecinto;
    const personal = movimientoEquipo.movimiento.destinatarioPersonal?.personal;
    const externo = movimientoEquipo.movimiento.destinatarioExterno?.personaExterna;
    
    let nombre = "Asignación sin destinatario";
    if (recinto) {
      nombre = recinto.nombre;
    } else if (personal) {
      nombre = buildPersonalDestinatarioEtiqueta(personal);
    } else if (externo) {
      nombre = `${externo.grado} ${externo.apellido}, ${externo.nombre} (${externo.unidadDestino})`;
    }

    const delta = movimientoEquipo.cantidad; // Asignación implies equipos moved to the recinto, assuming positive for trace. Wait, stockAsignacion = SUM(mi.cantidad), so it's a positive delta.
    const existing = recintosByNombre.get(nombre);
    if (existing) {
      existing.cantidadNeta += delta;
      existing.movimientos.push({
        movimientoId: movimientoEquipo.movimiento.movimientoId.toString(),
        fecha: formatDateOnlyFromDate(movimientoEquipo.movimiento.fecha) ?? "",
        cantidad: movimientoEquipo.cantidad,
        delta,
        observaciones: movimientoEquipo.movimiento.observaciones ?? null,
      });
      continue;
    }
    recintosByNombre.set(nombre, {
      recintoNombre: nombre,
      cantidadNeta: delta,
      movimientos: [
        {
          movimientoId: movimientoEquipo.movimiento.movimientoId.toString(),
          fecha: formatDateOnlyFromDate(movimientoEquipo.movimiento.fecha) ?? "",
          cantidad: movimientoEquipo.cantidad,
          delta,
          observaciones: movimientoEquipo.movimiento.observaciones ?? null,
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

  const recintos = Array.from(recintosByNombre.values())
    .filter((entry) => entry.cantidadNeta !== 0)
    .sort((a, b) => {
      if (b.cantidadNeta !== a.cantidadNeta) return b.cantidadNeta - a.cantidadNeta;
      return a.recintoNombre.localeCompare(b.recintoNombre, "es", { sensitivity: "base" });
    })
    .map((entry) => ({
      ...entry,
      movimientos: entry.movimientos.slice().sort((a, b) => {
        const fechaDiff = b.fecha.localeCompare(a.fecha);
        if (fechaDiff !== 0) return fechaDiff;
        const movimientoA = BigInt(a.movimientoId);
        const movimientoB = BigInt(b.movimientoId);
        if (movimientoA === movimientoB) return 0;
        return movimientoB > movimientoA ? 1 : -1;
      }),
    }));

  const prestamos: StockEquipoTraceData["prestamos"] = prestamosActivos
    .map((prestamo) => {
      const destinatario = resolveDestinatarioMovimiento(prestamo.movimiento);
      return {
        prestamoId: prestamo.movimientoId.toString(),
        reciboNumero: prestamo.reciboNumero,
        clasePrestamo: (destinatario?.clase ?? "PENDIENTE") as "INTERNO" | "EXTERNO" | "PENDIENTE",
        estado: (prestamo.estado === "DEVUELTO" ? "DEVUELTO" : "PENDIENTE") as "PENDIENTE" | "DEVUELTO",
        fechaPrestamo: formatDateOnlyFromDate(prestamo.movimiento.fecha) ?? "",
        destinatarioCi: destinatario?.ci ?? null,
        perfilCi: destinatario?.perfilCi ?? null,
        destinatarioEtiqueta: destinatario?.etiqueta ?? "Destinatario pendiente",
        destinatarioUnidadDestino: destinatario?.unidadDestino ?? null,
        observaciones: prestamo.movimiento.observaciones ?? null,
        cantidad: prestamo.movimiento.equipos.reduce((total, itemMovimiento) => total + itemMovimiento.cantidad, 0),
        movimientoId: prestamo.movimiento.movimientoId.toString(),
      };
    })
    .filter((prestamo) => prestamo.cantidad !== 0)
    .sort((a, b) => {
      const fechaDiff = b.fechaPrestamo.localeCompare(a.fechaPrestamo);
      if (fechaDiff !== 0) return fechaDiff;
      const prestamoA = BigInt(a.prestamoId);
      const prestamoB = BigInt(b.prestamoId);
      if (prestamoA === prestamoB) return 0;
      return prestamoB > prestamoA ? 1 : -1;
    });

  const payload: StockEquipoTraceData = {
    equipoId: equipo.equipoId.toString(),
    itemNombre: equipo.nombre,
    totals: {
      subalternos: subalternos.reduce((total, entry) => total + entry.cantidadNeta, 0),
      prestamo: prestamos.reduce((total, entry) => total + entry.cantidad, 0),
      recinto: recintos.reduce((total, entry) => total + entry.cantidadNeta, 0),
    },
    subalternos,
    recintos,
    prestamos,
  };

  return payload;
}
