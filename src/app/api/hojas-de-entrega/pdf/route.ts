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

  const requestStartedAtMs = Date.now();
  const loadingStartedAtMs = Date.now();
  const hojas = await getAllHojasEntregaData();
  const loadingMs = Math.max(0, Date.now() - loadingStartedAtMs);
  if (hojas.length === 0) {
    return NextResponse.json({ error: "No hay personal para generar hojas de entrega." }, { status: 404 });
  }

  const renderingStartedAtMs = Date.now();
  const pdfBytes = await renderHojasEntregaPdf(hojas, formatHojaEntregaDisplayDate(new Date()), {
    includePageNumbers: true,
    pageNumberLabel: "Hoja",
    performanceMode: "fast-batch",
    fastBatchInitialProfileId: "tight",
  });
  const renderingMs = Math.max(0, Date.now() - renderingStartedAtMs);
  const totalMs = Math.max(0, Date.now() - requestStartedAtMs);

  const fileName = buildUnidadHojasEntregaFileName();
  const requestUrl = new URL(request.url);
  const inline = requestUrl.searchParams.get("inline") === "1";
  const contentDisposition = `${inline ? "inline" : "attachment"}; filename="${fileName}"`;
  const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });
  const metricsHeader = JSON.stringify({
    loadingMs,
    renderingMs,
    totalMs,
    hojas: hojas.length,
  });

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "X-Hoja-Entrega-Pdf-Layout": "firmas-v2",
      "X-Hoja-Entrega-Pdf-Metrics": metricsHeader,
      "Server-Timing": `hojas-load;dur=${loadingMs}, hojas-render;dur=${renderingMs}, total;dur=${totalMs}`,
      "Cache-Control": "no-store",
    },
  });
}
