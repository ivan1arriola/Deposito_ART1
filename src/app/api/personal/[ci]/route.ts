import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidUruguayanCi } from "@/lib/ci";
import { TALLA_KEYS, type TallaKey, validateAndNormalizeTallas } from "@/lib/tallas";

type PersonalUpdatePayload = {
  apellido1: string;
  apellido2?: string;
  nombre1: string;
  nombre2?: string;
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
  if (bateriaRaw === undefined || bateriaRaw === null || String(bateriaRaw).trim() === "") return true;
  const bateriaId = Number(bateriaRaw);
  return Number.isInteger(bateriaId) && bateriaId > 0;
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
    const updated = await prisma.$transaction(async (tx) => {
      await tx.personal.update({
        where: { ci: ciDecoded },
        data: {
          apellido1: body.apellido1.trim(),
          apellido2: normalizeNullableText(body.apellido2),
          nombre1: body.nombre1.trim(),
          nombre2: normalizeNullableText(body.nombre2),
          fechaIngreso,
          rangoId: Number(body.rangoId),
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
      accion: "UPDATE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
      detalle: {
        ci: ciDecoded,
        rangoId: Number(body.rangoId),
        bateriaId,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
      if (code === "P2003") return NextResponse.json({ error: "rangoId o bateriaId invalido." }, { status: 400 });
    }
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
    await prisma.personal.delete({
      where: { ci: ciDecoded },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "DELETE",
      entidad: "PERSONAL",
      entidadId: ciDecoded,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2025") {
      return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo eliminar el registro." }, { status: 500 });
  }
}
