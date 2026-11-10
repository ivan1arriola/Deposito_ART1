import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { FirmaLineasHtml } from "@/app/components/shared/FirmaLineasHtml";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { buildFirmasInstitucionalesLineas } from "@/lib/firma-lineas";
import { tallasMap } from "@/lib/form-mappers";
import { buildDynamicTallaColumnWidths } from "@/lib/personal-tallas-print-layout";
import { prisma } from "@/lib/prisma";
import { compareRanks } from "@/lib/rank-order";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { TipoPersonal } from "@/generated/prisma/client";

export const revalidate = 0;

type PrintTipoFilter = "todos" | "oficial" | "suboficial";

function buildApellidos(persona: { apellido1: string; apellido2: string | null }) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function buildNombres(persona: { nombre1: string; nombre2: string | null }) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
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
      title: "Talles de oficiales",
      subtitle: "Listado nominal de talles, uno por uno, para oficiales.",
      metaLabel: "Total oficiales",
    };
  }
  if (filter === "suboficial") {
    return {
      where: { rango: { tipo: TipoPersonal.SUBOFICIAL } },
      title: "Talles de suboficiales",
      subtitle: "Listado nominal de talles, uno por uno, para suboficiales.",
      metaLabel: "Total suboficiales",
    };
  }
  return {
    where: { rango: { tipo: { in: [TipoPersonal.OFICIAL, TipoPersonal.SUBOFICIAL] } }, baja: false },
    title: "Talles de oficiales y suboficiales",
    subtitle: "Listado nominal de talles, uno por uno, para oficiales y suboficiales.",
    metaLabel: "Total registros",
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

export default async function TallesOficialesSuboficialesPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string; tipo?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";
  const tipoFilter = parseTipoFilter(resolvedSearchParams?.tipo);
  const filterConfig = tipoFilterConfig(tipoFilter);

  const [registros, firmas] = await Promise.all([
    prisma.personal.findMany({
      where: { ...filterConfig.where, baja: false },
      select: {
        ci: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { abreviacion: true, orden: true, tipo: true } },
        tallas: {
          include: { tallaTipo: true },
          orderBy: { tallaTipoId: "asc" },
        },
      },
    }),
    getFirmaConfig(),
  ]);

  registros.sort((a, b) => {
    if (a.rango.tipo !== b.rango.tipo) return a.rango.tipo === TipoPersonal.OFICIAL ? -1 : 1;
    const byRank = compareRanks(a.rango, b.rango);
    if (byRank !== 0) return byRank;
    const byApellido1 = a.apellido1.localeCompare(b.apellido1, "es", { sensitivity: "base" });
    if (byApellido1 !== 0) return byApellido1;
    const byApellido2 = (a.apellido2 ?? "").localeCompare(b.apellido2 ?? "", "es", { sensitivity: "base" });
    if (byApellido2 !== 0) return byApellido2;
    const byNombre1 = a.nombre1.localeCompare(b.nombre1, "es", { sensitivity: "base" });
    if (byNombre1 !== 0) return byNombre1;
    const byNombre2 = (a.nombre2 ?? "").localeCompare(b.nombre2 ?? "", "es", { sensitivity: "base" });
    if (byNombre2 !== 0) return byNombre2;
    return a.ci.localeCompare(b.ci, "es", { sensitivity: "base" });
  });
  const registrosRows = registros.map((registro) => ({
    ...registro,
    talles: tallasMap(registro.tallas),
  }));
  const tallaColumnWidths = buildDynamicTallaColumnWidths(
    38,
    registrosRows.map((registro) => registro.talles),
  );

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
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.1;
        }

        td {
          font-size: 10pt;
        }

        tr {
          break-inside: avoid;
        }

        .col-index {
          font-weight: 700;
          text-align: center;
        }

        .col-grado {
          font-weight: 700;
          text-align: center;
        }

        .col-tipo {
          font-size: 10pt;
          font-weight: 700;
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
          <h1 className="title">{filterConfig.title}</h1>
          <p className="subtitle">{filterConfig.subtitle}</p>
          <p className="meta">{`Generado: ${generatedAt} | ${filterConfig.metaLabel}: ${registros.length}`}</p>
        </header>

        <section className="table-wrap">
          <table>
            <colgroup>
              <col style={{ width: "5%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "8%" }} />
              {TALLA_KEYS.map((key) => (
                <col key={`col-${key}`} style={{ width: tallaColumnWidths[key] }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>Nro</th>
                <th>Grado</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Tipo</th>
                {TALLA_KEYS.map((key) => (
                  <th key={`head-${key}`}>{TALLA_LABELS[key]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrosRows.map((registro, index) => {
                const typeLabel = registro.rango.tipo === TipoPersonal.OFICIAL ? "Oficial" : "Suboficial";
                return (
                  <tr key={`${registro.rango.tipo}-${registro.ci}`}>
                    <td className="col-index">{index + 1}</td>
                    <td className="col-grado">{registro.rango.abreviacion}</td>
                    <td className="col-nombre">{buildNombres(registro)}</td>
                    <td className="col-apellido">{buildApellidos(registro)}</td>
                    <td className="col-tipo">{typeLabel}</td>
                    {TALLA_KEYS.map((key) => (
                      <td key={`${registro.ci}-${key}`} className="talla-value">
                        {registro.talles[key] !== "-" ? registro.talles[key] : "Sin dato"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="firma-section">
          <FirmaLineasHtml
            lineas={firmaLineas}
            lineClassName="firma-line"
            lineStrongClassName="firma-strong"
            keyPrefix="oficiales-suboficiales"
          />
        </section>
      </main>
    </>
  );
}
