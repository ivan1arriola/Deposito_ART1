import Image from "next/image";
import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { compareRanks } from "@/lib/rank-order";
import { SIN_BATERIA_LABEL, getHojaMatrixData } from "@/lib/hoja-matrix";
import type { HojaMatrixRow } from "@/types/views";

export const revalidate = 0;

const LEFT_COLUMNS_WIDTH_MM = 68;

type PrintableRow =
  | {
      kind: "grade";
      label: string;
    }
  | {
      kind: "battery";
      label: string;
    }
  | {
      kind: "person";
      number: number;
      grade: string;
      name: string;
      totales: number[];
    };

type PrintableSection = {
  headingLabel: string;
  rows: PrintableRow[];
};

function compareRowsByIdentity(a: HojaMatrixRow, b: HojaMatrixRow) {
  const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
  if (byApellido1 !== 0) return byApellido1;

  const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", {
    sensitivity: "base",
  });
  if (byApellido2 !== 0) return byApellido2;

  const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
  if (byNombre1 !== 0) return byNombre1;

  const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
  if (byNombre2 !== 0) return byNombre2;

  return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
}

function compareRowsByGrade(a: HojaMatrixRow, b: HojaMatrixRow) {
  const byGrado = compareRanks(
    { abreviacion: a.gradoAbreviacion, orden: a.gradoOrden },
    { abreviacion: b.gradoAbreviacion, orden: b.gradoOrden }
  );
  if (byGrado !== 0) return byGrado;

  return compareRowsByIdentity(a, b);
}

function compareRowsByGradeAndBattery(a: HojaMatrixRow, b: HojaMatrixRow) {
  const byGrado = compareRanks(
    { abreviacion: a.gradoAbreviacion, orden: a.gradoOrden },
    { abreviacion: b.gradoAbreviacion, orden: b.gradoOrden }
  );
  if (byGrado !== 0) return byGrado;

  const byBateriaOrden = compareOptionalOrder(a.bateriaOrden, b.bateriaOrden);
  if (byBateriaOrden !== 0) return byBateriaOrden;

  if (a.bateria && !b.bateria) return -1;
  if (!a.bateria && b.bateria) return 1;

  const byBateria = (a.bateria ?? SIN_BATERIA_LABEL).localeCompare(
    b.bateria ?? SIN_BATERIA_LABEL,
    "es",
    {
      sensitivity: "base",
    }
  );
  if (byBateria !== 0) return byBateria;

  return compareRowsByIdentity(a, b);
}

function buildDisplayName(row: HojaMatrixRow) {
  return [row.nombre1, row.apellido1].filter(Boolean).join(" ").trim();
}

function buildPrintableRows(rows: HojaMatrixRow[], includeBatterySeparators: boolean) {
  const sorted = [...rows].sort(
    includeBatterySeparators ? compareRowsByGradeAndBattery : compareRowsByGrade
  );
  const printableRows: PrintableRow[] = [];
  let currentGrade = "";
  let currentBattery = "";
  let counter = 0;

  for (const row of sorted) {
    const batteryLabel = row.bateria ?? SIN_BATERIA_LABEL;

    if (row.gradoAbreviacion !== currentGrade) {
      currentGrade = row.gradoAbreviacion;
      currentBattery = "";
      printableRows.push({
        kind: "grade",
        label: row.gradoAbreviacion.toUpperCase(),
      });
    }

    if (includeBatterySeparators && batteryLabel !== currentBattery) {
      currentBattery = batteryLabel;
      printableRows.push({
        kind: "battery",
        label: batteryLabel,
      });
    }

    counter += 1;
    printableRows.push({
      kind: "person",
      number: counter,
      grade: row.gradoAbreviacion,
      name: buildDisplayName(row),
      totales: row.totales,
    });
  }

  return printableRows;
}

function buildSections(rows: HojaMatrixRow[], selectedBattery: string | null) {
  if (selectedBattery) {
    return [
      {
        headingLabel: selectedBattery,
        rows: buildPrintableRows(rows, false),
      },
    ] satisfies PrintableSection[];
  }

  return [
    {
      headingLabel: "HOJA MATRIZ UNIDAD",
      rows: buildPrintableRows(rows, true),
    },
  ] satisfies PrintableSection[];
}

