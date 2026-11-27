import type { CajaListadoPrintData } from "@/lib/etiquetado-data";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";

function getContiguousRowSpans(
  rows: CajaListadoPrintData[],
  valueSelector: (row: CajaListadoPrintData) => string | number,
) {
  const spans = Array.from({ length: rows.length }, () => 0);
  let startIndex = 0;

  while (startIndex < rows.length) {
    const startValue = valueSelector(rows[startIndex]);
    let endIndex = startIndex + 1;
    while (endIndex < rows.length && valueSelector(rows[endIndex]) === startValue) {
      endIndex += 1;
    }

    spans[startIndex] = endIndex - startIndex;
    startIndex = endIndex;
  }

  return spans;
}

function toPrintUppercase(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text.toLocaleUpperCase("es-UY");
}

function buildPrintStyles() {
  return `
    ${INSTITUTIONAL_PRINT_HEADER_STYLES}

    * {
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: "Times New Roman", "Liberation Serif", serif;
      color: #101010;
      background: #f4f4f4;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .listado-cajas-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm 9mm;
      background: #f4f4f4;
    }

    .listado-cajas-frame {
      position: relative;
      border: 1.1mm solid #2f2f2f;
      padding: 4.2mm;
      background: #f4f4f4;
    }

    .listado-cajas-frame::before {
      content: "";
      position: absolute;
      inset: 1.6mm;
      border: 0.35mm solid #8f8f8f;
      pointer-events: none;
    }

    .listado-cajas-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-equipos: flex-end;
      justify-content: space-between;
      gap: 4mm;
      border-bottom: 0.5mm solid #8a8a8a;
      padding-bottom: 2.8mm;
      margin-bottom: 3.1mm;
    }

    .listado-cajas-title {
      font-size: 25px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .listado-cajas-subtitle {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #353535;
    }

    .listado-cajas-meta {
      font-size: 10px;
      text-align: right;
      color: #3c3c3c;
    }

    .listado-cajas-table {
      position: relative;
      z-index: 1;
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 11px;
      border: 0.4mm solid #8f8f8f;
      background: #f4f4f4;
    }

    .listado-cajas-table thead {
      display: table-header-group;
    }

    .listado-cajas-table th {
      border: 0.35mm solid #8f8f8f;
      background: #efefef;
      text-align: center;
      vertical-align: middle;
      padding: 1.8mm 1.7mm;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .listado-cajas-table td {
      border: 0.3mm solid #b8b8b8;
      padding: 1.8mm 1.7mm;
      text-align: center;
      vertical-align: middle;
      line-height: 1.25;
      word-break: break-word;
    }

    .listado-cajas-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .listado-col-piso {
      width: 11%;
      text-align: center;
      vertical-align: middle;
    }

    .listado-col-estante {
      width: 12%;
      text-align: center;
      vertical-align: middle;
    }

    .listado-col-caja {
      width: 16%;
      text-align: center;
      font-weight: 700;
      vertical-align: middle;
    }

    .listado-col-contenido {
      width: 47%;
      text-align: center;
    }

    .listado-col-cantidad {
      width: 14%;
      text-align: center;
      font-weight: 700;
    }

    .listado-empty {
      width: 210mm;
      margin: 0 auto;
      padding: 12mm 10mm;
    }

    .listado-empty-box {
      border: 0.45mm dashed #9b9b9b;
      padding: 14mm 8mm;
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #3e3e3e;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    @media print {
      body {
        background: #f4f4f4;
      }

      .listado-cajas-sheet {
        padding: 8mm 7mm;
      }
    }
  `;
}

export function ListadoCajasPrintStyles() {
  return <style>{buildPrintStyles()}</style>;
}

export function ListadoCajasPrintEmptyState({ message }: { message: string }) {
  return (
    <main className="listado-empty">
      <div className="listado-empty-box">{message}</div>
    </main>
  );
}

export function ListadoCajasPrintTable({
  cajas,
  generatedAt,
}: {
  cajas: CajaListadoPrintData[];
  generatedAt: string;
}) {
  const institutionalPrintDate = formatInstitutionalPrintDate();
  const totalCajas = new Set(cajas.map((caja) => caja.codigoDepositoGeneral)).size;
  const pisoRowSpans = getContiguousRowSpans(cajas, (row) => row.piso);
  const estanteRowSpans = getContiguousRowSpans(cajas, (row) => `${row.piso}::${row.estanteria}`);
  const cajaRowSpans = getContiguousRowSpans(
    cajas,
    (row) => `${row.piso}::${row.estanteria}::${String(row.codigoDepositoGeneral)}`,
  );

  return (
    <main className="listado-cajas-sheet">
      <section className="listado-cajas-frame">
        <InstitutionalPrintHeader printedAt={institutionalPrintDate} compact />
        <header className="listado-cajas-header">
          <div>
            <p className="listado-cajas-subtitle">Deposito General</p>
            <h1 className="listado-cajas-title">Listado de Cajas</h1>
          </div>
          <p className="listado-cajas-meta">
            Total cajas: {totalCajas}
            <br />
            Generado: {generatedAt}
          </p>
        </header>

        <table className="listado-cajas-table">
          <thead>
            <tr>
              <th className="listado-col-piso">Piso</th>
              <th className="listado-col-estante">Estante</th>
              <th className="listado-col-caja">ID Caja</th>
              <th className="listado-col-contenido">Contenido</th>
              <th className="listado-col-cantidad">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {cajas.map((caja, index) => (
              <tr key={`listado-caja-${caja.codigoDepositoGeneral}-${caja.contenido}-${index}`}>
                {pisoRowSpans[index] > 0 ? (
                  <td className="listado-col-piso" rowSpan={pisoRowSpans[index]}>
                    {caja.piso}
                  </td>
                ) : null}
                {estanteRowSpans[index] > 0 ? (
                  <td className="listado-col-estante" rowSpan={estanteRowSpans[index]}>
                    {caja.estanteria}
                  </td>
                ) : null}
                {cajaRowSpans[index] > 0 ? (
                  <td className="listado-col-caja" rowSpan={cajaRowSpans[index]}>
                    {caja.codigoDepositoGeneral}
                  </td>
                ) : null}
                <td className="listado-col-contenido">{toPrintUppercase(caja.contenido)}</td>
                <td className="listado-col-cantidad">{caja.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
