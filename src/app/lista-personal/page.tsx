import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import { compareOptionalOrder } from "@/lib/catalog-order";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy } from "@/lib/rank-order";
import { TipoPersonal } from "@prisma/client";

export const revalidate = 0;
export const metadata = {
  title: "Lista de Subalternos por Bateria",
};

function buildApellidos(persona: { apellido1: string; apellido2: string | null }) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function buildNombres(persona: { nombre1: string; nombre2: string | null }) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

type GrupoBateria = {
  key: string;
  nombre: string;
  orden: number | null;
  personal: Array<{
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    rango: {
      abreviacion: string;
      orden: number;
    };
  }>;
};

export default async function ListaPersonalPage({
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
    select: {
      ci: true,
      apellido1: true,
      apellido2: true,
      nombre1: true,
      nombre2: true,
      rango: {
        select: {
          abreviacion: true,
          orden: true,
        },
      },
      subalterno: {
        select: {
          bateria: {
            select: {
              bateriaId: true,
              nombre: true,
              orden: true,
            },
          },
        },
      },
    },
  });

  const grupos = new Map<string, GrupoBateria>();

  for (const persona of personal) {
    const bateria = persona.subalterno?.bateria ?? null;
    const key = bateria ? String(bateria.bateriaId) : "NONE";
    const group = grupos.get(key);

    if (!group) {
      grupos.set(key, {
        key,
        nombre: bateria?.nombre ?? "Sin batería",
        orden: bateria?.orden ?? null,
        personal: [persona],
      });
      continue;
    }

    group.personal.push(persona);
  }

  const grouped = Array.from(grupos.values()).sort((a, b) => {
    if (a.key === "NONE" && b.key !== "NONE") return 1;
    if (b.key === "NONE" && a.key !== "NONE") return -1;

    const byOrder = compareOptionalOrder(a.orden, b.orden);
    if (byOrder !== 0) return byOrder;
    return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  });

  for (const group of grouped) {
    group.personal.sort(comparePersonalByHierarchy);
  }

  const generatedAt = formatDateTimeForDisplay(new Date());

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4;
          margin: 10mm;
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
          max-width: 190mm;
          margin: 0 auto;
          padding: 8mm;
          background: #ffffff;
        }

        .title {
          margin: 0;
          font-size: 18pt;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .meta {
          margin: 2mm 0 0;
          font-size: 9pt;
        }

        .group {
          margin-top: 6mm;
        }

        .group:first-of-type {
          margin-top: 5mm;
        }

        .group-title {
          margin: 0 0 2mm;
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .table-wrap {
          border: 1px solid #111827;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        col.col-index { width: 9%; }
        col.col-grado { width: 16%; }
        col.col-nombre { width: 37.5%; }
        col.col-apellido { width: 37.5%; }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
        }

        th, td {
          border: 1px solid #111827;
          padding: 2mm 2.2mm;
          vertical-align: middle;
        }

        thead th {
          background: #e7e5e4;
          font-size: 9pt;
          font-weight: 700;
          text-align: left;
        }

        tbody td {
          font-size: 9pt;
        }

        tbody tr:nth-child(even) {
          background: #f5f5f4;
        }

        .center {
          text-align: center;
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
            box-shadow: none;
            padding: 0;
          }

          .group {
            break-before: page;
            page-break-before: always;
          }

          .group:first-of-type {
            break-before: auto;
            page-break-before: auto;
          }
        }
      `}</style>
      <main className="sheet">
        <h1 className="title">Lista de Subalternos por Bateria</h1>
        <p className="meta">{`Generado: ${generatedAt} | Total subalternos: ${personal.length}`}</p>

        {grouped.length === 0 ? (
          <section className="group">
            <p>No hay personal registrado.</p>
          </section>
        ) : (
          grouped.map((group) => (
            <section key={group.key} className="group">
              <h2 className="group-title">{`${group.nombre} (${group.personal.length})`}</h2>
              <div className="table-wrap">
                <table>
                  <colgroup>
                    <col className="col-index" />
                    <col className="col-grado" />
                    <col className="col-nombre" />
                    <col className="col-apellido" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="center">Nro</th>
                      <th>Grado</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.personal.map((persona, index) => (
                      <tr key={persona.ci}>
                        <td className="center">{index + 1}</td>
                        <td>{persona.rango.abreviacion}</td>
                        <td>{buildNombres(persona)}</td>
                        <td>{buildApellidos(persona)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </main>
    </>
  );
}
