import type { CajaListadoPrintData } from "@/lib/etiquetado-data";

function buildPrintStyles() {
  return `
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
      background: #fff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .listado-cajas-sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm 9mm;
      background: #fff;
    }

    .listado-cajas-frame {
      position: relative;
      border: 1.1mm solid #2f2f2f;
      padding: 4.2mm;
      background: linear-gradient(145deg, #ffffff 0%, #f5f5ef 100%);
    }

    .listado-cajas-frame::before {
      content: "";
      position: absolute;
      inset: 1.6mm;
      border: 0.35mm solid #8f885e;
      pointer-events: none;
    }

    .listado-cajas-header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-end;
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
      background: #fff;
    }

    .listado-cajas-table thead {
      display: table-header-group;
    }

    .listado-cajas-table th {
      border: 0.35mm solid #8f8f8f;
      background: #efeee7;
      text-align: left;
      padding: 1.8mm 1.7mm;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .listado-cajas-table td {
      border: 0.3mm solid #b8b8b8;
      padding: 1.8mm 1.7mm;
      vertical-align: top;
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
    }

    .listado-col-estante {
      width: 12%;
      text-align: center;
    }

    .listado-col-caja {
      width: 16%;
      text-align: center;
      font-weight: 700;
    }

    .listado-col-contenido {
      width: 47%;
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
        background: #fff;
      }

      .listado-cajas-sheet {
        padding: 8mm 7mm;
      }
    }
  `;
}

export function ListadoCajasPrintStyles() {
  return <style dangerouslySetInnerHTML={{ __html: buildPrintStyles() }} />;
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
  return (
    <main className="listado-cajas-sheet">
      <section className="listado-cajas-frame">
        <header className="listado-cajas-header">
          <div>
            <p className="listado-cajas-subtitle">Deposito General</p>
            <h1 className="listado-cajas-title">Listado de Cajas</h1>
          </div>
          <p className="listado-cajas-meta">
            Total cajas: {cajas.length}
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
            {cajas.map((caja) => (
              <tr key={`listado-caja-${caja.codigoDepositoGeneral}`}>
                <td className="listado-col-piso">{caja.piso}</td>
                <td className="listado-col-estante">{caja.estanteria}</td>
                <td className="listado-col-caja">{caja.codigoDepositoGeneral}</td>
                <td className="listado-col-contenido">{caja.contenido}</td>
                <td className="listado-col-cantidad">{caja.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
