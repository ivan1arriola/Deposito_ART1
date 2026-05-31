import { NextResponse } from "next/server";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import { getPrismaErrorCode, hasConstraintName } from "@/lib/prisma-errors";
import { getRangoCountByTipo, getTallaTipoIdMap } from "@/lib/reference-data-cache";

type PersonalPayload = {
  ci: string;
  apellido1: string;
  apellido2?: string;
  nombre1: string;
  nombre2?: string;
  telefonoContacto?: string;
  esReingreso?: boolean;
  fechaIngreso?: string;
  fechaIngresoOriginal?: string;
  rangoId: number | string;
  bateriaId?: number | string | null;
  tallas?: Partial<Record<TallaKey, string>>;
  tallaParka?: string;
  tallaCamisaco?: string;
  tallaPantalon?: string;
  tallaKepi?: string;
  tallaCalzado?: string;
  movimientos?: MovimientoPayload[];
};

type MovimientoItemPayload = {
  equipoId: string | number;
  cantidad: number | string;
};

type MovimientoPayload = {
  tipo: TipoMovimiento | string;
  fecha?: string;
  comentarios?: string;
  equipos: MovimientoItemPayload[];
};

type ParsedMovimiento = {
  tipo: TipoMovimiento;
  fecha: Date;
  fechaInput: string;
  comentarios: string | null;
  equipos: Array<{ equipoId: bigint; cantidad: number }>;
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
  if (raw === "ENTREGA") return TipoMovimiento.ENTREGA;
  if (raw === "DEVOLUCION") return TipoMovimiento.DEVOLUCION;
  return null;
}

function parseFechaRegistro(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return dateInputToDate(getTodayDateInput());
  return dateInputToDate(raw);
}

function isValidPayload(body: unknown): body is PersonalPayload {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  const requiredStringFields = ["ci", "apellido1", "nombre1"];
  const hasRequiredStrings = requiredStringFields.every(
    (field) => typeof candidate[field] === "string" && candidate[field].toString().trim() !== "",
  );

  if (!hasRequiredStrings) return false;
  if (!isValidUruguayanCi(String(candidate.ci))) return false;

  const rangoId = Number(candidate.rangoId);
  if (!Number.isInteger(rangoId) || rangoId <= 0) return false;
  if (candidate.telefonoContacto !== undefined && typeof candidate.telefonoContacto !== "string") return false;
  if (candidate.esReingreso !== undefined && typeof candidate.esReingreso !== "boolean") return false;
  if (candidate.fechaIngreso !== undefined && typeof candidate.fechaIngreso !== "string") return false;
  if (candidate.fechaIngresoOriginal !== undefined && typeof candidate.fechaIngresoOriginal !== "string") return false;

  const bateriaRaw = candidate.bateriaId;
  if (!(bateriaRaw === undefined || bateriaRaw === null || String(bateriaRaw).trim() === "")) {
    const bateriaId = Number(bateriaRaw);
    if (!Number.isInteger(bateriaId) || bateriaId <= 0) return false;
  }

  if (candidate.movimientos !== undefined) {
    if (!Array.isArray(candidate.movimientos)) return false;

    for (const movimiento of candidate.movimientos) {
      if (!movimiento || typeof movimiento !== "object") return false;
      const candidateMovimiento = movimiento as Record<string, unknown>;
      if (!parseTipoMovimiento(candidateMovimiento.tipo)) return false;
      if (candidateMovimiento.fecha !== undefined && typeof candidateMovimiento.fecha !== "string") return false;
      if (candidateMovimiento.comentarios !== undefined && typeof candidateMovimiento.comentarios !== "string") return false;
      if (!Array.isArray(candidateMovimiento.equipos) || candidateMovimiento.equipos.length === 0) return false;

      const hasAtLeastOneItem = candidateMovimiento.equipos.some((equipo) => {
        if (!equipo || typeof equipo !== "object") return false;
        const candidateItem = equipo as Record<string, unknown>;
        return parseBigIntId(candidateItem.equipoId) !== null && parseCantidad(candidateItem.cantidad) !== null;
      });
      if (!hasAtLeastOneItem) return false;
    }
  }

  return true;
}

function normalizeNullableText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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

type PersonalWithRelations = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
  rango: {
    rangoId: number;
    tipo: TipoPersonal;
    abreviacion: string;
    nombreCompleto: string;
    orden: number;
  };
  tipo: TipoPersonal;
  esReingreso: boolean | null;
  fechaIngreso: Date | null;
  fechaIngresoOriginal: Date | null;
  bateriaId: number | null;
  bateria: {
    bateriaId: number;
    nombre: string;
    orden: number;
  } | null;
  tallas: Array<{
    tallaTipoId: number;
    tallaValor: string;
    tallaTipo: {
      tallaTipoId: number;
      nombre: string;
    };
  }>;
};

