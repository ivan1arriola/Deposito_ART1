import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildStockItemTraceData, hasStockItemTraceDelegates, parseStockTraceItemId } from "@/lib/stock-item-trace";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;
  if (!hasStockItemTraceDelegates(prisma)) {
    return NextResponse.json({ error: "El cliente Prisma de stock no esta listo. Reinicia el servidor de desarrollo." }, { status: 503 });
  }

  const url = new URL(req.url);
  const itemId = parseStockTraceItemId(url.searchParams.get("equipoId") ?? url.searchParams.get("itemId"));
  if (!itemId) {
    return NextResponse.json({ error: "equipoId invalido." }, { status: 400 });
  }

  const payload = await buildStockItemTraceData(itemId, prisma);
  if (!payload) {
    return NextResponse.json({ error: "El equipo no existe." }, { status: 404 });
  }

  return NextResponse.json(payload);
}
