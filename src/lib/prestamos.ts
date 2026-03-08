import type { Prisma, TipoPersonal } from "@prisma/client";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import type { PrestamoStockEntry } from "@/types/views";

export const prestamoInclude = {
  personal: {
    include: {
      rango: {
        select: {
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
    },
  },
  prestamoHistorial: {
    select: {
      reciboNumero: true,
      estado: true,
      fechaDevolucion: true,
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
  const destinatario = formatPrestamoDestinatario(prestamo);
  const estado = prestamo.prestamoHistorial ? "DEVUELTO" : "PENDIENTE";
  const reciboNumero =
    prestamo.prestamoHistorial?.reciboNumero ??
    prestamo.prestamoActivo?.reciboNumero ??
    `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`;

  return {
    prestamoId: prestamo.movimientoId.toString(),
    reciboNumero,
    destinatarioTipo: mapDestinatarioTipo(prestamo.personal.tipo),
    destinatarioCi: destinatario.ci,
    destinatarioNombre: destinatario.nombre,
    destinatarioEtiqueta: destinatario.etiqueta,
    usuarioEntregaId: prestamo.usuarioEntregaId,
    usuarioEntregaNombre: formatUserLabel(prestamo.usuarioEntrega),
    fechaPrestamo: formatDateOnlyFromDate(prestamo.fecha) ?? "",
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
    })),
  };
}

export function totalUnidadesPrestamo(prestamo: Pick<PrestamoWithRelations, "items">) {
  return prestamo.items.reduce((acumulado, item) => acumulado + item.cantidad, 0);
}
