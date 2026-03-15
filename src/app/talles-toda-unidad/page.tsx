import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateTimeForDisplay } from "@/lib/date-helpers";
import { TEXTO_ENCARGADO, TEXTO_OFICIAL, getFirmaConfig } from "@/lib/firma-config";
import { tallasMap } from "@/lib/form-mappers";
import { prisma } from "@/lib/prisma";
import { comparePersonalByHierarchy, compareRanks } from "@/lib/rank-order";
import { TALLA_KEYS, TALLA_LABELS } from "@/lib/tallas";
import { TipoPersonal } from "@prisma/client";

export const revalidate = 0;
export const metadata = {
  title: "Talles de toda la unidad",
};

const SIN_BATERIA_LABEL = "Sin bateria";

function buildApellidos(persona: { apellido1: string; apellido2: string | null }) {
  return `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
}

function buildNombres(persona: { nombre1: string; nombre2: string | null }) {
  return `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
}

export default async function TallesTodaUnidadPage({
  searchParams,
}: {
  searchParams?: Promise<{ autoprint?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const shouldAutoPrint = resolvedSearchParams?.autoprint === "1";

  const [subalternos, oficialesSuboficiales, firmas] = await Promise.all([
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
    prisma.personal.findMany({
      where: { tipo: { in: [TipoPersonal.OFICIAL, TipoPersonal.SUBOFICIAL] } },
      select: {
        ci: true,
        tipo: true,
        apellido1: true,
        apellido2: true,
        nombre1: true,
        nombre2: true,
        rango: { select: { abreviacion: true, orden: true } },
        tallas: {
          include: { tallaTipo: true },
          orderBy: { tallaTipoId: "asc" },
        },
      },
    }),
    getFirmaConfig(),
  ]);

  subalternos.sort(comparePersonalByHierarchy);
  oficialesSuboficiales.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === TipoPersonal.OFICIAL ? -1 : 1;
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

  const generatedAt = formatDateTimeForDisplay(new Date());

  return (
    <>
      {shouldAutoPrint ? <AutoPrintOnLoad /> : null}
      <style>{`
        @page {
          size: A4 portrait;
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
          max-width: 198mm;
          margin: 0 auto;
          padding: 8mm;
          background: #ffffff;
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

        .group {
          margin-top: 4mm;
        }

        .group-title {
          margin: 0 0 2mm;
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .cards {
          display: grid;
          gap: 3mm;
        }

        .card {
          break-inside: avoid;
          border: 1px solid #111827;
          padding: 2.4mm 2.6mm;
        }

        .card-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 2mm;
          border-bottom: 1px solid #d6d3d1;
          padding-bottom: 1.5mm;
          margin-bottom: 1.5mm;
        }

        .index-badge {
          min-width: 8mm;
          text-align: center;
          font-size: 8.5pt;
          font-weight: 700;
          border: 1px solid #111827;
          padding: 0.6mm 1mm;
        }

        .identity {
          font-size: 9pt;
          line-height: 1.3;
        }

        .identity strong {
          font-size: 9.5pt;
        }

        .ci {
          font-family: "Courier New", monospace;
          font-size: 8.5pt;
        }

        .group-label {
          font-size: 8.5pt;
          text-align: right;
          font-weight: 700;
        }

        .tallas-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1.6mm;
        }

        .talla-item {
          border: 1px solid #d6d3d1;
          padding: 1.2mm;
          text-align: center;
          background: #fafaf9;
        }

        .talla-label {
          font-size: 7.5pt;
          font-weight: 700;
          text-transform: uppercase;
        }

        .talla-value {
          margin-top: 0.6mm;
          font-size: 9pt;
          font-weight: 700;
        }

        .firma-section {
          margin-top: 11mm;
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
          <h1 className="title">Talles de toda la unidad</h1>
          <p className="subtitle">Consolidado nominal de subalternos, oficiales y suboficiales.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total registros: ${subalternos.length + oficialesSuboficiales.length}`}</p>
        </header>

        <section className="group">
          <h2 className="group-title">{`Subalternos (${subalternos.length})`}</h2>
          <div className="cards">
            {subalternos.map((persona, index) => {
              const talles = tallasMap(persona.tallas);
              return (
                <article key={`sub-${persona.ci}`} className="card">
                  <div className="card-head">
                    <span className="index-badge">{index + 1}</span>
                    <div className="identity">
                      <strong>{`${persona.rango.abreviacion} ${buildApellidos(persona)}, ${buildNombres(persona)}`}</strong>
                      <div className="ci">{formatUruguayanCi(persona.ci)}</div>
                    </div>
                    <div className="group-label">{persona.subalterno?.bateria?.nombre ?? SIN_BATERIA_LABEL}</div>
                  </div>
                  <div className="tallas-grid">
                    {TALLA_KEYS.map((key) => (
                      <div key={`sub-${persona.ci}-${key}`} className="talla-item">
                        <div className="talla-label">{TALLA_LABELS[key]}</div>
                        <div className="talla-value">{talles[key] !== "-" ? talles[key] : "Sin dato"}</div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="group">
          <h2 className="group-title">{`Oficiales y suboficiales (${oficialesSuboficiales.length})`}</h2>
          <div className="cards">
            {oficialesSuboficiales.map((registro, index) => {
              const talles = tallasMap(registro.tallas);
              const groupLabel = registro.tipo === TipoPersonal.OFICIAL ? "Oficial" : "Suboficial";
              return (
                <article key={`oss-${registro.tipo}-${registro.ci}`} className="card">
                  <div className="card-head">
                    <span className="index-badge">{index + 1}</span>
                    <div className="identity">
                      <strong>{`${registro.rango.abreviacion} ${buildApellidos(registro)}, ${buildNombres(registro)}`}</strong>
                      <div className="ci">{formatUruguayanCi(registro.ci)}</div>
                    </div>
                    <div className="group-label">{groupLabel}</div>
                  </div>
                  <div className="tallas-grid">
                    {TALLA_KEYS.map((key) => (
                      <div key={`oss-${registro.tipo}-${registro.ci}-${key}`} className="talla-item">
                        <div className="talla-label">{TALLA_LABELS[key]}</div>
                        <div className="talla-value">{talles[key] !== "-" ? talles[key] : "Sin dato"}</div>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
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
