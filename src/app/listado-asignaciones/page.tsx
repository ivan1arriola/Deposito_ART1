import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { formatDateOnlyFromDate, formatDateTimeForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@/generated/prisma/client";

export const revalidate = 0;
export const metadata = {
  title: "Listado de Asignaciones a Recintos y Externos",
};

function buildStyles() {
  return `
    ${INSTITUTIONAL_PRINT_HEADER_STYLES}

    @page {
      size: A4 portrait;
      margin: 10mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #e7e7e7;
      color: #000;
      font-family: "Times New Roman", serif;
    }

    .sheet {
      width: 100%;
      max-width: 190mm;
      margin: 0 auto;
      padding: 8mm;
      background: #f4f4f4;
    }

    .title {
      margin: 0;
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .subtitle {
      margin: 1.6mm 0 0;
      font-size: 10pt;
      color: #2f2f2f;
      font-weight: 600;
    }

    .meta {
      margin: 2mm 0 0;
      font-size: 9pt;
    }

    .table-wrap {
      margin-top: 3.6mm;
      border: 1px solid #000;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    col.col-fecha { width: 12%; }
    col.col-clase { width: 12%; }
    col.col-destino { width: 30%; }
    col.col-equipos { width: 46%; }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #000;
      padding: 1.8mm 1.2mm;
      vertical-align: top;
    }

    thead th {
      background: #e7e7e7;
      font-size: 9pt;
      font-weight: 700;
      text-align: left;
    }

    tbody td {
      font-size: 9pt;
    }

    .empty-state {
      margin-top: 6mm;
      border: 1px dashed #8a8a8a;
      padding: 10mm 8mm;
      text-align: center;
      font-size: 12pt;
      font-weight: 600;
      color: #404040;
    }

    .firma-section {
      margin-top: 10mm;
      --firma-tab-size: 8mm;
      display: grid;
      gap: 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .firma-line {
      font-size: 8pt;
      line-height: 1.5;
      margin: 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .firma-strong {
      font-weight: 700;
    }

    .equipos-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .equipos-item {
      margin: 0;
      padding: 0;
    }

    @media screen {
      body {
        padding: 12px;
      }

      .sheet {
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      }
    }

    @media print {
      html, body {
        background: #f4f4f4;
      }

      .sheet {
        max-width: none;
        box-shadow: none;
        padding: 0;
      }
    }
  `;
}

export default async function ListadoAsignacionesPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const [movimientos, firmas] = await Promise.all([
    prisma.movimiento.findMany({
      where: {
        tipo: TipoMovimiento.ASIGNACION,
        OR: [{ destinatarioRecinto: { isNot: null } }, { destinatarioExterno: { isNot: null } }],
      },
      orderBy: [{ fecha: "desc" }, { movimientoId: "desc" }],
      include: {
        destinatarioRecinto: true,
        destinatarioExterno: {
          include: {
            personaExterna: true,
          },
        },
        items: {
          include: {
            item: {
              select: {
                nombre: true,
              },
            },
          },
        },
      },
    }),
    getFirmaConfig(),
  ]);

  const rows = movimientos
    .map((movimiento) => {
      let clase = "INTERNO";
      let nombre = "";

      if (movimiento.destinatarioRecinto) {
        clase = movimiento.destinatarioRecinto.clase;
        nombre = movimiento.destinatarioRecinto.nombre;
      } else if (movimiento.destinatarioExterno) {
        clase = "EXTERNO";
        nombre = movimiento.destinatarioExterno.personaExterna
          ? `${movimiento.destinatarioExterno.personaExterna.apellido} ${movimiento.destinatarioExterno.personaExterna.nombre}`.trim()
          : "Persona Externa";
      }

      return {
        movimientoId: movimiento.movimientoId.toString(),
        fecha: formatDateOnlyFromDate(movimiento.fecha) ?? "",
        clase,
        nombre,
        items: movimiento.items.map((detail) => ({
          item: detail.item.nombre,
          cantidad: detail.cantidad,
        })),
        observaciones: movimiento.observaciones,
      };
    })
    .filter((row) => row.nombre !== "");

  const printedAt = new Date();
  const generatedAt = formatDateTimeForDisplay(printedAt);
  const institutionalPrintDate = formatInstitutionalPrintDate(printedAt);
  const firmaLineas = buildFirmasInstitucionalesLineas({
    encargadoTexto: TEXTO_ENCARGADO,
    encargadoRango: firmas.encargadoRango,
    encargadoNombre: firmas.encargadoNombre,
    oficialTexto: TEXTO_OFICIAL,
    oficialRango: firmas.oficialRango,
    oficialNombre: firmas.oficialNombre,
  });

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{buildStyles()}</style>
      <main className="sheet">
        <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
        <h1 className="title">Listado de Asignaciones a Recintos y Externos</h1>
        <p className="subtitle">Historial cronológico de asignaciones activas</p>
        <p className="meta">{`Generado: ${generatedAt} | Movimientos listados: ${rows.length}`}</p>

        {rows.length === 0 ? (
          <section className="empty-state">No hay asignaciones registradas para imprimir.</section>
        ) : (
          <section className="table-wrap">
            <table>
              <colgroup>
                <col className="col-fecha" />
                <col className="col-clase" />
                <col className="col-destino" />
                <col className="col-equipos" />
              </colgroup>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Clase</th>
                  <th>Destino</th>
                  <th>Equipos (Cant)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`asignacion-print-${row.movimientoId}`}>
                    <td>{row.fecha}</td>
                    <td>{row.clase}</td>
                    <td>
                      <strong>{row.nombre}</strong>
                      {row.observaciones && <div style={{ fontSize: "8pt", marginTop: "2mm", color: "#444" }}>Obs: {row.observaciones}</div>}
                    </td>
                    <td>
                      <ul className="equipos-list">
                        {row.items.map((item, idx) => (
                          <li key={idx} className="equipos-item">
                            {item.cantidad > 0 ? `+${item.cantidad}` : item.cantidad} {item.item}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="firma-section">
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="listado-asignaciones"
          />
        </section>
      </main>
    </>
  );
}
