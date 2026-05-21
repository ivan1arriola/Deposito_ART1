import { NextResponse } from "next/server";
import { TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import {
  dateInputToDate,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  isDateInputAfter,
  isDateInputAfterToday,
} from "@/lib/date-helpers";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import { getPrismaErrorCode, hasConstraintName } from "@/lib/prisma-errors";
import { getTallaTipoIdMap } from "@/lib/reference-data-cache";

type PersonalUpdatePayload = {
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
};

function isValidPayload(body: unknown): body is PersonalUpdatePayload {
  if (!body || typeof body !== "object") return false;

  const candidate = body as Record<string, unknown>;
  const requiredStringFields = ["apellido1", "nombre1"];
  const hasRequiredStrings = requiredStringFields.every(
    (field) => typeof candidate[field] === "string" && candidate[field].toString().trim() !== "",
  );

  if (!hasRequiredStrings) return false;

  const rangoId = Number(candidate.rangoId);
  if (!Number.isInteger(rangoId) || rangoId <= 0) return false;

  const bateriaRaw = candidate.bateriaId;
  if (candidate.telefonoContacto !== undefined && typeof candidate.telefonoContacto !== "string") return false;
  if (candidate.esReingreso !== undefined && typeof candidate.esReingreso !== "boolean") return false;
  if (candidate.fechaIngreso !== undefined && typeof candidate.fechaIngreso !== "string") return false;
  if (candidate.fechaIngresoOriginal !== undefined && typeof candidate.fechaIngresoOriginal !== "string") return false;
  if (bateriaRaw === undefined || bateriaRaw === null || String(bateriaRaw).trim() === "") return true;
  const bateriaId = Number(bateriaRaw);
  return Number.isInteger(bateriaId) && bateriaId > 0;
}

function normalizeNullableText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
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
  subalterno: {
    esReingreso: boolean;
    fechaIngreso: Date | null;
    fechaIngresoOriginal: Date | null;
    bateriaId: number | null;
    bateria: {
      bateriaId: number;
      nombre: string;
      orden: number;
    } | null;
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
    esReingreso: persona.subalterno?.esReingreso ?? false,
    fechaIngreso: formatDateOnlyFromDate(persona.subalterno?.fechaIngreso ?? null),
    fechaIngresoOriginal: formatDateOnlyFromDate(persona.subalterno?.fechaIngresoOriginal ?? null),
    rangoId: persona.rangoId,
    bateriaId: persona.subalterno?.bateriaId ?? null,
    rango: persona.rango,
    bateria: persona.subalterno?.bateria ?? null,
    tallas: persona.tallas,
  };
}

