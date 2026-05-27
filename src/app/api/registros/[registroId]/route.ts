import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";

type MovimientoItemPayload = {
  itemId: string | number;
  cantidad: number | string;
};

type UpdateMovimientoPayload = {
  ci?: string;
  ciList?: string[];
  destinatarioTipo?: string;
  recintoClase?: string;
  recintoNombre?: string;
  destinatarioExterno?: {
    grado?: string;
    nombre?: string;
    apellido?: string;
    ci?: string;
    unidadDestino?: string;
  };
  fecha?: string;
  tipo: TipoMovimiento | string;
  comentarios?: string;
  items: MovimientoItemPayload[];
};

type MovimientoRecintoClase = "INTERNO" | "EXTERNO";

type ParsedDestinatarioPayload =
  | {
      destinatarioTipo: "PERSONAL";
      targetCis: string[];
    }
  | {
      destinatarioTipo: "EXTERNO";
      externo: {
        grado: string;
        nombre: string;
        apellido: string;
        ci: string;
        unidadDestino: string;
      };
    }
  | {
      destinatarioTipo: "RECINTO";
      recintoClase: MovimientoRecintoClase;
      recintoNombre: string;
    };

function parseMovimientoId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function parseBigIntId(value: unknown) {
  if (typeof value === "bigint") return value;
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) return null;
  return BigInt(raw);
}

function parseCantidad(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseTipoMovimiento(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "ENTREGA") return TipoMovimiento.ENTREGA;
  if (raw === "DEVOLUCION") return TipoMovimiento.DEVOLUCION;
  if (raw === "ASIGNACION") return TipoMovimiento.ASIGNACION;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return dateInputToDate(raw);
}

function parseTargetCiList(ciValue: unknown, ciListValue: unknown) {
  const candidates: string[] = [];
  if (typeof ciValue === "string" && ciValue.trim() !== "") {
    candidates.push(ciValue.trim());
  }
  if (Array.isArray(ciListValue)) {
    for (const value of ciListValue) {
      if (typeof value === "string" && value.trim() !== "") {
        candidates.push(value.trim());
      }
    }
  }

  const deduped = Array.from(new Set(candidates));
  if (deduped.length === 0) return null;
  return deduped;
}

function parseDestinatarioTipo(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "" || raw === "PERSONAL") return "PERSONAL" as const;
  if (raw === "RECINTO") return "RECINTO" as const;
  if (raw === "EXTERNO") return "EXTERNO" as const;
  return null;
}

function parseRecintoClase(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "" || raw === "INTERNO") return "INTERNO" as const;
  if (raw === "EXTERNO") return "EXTERNO" as const;
  return null;
}

