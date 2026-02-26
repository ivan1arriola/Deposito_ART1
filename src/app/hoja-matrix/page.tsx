"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "./hoja-matriz.module.css";

type HojaMatrizItem = {
  itemId: string;
  nombre: string;
};

type HojaMatrizRow = {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  grado: string;
  gradoAbreviacion?: string;
  totales: number[];
  totalGeneral: number;
};

type HojaMatrizData = {
  generatedAt: string;
  items: HojaMatrizItem[];
  rows: HojaMatrizRow[];
};

type GradeGroup = {
  gradeLabel: string;
  rows: HojaMatrizRow[];
};

type BateriaGroup = {
  bateria: string;
  rows: HojaMatrizRow[];
  grades: GradeGroup[];
  itemTotals: number[];
  totalGeneral: number;
};

async function api<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error("El servidor devolvio una respuesta invalida.");
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data && typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : "No se pudo cargar la Hoja Matriz.";
    throw new Error(message);
  }

  if (data === null) {
    throw new Error("El servidor no devolvio datos.");
  }

  return data as T;
}

function normalizedGrade(row: HojaMatrizRow) {
  const source = row.gradoAbreviacion?.trim() || row.grado.trim();
  return source || "SIN GRADO";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function personLabel(row: HojaMatrizRow) {
  return `${row.apellido1} ${row.nombre1}`.replace(/\s+/g, " ").trim();
}

export default function HojaMatrizPage() {
  const [data, setData] = useState<HojaMatrizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Cargando Hoja Matriz...");
  const autoPrintedRef = useRef(false);
  const [urlBateriaFilter, setUrlBateriaFilter] = useState("");
  const [urlAutoPrint, setUrlAutoPrint] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<HojaMatrizData>("/api/hoja-matrix");
      setData(result);
      setStatus("Hoja Matriz actualizada.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la Hoja Matriz.";
      setStatus(message);
      if (message === "No autenticado.") {
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const generatedAt = useMemo(() => {
    if (!data) return "";
    return new Date(data.generatedAt).toLocaleString("es-UY");
  }, [data]);

  const bateriaGroups = useMemo(() => {
    if (!data) return [] as BateriaGroup[];

    const grouped = new Map<string, HojaMatrizRow[]>();
    for (const row of data.rows) {
      const key = row.bateria ?? "Sin bateria";
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        grouped.set(key, [row]);
      }
    }

    return Array.from(grouped.entries()).map(([bateria, rows]) => {
      const gradeMap = new Map<string, HojaMatrizRow[]>();
      for (const row of rows) {
        const gradeKey = normalizedGrade(row);
        const gradeRows = gradeMap.get(gradeKey);
        if (gradeRows) {
          gradeRows.push(row);
        } else {
          gradeMap.set(gradeKey, [row]);
        }
      }

      const grades: GradeGroup[] = Array.from(gradeMap.entries()).map(([gradeLabel, gradeRows]) => ({
        gradeLabel,
        rows: gradeRows,
      }));

      const itemTotals = Array.from({ length: data.items.length }, (_, idx) => rows.reduce((acc, row) => acc + (row.totales[idx] ?? 0), 0));
      const totalGeneral = rows.reduce((acc, row) => acc + row.totalGeneral, 0);

      return {
        bateria,
        rows,
        grades,
        itemTotals,
        totalGeneral,
      };
    });
  }, [data]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setUrlBateriaFilter(params.get("bateria")?.trim() ?? "");
    setUrlAutoPrint(params.get("autoprint") === "1");
  }, []);

  const bateriaFilter = urlBateriaFilter;
  const autoPrintRequested = urlAutoPrint;

  const visibleBateriaGroups = useMemo(() => {
    if (!bateriaFilter) return bateriaGroups;
    const expected = normalizeText(bateriaFilter);
    return bateriaGroups.filter((group) => normalizeText(group.bateria) === expected);
  }, [bateriaFilter, bateriaGroups]);

  useEffect(() => {
    if (!autoPrintRequested) return;
    if (loading) return;
    if (!data) return;
    if (visibleBateriaGroups.length === 0) return;
    if (autoPrintedRef.current) return;
    autoPrintedRef.current = true;
    window.setTimeout(() => window.print(), 120);
  }, [autoPrintRequested, data, loading, visibleBateriaGroups.length]);

  const totalColumns = data ? data.items.length + 4 : 4;

  return (
    <main className={styles.page}>
      <section className={`ej-card rounded-2xl p-4 ${styles.controls}`}>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            Volver
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg bg-stone-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={() => window.open("/hoja-matriz?autoprint=1", "_blank", "noopener,noreferrer")}
            className="rounded-lg bg-[var(--EscudoAzul)] px-3 py-2 text-xs font-semibold text-white"
          >
            PDF de todas
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700"
          >
            Imprimir vista actual
          </button>
        </div>
        <p className="mt-2 text-sm text-stone-700">{status}</p>
        {bateriaFilter ? <p className="mt-1 text-xs text-stone-600">{`Filtro de bateria activo: ${bateriaFilter}`}</p> : null}
      </section>

      {loading && !data ? <p className="mt-3 text-sm text-stone-600">Cargando datos...</p> : null}

      {data ? (
        <section className={styles.sheetList}>
          {visibleBateriaGroups.map((group, groupIndex) => {
            const itemCount = Math.max(data.items.length, 1);
            const rowNumberByCi = new Map(group.rows.map((entry, index) => [entry.ci, index + 1]));
            const tableVars = {
              "--item-count": String(itemCount),
            } as CSSProperties;

            return (
              <article key={`sheet-${group.bateria}`} className={styles.sheet} data-first-sheet={groupIndex === 0 ? "true" : "false"}>
                <div className={`${styles.sheetActions} ${styles.controls}`}>
                  <button
                    type="button"
                    onClick={() =>
                      window.open(`/hoja-matriz?bateria=${encodeURIComponent(group.bateria)}&autoprint=1`, "_blank", "noopener,noreferrer")
                    }
                    className="rounded-md bg-[var(--EscudoAzul)] px-2.5 py-1.5 text-xs font-semibold text-white"
                  >
                    PDF de esta bateria
                  </button>
                </div>
                <div className={styles.sheetHeader}>
                  <div className={styles.logoWrap}>
                    <Image
                      src="/assets/logo-artilleria.jpg"
                      alt="Logo Artilleria"
                      width={140}
                      height={100}
                      className={styles.logo}
                      priority={groupIndex === 0}
                    />
                  </div>
                  <div className={styles.sheetHeaderText}>
                    <p className={styles.headerTitle}>{'Grupo "Brig.Gral.Manuel Oribe" de Artilleria 105mm No.1.'}</p>
                    <h1 className={styles.headerSubtitle}>HOJA MATRIZ</h1>
                    <p className={styles.headerBattery}>{`Bateria: ${group.bateria}`}</p>
                  </div>
                </div>

                <table className={styles.matrixTable} style={tableVars}>
                  <colgroup>
                    <col className={styles.colNro} />
                    <col className={styles.colGrado} />
                    <col className={styles.colNombre} />
                    <col className={styles.colEquipo} />
                    {data.items.map((item) => (
                      <col key={`col-${group.bateria}-${item.itemId}`} className={styles.colItem} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      <th colSpan={totalColumns} className={styles.titleRow}>
                        MATRIZ DE EQUIPO POR PERSONAL
                      </th>
                    </tr>
                    <tr>
                      <th className={styles.headCell}>Nro</th>
                      <th className={styles.headCell}>Grado</th>
                      <th className={styles.headCell}>Nombre</th>
                      <th className={styles.headCell}>Equipo</th>
                      {data.items.map((item) => (
                        <th key={`head-${group.bateria}-${item.itemId}`} className={`${styles.headCell} ${styles.itemHead}`}>
                          <span className={styles.itemHeadText}>{item.nombre}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.grades.map((grade) => (
                      <Fragment key={`grade-${group.bateria}-${grade.gradeLabel}`}>
                        <tr className={styles.gradeRow}>
                          <td colSpan={totalColumns}>{grade.gradeLabel.toUpperCase()}</td>
                        </tr>
                        {grade.rows.map((row) => {
                          const rowNumber = rowNumberByCi.get(row.ci) ?? 0;
                          return (
                            <tr key={row.ci}>
                              <td className={styles.numberCell}>{rowNumber}</td>
                              <td className={styles.centerCell}>{normalizedGrade(row)}</td>
                              <td className={styles.nameCell}>{personLabel(row)}</td>
                              <td className={styles.totalCell}>{row.totalGeneral}</td>
                              {row.totales.map((value, idx) => (
                                <td
                                  key={`item-${row.ci}-${data.items[idx]?.itemId ?? idx}`}
                                  className={`${styles.itemCell} ${value < 0 ? styles.negative : ""}`}
                                >
                                  {value}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                    <tr className={styles.totalRow}>
                      <td colSpan={3}>TOTAL</td>
                      <td>{group.totalGeneral}</td>
                      {group.itemTotals.map((value, idx) => (
                        <td key={`total-${group.bateria}-${data.items[idx]?.itemId ?? idx}`} className={value < 0 ? styles.negative : ""}>
                          {value}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={totalColumns} className={styles.updateRow}>
                        {`ULTIMA ACTUALIZACION ${generatedAt}`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </article>
            );
          })}

          {visibleBateriaGroups.length === 0 ? (
            <p className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              No hay baterias para el filtro seleccionado.
            </p>
          ) : null}

          {data.rows.length === 0 ? (
            <p className="mt-3 rounded border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-700">No hay registros para mostrar.</p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
