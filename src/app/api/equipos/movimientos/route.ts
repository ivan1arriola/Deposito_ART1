import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import {
  getMovimientosEquipoData,
  parseEquipoMovimientoItemId,
} from "@/lib/movimientos-equipo-data";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const equipoIdParam = searchParams.get("equipoId");
    const equipoId = parseEquipoMovimientoItemId(equipoIdParam);

    const data = await getMovimientosEquipoData(equipoId);

    return NextResponse.json({
      ...data,
      generatedAt: new Date().toISOString(),
      total: data.rows.length,
    });
  } catch (error) {
    console.error("Error en GET /api/equipos/movimientos:", error);
    return NextResponse.json(
      { error: "Error interno al cargar los movimientos del equipo" },
      { status: 500 }
    );
  }
}
