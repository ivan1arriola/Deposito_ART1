"use client";

import { useMemo } from "react";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import type { Bateria, Personal } from "@/types/entities";
import { tallasMap } from "@/lib/form-mappers";

type ResumenTalla = { key: TallaKey; label: string; values: Array<{ talla: string; cantidad: number }>; sinDato: number };
type ResumenBateria = { key: string; nombre: string; total: number; tallas: ResumenTalla[] };

interface TallasResumenViewProps {
  personal: Personal[];
  baterias: Bateria[];
}

export function TallasResumenView({ personal, baterias }: TallasResumenViewProps) {
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
      {renderResumen(
        [resumenUnidad],
        "Resumen de Tallas de la Unidad",
        "Cantidades absolutas por prenda para toda la unidad. Incluye Sin dato cuando corresponde."
      )}
      {renderResumen(
        resumenTallasPorBateria,
        "Resumen de Tallas por Bateria",
        "Cantidades absolutas por prenda y bateria. Incluye el grupo Sin bateria cuando corresponde."
      )}
    </section>
  );
}
