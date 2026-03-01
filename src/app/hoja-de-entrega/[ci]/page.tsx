import { notFound } from "next/navigation";
import { TipoRegistro } from "@prisma/client";
import { isValidUruguayanCi, formatUruguayanCi } from "@/lib/ci";
import { prisma } from "@/lib/prisma";
import { getFirmaConfig, TEXTO_ENCARGADO, TEXTO_OFICIAL } from "@/lib/firma-config";
import { buildHojaObservaciones } from "@/lib/hoja-entrega-observaciones";

export const revalidate = 0; // No cache

type RegistroWithItems = {
  fecha: Date;
  items: Array<{
    cantidad: number;
    item: {
      nombre: string;
    };
  }>;
};

type MatrixColumn = {
  fecha: string | null;
  items: Array<{ nombre: string; cantidad: number }>;
};

function aggregateItems(records: RegistroWithItems[]) {
  const map = new Map<string, number>();
  for (const record of records) {
    for (const detail of record.items) {
      const key = detail.item.nombre;
      map.set(key, (map.get(key) ?? 0) + detail.cantidad);
    }
  }
  return Array.from(map.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
}

function toSixColumns(records: RegistroWithItems[]): MatrixColumn[] {
  const sorted = [...records].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const columns: MatrixColumn[] = [];

  if (sorted.length > 5) {
    const oldRecords = sorted.slice(0, sorted.length - 5);
    const recentRecords = sorted.slice(-5);
    const cutoffRecord = oldRecords[oldRecords.length - 1] ?? null;

    columns.push({
      fecha: cutoffRecord ? cutoffRecord.fecha.toISOString() : null,
      items: aggregateItems(oldRecords),
    });

    columns.push(
      ...recentRecords.map((record) => ({
        fecha: record.fecha.toISOString(),
        items: record.items.map((detail) => ({
          nombre: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  } else {
    columns.push(
      ...sorted.map((record) => ({
        fecha: record.fecha.toISOString(),
        items: record.items.map((detail) => ({
          nombre: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
      })),
    );
  }

  while (columns.length < 6) {
    columns.push({ fecha: null, items: [] });
  }

  return columns.slice(0, 6);
}

function buildMatrix(
  itemsOrder: string[],
  entregas: MatrixColumn[],
  devoluciones: MatrixColumn[],
) {
  return itemsOrder.map((itemName) => {
    const entrega = Array.from({ length: 6 }, (_, idx) => {
      const found = entregas[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });
    const devolucion = Array.from({ length: 6 }, (_, idx) => {
      const found = devoluciones[idx]?.items.find((item) => item.nombre === itemName);
      return found?.cantidad ?? 0;
    });

    return {
      item: itemName,
      entrega,
      entregaTotal: entrega.reduce((acc, value) => acc + value, 0),
      devolucion,
      devolucionTotal: devolucion.reduce((acc, value) => acc + value, 0),
    };
  });
}

function extractDateParts(value: string | Date | null | undefined) {
  if (!value) return null;

  if (typeof value === "string") {
    const isoLike = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoLike) {
      return {
        year: isoLike[1],
        month: isoLike[2],
        day: isoLike[3],
      };
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

function getDatePart(value: string | null | undefined, part: "day" | "month" | "year"): string {
  const parts = extractDateParts(value);
  if (!parts) return "";
  return parts[part];
}

function formatDisplayDate(value: string | Date | null | undefined) {
  const parts = extractDateParts(value);
  if (!parts) return "-";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

async function getHojaEntregaData(ci: string) {
  if (!isValidUruguayanCi(ci)) {
    return null;
  }

  const persona = await prisma.personal.findUnique({
    where: { ci },
    include: {
      rango: true,
      bateria: true,
      tallas: {
        include: { tallaTipo: true },
      },
      registros: {
        where: {
          tipo: { in: [TipoRegistro.ENTREGA, TipoRegistro.DEVOLUCION] },
        },
        orderBy: { fecha: "asc" },
        include: {
          items: {
            include: { item: true },
          },
        },
      },
      observaciones: {
        orderBy: { fecha: "asc" },
      },
    },
  });

  if (!persona) {
    return null;
  }

  const entregas = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.ENTREGA));
  const devoluciones = toSixColumns(persona.registros.filter((record) => record.tipo === TipoRegistro.DEVOLUCION));
  const itemCatalog = await prisma.item.findMany({
    where: { activo: true },
    orderBy: [{ ordenPdf: "asc" }, { nombre: "asc" }],
    select: { nombre: true },
  });

  const matrix = buildMatrix(
    itemCatalog.map((item) => item.nombre),
    entregas,
    devoluciones,
  );

  const firmaConfig = await getFirmaConfig();

  return {
    persona: {
      ci: persona.ci,
      apellido1: persona.apellido1,
      apellido2: persona.apellido2 || "",
      nombre1: persona.nombre1,
      nombre2: persona.nombre2 || "",
      fechaIngreso: persona.fechaIngreso?.toISOString() || null,
      rango: persona.rango.nombreCompleto,
      rangoAbreviacion: persona.rango.abreviacion,
      bateria: persona.bateria?.nombre || null,
      tallas: {
        PARKA: persona.tallas.find((t) => t.tallaTipo.nombre === "PARKA")?.tallaValor || "-",
        CAMISACO: persona.tallas.find((t) => t.tallaTipo.nombre === "CAMISACO")?.tallaValor || "-",
        PANTALON: persona.tallas.find((t) => t.tallaTipo.nombre === "PANTALON")?.tallaValor || "-",
        KEPI: persona.tallas.find((t) => t.tallaTipo.nombre === "KEPI")?.tallaValor || "-",
        CALZADO: persona.tallas.find((t) => t.tallaTipo.nombre === "CALZADO")?.tallaValor || "-",
      },
    },
    entregas: entregas.map((e) => ({ fecha: e.fecha })),
    devoluciones: devoluciones.map((d) => ({ fecha: d.fecha })),
    matrix,
    firmaConfig: {
      encargadoTexto: firmaConfig?.encargadoTexto || TEXTO_ENCARGADO,
      encargadoRango: firmaConfig?.encargadoRango || "Sargento",
      encargadoNombre: firmaConfig?.encargadoNombre || "NOMBRE",
      oficialTexto: firmaConfig?.oficialTexto || TEXTO_OFICIAL,
      oficialRango: firmaConfig?.oficialRango || "Oficial",
      oficialNombre: firmaConfig?.oficialNombre || "NOMBRE",
    },
    observaciones: buildHojaObservaciones(persona.observaciones, persona.registros),
  };
}

export default async function HojaEntregaPage({
  params,
  searchParams,
}: {
  params: Promise<{ ci: string }>;
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const { ci } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const ciValue = decodeURIComponent(ci).trim();
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const data = await getHojaEntregaData(ciValue);

  if (!data) {
    notFound();
  }

  const nombreCompleto = `${data.persona.apellido1} ${data.persona.apellido2 || ""}`.trim();
  const nombresCompleto = `${data.persona.nombre1} ${data.persona.nombre2 || ""}`.trim();
  const ciFormateado = formatUruguayanCi(data.persona.ci);
  const fechaImpresion = formatDisplayDate(new Date());
  const firmaAlistadoNombre = [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim();

  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Hoja de Entrega - {nombreCompleto}</title>
        {shouldAutoPrint ? (
          <script
            dangerouslySetInnerHTML={{
              __html:
                "window.addEventListener('load',()=>window.setTimeout(()=>window.print(),180));",
            }}
          />
        ) : null}
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            height: 100%;
          }

          body {
            font-family: "Courier New", "Liberation Mono", monospace;
            font-size: 9px;
            line-height: 1.1;
            color: #000;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 4mm 8mm 4mm 8mm;
            background: white;
            margin: 0 auto;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 3mm;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            margin: 0;
            background: white;
            table-layout: fixed;
          }

          th, td {
            border: 0.8px solid #000;
            padding: 2px 3px;
            text-align: center;
            vertical-align: middle;
            font-size: 7.5px;
            line-height: 1.2;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          th {
            font-weight: bold;
            background: #e8e8e8;
          }

          /* Encabezados principales */
          td[colspan="15"] {
            padding: 4px 6px;
          }

          /* Encabezados del documento */
          td[colspan="15"].center.bold {
            background: #f8f8f8;
            font-size: 9px;
            padding: 5px 6px;
            font-weight: bold;
          }

          /* Fila de datos personales */
          td[colspan="15"].left.bold {
            background: #fafafa;
            padding: 4px 8px;
            border-top: 2px solid #000;
            border-bottom: 1px solid #666;
          }

          /* Filas de datos personales y talles */
          tr:has(.bold) td {
            padding: 3px 4px;
          }

          /* Fila antes de la tabla de vestuario */
          tr:has(td[rowspan]) {
            border-top: 2px solid #000;
          }

          /* Encabezados VESTUARIO/DISTRIBUCIÓN/ENTREGA */
          .bold[rowspan],
          .bold[colspan="6"] {
            background: #d4d4d4;
            font-weight: bold;
            padding: 4px 3px;
            font-size: 8px;
          }

          /* Filas DIA/MES/AÑO */
          .date-label {
            background: #e3e3e3;
            font-weight: bold;
            text-align: center;
            font-size: 7px;
            padding: 2px;
          }

          .date-row td {
            background: #e3e3e3;
          }

          .vestuario-header-cell {
            padding: 0 !important;
          }

          .vestuario-header-stack {
            display: grid;
            grid-template-rows: 1.8fr 1fr 1fr 1fr;
            min-height: 72px;
          }

          .vestuario-main-label,
          .vestuario-date-marker {
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
          }

          .vestuario-main-label {
            padding: 4px;
            font-size: 8px;
          }

          .vestuario-date-marker {
            border-top: 0.8px solid #000;
            background: #e0e0e0;
            font-size: 6.8px;
            letter-spacing: 0.4px;
          }

          .center {
            text-align: center;
          }

          .left {
            text-align: left;
          }

          .personal-info-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 24px;
            align-items: center;
          }

          .personal-info-item {
            white-space: nowrap;
          }

          .header-info-top td {
            border-top: 2px solid #000;
          }

          .header-info-bottom td {
            border-bottom: 1px solid #666;
          }

          .header-info-cell {
            background: #fff;
            padding: 4px 8px !important;
            text-align: left;
          }

          .header-info-cell-compact {
            padding: 3px 6px !important;
          }

          .header-info-label {
            font-weight: bold;
          }

          .legacy-header-row {
            display: none;
          }

          .info-grid-shell {
            padding: 0 !important;
            background: #fff;
          }

          .info-grid-shell-top {
            border-top: 2px solid #000;
          }

          .info-grid-shell-bottom {
            border-bottom: 1px solid #666;
          }

          .info-grid {
            display: grid;
            width: 100%;
          }

          .info-grid-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .info-grid-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .info-grid-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }

          .info-grid-item {
            min-width: 0;
            padding: 4px 10px;
            text-align: left;
            background: #fff;
            border-right: 0.8px solid #000;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .info-grid-item-compact {
            padding: 3px 8px;
          }

          .info-grid-item:last-child {
            border-right: none;
          }

          .bold {
            font-weight: bold;
          }

          .item-row td {
            background: #fff;
          }

          .item-row td:first-child {
            background: #fff;
            text-align: left;
            padding-left: 6px;
            font-weight: 500;
            font-size: 7px;
            white-space: nowrap;
          }

          .item-row td.bold {
            background: #dcdcdc;
          }

          /* Columnas de totales */
          td.bold {
            background: #f0f0f0;
            font-weight: bold;
          }

          /* Columnas de años */
          td.bold[style*="font-size: 7px"] {
            background: #e8e8e8;
            font-weight: bold;
          }

          /* Sección de observaciones */
          .observaciones-cell {
            text-align: left;
            padding: 4px 6px;
            background: #fafafa;
            vertical-align: top;
          }

          .observaciones-cell > div:first-child {
            font-weight: bold;
            font-size: 8px;
            margin-bottom: 4px;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2px;
          }

          .observaciones-cell > div:not(:first-child) {
            font-size: 8px;
            margin-bottom: 3px;
            padding-left: 4px;
            line-height: 1.4;
          }

          .observaciones {
            margin-top: 8px;
            border: 1px solid #000;
            padding: 4px;
            min-height: 30px;
          }

          .obs-title {
            font-weight: bold;
            font-size: 8px;
            margin-bottom: 3px;
          }

          .obs-item {
            font-size: 8px;
            margin-bottom: 2px;
          }

          .firma-section {
            display: flex;
            flex-direction: column;
            margin-top: 0;
            padding: 0 1mm;
            gap: 4.5mm;
          }

          .firma-block {
            font-size: 8px;
            font-family: "Courier New", monospace;
            line-height: 1.25;
          }

          .firma-level-0 {
            margin-left: 0;
          }

          .firma-level-1 {
            margin-left: 8mm;
          }

          .firma-level-2 {
            margin-left: 16mm;
          }

          .firma-title {
            margin-bottom: 1px;
          }

          .firma-role {
            font-weight: bold;
          }

          .firma-name {
            font-size: 8px;
          }

          .firma-inline-row {
            display: grid;
            grid-template-columns: max-content minmax(0, 1fr);
            column-gap: 12mm;
            align-items: baseline;
          }

          .firma-inline-name {
            min-width: 0;
          }

          @media print {
            @page {
              size: A4;
              margin: 0;
            }

            body {
              margin: 0;
              padding: 0;
            }

            .page {
              margin: 0;
              padding: 4mm 8mm 4mm 8mm;
              page-break-after: avoid;
            }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <table>
            <colgroup>
              <col style={{ width: "26%" }} />
              {Array.from({ length: 14 }, (_, idx) => (
                <col key={idx} style={{ width: "5.2857%" }} />
              ))}
            </colgroup>
            <tbody>
              {/* ENCABEZADO */}
              <tr>
                <td colSpan={15} className="center bold" style={{fontSize: "9px"}}>
                  Grupo &quot;Brig.Gral.Manuel Oribe&quot; de Artillería 105mm No.1.-
                </td>
              </tr>
              <tr>
                <td colSpan={15} className="center bold" style={{fontSize: "9px"}}>
                  {"ADMINISTRACI\u00d3N - S4"}
                </td>
              </tr>

              <tr>
                <td colSpan={15} className="info-grid-shell info-grid-shell-top">
                  <div className="info-grid info-grid-3">
                    <div className="info-grid-item">
                      <span className="header-info-label">Grado:</span> {data.persona.rango}
                    </div>
                    <div className="info-grid-item">
                      <span className="header-info-label">Apellidos:</span> {nombreCompleto}
                    </div>
                    <div className="info-grid-item">
                      <span className="header-info-label">Nombres:</span> {nombresCompleto}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={15} className="info-grid-shell">
                  <div className="info-grid info-grid-5">
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">Parka:</span> {data.persona.tallas.PARKA}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">Camisaco:</span> {data.persona.tallas.CAMISACO}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">{"Pantal\u00f3n:"}</span> {data.persona.tallas.PANTALON}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">{"Kep\u00ed:"}</span> {data.persona.tallas.KEPI}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">Calzado:</span> {data.persona.tallas.CALZADO}
                    </div>
                  </div>
                </td>
              </tr>
              <tr>
                <td colSpan={15} className="info-grid-shell info-grid-shell-bottom">
                  <div className="info-grid info-grid-4">
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">C.I:</span> {ciFormateado}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">{"Bater\u00eda:"}</span> {data.persona.bateria || "Cdo. y Serv."}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">Fecha Ingreso:</span> {data.persona.fechaIngreso ? 
                        `${getDatePart(data.persona.fechaIngreso, "day")}/${getDatePart(data.persona.fechaIngreso, "month")}/${getDatePart(data.persona.fechaIngreso, "year")}` 
                        : "-"}
                    </div>
                    <div className="info-grid-item info-grid-item-compact">
                      <span className="header-info-label">{"Fecha de emisi\u00f3n:"}</span> {fechaImpresion}
                    </div>
                  </div>
                </td>
              </tr>

              {/* DATOS PERSONALES */}
              <tr className="header-info-top legacy-header-row">
                <td colSpan={3} className="header-info-cell">
                  <span className="header-info-label">Grado:</span> {data.persona.rango}
                </td>
                <td colSpan={6} className="header-info-cell">
                  <span className="header-info-label">Apellidos:</span> {nombreCompleto}
                </td>
                <td colSpan={6} className="header-info-cell">
                  <span className="header-info-label">Nombres:</span> {nombresCompleto}
                </td>
              </tr>
              <tr className="legacy-header-row">
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">Parka:</span> {data.persona.tallas.PARKA}
                </td>
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">Camisaco:</span> {data.persona.tallas.CAMISACO}
                </td>
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">{"Pantal\u00f3n:"}</span> {data.persona.tallas.PANTALON}
                </td>
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">{"Kep\u00ed:"}</span> {data.persona.tallas.KEPI}
                </td>
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">Calzado:</span> {data.persona.tallas.CALZADO}
                </td>
              </tr>
              <tr className="header-info-bottom legacy-header-row">
                <td colSpan={3} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">C.I:</span> {ciFormateado}
                </td>
                <td colSpan={4} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">{"Bater\u00eda:"}</span> {data.persona.bateria || "Cdo. y Serv."}
                </td>
                <td colSpan={4} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">Fecha Ingreso:</span> {data.persona.fechaIngreso ? 
                    `${getDatePart(data.persona.fechaIngreso, "day")}/${getDatePart(data.persona.fechaIngreso, "month")}/${getDatePart(data.persona.fechaIngreso, "year")}` 
                    : "-"}
                </td>
                <td colSpan={4} className="header-info-cell header-info-cell-compact">
                  <span className="header-info-label">{"Fecha de emisi\u00f3n:"}</span> {fechaImpresion}
                </td>
              </tr>
              <tr className="legacy-header-row">
                <td colSpan={15} className="left bold" style={{fontSize: "8px"}}>
                  <div className="personal-info-row">
                    <span className="personal-info-item">Grado: {data.persona.rango}</span>
                    <span className="personal-info-item">Apellidos: {nombreCompleto}</span>
                    <span className="personal-info-item">Nombres: {nombresCompleto}</span>
                  </div>
                </td>
              </tr>

              {/* TALLES Y CI */}
              <tr className="legacy-header-row">
                <td className="bold">Parka:</td>
                <td>{data.persona.tallas.PARKA}</td>
                <td className="bold">Camisaco:</td>
                <td>{data.persona.tallas.CAMISACO}</td>
                <td className="bold">Pantalón:</td>
                <td>{data.persona.tallas.PANTALON}</td>
                <td className="bold">Kepí:</td>
                <td>{data.persona.tallas.KEPI}</td>
                <td className="bold">Calzado:</td>
                <td>{data.persona.tallas.CALZADO}</td>
                <td colSpan={5}></td>
              </tr>
              <tr className="legacy-header-row">
                <td className="bold" colSpan={2}>C.I: {ciFormateado}</td>
                <td colSpan={5}></td>
                <td colSpan={3} className="bold">Batería: {data.persona.bateria || "Cdo. y Serv."}</td>
                <td colSpan={5} className="bold">
                  Fecha Ingreso: {data.persona.fechaIngreso ? 
                    `${getDatePart(data.persona.fechaIngreso, "day")}/${getDatePart(data.persona.fechaIngreso, "month")}/${getDatePart(data.persona.fechaIngreso, "year")}` 
                    : "-"}
                </td>
              </tr>

              {/* TABLA VESTUARIO */}
              <tr>
                <td className="center bold">EQUIPO</td>
                <td colSpan={6} className="center bold">ENTREGAS</td>
                <td className="center bold" rowSpan={4}>T</td>
                <td colSpan={6} className="center bold">DEVOLUCIONES</td>
                <td className="center bold" rowSpan={4}>T</td>
              </tr>
              
              {/* FILA DÍA */}
              <tr className="date-row">
                <td className="date-label">DÍA</td>
                {data.entregas.map((col, i) => (
                  <td key={`edia-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "day") : ""}
                  </td>
                ))}
                {data.devoluciones.map((col, i) => (
                  <td key={`ddia-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "day") : ""}
                  </td>
                ))}
              </tr>
              
              {/* FILA MES */}
              <tr className="date-row">
                <td className="date-label">MES</td>
                {data.entregas.map((col, i) => (
                  <td key={`emes-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "month") : ""}
                  </td>
                ))}
                {data.devoluciones.map((col, i) => (
                  <td key={`dmes-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "month") : ""}
                  </td>
                ))}
              </tr>
              
              {/* FILA AÑO */}
              <tr className="date-row">
                <td className="date-label">AÑO</td>
                {data.entregas.map((col, i) => (
                  <td key={`eano-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "year") : ""}
                  </td>
                ))}
                {data.devoluciones.map((col, i) => (
                  <td key={`dano-${i}`} className="date-label">
                    {col.fecha ? getDatePart(col.fecha, "year") : ""}
                  </td>
                ))}
              </tr>

              {/* FILAS DE ITEMS */}
              {data.matrix.map((row, idx) => (
                <tr key={idx} className="item-row">
                  <td className="left">{row.item}</td>
                  {row.entrega.slice(0, 6).map((qty, i) => (
                    <td key={`e-${i}`}>{qty || ""}</td>
                  ))}
                  <td className="bold">{row.entregaTotal}</td>
                  {row.devolucion.slice(0, 6).map((qty, i) => (
                    <td key={`d-${i}`}>{qty || ""}</td>
                  ))}
                  <td className="bold">{row.devolucionTotal}</td>
                </tr>
              ))}

              {/* OBSERVACIONES */}
              <tr>
                <td colSpan={15} className="left" style={{padding: "4px"}}>
                  <div className="obs-title">OBSERVACIONES</div>
                  {data.observaciones.map((obs, idx) => (
                    <div key={idx} className="obs-item">
                      {getDatePart(obs.fecha, "day")}/{getDatePart(obs.fecha, "month")}/{getDatePart(obs.fecha, "year")} - {obs.texto}
                    </div>
                  ))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* FIRMAS */}
          <div className="firma-section">
            <div className="firma-block firma-level-0">
              <div className="firma-title">Firma del alistado:</div>
              <div className="firma-role firma-level-1">{data.persona.rangoAbreviacion}</div>
              <div className="firma-name firma-level-2">{firmaAlistadoNombre}</div>
            </div>
            <div className="firma-block firma-level-1">
              <div className="firma-title">{data.firmaConfig.encargadoTexto}</div>
              <div className="firma-role firma-level-1">{data.firmaConfig.encargadoRango}</div>
              <div className="firma-name firma-level-2">{data.firmaConfig.encargadoNombre}</div>
            </div>
            <div className="firma-block firma-level-2">
              <div className="firma-title">{data.firmaConfig.oficialTexto}</div>
              <div className="firma-role firma-level-1">{data.firmaConfig.oficialRango}</div>
              <div className="firma-name firma-level-2">{data.firmaConfig.oficialNombre}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
