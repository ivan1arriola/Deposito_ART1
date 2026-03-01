"use client";

import type { FormEvent } from "react";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import type { Bateria, Personal, Rango } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";

type PersonalCreateViewProps = {
  ciPlaceholder: string;
  newPersonal: PersonalForm;
  duplicatePersonal: Personal | null;
  ciHasError: boolean;
  ciLooksValid: boolean;
  ciAlreadyExists: boolean;
  canRegisterPersonal: boolean;
  requiredPersonalCompleted: number;
  requiredPersonalFields: boolean[];
  canSubmitPersonal: boolean;
  creatingPersonal: boolean;
  rangos: Rango[];
  baterias: Bateria[];
  tallaOptionsByKey: Record<TallaKey, string[]>;
  maxFechaIngreso: string;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPersonalChange: (key: keyof PersonalForm, value: string) => void;
};

export function PersonalCreateView({
  ciPlaceholder,
  newPersonal,
  duplicatePersonal,
  ciHasError,
  ciLooksValid,
  ciAlreadyExists,
  canRegisterPersonal,
  requiredPersonalCompleted,
  requiredPersonalFields,
  canSubmitPersonal,
  creatingPersonal,
  rangos,
  baterias,
  tallaOptionsByKey,
  maxFechaIngreso,
  onBack,
  onSubmit,
  onPersonalChange,
}: PersonalCreateViewProps) {
  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6e7_55%,#fff8db_100%)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">Registrar personal</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Completa identidad, destino y tallas en una sola ficha. Al guardar, el registro queda disponible de inmediato en la vista principal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-lime-700/20 bg-lime-100/80 px-3 py-1 text-xs font-semibold text-lime-950">
                {`Campos obligatorios: ${requiredPersonalCompleted}/${requiredPersonalFields.length}`}
              </span>
              <button
                type="button"
                onClick={onBack}
                disabled={creatingPersonal}
                className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Volver a personal
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Identidad</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="sm:col-span-2 xl:col-span-4">
                    <span className="block text-xs font-medium text-stone-700">Cédula de identidad *</span>
                    <input
                      value={newPersonal.ci}
                      onChange={(event) => onPersonalChange("ci", event.target.value)}
                      placeholder={ciPlaceholder}
                      inputMode="numeric"
                      className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${ciHasError ? "border-rose-600 bg-rose-50" : "border-stone-300 bg-white"}`}
                    />
                    {ciAlreadyExists && duplicatePersonal ? (
                      <span className="mt-1 block text-[11px] font-medium text-rose-700">
                        {`Cédula repetida: ${apellidosLabel(duplicatePersonal)}, ${nombresLabel(duplicatePersonal)}.`}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[11px] text-stone-500">Sin puntos ni guion.</span>
                    )}
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Apellido 1 *</span>
                    <input
                      value={newPersonal.apellido1}
                      onChange={(event) => onPersonalChange("apellido1", event.target.value)}
                      placeholder="Apellido principal"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Apellido 2</span>
                    <input
                      value={newPersonal.apellido2}
                      onChange={(event) => onPersonalChange("apellido2", event.target.value)}
                      placeholder="Apellido secundario"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Nombre 1 *</span>
                    <input
                      value={newPersonal.nombre1}
                      onChange={(event) => onPersonalChange("nombre1", event.target.value)}
                      placeholder="Primer nombre"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Nombre 2</span>
                    <input
                      value={newPersonal.nombre2}
                      onChange={(event) => onPersonalChange("nombre2", event.target.value)}
                      placeholder="Segundo nombre"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Destino</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label>
                    <span className="block text-xs font-medium text-stone-700">Grado *</span>
                    <select
                      value={newPersonal.rangoId}
                      onChange={(event) => onPersonalChange("rangoId", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Seleccionar grado</option>
                      {rangos.map((rango) => (
                        <option key={rango.rangoId} value={String(rango.rangoId)}>
                          {rango.nombreCompleto}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Batería</span>
                    <select
                      value={newPersonal.bateriaId}
                      onChange={(event) => onPersonalChange("bateriaId", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Sin batería</option>
                      {baterias.map((bateria) => (
                        <option key={bateria.bateriaId} value={String(bateria.bateriaId)}>
                          {bateria.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Fecha de ingreso</span>
                    <input
                      type="date"
                      value={newPersonal.fechaIngreso}
                      onChange={(event) => onPersonalChange("fechaIngreso", event.target.value)}
                      max={maxFechaIngreso}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Tallas y medidas</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {TALLA_KEYS.map((key) => (
                    <label key={key}>
                      <span className="block text-xs font-medium text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
                      <select
                        value={newPersonal[key]}
                        onChange={(event) => onPersonalChange(key, event.target.value)}
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Seleccionar</option>
                        {tallaOptionsByKey[key].map((option) => (
                          <option key={`${key}-${option}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <aside className="space-y-4">
              <article className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-stone-900">Estado del formulario</h3>
                <p className="mt-1 text-xs leading-5 text-stone-600">
                  Completa los campos obligatorios para habilitar el registro.
                </p>

                {!canRegisterPersonal ? (
                  <p className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Primero debes registrar grados.
                  </p>
                ) : null}

                {!ciLooksValid ? (
                  <p className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    La cédula ingresada no es válida.
                  </p>
                ) : null}

                {ciAlreadyExists && duplicatePersonal ? (
                  <p className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {`Cédula repetida detectada: ${apellidosLabel(duplicatePersonal)}, ${nombresLabel(duplicatePersonal)}.`}
                  </p>
                ) : null}

                <div className="mt-4 space-y-2 text-xs text-stone-600">
                  <p>{`Cédula válida: ${requiredPersonalFields[0] ? "Sí" : "No"}`}</p>
                  <p>{`Apellido 1: ${requiredPersonalFields[1] ? "Completo" : "Falta"}`}</p>
                  <p>{`Nombre 1: ${requiredPersonalFields[2] ? "Completo" : "Falta"}`}</p>
                  <p>{`Grado: ${requiredPersonalFields[3] ? "Seleccionado" : "Falta"}`}</p>
                  <p>{`Batería: ${Number(newPersonal.bateriaId) > 0 ? "Completa" : "Pendiente"}`}</p>
                  <p>{`Fecha de ingreso: ${newPersonal.fechaIngreso ? "Completa" : "Pendiente"}`}</p>
                </div>
              </article>

              <article className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300">Alta inmediata</p>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  Al confirmar, la ficha se incorpora al listado general y ya puede recibir movimientos de entrega o devolución.
                </p>

                <button
                  type="submit"
                  disabled={!canSubmitPersonal}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
                >
                  {creatingPersonal ? "Registrando..." : "Registrar personal"}
                </button>
              </article>
            </aside>
          </div>
        </form>
      </article>
    </section>
  );
}
