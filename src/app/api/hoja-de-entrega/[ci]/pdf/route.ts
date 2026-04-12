import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { formatHojaEntregaDisplayDate, getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { hasPermission } from "@/lib/permissions";
import { buildSingleHojaEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const { ci } = await context.params;
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }
  if (!isValidUruguayanCi(ciValue)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (user.accountType === "PERSONAL") {
    if (!user.personalCi || user.personalCi !== ciValue) {
      return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
    }
  } else if (!hasPermission(user.rol, "read_data", user.accountType)) {
    return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
  }

  const hoja = await getHojaEntregaData(ciValue);
  if (!hoja) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  const pdfBytes = await renderHojasEntregaPdf([hoja], formatHojaEntregaDisplayDate(new Date()), {
    includePageNumbers: true,
    pageNumberLabel: "Hoja",
  });

  const fileName = buildSingleHojaEntregaFileName({
    ci: hoja.persona.ci,
    grado: hoja.persona.rangoAbreviacion,
    apellido: hoja.persona.apellido1,
    nombre: hoja.persona.nombre1,
  });
  const requestUrl = new URL(request.url);
  const inline = requestUrl.searchParams.get("inline") === "1";
  const contentDisposition = `${inline ? "inline" : "attachment"}; filename="${fileName}"`;
  const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "X-Hoja-Entrega-Pdf-Layout": "firmas-v2",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Surrogate-Control": "no-store",
    },
  });
}
