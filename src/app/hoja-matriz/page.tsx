import Image from "next/image";
import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import { compareRankAbbreviation } from "@/lib/rank-order";
import { SIN_BATERIA_LABEL, getHojaMatrixData } from "@/lib/hoja-matrix";
import type { HojaMatrixRow } from "@/types/views";

export const revalidate = 0;
export const metadata = {
  title: "Hoja Matriz",
};

const LEFT_COLUMNS_WIDTH_MM = 76;

type PrintableRow =
  | {
      kind: "grade";
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
  batteryLabel: string;
  rows: PrintableRow[];
};

function compareRowsByGrade(a: HojaMatrixRow, b: HojaMatrixRow) {
  const byGrado = compareRankAbbreviation(a.gradoAbreviacion, b.gradoAbreviacion);
  if (byGrado !== 0) return byGrado;

  const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
  if (byApellido1 !== 0) return byApellido1;

  const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", { sensitivity: "base" });
  if (byApellido2 !== 0) return byApellido2;

  const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
  if (byNombre1 !== 0) return byNombre1;

  const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
  if (byNombre2 !== 0) return byNombre2;

  return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
}

function buildDisplayName(row: HojaMatrixRow) {
  return [row.nombre1, row.apellido1].filter(Boolean).join(" ").trim();
}

function buildPrintableRows(rows: HojaMatrixRow[]) {
  const sorted = [...rows].sort(compareRowsByGrade);
  const printableRows: PrintableRow[] = [];
  let currentGrade = "";
  let counter = 0;

  for (const row of sorted) {
    if (row.gradoAbreviacion !== currentGrade) {
      currentGrade = row.gradoAbreviacion;
      printableRows.push({
        kind: "grade",
        label: row.gradoAbreviacion.toUpperCase(),
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
        batteryLabel: selectedBattery,
        rows: buildPrintableRows(rows),
      },
    ] satisfies PrintableSection[];
  }

  const grouped = new Map<string, HojaMatrixRow[]>();
  for (const row of rows) {
    const label = row.bateria ?? SIN_BATERIA_LABEL;
    const sectionRows = grouped.get(label);
    if (sectionRows) {
      sectionRows.push(row);
      continue;
    }
    grouped.set(label, [row]);
  }

  return Array.from(grouped.entries()).map(([batteryLabel, batteryRows]) => ({
    batteryLabel,
    rows: buildPrintableRows(batteryRows),
  }));
}

function buildGrandTotals(rows: HojaMatrixRow[], itemCount: number) {
  const totals = Array.from({ length: itemCount }, () => 0);
  for (const row of rows) {
    row.totales.forEach((value, index) => {
      totals[index] += value;
    });
  }
  return totals;
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
  const grandTotals = buildGrandTotals(data.rows, data.items.length);
  const itemColumnWidth = `calc((100% - ${LEFT_COLUMNS_WIDTH_MM}mm) / ${Math.max(data.items.length, 1)})`;

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
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
            background: #fff;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .matrix-document {
            width: 210mm;
            margin: 0 auto;
            padding: 6mm 5mm 8mm;
            background: #fff;
          }

          .matrix-sheet + .matrix-sheet {
            margin-top: 8mm;
            break-before: page;
            page-break-before: always;
          }

          .matrix-table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #000;
            background: #fff;
          }

          .matrix-table col.col-number {
            width: 10mm;
          }

          .matrix-table col.col-grade {
            width: 18mm;
          }

          .matrix-table col.col-name {
            width: 48mm;
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
            height: 52mm;
            padding: 0;
            background: #fff;
          }

          .identity-inner {
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2mm;
            padding: 2.5mm 2mm;
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
            font-size: 18pt;
            line-height: 1;
            font-weight: 700;
            text-align: center;
          }

          .item-header {
            height: 52mm;
            padding: 0;
            background: #fff;
          }

          .item-header span {
            display: inline-flex;
            align-items: center;
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
            background: #fff;
          }

          .equipment-header {
            font-size: 12pt;
            font-weight: 700;
            letter-spacing: 0.03em;
            background: #fff;
          }

          .grade-separator td {
            background: #dbe8f8;
            text-align: left;
            font-size: 15pt;
            font-weight: 700;
            padding: 2mm 3mm;
            height: 10mm;
          }

          .person-row td {
            height: 8mm;
            font-size: 8.75pt;
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
            font-size: 8.75pt;
            font-weight: 600;
          }

          .negative {
            color: #c00;
          }

          .total-row td {
            background: #fff200;
            font-weight: 700;
            color: #c00;
            height: 11mm;
            padding: 0.6mm 0.35mm;
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
            font-family: "Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif;
            font-size: 7.4pt;
            line-height: 1;
            letter-spacing: -0.02em;
            white-space: nowrap;
            font-variant-numeric: tabular-nums lining-nums;
          }

          .total-row .total-value-compact {
            font-size: 6.5pt;
            letter-spacing: -0.05em;
          }

          .empty-state {
            width: 210mm;
            margin: 0 auto;
            padding: 18mm 10mm;
            font-size: 12pt;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 5mm;
          }

          @media print {
            body {
              background: #fff;
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
            <section key={section.batteryLabel} className="matrix-sheet">
              <table className="matrix-table">
                <colgroup>
                  <col className="col-number" />
                  <col className="col-grade" />
                  <col className="col-name" />
                  {data.items.map((item) => (
                    <col key={item.itemId} style={{ width: itemColumnWidth }} />
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
                        <div className="identity-group">{'Grupo "Brig. Gral. Manuel Oribe" de Artilleria 105mm No.1.-'}</div>
                        <div className="identity-battery">{section.batteryLabel}</div>
                      </div>
                    </th>
                    {data.items.map((item) => (
                      <th key={item.itemId} className="item-header">
                        <span>{item.nombre}</span>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="left-header">N&ordm;</th>
                    <th className="left-header">Grado</th>
                    <th className="left-header">Nombre</th>
                    <th colSpan={data.items.length} className="equipment-header">
                      EQUIPO
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map((row, index) =>
                    row.kind === "grade" ? (
                      <tr key={`${section.batteryLabel}-grade-${row.label}-${index}`} className="grade-separator">
                        <td colSpan={3 + data.items.length}>{row.label}</td>
                      </tr>
                    ) : (
                      <tr key={`${section.batteryLabel}-person-${row.number}`} className="person-row">
                        <td className="number-cell">{row.number}</td>
                        <td className="grade-cell">{row.grade}</td>
                        <td className="name-cell">{row.name}</td>
                        {row.totales.map((value, valueIndex) => (
                          <td
                            key={`${section.batteryLabel}-${row.number}-${valueIndex}`}
                            className={`value-cell ${value < 0 ? "negative" : ""}`.trim()}
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ),
                  )}
                  {sectionIndex === sections.length - 1 ? (
                    <tr className="total-row">
                      <td colSpan={3} className="total-label">
                        TOTAL
                      </td>
                      {grandTotals.map((value, index) => (
                        <td key={`grand-total-${index}`} className={value < 0 ? "negative" : undefined}>
                          <span className={`total-value ${Math.abs(value) >= 100 ? "total-value-compact" : ""}`.trim()}>{value}</span>
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