function parseRecintoNombre(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function sanitizeExternalPayload(value: UpdateMovimientoPayload["destinatarioExterno"] | undefined) {
  return {
    grado: String(value?.grado ?? "").trim(),
    nombre: String(value?.nombre ?? "").trim(),
    apellido: String(value?.apellido ?? "").trim(),
    ci: String(value?.ci ?? "").trim().replace(/\D/g, ""),
    unidadDestino: String(value?.unidadDestino ?? "").trim(),
  };
}

function parseDestinatarioPayload(
  candidate: Record<string, unknown>,
  fallback: ParsedDestinatarioPayload | null = null,
): ParsedDestinatarioPayload | null {
  const destinatarioTipo = parseDestinatarioTipo(candidate.destinatarioTipo);
  if (!destinatarioTipo) return fallback;

  if (destinatarioTipo === "RECINTO") {
    const fallbackRecinto = fallback?.destinatarioTipo === "RECINTO" ? fallback : null;
    const recintoClase = parseRecintoClase(candidate.recintoClase) ?? fallbackRecinto?.recintoClase ?? null;
    const recintoNombre = parseRecintoNombre(candidate.recintoNombre) ?? fallbackRecinto?.recintoNombre ?? null;
    if (!recintoClase || !recintoNombre) return null;
    return {
      destinatarioTipo,
      recintoClase,
      recintoNombre,
    };
  }

  if (destinatarioTipo === "EXTERNO") {
    const fallbackExterno = fallback?.destinatarioTipo === "EXTERNO" ? fallback : null;
    const externoBase = sanitizeExternalPayload(candidate.destinatarioExterno as UpdateMovimientoPayload["destinatarioExterno"]);
    const externo = {
      grado: externoBase.grado || fallbackExterno?.externo.grado || "",
      nombre: externoBase.nombre || fallbackExterno?.externo.nombre || "",
      apellido: externoBase.apellido || fallbackExterno?.externo.apellido || "",
      ci: externoBase.ci || fallbackExterno?.externo.ci || "",
      unidadDestino: externoBase.unidadDestino || fallbackExterno?.externo.unidadDestino || "",
    };
    if (!externo.grado || !externo.nombre || !externo.apellido || !externo.unidadDestino || !isValidUruguayanCi(externo.ci)) return null;
    return {
      destinatarioTipo,
      externo,
    };
  }

  const targetCis = parseTargetCiList(candidate.ci, candidate.ciList) ?? (fallback?.destinatarioTipo === "PERSONAL" ? fallback.targetCis : null);
  if (!targetCis || targetCis.length === 0) return null;
  return {
    destinatarioTipo,
    targetCis: [targetCis[0]],
  };
}

function validateDestinatarioTipoForMovimiento(
  tipo: TipoMovimiento,
  destinatarioPayload: ParsedDestinatarioPayload,
) {
  if (tipo === TipoMovimiento.ENTREGA || tipo === TipoMovimiento.DEVOLUCION) {
    return destinatarioPayload.destinatarioTipo === "PERSONAL";
  }
  if (tipo === TipoMovimiento.ASIGNACION) {
    return true;
  }
  return false;
}

function isValidPayload(body: unknown): body is UpdateMovimientoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  const tipo = parseTipoMovimiento(candidate.tipo);
  if (!tipo) return false;
  const destinatarioPayload = parseDestinatarioPayload(candidate);
  if (candidate.destinatarioTipo !== undefined && (!destinatarioPayload || !validateDestinatarioTipoForMovimiento(tipo, destinatarioPayload))) {
    return false;
  }
  if (!Array.isArray(candidate.items) || candidate.items.length === 0) return false;
  return true;
}

function readRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const userAgent = request.headers.get("user-agent") || null;
  return { ip, userAgent };
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

function buildPersonalAuditDetail(personal: {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  rango: { nombreCompleto: string; abreviacion: string };
  subalterno: { bateria: { nombre: string } | null } | null;
}) {
  return {
    ci: personal.ci,
    nombre: [personal.nombre1, personal.nombre2, personal.apellido1, personal.apellido2].filter(Boolean).join(" "),
    grado: personal.rango.nombreCompleto,
    gradoAbreviacion: personal.rango.abreviacion,
    bateria: personal.subalterno?.bateria?.nombre ?? null,
  };
}

function buildRecintoAuditDetail(recinto: { clase: MovimientoRecintoClase; nombre: string }) {
  return {
    clase: recinto.clase,
    nombre: recinto.nombre,
    scopeLabel: recinto.clase === "EXTERNO" ? "FUERA_UNIDAD" : "DENTRO_UNIDAD",
  };
}

function buildExternoAuditDetail(externo: ParsedDestinatarioPayload & { destinatarioTipo: "EXTERNO" }) {
  return {
    ci: externo.externo.ci,
    grado: externo.externo.grado,
    nombre: externo.externo.nombre,
    apellido: externo.externo.apellido,
    unidadDestino: externo.externo.unidadDestino,
  };
}

const registroInclude = {
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
    orderBy: { item: { ordenPdf: "asc" } },
  },
} satisfies Prisma.MovimientoInclude;

type RegistroWithRelations = Prisma.MovimientoGetPayload<{
  include: typeof registroInclude;
}>;

function buildExistingDestinatarioPayload(existing: RegistroWithRelations): ParsedDestinatarioPayload | null {
  if (existing.destinatarioRecinto) {
    return {
      destinatarioTipo: "RECINTO",
      recintoClase: existing.destinatarioRecinto.clase === "EXTERNO" ? "EXTERNO" : "INTERNO",
      recintoNombre: existing.destinatarioRecinto.nombre,
    };
  }

  if (existing.destinatarioExterno?.personaExterna) {
    return {
      destinatarioTipo: "EXTERNO",
      externo: {
        grado: existing.destinatarioExterno.personaExterna.grado,
        nombre: existing.destinatarioExterno.personaExterna.nombre,
        apellido: existing.destinatarioExterno.personaExterna.apellido,
        ci: existing.destinatarioExterno.personaExterna.ci,
        unidadDestino: existing.destinatarioExterno.personaExterna.unidadDestino,
      },
    };
  }

  if (existing.destinatarioPersonal?.personal) {
    return {
      destinatarioTipo: "PERSONAL",
      targetCis: [existing.destinatarioPersonal.personal.ci],
    };
  }

  return null;
}

