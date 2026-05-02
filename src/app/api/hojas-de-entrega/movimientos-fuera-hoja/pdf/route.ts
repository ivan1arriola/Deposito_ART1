import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getMovimientosFueraHojaData } from "@/lib/hoja-entrega-data";
import { renderMovimientosFueraHojaPdf } from "@/lib/server/render-movimientos-fuera-hoja-react-pdf";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const [rows, config] = await Promise.all([
      getMovimientosFueraHojaData(),
      getFirmaConfig(),
    ]);

    const fechaImpresion = formatDateTimeForDisplay(new Date());

    const pdfBytes = await renderMovimientosFueraHojaPdf(rows, fechaImpresion, {
      firmas: {
        encargadoTexto: TEXTO_ENCARGADO,
        encargadoRango: config.encargadoRango,
        encargadoNombre: config.encargadoNombre,
        oficialTexto: TEXTO_OFICIAL,
        oficialRango: config.oficialRango,
        oficialNombre: config.oficialNombre,
      },
    });

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="movimientos-fuera-hoja-${new Date().getTime()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