function serializePersonal(persona: PersonalWithRelations) {
  return {
    ci: persona.ci,
    apellido1: persona.apellido1,
    apellido2: persona.apellido2,
    nombre1: persona.nombre1,
    nombre2: persona.nombre2,
    telefonoContacto: persona.telefonoContacto,
    esReingreso: persona.esReingreso ?? false,
    fechaIngreso: formatDateOnlyFromDate(persona.fechaIngreso ?? null),
    fechaIngresoOriginal: formatDateOnlyFromDate(persona.fechaIngresoOriginal ?? null),
    rangoId: persona.rangoId,
    bateriaId: persona.bateriaId ?? null,
    rango: persona.rango,
    bateria: persona.bateria ?? null,
    tallas: persona.tallas,
  };
}

function extractTallas(payload: PersonalPayload): Partial<Record<TallaKey, string>> {
  const fromLegacy: Partial<Record<TallaKey, string>> = {
    PARKA: payload.tallaParka,
    CAMISACO: payload.tallaCamisaco,
    PANTALON: payload.tallaPantalon,
    KEPI: payload.tallaKepi,
    CALZADO: payload.tallaCalzado,
  };

  const merged: Partial<Record<TallaKey, string>> = {
    ...fromLegacy,
    ...(payload.tallas ?? {}),
  };

  const clean: Partial<Record<TallaKey, string>> = {};
  for (const key of TALLA_KEYS) {
    const value = merged[key]?.trim();
    if (value) clean[key] = value;
  }

  return clean;
}

