import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { formatHojaEntregaDisplayDate, getAllHojasEntregaData } from "@/lib/hoja-entrega-data";
import { buildUnidadHojasEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const hojas = await getAllHojasEntregaData();
  if (hojas.length === 0) {
    return NextResponse.json({ error: "No hay personal para generar hojas de entrega." }, { status: 404 });
  }

  const pdfBytes = await renderHojasEntregaPdf(hojas, formatHojaEntregaDisplayDate(new Date()), {
    includePageNumbers: true,
    pageNumberLabel: "Hoja",
  });

  const fileName = buildUnidadHojasEntregaFileName();
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
      "Cache-Control": "no-store",
    },
  });
}
