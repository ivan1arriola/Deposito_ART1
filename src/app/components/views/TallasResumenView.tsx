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
      const tallas: ResumenTalla[] = TALLA_KEYS.map((key) => {
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

      resumen.push({
        key: bateria.key,
        nombre: bateria.nombre,
        total: personas.length,
        tallas,
      });
    }

    return resumen;
  }, [baterias, personal]);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <h2 className="text-base font-semibold text-stone-900">Resumen de Tallas por Bateria</h2>
        <p className="mt-1 text-xs text-stone-600">
          Conteo de tallas por bateria y tipo de prenda. Incluye el grupo Sin bateria cuando corresponde.
        </p>
      </article>

      {TALLA_KEYS.map((tallaKey) => {
        const firstBateriaWithData = resumenTallasPorBateria.find((bateria) => {
          const tallaData = bateria.tallas.find((t) => t.key === tallaKey);
          return (tallaData?.values.length ?? 0) > 0;
        });
        const hasAnyData = resumenTallasPorBateria.some((bateria) => {
          const tallaData = bateria.tallas.find((t) => t.key === tallaKey);
          return (tallaData?.values.length ?? 0) > 0;
        });

        return (
          <article key={`talla-section-${tallaKey}`} className="ej-card rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">{TALLA_LABELS[tallaKey]}</h3>
                <p className="mt-1 text-xs text-stone-600">Distribución de tallas por bateria</p>
              </div>
              {!hasAnyData && (
                <span className="rounded-full border border-stone-300 bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500">
                  Sin datos
                </span>
              )}
            </div>

            {hasAnyData ? (
              <div className="overflow-auto rounded-lg border border-stone-200">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                        Bateria
                      </th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                        Total
                      </th>
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                        Tallas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenTallasPorBateria.map((bateria, rowIndex) => {
                      const talla = bateria.tallas.find((t) => t.key === tallaKey);
                      if (!talla || talla.values.length === 0) return null;

                      const maxCantidad = talla.values.reduce(
                        (max, value) => (value.cantidad > max ? value.cantidad : max),
                        0
                      );

                      return (
                        <tr key={`row-${bateria.key}-${tallaKey}`} className={rowIndex % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
                          <td className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">{bateria.nombre}</td>
                          <td className="border-b border-stone-200 px-3 py-3">
                            <span
                              className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                                bateria.total > 0 ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                              }`}
                            >
                              {bateria.total}
                            </span>
                          </td>
                          <td className="border-b border-stone-200 px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {talla.values.map((value) => {
                                const isTop = maxCantidad > 0 && value.cantidad === maxCantidad;
                                const isSinDato = value.talla === "Sin dato";
                                return (
                                  <span
                                    key={`chip-${bateria.key}-${tallaKey}-${value.talla}`}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${
                                      isSinDato
                                        ? "border-stone-300 bg-stone-100 text-stone-600"
                                        : isTop
                                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                                          : "border-blue-300 bg-blue-50 text-blue-800"
                                    }`}
                                  >
                                    <span>{value.talla}</span>
                                    <span className={`rounded-sm px-1 ${isSinDato ? "bg-stone-200" : isTop ? "bg-emerald-200" : "bg-blue-200"}`}>
                                      {value.cantidad}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-8">
                <p className="text-xs text-stone-500">No hay datos para esta prenda</p>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
