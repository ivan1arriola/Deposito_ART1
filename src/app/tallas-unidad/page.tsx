import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { TipoPersonal } from "@prisma/client";

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
    title: "Tabla de Talles de la Unidad",
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
      tipo: TipoPersonal.SUBALTERNO,
    },
    include: {
      rango: true,
      subalterno: {
        include: {
          bateria: true,
        },
      },
      tallas: {
        include: { tallaTipo: true },
        orderBy: { tallaTipoId: "asc" },
      },
    },
  });

  personal.sort(comparePersonalByHierarchy);

  const generatedAt = formatDateTimeForDisplay(new Date());

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm;
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
          max-width: 277mm;
          margin: 0 auto;
          padding: 8mm;
          background: #ffffff;
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
          border: 1px solid #111827;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        col.col-numero { width: 4%; }
        col.col-ci { width: 10%; }
        col.col-grado { width: 8%; }
        col.col-apellidos { width: 14%; }
        col.col-nombres { width: 13%; }
        col.col-bateria { width: 14%; }
        col.col-talla { width: 7.4%; }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }

        th, td {
          border: 1px solid #111827;
          padding: 1.8mm 1.6mm;
          vertical-align: middle;
        }

        thead th {
          background: #e7e5e4;
          font-size: 9pt;
          font-weight: 700;
          text-align: center;
        }

        tbody td {
          font-size: 8.8pt;
        }

        tbody tr:nth-child(even) {
          background: #f5f5f4;
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
          <h1 className="title">Tabla de Talles de la Unidad</h1>
          <p className="subtitle">Personal completo con talles registrados para parka, camisaco, pantalon, kepi y calzado.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total personal: ${personal.length}`}</p>
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
              <col className="col-talla" />
              <col className="col-talla" />
              <col className="col-talla" />
              <col className="col-talla" />
              <col className="col-talla" />
            </colgroup>
            <thead>
              <tr>
                <th>Nº</th>
                <th>CI</th>
                <th>Grado</th>
                <th>Apellidos</th>
                <th>Nombres</th>
                <th>Batería</th>
                <th>Parka</th>
                <th>Camisaco</th>
                <th>Pantalón</th>
                <th>Kepi</th>
                <th>Calzado</th>
              </tr>
            </thead>
            <tbody>
              {personal.map((persona, index) => {
                const tallas = tallasMap(persona.tallas);

                return (
                  <tr key={persona.ci}>
                    <td className="cell-center cell-strong">{index + 1}</td>
                    <td className="cell-center">{formatUruguayanCi(persona.ci)}</td>
                    <td className="cell-center cell-strong">{persona.rango.abreviacion}</td>
                    <td>{buildApellidos(persona)}</td>
                    <td>{buildNombres(persona)}</td>
                    <td>{persona.subalterno?.bateria?.nombre ?? SIN_BATERIA_LABEL}</td>
                    <td className="cell-center">{tallas.PARKA !== "-" ? tallas.PARKA : "Sin dato"}</td>
                    <td className="cell-center">{tallas.CAMISACO !== "-" ? tallas.CAMISACO : "Sin dato"}</td>
                    <td className="cell-center">{tallas.PANTALON !== "-" ? tallas.PANTALON : "Sin dato"}</td>
                    <td className="cell-center">{tallas.KEPI !== "-" ? tallas.KEPI : "Sin dato"}</td>
                    <td className="cell-center">{tallas.CALZADO !== "-" ? tallas.CALZADO : "Sin dato"}</td>
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
