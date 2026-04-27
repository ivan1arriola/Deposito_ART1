import type { Prisma, TipoPersonal } from "@/generated/prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import type { PrestamoStockEntry } from "@/types/views";

export type PrestamoActuanteByMovimientoId = Map<string, { ci: string; label: string }>;

export const prestamoInclude = {
  personal: {
    include: {
      rango: {
        select: {
          tipo: true,
          abreviacion: true,
          nombreCompleto: true,
        },
      },
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
  items: {
    include: {
      item: {
        select: {
          itemId: true,
          nombre: true,
          ordenPdf: true,
        },
      },
    },
    orderBy: {
      item: {
        ordenPdf: "asc",
      },
    },
  },
} satisfies Prisma.MovimientoInclude;

export type PrestamoWithRelations = Prisma.MovimientoGetPayload<{
  include: typeof prestamoInclude;
}>;

function formatUserLabel(user: {
  rango: { abreviacion: string };
  apellido: string;
  nombre: string;
  username: string;
}) {
  return `${user.rango.abreviacion} ${user.apellido}, ${user.nombre}`.replace(/\s+/g, " ").trim() || user.username;
}

function mapDestinatarioTipo(tipo: TipoPersonal) {
  if (tipo === "SUBALTERNO") return "PERSONAL";
  if (tipo === "OFICIAL") return "OFICIAL";
  return "SUBOFICIAL";
}

export function formatPrestamoDestinatario(data: Pick<PrestamoWithRelations, "personal">) {
  const apellidos = `${data.personal.apellido1} ${data.personal.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
  const nombres = `${data.personal.nombre1} ${data.personal.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
  const etiqueta = `${data.personal.rango.abreviacion} ${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
  return {
    ci: data.personal.ci,
    nombre: `${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim(),
    etiqueta,
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
    destinatarioTipo: mapDestinatarioTipo(prestamo.personal.rango.tipo),
    destinatarioCi: destinatario.ci,
    destinatarioNombre: destinatario.nombre,
    destinatarioEtiqueta: destinatario.etiqueta,
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
    items: prestamo.items.map((item) => ({
      itemId: item.item.itemId.toString(),
      nombre: item.item.nombre,
      cantidad: item.cantidad,
      estadoEntrega: item.estadoEntrega,
      comentarioEntrega: item.comentarioEntrega,
      estadoDevolucion: item.estadoDevolucion,
      comentarioDevolucion: item.comentarioDevolucion,
    })),
  };
}

export function totalUnidadesPrestamo(prestamo: Pick<PrestamoWithRelations, "items">) {
  return prestamo.items.reduce((acumulado, item) => acumulado + item.cantidad, 0);
}
