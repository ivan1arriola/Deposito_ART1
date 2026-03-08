import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { getHojaEntregaData } from "@/lib/hoja-entrega-data";

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciValue)) return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const data = await getHojaEntregaData(ciValue);
  if (!data) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    ...data,
    persona: {
      ...data.persona,
      gradoPersonal: data.persona.rango,
      gradoPersonalAbreviado: data.persona.rangoAbreviacion,
    },
  });
}
