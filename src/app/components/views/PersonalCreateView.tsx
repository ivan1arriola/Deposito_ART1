"use client";

import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
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
  movimientos: PersonalAltaMovimientoForm[];
  movimientoDraft: PersonalAltaMovimientoForm | null;
  movimientoModalEditing: boolean;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPersonalChange: (key: keyof PersonalForm, value: string | boolean) => void;
  onOpenMovimientoModal: () => void;
  onCloseMovimientoModal: () => void;
  onSubmitMovimientoDraft: () => void;
  onEditMovimiento: (index: number) => void;
  onRemoveMovimiento: (index: number) => void;
  onMovimientoDraftChange: (field: keyof Omit<PersonalAltaMovimientoForm, "equipos">, value: string) => void;
  onMovimientoDraftItemChange: (itemIndex: number, field: "equipoId" | "cantidad", value: string) => void;
  onAddMovimientoDraftItem: () => void;
  onRemoveMovimientoDraftItem: (itemIndex: number) => void;
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
  movimientos,
  movimientoDraft,
  movimientoModalEditing,
  onBack,
  onSubmit,
  onPersonalChange,
  onOpenMovimientoModal,
  onCloseMovimientoModal,
  onSubmitMovimientoDraft,
  onEditMovimiento,
  onRemoveMovimiento,
  onMovimientoDraftChange,
  onMovimientoDraftItemChange,
  onAddMovimientoDraftItem,
  onRemoveMovimientoDraftItem,
}: PersonalCreateViewProps) {
  const sanitizeCi = (value: string) => value.replace(/\D+/g, "");

  const handleCiChange = (value: string) => {
    onPersonalChange("ci", sanitizeCi(value));
  };

  const handleCiPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text");
    onPersonalChange("ci", sanitizeCi(pasted));
  };

  const handleCiKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "." || event.key === "-") {
      event.preventDefault();
    }
  };

  const telefonoContactoLooksValid =
    newPersonal.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(newPersonal.telefonoContacto);
  const fechaActualLabel = newPersonal.esReingreso ? "Fecha de re-ingreso *" : "Fecha de ingreso";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card overflow-hidden rounded-3xl">
        <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:equipos-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-text-secondary)]">Nueva vista</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--color-text-primary)]">Registrar subalterno</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                Completa identidad, destino y tallas en una sola ficha. Al guardar, el registro queda disponible de inmediato en la vista principal.
              </p>
            </div>

            <div className="flex flex-wrap equipos-center gap-2">
              <span className="inline-flex equipos-center rounded-full border border-[rgb(0,56,133,0.25)] bg-[rgb(0,56,133,0.1)] px-3 py-1 text-xs font-semibold text-[var(--color-text-primary)]">
                {`Campos obligatorios: ${requiredPersonalCompleted}/${requiredPersonalFields.length}`}
              </span>
              <button
                type="button"
                onClick={onBack}
                disabled={creatingPersonal}
                className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Volver a subalternos
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
                      onChange={(event) => handleCiChange(event.target.value)}
                      onPaste={handleCiPaste}
                      onKeyDown={handleCiKeyDown}
                      placeholder={ciPlaceholder}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={8}
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
                    <span className="block text-xs font-medium text-stone-700">Primer apellido *</span>
                    <input
                      value={newPersonal.apellido1}
                      onChange={(event) => onPersonalChange("apellido1", event.target.value)}
                      placeholder="Primer apellido"
                      className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-xs font-medium text-stone-700">Segundo apellido</span>
                    <input
                      value={newPersonal.apellido2}
                      onChange={(event) => onPersonalChange("apellido2", event.target.value)}
                      placeholder="Segundo apellido"
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
                  <label className="md:col-span-3 flex equipos-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5">
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

              <fieldset className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-600">Movimientos iniciales (opcional)</legend>
                <div className="flex flex-wrap equipos-center justify-between gap-3">
                  <p className="text-xs text-stone-600">
                    Puedes cargar movimientos en esta misma pantalla. Al guardar, se crea la persona y luego se registran sus movimientos.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenMovimientoModal}
                    className="inline-flex equipos-center gap-2 rounded-xl bg-stone-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
                  >
                    <span aria-hidden="true">(+) </span>
                    Agregar movimiento
                  </button>
                </div>

                {movimientos.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Todavía no agregaste movimientos.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {movimientos.map((movimiento, movimientoIndex) => (
                      <article key={`movimiento-${movimientoIndex}`} className="rounded-xl border border-stone-200 bg-white p-3">
                        <div className="flex flex-wrap equipos-center justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-stone-800">{`Movimiento #${movimientoIndex + 1}`}</p>
                            <p className="text-xs text-stone-600">
                              {`${movimiento.tipo === "ENTREGA" ? "Entrega" : "Devolución"} | Fecha: ${movimiento.fecha || "Sin fecha"}`}
                            </p>
                            {movimiento.comentarios.trim() !== "" ? <p className="text-xs text-stone-600">{movimiento.comentarios}</p> : null}
                          </div>

                          <div className="flex equipos-center gap-2">
                            <button
                              type="button"
                              onClick={() => onEditMovimiento(movimientoIndex)}
                              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                            >
                              Rectificar
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveMovimiento(movimientoIndex)}
                              className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-600"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>

                        <ul className="mt-2 space-y-1 text-xs text-stone-700">
                          {movimiento.equipos.map((equipo, itemIndex) => {
                            const equipo = equiposActivos.find((candidate) => candidate.equipoId === equipo.equipoId);
                            return (
                              <li key={`movimiento-${movimientoIndex}-resumen-equipo-${itemIndex}`}>
                                {`${equipo?.nombre ?? "Equipo sin definir"} x ${equipo.cantidad}`}
                              </li>
                            );
                          })}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
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
                  <p>{`Primer apellido: ${requiredPersonalFields[1] ? "Completo" : "Falta"}`}</p>
                  <p>{`Nombre 1: ${requiredPersonalFields[2] ? "Completo" : "Falta"}`}</p>
                  <p>{`Grado: ${requiredPersonalFields[3] ? "Seleccionado" : "Falta"}`}</p>
                  <p>{`Condición: ${newPersonal.esReingreso ? "Reingreso" : "Ingreso inicial"}`}</p>
                  <p>{`Celular: ${newPersonal.telefonoContacto.trim() === "" ? "Opcional" : telefonoContactoLooksValid ? "Válido" : "Inválido"}`}</p>
                  <p>{`Batería: ${Number(newPersonal.bateriaId) > 0 ? "Completa" : "Pendiente"}`}</p>
                  <p>{`${newPersonal.esReingreso ? "Fecha de re-ingreso" : "Fecha de ingreso"}: ${newPersonal.fechaIngreso ? "Completa" : "Pendiente"}`}</p>
                  {newPersonal.esReingreso ? <p>{`Fecha de ingreso: ${newPersonal.fechaIngresoOriginal ? "Completa" : "Opcional"}`}</p> : null}
                  <p>{`Movimientos iniciales: ${movimientos.length > 0 ? `${movimientos.length} cargado(s)` : "No"}`}</p>
                </div>
              </article>

              <article className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-ejercito-blue)] p-4 text-white shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ejercito-gold)]">Alta inmediata</p>
                <p className="mt-3 text-sm leading-6 text-white/85">
                  Al confirmar, la ficha se incorpora al listado de subalternos y ya puede recibir movimientos de entrega o devolución.
                </p>

                <button
                  type="submit"
                  disabled={!canSubmitPersonal}
                  className="mt-5 inline-flex w-full equipos-center justify-center rounded-2xl bg-[var(--color-ejercito-gold)] px-4 py-3 text-sm font-bold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-500)] disabled:text-[var(--color-neutral-200)]"
                >
                  {creatingPersonal ? "Registrando..." : "Registrar subalterno"}
                </button>
              </article>
            </aside>
          </div>
        </form>
      </article>

      {movimientoDraft ? (
        <ModalFrame onClose={onCloseMovimientoModal} size="lg" closeOnBackdrop={false}>
          <div className="space-y-4">
            <header className="space-y-1">
              <h3 className="text-xl font-semibold text-stone-900">{movimientoModalEditing ? "Rectificar movimiento" : "Agregar movimiento"}</h3>
              <p className="text-sm text-stone-600">
                Define el movimiento y los equipos asociados. Al cerrar este modal verás el resumen en el alta de subalterno.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label>
                <span className="block text-xs font-medium text-stone-700">Tipo</span>
                <select
                  value={movimientoDraft.tipo}
                  onChange={(event) => onMovimientoDraftChange("tipo", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ENTREGA">Entrega</option>
                  <option value="DEVOLUCION">Devolución</option>
                </select>
              </label>

              <label>
                <span className="block text-xs font-medium text-stone-700">Fecha</span>
                <DateTextInput
                  value={movimientoDraft.fecha}
                  onChange={(value) => onMovimientoDraftChange("fecha", value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </label>

              <label className="md:col-span-2">
                <span className="block text-xs font-medium text-stone-700">Comentarios</span>
                <input
                  value={movimientoDraft.comentarios}
                  onChange={(event) => onMovimientoDraftChange("comentarios", event.target.value)}
                  placeholder="Detalle breve (opcional)"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">Equipos</p>
              {movimientoDraft.equipos.map((equipo, itemIndex) => (
                <div key={`nuevo-personal-movimiento-equipo-${itemIndex}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                  <select
                    value={equipo.equipoId}
                    onChange={(event) => onMovimientoDraftItemChange(itemIndex, "equipoId", event.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar equipo</option>
                    {equiposActivos
                      .filter((equipo) => {
                        if (equipo.equipoId === equipo.equipoId) return true;
                        return !movimientoDraft.equipos.some(
                          (selectedItem, selectedIndex) => selectedIndex !== itemIndex && selectedItem.equipoId === equipo.equipoId,
                        );
                      })
                      .map((equipo) => (
                        <option key={equipo.equipoId} value={equipo.equipoId}>
                          {equipo.nombre}
                        </option>
                      ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={equipo.cantidad}
                    onChange={(event) => onMovimientoDraftItemChange(itemIndex, "cantidad", event.target.value)}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => onRemoveMovimientoDraftItem(itemIndex)}
                    disabled={movimientoDraft.equipos.length <= 1}
                    className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={onAddMovimientoDraftItem}
                className="inline-flex equipos-center gap-2 rounded-xl bg-stone-800 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
              >
                <span aria-hidden="true">(+) </span>
                Agregar equipo
              </button>
            </section>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={onCloseMovimientoModal}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={onSubmitMovimientoDraft}
                className="rounded-xl bg-[var(--color-ejercito-gold)] px-4 py-2 text-sm font-semibold text-[var(--color-ejercito-black)] transition hover:bg-[#e6b800]"
              >
                {movimientoModalEditing ? "Guardar rectificación" : "Guardar movimiento"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
