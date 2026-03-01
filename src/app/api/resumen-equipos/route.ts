import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getEquipoResumenData } from "@/lib/equipo-resumen";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const data = await getEquipoResumenData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el resumen de equipo." }, { status: 500 });
  }
}