function buildExistingDestinatarioAuditDetail(existing: RegistroWithRelations) {
  if (existing.destinatarioRecinto) {
    return {
      destinatarioTipo: "RECINTO",
      recinto: buildRecintoAuditDetail({
        clase: existing.destinatarioRecinto.clase === "EXTERNO" ? "EXTERNO" : "INTERNO",
        nombre: existing.destinatarioRecinto.nombre,
      }),
    };
  }

  if (existing.destinatarioExterno?.personaExterna) {
    return {
      destinatarioTipo: "EXTERNO",
      externo: buildExternoAuditDetail({
        destinatarioTipo: "EXTERNO",
        externo: {
          grado: existing.destinatarioExterno.personaExterna.grado,
          nombre: existing.destinatarioExterno.personaExterna.nombre,
          apellido: existing.destinatarioExterno.personaExterna.apellido,
          ci: existing.destinatarioExterno.personaExterna.ci,
          unidadDestino: existing.destinatarioExterno.personaExterna.unidadDestino,
        },
      }),
    };
  }

  if (existing.destinatarioPersonal?.personal) {
    return {
      destinatarioTipo: "PERSONAL",
      ci: existing.destinatarioPersonal.personal.ci,
      personal: buildPersonalAuditDetail(existing.destinatarioPersonal.personal),
    };
  }

  return null;
}

export async function GET(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const movimiento = await prisma.movimiento.findUnique({
    where: { movimientoId },
    include: registroInclude,
  });

  if (
    !movimiento ||
    (movimiento.tipo !== TipoMovimiento.ENTREGA &&
      movimiento.tipo !== TipoMovimiento.DEVOLUCION &&
      movimiento.tipo !== TipoMovimiento.ASIGNACION)
  ) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const destinatario = resolveDestinatarioMovimiento(movimiento);
  if (!destinatario) {
    return NextResponse.json({ error: "El registro no tiene destinatario asociado." }, { status: 409 });
  }

  return NextResponse.json({
    registroId: movimiento.movimientoId.toString(),
    fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
    tipo: movimiento.tipo,
    comentarios: movimiento.observaciones,
    destinatarioTipo: movimiento.destinatarioRecinto ? "RECINTO" : movimiento.destinatarioExterno ? "EXTERNO" : "PERSONAL",
    recintoClase: movimiento.destinatarioRecinto?.clase ?? null,
    recintoNombre: movimiento.destinatarioRecinto?.nombre ?? null,
    ci: destinatario.ci,
    perfilCi: destinatario.perfilCi,
    persona: destinatario.etiqueta,
    bateria: movimiento.destinatarioPersonal?.personal.subalterno?.bateria?.nombre ?? null,
    usuarioEntregaId: movimiento.usuarioEntregaId,
    usuarioEntregaNombre: formatUsuarioMovimientoLabel(movimiento.usuarioEntrega),
    items: movimiento.items.map((detail) => ({
      itemId: detail.item.itemId.toString(),
      nombre: detail.item.nombre,
      cantidad: detail.cantidad,
    })),
  });
}

