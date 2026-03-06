"use client";

import type { FormEvent } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { isValidUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Bateria, Equipo, Personal, Rango } from "@/types/entities";
import type { PersonalAltaMovimientoForm, PersonalForm } from "@/types/forms";

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
  equiposActivos: Equipo[];
  tallaOptionsByKey: Record<TallaKey, string[]>;
  maxFechaIngreso: string;
  movimientosEnabled: boolean;
  movimientos: PersonalAltaMovimientoForm[];
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPersonalChange: (key: keyof PersonalForm, value: string | boolean) => void;
  onMovimientosEnabledChange: (enabled: boolean) => void;
  onAddMovimiento: () => void;
  onRemoveMovimiento: (index: number) => void;
  onMovimientoChange: (index: number, field: keyof Omit<PersonalAltaMovimientoForm, "items">, value: string | boolean) => void;
  onMovimientoItemChange: (movimientoIndex: number, itemIndex: number, field: "itemId" | "cantidad", value: string) => void;
  onAddMovimientoItem: (movimientoIndex: number) => void;
  onRemoveMovimientoItem: (movimientoIndex: number, itemIndex: number) => void;
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
  equiposActivos,
  tallaOptionsByKey,
  maxFechaIngreso,
  movimientosEnabled,
  movimientos,
  onBack,
  onSubmit,
  onPersonalChange,
  onMovimientosEnabledChange,
  onAddMovimiento,
  onRemoveMovimiento,
  onMovimientoChange,
  onMovimientoItemChange,
  onAddMovimientoItem,
  onRemoveMovimientoItem,
}: PersonalCreateViewProps) {
  const telefonoContactoLooksValid =
    newPersonal.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(newPersonal.telefonoContacto);
  const fechaActualLabel = newPersonal.esReingreso ? "Fecha de re-ingreso *" : "Fecha de ingreso";

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

                  <label className="sm:col-span-2 xl:col-span-4">
                    <span className="block text-xs font-medium text-stone-700">Celular de contacto</span>
                    <input
                      value={newPersonal.telefonoContacto}
                      onChange={(event) => onPersonalChange("telefonoContacto", event.target.value)}
                      placeholder="099123456 o +59899123456"
                      inputMode="tel"
                      className={`mt-1 w-full rounded-xl border px-3 py-2.5 text-sm ${telefonoContactoLooksValid ? "border-stone-300 bg-white" : "border-rose-600 bg-rose-50"}`}
                    />
                    <span className={`mt-1 block text-[11px] ${telefonoContactoLooksValid ? "text-stone-500" : "font-medium text-rose-700"}`}>
                      {telefonoContactoLooksValid ? "Opcional. Se guarda normalizado como celular uruguayo." : "Ingresa un celular uruguayo válido."}
                    </span>
                  </label>
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Destino</legend>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="md:col-span-3 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={newPersonal.esReingreso}
                      onChange={(event) => onPersonalChange("esReingreso", event.target.checked)}
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    <span className="text-sm font-medium text-stone-700">Es reingreso</span>
                  </label>

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
                    <span className="block text-xs font-medium text-stone-700">{fechaActualLabel}</span>
                    <DateTextInput
                      value={newPersonal.fechaIngreso}
                      onChange={(value) => onPersonalChange("fechaIngreso", value)}
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-stone-500">
                      {newPersonal.esReingreso
                        ? `Obligatoria para personal que vuelve a ingresar. Formato DD/MM/AAAA. Máxima: ${maxFechaIngreso}.`
                        : "Opcional. Formato DD/MM/AAAA."}
                    </span>
                  </label>

                  {newPersonal.esReingreso ? (
                    <label>
                      <span className="block text-xs font-medium text-stone-700">Fecha de ingreso</span>
                      <DateTextInput
                        value={newPersonal.fechaIngresoOriginal}
                        onChange={(value) => onPersonalChange("fechaIngresoOriginal", value)}
                        className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                      />
                      <span className="mt-1 block text-[11px] text-stone-500">Opcional. Solo para casos de reingreso en formato DD/MM/AAAA.</span>
                    </label>
                  ) : null}
                </div>
              </fieldset>

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Movimientos iniciales (opcional)</legend>
                <label className="mt-1 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={movimientosEnabled}
                    onChange={(event) => onMovimientosEnabledChange(event.target.checked)}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  <span className="text-sm font-medium text-stone-700">Registrar movimientos al dar de alta</span>
                </label>

                {movimientosEnabled ? (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-stone-600">
                        Define entregas/devoluciones que quedarán asociadas a la persona apenas se cree.
                      </p>
                      <button
                        type="button"
                        onClick={onAddMovimiento}
                        className="rounded-lg bg-stone-700 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        + Movimiento
                      </button>
                    </div>

                    {movimientos.length === 0 ? (
                      <p className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Agrega al menos un movimiento o desmarca esta opción.
                      </p>
                    ) : null}

                    {movimientos.map((movimiento, movimientoIndex) => (
                      <article key={`movimiento-${movimientoIndex}`} className="space-y-2 rounded-xl border border-stone-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-stone-700">{`Movimiento #${movimientoIndex + 1}`}</p>
                          <button
                            type="button"
                            onClick={() => onRemoveMovimiento(movimientoIndex)}
                            className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold text-white"
                          >
                            Quitar
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                          <label>
                            <span className="block text-xs font-medium text-stone-700">Tipo</span>
                            <select
                              value={movimiento.tipo}
                              onChange={(event) => onMovimientoChange(movimientoIndex, "tipo", event.target.value)}
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                            >
                              <option value="ENTREGA">Entrega</option>
                              <option value="DEVOLUCION">Devolución</option>
                            </select>
                          </label>

                          <label>
                            <span className="block text-xs font-medium text-stone-700">Fecha</span>
                            <DateTextInput
                              value={movimiento.fecha}
                              onChange={(value) => onMovimientoChange(movimientoIndex, "fecha", value)}
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                            />
                          </label>

                          <label className="md:col-span-2">
                            <span className="block text-xs font-medium text-stone-700">Comentarios</span>
                            <input
                              value={movimiento.comentarios}
                              onChange={(event) => onMovimientoChange(movimientoIndex, "comentarios", event.target.value)}
                              placeholder="Detalle breve (opcional)"
                              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                            />
                          </label>
                        </div>

                        <label className="flex items-center gap-2 text-xs text-stone-700">
                          <input
                            type="checkbox"
                            checked={movimiento.afectaStock}
                            onChange={(event) => onMovimientoChange(movimientoIndex, "afectaStock", event.target.checked)}
                            className="h-4 w-4 rounded border-stone-300"
                          />
                          Afecta stock
                        </label>

                        <div className="space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">Equipos</p>
                          {movimiento.items.map((item, itemIndex) => (
                            <div key={`movimiento-${movimientoIndex}-item-${itemIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                              <select
                                value={item.itemId}
                                onChange={(event) => onMovimientoItemChange(movimientoIndex, itemIndex, "itemId", event.target.value)}
                                className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                              >
                                <option value="">Seleccionar equipo</option>
                                {equiposActivos
                                  .filter((equipo) => {
                                    if (equipo.itemId === item.itemId) return true;
                                    return !movimiento.items.some((selected, selectedIndex) => selectedIndex !== itemIndex && selected.itemId === equipo.itemId);
                                  })
                                  .map((equipo) => (
                                    <option key={equipo.itemId} value={equipo.itemId}>
                                      {equipo.nombre}
                                    </option>
                                  ))}
                              </select>

                              <input
                                type="number"
                                min={1}
                                value={item.cantidad}
                                onChange={(event) => onMovimientoItemChange(movimientoIndex, itemIndex, "cantidad", event.target.value)}
                                className="rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm"
                              />

                              <button
                                type="button"
                                onClick={() => onRemoveMovimientoItem(movimientoIndex, itemIndex)}
                                disabled={movimiento.items.length <= 1}
                                className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                Quitar
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => onAddMovimientoItem(movimientoIndex)}
                            className="rounded bg-stone-700 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            + Equipo
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">
                    Si activas esta opción, al guardar se creará la persona y luego sus movimientos en la misma operación.
                  </p>
                )}
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
                  <p>{`Condición: ${newPersonal.esReingreso ? "Reingreso" : "Ingreso inicial"}`}</p>
                  <p>{`Celular: ${newPersonal.telefonoContacto.trim() === "" ? "Opcional" : telefonoContactoLooksValid ? "Válido" : "Inválido"}`}</p>
                  <p>{`Batería: ${Number(newPersonal.bateriaId) > 0 ? "Completa" : "Pendiente"}`}</p>
                  <p>{`${newPersonal.esReingreso ? "Fecha de re-ingreso" : "Fecha de ingreso"}: ${newPersonal.fechaIngreso ? "Completa" : "Pendiente"}`}</p>
                  {newPersonal.esReingreso ? <p>{`Fecha de ingreso: ${newPersonal.fechaIngresoOriginal ? "Completa" : "Opcional"}`}</p> : null}
                  <p>{`Movimientos iniciales: ${movimientosEnabled ? `${movimientos.length} cargado(s)` : "No"}`}</p>
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
