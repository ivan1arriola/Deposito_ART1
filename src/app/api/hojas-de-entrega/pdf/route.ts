import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { buildUnidadHojasEntregaFileName } from "@/lib/server/pdf-filename";
import { renderA4PdfFromUrl } from "@/lib/server/render-a4-pdf-from-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const origin = new URL(request.url).origin;
  const renderUrl = `${origin}/hojas-de-entrega?pdf=1`;
  const pdfBytes = await renderA4PdfFromUrl(renderUrl, {
    cookieHeader: request.headers.get("cookie"),
    pageNumbersIfMultipage: true,
    pageNumberLabel: "hoja",
    readySelector: "[data-hojas-entrega-ready='1']",
  });

  const fileName = buildUnidadHojasEntregaFileName();
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
