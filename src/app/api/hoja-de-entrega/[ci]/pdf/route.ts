import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { formatHojaEntregaDisplayDate, getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { buildSingleHojaEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

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