function parseOptionalBateriaId(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const personal = await prisma.personal.findMany({
    where: {
      rango: { tipo: TipoPersonal.SUBALTERNO },
      baja: false,
    },
    include: {
      rango: true,
      bateria: true,
      tallas: {
        include: { tallaTipo: true },
        orderBy: { tallaTipoId: "asc" },
      },
    },
  });

  personal.sort(comparePersonalByHierarchy);

  return NextResponse.json(personal.map((persona) => serializePersonal(persona as PersonalWithRelations)));
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const totalGrados = await getRangoCountByTipo(TipoPersonal.SUBALTERNO);
  if (totalGrados === 0) {
    return NextResponse.json(
      { error: "No se puede registrar personal sin registrar Grados previamente." },
      { status: 400 },
    );
  }

  const body = await req.json();

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Revisa CI uruguaya valida, apellido1, nombre1 y rangoId (grado del personal)." },
      { status: 400 },
    );
  }
  const bateriaId = parseOptionalBateriaId(body.bateriaId);
  const telefonoContacto = normalizeOptionalUruguayanMobileNumber(body.telefonoContacto);
  if ((body.telefonoContacto?.trim() ?? "") !== "" && !telefonoContacto) {
    return NextResponse.json({ error: "telefonoContacto debe ser un celular uruguayo valido." }, { status: 400 });
  }
  const esReingreso = body.esReingreso === true;

  const fechaIngresoRaw = body.fechaIngreso?.trim();
  const fechaIngreso = fechaIngresoRaw ? dateInputToDate(fechaIngresoRaw) : null;
  if (fechaIngresoRaw && !fechaIngreso) {
    return NextResponse.json({ error: "fechaIngreso debe ser una fecha valida." }, { status: 400 });
  }
  if (fechaIngresoRaw && isDateInputAfterToday(fechaIngresoRaw)) {
    return NextResponse.json({ error: "fechaIngreso debe ser antes o igual a hoy." }, { status: 400 });
  }
  if (esReingreso && !fechaIngresoRaw) {
    return NextResponse.json({ error: "fechaIngreso es obligatoria para registrar un reingreso." }, { status: 400 });
  }

  const fechaIngresoOriginalRaw = body.fechaIngresoOriginal?.trim();
  const fechaIngresoOriginal = esReingreso && fechaIngresoOriginalRaw ? dateInputToDate(fechaIngresoOriginalRaw) : null;
  if (fechaIngresoOriginalRaw && !fechaIngresoOriginal) {
    return NextResponse.json({ error: "fechaIngresoOriginal debe ser una fecha valida." }, { status: 400 });
  }
  if (fechaIngresoOriginalRaw && isDateInputAfterToday(fechaIngresoOriginalRaw)) {
    return NextResponse.json({ error: "fechaIngresoOriginal debe ser antes o igual a hoy." }, { status: 400 });
  }
  if (fechaIngresoRaw && fechaIngresoOriginalRaw && isDateInputAfter(fechaIngresoOriginalRaw, fechaIngresoRaw)) {
    return NextResponse.json({ error: "fechaIngresoOriginal no puede ser posterior a la fecha de reingreso." }, { status: 400 });
  }

  const tallasPayload = extractTallas(body);
  const tallasValidation = validateAndNormalizeTallas(tallasPayload);
  if (!tallasValidation.ok) {
    return NextResponse.json({ error: tallasValidation.error }, { status: 400 });
  }

  const normalizedTallas = tallasValidation.values;
  const tallaTipoMap = await getTallaTipoIdMap();

  const tallasToCreate = Object.entries(normalizedTallas)
    .map(([nombre, tallaValor]) => {
      const tallaTipoId = tallaTipoMap.get(nombre as TallaKey);
      if (!tallaTipoId || !tallaValor) return null;

      return {
        tallaTipoId,
        tallaValor,
      };
    })
    .filter((equipo): equipo is { tallaTipoId: number; tallaValor: string } => equipo !== null);

  const movimientosPayload = Array.isArray(body.movimientos) ? body.movimientos : [];
  const movimientosParsed: ParsedMovimiento[] = [];
  const movimientoItemIds = new Set<string>();

  for (const [movimientoIndex, movimientoRaw] of movimientosPayload.entries()) {
    const tipo = parseTipoMovimiento(movimientoRaw.tipo);
    const fecha = parseFechaRegistro(movimientoRaw.fecha);
    const fechaInput = String(movimientoRaw.fecha ?? "").trim() || getTodayDateInput();

    if (!tipo || !fecha) {
      return NextResponse.json(
        { error: `Movimiento #${movimientoIndex + 1}: tipo o fecha invalidos.` },
        { status: 400 },
      );
    }
    if (movimientoRaw.fecha && isDateInputAfterToday(movimientoRaw.fecha)) {
      return NextResponse.json(
        { error: `Movimiento #${movimientoIndex + 1}: la fecha no puede ser futura.` },
        { status: 400 },
      );
    }

    const parsedItems = movimientoRaw.equipos
      .map((equipo) => ({
        equipoId: parseBigIntId(equipo.equipoId),
        cantidad: parseCantidad(equipo.cantidad),
      }))
      .filter((equipo) => equipo.equipoId !== null && equipo.cantidad !== null) as Array<{ equipoId: bigint; cantidad: number }>;

    if (parsedItems.length === 0) {
      return NextResponse.json(
        { error: `Movimiento #${movimientoIndex + 1}: debes enviar al menos un equipo valido.` },
        { status: 400 },
      );
    }

    const dedupedItems = new Map<string, number>();
    for (const equipo of parsedItems) {
      const key = equipo.equipoId.toString();
      dedupedItems.set(key, (dedupedItems.get(key) ?? 0) + equipo.cantidad);
      movimientoItemIds.add(key);
    }

    movimientosParsed.push({
      tipo,
      fecha,
      fechaInput,
      comentarios: movimientoRaw.comentarios?.trim() || null,
      equipos: Array.from(dedupedItems.entries()).map(([equipoId, cantidad]) => ({
        equipoId: BigInt(equipoId),
        cantidad,
      })),
    });
  }

  const itemNombres = new Map<string, string>();
  if (movimientoItemIds.size > 0) {
    const equipoIds = Array.from(movimientoItemIds.values()).map((equipoId) => BigInt(equipoId));
    const itemsFound = await prisma.equipo.findMany({
      where: { equipoId: { in: equipoIds } },
      select: { equipoId: true, nombre: true },
    });

    if (itemsFound.length !== equipoIds.length) {
      return NextResponse.json(
        { error: "Uno o mas equipos de los movimientos iniciales no existen." },
        { status: 400 },
      );
    }

    for (const equipo of itemsFound) {
      itemNombres.set(equipo.equipoId.toString(), equipo.nombre);
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const personalCreated = await tx.personal.create({
        data: {
          ci: body.ci.trim(),
          apellido1: body.apellido1.trim(),
          apellido2: normalizeNullableText(body.apellido2),
          nombre1: body.nombre1.trim(),
          nombre2: normalizeNullableText(body.nombre2),
          telefonoContacto,
          tipo: TipoPersonal.SUBALTERNO, rangoId: Number(body.rangoId),
        },
      });

      

      if (tallasToCreate.length > 0) {
        await tx.personalTalla.createMany({
          data: tallasToCreate.map((talla) => ({
            ci: personalCreated.ci,
            tallaTipoId: talla.tallaTipoId,
            tallaValor: talla.tallaValor,
          })),
        });
      }

      const movimientoIds: string[] = [];
      for (const movimiento of movimientosParsed) {
        const movimientoCreado = await tx.movimiento.create({
          data: {
            usuarioEntregaId: auth.user.usuarioId,
            fecha: movimiento.fecha,
            tipo: movimiento.tipo,
            afectaStock: true,
            observaciones: movimiento.comentarios,
          },
          select: { movimientoId: true },
        });

        await tx.movimientoDestinatarioPersonal.create({
          data: {
            movimientoId: movimientoCreado.movimientoId,
            ci: personalCreated.ci,
          },
        });

        await tx.movimientoEquipo.createMany({
          data: movimiento.equipos.map((equipo) => ({
            movimientoId: movimientoCreado.movimientoId,
            equipoId: equipo.equipoId,
            cantidad: equipo.cantidad,
          })),
        });

        movimientoIds.push(movimientoCreado.movimientoId.toString());
      }

      const personalRecord = await tx.personal.findUnique({
        where: { ci: personalCreated.ci },
        include: {
          rango: true,
          bateria: true,
          tallas: {
            include: { tallaTipo: true },
            orderBy: { tallaTipoId: "asc" },
          },
        },
      });

      return {
        personal: personalRecord,
        movimientoIds,
      };
    });

    const created = result.personal;

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "PERSONAL",
      entidadId: created?.ci ?? null,
      detalle: {
        ci: created?.ci ?? null,
        rangoId: Number(body.rangoId),
        bateriaId,
        telefonoContacto,
        esReingreso,
        fechaIngreso: fechaIngresoRaw ? formatDateOnlyForDisplay(fechaIngresoRaw) : null,
        fechaIngresoOriginal: esReingreso && fechaIngresoOriginalRaw ? formatDateOnlyForDisplay(fechaIngresoOriginalRaw) : null,
      },
    });

    if (created) {
      for (const [index, movimiento] of movimientosParsed.entries()) {
        const itemsDetallados = movimiento.equipos.map((equipo) => ({
          equipoId: equipo.equipoId.toString(),
          nombre: itemNombres.get(equipo.equipoId.toString()) ?? "Equipo sin nombre",
          cantidad: equipo.cantidad,
        }));

        await logAudit({
          usuarioId: auth.user.usuarioId,
          accion: "CREATE",
          entidad: "REGISTRO",
          entidadId: result.movimientoIds[index] ?? null,
          detalle: {
            evento: "MOVIMIENTO_ALTA_PERSONAL",
            ci: created.ci,
            personal: buildPersonalAuditDetail(created as PersonalWithRelations),
            tipo: movimiento.tipo,
            afectaStock: true,
            fechaMovimiento: formatDateOnlyForDisplay(movimiento.fechaInput),
            comentarios: movimiento.comentarios,
            totalEquipos: itemsDetallados.length,
            totalUnidades: itemsDetallados.reduce((acumulado, equipo) => acumulado + equipo.cantidad, 0),
            equipos: itemsDetallados,
          },
        });
      }
    }

    return NextResponse.json(
      created
        ? {
            ...serializePersonal(created as PersonalWithRelations),
            movimientosCreados: result.movimientoIds.length,
          }
        : created,
      { status: 201 },
    );
  } catch (error: unknown) {
    if (hasConstraintName(error, "personal_talla_valor_permitido_chk")) {
      return NextResponse.json(
        { error: "Talles invalidos. Parka/Camisaco/Pantalon: XS a XXXL; Kepi: 54 a 63; Calzado: 34 a 47." },
        { status: 400 },
      );
    }
    if (hasConstraintName(error, "personal_ci_uruguaya_valida_chk")) {
      return NextResponse.json({ error: "La cedula ingresada no es valida." }, { status: 400 });
    }

    const code = getPrismaErrorCode(error);
    if (code === "P2002") return NextResponse.json({ error: "La cedula ya existe." }, { status: 409 });
    if (code === "P2003") {
      return NextResponse.json({ error: "rangoId (grado del personal) o bateriaId invalido." }, { status: 400 });
    }

    return NextResponse.json({ error: "No se pudo crear el registro." }, { status: 500 });
  }
}
