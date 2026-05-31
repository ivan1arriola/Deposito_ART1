import type { Prisma } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import type { PrestamoStockEntry } from "@/types/views";

export type PrestamoActuanteByMovimientoId = Map<string, { ci: string; label: string }>;

export const prestamoInclude = {
  destinatarioPersonal: {
    include: {
      personal: {
        include: {
          rango: {
            select: {
              tipo: true,
              abreviacion: true,
              nombreCompleto: true,
              orden: true,
            },
          },
          bateria: {
                            select: {
                              nombre: true,
                              orden: true,
                            },
                          },
        },
      },
    },
  },
  destinatarioExterno: {
    include: {
      personaExterna: true,
    },
  },
  usuarioEntrega: {
    select: {
      usuarioId: true,
      rango: {
        select: {
          abreviacion: true,
        },
      },
      apellido: true,
      nombre: true,
      username: true,
    },
  },
  prestamoActivo: {
    select: {
      reciboNumero: true,
      estado: true,
      fechaEstimadaDevolucionTexto: true,
    },
  },
  prestamoHistorial: {
    select: {
      reciboNumero: true,
      estado: true,
      fechaDevolucion: true,
      fechaEstimadaDevolucionTexto: true,
      createdAt: true,
      usuarioRecibeDevolucionId: true,
      usuarioRecibeDevolucion: {
        select: {
          usuarioId: true,
          rango: {
            select: {
              abreviacion: true,
            },
          },
          apellido: true,
          nombre: true,
          username: true,
        },
      },
    },
  },
  equipos: {
    include: {
      equipo: {
        select: {
          equipoId: true,
          nombre: true,
          ordenPdf: true,
        },
      },
    },
    orderBy: {
      equipo: {
        ordenPdf: "asc",
      },
    },
  },
} satisfies Prisma.MovimientoInclude;

export type PrestamoWithRelations = Prisma.MovimientoGetPayload<{
  include: typeof prestamoInclude;
}>;

type PrestamoDestinatarioResumen = {
  clase: "INTERNO" | "EXTERNO" | "PENDIENTE";
  tipo: "PERSONAL" | "OFICIAL" | "SUBOFICIAL" | "EXTERNO" | null;
  ci: string | null;
  perfilCi: string | null;
  nombre: string;
  etiqueta: string;
  grado: string | null;
  gradoAbreviacion: string | null;
  gradoOrden: number | null;
  unidadDestino: string | null;
  bateria: string | null;
};

function formatUserLabel(user: {
  rango: { abreviacion: string };
  apellido: string;
  nombre: string;
  username: string;
}) {
  return `${user.rango.abreviacion} ${user.apellido}, ${user.nombre}`.replace(/\s+/g, " ").trim() || user.username;
}

export function formatPrestamoDestinatario(
  data: Pick<PrestamoWithRelations, "destinatarioPersonal" | "destinatarioExterno">,
): PrestamoDestinatarioResumen {
  const destinatario = resolveDestinatarioMovimiento(data);
  if (destinatario && destinatario.tipo !== "RECINTO") {
    return {
      clase: destinatario.clase,
      tipo: destinatario.tipo,
      ci: destinatario.ci,
      perfilCi: destinatario.perfilCi,
      nombre: destinatario.nombre,
      etiqueta: destinatario.etiqueta,
      grado: destinatario.grado,
      gradoAbreviacion: destinatario.gradoAbreviacion,
      gradoOrden: destinatario.gradoOrden,
      unidadDestino: destinatario.unidadDestino,
      bateria: destinatario.bateria,
    };
  }
  return {
    clase: "PENDIENTE" as const,
    tipo: null,
    ci: null,
    perfilCi: null,
    nombre: "Pendiente de completar",
    etiqueta: "Destinatario pendiente",
    grado: null,
    gradoAbreviacion: null,
    gradoOrden: null,
    unidadDestino: null,
    bateria: null,
  };
}

export function serializePrestamo(prestamo: PrestamoWithRelations): PrestamoStockEntry {
  return serializePrestamoWithActuante(prestamo, undefined);
}

export function serializePrestamoWithActuante(
  prestamo: PrestamoWithRelations,
  actuanteByMovimientoId?: PrestamoActuanteByMovimientoId,
): PrestamoStockEntry {
  const destinatario = formatPrestamoDestinatario(prestamo);
  const estado = prestamo.prestamoHistorial ? "DEVUELTO" : "PENDIENTE";
  const reciboNumero =
    prestamo.prestamoHistorial?.reciboNumero ??
    prestamo.prestamoActivo?.reciboNumero ??
    `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`;
  const actuante = actuanteByMovimientoId?.get(prestamo.movimientoId.toString()) ?? null;

  return {
    prestamoId: prestamo.movimientoId.toString(),
    reciboNumero,
    clasePrestamo: destinatario.clase,
    destinatarioTipo: destinatario.tipo,
    destinatarioCi: destinatario.ci,
    perfilCi: destinatario.perfilCi,
    destinatarioNombre: destinatario.nombre,
    destinatarioEtiqueta: destinatario.etiqueta,
    destinatarioGrado: destinatario.grado,
    destinatarioUnidadDestino: destinatario.unidadDestino,
    usuarioEntregaId: prestamo.usuarioEntregaId,
    usuarioEntregaNombre: formatUserLabel(prestamo.usuarioEntrega),
    actuanteCi: actuante?.ci ?? null,
    actuanteNombre: actuante?.label ?? null,
    fechaPrestamo: formatDateOnlyFromDate(prestamo.fecha) ?? "",
    fechaEstimadaDevolucionTexto:
      prestamo.prestamoHistorial?.fechaEstimadaDevolucionTexto ??
      prestamo.prestamoActivo?.fechaEstimadaDevolucionTexto ??
      null,
    fechaDevolucion: formatDateOnlyFromDate(prestamo.prestamoHistorial?.fechaDevolucion),
    usuarioRecibeDevolucionId: prestamo.prestamoHistorial?.usuarioRecibeDevolucionId ?? null,
    usuarioRecibeDevolucionNombre: prestamo.prestamoHistorial?.usuarioRecibeDevolucion
      ? formatUserLabel(prestamo.prestamoHistorial.usuarioRecibeDevolucion)
      : null,
    comentarios: prestamo.observaciones,
    estado,
    equipos: prestamo.equipos.map((equipo) => ({
      equipoId: equipo.equipo.equipoId.toString(),
      nombre: equipo.equipo.nombre,
      cantidad: equipo.cantidad,
      estadoEntrega: equipo.estadoEntrega,
      comentarioEntrega: equipo.comentarioEntrega,
      estadoDevolucion: equipo.estadoDevolucion,
      comentarioDevolucion: equipo.comentarioDevolucion,
    })),
  };
}

export function totalUnidadesPrestamo(prestamo: Pick<PrestamoWithRelations, "equipos">) {
  return prestamo.equipos.reduce((acumulado, equipo) => acumulado + equipo.cantidad, 0);
}
