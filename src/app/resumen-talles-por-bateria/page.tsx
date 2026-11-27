import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { TipoPersonal } from "@/generated/prisma/client";

export const revalidate = 0;
export const metadata = {
  title: "Resumen de talles por bateria",
};

type ResumenTalla = {
  key: TallaKey;
  label: string;
  values: Array<{ talla: string; cantidad: number }>;
};

type ResumenBateria = {
  key: string;
  nombre: string;
  total: number;
  tallas: ResumenTalla[];
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

export default async function ResumenTallesPorBateriaPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const [baterias, personal] = await Promise.all([
    prisma.bateria.findMany({
      select: { bateriaId: true, nombre: true, orden: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
    }),
    prisma.personal.findMany({
      where: { rango: { tipo: TipoPersonal.SUBALTERNO }, baja: false },
      select: {
        ci: true,
        bateria: {
          select: {
            bateriaId: true,
          },
        },
        tallas: {
          include: { tallaTipo: true },
          orderBy: { tallaTipoId: "asc" },
        },
      },
    }),
  ]);

  const grupos = [
    ...baterias.map((b) => ({ key: String(b.bateriaId), nombre: b.nombre })),
    { key: "NONE", nombre: "Sin bateria" },
  ];
  const personalPorBateria = new Map<string, Array<(typeof personal)[number]>>();
  for (const grupo of grupos) personalPorBateria.set(grupo.key, []);

  for (const persona of personal) {
    const key =
      persona.bateria?.bateriaId !== null && persona.bateria?.bateriaId !== undefined
        ? String(persona.bateria.bateriaId)
        : "NONE";
    const bucket = personalPorBateria.get(key);
    if (bucket) {
      bucket.push(persona);
    } else {
      personalPorBateria.set(key, [persona]);
    }
  }

  const resumenPorBateria: ResumenBateria[] = grupos.map((grupo) => {
    const personas = personalPorBateria.get(grupo.key) ?? [];
    return {
      key: grupo.key,
      nombre: grupo.nombre,
      total: personas.length,
      tallas: buildTallasResumen(personas),
    };
  });

  const printedAt = new Date();
  const generatedAt = formatDateTimeForDisplay(printedAt);
  const institutionalPrintDate = formatInstitutionalPrintDate(printedAt);

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4 portrait;
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
          max-width: 198mm;
          margin: 0 auto;
          padding: 8mm;
          background: #f4f4f4;
        }

        .header {
          margin-bottom: 4mm;
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

        .section {
          margin-top: 3.5mm;
          break-inside: avoid;
          border: 1px solid #000;
        }

        .section-header {
          padding: 1.8mm 2.2mm;
          border-bottom: 1px solid #000;
          background: #e7e7e7;
        }

        .section-title {
          margin: 0;
          font-size: 10pt;
          font-weight: 700;
        }

        .section-subtitle {
          margin-top: 0.6mm;
          font-size: 7.5pt;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        th,
        td {
          border: 1px solid #000;
          padding: 1.4mm 1.2mm;
          text-align: center;
          vertical-align: middle;
        }

        thead th {
          background: #f5f5f5;
          font-size: 7.4pt;
          font-weight: 700;
        }

        tbody td {
          font-size: 8pt;
          font-weight: 700;
        }

        td.row-label {
          text-align: left;
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
          <h1 className="title">Resumen de talles por bateria</h1>
          <p className="subtitle">
            Frecuencia absoluta de talles para subalternos, desagregada por bateria.
          </p>
          <p className="meta">{`Generado: ${generatedAt} | Total subalternos: ${personal.length}`}</p>
        </header>

        {TALLA_KEYS.map((tallaKey) => {
          const columnLabels = Array.from(
            new Set(
              resumenPorBateria.flatMap((bateria) => {
                const tallaData = bateria.tallas.find((t) => t.key === tallaKey);
                return tallaData?.values.map((value) => value.talla) ?? [];
              })
            )
          ).sort((a, b) => {
            if (a === "Sin dato") return 1;
            if (b === "Sin dato") return -1;
            return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
          });

          return (
            <section key={`section-${tallaKey}`} className="section">
              <div className="section-header">
                <h2 className="section-title">{TALLA_LABELS[tallaKey]}</h2>
                <p className="section-subtitle">Frecuencia absoluta por bateria</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Bateria</th>
                    <th>Total</th>
                    {columnLabels.map((label) => (
                      <th key={`header-${tallaKey}-${label}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resumenPorBateria.map((bateria) => {
                    const tallaData = bateria.tallas.find((t) => t.key === tallaKey);
                    const tallaCounts = new Map(
                      tallaData?.values.map((value) => [value.talla, value.cantidad])
                    );
                    return (
                      <tr key={`row-${bateria.key}-${tallaKey}`}>
                        <td className="row-label">{bateria.nombre}</td>
                        <td>{bateria.total}</td>
                        {columnLabels.map((label) => (
                          <td key={`cell-${bateria.key}-${tallaKey}-${label}`}>
                            {tallaCounts.get(label) ?? 0}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </main>
    </>
  );
}
