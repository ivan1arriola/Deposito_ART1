import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  buildEquipoTipoOptions,
  GENERAL_TIPO_EQUIPO_CLAVE,
  normalizeEquipoTipoClave,
} from "@/lib/equipo-tipos";
import {
  applyTipoEquipoOrder,
  getOrderedTipoEquipoIds,
  insertTipoEquipoAtOrder,
} from "@/lib/tipo-equipo-ordering";

type TipoEquipoPayload = {
  nombre?: string;
  orden?: number | string;
};

function parseOrden(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function buildClaveFromNombre(nombre: string) {
  return normalizeEquipoTipoClave(nombre);
}

async function loadTiposEquipo() {
  const tipos = await prisma.tipoEquipoCatalogo.findMany({
    orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    select: {
      tipoEquipoId: true,
      clave: true,
      nombre: true,
      orden: true,
    },
  });

  return buildEquipoTipoOptions(tipos);
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await loadTiposEquipo());
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los tipos de equipo." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "write_data");
  if (!auth.ok) return auth.response;

  const body = (await request.json()) as TipoEquipoPayload;
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const orden = parseOrden(body?.orden);
  const clave = buildClaveFromNombre(nombre);

  if (
    !nombre ||
    !clave ||
    clave === GENERAL_TIPO_EQUIPO_CLAVE ||
    (body?.orden !== undefined && orden === null)
  ) {
    return NextResponse.json(
      {
        error:
          "Payload inválido. 'nombre' es obligatorio, no puede resolver a GENERAL y 'orden' debe ser entero positivo.",
      },
      { status: 400 }
    );
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const orderedIds = await getOrderedTipoEquipoIds(tx);
      const nextOrden = orderedIds.length + 1;

      const draft = await tx.tipoEquipoCatalogo.create({
        data: {
          clave,
          nombre,
          orden: nextOrden,
        },
        select: {
          tipoEquipoId: true,
          clave: true,
          nombre: true,
          orden: true,
        },
      });

      const finalOrderedIds = insertTipoEquipoAtOrder(orderedIds, draft.tipoEquipoId, orden);
      await applyTipoEquipoOrder(tx, finalOrderedIds);

      return tx.tipoEquipoCatalogo.findUniqueOrThrow({
        where: { tipoEquipoId: draft.tipoEquipoId },
        select: {
          tipoEquipoId: true,
          clave: true,
          nombre: true,
          orden: true,
        },
      });
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "TIPO_EQUIPO",
      entidadId: String(created.tipoEquipoId),
      detalle: {
        clave: created.clave,
        nombre: created.nombre,
        orden: created.orden,
      },
    });

    return NextResponse.json(await loadTiposEquipo(), { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe un tipo de equipo con ese nombre." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "No se pudo crear el tipo de equipo." }, { status: 500 });
  }
}
