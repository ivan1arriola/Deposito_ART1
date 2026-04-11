import { NextResponse } from "next/server";
import { TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import { getPrismaErrorCode, hasConstraintName } from "@/lib/prisma-errors";
import { getTallaTipoIdMap } from "@/lib/reference-data-cache";

type OficialSuboficialRecord = {
  ci: string;
  tipo: TipoPersonal;
  nombre1: string;
  nombre2: string | null;
  apellido1: string;
  apellido2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
  rango: {
    rangoId: number;
    abreviacion: string;
    nombreCompleto: string;
    orden: number;
  };
  tallas: Array<{
    tallaTipo: { nombre: string };
    tallaValor: string;
  }>;
};

type OficialSuboficialUpdatePayload = {
  apellido1: string;
  apellido2?: string;
  nombre1: string;
  nombre2?: string;
  telefonoContacto?: string;
  rangoId: number | string;
  tallas?: Partial<Record<TallaKey, string>>;
  tallaParka?: string;
  tallaCamisaco?: string;
  tallaPantalon?: string;
  tallaKepi?: string;
  tallaCalzado?: string;
};

function parseRangoId(raw: unknown) {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

function isValidPayload(body: unknown): body is OficialSuboficialUpdatePayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  if (typeof candidate.apellido1 !== "string" || candidate.apellido1.trim() === "") return false;
  if (typeof candidate.nombre1 !== "string" || candidate.nombre1.trim() === "") return false;
  if (parseRangoId(candidate.rangoId) === null) return false;
  if (candidate.telefonoContacto !== undefined && typeof candidate.telefonoContacto !== "string") return false;
  return true;
}

function extractTallas(payload: OficialSuboficialUpdatePayload): Partial<Record<TallaKey, string>> {
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

function serializeOficialSuboficial(registro: OficialSuboficialRecord) {
  return {
    ci: registro.ci,
    apellido1: registro.apellido1,
    apellido2: registro.apellido2,
    nombre1: registro.nombre1,
    nombre2: registro.nombre2,
    telefonoContacto: registro.telefonoContacto,
    rangoId: registro.rangoId,
    nombre: [registro.nombre1, registro.nombre2].filter(Boolean).join(" ").trim(),
    apellido: [registro.apellido1, registro.apellido2].filter(Boolean).join(" ").trim(),
    tipo: registro.tipo === TipoPersonal.OFICIAL ? "OFICIAL" : "SUBOFICIAL",
    gradoMandoId: registro.rangoId,
    gradoMando: {
      gradoMandoId: registro.rango.rangoId,
      abreviacion: registro.rango.abreviacion,
      nombreCompleto: registro.rango.nombreCompleto,
      orden: registro.rango.orden,
    },
    tallas: registro.tallas,
  };
}

const OFICIAL_SUBOFICIAL_SELECT = {
  ci: true,
  tipo: true,
  nombre1: true,
  nombre2: true,
  apellido1: true,
  apellido2: true,
  telefonoContacto: true,
  rangoId: true,
  rango: {
    select: {
      rangoId: true,
      abreviacion: true,
      nombreCompleto: true,
      orden: true,
    },
  },
  tallas: {
    select: {
      tallaTipo: { select: { nombre: true } },
      tallaValor: true,
    },
    orderBy: { tallaTipoId: "asc" },
  },
} as const;

export async function PUT(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciDecoded = decodeURIComponent(ci).trim();
  if (!ciDecoded || !isValidUruguayanCi(ciDecoded)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Revisa apellido1, nombre1 y rangoId." },
      { status: 400 },
    );
  }

  const rangoId = parseRangoId(body.rangoId);
  if (!rangoId) {
    return NextResponse.json({ error: "rangoId invalido." }, { status: 400 });
  }

  const telefonoContacto = normalizeOptionalUruguayanMobileNumber(body.telefonoContacto);
  if ((body.telefonoContacto?.trim() ?? "") !== "" && !telefonoContacto) {
    return NextResponse.json({ error: "telefonoContacto debe ser un celular uruguayo valido." }, { status: 400 });
  }

  const tallasPayload = extractTallas(body);
  const tallasValidation = validateAndNormalizeTallas(tallasPayload);
  if (!tallasValidation.ok) {
    return NextResponse.json({ error: tallasValidation.error }, { status: 400 });
  }

  const tallaTipoMap = await getTallaTipoIdMap();

  const tallasToCreate = Object.entries(tallasValidation.values)
    .map(([nombre, tallaValor]) => {
      const tallaTipoId = tallaTipoMap.get(nombre as TallaKey);
      if (!tallaTipoId || !tallaValor) return null;
      return { tallaTipoId, tallaValor };
    })
    .filter((entry): entry is { tallaTipoId: number; tallaValor: string } => entry !== null);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.personal.findUnique({
        where: { ci: ciDecoded },
        select: { ci: true, tipo: true, rangoId: true },
      });

      if (!existing || (existing.tipo !== TipoPersonal.OFICIAL && existing.tipo !== TipoPersonal.SUBOFICIAL)) {
        return null;
      }

      const rangoValido = await tx.rango.findUnique({
        where: { rangoId_tipo: { rangoId, tipo: existing.tipo } },
        select: { rangoId: true },
      });
      if (!rangoValido) {
        throw new Error("RANGO_INVALIDO");
      }

      await tx.personal.update({
        where: { ci: ciDecoded },
        data: {
          apellido1: body.apellido1.trim(),
          apellido2: normalizeNullableText(body.apellido2),
          nombre1: body.nombre1.trim(),
          nombre2: normalizeNullableText(body.nombre2),
          telefonoContacto,
          rangoId,
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
        select: OFICIAL_SUBOFICIAL_SELECT,
      });
    });

    if (!updated) {
      return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    }

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        ci: ciDecoded,
        tipo: updated.tipo,
        rangoId,
        telefonoContacto,
      },
    });

    return NextResponse.json(serializeOficialSuboficial(updated as OficialSuboficialRecord));
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "RANGO_INVALIDO") {
      return NextResponse.json({ error: "rangoId invalido para el tipo del registro." }, { status: 400 });
    }
    if (hasConstraintName(error, "personal_talla_valor_permitido_chk")) {
      return NextResponse.json(
        { error: "Talles invalidos. Parka/Camisaco/Pantalon: XS a XXXL; Kepi: 54 a 63; Calzado: 34 a 47." },
        { status: 400 },
      );
    }

    const code = getPrismaErrorCode(error);
    if (code === "P2025") return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
    if (code === "P2003") return NextResponse.json({ error: "rangoId invalido para el tipo del registro." }, { status: 400 });
    return NextResponse.json({ error: "No se pudo actualizar el registro." }, { status: 500 });
  }
}
