import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getMovimientosFueraHojaData } from "@/lib/hoja-entrega-data";
import { renderMovimientosFueraHojaPdf } from "@/lib/server/render-movimientos-fuera-hoja-react-pdf";
import { parseMovimientosFueraHojaSort, sortMovimientosFueraHojaRows } from "@/lib/movimientos-fuera-hoja-sort";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const sort = parseMovimientosFueraHojaSort(
      url.searchParams.get("sortBy"),
      url.searchParams.get("sortDirection"),
    );

    const [rows, config] = await Promise.all([
      getMovimientosFueraHojaData(),
      getFirmaConfig(),
    ]);

    const orderedRows = sortMovimientosFueraHojaRows(rows, sort);

    const fechaImpresion = formatDateTimeForDisplay(new Date());

    const pdfBytes = await renderMovimientosFueraHojaPdf(orderedRows, fechaImpresion, {
      firmas: {
        encargadoTexto: TEXTO_ENCARGADO,
        encargadoRango: config.encargadoRango,
        encargadoNombre: config.encargadoNombre,
        oficialTexto: TEXTO_OFICIAL,
        oficialRango: config.oficialRango,
        oficialNombre: config.oficialNombre,
      },
    });

    const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;
    const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

    return new NextResponse(pdfBlob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="movimientos-fuera-hoja-${new Date().getTime()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
