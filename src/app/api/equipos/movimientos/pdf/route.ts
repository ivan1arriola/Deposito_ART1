import { authorizeRequest } from "@/lib/auth";
import {
  getMovimientosEquipoData,
  parseEquipoMovimientoItemId,
} from "@/lib/movimientos-equipo-data";
import {
  parseMovimientosEquipoTipoFilters,
  applyMovimientosEquipoTipoFilters,
} from "@/lib/movimientos-equipo-filters";
import {
  sortMovimientosEquipoRows,
  type MovimientosEquipoSortDirection,
  type MovimientosEquipoSortField,
} from "@/lib/movimientos-equipo-sort";
import { renderMovimientosEquipoPdf } from "@/lib/server/render-movimientos-equipo-react-pdf";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const equipoIdParam = searchParams.get("equipoId");
    const equipoId = parseEquipoMovimientoItemId(equipoIdParam);

    if (!equipoId) {
      return new Response("equipoId no proporcionado o inválido", { status: 400 });
    }

    const sortBy = (searchParams.get("sortBy") as MovimientosEquipoSortField) || "fecha";
    const sortDirection =
      (searchParams.get("sortDirection") as MovimientosEquipoSortDirection) || "desc";
    const tiposParam = searchParams.get("tipos");
    const tipos = parseMovimientosEquipoTipoFilters(tiposParam);

    const data = await getMovimientosEquipoData(equipoId);

    if (!data.selectedItem) {
      return new Response("Equipo no encontrado", { status: 404 });
    }

    const filteredRows = applyMovimientosEquipoTipoFilters(data.rows, tipos);
    const sortedRows = sortMovimientosEquipoRows(filteredRows, {
      field: sortBy,
      direction: sortDirection,
    });

    const configFirma = await getFirmaConfig();
    const fechaImpresion = formatDateOnlyFromDate(new Date()) ?? "";

    const pdfBuffer = await renderMovimientosEquipoPdf(
      data.selectedItem,
      sortedRows,
      fechaImpresion,
      {
        firmas: {
          ...configFirma,
          encargadoTexto: TEXTO_ENCARGADO,
          oficialTexto: TEXTO_OFICIAL,
        },
      }
    );

    const filename = `Movimientos_Equipo_${data.selectedItem.equipoId}_${data.selectedItem.nombre.replace(/[^a-z0-9]/gi, "_")}.pdf`;

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error en GET /api/equipos/movimientos/pdf:", error);
    return new Response("Error interno al generar el PDF de movimientos", { status: 500 });
  }
}
