"use client";

import { useMemo, useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { formatUruguayanCi } from "@/lib/ci";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";
import { buildSearchIndex, filterSearchIndex } from "@/lib/search-index";
import type { Equipo, OficialSuboficial, Personal } from "@/types/entities";
import type { RegistroDraft } from "@/types/forms";
import { ModalFrame } from "./ModalFrame";

type RegistroEditorModalProps = {
  draft: RegistroDraft | null;
  personaLabel: string | null;
  personalFiltrado: Personal[];
  oficialesSuboficiales: OficialSuboficial[];
  equiposOrdenados: Equipo[];
  maxFechaIngreso: string;
  saving: boolean;
  onClose: () => void;
  onDateChange: (value: string) => void;
  onComentariosChange: (value: string) => void;
  onDestinatarioTipoChange: (value: RegistroDraft["destinatarioTipo"]) => void;
  onRecintoClaseChange: (value: RegistroDraft["recintoClase"]) => void;
  onRecintoNombreChange: (value: string) => void;
  onRecintoResponsableGradoChange: (value: string) => void;
  onRecintoResponsableNombreChange: (value: string) => void;
  onRecintoResponsableApellidoChange: (value: string) => void;
  onRecintoResponsableCiChange: (value: string) => void;
  onDestinatarioExternoGradoChange: (value: string) => void;
  onDestinatarioExternoNombreChange: (value: string) => void;
  onDestinatarioExternoApellidoChange: (value: string) => void;
  onDestinatarioExternoCiChange: (value: string) => void;
  onDestinatarioExternoUnidadDestinoChange: (value: string) => void;
  onToggleIncluirFueraDeHoja: () => void;
  onToggleDestinatario: (ci: string) => void;
  onSelectAllDestinatarios: () => void;
  onClearDestinatarios: () => void;
  onItemChange: (index: number, field: "itemId" | "cantidad", value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  onSubmitAndPrint: () => void;
};

export function RegistroEditorModal({
  draft,
  personaLabel,
  personalFiltrado,
  oficialesSuboficiales,
  equiposOrdenados,
  maxFechaIngreso,
  saving,
  onClose,
  onDateChange,
  onComentariosChange,
  onDestinatarioTipoChange,
  onRecintoClaseChange,
  onRecintoNombreChange,
  onRecintoResponsableGradoChange,
  onRecintoResponsableNombreChange,
  onRecintoResponsableApellidoChange,
  onRecintoResponsableCiChange,
  onDestinatarioExternoGradoChange,
  onDestinatarioExternoNombreChange,
  onDestinatarioExternoApellidoChange,
  onDestinatarioExternoCiChange,
  onDestinatarioExternoUnidadDestinoChange,
  onToggleIncluirFueraDeHoja,
  onToggleDestinatario,
  onSelectAllDestinatarios,
  onClearDestinatarios,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onSubmit,
  onSubmitAndPrint,
}: RegistroEditorModalProps) {
  const [destinatarioSearch, setDestinatarioSearch] = useState("");

  const personalDestinatarioOptions = useMemo(() => {
    const subalternos = personalFiltrado.map((persona) => ({
      ci: persona.ci,
      label: `${persona.rango.abreviacion} ${apellidosLabel(persona)}, ${nombresLabel(persona)}`.replace(/\s+/g, " ").trim(),
      batteryLabel: persona.bateria?.nombre ?? null,
    }));
    const mandos = oficialesSuboficiales.map((registro) => ({
      ci: registro.ci,
      label: `${registro.gradoMando.abreviacion} ${registro.apellido}, ${registro.nombre}`.replace(/\s+/g, " ").trim(),
      batteryLabel: null,
    }));
    return [...subalternos, ...mandos].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [oficialesSuboficiales, personalFiltrado]);
  const personalSearchIndex = useMemo(
    () =>
      buildSearchIndex(personalDestinatarioOptions, {
        text: (persona) => `${persona.label} ${persona.batteryLabel ?? ""}`,
        digits: (persona) => `${persona.ci} ${formatUruguayanCi(persona.ci)}`,
      }),
    [personalDestinatarioOptions],
  );
  const personalVisible = useMemo(
    () => filterSearchIndex(personalSearchIndex, destinatarioSearch),
    [destinatarioSearch, personalSearchIndex],
  );
  if (!draft) return null;
  const isRectificacion = draft.modo === "rectificar";
  const movementLabel = draft.tipo === "ENTREGA" ? "Entrega" : draft.tipo === "DEVOLUCION" ? "Devolución" : "Asignación";
  const selectedCis =
    draft.ciList.length > 0 ? Array.from(new Set(draft.ciList)) : draft.ci.trim() !== "" ? [draft.ci.trim()] : [];
  const selectedCiSet = new Set(selectedCis);
  const equiposOrdenadosAlfabeticamente = [...equiposOrdenados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );
  const canIncludeFueraDeHoja = draft.modo === "crear" && (draft.tipo === "ENTREGA" || draft.tipo === "ASIGNACION");
  const includeInactiveItems = canIncludeFueraDeHoja && draft.incluirFueraDeHoja;
  const showPersonalDestinatarios = !isRectificacion && draft.destinatarioTipo === "PERSONAL";
  const showRecintoFields = draft.destinatarioTipo === "RECINTO";
  const showExternoFields = draft.destinatarioTipo === "EXTERNO";
  const canPrintReceipt =
    draft.modo === "crear" &&
    (draft.destinatarioTipo === "RECINTO" ||
      draft.destinatarioTipo === "EXTERNO" ||
      (draft.tipo === "ASIGNACION" && draft.destinatarioTipo === "PERSONAL" && selectedCis.length === 1));

  return (
    <ModalFrame onClose={onClose} size="lg" closeOnBackdrop={false}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-stone-900">
            {draft.modo === "rectificar" ? `Rectificar ${movementLabel}` : `Registrar ${movementLabel}`}
          </h3>
          {isRectificacion ? <p className="text-xs text-stone-600">{`CI: ${formatUruguayanCi(draft.ci)}`}</p> : null}
          {!isRectificacion && draft.destinatarioTipo === "PERSONAL" ? <p className="text-xs text-stone-600">{`Destinatarios seleccionados: ${selectedCis.length}`}</p> : null}
          {!isRectificacion && draft.destinatarioTipo === "RECINTO" ? <p className="text-xs text-stone-600">Destino: recinto</p> : null}
          {!isRectificacion && draft.destinatarioTipo === "EXTERNO" ? <p className="text-xs text-stone-600">Destino: externo</p> : null}
          {draft.modo === "rectificar" && draft.registroId ? <p className="text-xs text-stone-600">{`Registro #${draft.registroId}`}</p> : null}
          {personaLabel ? <p className="text-xs font-medium text-stone-700">{`Subalterno: ${personaLabel}`}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded bg-stone-600 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cerrar
        </button>
      </div>

      {saving ? (
        <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
          Actualizando movimiento...
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {!isRectificacion ? (
          <label className="text-xs text-stone-700 sm:col-span-2">
            Tipo de destinatario
            <select
              value={draft.destinatarioTipo}
              disabled={saving}
              onChange={(event) => onDestinatarioTipoChange(event.target.value as RegistroDraft["destinatarioTipo"])}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="PERSONAL">Personal</option>
              {draft.tipo === "ASIGNACION" ? <option value="RECINTO">Recinto</option> : null}
              {draft.tipo === "ASIGNACION" ? <option value="EXTERNO">Externo</option> : null}
            </select>
          </label>
        ) : null}
        <label className="text-xs text-stone-700">
          Fecha
          <DateTextInput
            value={draft.fecha}
            disabled={saving}
            onChange={onDateChange}
            ariaLabel={`Fecha del movimiento. Maximo ${maxFechaIngreso}`}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-stone-700">
          Comentarios (opcional)
          <input
            value={draft.comentarios}
            disabled={saving}
            onChange={(event) => onComentariosChange(event.target.value)}
            placeholder="Detalle breve"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {showRecintoFields ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_minmax(0,1fr)]">
            <label className="text-xs text-stone-700">
              Clase de recinto
              <select
                value={draft.recintoClase}
                disabled={saving}
                onChange={(event) => onRecintoClaseChange(event.target.value as RegistroDraft["recintoClase"])}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="INTERNO">Dentro de la unidad</option>
                <option value="EXTERNO">Fuera de la unidad</option>
              </select>
            </label>
            <label className="text-xs text-stone-700">
              Nombre del recinto
              <input
                value={draft.recintoNombre}
                disabled={saving}
                onChange={(event) => onRecintoNombreChange(event.target.value)}
                placeholder="Ej.: Batería A / Ministerio de Defensa"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          
          <div className="mt-1 rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold text-stone-700 mb-2">Responsable a Cargo (Quien recibe)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs text-stone-700">
                Grado (Opcional)
                <input
                  value={draft.recintoResponsableGrado}
                  disabled={saving}
                  onChange={(event) => onRecintoResponsableGradoChange(event.target.value)}
                  placeholder="Ej.: Sdo. 1ro."
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                CI (Opcional)
                <input
                  value={draft.recintoResponsableCi}
                  disabled={saving}
                  onChange={(event) => onRecintoResponsableCiChange(event.target.value)}
                  placeholder="Ej.: 5.123.456-7"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Nombres (Opcional)
                <input
                  value={draft.recintoResponsableNombre}
                  disabled={saving}
                  onChange={(event) => onRecintoResponsableNombreChange(event.target.value)}
                  placeholder="Nombres"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Apellidos (Opcional)
                <input
                  value={draft.recintoResponsableApellido}
                  disabled={saving}
                  onChange={(event) => onRecintoResponsableApellidoChange(event.target.value)}
                  placeholder="Apellidos"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {showExternoFields ? (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="text-xs text-stone-700">
            Grado
            <input
              value={draft.destinatarioExternoGrado}
              disabled={saving}
              onChange={(event) => onDestinatarioExternoGradoChange(event.target.value)}
              placeholder="Ej.: Tte. 1ro."
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-stone-700">
            CI
            <input
              value={draft.destinatarioExternoCi}
              disabled={saving}
              onChange={(event) => onDestinatarioExternoCiChange(event.target.value)}
              placeholder="Ej.: 5.123.456-7"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-stone-700">
            Nombre
            <input
              value={draft.destinatarioExternoNombre}
              disabled={saving}
              onChange={(event) => onDestinatarioExternoNombreChange(event.target.value)}
              placeholder="Nombre"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-stone-700">
            Apellido
            <input
              value={draft.destinatarioExternoApellido}
              disabled={saving}
              onChange={(event) => onDestinatarioExternoApellidoChange(event.target.value)}
              placeholder="Apellido"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-stone-700 sm:col-span-2">
            Unidad de destino
            <input
              value={draft.destinatarioExternoUnidadDestino}
              disabled={saving}
              onChange={(event) => onDestinatarioExternoUnidadDestinoChange(event.target.value)}
              placeholder="Ej.: Brigada de Infantería No. 5"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      ) : null}

      {canIncludeFueraDeHoja ? (
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <input
            type="checkbox"
            checked={draft.incluirFueraDeHoja}
            disabled={saving}
            onChange={onToggleIncluirFueraDeHoja}
            className="mt-0.5"
          />
          <span>
            Incluir equipos fuera de hoja de entrega (no visibles en la hoja estándar).
          </span>
        </label>
      ) : null}

      {showPersonalDestinatarios ? (
        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Destinatarios</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onSelectAllDestinatarios}
                disabled={saving || personalDestinatarioOptions.length === 0}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                onClick={onClearDestinatarios}
                disabled={saving || selectedCis.length === 0}
                className="rounded border border-stone-300 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Limpiar
              </button>
            </div>
          </div>
          <input
            value={destinatarioSearch}
            disabled={saving}
            onChange={(event) => setDestinatarioSearch(event.target.value)}
            placeholder="Buscar por CI, apellidos o nombres"
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
          />
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-stone-200 bg-white p-2">
            {personalVisible.length === 0 ? (
              <p className="px-2 py-2 text-xs text-stone-500">No hay personal para el filtro actual.</p>
            ) : (
              personalVisible.map((persona) => {
                const checked = selectedCiSet.has(persona.ci);
                return (
                  <label
                    key={persona.ci}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs ${
                      checked ? "bg-emerald-50 text-emerald-900" : "hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={saving}
                      onChange={() => onToggleDestinatario(persona.ci)}
                    />
                    <span className="font-mono text-[11px] text-stone-600">{formatUruguayanCi(persona.ci)}</span>
                    <span className="text-stone-800">{persona.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Equipos del movimiento</p>
        {draft.items.map((item, index) => (
          <div key={`reg-item-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
            <select
              value={item.itemId}
              disabled={saving}
              onChange={(event) => onItemChange(index, "itemId", event.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar equipo</option>
              {equiposOrdenadosAlfabeticamente
                .filter((catalogItem) => {
                  if (!includeInactiveItems && !catalogItem.activo && catalogItem.itemId !== item.itemId) return false;
                  if (catalogItem.itemId === item.itemId) return true;
                  return !draft.items.some(
                    (selectedItem, selectedIndex) => selectedIndex !== index && selectedItem.itemId === catalogItem.itemId,
                  );
                })
                .map((catalogItem) => (
                  <option key={catalogItem.itemId} value={catalogItem.itemId}>
                    {catalogItem.activo ? catalogItem.nombre : `${catalogItem.nombre} (fuera de hoja)`}
                  </option>
                ))}
            </select>
            <input
              type="number"
              min={1}
              value={item.cantidad}
              disabled={saving}
              onChange={(event) => onItemChange(index, "cantidad", event.target.value)}
              className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onRemoveItem(index)}
              disabled={saving || draft.items.length <= 1}
              className="rounded bg-rose-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-between gap-2">
        <div>
          <button
            type="button"
            onClick={onAddItem}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-stone-800 text-[10px] font-bold text-white">+</span>
            Equipo
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {canPrintReceipt ? (
            <button
              type="button"
              onClick={onSubmitAndPrint}
              disabled={saving}
              className="rounded border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Preparando..." : "Guardar e imprimir recibo"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSubmit}
            disabled={saving}
            className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? draft.modo === "rectificar"
                ? "Guardando rectificación..."
                : "Guardando movimiento..."
              : draft.modo === "rectificar"
                ? "Guardar rectificación"
                : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}
