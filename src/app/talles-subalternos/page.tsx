import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { TipoPersonal } from "@prisma/client";

export const revalidate = 0;
export const metadata = {
  title: "Talles de Subalternos",
};

const SIN_BATERIA_LABEL = "Sin bateria";

function buildApellidos(persona: { apellido1: string; apellido2: string | null }) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function buildNombres(persona: { nombre1: string; nombre2: string | null }) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

export default async function TallesSubalternosPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const [personal, firmas] = await Promise.all([
    prisma.personal.findMany({
      where: { tipo: TipoPersonal.SUBALTERNO },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { abreviacion: true, orden: true } },
        subalterno: {
          select: {
            bateria: { select: { nombre: true } },
          },
        },
        tallas: {
          include: { tallaTipo: true },
          orderBy: { tallaTipoId: "asc" },
        },
      },
    }),
    getFirmaConfig(),
  ]);

  personal.sort(comparePersonalByHierarchy);
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
          margin: 0;
          font-size: 17pt;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .subtitle,
        .meta {
          margin-top: 1mm;
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

        thead {
          display: table-header-group;
        }

        th,
        td {
          border: 1px solid #000;
          padding: 1.3mm 1.1mm;
          vertical-align: middle;
        }

        th {
          background: #f5f5f5;
          font-size: 10pt;
          font-weight: 700;
          text-align: left;
        }

        td {
          font-size: 10pt;
        }

        tr {
          break-inside: avoid;
        }

        .col-index {
          width: 6%;
          font-weight: 700;
          text-align: center;
        }

        .col-grado {
          width: 10%;
          font-weight: 700;
          text-align: center;
        }

        .col-nombre {
          width: 18%;
        }

        .col-apellido {
          width: 20%;
        }

        .col-bateria {
          width: 10%;
          text-align: center;
        }

        .talla-value {
          font-weight: 700;
          text-align: center;
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
          <h1 className="title">Talles de subalternos</h1>
          <p className="subtitle">Listado nominal de talles, uno por uno, para personal subalterno.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total subalternos: ${personal.length}`}</p>
        </header>

        <section className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "6%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "10%" }} />
              {TALLA_KEYS.map((key) => (
                <col key={`col-${key}`} style={{ width: "7.2%" }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Grado</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Bateria</th>
                {TALLA_KEYS.map((key) => (
                  <th key={`head-${key}`}>{TALLA_LABELS[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personal.map((persona, index) => {
                const talles = tallasMap(persona.tallas);
                return (
                  <tr key={persona.ci}>
                    <td className="col-index">{index + 1}</td>
                    <td className="col-grado">{persona.rango.abreviacion}</td>
                    <td className="col-nombre">{buildNombres(persona)}</td>
                    <td className="col-apellido">{buildApellidos(persona)}</td>
                    <td className="col-bateria">{persona.subalterno?.bateria?.nombre ?? SIN_BATERIA_LABEL}</td>
                    {TALLA_KEYS.map((key) => (
                      <td key={`${persona.ci}-${key}`} className="talla-value">
                        {talles[key] !== "-" ? talles[key] : "Sin dato"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="firma-section">
          {firmaLineas.map((linea) => (
            <div
              key={linea.key}
              className={`firma-line${linea.isBold ? " firma-strong" : ""}`}
              style={{ marginLeft: `calc(${linea.indentLevel} * var(--firma-tab-size))` }}
            >
              {linea.text}
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
