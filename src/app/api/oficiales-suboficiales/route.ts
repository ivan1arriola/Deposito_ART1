import { NextResponse } from "next/server";
import { TipoPersonal } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import { getPrismaErrorCode, hasConstraintName } from "@/lib/prisma-errors";
import { getRangoCountByTipo, getTallaTipoIdMap } from "@/lib/reference-data-cache";

type OficialSuboficialRecord = {
  ci: string;
  nombre1: string;
  nombre2: string | null;
  apellido1: string;
  apellido2: string | null;
  telefonoContacto: string | null;
  rangoId: number;
  rango: {
    rangoId: number;
    tipo: TipoPersonal;
    abreviacion: string;
    nombreCompleto: string;
    orden: number;
  };
  tallas: Array<{
    tallaTipo: { nombre: string };
    tallaValor: string;
  }>;
};

function parseTipoOficialSuboficial(raw: unknown) {
  const normalized = String(raw ?? "").trim().toUpperCase();
  if (normalized === "OFICIAL") return TipoPersonal.OFICIAL;
  if (normalized === "SUBOFICIAL") return TipoPersonal.SUBOFICIAL;
  return null;
}

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

function extractTallas(payload: Record<string, unknown>): Partial<Record<TallaKey, string>> {
  const tallasCandidate = payload.tallas;
  const tallasPayload: Partial<Record<TallaKey, unknown>> =
    tallasCandidate && typeof tallasCandidate === "object"
      ? (tallasCandidate as Partial<Record<TallaKey, unknown>>)
      : {};

  const merged: Partial<Record<TallaKey, string>> = {
    PARKA: typeof tallasPayload.PARKA === "string" ? tallasPayload.PARKA : typeof payload.tallaParka === "string" ? payload.tallaParka : undefined,
    CAMISACO:
      typeof tallasPayload.CAMISACO === "string" ? tallasPayload.CAMISACO : typeof payload.tallaCamisaco === "string" ? payload.tallaCamisaco : undefined,
    PANTALON:
      typeof tallasPayload.PANTALON === "string" ? tallasPayload.PANTALON : typeof payload.tallaPantalon === "string" ? payload.tallaPantalon : undefined,
    KEPI: typeof tallasPayload.KEPI === "string" ? tallasPayload.KEPI : typeof payload.tallaKepi === "string" ? payload.tallaKepi : undefined,
    CALZADO:
      typeof tallasPayload.CALZADO === "string" ? tallasPayload.CALZADO : typeof payload.tallaCalzado === "string" ? payload.tallaCalzado : undefined,
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
    tipo: registro.rango.tipo === TipoPersonal.OFICIAL ? "OFICIAL" : "SUBOFICIAL",
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
  nombre1: true,
  nombre2: true,
  apellido1: true,
  apellido2: true,
  telefonoContacto: true,
  rangoId: true,
  rango: {
    select: {
      rangoId: true,
      tipo: true,
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

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const oficialesSuboficiales = await prisma.personal.findMany({
    where: {
      rango: {
        tipo: {
          in: [TipoPersonal.OFICIAL, TipoPersonal.SUBOFICIAL],
        },
      },
      baja: false,
    },
    select: OFICIAL_SUBOFICIAL_SELECT,
    orderBy: [
      { rango: { tipo: "asc" } },
      { rango: { orden: "asc" } },
      { apellido1: "asc" },
      { nombre1: "asc" },
    ],
  });

  return NextResponse.json(oficialesSuboficiales.map((registro) => serializeOficialSuboficial(registro as OficialSuboficialRecord)));
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as Record<string, unknown>;
  const ci = typeof body.ci === "string" ? body.ci.trim() : "";
  const tipo = parseTipoOficialSuboficial(body.tipo);
  const apellido1 = normalizeNullableText(body.apellido1) ?? normalizeNullableText(body.apellido) ?? "";
  const apellido2 = normalizeNullableText(body.apellido2);
  const nombre1 = normalizeNullableText(body.nombre1) ?? normalizeNullableText(body.nombre) ?? "";
  const nombre2 = normalizeNullableText(body.nombre2);
  const rangoId = parseRangoId(body.rangoId ?? body.gradoMandoId);
  const telefonoContacto = normalizeOptionalUruguayanMobileNumber(
    typeof body.telefonoContacto === "string" ? body.telefonoContacto : undefined,
  );

  if (!ci || !apellido1 || !nombre1 || !tipo || !rangoId) {
    return NextResponse.json(
      { error: "Payload invalido. Revisa ci, tipo, apellido1, nombre1 y rangoId." },
      { status: 400 },
    );
  }
  if (!isValidUruguayanCi(ci)) {
    return NextResponse.json({ error: "La CI debe ser uruguaya valida." }, { status: 400 });
  }
  if ((typeof body.telefonoContacto === "string" ? body.telefonoContacto.trim() : "") !== "" && !telefonoContacto) {
    return NextResponse.json({ error: "telefonoContacto debe ser un celular uruguayo valido." }, { status: 400 });
  }

  const totalGradosTipo = await getRangoCountByTipo(tipo);
  if (totalGradosTipo === 0) {
    return NextResponse.json(
      { error: "No se puede registrar personal oficial/suboficial sin grados del tipo seleccionado." },
      { status: 400 },
    );
  }

  const rangoValido = await prisma.rango.findUnique({
    where: { rangoId_tipo: { rangoId, tipo } },
    select: { rangoId: true },
  });
  if (!rangoValido) {
    return NextResponse.json({ error: "rangoId invalido para el tipo seleccionado." }, { status: 400 });
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
    const created = await prisma.$transaction(async (tx) => {
      const personal = await tx.personal.create({
        data: {
          ci,
          apellido1,
          apellido2,
          nombre1,
          nombre2,
          telefonoContacto,
          rangoId,
        },
      });

      if (tipo === TipoPersonal.OFICIAL) {
        await tx.oficial.create({ data: { ci: personal.ci } });
      } else {
        await tx.suboficial.create({ data: { ci: personal.ci } });
      }

      if (tallasToCreate.length > 0) {
        await tx.personalTalla.createMany({
          data: tallasToCreate.map((talla) => ({
            ci: personal.ci,
            tallaTipoId: talla.tallaTipoId,
            tallaValor: talla.tallaValor,
          })),
        });
      }

      return tx.personal.findUniqueOrThrow({
        where: { ci: personal.ci },
        select: OFICIAL_SUBOFICIAL_SELECT,
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "PERSONAL",
      entidadId: created.ci,
      detalle: {
        ci: created.ci,
        tipo: created.rango.tipo,
        rangoId: created.rangoId,
        telefonoContacto: created.telefonoContacto,
      },
    });

    return NextResponse.json(serializeOficialSuboficial(created as OficialSuboficialRecord), { status: 201 });
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
      return NextResponse.json({ error: "rangoId invalido para el tipo seleccionado." }, { status: 400 });
    }

    return NextResponse.json({ error: "No se pudo crear el registro." }, { status: 500 });
  }
}
