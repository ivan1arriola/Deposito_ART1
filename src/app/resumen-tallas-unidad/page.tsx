import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";

export const revalidate = 0;

type ResumenTalla = {
  key: TallaKey;
  label: string;
  values: Array<{ talla: string; cantidad: number }>;
};

function buildTallasResumen(personas: Array<{ tallas: Parameters<typeof tallasMap>[0] }>) {
  return TALLA_KEYS.map((key) => {
    const counter = new Map<string, number>();

    for (const persona of personas) {
      const tallasPersona = tallasMap(persona.tallas);
      const raw = tallasPersona[key];
      const value = raw && raw !== "-" ? raw : "Sin dato";
      counter.set(value, (counter.get(value) ?? 0) + 1);
    }

    const values = Array.from(counter.entries())
      .map(([talla, cantidad]) => ({ talla, cantidad }))
      .sort((a, b) => {
        if (a.talla === "Sin dato") return 1;
        if (b.talla === "Sin dato") return -1;
        return a.talla.localeCompare(b.talla, "es", { sensitivity: "base", numeric: true });
      });

    return {
      key,
      label: TALLA_LABELS[key],
      values,
    } satisfies ResumenTalla;
  });
}

export async function generateMetadata() {
  return {
    title: "Resumen de Talles de la Unidad",
  };
}

export default async function ResumenTallasUnidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const personal = await prisma.personal.findMany({
    select: {
      ci: true,
      tallas: {
        include: { tallaTipo: true },
        orderBy: { tallaTipoId: "asc" },
      },
    },
  });

  const firmas = await getFirmaConfig();
  const resumen = buildTallasResumen(personal);
  const generatedAt = new Date().toLocaleString("es-UY");

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }

        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #e7e5e4;
          color: #111827;
          font-family: "Times New Roman", serif;
        }

        .sheet {
          width: 100%;
          max-width: 198mm;
          margin: 0 auto;
          padding: 6mm;
          background: #ffffff;
        }

        .header {
          margin-bottom: 3mm;
        }

        .title {
          font-size: 16pt;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .subtitle,
        .meta {
          margin-top: 1mm;
          font-size: 8.5pt;
        }

        .sections {
          display: grid;
          gap: 2.2mm;
        }

        .section {
          break-inside: avoid;
          border: 1px solid #111827;
        }

        .section-header {
          padding: 1.6mm 2.2mm;
          border-bottom: 1px solid #111827;
          background: #e7e5e4;
        }

        .section-title {
          font-size: 10pt;
          font-weight: 700;
        }

        .section-subtitle {
          margin-top: 0.6mm;
          font-size: 7.2pt;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th, td {
          border: 1px solid #111827;
          padding: 1.2mm 0.9mm;
          text-align: center;
          vertical-align: middle;
        }

        thead th {
          background: #f5f5f4;
          font-size: 7.2pt;
          font-weight: 700;
        }

        tbody td {
          font-size: 7.8pt;
          font-weight: 700;
        }

        td.row-label {
          width: 16%;
          background: #fafaf9;
          font-weight: 700;
        }

        .firma-section {
          margin-top: 10mm;
          display: grid;
          gap: 3.2mm;
        }

        .firma-block {
          break-inside: avoid;
        }

        .firma-title {
          font-size: 8pt;
          line-height: 1.25;
        }

        .firma-role {
          margin-top: 1mm;
          font-size: 8pt;
          font-weight: 700;
        }

        .firma-name {
          margin-top: 0.8mm;
          font-size: 8pt;
        }

        .firma-level-1 {
          padding-left: 8mm;
        }

        .firma-level-2 {
          padding-left: 16mm;
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
            background: #ffffff;
          }

          .sheet {
            max-width: none;
            padding: 0;
            box-shadow: none;
          }
        }
      `}</style>
      <main className="sheet">
        <header className="header">
          <h1 className="title">Resumen de Talles de la Unidad</h1>
          <p className="subtitle">Cantidades absolutas de cada talle en la unidad, agrupadas por vestimenta.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total personal: ${personal.length}`}</p>
        </header>

        <section className="sections">
          {resumen.map((talla) => (
            <article key={talla.key} className="section">
              <div className="section-header">
                <h2 className="section-title">{talla.label}</h2>
                <p className="section-subtitle">Conteo absoluto por talle registrado en toda la unidad.</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Talles</th>
                    {talla.values.map((value) => (
                      <th key={`${talla.key}-${value.talla}`}>{value.talla}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="row-label">Cantidad</td>
                    {talla.values.map((value) => (
                      <td key={`${talla.key}-${value.talla}-cantidad`}>{value.cantidad}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </article>
          ))}
        </section>

        <section className="firma-section">
          <div className="firma-block firma-level-1">
            <div className="firma-title">{TEXTO_ENCARGADO}</div>
            <div className="firma-role firma-level-1">{firmas.encargadoRango}</div>
            <div className="firma-name firma-level-2">{firmas.encargadoNombre}</div>
          </div>
          <div className="firma-block firma-level-2">
            <div className="firma-title">{TEXTO_OFICIAL}</div>
            <div className="firma-role firma-level-1">{firmas.oficialRango}</div>
            <div className="firma-name firma-level-2">{firmas.oficialNombre}</div>
          </div>
        </section>
      </main>
    </>
  );
}
