import { NextResponse } from "next/server";
import { Prisma, TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { isValidUruguayanCi } from "@/lib/ci";
import { resolveDestinatarioMovimiento } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import {
  MOVIMIENTO_TIPO_ASIGNACION,
  MOVIMIENTO_TIPO_DEVOLUCION,
  MOVIMIENTO_TIPO_ENTREGA,
  MOVIMIENTO_TIPOS_REGISTRO,
} from "@/lib/tipo-movimiento";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  formatDateTimeForDisplay,
  getTodayDateInput,
  isDateInputAfterToday,
} from "@/lib/date-helpers";

type MovimientoItemPayload = {
  equipoId: string | number;
  cantidad: number | string;
  comentario?: string;
};

type MovimientoPayload = {
  ci?: string;
  ciList?: string[];
  destinatarioTipo?: string;
  recintoClase?: string;
  recintoNombre?: string;
  destinatarioRecinto?: {
    grado?: string;
    nombre?: string;
    apellido?: string;
    ci?: string;
  };
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
  equipos: MovimientoItemPayload[];
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
      recintoResponsable: {
        grado: string;
        nombre: string;
        apellido: string;
        ci: string;
      } | null;
    };

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
  if (raw === "ENTREGA") return MOVIMIENTO_TIPO_ENTREGA;
  if (raw === "DEVOLUCION") return MOVIMIENTO_TIPO_DEVOLUCION;
  if (raw === "ASIGNACION") return MOVIMIENTO_TIPO_ASIGNACION;
  return null;
}

function parseFecha(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
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
  if (!deduped.every((ci) => isValidUruguayanCi(ci))) return null;
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

function sanitizeExternalPayload(value: MovimientoPayload["destinatarioExterno"] | undefined) {
  let ci = String(value?.ci ?? "").trim();
  if (!ci.startsWith("SD-")) {
    ci = ci.replace(/\D/g, "");
  }
  return {
    grado: String(value?.grado ?? "").trim(),
    nombre: String(value?.nombre ?? "").trim(),
    apellido: String(value?.apellido ?? "").trim(),
    ci,
    unidadDestino: String(value?.unidadDestino ?? "").trim(),
  };
}

function parseDestinatarioPayload(candidate: Record<string, unknown>): ParsedDestinatarioPayload | null {
  const destinatarioTipo = parseDestinatarioTipo(candidate.destinatarioTipo);
  if (!destinatarioTipo) return null;

  if (destinatarioTipo === "RECINTO") {
    const recintoClase = parseRecintoClase(candidate.recintoClase);
    const recintoNombre = parseRecintoNombre(candidate.recintoNombre);
    if (!recintoClase || !recintoNombre) return null;
    
    const rawDestinatarioRecinto = candidate.destinatarioRecinto as Record<string, string> | undefined;
    const recintoResponsable = rawDestinatarioRecinto && (rawDestinatarioRecinto.grado || rawDestinatarioRecinto.nombre || rawDestinatarioRecinto.apellido || rawDestinatarioRecinto.ci) ? {
      grado: String(rawDestinatarioRecinto.grado ?? "").trim(),
      nombre: String(rawDestinatarioRecinto.nombre ?? "").trim(),
      apellido: String(rawDestinatarioRecinto.apellido ?? "").trim(),
      ci: String(rawDestinatarioRecinto.ci ?? "").trim(),
    } : null;

    return {
      destinatarioTipo,
      recintoClase,
      recintoNombre,
      recintoResponsable,
    };
  }

  if (destinatarioTipo === "EXTERNO") {
    const externo = sanitizeExternalPayload(candidate.destinatarioExterno as MovimientoPayload["destinatarioExterno"]);
    if (!externo.ci.startsWith("SD-") && !isValidUruguayanCi(externo.ci)) return null;
    if (!externo.grado || !externo.nombre || !externo.apellido || !externo.unidadDestino) return null;
    return {
      destinatarioTipo,
      externo,
    };
  }

  const targetCis = parseTargetCiList(candidate.ci, candidate.ciList);
  if (!targetCis) return null;
  return {
    destinatarioTipo,
    targetCis,
  };
}

function validateDestinatarioTipoForMovimiento(
  tipo: TipoMovimiento,
  destinatarioPayload: ParsedDestinatarioPayload,
) {
  if (tipo === MOVIMIENTO_TIPO_ENTREGA || tipo === MOVIMIENTO_TIPO_DEVOLUCION) {
    return destinatarioPayload.destinatarioTipo === "PERSONAL";
  }
  if (tipo === MOVIMIENTO_TIPO_ASIGNACION) {
    return true;
  }
  return false;
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
  bateria: { nombre: string } | null;
}) {
  return {
    ci: personal.ci,
    nombre: [personal.nombre1, personal.nombre2, personal.apellido1, personal.apellido2].filter(Boolean).join(" "),
    grado: personal.rango.nombreCompleto,
    gradoAbreviacion: personal.rango.abreviacion,
    bateria: personal.bateria?.nombre ?? null,
  };
}

