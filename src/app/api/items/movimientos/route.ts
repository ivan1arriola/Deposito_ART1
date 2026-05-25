import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getMovimientosEquipoData, parseEquipoMovimientoItemId } from "@/lib/movimientos-equipo-data";
import { applyMovimientosEquipoTipoFilters, parseMovimientosEquipoTipoFilters } from "@/lib/movimientos-equipo-filters";
import { parseMovimientosEquipoSort, sortMovimientosEquipoRows } from "@/lib/movimientos-equipo-sort";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const itemIdRaw = url.searchParams.get("equipoId") ?? url.searchParams.get("itemId");
  const itemId = itemIdRaw === null ? null : parseEquipoMovimientoItemId(itemIdRaw);

  if (itemIdRaw !== null && !itemId) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const sort = parseMovimientosEquipoSort(
    url.searchParams.get("sortBy"),
    url.searchParams.get("sortDirection"),
  );
  const tipoFilters = parseMovimientosEquipoTipoFilters(url.searchParams.get("tipos"));

  const data = await getMovimientosEquipoData(itemId);
  if (itemId !== null && !data.selectedItem) {
    return NextResponse.json({ error: "El equipo no existe." }, { status: 404 });
  }

  const rows = applyMovimientosEquipoTipoFilters(sortMovimientosEquipoRows(data.rows, sort), tipoFilters);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    sort,
    items: data.items,
    selectedItem: data.selectedItem,
    rows,
  });
}
