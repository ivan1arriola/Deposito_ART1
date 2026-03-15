"use client";

import { useMemo, useState, type ReactNode } from "react";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import type { Bateria, OficialSuboficial, Personal } from "@/types/entities";
import { tallasMap } from "@/lib/form-mappers";

type ResumenTalla = { key: TallaKey; label: string; values: Array<{ talla: string; cantidad: number }> };
type ResumenBateria = { key: string; nombre: string; total: number; tallas: ResumenTalla[] };

type SectionId = "subalternos_unidad" | "subalternos_bateria" | "oficiales_suboficiales";

interface TallasResumenViewProps {
  personal: Personal[];
  baterias: Bateria[];
  oficialesSuboficiales: OficialSuboficial[];
}

type AccordionCardProps = {
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: ReactNode;
};

function AccordionCard({ title, description, open, onToggle, badge, children }: AccordionCardProps) {
  return (
    <article className="ej-card rounded-2xl p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 text-xs text-stone-600">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {badge ? (
            <span className="inline-flex min-w-[2.5rem] justify-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {badge}
            </span>
          ) : null}
          <svg
            className={`mt-1 h-4 w-4 shrink-0 text-stone-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open ? <div className="mt-4 space-y-4">{children}</div> : null}
    </article>
  );
}

export function TallasResumenView({ personal, baterias, oficialesSuboficiales }: TallasResumenViewProps) {
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    subalternos_unidad: true,
    subalternos_bateria: false,
    oficiales_suboficiales: false,
  });
  const [showMissingDataWarning, setShowMissingDataWarning] = useState(false);

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

    return bateriasConEtiqueta.map((bateria) => {
      const personas = personalPorBateria.get(bateria.key) ?? [];
      return {
        key: bateria.key,
        nombre: bateria.nombre,
        total: personas.length,
        tallas: buildTallasResumen(personas),
      } satisfies ResumenBateria;
    });
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

  const toggleSection = (section: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const subalternosConTallesIncompletos = useMemo(() => {
    return personal
      .map((persona) => {
        const talles = tallasMap(persona.tallas);
        const missing = TALLA_KEYS.filter((key) => !talles[key] || talles[key] === "-");
        if (missing.length === 0) return null;
        const apellidos = `${persona.apellido1} ${persona.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
        const nombres = `${persona.nombre1} ${persona.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
        const label = `${persona.rango.abreviacion} ${apellidos}, ${nombres}`.trim();
        return {
          id: persona.ci,
          label,
          missing,
        };
      })
      .filter((entry): entry is { id: string; label: string; missing: TallaKey[] } => entry !== null);
  }, [personal]);

  const oficialesSuboficialesConTallesIncompletos = useMemo(() => {
    return oficialesSuboficiales
      .map((registro) => {
        const talles = tallasMap(registro.tallas);
        const missing = TALLA_KEYS.filter((key) => !talles[key] || talles[key] === "-");
        if (missing.length === 0) return null;
        const apellidos = `${registro.apellido1} ${registro.apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
        const nombres = `${registro.nombre1} ${registro.nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
        const label = `${registro.gradoMando.abreviacion} ${apellidos}, ${nombres}`.trim();
        return {
          id: `${registro.tipo}-${registro.ci}`,
          label,
          missing,
        };
      })
      .filter((entry): entry is { id: string; label: string; missing: TallaKey[] } => entry !== null);
  }, [oficialesSuboficiales]);

  const totalPersonalConTallesIncompletos =
    subalternosConTallesIncompletos.length + oficialesSuboficialesConTallesIncompletos.length;

  const hasMissingDataWarning = totalPersonalConTallesIncompletos > 0;

  const renderResumenByPrenda = (resumen: ResumenBateria[]) => {
    return TALLA_KEYS.map((tallaKey) => {
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
          }),
        ),
      ).sort((a, b) => {
        if (a === "Sin dato") return 1;
        if (b === "Sin dato") return -1;
        return a.localeCompare(b, "es", { sensitivity: "base", numeric: true });
      });

      return (
        <article key={`talla-section-${tallaKey}`} className="rounded-xl border border-stone-200 bg-white p-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">{TALLA_LABELS[tallaKey]}</h3>
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
                              <td key={`cell-${bateria.key}-${tallaKey}-${label}`} className="border-b border-stone-200 px-3 py-3 text-sm font-semibold text-stone-900">
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
    });
  };

  const renderResumenPorBateria = (resumen: ResumenBateria[]) => {
    return resumen.map((bateria) => (
      <article key={`bateria-${bateria.key}`} className="rounded-xl border border-stone-200 bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-stone-900">{bateria.nombre}</h3>
            <p className="mt-1 text-xs text-stone-600">Total de subalternos considerados en este grupo</p>
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
                            <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Talla</th>
                            <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Cantidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {talla.values.map((value, index) => (
                            <tr key={`row-${bateria.key}-${talla.key}-${value.talla}`} className={index % 2 === 0 ? "bg-white" : "bg-stone-50/70"}>
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
    ));
  };

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-stone-900">Impresion de talles</h2>
          <p className="mt-1 text-xs text-stone-600">Accesos directos para imprimir nominas y resumenes de talles.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Subalternos</p>
            <p className="mt-1 text-xs text-emerald-900/80">Acciones de impresion para personal subalterno.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href="/talles-subalternos?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Nomina
              </a>
              <a
                href="/resumen-tallas-unidad?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200"
              >
                Resumen
              </a>
            </div>
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Oficiales y Suboficiales</p>
            <p className="mt-1 text-xs text-sky-900/80">Acciones de impresion para oficiales y suboficiales.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href="/talles-oficiales-suboficiales?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-sky-700 bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Nomina
              </a>
              <a
                href="/resumen-tallas-oficiales-suboficiales?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-sky-300 bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-900 transition hover:bg-sky-200"
              >
                Resumen
              </a>
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Toda la unidad</p>
            <p className="mt-1 text-xs text-amber-900/80">Consolidado general de toda la unidad.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <a
                href="/talles-toda-unidad?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-amber-700 bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
              >
                Nomina completa
              </a>
              <a
                href="/resumen-tallas-toda-unidad?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-200"
              >
                Resumen completo
              </a>
            </div>
          </section>

          <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Por bateria</p>
            <p className="mt-1 text-xs text-rose-900/80">Frecuencia absoluta de talles para cada bateria.</p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <a
                href="/resumen-talles-por-bateria?autoprint=1"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-rose-700 bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                Resumen por bateria
              </a>
            </div>
          </section>
        </div>
      </article>

      <AccordionCard
        title="Resumen de talles de subalternos (unidad)"
        description="Cantidades absolutas por prenda para subalternos de toda la unidad."
        open={openSections.subalternos_unidad}
        onToggle={() => toggleSection("subalternos_unidad")}
        badge={String(resumenUnidad.total)}
      >
        {renderResumenPorBateria([resumenUnidad])}
      </AccordionCard>

      <AccordionCard
        title="Resumen de talles de subalternos por bateria"
        description="Frecuencia absoluta por talla y bateria para subalternos."
        open={openSections.subalternos_bateria}
        onToggle={() => toggleSection("subalternos_bateria")}
        badge={String(resumenTallasPorBateria.length)}
      >
        {renderResumenByPrenda(resumenTallasPorBateria)}
      </AccordionCard>

      <AccordionCard
        title="Resumen de talles de oficiales y suboficiales"
        description="Cantidades por talla en ambos grupos."
        open={openSections.oficiales_suboficiales}
        onToggle={() => toggleSection("oficiales_suboficiales")}
        badge={String(oficialesSuboficiales.length)}
      >
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
                      <th className="border-b border-stone-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Suboficiales</th>
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
      </AccordionCard>

      {hasMissingDataWarning ? (
        <>
          <button
            type="button"
            onClick={() => setShowMissingDataWarning((prev) => !prev)}
            className="fixed bottom-4 right-4 z-[250] inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 shadow-lg transition hover:bg-amber-200 md:bottom-6 md:right-6"
            aria-expanded={showMissingDataWarning}
            aria-controls="missing-data-warning-panel"
            title="Hay personal con talles sin dato"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86l-7.5 13A1 1 0 003.66 18h16.68a1 1 0 00.87-1.5l-7.5-13a1 1 0 00-1.74 0z" />
            </svg>
            <span className="hidden sm:inline">Datos incompletos</span>
            <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-amber-700 px-1.5 py-0.5 text-[11px] font-bold text-white">
              {totalPersonalConTallesIncompletos}
            </span>
          </button>

          {showMissingDataWarning ? (
            <aside
              id="missing-data-warning-panel"
              className="fixed inset-x-3 bottom-20 z-[250] max-h-[62vh] overflow-auto rounded-2xl border border-amber-300 bg-white p-3 shadow-2xl md:inset-x-auto md:bottom-20 md:right-6 md:w-[26rem]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900">Advertencia de talles</p>
                  <p className="mt-1 text-xs text-stone-700">
                    Se detectaron {totalPersonalConTallesIncompletos} personas con uno o mas talles sin dato.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMissingDataWarning(false)}
                  className="rounded-lg border border-stone-300 px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                >
                  Cerrar
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {subalternosConTallesIncompletos.length > 0 ? (
                  <section>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Subalternos ({subalternosConTallesIncompletos.length})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {subalternosConTallesIncompletos.slice(0, 10).map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
                          <span className="font-semibold text-stone-900">{entry.label}</span>
                          <span className="ml-1">{`- Falta: ${entry.missing.map((key) => TALLA_LABELS[key]).join(", ")}`}</span>
                        </li>
                      ))}
                    </ul>
                    {subalternosConTallesIncompletos.length > 10 ? (
                      <p className="mt-1 text-[11px] text-stone-500">... y {subalternosConTallesIncompletos.length - 10} mas.</p>
                    ) : null}
                  </section>
                ) : null}

                {oficialesSuboficialesConTallesIncompletos.length > 0 ? (
                  <section>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                      Oficiales/Suboficiales ({oficialesSuboficialesConTallesIncompletos.length})
                    </p>
                    <ul className="mt-1 space-y-1">
                      {oficialesSuboficialesConTallesIncompletos.slice(0, 10).map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
                          <span className="font-semibold text-stone-900">{entry.label}</span>
                          <span className="ml-1">{`- Falta: ${entry.missing.map((key) => TALLA_LABELS[key]).join(", ")}`}</span>
                        </li>
                      ))}
                    </ul>
                    {oficialesSuboficialesConTallesIncompletos.length > 10 ? (
                      <p className="mt-1 text-[11px] text-stone-500">... y {oficialesSuboficialesConTallesIncompletos.length - 10} mas.</p>
                    ) : null}
                  </section>
                ) : null}
              </div>
            </aside>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
