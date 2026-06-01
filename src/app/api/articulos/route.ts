import { NextResponse } from "next/server";
import { TipoArticulo } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { calcularStockTodos } from "@/lib/stock-calc";
import { isAdminRole } from "@/lib/user-role";

function parseTipoArticulo(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized === "OFICINA") return TipoArticulo.OFICINA;
  if (normalized === "LIMPIEZA") return TipoArticulo.LIMPIEZA;
  return undefined;
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const [articulos, stockMap] = await Promise.all([
      prisma.articulo.findMany({
        orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
      }),
      calcularStockTodos(prisma),
    ]);

    const result = articulos.map((a) => ({
      ...a,
      stockActual: stockMap.get(a.articuloId) ?? 0,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar los artículos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req, "write_data");
  if (!auth.ok) return auth.response;
  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json({ error: "Solo admin puede registrar artículos." }, { status: 403 });
  }

  const body = await req.json();
  const candidate = body as Record<string, unknown>;
  const nombre = typeof candidate?.nombre === "string" ? candidate.nombre.trim() : "";
  const tipo = parseTipoArticulo(candidate?.tipo);

  if (!nombre || !tipo) {
    return NextResponse.json(
      { error: "Payload inválido. 'nombre' es obligatorio y 'tipo' debe ser OFICINA o LIMPIEZA." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.articulo.create({
      data: { nombre, tipo },
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "CREATE",
      entidad: "ARTICULO",
      entidadId: String(created.articuloId),
      detalle: { nombre: created.nombre, tipo: created.tipo },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "El artículo ya existe." }, { status: 409 });
    }

    return NextResponse.json({ error: "No se pudo crear el artículo." }, { status: 500 });
  }
}
