import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import {
  formatHojaEntregaDisplayDate,
  getAllHojasEntregaData,
  getMovimientosFueraHojaData,
} from "@/lib/hoja-entrega-data";
import { buildUnidadHojasEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";
import { renderMovimientosFueraHojaPdf } from "@/lib/server/render-movimientos-fuera-hoja-react-pdf";
import { ParseSpeeds, PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const requestStartedAtMs = Date.now();
  const loadingStartedAtMs = Date.now();
  const [hojas, movimientosFueraHoja] = await Promise.all([
    getAllHojasEntregaData(),
    getMovimientosFueraHojaData(),
  ]);
  const loadingMs = Math.max(0, Date.now() - loadingStartedAtMs);
  if (hojas.length === 0) {
    return NextResponse.json(
      { error: "No hay personal para generar hojas de entrega." },
      { status: 404 }
    );
  }

  const renderingStartedAtMs = Date.now();
  const fechaImpresion = formatHojaEntregaDisplayDate(new Date());
  const [hojasPdfBytes, fueraHojaPdfBytes] = await Promise.all([
    renderHojasEntregaPdf(hojas, fechaImpresion, {
      includePageNumbers: true,
      pageNumberLabel: "Hoja",
      includeSheetPage: true,
      includeUsageGuidePage: false,
      performanceMode: "fast-batch",
      fastBatchInitialProfileId: "tight",
    }),
    renderMovimientosFueraHojaPdf(movimientosFueraHoja, fechaImpresion, {
      pageNumberLabel: "Movimientos fuera de hoja",
    }),
  ]);

  const mergedPdf = await PDFDocument.create();
  const hojasPdf = await PDFDocument.load(hojasPdfBytes, { parseSpeed: ParseSpeeds.Fastest });
  const fueraHojaPdf = await PDFDocument.load(fueraHojaPdfBytes, {
    parseSpeed: ParseSpeeds.Fastest,
  });

  const hojasPages = await mergedPdf.copyPages(hojasPdf, hojasPdf.getPageIndices());
  for (const page of hojasPages) {
    mergedPdf.addPage(page);
  }

  const fueraHojaPages = await mergedPdf.copyPages(fueraHojaPdf, fueraHojaPdf.getPageIndices());
  for (const page of fueraHojaPages) {
    mergedPdf.addPage(page);
  }

  const pdfBytes = await mergedPdf.save();
  const renderingMs = Math.max(0, Date.now() - renderingStartedAtMs);
  const totalMs = Math.max(0, Date.now() - requestStartedAtMs);

  const fileName = buildUnidadHojasEntregaFileName();
  const contentDisposition = `inline; filename="${fileName}"`;
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
