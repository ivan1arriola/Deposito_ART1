import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";

type PersonalPayload = {
  ci: string;
  apellido1: string;
  apellido2?: string;
  nombre1: string;
  nombre2?: string;
  telefonoContacto?: string;
  fechaIngreso?: string;
  rangoId: number | string;
  bateriaId?: number | string | null;
  tallas?: Partial<Record<TallaKey, string>>;
  tallaParka?: string;
  tallaCamisaco?: string;
  tallaPantalon?: string;
  tallaKepi?: string;
  tallaCalzado?: string;
};

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

  const bateriaRaw = candidate.bateriaId;
  if (bateriaRaw === undefined || bateriaRaw === null || String(bateriaRaw).trim() === "") return true;
  const bateriaId = Number(bateriaRaw);
  if (!Number.isInteger(bateriaId) || bateriaId <= 0) return false;
  return true;
}

function normalizeNullableText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isAfterToday(rawValue: string, parsedDate: Date) {
  const datePart = rawValue.trim().slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return datePart > today;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ingreso = new Date(parsedDate);
  ingreso.setHours(0, 0, 0, 0);
  return ingreso.getTime() > today.getTime();
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

  return NextResponse.json(personal);
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  const totalGrados = await prisma.rango.count();
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

  const fechaIngresoRaw = body.fechaIngreso?.trim();
  const fechaIngreso = fechaIngresoRaw ? new Date(fechaIngresoRaw) : null;
  if (fechaIngreso && Number.isNaN(fechaIngreso.getTime())) {
    return NextResponse.json({ error: "fechaIngreso debe ser una fecha valida." }, { status: 400 });
  }
  if (fechaIngresoRaw && fechaIngreso && isAfterToday(fechaIngresoRaw, fechaIngreso)) {
    return NextResponse.json({ error: "fechaIngreso debe ser antes o igual a hoy." }, { status: 400 });
  }

  const tallasPayload = extractTallas(body);
  const tallasValidation = validateAndNormalizeTallas(tallasPayload);
  if (!tallasValidation.ok) {
    return NextResponse.json({ error: tallasValidation.error }, { status: 400 });
  }

  const normalizedTallas = tallasValidation.values;
  const tallaTipos = await prisma.tallaTipo.findMany({
    where: { nombre: { in: TALLA_KEYS as unknown as string[] } },
  });
  const tallaTipoMap = new Map(tallaTipos.map((tipo) => [tipo.nombre as TallaKey, tipo.tallaTipoId]));

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
    const created = await prisma.$transaction(async (tx) => {
      const personalCreated = await tx.personal.create({
        data: {
          ci: body.ci.trim(),
          apellido1: body.apellido1.trim(),
          apellido2: normalizeNullableText(body.apellido2),
          nombre1: body.nombre1.trim(),
          nombre2: normalizeNullableText(body.nombre2),
          telefonoContacto,
          fechaIngreso,
          rangoId: Number(body.rangoId),
          bateriaId,
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

      return tx.personal.findUnique({
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
    });

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
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2002") return NextResponse.json({ error: "La cédula ya existe." }, { status: 409 });
      if (code === "P2003") {
        return NextResponse.json({ error: "rangoId (grado del personal) o bateriaId inválido." }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "No se pudo crear el registro." }, { status: 500 });
  }
}
