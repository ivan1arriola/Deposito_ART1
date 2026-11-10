import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { tallasMap } from "@/lib/form-mappers";
import { buildDynamicTallaColumnWidths } from "@/lib/personal-tallas-print-layout";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { TipoPersonal } from "@/generated/prisma/client";

export const revalidate = 0;

const SIN_BATERIA_LABEL = "Sin batería";

function buildApellidos(persona: { apellido1: string; apellido2: string | null }) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function buildNombres(persona: { nombre1: string; nombre2: string | null }) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

export async function generateMetadata() {
  return {
    title: "Tabla de Talles de Subalternos",
  };
}

export default async function TallasUnidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const personal = await prisma.personal.findMany({
    where: {
      baja: false,
      rango: { tipo: TipoPersonal.SUBALTERNO },
    },
    include: {
      rango: true,
      bateria: true,
      tallas: {
        include: { tallaTipo: true },
        orderBy: { tallaTipoId: "asc" },
      },
    },
  });

  personal.sort(comparePersonalByHierarchy);
  const personalRows = personal.map((persona) => ({
    ...persona,
    talles: tallasMap(persona.tallas),
  }));
  const tallaColumnWidths = buildDynamicTallaColumnWidths(
    40,
    personalRows.map((persona) => persona.talles),
  );

  const printedAt = new Date();
  const generatedAt = formatDateTimeForDisplay(printedAt);
  const institutionalPrintDate = formatInstitutionalPrintDate(printedAt);

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
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
          max-width: 277mm;
          margin: 0 auto;
          padding: 8mm;
          background: #f4f4f4;
        }

        .header {
          margin-bottom: 5mm;
        }

        .title {
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .subtitle {
          margin-top: 1.5mm;
          font-size: 10pt;
        }

        .meta {
          margin-top: 1.5mm;
          font-size: 9pt;
        }

        .table-wrap {
          border: 1px solid #000;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        col.col-numero { width: 4%; }
        col.col-ci { width: 10%; }
        col.col-grado { width: 8%; }
        col.col-apellidos { width: 13%; }
        col.col-nombres { width: 12%; }
        col.col-bateria { width: 13%; }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }

        th, td {
          border: 1px solid #000;
          padding: 1.8mm 1.6mm;
          vertical-align: middle;
        }

        thead th {
          background: #e7e7e7;
          font-size: 9pt;
          font-weight: 700;
          text-align: center;
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.1;
        }

        tbody td {
          font-size: 8.8pt;
        }

        tbody tr:nth-child(even) {
          background: #f5f5f5;
        }

        .cell-center {
          text-align: center;
        }

        .cell-strong {
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
          <h1 className="title">Tabla de Talles de Subalternos</h1>
          <p className="subtitle">Personal subalterno con talles registrados para parka, camisaco, pantalon, kepi y calzado.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total subalternos: ${personal.length}`}</p>
        </header>

        <div className="table-wrap">
          <table>
            <colgroup>
              <col className="col-numero" />
              <col className="col-ci" />
              <col className="col-grado" />
              <col className="col-apellidos" />
              <col className="col-nombres" />
              <col className="col-bateria" />
              {TALLA_KEYS.map((key) => (
                <col key={`col-${key}`} style={{ width: tallaColumnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Nº</th>
                <th>CI</th>
                <th>Grado</th>
                <th>Apellidos</th>
                <th>Nombres</th>
                <th>Batería</th>
                {TALLA_KEYS.map((key) => (
                  <th key={`head-${key}`}>{TALLA_LABELS[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personalRows.map((persona, index) => {
                return (
                  <tr key={persona.ci}>
                    <td className="cell-center cell-strong">{index + 1}</td>
                    <td className="cell-center">{formatUruguayanCi(persona.ci)}</td>
                    <td className="cell-center cell-strong">{persona.rango.abreviacion}</td>
                    <td>{buildApellidos(persona)}</td>
                    <td>{buildNombres(persona)}</td>
                    <td>{persona.bateria?.nombre ?? SIN_BATERIA_LABEL}</td>
                    {TALLA_KEYS.map((key) => (
                      <td key={`${persona.ci}-${key}`} className="cell-center">
                        {persona.talles[key] !== "-" ? persona.talles[key] : "Sin dato"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
