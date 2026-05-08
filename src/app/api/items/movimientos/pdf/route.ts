import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { getMovimientosEquipoData, parseEquipoMovimientoItemId } from "@/lib/movimientos-equipo-data";
import { parseMovimientosEquipoSort, sortMovimientosEquipoRows } from "@/lib/movimientos-equipo-sort";
import { renderMovimientosEquipoPdf } from "@/lib/server/render-movimientos-equipo-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const url = new URL(request.url);
    const itemId = parseEquipoMovimientoItemId(url.searchParams.get("itemId"));
    if (!itemId) {
      return NextResponse.json({ error: "itemId invalido." }, { status: 400 });
    }

    const sort = parseMovimientosEquipoSort(
      url.searchParams.get("sortBy"),
      url.searchParams.get("sortDirection"),
    );

    const [data, config] = await Promise.all([
      getMovimientosEquipoData(itemId),
      getFirmaConfig(),
    ]);

    if (!data.selectedItem) {
      return NextResponse.json({ error: "El equipo no existe." }, { status: 404 });
    }

    const orderedRows = sortMovimientosEquipoRows(data.rows, sort);
    const fechaImpresion = formatDateTimeForDisplay(new Date());

    const pdfBytes = await renderMovimientosEquipoPdf(data.selectedItem, orderedRows, fechaImpresion, {
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
        "Content-Disposition": `attachment; filename="movimientos-equipo-${data.selectedItem.itemId}-${new Date().getTime()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Error generating item movements PDF:", error);
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }
}
