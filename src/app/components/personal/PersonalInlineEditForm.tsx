"use client";

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
  onChange: (field: keyof PersonalForm, value: string) => void;
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
    editPersonal.telefonoContacto.trim() === "" || isValidUruguayanMobileNumber(editPersonal.telefonoContacto);

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <input value={editPersonal.apellido1} onChange={(event) => onChange("apellido1", event.target.value)} placeholder="Apellido 1" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <input value={editPersonal.apellido2} onChange={(event) => onChange("apellido2", event.target.value)} placeholder="Apellido 2" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <input value={editPersonal.nombre1} onChange={(event) => onChange("nombre1", event.target.value)} placeholder="Nombre 1" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <input value={editPersonal.nombre2} onChange={(event) => onChange("nombre2", event.target.value)} placeholder="Nombre 2" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
      <div className="sm:col-span-2 lg:col-span-2">
        <input
          value={editPersonal.telefonoContacto}
          onChange={(event) => onChange("telefonoContacto", event.target.value)}
          placeholder="Celular de contacto"
          inputMode="tel"
          className={`w-full rounded-lg border px-3 py-2 text-sm ${telefonoContactoLooksValid ? "border-stone-300" : "border-rose-600 bg-rose-50"}`}
        />
        <p className={`mt-1 text-[11px] ${telefonoContactoLooksValid ? "text-stone-500" : "font-medium text-rose-700"}`}>
          {telefonoContactoLooksValid ? "Opcional. Formato uruguayo." : "Ingresa un celular uruguayo valido."}
        </p>
      </div>
      <input
        type="date"
        value={editPersonal.fechaIngreso}
        onChange={(event) => onChange("fechaIngreso", event.target.value)}
        max={maxFechaIngreso}
        className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
      <select value={editPersonal.rangoId} onChange={(event) => onChange("rangoId", event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
        {rangos.map((rango) => (
          <option key={rango.rangoId} value={rango.rangoId}>
            {rangoLabel(rango)}
          </option>
        ))}
      </select>
      <select value={editPersonal.bateriaId} onChange={(event) => onChange("bateriaId", event.target.value)} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">
        <option value="">Sin batería (pendiente)</option>
        {baterias.map((bateria) => (
          <option key={bateria.bateriaId} value={bateria.bateriaId}>
            {bateria.nombre}
          </option>
        ))}
      </select>
      {TALLA_KEYS.map((key) => (
        <label key={`edit-${key}`} className="rounded-xl border border-stone-200/90 bg-stone-50/60 p-3">
          <span className="block text-xs font-semibold uppercase tracking-wide text-stone-700">{`Talla ${TALLA_LABELS[key]}`}</span>
          <select value={editPersonal[key]} onChange={(event) => onChange(key, event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm">
            <option value="">Seleccionar</option>
            {tallaOptionsByKey[key].map((option) => (
              <option key={`edit-${key}-${option}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button type="button" onClick={onSave} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1">
        Guardar cambios
      </button>
    </div>
  );
}