function buildRecintoAuditDetail(recinto: { clase: MovimientoRecintoClase; nombre: string; responsable?: Extract<ParsedDestinatarioPayload, { destinatarioTipo: "RECINTO" }>["recintoResponsable"] }) {
  return {
    clase: recinto.clase,
    nombre: recinto.nombre,
    scopeLabel: recinto.clase === "EXTERNO" ? "FUERA_UNIDAD" : "DENTRO_UNIDAD",
    responsable: recinto.responsable,
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

function formatRecintoNotificationLabel(recinto: { clase: MovimientoRecintoClase; nombre: string }) {
  const scope = recinto.clase === "EXTERNO" ? "fuera de la unidad" : "dentro de la unidad";
  return `${recinto.nombre} (${scope})`;
}

function formatExternoNotificationLabel(externo: ParsedDestinatarioPayload & { destinatarioTipo: "EXTERNO" }) {
  return `${externo.externo.grado} ${externo.externo.apellido}, ${externo.externo.nombre} (${externo.externo.unidadDestino})`
    .replace(/\s+/g, " ")
    .trim();
}

function isValidPayload(body: unknown): body is MovimientoPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  const tipo = parseTipoMovimiento(candidate.tipo);
  const destinatarioPayload = parseDestinatarioPayload(candidate);
  if (!tipo || !destinatarioPayload) return false;
  if (!validateDestinatarioTipoForMovimiento(tipo, destinatarioPayload)) return false;
  if (!Array.isArray(candidate.equipos) || candidate.equipos.length === 0) return false;
  return true;
}

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const url = new URL(req.url);
  const ci = (url.searchParams.get("ci") ?? "").trim();
  const summaryOnly = url.searchParams.get("summary") === "1";
  const limitRaw = Number(url.searchParams.get("limit") ?? "120");
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 120;

  if (ci && !isValidUruguayanCi(ci)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const where: Prisma.MovimientoWhereInput = {
    ...(ci ? { destinatarioPersonal: { is: { ci } } } : {}),
    tipo: { in: MOVIMIENTO_TIPOS_REGISTRO },
  };

  if (summaryOnly) {
    const total = await prisma.movimiento.count({ where });
    return NextResponse.json({ total });
  }

  const movimientos = await prisma.movimiento.findMany({
    where,
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
          responsableGrado: true,
          responsableNombre: true,
          responsableApellido: true,
          responsableCi: true,
        },
      },
      equipos: {
        include: { equipo: true },
        orderBy: { equipo: { ordenPdf: "asc" } },
      },
    },
    orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const movimientoIds = movimientos.map((movimiento) => movimiento.movimientoId.toString());
  const auditorias =
    movimientoIds.length > 0
      ? await prisma.auditoria.findMany({
          where: {
            entidad: "REGISTRO",
            accion: { in: ["CREATE", "UPDATE"] },
            entidadId: { in: movimientoIds },
          },
          orderBy: { createdAt: "desc" },
          include: {
            usuario: {
              select: { usuarioId: true, username: true, rol: true },
            },
          },
        })
      : [];

  const auditoriaByMovimientoId = new Map<string, (typeof auditorias)[number]>();
  for (const auditoria of auditorias) {
    if (!auditoria.entidadId) continue;
    if (!auditoriaByMovimientoId.has(auditoria.entidadId)) {
      auditoriaByMovimientoId.set(auditoria.entidadId, auditoria);
    }
  }

  return NextResponse.json(
    movimientos.map((movimiento) => {
      const destinatario = resolveDestinatarioMovimiento(movimiento);
      return {
        registroId: movimiento.movimientoId.toString(),
        auditoria: (() => {
          const audit = auditoriaByMovimientoId.get(movimiento.movimientoId.toString());
          if (!audit) return null;
          return {
            auditoriaId: audit.auditoriaId.toString(),
            createdAt: formatDateTimeForDisplay(audit.createdAt),
            usuarioId: audit.usuarioId,
            usuario: audit.usuario
              ? {
                  usuarioId: audit.usuario.usuarioId,
                  username: audit.usuario.username,
                  rol: audit.usuario.rol,
                }
              : null,
            detalle: audit.detalle,
            accion: audit.accion,
          };
        })(),
        ci: destinatario?.ci ?? "",
        destinatarioTipo: movimiento.destinatarioRecinto ? "RECINTO" : movimiento.destinatarioExterno ? "EXTERNO" : "PERSONAL",
        recintoClase: movimiento.destinatarioRecinto?.clase ?? null,
        recintoNombre: movimiento.destinatarioRecinto?.nombre ?? null,
        recintoResponsableInfo: movimiento.destinatarioRecinto && (movimiento.destinatarioRecinto.responsableGrado || movimiento.destinatarioRecinto.responsableNombre)
          ? {
              grado: movimiento.destinatarioRecinto.responsableGrado ?? "",
              nombre: movimiento.destinatarioRecinto.responsableNombre ?? "",
              apellido: movimiento.destinatarioRecinto.responsableApellido ?? "",
              ci: movimiento.destinatarioRecinto.responsableCi ?? "",
            }
          : null,
        usuarioEntregaId: movimiento.usuarioEntregaId,
        usuarioEntregaNombre: formatUsuarioMovimientoLabel(movimiento.usuarioEntrega),
        fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
        tipo: movimiento.tipo,
        afectaStock: true,
        comentarios: movimiento.observaciones,
        createdAt: formatDateTimeForDisplay(movimiento.createdAt),
        equipos: movimiento.equipos.map((detail) => ({
          equipoId: detail.equipoId.toString(),
          nombre: detail.equipo.nombre,
          cantidad: detail.cantidad,
        })),
      };
    }),
  );
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const body = await req.json();
  const requestMeta = readRequestMeta(req);
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Payload invalido. Revisa destinatarios, tipo y equipos." }, { status: 400 });
  }

  const destinatarioPayload = parseDestinatarioPayload(body as Record<string, unknown>);
  if (!destinatarioPayload) {
    return NextResponse.json({ error: "Destinatario invalido." }, { status: 400 });
  }

  const tipo = parseTipoMovimiento(body.tipo);
  const fecha = parseFecha(body.fecha);
  if (!tipo || !fecha) {
    return NextResponse.json({ error: "tipo o fecha invalidos." }, { status: 400 });
  }
  if (!validateDestinatarioTipoForMovimiento(tipo, destinatarioPayload)) {
    return NextResponse.json({ error: "El tipo de destinatario no es valido para este movimiento." }, { status: 400 });
  }

  if (body.fecha && isDateInputAfterToday(body.fecha)) {
    return NextResponse.json({ error: "La fecha no puede ser futura." }, { status: 400 });
  }

  const parsedEquipos = body.equipos
    .map((equipo) => ({
      equipoId: parseBigIntId(equipo.equipoId),
      cantidad: parseCantidad(equipo.cantidad),
      comentario: typeof equipo.comentario === "string" ? equipo.comentario.trim() : "",
    }))
    .filter((equipo) => equipo.equipoId !== null && equipo.cantidad !== null) as Array<{ equipoId: bigint; cantidad: number; comentario: string }>;

  if (parsedEquipos.length === 0) {
    return NextResponse.json({ error: "Debes enviar al menos un equipo valido." }, { status: 400 });
  }

  const dedupedEquipos = new Map<string, { cantidad: number; comentario: string }>();
  for (const equipo of parsedEquipos) {
    const key = equipo.equipoId.toString();
    const existing = dedupedEquipos.get(key);
    dedupedEquipos.set(key, {
      cantidad: (existing?.cantidad ?? 0) + equipo.cantidad,
      comentario: existing?.comentario ? `${existing.comentario} | ${equipo.comentario}` : equipo.comentario,
    });
  }

  const equipoIds = Array.from(dedupedEquipos.keys()).map((equipoId) => BigInt(equipoId));
  const [personalRecords, itemsFound] = await Promise.all([
    destinatarioPayload.destinatarioTipo === "PERSONAL"
      ? prisma.personal.findMany({
          where: {
            ci: { in: destinatarioPayload.targetCis },
            ...(tipo === MOVIMIENTO_TIPO_ENTREGA || tipo === MOVIMIENTO_TIPO_DEVOLUCION ? { rango: { tipo: TipoPersonal.SUBALTERNO } } : {}),
          },
          select: {
            ci: true,
            apellido1: true,
            apellido2: true,
            nombre1: true,
            nombre2: true,
            rango: {
              select: { nombreCompleto: true, abreviacion: true, tipo: true },
            },
            bateria: {
                              select: { nombre: true },
                            },
          },
        })
      : Promise.resolve([]),
    prisma.equipo.findMany({
      where: { equipoId: { in: equipoIds } },
      select: { equipoId: true, nombre: true },
    }),
  ]);

  const personalByCi = new Map(personalRecords.map((personalRecord) => [personalRecord.ci, personalRecord]));
  if (destinatarioPayload.destinatarioTipo === "PERSONAL") {
    const missingCis = destinatarioPayload.targetCis.filter((targetCi) => !personalByCi.has(targetCi));
    if (missingCis.length > 0) {
      const preview = missingCis.slice(0, 3).join(", ");
      const suffix = missingCis.length > 3 ? "..." : "";
      const error =
        tipo === MOVIMIENTO_TIPO_ENTREGA || tipo === MOVIMIENTO_TIPO_DEVOLUCION
          ? `No existe personal subalterno para las CIs: ${preview}${suffix}`
          : `No existe personal para las CIs: ${preview}${suffix}`;
      return NextResponse.json({ error }, { status: 404 });
    }
  }

  if (itemsFound.length !== equipoIds.length) {
    return NextResponse.json({ error: "Uno o mas equipos no existen." }, { status: 400 });
  }

  const comentarios = body.comentarios?.trim() || null;
  const afectaStock = true;
  const itemNombrePorId = new Map(itemsFound.map((equipo) => [equipo.equipoId.toString(), equipo.nombre]));
  const itemsDetallados = Array.from(dedupedEquipos.entries()).map(([equipoId, { cantidad, comentario }]) => ({
    equipoId,
    nombre: itemNombrePorId.get(equipoId) ?? "Equipo sin nombre",
    cantidad,
    comentario,
  }));
  const totalUnidades = itemsDetallados.reduce((acumulado, equipo) => acumulado + equipo.cantidad, 0);

  try {
    const createdMovimientos = await prisma.$transaction(async (tx) => {
      const created: Array<{ movimientoId: bigint; ci: string | null }> = [];

      if (destinatarioPayload.destinatarioTipo === "RECINTO") {
        const movimiento = await tx.movimiento.create({
          data: {
            usuarioEntregaId: auth.user.usuarioId,
            fecha,
            tipo,
            afectaStock,
            observaciones: comentarios,
          },
          select: { movimientoId: true },
        });

        await tx.movimientoDestinatarioRecinto.create({
          data: {
            movimientoId: movimiento.movimientoId,
            clase: destinatarioPayload.recintoClase,
            nombre: destinatarioPayload.recintoNombre,
            responsableGrado: destinatarioPayload.recintoResponsable?.grado || null,
            responsableNombre: destinatarioPayload.recintoResponsable?.nombre || null,
            responsableApellido: destinatarioPayload.recintoResponsable?.apellido || null,
            responsableCi: destinatarioPayload.recintoResponsable?.ci || null,
          },
        });

        await tx.movimientoEquipo.createMany({
          data: Array.from(dedupedEquipos.entries()).map(([equipoId, { cantidad, comentario }]) => ({
            movimientoId: movimiento.movimientoId,
            equipoId: BigInt(equipoId),
            cantidad,
            comentarioEntrega: comentario || null,
          })),
        });

        created.push({ movimientoId: movimiento.movimientoId, ci: null });
        return created;
      }

      if (destinatarioPayload.destinatarioTipo === "EXTERNO") {
        const movimiento = await tx.movimiento.create({
          data: {
            usuarioEntregaId: auth.user.usuarioId,
            fecha,
            tipo,
            afectaStock,
            observaciones: comentarios,
          },
          select: { movimientoId: true },
        });

        await tx.personaExterna.upsert({
          where: { ci: destinatarioPayload.externo.ci },
          create: {
            ci: destinatarioPayload.externo.ci,
            grado: destinatarioPayload.externo.grado,
            nombre: destinatarioPayload.externo.nombre,
            apellido: destinatarioPayload.externo.apellido,
            unidadDestino: destinatarioPayload.externo.unidadDestino,
          },
          update: {
            grado: destinatarioPayload.externo.grado,
            nombre: destinatarioPayload.externo.nombre,
            apellido: destinatarioPayload.externo.apellido,
            unidadDestino: destinatarioPayload.externo.unidadDestino,
          },
        });

        await tx.movimientoDestinatarioExterno.create({
          data: {
            movimientoId: movimiento.movimientoId,
            personaExternaCi: destinatarioPayload.externo.ci,
          },
        });

        await tx.movimientoEquipo.createMany({
          data: Array.from(dedupedEquipos.entries()).map(([equipoId, { cantidad, comentario }]) => ({
            movimientoId: movimiento.movimientoId,
            equipoId: BigInt(equipoId),
            cantidad,
            comentarioEntrega: comentario || null,
          })),
        });

        created.push({ movimientoId: movimiento.movimientoId, ci: null });
        return created;
      }

      for (const targetCi of destinatarioPayload.targetCis) {
        const movimiento = await tx.movimiento.create({
          data: {
            usuarioEntregaId: auth.user.usuarioId,
            fecha,
            tipo,
            afectaStock,
            observaciones: comentarios,
          },
          select: { movimientoId: true },
        });

        await tx.movimientoDestinatarioPersonal.create({
          data: {
            movimientoId: movimiento.movimientoId,
            ci: targetCi,
          },
        });

        await tx.movimientoEquipo.createMany({
          data: Array.from(dedupedEquipos.entries()).map(([equipoId, { cantidad, comentario }]) => ({
            movimientoId: movimiento.movimientoId,
            equipoId: BigInt(equipoId),
            cantidad,
            comentarioEntrega: comentario || null,
          })),
        });

        created.push({ movimientoId: movimiento.movimientoId, ci: targetCi });
      }

      return created;
    });

    if (destinatarioPayload.destinatarioTipo === "RECINTO") {
      const createdMovimiento = createdMovimientos[0];
      await logAudit({
        usuarioId: auth.user.usuarioId,
        accion: "CREATE",
        entidad: "REGISTRO",
        entidadId: createdMovimiento.movimientoId.toString(),
        detalle: {
          evento: "MOVIMIENTO_ASIGNACION_RECINTO",
          destinatarioTipo: "RECINTO",
          recinto: buildRecintoAuditDetail({
            clase: destinatarioPayload.recintoClase,
            nombre: destinatarioPayload.recintoNombre,
            responsable: destinatarioPayload.recintoResponsable,
          }),
          tipo,
          afectaStock,
          fechaMovimiento: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
          comentarios,
          totalEquipos: itemsDetallados.length,
          totalUnidades,
          totalDestinatarios: 1,
          equipos: itemsDetallados,
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent,
        },
      });
    } else if (destinatarioPayload.destinatarioTipo === "EXTERNO") {
      const createdMovimiento = createdMovimientos[0];
      await logAudit({
        usuarioId: auth.user.usuarioId,
        accion: "CREATE",
        entidad: "REGISTRO",
        entidadId: createdMovimiento.movimientoId.toString(),
        detalle: {
          evento: "MOVIMIENTO_ASIGNACION_EXTERNO",
          destinatarioTipo: "EXTERNO",
          externo: buildExternoAuditDetail(destinatarioPayload),
          tipo,
          afectaStock,
          fechaMovimiento: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
          comentarios,
          totalEquipos: itemsDetallados.length,
          totalUnidades,
          totalDestinatarios: 1,
          equipos: itemsDetallados,
          ip: requestMeta.ip,
          userAgent: requestMeta.userAgent,
        },
      });
    } else {
      await Promise.all(
        createdMovimientos.map(async (movimiento) => {
          const personalRecord = movimiento.ci ? personalByCi.get(movimiento.ci) : null;
          if (!personalRecord || !movimiento.ci) return;

          await logAudit({
            usuarioId: auth.user.usuarioId,
            accion: "CREATE",
            entidad: "REGISTRO",
            entidadId: movimiento.movimientoId.toString(),
            detalle: {
              evento: tipo === MOVIMIENTO_TIPO_ASIGNACION ? "MOVIMIENTO_ASIGNACION" : "MOVIMIENTO_VESTUARIO",
              ci: movimiento.ci,
              personal: buildPersonalAuditDetail(personalRecord),
              tipo,
              afectaStock,
              fechaMovimiento: formatDateOnlyForDisplay(body.fecha || getTodayDateInput()),
              comentarios,
              totalEquipos: itemsDetallados.length,
              totalUnidades,
              totalDestinatarios: destinatarioPayload.targetCis.length,
              equipos: itemsDetallados,
              ip: requestMeta.ip,
              userAgent: requestMeta.userAgent,
            },
          });
        }),
      );
    }

    try {
      const detail =
        destinatarioPayload.destinatarioTipo === "RECINTO"
          ? `${tipo} a recinto ${formatRecintoNotificationLabel({
              clase: destinatarioPayload.recintoClase,
              nombre: destinatarioPayload.recintoNombre,
            })}.`
          : destinatarioPayload.destinatarioTipo === "EXTERNO"
            ? `${tipo} a externo ${formatExternoNotificationLabel(destinatarioPayload)}.`
          : `${tipo} para ${destinatarioPayload.targetCis.length} personal(es).`;
      await notifyAdminOnMovement(
        {
          usuarioId: auth.user.usuarioId,
          username: auth.user.username,
          nombre: auth.user.nombre,
          apellido: auth.user.apellido,
          rol: auth.user.rol,
        },
        detail,
        "/",
      );
    } catch {
      // No bloquear registro por fallas de push.
    }

    if (destinatarioPayload.destinatarioTipo === "PERSONAL") {
      const tipoLabel =
        tipo === MOVIMIENTO_TIPO_ENTREGA ? "entrega" : tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "devolucion" : "asignacion";
      const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
      const resumenItems = itemsDetallados
        .slice(0, 4)
        .map((equipo) => `${equipo.nombre} x${equipo.cantidad}`)
        .join(", ");
      const resumenItemsLine = itemsDetallados.length > 4 ? `${resumenItems}, ...` : resumenItems;

      await Promise.allSettled(
        destinatarioPayload.targetCis.map((targetCi) =>
          sendPersonalMovementEmailNotification({
            request: req,
            ci: targetCi,
            subject: "Notificacion de movimiento - Sistema de Depósito General - Artilleria 1",
            headline:
              tipo === MOVIMIENTO_TIPO_ASIGNACION
                ? "Se registro una asignacion de equipo en tu ficha."
                : `Se registro una ${tipoLabel} de vestuario en tu ficha.`,
            detailLines: [
              `Tipo: ${tipo}`,
              `Fecha: ${formatDateOnlyForDisplay(body.fecha || getTodayDateInput())}`,
              `Total de unidades: ${totalUnidades}`,
              `Equipos: ${resumenItemsLine}`,
              comentarios ? `Comentarios: ${comentarios}` : "",
            ],
            actorLabel,
            portalPath: "/",
          }),
        ),
      );
    }

    if (createdMovimientos.length === 1) {
      return NextResponse.json(
        {
          ok: true,
          registroId: createdMovimientos[0].movimientoId.toString(),
          createdCount: 1,
          destinatarioTipo: destinatarioPayload.destinatarioTipo,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        createdCount: createdMovimientos.length,
        registroIds: createdMovimientos.map((movimiento) => movimiento.movimientoId.toString()),
        ciList: destinatarioPayload.destinatarioTipo === "PERSONAL" ? destinatarioPayload.targetCis : [],
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "No se pudo registrar el movimiento." }, { status: 500 });
  }
}
