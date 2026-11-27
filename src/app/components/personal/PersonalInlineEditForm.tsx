"use client";

import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { TALLA_KEYS, TALLA_LABELS, type TallaKey } from "@/lib/tallas";
import { rangoLabel } from "@/lib/formatters";
import { isValidUruguayanMobileNumber } from "@/lib/uruguayan-phone";
import type { Bateria, Rango } from "@/types/entities";
import type { PersonalForm } from "@/types/forms";

type PersonalInlineEditFormProps = {
  editPersonal: PersonalForm;
  rangos: Rango[];
  baterias: Bateria[];
  tallaOptionsByKey: Record<TallaKey, string[]>;
  maxFechaIngreso: string;
  onChange: (field: keyof PersonalForm, value: string | boolean) => void;
  onSave: () => void;
};

export function PersonalInlineEditForm({
  editPersonal,
  rangos,
  baterias,
  tallaOptionsByKey,
  maxFechaIngreso,
  onChange,
  onSave,
}: PersonalInlineEditFormProps) {
  const telefonoContactoLooksValid =
    editPersonal.telefonoContacto.trim() === "" ||
    isValidUruguayanMobileNumber(editPersonal.telefonoContacto);
  const fechaActualLabel = editPersonal.esReingreso ? "Fecha Re-ingreso *" : "Fecha Ingreso";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Primer apellido *</span>
        <input
          value={editPersonal.apellido1}
          onChange={(event) => onChange("apellido1", event.target.value)}
          placeholder="Apellido 1"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Segundo apellido</span>
        <input
          value={editPersonal.apellido2}
          onChange={(event) => onChange("apellido2", event.target.value)}
          placeholder="Apellido 2"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Primer nombre *</span>
        <input
          value={editPersonal.nombre1}
          onChange={(event) => onChange("nombre1", event.target.value)}
          placeholder="Nombre 1"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Segundo nombre</span>
        <input
          value={editPersonal.nombre2}
          onChange={(event) => onChange("nombre2", event.target.value)}
          placeholder="Nombre 2"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="sm:col-span-2 lg:col-span-2">
        <label className="block text-xs font-semibold text-stone-700 mb-1">
          Celular de contacto
        </label>
        <input
          value={editPersonal.telefonoContacto}
          onChange={(event) => onChange("telefonoContacto", event.target.value)}
          placeholder="Celular de contacto"
          inputMode="tel"
          className={`w-full rounded-lg border px-3 py-2 text-sm ${telefonoContactoLooksValid ? "border-stone-300" : "border-rose-600 bg-rose-50"}`}
        />
        <p
          className={`mt-1 text-[11px] ${telefonoContactoLooksValid ? "text-stone-500" : "font-medium text-rose-700"}`}
        >
          {telefonoContactoLooksValid
            ? "Opcional. Formato uruguayo."
            : "Ingresa un celular uruguayo válido."}
        </p>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <label className="flex h-10 w-full items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm cursor-pointer hover:bg-stone-100 transition">
          <input
            type="checkbox"
            checked={editPersonal.esReingreso}
            onChange={(event) => onChange("esReingreso", event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
          />
          <span className="font-semibold text-stone-900">Es reingreso</span>
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-semibold text-stone-700 mb-1">{fechaActualLabel}</span>
        <DateTextInput
          value={editPersonal.fechaIngreso}
          onChange={(value) => onChange("fechaIngreso", value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          ariaLabel={`${fechaActualLabel}. Formato ${maxFechaIngreso}`}
        />
      </label>
      {editPersonal.esReingreso ? (
        <label className="block">
          <span className="block text-xs font-semibold text-stone-700 mb-1">
            Fecha Ingreso original
          </span>
          <DateTextInput
            value={editPersonal.fechaIngresoOriginal}
            onChange={(value) => onChange("fechaIngresoOriginal", value)}
            placeholder="DD/MM/AAAA"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            ariaLabel="Fecha Ingreso original"
          />
        </label>
      ) : null}
      <label className="block sm:col-span-1">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Grado *</span>
        <select
          value={editPersonal.rangoId}
          onChange={(event) => onChange("rangoId", event.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
        >
          {rangos.map((rango) => (
            <option key={rango.rangoId} value={rango.rangoId}>
              {rangoLabel(rango)}
            </option>
          ))}
        </select>
      </label>
      <label className="block sm:col-span-1">
        <span className="block text-xs font-semibold text-stone-700 mb-1">Batería</span>
        <select
          value={editPersonal.bateriaId}
          onChange={(event) => onChange("bateriaId", event.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
        >
          <option value="">Sin batería (pendiente)</option>
          {baterias.map((bateria) => (
            <option key={bateria.bateriaId} value={bateria.bateriaId}>
              {bateria.nombre}
            </option>
          ))}
        </select>
      </label>
      {TALLA_KEYS.map((key) => (
        <label
          key={`edit-${key}`}
          className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3"
        >
          <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
          <select
            value={editPersonal[key]}
            onChange={(event) => onChange(key, event.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            <option value="">Seleccionar</option>
            {tallaOptionsByKey[key].map((option) => (
              <option key={`edit-${key}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        onClick={onSave}
        className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1"
      >
        Guardar cambios
      </button>
    </div>
  );
}