function extractTallas(payload: PersonalUpdatePayload): Partial<Record<TallaKey, string>> {
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

export async function PUT(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const body = await req.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Revisa apellido1, nombre1 y rangoId." },
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
    .filter((item): item is { tallaTipoId: number; tallaValor: string } => item !== null);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.personal.findUnique({
        where: { ci: ciDecoded },
        select: { ci: true, rango: { select: { tipo: true } } },
      });
      if (!existing || existing.rango.tipo !== TipoPersonal.SUBALTERNO) {
        return null;
      }

      await tx.personal.update({
        where: { ci: ciDecoded },
        data: {
          apellido1: body.apellido1.trim(),
          apellido2: normalizeNullableText(body.apellido2),
          nombre1: body.nombre1.trim(),
          nombre2: normalizeNullableText(body.nombre2),
          telefonoContacto,
          rangoId: Number(body.rangoId),
        },
      });

      await tx.subalterno.upsert({
        where: { ci: ciDecoded },
        create: {
          ci: ciDecoded,
          esReingreso,
          fechaIngreso,
          fechaIngresoOriginal,
          bateriaId,
        },
        update: {
          esReingreso,
          fechaIngreso,
          fechaIngresoOriginal,
          bateriaId,
        },
      });

      await tx.personalTalla.deleteMany({
        where: { ci: ciDecoded },
      });

      if (tallasToCreate.length > 0) {
        await tx.personalTalla.createMany({
          data: tallasToCreate.map((talla) => ({
            ci: ciDecoded,
            tallaTipoId: talla.tallaTipoId,
            tallaValor: talla.tallaValor,
          })),
        });
      }

      return tx.personal.findUnique({
        where: { ci: ciDecoded },
        include: {
          rango: true,
          subalterno: {
            include: {
              bateria: true,
            },
          },
          tallas: {
            include: { tallaTipo: true },
            orderBy: { tallaTipoId: "asc" },
          },
        },
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        ci: ciDecoded,
        rangoId: Number(body.rangoId),
        bateriaId,
        telefonoContacto,
        esReingreso,
        fechaIngreso: fechaIngresoRaw ? formatDateOnlyForDisplay(fechaIngresoRaw) : null,
        fechaIngresoOriginal: esReingreso && fechaIngresoOriginalRaw ? formatDateOnlyForDisplay(fechaIngresoOriginalRaw) : null,
      },
    });

    const actorLabel = `${auth.user.grado} ${auth.user.apellido}, ${auth.user.nombre}`.replace(/\s+/g, " ").trim();
    await Promise.allSettled([
      sendPersonalMovementEmailNotification({
        request: req,
        ci: ciDecoded,
        subject: "Notificacion de datos personales - Deposito ART1",
        headline: "Se actualizaron datos de tu ficha personal.",
        detailLines: [
          `Rango actualizado: ${updated.rango.abreviacion} - ${updated.rango.nombreCompleto}`,
          bateriaId ? `Bateria: ${updated.subalterno?.bateria?.nombre ?? `ID ${bateriaId}`}` : "Bateria: sin asignar",
          telefonoContacto ? `Celular: ${telefonoContacto}` : "Celular: sin registrar",
          `Reingreso: ${esReingreso ? "Si" : "No"}`,
          fechaIngresoRaw ? `Fecha ingreso: ${formatDateOnlyForDisplay(fechaIngresoRaw)}` : "",
          esReingreso && fechaIngresoOriginalRaw ? `Ingreso original: ${formatDateOnlyForDisplay(fechaIngresoOriginalRaw)}` : "",
        ],
        actorLabel,
        portalPath: "/",
      }),
    ]);

    return NextResponse.json(serializePersonal(updated as PersonalWithRelations));
  } catch (error: unknown) {
    if (hasConstraintName(error, "personal_talla_valor_permitido_chk")) {
      return NextResponse.json(
        { error: "Talles invalidos. Parka/Camisaco/Pantalon: XS a XXXL; Kepi: 54 a 63; Calzado: 34 a 47." },
        { status: 400 },
      );
    }

    const code = getPrismaErrorCode(error);
    if (code === "P2025") return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
    if (code === "P2003") return NextResponse.json({ error: "rangoId o bateriaId invalido." }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el registro." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(req, "delete_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciDecoded)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  try {
    const deleted = await prisma.$transaction(async (tx) => {
      const existing = await tx.personal.findUnique({
        where: { ci: ciDecoded },
        select: { ci: true, rango: { select: { tipo: true } } },
      });
      if (!existing || existing.rango.tipo !== TipoPersonal.SUBALTERNO) return null;

      const deletedTallas = await tx.personalTalla.deleteMany({
        where: { ci: ciDecoded },
      });
      const deletedObservaciones = await tx.observacion.deleteMany({
        where: { ci: ciDecoded },
      });
      const deletedMovimientoItems = await tx.movimientoItem.deleteMany({
        where: { movimiento: { destinatarioPersonal: { is: { ci: ciDecoded } } } },
      });
      const deletedMovimientos = await tx.movimiento.deleteMany({
        where: { destinatarioPersonal: { is: { ci: ciDecoded } } },
      });
      await tx.subalterno.deleteMany({
        where: { ci: ciDecoded },
      });
      await tx.personal.delete({
        where: { ci: ciDecoded },
      });

      return {
        ci: ciDecoded,
        tallas: deletedTallas.count,
        observaciones: deletedObservaciones.count,
        movimientoItems: deletedMovimientoItems.count,
        movimientos: deletedMovimientos.count,
      };
    });

    if (!deleted) {
      return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: deleted,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar el registro." }, { status: 500 });
  }
}
