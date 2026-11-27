import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const { ci } = await context.params;
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  if (!isValidUruguayanCi(ciValue))
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });

  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (user.accountType === "PERSONAL") {
    if (!user.personalCi || user.personalCi !== ciValue) {
      return NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 });
    }
  } else if (!hasPermission(user.rol, "read_data", user.accountType)) {
    return NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 });
  }

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
