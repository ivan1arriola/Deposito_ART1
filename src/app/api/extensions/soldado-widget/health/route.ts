import { NextResponse } from "next/server";
import { isSoldadoWidgetAuthEnabled } from "@/lib/soldado-widget-auth";

export async function GET() {
  return NextResponse.json({
    ok: isSoldadoWidgetAuthEnabled(),
    message: isSoldadoWidgetAuthEnabled()
      ? "Autenticacion de Soldado Widget habilitada."
      : "Autenticacion de Soldado Widget NO habilitada. Configura SOLDADO_WIDGET_AUTH_SECRET.",
    timestamp: new Date().toISOString(),
  });
}