function buildGrandTotals(rows: HojaMatrixRow[], equipoCount: number) {
  const totals = Array.from({ length: equipoCount }, () => 0);
  for (const row of rows) {
    row.totales.forEach((value, index) => {
      totals[index] += value;
    });
  }
  return totals;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ bateria?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedBattery = resolvedSearchParams?.bateria?.trim() || null;

  return {
    title: selectedBattery ? `Hoja Matriz - ${selectedBattery}` : "Hoja Matriz Unidad",
  };
}

export default async function HojaMatrizPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; bateria?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedBattery = resolvedSearchParams?.bateria?.trim() || null;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const data = await getHojaMatrixData({ bateria: selectedBattery });
  const sections = buildSections(data.rows, selectedBattery);
  const grandTotals = buildGrandTotals(data.rows, data.equipos.length);
  const equipoColumnWidth = `calc((100% - ${LEFT_COLUMNS_WIDTH_MM}mm) / ${Math.max(data.equipos.length, 1)})`;
  const institutionalPrintDate = formatInstitutionalPrintDate(new Date());

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
          ${INSTITUTIONAL_PRINT_HEADER_STYLES}

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            width: 100%;
            min-height: 100%;
          }

          body {
            font-family: "Times New Roman", Times, serif;
            color: #000;
            background: #f4f4f4;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .matrix-document {
            width: 210mm;
            margin: 0 auto;
            padding: 6mm 4mm 8mm;
            background: #f4f4f4;
          }

          .matrix-sheet + .matrix-sheet {
            margin-top: 8mm;
            break-before: page;
            page-break-before: always;
          }

          .matrix-page-header {
            margin-bottom: 2.2mm;
          }

          .matrix-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #000;
            background: #f4f4f4;
          }

          .matrix-table col.col-number {
            width: 8mm;
          }

          .matrix-table col.col-grade {
            width: 16mm;
          }

          .matrix-table col.col-name {
            width: 44mm;
          }

          .matrix-table th,
          .matrix-table td {
            border: 1px solid #000;
            padding: 1.2mm 1mm;
            text-align: center;
            vertical-align: middle;
            font-size: 10pt;
          }

          .matrix-table thead th {
            font-weight: 700;
          }

          .identity-block {
            height: 45mm;
            padding: 0;
            background: #f4f4f4;
          }

          .identity-inner {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-equipos: center;
            justify-content: center;
            gap: 1.2mm;
            padding: 2.2mm 2mm;
          }

          .identity-logo {
            width: 34mm;
            height: auto;
            object-fit: contain;
          }

          .identity-group {
            font-size: 9pt;
            line-height: 1.1;
            text-align: center;
          }

          .identity-battery {
            font-size: 16pt;
            line-height: 1;
            font-weight: 700;
            text-align: center;
          }

          .equipo-header {
            height: 52mm;
            padding: 0;
            background: #f4f4f4;
          }

          .equipo-header span {
            display: inline-flex;
            align-equipos: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            white-space: nowrap;
            padding: 2mm 0;
            font-size: 7pt;
            line-height: 1;
          }

          .left-header {
            font-size: 12pt;
            padding: 2mm 1mm;
            background: #f4f4f4;
          }

          .equipment-header {
            font-size: 12pt;
            font-weight: 700;
            letter-spacing: 0.03em;
            background: #f4f4f4;
          }

          .grade-separator td {
            background: #efefef;
            text-align: left;
            font-size: 15pt;
            font-weight: 700;
            padding: 2mm 3mm;
            height: 10mm;
          }

          .battery-separator td {
            background: #f6f6f6;
            text-align: left;
            font-size: 11pt;
            font-weight: 700;
            padding: 1.6mm 3mm;
            height: 7mm;
          }

          .person-row td {
            height: 8.4mm;
            font-size: 9.5pt;
          }

          .person-row .number-cell,
          .person-row .grade-cell {
            font-size: 10pt;
            font-weight: 700;
          }

          .person-row .name-cell {
            text-align: left;
            white-space: nowrap;
            font-size: 12pt;
          }

          .person-row .value-cell {
            font-family: "Times New Roman", Times, serif;
            font-size: 10.4pt;
            line-height: 1.05;
            font-weight: 700;
            font-variant-numeric: tabular-nums lining-nums;
            letter-spacing: 0.01em;
          }

          .negative {
            color: #000;
          }

          .total-row td {
            background: #efefef;
            font-weight: 700;
            color: #000;
            height: 11mm;
            padding: 0.45mm 0.35mm;
          }

          .total-row .total-label {
            color: #000;
            text-align: center;
            letter-spacing: 0.03em;
            font-size: 17pt;
          }

          .total-row .total-value {
            display: block;
            width: 100%;
            font-family: "Times New Roman", Times, serif;
            font-size: 9.2pt;
            line-height: 1.05;
            letter-spacing: -0.01em;
            white-space: nowrap;
            font-variant-numeric: tabular-nums lining-nums;
          }

          .total-row .total-value-compact {
            font-size: 8.1pt;
            letter-spacing: -0.03em;
          }

          .empty-state {
            width: 210mm;
            margin: 0 auto;
            padding: 18mm 10mm;
            font-size: 12pt;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 4mm;
          }

          @media print {
            body {
              background: #f4f4f4;
            }

            .matrix-document {
              width: auto;
              margin: 0;
              padding: 0;
            }

            .matrix-sheet + .matrix-sheet {
              margin-top: 0;
            }

            .matrix-table thead {
              display: table-row-group;
            }

            tr,
            td,
            th {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        `}</style>
      {sections.length === 0 ? (
        <main className="empty-state">No hay datos para generar la hoja matriz.</main>
      ) : (
        <main className="matrix-document">
          {sections.map((section, sectionIndex) => (
            <section key={section.headingLabel} className="matrix-sheet">
              <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
              <table className="matrix-table">
                <colgroup>
                  <col className="col-number" />
                  <col className="col-grade" />
                  <col className="col-name" />
                  {data.equipos.map((equipo) => (
                    <col key={equipo.equipoId} style={{ width: equipoColumnWidth }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th colSpan={3} className="identity-block">
                      <div className="identity-inner">
                        <Image
                          className="identity-logo"
                          src="/assets/logo-artilleria.jpg"
                          alt="Logo de Artilleria"
                          width={200}
                          height={200}
                          unoptimized
                        />
                        <div className="identity-battery">{section.headingLabel}</div>
                      </div>
                    </th>
                    {data.equipos.map((equipo) => (
                      <th key={equipo.equipoId} className="equipo-header">
                        <span>{equipo.nombre.toLocaleUpperCase("es-UY")}</span>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="left-header">N&ordm;</th>
                    <th className="left-header">Grado</th>
                    <th className="left-header">Nombre</th>
                    <th colSpan={data.equipos.length} className="equipment-header">
                      EQUIPO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, index) =>
                    row.kind === "grade" ? (
                      <tr
                        key={`${section.headingLabel}-grade-${row.label}-${index}`}
                        className="grade-separator"
                      >
                        <td colSpan={3 + data.equipos.length}>{row.label}</td>
                      </tr>
                    ) : row.kind === "battery" ? (
                      <tr
                        key={`${section.headingLabel}-battery-${row.label}-${index}`}
                        className="battery-separator"
                      >
                        <td colSpan={3 + data.equipos.length}>{row.label}</td>
                      </tr>
                    ) : (
                      <tr
                        key={`${section.headingLabel}-person-${row.number}`}
                        className="person-row"
                      >
                        <td className="number-cell">{row.number}</td>
                        <td className="grade-cell">{row.grade}</td>
                        <td className="name-cell">{row.name}</td>
                        {row.totales.map((value, valueIndex) => (
                          <td
                            key={`${section.headingLabel}-${row.number}-${valueIndex}`}
                            className={`value-cell ${value < 0 ? "negative" : ""}`.trim()}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                  {sectionIndex === sections.length - 1 ? (
                    <tr className="total-row">
                      <td colSpan={3} className="total-label">
                        TOTAL
                      </td>
                      {grandTotals.map((value, index) => (
                        <td
                          key={`grand-total-${index}`}
                          className={value < 0 ? "negative" : undefined}
                        >
                          <span
                            className={`total-value ${Math.abs(value) >= 100 ? "total-value-compact" : ""}`.trim()}
                          >
                            {value}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          ))}
        </main>
      )}
    </>
  );
}
