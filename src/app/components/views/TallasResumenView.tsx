"use client";

import { useMemo } from "react";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import type { Bateria, OficialSuboficial, Personal } from "@/types/entities";
import { tallasMap } from "@/lib/form-mappers";

type ResumenTalla = { key: TallaKey; label: string; values: Array<{ talla: string; cantidad: number }>; sinDato: number };
type ResumenBateria = { key: string; nombre: string; total: number; tallas: ResumenTalla[] };

interface TallasResumenViewProps {
  personal: Personal[];
  baterias: Bateria[];
  oficialesSuboficiales: OficialSuboficial[];
}

export function TallasResumenView({ personal, baterias, oficialesSuboficiales }: TallasResumenViewProps) {
  const buildTallasResumen = (personas: Personal[]) =>
    TALLA_KEYS.map((key) => {
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
        sinDato: counter.get("Sin dato") ?? 0,
      };
    });

  const resumenUnidad = useMemo<ResumenBateria>(() => {
    return {
      key: "ALL",
      nombre: "Unidad",
      total: personal.length,
      tallas: buildTallasResumen(personal),
    };
  }, [personal]);

  const resumenTallasPorBateria = useMemo(() => {
    const bateriasConEtiqueta = [
      ...baterias
        .map((bateria) => ({ key: String(bateria.bateriaId), nombre: bateria.nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
      { key: "NONE", nombre: "Sin bateria" },
    ];

    const personalPorBateria = new Map<string, Personal[]>();
    for (const bateria of bateriasConEtiqueta) {
      personalPorBateria.set(bateria.key, []);
    }

    for (const persona of personal) {
      const key = persona.bateriaId == null ? "NONE" : String(persona.bateriaId);
      const bucket = personalPorBateria.get(key);
      if (bucket) {
        bucket.push(persona);
        continue;
      }
      personalPorBateria.set(key, [persona]);
    }

    const resumen: ResumenBateria[] = [];

    for (const bateria of bateriasConEtiqueta) {
      const personas = personalPorBateria.get(bateria.key) ?? [];
      const tallas: ResumenTalla[] = buildTallasResumen(personas);

      resumen.push({
        key: bateria.key,
        nombre: bateria.nombre,
        total: personas.length,
        tallas,
      });
    }

    return resumen;
  }, [baterias, personal]);

  const resumenOficialesSuboficiales = useMemo(
    () =>
      TALLA_KEYS.map((key) => {
        const oficialesCounter = new Map<string, number>();
        const suboficialesCounter = new Map<string, number>();

        for (const registro of oficialesSuboficiales) {
          const talles = tallasMap(registro.tallas);
          const value = talles[key] && talles[key] !== "-" ? talles[key] : "Sin dato";
          const counter = registro.tipo === "OFICIAL" ? oficialesCounter : suboficialesCounter;
          counter.set(value, (counter.get(value) ?? 0) + 1);
        }

        const tallas = Array.from(new Set([...oficialesCounter.keys(), ...suboficialesCounter.keys()])).sort((a, b) => {
          if (a === "Sin dato") return 1;
          if (b === "Sin dato") return -1;
          return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
        });

        return {
          key,
          label: TALLA_LABELS[key],
          rows: tallas.map((talla) => {
            const oficiales = oficialesCounter.get(talla) ?? 0;
            const suboficiales = suboficialesCounter.get(talla) ?? 0;
            return { talla, oficiales, suboficiales, total: oficiales + suboficiales };
          }),
        };
      }),
    [oficialesSuboficiales],
  );

  const renderResumen = (resumen: ResumenBateria[], titulo: string, descripcion: string) => (
    <article className="ej-card rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
        <p className="mt-1 text-xs text-stone-600">{descripcion}</p>
      </div>

      {TALLA_KEYS.map((tallaKey) => {
        const showTotal = resumen.length > 1;
        const hasAnyData = resumen.some((bateria) => {
          const tallaData = bateria.tallas.find((t) => t.key === tallaKey);
          return (tallaData?.values.length ?? 0) > 0;
        });
        const columnLabels = Array.from(
          new Set(
            resumen.flatMap((bateria) => {
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
          <article key={`talla-section-${titulo}-${tallaKey}`} className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{TALLA_LABELS[tallaKey]}</h3>
                <p className="mt-1 text-xs text-stone-600">Cantidades absolutas por talla</p>
              </div>
              {!hasAnyData && (
                <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500">
                  Sin datos
                </span>
              )}
            </div>

            {hasAnyData ? (
              <>
                <div className="space-y-3 md:hidden">
                  {resumen.map((bateria) => {
                    const talla = bateria.tallas.find((t) => t.key === tallaKey);
                    const tallaCounts = new Map(talla?.values.map((value) => [value.talla, value.cantidad]));

                    return (
                      <article key={`card-${bateria.key}-${tallaKey}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-semibold text-stone-900">{bateria.nombre}</h4>
                          {showTotal ? (
                            <span
                              className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                bateria.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                              }`}
                            >
                              {bateria.total}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-700">
                          {columnLabels.map((label) => {
                            const value = tallaCounts.get(label) ?? 0;
                            return (
                              <div key={`mobile-${bateria.key}-${tallaKey}-${label}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                                <p className="text-[11px] font-semibold text-stone-500">{label}</p>
                                <p className="text-sm font-bold text-stone-900">{value > 0 ? value : "-"}</p>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden overflow-auto rounded-lg border border-stone-200 md:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                          {resumen.length === 1 ? "Unidad" : "Bateria"}
                        </th>
                        {showTotal ? (
                          <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                            Total
                          </th>
                        ) : null}
                        {columnLabels.map((label) => (
                          <th
                            key={`header-${tallaKey}-${label}`}
                            className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600"
                          >
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.map((bateria, rowIndex) => {
                        const talla = bateria.tallas.find((t) => t.key === tallaKey);
                        const tallaCounts = new Map(talla?.values.map((value) => [value.talla, value.cantidad]));

                        return (
                          <tr key={`row-${bateria.key}-${tallaKey}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                            <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{bateria.nombre}</td>
                            {showTotal ? (
                              <td className="border-b border-stone-200 px-3 py-3">
                                <span
                                  className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                    bateria.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                                  }`}
                                >
                                  {bateria.total}
                                </span>
                              </td>
                            ) : null}
                            {columnLabels.map((label) => {
                              const value = tallaCounts.get(label) ?? 0;
                              return (
                                <td
                                  key={`cell-${bateria.key}-${tallaKey}-${label}`}
                                  className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900"
                                >
                                  {value > 0 ? value : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-6">
                <p className="text-xs text-stone-500">No hay datos para esta prenda</p>
              </div>
            )}
          </article>
        );
      })}
    </article>
  );

  const renderResumenPorBateria = (resumen: ResumenBateria[], titulo: string, descripcion: string) => (
    <article className="ej-card rounded-2xl p-4">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-stone-900">{titulo}</h2>
        <p className="mt-1 text-xs text-stone-600">{descripcion}</p>
      </div>

      <div className="space-y-4">
        {resumen.map((bateria) => (
          <article key={`bateria-${bateria.key}`} className="rounded-xl border border-stone-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{bateria.nombre}</h3>
                <p className="mt-1 text-xs text-stone-600">Total de personal considerado en este grupo</p>
              </div>
              <span
                className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                  bateria.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                }`}
              >
                {bateria.total}
              </span>
            </div>

            <div className="space-y-3">
              {bateria.tallas.map((talla) => {
                const hasAnyData = talla.values.length > 0;

                return (
                  <article key={`bateria-${bateria.key}-talla-${talla.key}`} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-stone-900">{talla.label}</h4>
                        <p className="mt-1 text-xs text-stone-600">Cantidades absolutas por talla</p>
                      </div>
                      {!hasAnyData ? (
                        <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500">
                          Sin datos
                        </span>
                      ) : null}
                    </div>

                    {hasAnyData ? (
                      <>
                        <div className="grid grid-cols-2 gap-2 md:hidden">
                          {talla.values.map((value) => (
                            <div key={`mobile-${bateria.key}-${talla.key}-${value.talla}`} className="rounded-lg border border-stone-200 bg-white px-2 py-2">
                              <p className="text-[11px] font-semibold text-stone-500">{value.talla}</p>
                              <p className="text-sm font-bold text-stone-900">{value.cantidad}</p>
                            </div>
                          ))}
                        </div>
                        <div className="hidden overflow-auto rounded-lg border border-stone-200 md:block">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-stone-100">
                                <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                                  Talla
                                </th>
                                <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                                  Cantidad
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {talla.values.map((value, index) => (
                                <tr
                                  key={`row-${bateria.key}-${talla.key}-${value.talla}`}
                                  className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}
                                >
                                  <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{value.talla}</td>
                                  <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{value.cantidad}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-6">
                        <p className="text-xs text-stone-500">No hay datos para esta prenda</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </article>
  );

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-stone-900">Impresion de talles</h2>
          <p className="mt-1 text-xs text-stone-600">
            Genera una hoja nominal de talles o un resumen con cantidades absolutas por prenda para toda la unidad.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href="/tallas-unidad?autoprint=1"
            target="_blank"
            rel="noreferrer"
            className="ej-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Imprimir talles de la unidad
          </a>
          <a
            href="/resumen-tallas-unidad?autoprint=1"
            target="_blank"
            rel="noreferrer"
            className="ej-button-muted inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Imprimir resumen de talles
          </a>
        </div>
      </article>
      {renderResumenPorBateria(
        [resumenUnidad],
        "Resumen de Tallas de la Unidad",
        "Cantidades absolutas por prenda para toda la unidad. Incluye Sin dato cuando corresponde."
      )}
            {renderResumen(
        resumenTallasPorBateria,
        "Resumen de Tallas por Bateria",
        "Cantidades absolutas por prenda y bateria. Incluye el grupo Sin bateria cuando corresponde."
      )}
      <article className="ej-card rounded-2xl p-4">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-stone-900">Resumen de Talles Oficiales y Sub Oficiales</h2>
          <p className="mt-1 text-xs text-stone-600">Cantidades por talla en ambos grupos.</p>
        </div>
        <div className="space-y-4">
          {resumenOficialesSuboficiales.map((section) => (
            <article key={`resumen-ssoo-${section.key}`} className="rounded-xl border border-stone-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-stone-900">{section.label}</h3>
              {section.rows.length === 0 ? (
                <p className="mt-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">Sin datos.</p>
              ) : (
                <div className="mt-2 overflow-auto rounded-lg border border-stone-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-stone-100">
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Talla</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Oficiales</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Sub Oficiales</th>
                        <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, rowIndex) => (
                        <tr key={`${section.key}-${row.talla}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.talla}</td>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-900">{row.oficiales}</td>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm text-stone-900">{row.suboficiales}</td>
                          <td className="border-b border-stone-200 px-3 py-2 text-sm font-semibold text-stone-900">{row.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

