"use client";

import type { FormEvent } from "react";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { isValidUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Rango } from "@/types/entities";
import type { OficialSuboficialForm } from "@/types/forms";

type OficialSuboficialCreateViewProps = {
  ciPlaceholder: string;
  form: OficialSuboficialForm;
  duplicateLabel: string | null;
  ciHasError: boolean;
  ciLooksValid: boolean;
  ciAlreadyExists: boolean;
  canRegister: boolean;
  requiredCompleted: number;
  requiredFields: boolean[];
  canSubmit: boolean;
  saving: boolean;
  rangosDisponibles: Rango[];
  tallaOptionsByKey: Record<TallaKey, string[]>;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (field: keyof OficialSuboficialForm, value: string) => void;
};

const TYPE_LABEL: Record<OficialSuboficialForm["tipo"], string> = {
  OFICIAL: "Oficial",
  SUBOFICIAL: "Suboficial",
};

export function OficialSuboficialCreateView({
  ciPlaceholder,
  form,
  duplicateLabel,
  ciHasError,
  ciLooksValid,
  ciAlreadyExists,
  canRegister,
  requiredCompleted,
  requiredFields,
  canSubmit,
  saving,
  rangosDisponibles,
  tallaOptionsByKey,
  onBack,
  onSubmit,
  onChange,
}: OficialSuboficialCreateViewProps) {
  const telefonoLooksValid =
    form.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(form.telefonoContacto);

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-stone-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6e7_55%,#fff8db_100%)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">Registrar oficial/suboficial</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                Registra personal de SS.OO y Suboficiales con su grado y tallas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-lime-700/20 bg-lime-100/80 px-3 py-1 text-xs font-semibold text-lime-950">
                {`Campos obligatorios: ${requiredCompleted}/${requiredFields.length}`}
              </span>
              <button
                type="button"
                onClick={onBack}
                disabled={saving}
                className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Volver al listado
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
                    <span className="block text-xs font-medium text-stone-700">Cedula de identidad *</span>
                    <input
                      value={form.ci}
                      onChange={(event) => onChange("ci", event.target.value)}
                      placeholder={ciPlaceholder}
                      inputMode="numeric"
                      className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                        ciHasError ? "border-rose-600 bg-rose-50" : "border-stone-300 bg-white"
                      }`}
                    />
                    {ciAlreadyExists && duplicateLabel ? (
                      <span className="mt-1 block text-[11px] font-medium text-rose-700">{`Cedula repetida: ${duplicateLabel}.`}</span>
                    ) : (
                      <span className="mt-1 block text-[11px] text-stone-500">Sin puntos ni guion.</span>
                    )}
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Apellido 1 *</span>
                    <input
                      value={form.apellido1}
                      onChange={(event) => onChange("apellido1", event.target.value)}
                      placeholder="Apellido principal"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Apellido 2</span>
                    <input
                      value={form.apellido2}
                      onChange={(event) => onChange("apellido2", event.target.value)}
                      placeholder="Apellido secundario"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Nombre 1 *</span>
                    <input
                      value={form.nombre1}
                      onChange={(event) => onChange("nombre1", event.target.value)}
                      placeholder="Primer nombre"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Nombre 2</span>
                    <input
                      value={form.nombre2}
                      onChange={(event) => onChange("nombre2", event.target.value)}
                      placeholder="Segundo nombre"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="sm:col-span-2 xl:col-span-4">
                    <span className="block text-xs font-medium text-stone-700">Celular de contacto</span>
                    <input
                      value={form.telefonoContacto}
                      onChange={(event) => onChange("telefonoContacto", event.target.value)}
                      placeholder="099123456 o +59899123456"
                      inputMode="tel"
                      className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${
                        telefonoLooksValid ? "border-stone-300 bg-white" : "border-rose-600 bg-rose-50"
                      }`}
                    />
                    <span className={`mt-1 block text-[11px] ${telefonoLooksValid ? "text-stone-500" : "font-medium text-rose-700"}`}>
                      {telefonoLooksValid ? "Opcional. Se guarda normalizado como celular uruguayo." : "Ingresa un celular uruguayo valido."}
                    </span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Destino</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label>
                    <span className="block text-xs font-medium text-stone-700">Tipo *</span>
                    <select
                      value={form.tipo}
                      onChange={(event) => onChange("tipo", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="OFICIAL">Oficial</option>
                      <option value="SUBOFICIAL">Suboficial</option>
                    </select>
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Grado *</span>
                    <select
                      value={form.rangoId}
                      onChange={(event) => onChange("rangoId", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Seleccionar grado</option>
                      {rangosDisponibles.map((rango) => (
                        <option key={rango.rangoId} value={String(rango.rangoId)}>
                          {rango.nombreCompleto}
                        </option>
                      ))}
                    </select>
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
                        value={form[key]}
                        onChange={(event) => onChange(key, event.target.value)}
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
                <p className="mt-1 text-xs leading-5 text-stone-600">Completa los campos obligatorios para habilitar el registro.</p>

                {!canRegister ? (
                  <p className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Primero debes registrar grados para {TYPE_LABEL[form.tipo].toLowerCase()}.
                  </p>
                ) : null}

                {!ciLooksValid ? (
                  <p className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    La cedula ingresada no es valida.
                  </p>
                ) : null}

                {ciAlreadyExists && duplicateLabel ? (
                  <p className="mt-3 rounded-xl border border-rose-300/80 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {`Cedula repetida detectada: ${duplicateLabel}.`}
                  </p>
                ) : null}

                {rangosDisponibles.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    No hay grados disponibles para {TYPE_LABEL[form.tipo].toLowerCase()}.
                  </p>
                ) : null}

                <div className="mt-4 space-y-2 text-xs text-stone-600">
                  <p>{`Cedula valida: ${requiredFields[0] ? "Si" : "No"}`}</p>
                  <p>{`Apellido 1: ${requiredFields[1] ? "Completo" : "Falta"}`}</p>
                  <p>{`Nombre 1: ${requiredFields[2] ? "Completo" : "Falta"}`}</p>
                  <p>{`Grado: ${requiredFields[3] ? "Seleccionado" : "Falta"}`}</p>
                  <p>{`Tipo: ${TYPE_LABEL[form.tipo]}`}</p>
                  <p>{`Celular: ${form.telefonoContacto.trim() === "" ? "Opcional" : telefonoLooksValid ? "Valido" : "Invalido"}`}</p>
                </div>
              </article>

              <article className="rounded-2xl border border-stone-200 bg-stone-950 p-4 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-300">Alta inmediata</p>
                <p className="mt-3 text-sm leading-6 text-white/80">Al confirmar, el registro queda disponible en la vista de SS.OO y Suboficiales.</p>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-stone-950 transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-300"
                >
                  {saving ? "Registrando..." : "Registrar oficial/suboficial"}
                </button>
              </article>
            </aside>
          </div>
        </form>
      </article>
    </section>
  );
}
