import { AutoPrintOnLoad } from "@/app/components/AutoPrintOnLoad";
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
  const oficiales = oficialesSuboficiales.filter((registro) => registro.tipo === TipoPersonal.OFICIAL);
  const suboficiales = oficialesSuboficiales.filter((registro) => registro.tipo === TipoPersonal.SUBOFICIAL);

  const generatedAt = formatDateTimeForDisplay(new Date());

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
          margin: 0 0 1.6mm;
          font-size: 10pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .table-wrap {
          border: 1px solid #111827;
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
          border: 1px solid #111827;
          padding: 1.3mm 1.1mm;
          vertical-align: middle;
        }

        th {
          background: #f5f5f4;
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

        .col-extra {
          width: 10%;
          font-size: 10pt;
          font-weight: 700;
          text-align: center;
        }

        .talla-value {
          font-weight: 700;
          text-align: center;
        }

        .firma-section {
          margin-top: 6mm;
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
          <p className="subtitle">Consolidado nominal de oficiales, suboficiales y subalternos.</p>
          <p className="meta">{`Generado: ${generatedAt} | Total registros: ${subalternos.length + oficialesSuboficiales.length}`}</p>
        </header>

        <section className="group">
          <h2 className="group-title">{`Oficiales (${oficiales.length})`}</h2>
          <div className="table-wrap">
            <table>
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                {TALLA_KEYS.map((key) => (
                  <col key={`of-col-${key}`} style={{ width: "8%" }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Grado</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  {TALLA_KEYS.map((key) => (
                    <th key={`of-head-${key}`}>{TALLA_LABELS[key]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {oficiales.map((registro, index) => {
                  const talles = tallasMap(registro.tallas);
                  return (
                    <tr key={`of-${registro.tipo}-${registro.ci}`}>
                      <td className="col-index">{index + 1}</td>
                      <td className="col-grado">{registro.rango.abreviacion}</td>
                      <td className="col-nombre">{buildNombres(registro)}</td>
                      <td className="col-apellido">{buildApellidos(registro)}</td>
                      {TALLA_KEYS.map((key) => (
                        <td key={`of-${registro.tipo}-${registro.ci}-${key}`} className="talla-value">
                          {talles[key] !== "-" ? talles[key] : "Sin dato"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
        </section>

        <section className="group">
          <h2 className="group-title">{`Suboficiales (${suboficiales.length})`}</h2>
          <div className="table-wrap">
            <table>
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "22%" }} />
                {TALLA_KEYS.map((key) => (
                  <col key={`sof-col-${key}`} style={{ width: "8%" }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th>Nro</th>
                  <th>Grado</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  {TALLA_KEYS.map((key) => (
                    <th key={`sof-head-${key}`}>{TALLA_LABELS[key]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suboficiales.map((registro, index) => {
                  const talles = tallasMap(registro.tallas);
                  return (
                    <tr key={`sof-${registro.tipo}-${registro.ci}`}>
                      <td className="col-index">{index + 1}</td>
                      <td className="col-grado">{registro.rango.abreviacion}</td>
                      <td className="col-nombre">{buildNombres(registro)}</td>
                      <td className="col-apellido">{buildApellidos(registro)}</td>
                      {TALLA_KEYS.map((key) => (
                        <td key={`sof-${registro.tipo}-${registro.ci}-${key}`} className="talla-value">
                          {talles[key] !== "-" ? talles[key] : "Sin dato"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
        </section>

        <section className="group">
          <h2 className="group-title">{`Subalternos (${subalternos.length})`}</h2>
          <div className="table-wrap">
            <table>
              <colgroup>
                <col style={{ width: "6%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "10%" }} />
                {TALLA_KEYS.map((key) => (
                  <col key={`sub-col-${key}`} style={{ width: "7.2%" }} />
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
                    <th key={`sub-head-${key}`}>{TALLA_LABELS[key]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subalternos.map((persona, index) => {
                  const talles = tallasMap(persona.tallas);
                  return (
                    <tr key={`sub-${persona.ci}`}>
                      <td className="col-index">{index + 1}</td>
                      <td className="col-grado">{persona.rango.abreviacion}</td>
                      <td className="col-nombre">{buildNombres(persona)}</td>
                      <td className="col-apellido">{buildApellidos(persona)}</td>
                      <td className="col-extra">{persona.subalterno?.bateria?.nombre ?? SIN_BATERIA_LABEL}</td>
                      {TALLA_KEYS.map((key) => (
                        <td key={`sub-${persona.ci}-${key}`} className="talla-value">
                          {talles[key] !== "-" ? talles[key] : "Sin dato"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

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
        </section>
      </main>
    </>
  );
}
