import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { buildSingleHojaEntregaFileName } from "@/lib/server/pdf-filename";
import { renderA4PdfFromUrl } from "@/lib/server/render-a4-pdf-from-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }
  if (!isValidUruguayanCi(ciValue)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const data = await getHojaEntregaData(ciValue);
  if (!data) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const renderUrl = `${origin}/hoja-de-entrega/${encodeURIComponent(ciValue)}?pdf=1`;
  const pdfBytes = await renderA4PdfFromUrl(renderUrl, {
    cookieHeader: request.headers.get("cookie"),
    pageNumbersIfMultipage: true,
    pageNumberLabel: "hoja",
  });

  const fileName = buildSingleHojaEntregaFileName({
    ci: data.persona.ci,
    grado: data.persona.rangoAbreviacion,
    apellido: data.persona.apellido1,
    nombre: data.persona.nombre1,
  });
  const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
