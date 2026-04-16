import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getMovimientosFueraHojaData } from "@/lib/hoja-entrega-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const rows = await getMovimientosFueraHojaData();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows,
  });
}
