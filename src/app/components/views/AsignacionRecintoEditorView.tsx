"use client";

import { useState, useEffect, useMemo } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import type { Equipo, Rango, Personal, OficialSuboficial } from "@/types/entities";
import { api } from "@/lib/api";
import { getTodayDateInput } from "@/lib/date-helpers";
import { isValidUruguayanCi } from "@/lib/ci";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";

type AsignacionRecintoEditorViewProps = {
  equiposOrdenados: Equipo[];
  rangos?: Rango[];
  baterias?: Array<{ bateriaId: number; nombre: string; orden: number }>;
  personal?: Personal[];
  oficialesSuboficiales?: OficialSuboficial[];
  maxFechaIngreso: string;
  onBack: () => void;
  onSuccess: () => void;
};

type Draft = {
  fecha: string;
  comentarios: string;
  entidadBeneficiariaTipo: "INTERNO" | "EXTERNO";
  entidadBeneficiariaDetalle: string;
  personalCi: string;
  grado: string;
  ci: string;
  nombre: string;
  apellido: string;
  equipos: Array<{ equipoId: string; cantidad: number; comentario: string }>;
};

export function AsignacionRecintoEditorView({
  equiposOrdenados,
  rangos = [],
  baterias = [],
  personal = [],
  oficialesSuboficiales = [],
  onBack,
  onSuccess,
}: AsignacionRecintoEditorViewProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entidadesPrevias, setEntidadesPrevias] = useState<string[]>([]);

  useEffect(() => {
    api("/api/entidades-beneficiarias")
      .then((res: unknown) => (res as Response).json())
      .then((data: string[]) => {
        const set = new Set<string>(data);
        baterias.forEach(b => set.add(b.nombre));
        setEntidadesPrevias(Array.from(set).sort());
      })
      .catch(() => {
        setEntidadesPrevias(baterias.map(b => b.nombre).sort());
      });
  }, [baterias]);

  const [draft, setDraft] = useState<Draft>({
    fecha: getTodayDateInput(),
    comentarios: "",
    entidadBeneficiariaTipo: "INTERNO",
    entidadBeneficiariaDetalle: "",
    personalCi: "",
    grado: "",
    ci: "",
    nombre: "",
    apellido: "",
    equipos: [{ equipoId: "", cantidad: 1, comentario: "" }],
  });

  const recipientOptions = useMemo(() => {
    const list = [];
    for (const p of personal) {
      list.push({
        ci: p.ci,
        label: `${p.rango.abreviacion} ${apellidosLabel(p)}, ${nombresLabel(p)}`,
        data: { grado: p.rango.abreviacion, nombre: nombresLabel(p), apellido: apellidosLabel(p), ci: p.ci }
      });
    }
    for (const p of oficialesSuboficiales) {
      list.push({
        ci: p.ci,
        label: `${p.gradoMando.abreviacion} ${p.apellido}, ${p.nombre}`,
        data: { grado: p.gradoMando.abreviacion, nombre: p.nombre, apellido: p.apellido, ci: p.ci }
      });
    }
    return list.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [personal, oficialesSuboficiales]);

  const onPersonalCiChange = (ci: string) => {
    const selected = recipientOptions.find(opt => opt.ci === ci);
    if (selected) {
      setDraft(prev => ({
        ...prev,
        personalCi: ci,
        grado: selected.data.grado,
        nombre: selected.data.nombre,
        apellido: selected.data.apellido,
        ci: selected.data.ci
      }));
    } else {
      setDraft(prev => ({
        ...prev,
        personalCi: ci,
        grado: "",
        nombre: "",
        apellido: "",
        ci: ""
      }));
    }
  };

  const equiposOrdenadosAlfabeticamente = [...equiposOrdenados].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }),
  );

  const updateDraft = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const onItemChange = (index: number, field: "equipoId" | "cantidad" | "comentario", value: string | number) => {
    setDraft((prev) => {
      const next = [...prev.equipos];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, equipos: next };
    });
  };

  const onAddItem = () => {
    setDraft((prev) => ({ ...prev, equipos: [...prev.equipos, { equipoId: "", cantidad: 1, comentario: "" }] }));
  };

  const onRemoveItem = (index: number) => {
    setDraft((prev) => {
      const next = [...prev.equipos];
      next.splice(index, 1);
      return { ...prev, equipos: next };
    });
  };

  const onSubmit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const validItems = draft.equipos.filter((i) => i.equipoId && i.cantidad > 0);
    if (validItems.length === 0) {
      setError("Debes agregar al menos un equipo válido.");
      setSaving(false);
      return;
    }

    if (draft.entidadBeneficiariaTipo === "INTERNO") {
      if (!draft.personalCi) {
        setError("Debes seleccionar el personal destinatario.");
        setSaving(false);
        return;
      }
    } else {
      if (!draft.grado || !draft.nombre || !draft.apellido) {
        setError("Debes completar el grado, nombre y apellido del destinatario.");
        setSaving(false);
        return;
      }
      if (draft.ci.trim() !== "" && !isValidUruguayanCi(draft.ci)) {
        setError("La Cédula de Identidad ingresada no es válida.");
        setSaving(false);
        return;
      }
    }

    if (!draft.entidadBeneficiariaDetalle) {
      setError("Debes detallar la entidad beneficiaria.");
      setSaving(false);
      return;
    }

    try {
      const unidadDestino = draft.entidadBeneficiariaTipo === "INTERNO" 
        ? `Interno a la Unidad - ${draft.entidadBeneficiariaDetalle}` 
        : `Externo a la Unidad - ${draft.entidadBeneficiariaDetalle}`;

      const finalCi = draft.ci.trim() === "" ? `SD-${Date.now()}` : draft.ci;

      const payload = {
        modo: "crear",
        tipo: "ASIGNACION",
        fecha: draft.fecha,
        destinatarioTipo: "EXTERNO",
        destinatarioExterno: {
          grado: draft.grado,
          ci: finalCi,
          nombre: draft.nombre,
          apellido: draft.apellido,
          unidadDestino: unidadDestino,
        },
        equipos: validItems,
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
        <div className="flex equipos-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Registrar Asignación</h2>
            <p className="mt-1 text-sm text-stone-600">Completa los datos para asignar equipo a un beneficiario.</p>
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
            Fecha
            <DateTextInput
              value={draft.fecha}
              onChange={(val) => updateDraft("fecha", val)}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600 border-b border-stone-200 pb-2">
            Entidad Beneficiaria
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-stone-700">
              Tipo de Entidad
              <select
                value={draft.entidadBeneficiariaTipo}
                onChange={(e) => updateDraft("entidadBeneficiariaTipo", e.target.value as "INTERNO" | "EXTERNO")}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="INTERNO">Interno a la Unidad</option>
                <option value="EXTERNO">Externo a la Unidad</option>
              </select>
            </label>
            <label className="text-sm font-medium text-stone-700">
              {draft.entidadBeneficiariaTipo === "INTERNO" ? "Detalle de Entidad" : "Entidad receptora"}
              <input
                list="entidades-previas"
                value={draft.entidadBeneficiariaDetalle}
                onChange={(e) => updateDraft("entidadBeneficiariaDetalle", e.target.value)}
                disabled={saving}
                placeholder={draft.entidadBeneficiariaTipo === "INTERNO" ? "Ej.: Batería Comando" : "Ej.: Brigada de Infantería No. 5"}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
              <datalist id="entidades-previas">
                {entidadesPrevias.map((entidad, idx) => (
                  <option key={idx} value={entidad} />
                ))}
              </datalist>
            </label>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600 border-b border-stone-200 pb-2">
            Datos del Destinatario
          </h3>
          {draft.entidadBeneficiariaTipo === "INTERNO" ? (
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Personal Destinatario *
                </label>
                <DestinatarioSearchSelect
                  options={recipientOptions}
                  value={draft.personalCi}
                  disabled={saving}
                  placeholder="Buscar destinatario por grado, apellido, nombre o CI"
                  onChange={onPersonalCiChange}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-stone-700">
                Grado
                <select
                  value={draft.grado}
                  onChange={(e) => updateDraft("grado", e.target.value)}
                  disabled={saving}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Seleccionar grado</option>
                  {rangos
                    .filter((r) => r.nombreCompleto !== "Desarrollo" && r.abreviacion !== "Desarrollo")
                    .map((r) => (
                      <option key={r.rangoId} value={r.abreviacion}>
                        {r.abreviacion} - {r.nombreCompleto}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm font-medium text-stone-700">
                CI (Opcional)
                <input
                  value={draft.ci}
                  onChange={(e) => updateDraft("ci", e.target.value)}
                  disabled={saving}
                  placeholder="Ej.: 5.123.456-7"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                Nombres
                <input
                  value={draft.nombre}
                  onChange={(e) => updateDraft("nombre", e.target.value)}
                  disabled={saving}
                  placeholder="Nombres"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm font-medium text-stone-700">
                Apellidos
                <input
                  value={draft.apellido}
                  onChange={(e) => updateDraft("apellido", e.target.value)}
                  disabled={saving}
                  placeholder="Apellidos"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-stone-600 border-b border-stone-200 pb-2">
            Equipos Asignados
          </h3>
          {draft.equipos.map((equipo, index) => (
            <div key={index} className="flex flex-col gap-3 bg-stone-50 p-4 rounded-lg border border-stone-200">
              <div className="flex flex-col sm:flex-row equipos-start sm:equipos-center gap-3">
                <select
                  value={equipo.equipoId}
                  onChange={(e) => onItemChange(index, "equipoId", e.target.value)}
                  disabled={saving}
                  className="w-full sm:flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Seleccionar equipo</option>
                  {equiposOrdenadosAlfabeticamente.map((catalogItem) => {
                    const isSelectedByOther = draft.equipos.some((i, idx) => idx !== index && i.equipoId === catalogItem.equipoId);
                    if (isSelectedByOther) return null;
                    return (
                      <option key={catalogItem.equipoId} value={catalogItem.equipoId}>
                        {catalogItem.nombre}
                      </option>
                    );
                  })}
                </select>
                <div className="flex w-full sm:w-auto equipos-center gap-3">
                  <input
                    type="number"
                    min={1}
                    value={equipo.cantidad}
                    onChange={(e) => onItemChange(index, "cantidad", Number(e.target.value))}
                    disabled={saving}
                    className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    disabled={saving || draft.equipos.length <= 1}
                    className="w-full sm:w-auto rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-200 disabled:opacity-50 transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={equipo.comentario}
                onChange={(e) => onItemChange(index, "comentario", e.target.value)}
                disabled={saving}
                placeholder="Comentario sobre el equipo (opcional)"
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          ))}
          
          <button
            type="button"
            onClick={onAddItem}
            disabled={saving}
            className="mt-2 inline-flex equipos-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-400 transition-colors"
          >
            <span className="inline-flex h-5 w-5 equipos-center justify-center rounded-full bg-stone-200 text-stone-700">+</span>
            Agregar otro equipo
          </button>
        </div>

        <div className="mt-6">
          <label className="text-sm font-medium text-stone-700">
            Comentarios generales (opcional)
            <input
              value={draft.comentarios}
              onChange={(e) => updateDraft("comentarios", e.target.value)}
              disabled={saving}
              placeholder="Detalle breve del recibo"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
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
