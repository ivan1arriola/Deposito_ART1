import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  extractEntidadLabelFromUnidadDestino,
  mergeEntidadesBeneficiariasCatalog,
  normalizeEntidadBeneficiariaKey,
  parseEntidadBeneficiariaClase,
  type EntidadBeneficiariaItem,
} from "@/lib/entidades-beneficiarias";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/user-role";

function isMissingCatalogTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  const message = (error as { message?: string }).message ?? "";
  return code === "P2021" || message.includes("entidad_beneficiaria");
}

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const claseFilter = parseEntidadBeneficiariaClase(url.searchParams.get("clase"));
  const includeInactive = url.searchParams.get("includeInactive") === "1";
  const format = url.searchParams.get("format");

  try {
    let dbRows: EntidadBeneficiariaItem[] = [];
    try {
      const rows = await prisma.entidadBeneficiaria.findMany({
        orderBy: [{ nombre: "asc" }],
      });
      dbRows = rows.map((row) => ({
        entidadBeneficiariaId: row.entidadBeneficiariaId,
        clase: row.clase === "EXTERNO" ? "EXTERNO" : "INTERNO",
        nombre: row.nombre,
        activo: row.activo,
        isDefaultSeed: false,
      }));
    } catch (err: unknown) {
      if (!isMissingCatalogTableError(err)) {
        throw err;
      }
    }

    const [externas, recintos] = await Promise.all([
      prisma.personaExterna.findMany({
        select: { unidadDestino: true },
        distinct: ["unidadDestino"],
      }),
      prisma.movimientoDestinatarioRecinto.findMany({
        select: { clase: true, nombre: true },
        distinct: ["clase", "nombre"],
      }),
    ]);

    const historical: Array<{ clase: "INTERNO" | "EXTERNO"; nombre: string }> = [];
    for (const row of externas) {
      const extracted = extractEntidadLabelFromUnidadDestino(row.unidadDestino);
      if (extracted) historical.push(extracted);
    }
    for (const recinto of recintos) {
      const clase = recinto.clase === "EXTERNO" ? "EXTERNO" : "INTERNO";
      const nombre = recinto.nombre.trim();
      if (nombre) historical.push({ clase, nombre });
    }

    const merged = mergeEntidadesBeneficiariasCatalog(dbRows, historical).filter((item) => {
      if (!includeInactive && !item.activo) return false;
      if (claseFilter && item.clase !== claseFilter) return false;
      return true;
    });

    if (format === "catalog") {
      return NextResponse.json({
        entidades: merged,
        internas: merged.filter((item) => item.clase === "INTERNO"),
        externas: merged.filter((item) => item.clase === "EXTERNO"),
      });
    }

    return NextResponse.json(merged.map((item) => item.nombre));
  } catch {
    return NextResponse.json({ error: "Error al cargar entidades" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;

  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json(
      { error: "Solo un administrador puede gestionar entidades beneficiarias." },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { clase?: unknown; nombre?: unknown };
  const clase = parseEntidadBeneficiariaClase(body?.clase);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";

  if (!clase || !nombre) {
    return NextResponse.json(
      { error: "Debes indicar 'clase' (INTERNO o EXTERNO) y 'nombre' válido." },
      { status: 400 }
    );
  }

  const nombreNormalizado = normalizeEntidadBeneficiariaKey(nombre);
  if (!nombreNormalizado) {
    return NextResponse.json({ error: "El nombre de la entidad es inválido." }, { status: 400 });
  }

  try {
    const existing = await prisma.entidadBeneficiaria.findUnique({
      where: {
        clase_nombreNormalizado: {
          clase,
          nombreNormalizado,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una entidad con ese nombre en la misma clase." },
        { status: 409 }
      );
    }

    const created = await prisma.entidadBeneficiaria.create({
      data: {
        clase,
        nombre,
        nombreNormalizado,
        activo: true,
      },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ENTIDAD_BENEFICIARIA",
      entidadId: String(created.entidadBeneficiariaId),
      detalle: {
        clase: created.clase,
        nombre: created.nombre,
        activo: created.activo,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una entidad con ese nombre en la misma clase." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "No se pudo crear la entidad." }, { status: 500 });
  }
}
