import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi, normalizeCi } from "@/lib/ci";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function isLikelyUruguayanCi(value: unknown) {
  const text = asText(value);
  const normalized = normalizeCi(text);
  if (normalized.length < 7 || normalized.length > 8) return false;
  return isValidUruguayanCi(normalized);
}

function collectCisFromDetalle(value: unknown, ciSet: Set<string>) {
  if (Array.isArray(value)) {
    for (const equipo of value) {
      collectCisFromDetalle(equipo, ciSet);
    }
    return;
  }

  if (!isObject(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key.toLowerCase() === "ci" && isLikelyUruguayanCi(nestedValue)) {
      ciSet.add(normalizeCi(asText(nestedValue)));
    }
    collectCisFromDetalle(nestedValue, ciSet);
  }
}

function buildEmbeddedCiReferences(value: unknown) {
  const references: Record<string, string> = {};

  if (Array.isArray(value)) {
    for (const equipo of value) {
      Object.assign(references, buildEmbeddedCiReferences(equipo));
    }
    return references;
  }

  if (!isObject(value)) return references;

  const personal = isObject(value.personal) ? value.personal : null;
  const ci = personal ? asText(personal.ci) : "";
  if (ci && isLikelyUruguayanCi(ci)) {
    const grado = asText(personal?.gradoAbreviacion) || asText(personal?.grado);
    const nombre = asText(personal?.nombre);
    const displayName = [grado, nombre].filter(Boolean).join(" ").trim();
    if (displayName) {
      references[normalizeCi(ci)] = displayName;
    }
  }

  for (const nestedValue of Object.values(value)) {
    Object.assign(references, buildEmbeddedCiReferences(nestedValue));
  }

  return references;
}

function buildPersonalDisplayName(personal: {
  nombre1: string;
  nombre2: string | null;
  apellido1: string;
  apellido2: string | null;
  rango: { abreviacion: string } | null;
}) {
  const fullName = [personal.nombre1, personal.nombre2, personal.apellido1, personal.apellido2].filter(Boolean).join(" ").trim();
  return [personal.rango?.abreviacion ?? "", fullName].filter(Boolean).join(" ").trim();
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "view_audit");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 100;

  const records = await prisma.auditoria.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      usuario: {
        select: {
          usuarioId: true,
          username: true,
          rol: true,
          nombre: true,
          apellido: true,
          rango: {
            select: { abreviacion: true }
          }
        },
      },
    },
  });

  const ciSet = new Set<string>();
  for (const record of records) {
    if (isLikelyUruguayanCi(record.entidadId)) {
      ciSet.add(normalizeCi(asText(record.entidadId)));
    }
    collectCisFromDetalle(record.detalle, ciSet);
  }

  const personalByCi = new Map<string, string>();
  if (ciSet.size > 0) {
    const personalRecords = await prisma.personal.findMany({
      where: { ci: { in: Array.from(ciSet) } },
      select: {
        ci: true,
        nombre1: true,
        nombre2: true,
        apellido1: true,
        apellido2: true,
        rango: {
          select: { abreviacion: true },
        },
      },
    });

    for (const personal of personalRecords) {
      const displayName = buildPersonalDisplayName(personal);
      if (displayName) {
        personalByCi.set(normalizeCi(personal.ci), displayName);
      }
    }
  }

  return NextResponse.json(
    records.map((record) => {
      const embeddedReferences = buildEmbeddedCiReferences(record.detalle);
      const ciReferencias = Object.fromEntries(
        Array.from(ciSet)
          .filter((ci) => {
            if (record.entidadId && normalizeCi(asText(record.entidadId)) === ci) {
              return true;
            }
            const recordCiSet = new Set<string>();
            collectCisFromDetalle(record.detalle, recordCiSet);
            return recordCiSet.has(ci);
          })
          .map((ci) => [ci, personalByCi.get(ci) || embeddedReferences[ci] || ""])
          .filter(([, value]) => Boolean(value)),
      );

      return {
        auditoriaId: record.auditoriaId.toString(),
        usuarioId: record.usuarioId,
        usuario: record.usuario
          ? {
              usuarioId: record.usuario.usuarioId,
              username: record.usuario.username,
              rol: record.usuario.rol,
              nombre: record.usuario.nombre,
              apellido: record.usuario.apellido,
              rango: record.usuario.rango,
            }
          : null,
        accion: record.accion,
        entidad: record.entidad,
        entidadId: record.entidadId,
        detalle: record.detalle,
        ciReferencias,
        createdAt: record.createdAt.toISOString(),
      };
    }),
  );
}
