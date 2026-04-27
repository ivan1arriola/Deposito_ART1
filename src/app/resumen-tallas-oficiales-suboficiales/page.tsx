import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { TipoPersonal } from "@/generated/prisma/client";

export const revalidate = 0;

type PrintTipoFilter = "todos" | "oficial" | "suboficial";

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

function parseTipoFilter(value: string | undefined): PrintTipoFilter {
  if (value === "oficial") return "oficial";
  if (value === "suboficial") return "suboficial";
  return "todos";
}

function tipoFilterConfig(filter: PrintTipoFilter) {
  if (filter === "oficial") {
    return {
      where: { rango: { tipo: TipoPersonal.OFICIAL } },
      title: "Resumen de Talles de Oficiales",
      subtitle: "Cantidades absolutas de cada talle para oficiales.",
      metaLabel: "Total oficiales",
    };
  }
  if (filter === "suboficial") {
    return {
      where: { rango: { tipo: TipoPersonal.SUBOFICIAL } },
      title: "Resumen de Talles de Suboficiales",
      subtitle: "Cantidades absolutas de cada talle para suboficiales.",
      metaLabel: "Total suboficiales",
    };
  }
  return {
    where: {
      rango: {
        tipo: {
          in: [TipoPersonal.OFICIAL, TipoPersonal.SUBOFICIAL],
        },
      },
    },
    title: "Resumen de Talles de Oficiales y Suboficiales",
    subtitle: "Cantidades absolutas de cada talle, agrupadas por vestimenta.",
    metaLabel: "Total oficiales/suboficiales",
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<{ tipo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const filter = parseTipoFilter(resolvedSearchParams?.tipo);
  const config = tipoFilterConfig(filter);

  return {
    title: config.title,
  };
}

export default async function ResumenTallasOficialesSuboficialesPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; tipo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const tipoFilter = parseTipoFilter(resolvedSearchParams?.tipo);
  const filterConfig = tipoFilterConfig(tipoFilter);

  const personal = await prisma.personal.findMany({
    where: filterConfig.where,
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
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm;
        }

        ${INSTITUTIONAL_PRINT_HEADER_STYLES}

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
          max-width: 198mm;
          margin: 0 auto;
          padding: 6mm;
          background: #f4f4f4;
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
          border: 1px solid #000;
        }

        .section-header {
          padding: 1.6mm 2.2mm;
          border-bottom: 1px solid #000;
          background: #e7e7e7;
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
          border: 1px solid #000;
          padding: 1.2mm 0.9mm;
          text-align: center;
          vertical-align: middle;
        }

        thead th {
          background: #f5f5f5;
          font-size: 7.2pt;
          font-weight: 700;
        }

        tbody td {
          font-size: 7.8pt;
          font-weight: 700;
        }

        td.row-label {
          width: 16%;
          background: #fafafa;
          font-weight: 700;
        }

        .firma-section {
          margin-top: 10mm;
          --firma-tab-size: 8mm;
          display: grid;
          gap: 0;
        }

        .firma-line {
          font-size: 8pt;
          line-height: 1.5;
          margin: 0;
          break-inside: avoid;
        }

        .firma-strong {
          font-weight: 700;
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
            padding: 0;
            box-shadow: none;
          }
        }
      `}</style>
      <main className="sheet">
        <InstitutionalPrintHeader printedAt={institutionalPrintDate} />
        <header className="header">
          <h1 className="title">{filterConfig.title}</h1>
          <p className="subtitle">{filterConfig.subtitle}</p>
          <p className="meta">{`Generado: ${generatedAt} | ${filterConfig.metaLabel}: ${personal.length}`}</p>
        </header>

        <section className="sections">
          {resumen.map((talla) => (
            <article key={talla.key} className="section">
              <div className="section-header">
                <h2 className="section-title">{talla.label}</h2>
                <p className="section-subtitle">Conteo absoluto por talle registrado en este grupo.</p>
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
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="resumen-oficiales-suboficiales"
          />
        </section>
      </main>
    </>
  );
}