export async function PUT(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa tipo, fecha y equipos." }, { status: 400 });
  }

  const tipo = parseTipoMovimiento(body.tipo);
  const fecha = parseFecha(body.fecha);
  if (!tipo || !fecha) {
    return NextResponse.json({ error: "tipo o fecha invalidos." }, { status: 400 });
  }
  if (body.destinatarioTipo !== undefined) {
    const explicitDestinatario = parseDestinatarioPayload(body as Record<string, unknown>);
    if (!explicitDestinatario || !validateDestinatarioTipoForMovimiento(tipo, explicitDestinatario)) {
      return NextResponse.json({ error: "El tipo de destinatario no es valido para este movimiento." }, { status: 400 });
    }
  }

  if (body.fecha && isDateInputAfterToday(body.fecha)) {
    return NextResponse.json({ error: "La fecha no puede ser futura." }, { status: 400 });
  }

  const parsedEquipos = body.items
    .map((item) => ({
      itemId: parseBigIntId(item.itemId),
      cantidad: parseCantidad(item.cantidad),
    }))
    .filter((item) => item.itemId !== null && item.cantidad !== null) as Array<{ itemId: bigint; cantidad: number }>;

  if (parsedEquipos.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un equipo valido." }, { status: 400 });
  }

  const dedupedEquipos = new Map<string, number>();
  for (const item of parsedEquipos) {
    const key = item.itemId.toString();
    dedupedEquipos.set(key, (dedupedEquipos.get(key) ?? 0) + item.cantidad);
  }

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId },
    include: registroInclude,
  });

  if (
    !existing ||
    (existing.tipo !== TipoMovimiento.ENTREGA &&
      existing.tipo !== TipoMovimiento.DEVOLUCION &&
      existing.tipo !== TipoMovimiento.ASIGNACION)
  ) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const currentDestinatarioPayload = buildExistingDestinatarioPayload(existing);
  if (!currentDestinatarioPayload) {
    return NextResponse.json({ error: "El registro no tiene destinatario asociado." }, { status: 409 });
  }

  const nextDestinatarioPayload = parseDestinatarioPayload(body as Record<string, unknown>, currentDestinatarioPayload);
  if (!nextDestinatarioPayload) {
    return NextResponse.json({ error: "Destinatario invalido." }, { status: 400 });
  }
  if (!validateDestinatarioTipoForMovimiento(tipo, nextDestinatarioPayload)) {
    return NextResponse.json({ error: "El tipo de destinatario no es valido para este movimiento." }, { status: 400 });
  }

  const itemIds = Array.from(dedupedEquipos.keys()).map((itemId) => BigInt(itemId));
  const itemsFound = await prisma.item.findMany({
    where: { itemId: { in: itemIds } },
    select: { itemId: true, nombre: true },
  });
  if (itemsFound.length !== itemIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const afectaStock = true;
  const itemNombrePorId = new Map(itemsFound.map((item) => [item.itemId.toString(), item.nombre]));
  const itemsNuevos = Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
    itemId,
    nombre: itemNombrePorId.get(itemId) ?? "Equipo sin nombre",
    cantidad,
  }));
  const itemsAnteriores = existing.items.map((detail) => ({
    itemId: detail.itemId.toString(),
    nombre: detail.item.nombre,
    cantidad: detail.cantidad,
  }));
  const totalUnidadesAnterior = itemsAnteriores.reduce((acc, item) => acc + item.cantidad, 0);
  const totalUnidadesNuevo = itemsNuevos.reduce((acc, item) => acc + item.cantidad, 0);
  const requestMeta = readRequestMeta(req);

  let nextPersonalRecord:
    | {
        ci: string;
        apellido1: string;
        apellido2: string | null;
        nombre1: string;
        nombre2: string | null;
        rango: { nombreCompleto: string; abreviacion: string };
        subalterno: { bateria: { nombre: string } | null } | null;
      }
    | null = null;

  if (nextDestinatarioPayload.destinatarioTipo === "PERSONAL") {
    const personal = await prisma.personal.findUnique({
      where: { ci: nextDestinatarioPayload.targetCis[0] },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: {
          select: { nombreCompleto: true, abreviacion: true, tipo: true },
        },
        subalterno: {
          select: {
            bateria: {
              select: { nombre: true },
            },
          },
        },
      },
    });

    if (!personal || ((tipo === TipoMovimiento.ENTREGA || tipo === TipoMovimiento.DEVOLUCION) && personal.rango.tipo !== "SUBALTERNO")) {
      return NextResponse.json(
        {
          error:
            tipo === TipoMovimiento.ENTREGA || tipo === TipoMovimiento.DEVOLUCION
              ? "El destinatario interno debe ser un subalterno valido."
              : "El destinatario interno debe existir en personal.",
        },
        { status: 404 },
      );
    }

    nextPersonalRecord = {
      ci: personal.ci,
      apellido1: personal.apellido1,
      apellido2: personal.apellido2,
      nombre1: personal.nombre1,
      nombre2: personal.nombre2,
      rango: {
        nombreCompleto: personal.rango.nombreCompleto,
        abreviacion: personal.rango.abreviacion,
      },
      subalterno: personal.subalterno,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.movimiento.update({
        where: { movimientoId: existing.movimientoId },
        data: {
          tipo,
          fecha,
          afectaStock,
          observaciones: comentarios,
        },
      });

      await tx.movimientoDestinatarioPersonal.deleteMany({
        where: { movimientoId: existing.movimientoId },
      });
      await tx.movimientoDestinatarioExterno.deleteMany({
        where: { movimientoId: existing.movimientoId },
      });
      await tx.movimientoDestinatarioRecinto.deleteMany({
        where: { movimientoId: existing.movimientoId },
      });

      if (nextDestinatarioPayload.destinatarioTipo === "RECINTO") {
        await tx.movimientoDestinatarioRecinto.create({
          data: {
            movimientoId: existing.movimientoId,
            clase: nextDestinatarioPayload.recintoClase,
            nombre: nextDestinatarioPayload.recintoNombre,
          },
        });
      } else if (nextDestinatarioPayload.destinatarioTipo === "EXTERNO") {
        await tx.personaExterna.upsert({
          where: { ci: nextDestinatarioPayload.externo.ci },
          create: {
            ci: nextDestinatarioPayload.externo.ci,
            grado: nextDestinatarioPayload.externo.grado,
            nombre: nextDestinatarioPayload.externo.nombre,
            apellido: nextDestinatarioPayload.externo.apellido,
            unidadDestino: nextDestinatarioPayload.externo.unidadDestino,
          },
          update: {
            grado: nextDestinatarioPayload.externo.grado,
            nombre: nextDestinatarioPayload.externo.nombre,
            apellido: nextDestinatarioPayload.externo.apellido,
            unidadDestino: nextDestinatarioPayload.externo.unidadDestino,
          },
        });

        await tx.movimientoDestinatarioExterno.create({
          data: {
            movimientoId: existing.movimientoId,
            personaExternaCi: nextDestinatarioPayload.externo.ci,
          },
        });
      } else {
        await tx.movimientoDestinatarioPersonal.create({
          data: {
            movimientoId: existing.movimientoId,
            ci: nextDestinatarioPayload.targetCis[0],
          },
        });
      }

      await tx.movimientoItem.deleteMany({
        where: { movimientoId: existing.movimientoId },
      });

      await tx.movimientoItem.createMany({
        data: Array.from(dedupedEquipos.entries()).map(([itemId, cantidad]) => ({
          movimientoId: existing.movimientoId,
          itemId: BigInt(itemId),
          cantidad,
        })),
      });
    });

    const auditDetail = {
      evento:
        tipo === TipoMovimiento.ASIGNACION
          ? "MOVIMIENTO_ASIGNACION_RECTIFICADO"
          : "MOVIMIENTO_VESTUARIO_RECTIFICADO",
      destinatarioAnterior: buildExistingDestinatarioAuditDetail(existing),
      destinatarioNuevo:
        nextDestinatarioPayload.destinatarioTipo === "RECINTO"
          ? {
              destinatarioTipo: "RECINTO",
              recinto: buildRecintoAuditDetail({
                clase: nextDestinatarioPayload.recintoClase,
                nombre: nextDestinatarioPayload.recintoNombre,
              }),
            }
          : nextDestinatarioPayload.destinatarioTipo === "EXTERNO"
            ? {
                destinatarioTipo: "EXTERNO",
                externo: buildExternoAuditDetail(nextDestinatarioPayload),
              }
          : {
              destinatarioTipo: "PERSONAL",
              ci: nextDestinatarioPayload.targetCis[0],
              personal: nextPersonalRecord ? buildPersonalAuditDetail(nextPersonalRecord) : null,
            },
      tipoAnterior: existing.tipo,
      tipoNuevo: tipo,
      afectaStockAnterior: existing.afectaStock,
      afectaStockNuevo: afectaStock,
      fechaAnterior: formatDateOnlyFromDate(existing.fecha),
      fechaNueva: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
      comentariosAnterior: existing.observaciones,
      comentariosNuevo: comentarios,
      totalEquiposAnterior: itemsAnteriores.length,
      totalUnidadesAnterior,
      totalEquiposNuevo: itemsNuevos.length,
      totalUnidadesNuevo,
      itemsAnteriores,
      itemsNuevos,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    };

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "REGISTRO",
      entidadId: existing.movimientoId.toString(),
      detalle: auditDetail,
    });

    const existingPersonal = existing.destinatarioPersonal?.personal ?? null;
    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    if (
      nextDestinatarioPayload.destinatarioTipo === "PERSONAL" &&
      nextPersonalRecord &&
      existingPersonal &&
      existingPersonal.ci === nextPersonalRecord.ci
    ) {
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request: req,
          ci: existingPersonal.ci,
          subject: "Notificacion de movimiento - Sistema de Depósito General - Artilleria 1",
          headline:
            tipo === TipoMovimiento.ASIGNACION
              ? "Se actualizo una asignacion de equipo en tu ficha."
              : "Se actualizo un movimiento en tu ficha de vestuario.",
          detailLines: [
            `Tipo anterior: ${existing.tipo}`,
            `Tipo nuevo: ${tipo}`,
            `Fecha nueva: ${formatDateOnlyForDisplay(body.fecha || getTodayDateInput())}`,
            `Total unidades nuevo: ${totalUnidadesNuevo}`,
            comentarios ? `Comentarios: ${comentarios}` : "",
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    return NextResponse.json({
      ok: true,
      registroId: existing.movimientoId.toString(),
      destinatarioTipo: nextDestinatarioPayload.destinatarioTipo,
      ci: nextDestinatarioPayload.destinatarioTipo === "PERSONAL" ? nextDestinatarioPayload.targetCis[0] : "",
      fecha: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo rectificar el movimiento." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar registros." }, { status: 403 });
  }

  const { registroId: movimientoIdParam } = await context.params;
  const movimientoId = parseMovimientoId(movimientoIdParam);
  if (!movimientoId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const existing = await prisma.movimiento.findUnique({
    where: { movimientoId },
    include: registroInclude,
  });

  if (
    !existing ||
    (existing.tipo !== TipoMovimiento.ENTREGA &&
      existing.tipo !== TipoMovimiento.DEVOLUCION &&
      existing.tipo !== TipoMovimiento.ASIGNACION)
  ) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const existingPersonal = existing.destinatarioPersonal?.personal ?? null;
  const existingExterno = existing.destinatarioExterno?.personaExterna ?? null;
  const existingRecinto = existing.destinatarioRecinto ?? null;
  if (!existingPersonal && !existingRecinto && !existingExterno) {
    return NextResponse.json({ error: "El registro no tiene destinatario asociado." }, { status: 409 });
  }

  const itemsEliminados = existing.items.map((detail) => ({
    itemId: detail.itemId.toString(),
    nombre: detail.item.nombre,
    cantidad: detail.cantidad,
  }));
  const totalUnidadesEliminadas = itemsEliminados.reduce((acc, item) => acc + item.cantidad, 0);
  const requestMeta = readRequestMeta(req);

  try {
    await prisma.movimiento.delete({
      where: { movimientoId: existing.movimientoId },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "REGISTRO",
      entidadId: existing.movimientoId.toString(),
      detalle: {
        evento: existing.tipo === TipoMovimiento.ASIGNACION ? "MOVIMIENTO_ASIGNACION_ELIMINADO" : "MOVIMIENTO_VESTUARIO_ELIMINADO",
        destinatario: buildExistingDestinatarioAuditDetail(existing),
        ci: existingPersonal?.ci ?? null,
        personal: existingPersonal ? buildPersonalAuditDetail(existingPersonal) : null,
        tipo: existing.tipo,
        afectaStock: existing.afectaStock,
        fecha: formatDateOnlyFromDate(existing.fecha),
        comentarios: existing.observaciones,
        totalEquiposEliminados: itemsEliminados.length,
        totalUnidadesEliminadas,
        itemsEliminados,
        ip: requestMeta.ip,
        userAgent: requestMeta.userAgent,
      },
    });

    if (existingPersonal) {
      const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
      await Promise.allSettled([
        sendPersonalMovementEmailNotification({
          request: req,
          ci: existingPersonal.ci,
          subject: "Notificacion de movimiento - Sistema de Depósito General - Artilleria 1",
          headline:
            existing.tipo === TipoMovimiento.ASIGNACION
              ? "Se elimino una asignacion de equipo de tu ficha."
              : "Se elimino un movimiento de tu ficha de vestuario.",
          detailLines: [
            `Tipo eliminado: ${existing.tipo}`,
            `Fecha del registro: ${formatDateOnlyFromDate(existing.fecha) ?? "-"}`,
            `Total unidades eliminadas: ${totalUnidadesEliminadas}`,
            existing.observaciones ? `Comentarios: ${existing.observaciones}` : "",
          ],
          actorLabel,
          portalPath: "/",
        }),
      ]);
    }

    return NextResponse.json({
      ok: true,
      registroId: existing.movimientoId.toString(),
      destinatarioTipo: existingRecinto ? "RECINTO" : existingExterno ? "EXTERNO" : "PERSONAL",
      ci: existingPersonal?.ci ?? "",
    });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el movimiento." }, { status: 500 });
  }
}
