"use client";

import { useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import type { Equipo } from "@/types/entities";
import { api } from "@/lib/api";
import { getTodayDateInput } from "@/lib/date-helpers";

type AsignacionRecintoEditorViewProps = {
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  onBack: () => void;
  onSuccess: () => void;
};

type Draft = {
  fecha: string;
  comentarios: string;
  destinatarioTipo: "RECINTO" | "EXTERNO";
  recintoClase: "INTERNO" | "EXTERNO";
  recintoNombre: string;
  destinatarioExternoGrado: string;
  destinatarioExternoCi: string;
  destinatarioExternoNombre: string;
  destinatarioExternoApellido: string;
  destinatarioExternoUnidadDestino: string;
  items: Array<{ itemId: string; cantidad: number }>;
};

export function AsignacionRecintoEditorView({
  equiposOrdenados,
  maxFechaIngreso,
  onBack,
  onSuccess,
}: AsignacionRecintoEditorViewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<Draft>({
    fecha: getTodayDateInput(),
    comentarios: "",
    destinatarioTipo: "RECINTO",
    recintoClase: "INTERNO",
    recintoNombre: "",
    destinatarioExternoGrado: "",
    destinatarioExternoCi: "",
    destinatarioExternoNombre: "",
    destinatarioExternoApellido: "",
    destinatarioExternoUnidadDestino: "",
    items: [{ itemId: "", cantidad: 1 }],
  });

  const equiposOrdenadosAlfabeticamente = [...equiposOrdenados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );

  const updateDraft = (field: keyof Draft, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const onItemChange = (index: number, field: "itemId" | "cantidad", value: string) => {
    setDraft((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: field === "cantidad" ? Number(value) : value };
      return { ...prev, items: next };
    });
  };

  const onAddItem = () => {
    setDraft((prev) => ({ ...prev, items: [...prev.items, { itemId: "", cantidad: 1 }] }));
  };

  const onRemoveItem = (index: number) => {
    setDraft((prev) => {
      const next = [...prev.items];
      next.splice(index, 1);
      return { ...prev, items: next };
    });
  };

  const onSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const validItems = draft.items.filter((i) => i.itemId && i.cantidad > 0);
    if (validItems.length === 0) {
      setError("Debes agregar al menos un equipo válido.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        modo: "crear",
        tipo: "ASIGNACION",
        fecha: draft.fecha,
        destinatarioTipo: draft.destinatarioTipo,
        recintoClase: draft.destinatarioTipo === "RECINTO" ? draft.recintoClase : undefined,
        recintoNombre: draft.destinatarioTipo === "RECINTO" ? draft.recintoNombre : undefined,
        destinatarioExterno: draft.destinatarioTipo === "EXTERNO" ? {
          grado: draft.destinatarioExternoGrado,
          ci: draft.destinatarioExternoCi,
          nombre: draft.destinatarioExternoNombre,
          apellido: draft.destinatarioExternoApellido,
          unidadDestino: draft.destinatarioExternoUnidadDestino,
        } : undefined,
        items: validItems,
        comentarios: draft.comentarios,
      };

      await api("/api/registros", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Registrar Asignación a Recinto / Externo</h2>
            <p className="mt-1 text-sm text-stone-600">Completa los datos para asignar equipo a un destino que no es personal de la unidad.</p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Volver
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800 border border-rose-200">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">
            Tipo de destinatario
            <select
              value={draft.destinatarioTipo}
              onChange={(e) => updateDraft("destinatarioTipo", e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="RECINTO">Recinto</option>
              <option value="EXTERNO">Persona Externa</option>
            </select>
          </label>

          <label className="text-sm font-medium text-stone-700">
            Fecha
            <DateTextInput
              value={draft.fecha}
              onChange={(val) => updateDraft("fecha", val)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm font-medium text-stone-700 sm:col-span-2">
            Comentarios (opcional)
            <input
              value={draft.comentarios}
              onChange={(e) => updateDraft("comentarios", e.target.value)}
              disabled={saving}
              placeholder="Detalle breve"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        {draft.destinatarioTipo === "RECINTO" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              Clase de recinto
              <select
                value={draft.recintoClase}
                onChange={(e) => updateDraft("recintoClase", e.target.value)}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="INTERNO">Dentro de la unidad</option>
                <option value="EXTERNO">Fuera de la unidad</option>
              </select>
            </label>
            <label className="text-sm font-medium text-stone-700">
              Nombre del recinto
              <input
                value={draft.recintoNombre}
                onChange={(e) => updateDraft("recintoNombre", e.target.value)}
                disabled={saving}
                placeholder="Ej.: Batería A / Ministerio de Defensa"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        {draft.destinatarioTipo === "EXTERNO" ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              Grado
              <input
                value={draft.destinatarioExternoGrado}
                onChange={(e) => updateDraft("destinatarioExternoGrado", e.target.value)}
                disabled={saving}
                placeholder="Ej.: Tte. 1ro."
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              CI
              <input
                value={draft.destinatarioExternoCi}
                onChange={(e) => updateDraft("destinatarioExternoCi", e.target.value)}
                disabled={saving}
                placeholder="Ej.: 5.123.456-7"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Nombres
              <input
                value={draft.destinatarioExternoNombre}
                onChange={(e) => updateDraft("destinatarioExternoNombre", e.target.value)}
                disabled={saving}
                placeholder="Nombres"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-stone-700">
              Apellidos
              <input
                value={draft.destinatarioExternoApellido}
                onChange={(e) => updateDraft("destinatarioExternoApellido", e.target.value)}
                disabled={saving}
                placeholder="Apellidos"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="text-sm font-medium text-stone-700 sm:col-span-2">
              Unidad de destino
              <input
                value={draft.destinatarioExternoUnidadDestino}
                onChange={(e) => updateDraft("destinatarioExternoUnidadDestino", e.target.value)}
                disabled={saving}
                placeholder="Ej.: Brigada de Infantería No. 5"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600">Equipos Asignados</h3>
          {draft.items.map((item, index) => (
            <div key={index} className="flex flex-col sm:flex-row items-center gap-3 bg-stone-50 p-3 rounded-lg border border-stone-200">
              <select
                value={item.itemId}
                onChange={(e) => onItemChange(index, "itemId", e.target.value)}
                disabled={saving}
                className="w-full sm:flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Seleccionar equipo</option>
                {equiposOrdenadosAlfabeticamente.map((catalogItem) => {
                  const isSelectedByOther = draft.items.some((i, idx) => idx !== index && i.itemId === catalogItem.itemId);
                  if (isSelectedByOther) return null;
                  return (
                    <option key={catalogItem.itemId} value={catalogItem.itemId}>
                      {catalogItem.nombre}
                    </option>
                  );
                })}
              </select>
              <div className="flex w-full sm:w-auto items-center gap-3">
                <input
                  type="number"
                  min={1}
                  value={item.cantidad}
                  onChange={(e) => onItemChange(index, "cantidad", e.target.value)}
                  disabled={saving}
                  className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => onRemoveItem(index)}
                  disabled={saving || draft.items.length <= 1}
                  className="w-full sm:w-auto rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-200 disabled:opacity-50 transition-colors"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
          
          <button
            type="button"
            onClick={onAddItem}
            disabled={saving}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700">+</span>
            Agregar otro equipo
          </button>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-stone-100">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="rounded-xl px-6 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl bg-violet-700 px-6 py-3 text-sm font-bold text-white hover:bg-violet-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar Asignación"}
          </button>
        </div>
      </article>
    </section>
  );
}
