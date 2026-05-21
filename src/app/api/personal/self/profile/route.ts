import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { formatDateOnlyFromDate, formatDateTimeForDisplay } from "@/lib/date-helpers";
import { getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { getPersonalSelfContact } from "@/lib/personal-auth";
import { fetchPrestamoActuanteByMovimientoIds } from "@/lib/prestamo-actuante";
import { prestamoInclude, serializePrestamoWithActuante } from "@/lib/prestamos";
import { prisma } from "@/lib/prisma";

type PersonaProfileTipo = "SUBALTERNO" | "OFICIAL" | "SUBOFICIAL";
type PersonaProfileTimelineType = "ENTREGA" | "DEVOLUCION" | "PRESTAMO" | "DEVOLUCION_PRESTAMO";

type PersonaProfileTimelineEntry = {
  id: string;
  fecha: string;
  tipo: PersonaProfileTimelineType;
  descripcion: string;
  responsable: string | null;
  estadoPrestamo?: "PENDIENTE" | "DEVUELTO" | null;
  items: Array<{ nombre: string; cantidad: number }>;
};

type PersonaProfileEquipmentRow = {
  item: string;
  entregado: number;
  devuelto: number;
  saldo: number;
  fuente: "REGISTROS" | "PRESTAMOS";
};

const PERSONAL_PROFILE_SELECT = {
  ci: true,
  apellido1: true,
  apellido2: true,
  nombre1: true,
  nombre2: true,
  telefonoContacto: true,
  rango: {
    select: {
      tipo: true,
      abreviacion: true,
      nombreCompleto: true,
    },
  },
  subalterno: {
    select: {
      esReingreso: true,
      fechaIngreso: true,
      fechaIngresoOriginal: true,
      bateria: {
        select: {
          nombre: true,
        },
      },
    },
  },
  tallas: {
    include: {
      tallaTipo: {
        select: {
          nombre: true,
        },
      },
    },
    orderBy: {
      tallaTipoId: "asc",
    },
  },
} as const satisfies Prisma.PersonalSelect;

function mapPersonalTipo(tipo: TipoPersonal): PersonaProfileTipo {
  if (tipo === TipoPersonal.SUBALTERNO) return "SUBALTERNO";
  if (tipo === TipoPersonal.OFICIAL) return "OFICIAL";
  return "SUBOFICIAL";
}

function joinName(primary: string, secondary: string | null) {
  return `${primary} ${secondary ?? ""}`.replace(/\s+/g, " ").trim();
}

function formatUsuarioMovimientoLabel(usuario: {
  rango: { abreviacion: string } | null;
  apellido: string;
  nombre: string;
  username: string;
}) {
  const label = `${usuario.rango?.abreviacion ?? ""} ${usuario.apellido}, ${usuario.nombre}`.replace(/\s+/g, " ").trim();
  return label || usuario.username;
}

function buildEquipmentSummaryFromHoja(hojaSnapshot: { matrix: Array<{ item: string; entregaTotal: number; devolucionTotal: number }> } | null) {
  if (!hojaSnapshot) return [] as PersonaProfileEquipmentRow[];
  return hojaSnapshot.matrix
    .map((row) => {
      const entregado = row.entregaTotal;
      const saldo = Math.max(row.devolucionTotal, 0);
      const devuelto = Math.max(entregado - saldo, 0);
      return {
        item: row.item,
        entregado,
        devuelto,
        saldo,
        fuente: "REGISTROS" as const,
      };
    })
    .filter((row) => row.entregado > 0 || row.saldo > 0)
    .sort((left, right) => left.item.localeCompare(right.item, "es", { sensitivity: "base" }));
}

function buildEquipmentSummaryFromPrestamos(
  prestamos: Array<ReturnType<typeof serializePrestamoWithActuante>>,
) {
  const prestadoMap = new Map<string, number>();
  const devueltoMap = new Map<string, number>();
  const saldoMap = new Map<string, number>();

  for (const prestamo of prestamos) {
    for (const item of prestamo.items) {
      prestadoMap.set(item.nombre, (prestadoMap.get(item.nombre) ?? 0) + item.cantidad);
      if (prestamo.estado === "DEVUELTO") {
        devueltoMap.set(item.nombre, (devueltoMap.get(item.nombre) ?? 0) + item.cantidad);
      } else {
        saldoMap.set(item.nombre, (saldoMap.get(item.nombre) ?? 0) + item.cantidad);
      }
    }
  }

  return Array.from(new Set([...prestadoMap.keys(), ...devueltoMap.keys(), ...saldoMap.keys()]))
    .sort((left, right) => left.localeCompare(right, "es", { sensitivity: "base" }))
    .map((item) => ({
      item,
      entregado: prestadoMap.get(item) ?? 0,
      devuelto: devueltoMap.get(item) ?? 0,
      saldo: saldoMap.get(item) ?? 0,
      fuente: "PRESTAMOS" as const,
    }))
    .filter((row) => row.entregado > 0 || row.saldo > 0);
}

function buildPersonaProfileTimeline(
  registros: Array<{
    registroId: string;
    fecha: string;
    tipo: "ENTREGA" | "DEVOLUCION";
    usuarioEntregaNombre: string;
    items: Array<{ nombre: string; cantidad: number }>;
  }>,
  prestamos: Array<ReturnType<typeof serializePrestamoWithActuante>>,
) {
  const registrosTimeline = registros.map((registro) => ({
    id: `registro-${registro.registroId}`,
    fecha: registro.fecha,
    tipo: registro.tipo === "ENTREGA" ? "ENTREGA" : "DEVOLUCION",
    descripcion: `Registro ${registro.tipo.toLowerCase()} · ${registro.items.reduce((acc, item) => acc + item.cantidad, 0)} unidades`,
    responsable: registro.usuarioEntregaNombre?.trim() || null,
    estadoPrestamo: null,
    items: registro.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
  })) satisfies PersonaProfileTimelineEntry[];

  const prestamosTimeline = prestamos.flatMap((prestamo) => {
    const prestamoEntry: PersonaProfileTimelineEntry = {
      id: `prestamo-${prestamo.prestamoId}`,
      fecha: prestamo.fechaPrestamo,
      tipo: "PRESTAMO",
      descripcion: `Préstamo ${prestamo.reciboNumero} · ${prestamo.estado.toLowerCase()}`,
      responsable: prestamo.usuarioEntregaNombre ?? null,
      estadoPrestamo: prestamo.estado,
      items: prestamo.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
    };

    if (!prestamo.fechaDevolucion) return [prestamoEntry];

    const devolucionEntry: PersonaProfileTimelineEntry = {
      id: `prestamo-devolucion-${prestamo.prestamoId}`,
      fecha: prestamo.fechaDevolucion,
      tipo: "DEVOLUCION_PRESTAMO",
      descripcion: `Devolución de préstamo ${prestamo.reciboNumero}`,
      responsable: prestamo.usuarioRecibeDevolucionNombre ?? prestamo.usuarioEntregaNombre ?? null,
      estadoPrestamo: "DEVUELTO",
      items: prestamo.items.map((item) => ({ nombre: item.nombre, cantidad: item.cantidad })),
    };

    return [prestamoEntry, devolucionEntry];
  });

  return [...registrosTimeline, ...prestamosTimeline];
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_own_data");
  if (!auth.ok) return auth.response;

  if (auth.user.accountType !== "PERSONAL" || !auth.user.personalCi) {
    return NextResponse.json({ error: "No autorizado para esta consulta." }, { status: 403 });
  }

  const ci = auth.user.personalCi;

  const persona = await prisma.personal.findUnique({
    where: { ci },
    select: PERSONAL_PROFILE_SELECT,
  });

  if (!persona) {
    return NextResponse.json({ error: "No se encontró información personal para esta cuenta." }, { status: 404 });
  }

  const contacto = await getPersonalSelfContact(ci);

  const [registrosRaw, prestamosRaw, observacionesRaw, hojaSnapshot] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        destinatarioPersonal: { is: { ci } },
        tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] },
      },
      include: {
        usuarioEntrega: {
          select: {
            usuarioId: true,
            username: true,
            nombre: true,
            apellido: true,
            rango: {
              select: {
                abreviacion: true,
              },
            },
          },
        },
        destinatarioPersonal: {
          select: {
            personal: {
              select: {
                ci: true,
              },
            },
          },
        },
        items: {
          include: { item: true },
          orderBy: { item: { ordenPdf: "asc" } },
        },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    prisma.movimiento.findMany({
      where: {
        destinatarioPersonal: { is: { ci } },
        tipo: TipoMovimiento.PRESTAMO,
      },
      include: prestamoInclude,
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      take: 300,
    }),
    persona.rango.tipo === TipoPersonal.SUBALTERNO
      ? prisma.observacion.findMany({
          where: { ci },
          orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        })
      : Promise.resolve([]),
    persona.rango.tipo === TipoPersonal.SUBALTERNO ? getHojaEntregaData(ci) : Promise.resolve(null),
  ]);

  const actuanteByMovimientoId = await fetchPrestamoActuanteByMovimientoIds(
    prestamosRaw.map((prestamo) => prestamo.movimientoId),
  );

  const prestamos = prestamosRaw.map((prestamo) =>
    serializePrestamoWithActuante(prestamo, actuanteByMovimientoId),
  );

  const registros = registrosRaw.map((movimiento) => {
    const registroTipo: "ENTREGA" | "DEVOLUCION" =
      movimiento.tipo === TipoMovimiento.ENTREGA ? "ENTREGA" : "DEVOLUCION";

    return {
      registroId: movimiento.movimientoId.toString(),
      auditoria: null,
      ci: movimiento.destinatarioPersonal?.personal.ci ?? ci,
      usuarioEntregaId: movimiento.usuarioEntregaId,
      usuarioEntregaNombre: formatUsuarioMovimientoLabel(movimiento.usuarioEntrega),
      fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
      tipo: registroTipo,
      afectaStock: true,
      comentarios: movimiento.observaciones,
      createdAt: formatDateTimeForDisplay(movimiento.createdAt),
      items: movimiento.items.map((item) => ({
        itemId: item.itemId.toString(),
        nombre: item.item.nombre,
        cantidad: item.cantidad,
      })),
    };
  });

  const observaciones = observacionesRaw.map((observacion) => ({
    observacionId: observacion.observacionId.toString(),
    ci: observacion.ci,
    fecha: formatDateOnlyFromDate(observacion.fecha) ?? "",
    texto: observacion.texto,
    createdAt: formatDateTimeForDisplay(observacion.createdAt),
  }));

  const equipmentSummary =
    persona.rango.tipo === TipoPersonal.SUBALTERNO
      ? buildEquipmentSummaryFromHoja(
          hojaSnapshot
            ? {
                matrix: hojaSnapshot.matrix.map((row) => ({
                  item: row.item,
                  entregaTotal: row.entregaTotal,
                  devolucionTotal: row.devolucionTotal,
                })),
              }
            : null,
        )
      : buildEquipmentSummaryFromPrestamos(prestamos);

  const timeline = buildPersonaProfileTimeline(registros, prestamos);

  return NextResponse.json({
    identity: {
      ci: persona.ci,
      tipo: mapPersonalTipo(persona.rango.tipo),
      apellido: joinName(persona.apellido1, persona.apellido2),
      nombre: joinName(persona.nombre1, persona.nombre2),
      gradoAbreviacion: persona.rango.abreviacion,
      gradoNombre: persona.rango.nombreCompleto,
      bateriaNombre: persona.subalterno?.bateria?.nombre ?? null,
      telefonoContacto: contacto?.telefonoContacto ?? persona.telefonoContacto,
      mailReferencia: contacto?.mailReferencia ?? null,
      esReingreso: persona.rango.tipo === TipoPersonal.SUBALTERNO ? (persona.subalterno?.esReingreso ?? false) : null,
      fechaIngreso:
        persona.rango.tipo === TipoPersonal.SUBALTERNO
          ? formatDateOnlyFromDate(persona.subalterno?.fechaIngreso ?? null)
          : null,
      fechaIngresoOriginal:
        persona.rango.tipo === TipoPersonal.SUBALTERNO
          ? formatDateOnlyFromDate(persona.subalterno?.fechaIngresoOriginal ?? null)
          : null,
      tallas: persona.tallas.map((talla) => ({
        tallaTipo: { nombre: talla.tallaTipo.nombre },
        tallaValor: talla.tallaValor,
      })),
    },
    registros,
    prestamos,
    observaciones,
    equipmentSummary,
    timeline,
  });
}
