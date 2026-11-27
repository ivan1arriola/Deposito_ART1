"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import type { Articulo, Equipo, OficialSuboficial, Personal, Rango } from "@/types/entities";
import { api } from "@/lib/api";
import { isValidUruguayanCi } from "@/lib/ci";
import { getTodayDateInput } from "@/lib/date-helpers";
import {
  extractEntidadLabelFromUnidadDestino,
  mergeEntidadesBeneficiariasCatalog,
  normalizeEntidadBeneficiariaKey,
  sortEntidadesBeneficiariasEs,
  type EntidadBeneficiariaClase,
  type EntidadBeneficiariaItem,
} from "@/lib/entidades-beneficiarias";
import { apellidosLabel, nombresLabel } from "@/lib/formatters";

type AsignacionRecintoEditorViewProps = {
  equiposOrdenados: Equipo[];
  articulosCatalogo?: Articulo[];
  rangos?: Rango[];
  baterias?: Array<{ bateriaId: number; nombre: string; orden: number }>;
  personal?: Personal[];
  oficialesSuboficiales?: OficialSuboficial[];
  maxFechaIngreso: string;
  registroId?: string | null;
  onBack: () => void;
  onSuccess: () => void;
};

type EquipoDraftLine = {
  equipoId: string;
  cantidad: number;
  comentario: string;
};

type ArticuloDraftLine = {
  articuloId: string;
  cantidad: number;
  comentario: string;
};

type Draft = {
  fecha: string;
  comentarios: string;
  entidadBeneficiariaTipo: EntidadBeneficiariaClase;
  entidadBeneficiariaDetalle: string;
  personalCi: string;
  grado: string;
  ci: string;
  nombre: string;
  apellido: string;
  equipos: EquipoDraftLine[];
  articulos: ArticuloDraftLine[];
};

type EntidadesCatalogApiResponse =
  | string[]
  | {
      entidades?: EntidadBeneficiariaItem[];
      internas?: EntidadBeneficiariaItem[];
      externas?: EntidadBeneficiariaItem[];
    };

type RegistroDetailApiResponse = {
  registroId: string;
  fecha: string;
  tipo: string;
  anulado?: boolean;
  comentarios: string | null;
  destinatarioTipo: "PERSONAL" | "RECINTO" | "EXTERNO";
  recintoClase: "INTERNO" | "EXTERNO" | null;
  recintoNombre: string | null;
  recintoResponsableInfo: {
    grado: string;
    nombre: string;
    apellido: string;
    ci: string;
  } | null;
  destinatarioExternoInfo: {
    grado: string;
    nombre: string;
    apellido: string;
    ci: string;
    unidadDestino: string;
  } | null;
  equipos: Array<{ equipoId: string; nombre: string; cantidad: number }>;
  articulos?: Array<{ articuloId: number; nombre: string; tipo: string; cantidad: number }>;
};

function createEmptyDraft(): Draft {
  return {
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
    articulos: [],
  };
}

function getEquipoCategoryLabel(equipo: Equipo): string {
  const label = equipo.tipoLabel?.trim();
  if (label) return label;
  return equipo.tipo || "Otros";
}

function getArticuloTipoLabel(tipo: string): string {
  if (tipo === "OFICINA") return "Oficina";
  if (tipo === "LIMPIEZA") return "Limpieza";
  return tipo || "Otros";
}

function getFirstErrorElementId(fieldErrors: Record<string, string>): string | null {
  const keys = Object.keys(fieldErrors);
  return keys.length > 0 ? keys[0] : null;
}

export function AsignacionRecintoEditorView({
  equiposOrdenados,
  articulosCatalogo,
  rangos = [],
  baterias = [],
  personal = [],
  oficialesSuboficiales = [],
  maxFechaIngreso,
  registroId = null,
  onBack,
  onSuccess,
}: AsignacionRecintoEditorViewProps) {
  const isEditing = Boolean(registroId);
  const [saving, setSaving] = useState(false);
  const [loadingRegistro, setLoadingRegistro] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [entidadesCatalogo, setEntidadesCatalogo] = useState<EntidadBeneficiariaItem[]>([]);
  const [entidadSearch, setEntidadSearch] = useState("");
  const [loadedArticulos, setLoadedArticulos] = useState<Articulo[]>([]);
  const [originalDestinatarioTipo, setOriginalDestinatarioTipo] = useState<"RECINTO" | "EXTERNO">(
    "EXTERNO"
  );
  const [loadedAnulado, setLoadedAnulado] = useState(false);
  const [pendingPrintRegistroId, setPendingPrintRegistroId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(createEmptyDraft);
  const inFlightRef = useRef(false);

  const articulosDisponibles = useMemo(() => {
    const source = articulosCatalogo ?? loadedArticulos;
    return [...source].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
    );
  }, [articulosCatalogo, loadedArticulos]);

  useEffect(() => {
    let cancelled = false;
    api<EntidadesCatalogApiResponse>("/api/entidades-beneficiarias?format=catalog")
      .then((data) => {
        if (cancelled) return;
        let baseItems: EntidadBeneficiariaItem[] = [];
        if (Array.isArray(data)) {
          baseItems = data.map((nombre) => ({
            clase: "INTERNO" as const,
            nombre,
            activo: true,
          }));
        } else if (data && Array.isArray(data.entidades)) {
          baseItems = data.entidades;
        }
        const merged = mergeEntidadesBeneficiariasCatalog(
          baseItems,
          baterias.map((b) => ({ clase: "INTERNO" as const, nombre: b.nombre }))
        );
        setEntidadesCatalogo(merged);
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = mergeEntidadesBeneficiariasCatalog(
          [],
          baterias.map((b) => ({ clase: "INTERNO" as const, nombre: b.nombre }))
        );
        setEntidadesCatalogo(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [baterias]);

  useEffect(() => {
    if (articulosCatalogo !== undefined) return;
    let cancelled = false;
    api<Articulo[]>("/api/articulos")
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setLoadedArticulos(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadedArticulos([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [articulosCatalogo]);

  const recipientOptions = useMemo(() => {
    const list = [];
    for (const p of personal) {
      list.push({
        ci: p.ci,
        label: `${p.rango.abreviacion} ${apellidosLabel(p)}, ${nombresLabel(p)}`,
        data: {
          grado: p.rango.abreviacion,
          nombre: nombresLabel(p),
          apellido: apellidosLabel(p),
          ci: p.ci,
        },
      });
    }
    for (const p of oficialesSuboficiales) {
      list.push({
        ci: p.ci,
        label: `${p.gradoMando.abreviacion} ${p.apellido}, ${p.nombre}`,
        data: {
          grado: p.gradoMando.abreviacion,
          nombre: p.nombre,
          apellido: p.apellido,
          ci: p.ci,
        },
      });
    }
    return list.sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [personal, oficialesSuboficiales]);

  const recipientOptionsRef = useRef(recipientOptions);
  recipientOptionsRef.current = recipientOptions;

  useEffect(() => {
    if (!registroId) {
      setDraft(createEmptyDraft());
      setOriginalDestinatarioTipo("EXTERNO");
      setLoadedAnulado(false);
      setLoadError(null);
      setFieldErrors({});
      setError(null);
      setPendingPrintRegistroId(null);
      return;
    }

    let cancelled = false;
    setLoadingRegistro(true);
    setLoadError(null);
    setError(null);
    setFieldErrors({});
    setPendingPrintRegistroId(null);

    api<RegistroDetailApiResponse>(`/api/registros/${encodeURIComponent(registroId)}`)
      .then((detail) => {
        if (cancelled) return;
        setLoadedAnulado(Boolean(detail.anulado));

        let entidadClase: EntidadBeneficiariaClase = "INTERNO";
        let entidadNombre = "";
        let respGrado = "";
        let respNombre = "";
        let respApellido = "";
        let respCi = "";

        if (detail.destinatarioTipo === "RECINTO") {
          setOriginalDestinatarioTipo("RECINTO");
          entidadClase = detail.recintoClase === "EXTERNO" ? "EXTERNO" : "INTERNO";
          entidadNombre = detail.recintoNombre ?? "";
          respGrado = detail.recintoResponsableInfo?.grado ?? "";
          respNombre = detail.recintoResponsableInfo?.nombre ?? "";
          respApellido = detail.recintoResponsableInfo?.apellido ?? "";
          respCi = detail.recintoResponsableInfo?.ci ?? "";
        } else {
          setOriginalDestinatarioTipo("EXTERNO");
          const ext = detail.destinatarioExternoInfo;
          const extracted = ext?.unidadDestino
            ? extractEntidadLabelFromUnidadDestino(ext.unidadDestino)
            : null;
          entidadClase = extracted?.clase ?? "EXTERNO";
          entidadNombre = extracted?.nombre ?? ext?.unidadDestino ?? "";
          respGrado = ext?.grado ?? "";
          respNombre = ext?.nombre ?? "";
          respApellido = ext?.apellido ?? "";
          respCi = ext?.ci ?? "";
        }

        const matchedPersonal = respCi
          ? recipientOptionsRef.current.find((opt) => opt.ci === respCi)
          : null;
        const rawEquipos = Array.isArray(detail.equipos) ? detail.equipos : [];
        const rawArticulos = Array.isArray(detail.articulos) ? detail.articulos : [];
        const equiposLines: EquipoDraftLine[] =
          rawEquipos.length > 0
            ? rawEquipos.map((e) => ({
                equipoId: e.equipoId,
                cantidad: e.cantidad,
                comentario: "",
              }))
            : [];
        const articulosLines: ArticuloDraftLine[] = rawArticulos.map((a) => ({
          articuloId: String(a.articuloId),
          cantidad: a.cantidad,
          comentario: "",
        }));

        setDraft({
          fecha: detail.fecha || getTodayDateInput(),
          comentarios: detail.comentarios ?? "",
          entidadBeneficiariaTipo: entidadClase,
          entidadBeneficiariaDetalle: entidadNombre,
          personalCi: matchedPersonal ? matchedPersonal.ci : "",
          grado: respGrado,
          ci: respCi,
          nombre: respNombre,
          apellido: respApellido,
          equipos:
            equiposLines.length === 0 && articulosLines.length === 0
              ? [{ equipoId: "", cantidad: 1, comentario: "" }]
              : equiposLines,
          articulos: articulosLines,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "No se pudieron cargar los datos de la asignación."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRegistro(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [registroId]);

  useEffect(() => {
    if (!registroId || draft.personalCi || !draft.ci || draft.ci.startsWith("SD-")) return;
    const matched = recipientOptions.find((opt) => opt.ci === draft.ci);
    if (matched) {
      setDraft((prev) => ({
        ...prev,
        personalCi: matched.ci,
      }));
    }
  }, [registroId, draft.personalCi, draft.ci, recipientOptions]);

  const entidadesInternas = useMemo(() => {
    const activas = entidadesCatalogo.filter((item) => item.clase === "INTERNO" && item.activo);
    const list = [...activas];
    const currentDetail = draft.entidadBeneficiariaDetalle.trim();
    if (draft.entidadBeneficiariaTipo === "INTERNO" && currentDetail !== "") {
      const normalizedCurrent = normalizeEntidadBeneficiariaKey(currentDetail);
      const exists = list.some(
        (item) => normalizeEntidadBeneficiariaKey(item.nombre) === normalizedCurrent
      );
      if (!exists) {
        list.push({
          clase: "INTERNO",
          nombre: currentDetail,
          activo: false,
        });
      }
    }
    const sorted = sortEntidadesBeneficiariasEs(list);
    const searchNorm = normalizeEntidadBeneficiariaKey(entidadSearch);
    if (!searchNorm) return sorted;
    return sorted.filter((item) => {
      if (
        currentDetail &&
        normalizeEntidadBeneficiariaKey(item.nombre) ===
          normalizeEntidadBeneficiariaKey(currentDetail)
      ) {
        return true;
      }
      return normalizeEntidadBeneficiariaKey(item.nombre).includes(searchNorm);
    });
  }, [
    entidadesCatalogo,
    draft.entidadBeneficiariaTipo,
    draft.entidadBeneficiariaDetalle,
    entidadSearch,
  ]);

  const entidadesExternasSugerencias = useMemo(() => {
    const externas = entidadesCatalogo.filter((item) => item.clase === "EXTERNO" && item.activo);
    return sortEntidadesBeneficiariasEs(externas).map((item) => item.nombre);
  }, [entidadesCatalogo]);

  const equiposAgrupadosPorCategoria = useMemo(() => {
    const groups = new Map<string, { label: string; orden: number; items: Equipo[] }>();
    for (const item of equiposOrdenados) {
      const label = getEquipoCategoryLabel(item);
      const orden = item.tipoOrden ?? Number.MAX_SAFE_INTEGER;
      const existing = groups.get(label);
      if (existing) {
        existing.items.push(item);
        if (orden < existing.orden) existing.orden = orden;
      } else {
        groups.set(label, { label, orden, items: [item] });
      }
    }
    return Array.from(groups.values())
      .sort((a, b) => {
        if (a.orden !== b.orden) return a.orden - b.orden;
        return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
      })
      .map((group) => ({
        label: group.label,
        items: [...group.items].sort((a, b) =>
          a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
        ),
      }));
  }, [equiposOrdenados]);

  const articulosAgrupados = useMemo(() => {
    const groups = new Map<string, Articulo[]>();
    for (const articulo of articulosDisponibles) {
      const label = getArticuloTipoLabel(articulo.tipo);
      const current = groups.get(label);
      if (current) {
        current.push(articulo);
      } else {
        groups.set(label, [articulo]);
      }
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es", { sensitivity: "base" }))
      .map(([label, items]) => ({ label, items }));
  }, [articulosDisponibles]);

  const clearFieldError = (fieldKey: string) => {
    setFieldErrors((prev) => {
      if (!(fieldKey in prev)) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const onPersonalCiChange = (ci: string) => {
    clearFieldError("asignacion-personal-responsable");
    const selected = recipientOptions.find((opt) => opt.ci === ci);
    if (selected) {
      setDraft((prev) => ({
        ...prev,
        personalCi: ci,
        grado: selected.data.grado,
        nombre: selected.data.nombre,
        apellido: selected.data.apellido,
        ci: selected.data.ci,
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        personalCi: ci,
        grado: "",
        nombre: "",
        apellido: "",
        ci: "",
      }));
    }
  };

  const updateDraft = <K extends keyof Draft>(field: K, value: Draft[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const onEquipoChange = (
    index: number,
    field: "equipoId" | "cantidad" | "comentario",
    value: string | number
  ) => {
    if (field === "equipoId") clearFieldError(`equipo-select-${index}`);
    if (field === "cantidad") clearFieldError(`equipo-cantidad-${index}`);
    setDraft((prev) => {
      const next = [...prev.equipos];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, equipos: next };
    });
  };

  const onAddEquipo = () => {
    clearFieldError("asignacion-items-requeridos");
    setDraft((prev) => ({
      ...prev,
      equipos: [...prev.equipos, { equipoId: "", cantidad: 1, comentario: "" }],
    }));
  };

  const onRemoveEquipo = (index: number) => {
    setDraft((prev) => {
      const next = [...prev.equipos];
      next.splice(index, 1);
      return { ...prev, equipos: next };
    });
  };

  const onArticuloChange = (
    index: number,
    field: "articuloId" | "cantidad" | "comentario",
    value: string | number
  ) => {
    if (field === "articuloId") clearFieldError(`articulo-select-${index}`);
    if (field === "cantidad") clearFieldError(`articulo-cantidad-${index}`);
    setDraft((prev) => {
      const next = [...prev.articulos];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, articulos: next };
    });
  };

  const onAddArticulo = () => {
    clearFieldError("asignacion-items-requeridos");
    setDraft((prev) => ({
      ...prev,
      articulos: [...prev.articulos, { articuloId: "", cantidad: 1, comentario: "" }],
    }));
  };

  const onRemoveArticulo = (index: number) => {
    setDraft((prev) => {
      const next = [...prev.articulos];
      next.splice(index, 1);
      return { ...prev, articulos: next };
    });
  };

  const hasResponsableData = Boolean(
    draft.personalCi.trim() ||
    draft.grado.trim() ||
    draft.nombre.trim() ||
    draft.apellido.trim() ||
    draft.ci.trim()
  );

  const validateDraft = () => {
    const errors: Record<string, string> = {};

    if (!draft.fecha.trim()) {
      errors["asignacion-fecha"] = "Debes ingresar la fecha de la asignación.";
    }

    if (!draft.entidadBeneficiariaDetalle.trim()) {
      const fieldId =
        draft.entidadBeneficiariaTipo === "INTERNO"
          ? "entidad-beneficiaria-select"
          : "entidad-beneficiaria-input";
      errors[fieldId] = "Debes indicar la entidad beneficiaria.";
    }

    if (draft.entidadBeneficiariaTipo === "INTERNO") {
      const allowEmptyRecintoResponsable = isEditing && originalDestinatarioTipo === "RECINTO";
      if (!allowEmptyRecintoResponsable && !draft.personalCi && !hasResponsableData) {
        errors["asignacion-personal-responsable"] =
          "Debes seleccionar el personal destinatario responsable.";
      }
    } else {
      if (!draft.grado.trim()) {
        errors["externo-grado"] = "Debes seleccionar el grado del destinatario.";
      }
      if (!draft.nombre.trim()) {
        errors["externo-nombre"] = "Debes ingresar los nombres del destinatario.";
      }
      if (!draft.apellido.trim()) {
        errors["externo-apellido"] = "Debes ingresar los apellidos del destinatario.";
      }
      const trimmedCi = draft.ci.trim();
      if (
        trimmedCi !== "" &&
        !trimmedCi.toUpperCase().startsWith("SD-") &&
        !isValidUruguayanCi(trimmedCi)
      ) {
        errors["externo-ci"] = "La cédula de identidad ingresada no es válida.";
      }
    }

    draft.equipos.forEach((equipo, index) => {
      if (equipo.equipoId === "" && (draft.articulos.length === 0 || draft.equipos.length > 1)) {
        errors[`equipo-select-${index}`] = "Selecciona un equipo o quita la fila vacía.";
      } else if (
        equipo.equipoId !== "" &&
        (!Number.isInteger(equipo.cantidad) || equipo.cantidad <= 0)
      ) {
        errors[`equipo-cantidad-${index}`] = "La cantidad debe ser un entero positivo.";
      }
    });

    draft.articulos.forEach((articulo, index) => {
      if (articulo.articuloId === "") {
        errors[`articulo-select-${index}`] = "Selecciona un artículo o quita la fila vacía.";
      } else if (!Number.isInteger(articulo.cantidad) || articulo.cantidad <= 0) {
        errors[`articulo-cantidad-${index}`] = "La cantidad debe ser un entero positivo.";
      }
    });

    const validEquipos = draft.equipos.filter(
      (i) => i.equipoId !== "" && Number.isInteger(i.cantidad) && i.cantidad > 0
    );
    const validArticulos = draft.articulos.filter(
      (i) => i.articuloId !== "" && Number.isInteger(i.cantidad) && i.cantidad > 0
    );

    if (validEquipos.length === 0 && validArticulos.length === 0) {
      errors["asignacion-items-requeridos"] =
        "Debes agregar al menos un equipo o un artículo válido.";
    }

    return { errors, validEquipos, validArticulos };
  };

  const openReceiptWindow = (savedRegistroId: string) => {
    const popup = window.open(
      `/api/registros/${encodeURIComponent(savedRegistroId)}/recibo`,
      "_blank",
      "noopener,noreferrer"
    );
    return Boolean(popup);
  };

  const handleSubmit = async (mode: "save" | "save_and_print") => {
    if (inFlightRef.current || saving || loadingRegistro || loadedAnulado) return;

    const { errors, validEquipos, validArticulos } = validateDraft();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de confirmar la asignación.");
      const firstId = getFirstErrorElementId(errors);
      if (firstId) {
        document.getElementById(firstId)?.focus();
      }
      return;
    }

    inFlightRef.current = true;
    setSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const entidadNombre = draft.entidadBeneficiariaDetalle.trim();
      const unidadDestino =
        draft.entidadBeneficiariaTipo === "INTERNO"
          ? `Interno a la Unidad - ${entidadNombre}`
          : `Externo a la Unidad - ${entidadNombre}`;

      const trimmedCi = draft.ci.trim();
      const finalCi = trimmedCi === "" ? `SD-${Date.now()}` : trimmedCi;

      const basePayload = {
        tipo: "ASIGNACION",
        fecha: draft.fecha,
        equipos: validEquipos.map((e) => ({
          equipoId: e.equipoId,
          cantidad: e.cantidad,
        })),
        articulos: validArticulos.map((a) => ({
          articuloId: Number(a.articuloId),
          cantidad: a.cantidad,
        })),
        comentarios: draft.comentarios,
      };

      const destinatarioPayload =
        isEditing && originalDestinatarioTipo === "RECINTO"
          ? {
              destinatarioTipo: "RECINTO",
              recintoClase: draft.entidadBeneficiariaTipo,
              recintoNombre: entidadNombre,
              destinatarioRecinto: hasResponsableData
                ? {
                    grado: draft.grado.trim(),
                    ci: trimmedCi,
                    nombre: draft.nombre.trim(),
                    apellido: draft.apellido.trim(),
                  }
                : null,
            }
          : {
              destinatarioTipo: "EXTERNO",
              destinatarioExterno: {
                grado: draft.grado.trim(),
                ci: finalCi,
                nombre: draft.nombre.trim(),
                apellido: draft.apellido.trim(),
                unidadDestino,
              },
            };

      let savedId = registroId ?? "";
      if (isEditing && registroId) {
        const res = await api<{ ok?: boolean; registroId?: string }>(
          `/api/registros/${encodeURIComponent(registroId)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              ...basePayload,
              ...destinatarioPayload,
            }),
          }
        );
        savedId = res?.registroId || registroId;
      } else {
        const res = await api<{ ok?: boolean; registroId?: string }>("/api/registros", {
          method: "POST",
          body: JSON.stringify({
            modo: "crear",
            ...basePayload,
            ...destinatarioPayload,
          }),
        });
        savedId = res?.registroId ?? "";
      }

      if (mode === "save_and_print" && savedId) {
        const opened = openReceiptWindow(savedId);
        if (!opened) {
          setPendingPrintRegistroId(savedId);
          setSaving(false);
          inFlightRef.current = false;
          return;
        }
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la asignación.");
      setSaving(false);
    } finally {
      inFlightRef.current = false;
    }
  };

  const validEquiposSummary = draft.equipos.filter(
    (e) => e.equipoId !== "" && Number.isInteger(e.cantidad) && e.cantidad > 0
  );
  const validArticulosSummary = draft.articulos.filter(
    (a) => a.articuloId !== "" && Number.isInteger(a.cantidad) && a.cantidad > 0
  );
  const totalEquiposUnidades = validEquiposSummary.reduce((acc, item) => acc + item.cantidad, 0);
  const totalArticulosUnidades = validArticulosSummary.reduce(
    (acc, item) => acc + item.cantidad,
    0
  );
  const responsableResumen =
    draft.grado || draft.nombre || draft.apellido
      ? `${draft.grado} ${draft.nombre} ${draft.apellido}`.replace(/\s+/g, " ").trim()
      : "Sin responsable especificado";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900">
              {isEditing ? `Editar Asignación #${registroId}` : "Registrar Asignación"}
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              {isEditing
                ? "Rectifica los datos de la asignación, equipos o artículos vinculados."
                : "Completa los datos para asignar equipos y/o artículos a una entidad beneficiaria."}
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Volver
          </button>
        </div>

        {loadingRegistro ? (
          <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm font-medium text-sky-900">
            Cargando datos de la asignación...
          </div>
        ) : null}

        {loadError ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {loadError}
          </div>
        ) : null}

        {loadedAnulado ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900"
          >
            Esta asignación fue anulada y ya no puede modificarse.
          </div>
        ) : null}

        {pendingPrintRegistroId ? (
          <div
            role="status"
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <p className="font-semibold">
              Asignación #{pendingPrintRegistroId} guardada correctamente, pero el navegador bloqueó
              la ventana de impresión.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  const opened = openReceiptWindow(pendingPrintRegistroId);
                  if (opened) {
                    onSuccess();
                  }
                }}
                className="min-h-[44px] rounded-lg bg-violet-700 px-4 py-2 text-xs font-bold text-white hover:bg-violet-800"
              >
                Reintentar impresión
              </button>
              <button
                type="button"
                onClick={onSuccess}
                className="min-h-[44px] rounded-lg border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Ir al listado
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="asignacion-fecha" className="block text-sm font-medium text-stone-700">
              Fecha
            </label>
            <DateTextInput
              id="asignacion-fecha"
              value={draft.fecha}
              onChange={(val) => {
                clearFieldError("asignacion-fecha");
                updateDraft("fecha", val);
              }}
              disabled={saving || loadingRegistro || loadedAnulado}
              ariaLabel={`Fecha de asignación. Máximo ${maxFechaIngreso}`}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            {fieldErrors["asignacion-fecha"] ? (
              <p id="asignacion-fecha-error" className="mt-1 text-xs font-medium text-rose-700">
                {fieldErrors["asignacion-fecha"]}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="border-b border-stone-200 pb-2 text-sm font-bold uppercase tracking-wide text-stone-600">
            Entidad Beneficiaria
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="asignacion-entidad-tipo"
                className="block text-sm font-medium text-stone-700"
              >
                Tipo de Entidad
              </label>
              <select
                id="asignacion-entidad-tipo"
                value={draft.entidadBeneficiariaTipo}
                onChange={(e) => {
                  const nextClase = e.target.value as EntidadBeneficiariaClase;
                  clearFieldError("entidad-beneficiaria-select");
                  clearFieldError("entidad-beneficiaria-input");
                  setEntidadSearch("");
                  updateDraft("entidadBeneficiariaTipo", nextClase);
                  updateDraft("entidadBeneficiariaDetalle", "");
                }}
                disabled={saving || loadingRegistro || loadedAnulado}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
              >
                <option value="INTERNO">Interno a la Unidad</option>
                <option value="EXTERNO">Externo a la Unidad</option>
              </select>
            </div>

            {draft.entidadBeneficiariaTipo === "INTERNO" ? (
              <div className="space-y-2">
                <div>
                  <label
                    htmlFor="entidad-beneficiaria-search"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Buscar entidad interna
                  </label>
                  <input
                    id="entidad-beneficiaria-search"
                    type="search"
                    value={entidadSearch}
                    onChange={(e) => setEntidadSearch(e.target.value)}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    placeholder="Filtrar batería, despacho, sección o recinto"
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="entidad-beneficiaria-select"
                    className="block text-sm font-medium text-stone-700"
                  >
                    Detalle de Entidad
                  </label>
                  <select
                    id="entidad-beneficiaria-select"
                    value={draft.entidadBeneficiariaDetalle}
                    onChange={(e) => {
                      clearFieldError("entidad-beneficiaria-select");
                      updateDraft("entidadBeneficiariaDetalle", e.target.value);
                    }}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    aria-invalid={Boolean(fieldErrors["entidad-beneficiaria-select"])}
                    aria-describedby={
                      fieldErrors["entidad-beneficiaria-select"]
                        ? "entidad-beneficiaria-select-error"
                        : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar entidad interna</option>
                    {entidadesInternas.map((entidad) => (
                      <option key={entidad.nombre} value={entidad.nombre}>
                        {entidad.activo ? entidad.nombre : `${entidad.nombre} (histórica)`}
                      </option>
                    ))}
                  </select>
                  {fieldErrors["entidad-beneficiaria-select"] ? (
                    <p
                      id="entidad-beneficiaria-select-error"
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {fieldErrors["entidad-beneficiaria-select"]}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="entidad-beneficiaria-input"
                  className="block text-sm font-medium text-stone-700"
                >
                  Entidad receptora
                </label>
                <input
                  id="entidad-beneficiaria-input"
                  list="entidades-externas-previas"
                  value={draft.entidadBeneficiariaDetalle}
                  onChange={(e) => {
                    clearFieldError("entidad-beneficiaria-input");
                    updateDraft("entidadBeneficiariaDetalle", e.target.value);
                  }}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  aria-invalid={Boolean(fieldErrors["entidad-beneficiaria-input"])}
                  aria-describedby={
                    fieldErrors["entidad-beneficiaria-input"]
                      ? "entidad-beneficiaria-input-error"
                      : undefined
                  }
                  placeholder="Ej.: Brigada de Infantería No. 5"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
                <datalist id="entidades-externas-previas">
                  {entidadesExternasSugerencias.map((entidad) => (
                    <option key={entidad} value={entidad} />
                  ))}
                </datalist>
                {fieldErrors["entidad-beneficiaria-input"] ? (
                  <p
                    id="entidad-beneficiaria-input-error"
                    className="mt-1 text-xs font-medium text-rose-700"
                  >
                    {fieldErrors["entidad-beneficiaria-input"]}
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <h3 className="border-b border-stone-200 pb-2 text-sm font-bold uppercase tracking-wide text-stone-600">
            Datos del Destinatario
          </h3>
          {draft.entidadBeneficiariaTipo === "INTERNO" ? (
            <div className="space-y-3">
              {isEditing && !draft.personalCi && hasResponsableData ? (
                <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                  <span className="font-semibold">Responsable histórico registrado:</span>{" "}
                  {responsableResumen}
                  {draft.ci ? ` (CI: ${draft.ci})` : ""}. Puedes conservarlo o seleccionar otro
                  personal debajo.
                </div>
              ) : null}
              <div>
                <label
                  htmlFor="asignacion-personal-responsable"
                  className="mb-1 block text-sm font-medium text-stone-700"
                >
                  Personal Destinatario *
                </label>
                <div id="asignacion-personal-responsable" tabIndex={-1}>
                  <DestinatarioSearchSelect
                    options={recipientOptions}
                    value={draft.personalCi}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    placeholder="Buscar destinatario por grado, apellido, nombre o CI"
                    onChange={onPersonalCiChange}
                  />
                </div>
                {fieldErrors["asignacion-personal-responsable"] ? (
                  <p
                    id="asignacion-personal-responsable-error"
                    className="mt-1 text-xs font-medium text-rose-700"
                  >
                    {fieldErrors["asignacion-personal-responsable"]}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="externo-grado" className="block text-sm font-medium text-stone-700">
                  Grado
                </label>
                <select
                  id="externo-grado"
                  value={draft.grado}
                  onChange={(e) => {
                    clearFieldError("externo-grado");
                    updateDraft("grado", e.target.value);
                  }}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  aria-invalid={Boolean(fieldErrors["externo-grado"])}
                  aria-describedby={
                    fieldErrors["externo-grado"] ? "externo-grado-error" : undefined
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar grado</option>
                  {draft.grado && !rangos.some((r) => r.abreviacion === draft.grado) ? (
                    <option value={draft.grado}>{draft.grado} (registrado)</option>
                  ) : null}
                  {rangos.map((r) => (
                    <option key={r.rangoId} value={r.abreviacion}>
                      {r.abreviacion} - {r.nombreCompleto}
                    </option>
                  ))}
                </select>
                {fieldErrors["externo-grado"] ? (
                  <p id="externo-grado-error" className="mt-1 text-xs font-medium text-rose-700">
                    {fieldErrors["externo-grado"]}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor="externo-ci" className="block text-sm font-medium text-stone-700">
                  CI (Opcional)
                </label>
                <input
                  id="externo-ci"
                  value={draft.ci}
                  onChange={(e) => {
                    clearFieldError("externo-ci");
                    updateDraft("ci", e.target.value);
                  }}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  aria-invalid={Boolean(fieldErrors["externo-ci"])}
                  aria-describedby={fieldErrors["externo-ci"] ? "externo-ci-error" : undefined}
                  placeholder="Ej.: 5.123.456-7"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                {fieldErrors["externo-ci"] ? (
                  <p id="externo-ci-error" className="mt-1 text-xs font-medium text-rose-700">
                    {fieldErrors["externo-ci"]}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="externo-nombre"
                  className="block text-sm font-medium text-stone-700"
                >
                  Nombres
                </label>
                <input
                  id="externo-nombre"
                  value={draft.nombre}
                  onChange={(e) => {
                    clearFieldError("externo-nombre");
                    updateDraft("nombre", e.target.value);
                  }}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  aria-invalid={Boolean(fieldErrors["externo-nombre"])}
                  aria-describedby={
                    fieldErrors["externo-nombre"] ? "externo-nombre-error" : undefined
                  }
                  placeholder="Nombres"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                {fieldErrors["externo-nombre"] ? (
                  <p id="externo-nombre-error" className="mt-1 text-xs font-medium text-rose-700">
                    {fieldErrors["externo-nombre"]}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="externo-apellido"
                  className="block text-sm font-medium text-stone-700"
                >
                  Apellidos
                </label>
                <input
                  id="externo-apellido"
                  value={draft.apellido}
                  onChange={(e) => {
                    clearFieldError("externo-apellido");
                    updateDraft("apellido", e.target.value);
                  }}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  aria-invalid={Boolean(fieldErrors["externo-apellido"])}
                  aria-describedby={
                    fieldErrors["externo-apellido"] ? "externo-apellido-error" : undefined
                  }
                  placeholder="Apellidos"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                {fieldErrors["externo-apellido"] ? (
                  <p id="externo-apellido-error" className="mt-1 text-xs font-medium text-rose-700">
                    {fieldErrors["externo-apellido"]}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <h3 className="border-b border-stone-200 pb-2 text-sm font-bold uppercase tracking-wide text-stone-600">
            Equipos Asignados
          </h3>

          {fieldErrors["asignacion-items-requeridos"] ? (
            <p
              id="asignacion-items-requeridos-error"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700"
            >
              {fieldErrors["asignacion-items-requeridos"]}
            </p>
          ) : null}

          {draft.equipos.map((equipo, index) => (
            <div
              key={`eq-row-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
                <div>
                  <label
                    htmlFor={`equipo-select-${index}`}
                    className="block text-xs font-semibold text-stone-700"
                  >
                    Equipo #{index + 1}
                  </label>
                  <select
                    id={`equipo-select-${index}`}
                    value={equipo.equipoId}
                    onChange={(e) => onEquipoChange(index, "equipoId", e.target.value)}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    aria-invalid={Boolean(fieldErrors[`equipo-select-${index}`])}
                    aria-describedby={
                      fieldErrors[`equipo-select-${index}`]
                        ? `equipo-select-${index}-error`
                        : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar equipo</option>
                    {equiposAgrupadosPorCategoria.map((group) => {
                      const availableItems = group.items.filter((catalogItem) => {
                        const isSelectedByOther = draft.equipos.some(
                          (i, idx) => idx !== index && i.equipoId === catalogItem.equipoId
                        );
                        return !isSelectedByOther;
                      });
                      if (availableItems.length === 0) return null;
                      return (
                        <optgroup key={group.label} label={group.label}>
                          {availableItems.map((catalogItem) => (
                            <option key={catalogItem.equipoId} value={catalogItem.equipoId}>
                              {catalogItem.activo
                                ? catalogItem.nombre
                                : `${catalogItem.nombre} (fuera de hoja)`}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {fieldErrors[`equipo-select-${index}`] ? (
                    <p
                      id={`equipo-select-${index}-error`}
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {fieldErrors[`equipo-select-${index}`]}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor={`equipo-cantidad-${index}`}
                    className="block text-xs font-semibold text-stone-700"
                  >
                    Cantidad equipo #{index + 1}
                  </label>
                  <input
                    id={`equipo-cantidad-${index}`}
                    type="number"
                    min={1}
                    value={equipo.cantidad}
                    onChange={(e) => onEquipoChange(index, "cantidad", Number(e.target.value))}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    aria-invalid={Boolean(fieldErrors[`equipo-cantidad-${index}`])}
                    aria-describedby={
                      fieldErrors[`equipo-cantidad-${index}`]
                        ? `equipo-cantidad-${index}-error`
                        : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                  {fieldErrors[`equipo-cantidad-${index}`] ? (
                    <p
                      id={`equipo-cantidad-${index}-error`}
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {fieldErrors[`equipo-cantidad-${index}`]}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveEquipo(index)}
                  disabled={
                    saving ||
                    loadingRegistro ||
                    loadedAnulado ||
                    (draft.equipos.length <= 1 && draft.articulos.length === 0)
                  }
                  className="min-h-[44px] w-full rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-200 disabled:opacity-50 sm:w-auto"
                >
                  Quitar equipo #{index + 1}
                </button>
              </div>

              <div>
                <label
                  htmlFor={`equipo-comentario-${index}`}
                  className="block text-xs font-medium text-stone-600"
                >
                  Comentario equipo #{index + 1} (opcional)
                </label>
                <input
                  id={`equipo-comentario-${index}`}
                  type="text"
                  value={equipo.comentario}
                  onChange={(e) => onEquipoChange(index, "comentario", e.target.value)}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  placeholder="Comentario sobre el equipo (opcional)"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddEquipo}
            disabled={saving || loadingRegistro || loadedAnulado}
            className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700">
              +
            </span>
            Agregar equipo
          </button>
        </div>

        <div className="mt-8 space-y-3">
          <h3 className="border-b border-stone-200 pb-2 text-sm font-bold uppercase tracking-wide text-stone-600">
            Artículos Asignados (Oficina y Limpieza)
          </h3>

          {draft.articulos.length === 0 ? (
            <p className="text-xs text-stone-600">
              Opcional: puedes agregar artículos de oficina o limpieza a esta misma asignación.
            </p>
          ) : null}

          {draft.articulos.map((articulo, index) => (
            <div
              key={`art-row-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-end">
                <div>
                  <label
                    htmlFor={`articulo-select-${index}`}
                    className="block text-xs font-semibold text-stone-700"
                  >
                    Artículo #{index + 1}
                  </label>
                  <select
                    id={`articulo-select-${index}`}
                    value={articulo.articuloId}
                    onChange={(e) => onArticuloChange(index, "articuloId", e.target.value)}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    aria-invalid={Boolean(fieldErrors[`articulo-select-${index}`])}
                    aria-describedby={
                      fieldErrors[`articulo-select-${index}`]
                        ? `articulo-select-${index}-error`
                        : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar artículo</option>
                    {articulosAgrupados.map((group) => {
                      const availableItems = group.items.filter((catalogItem) => {
                        const isSelectedByOther = draft.articulos.some(
                          (i, idx) =>
                            idx !== index && i.articuloId === String(catalogItem.articuloId)
                        );
                        return !isSelectedByOther;
                      });
                      if (availableItems.length === 0) return null;
                      return (
                        <optgroup key={group.label} label={group.label}>
                          {availableItems.map((catalogItem) => (
                            <option
                              key={catalogItem.articuloId}
                              value={String(catalogItem.articuloId)}
                            >
                              {catalogItem.nombre} (Stock: {catalogItem.stockActual})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                  {fieldErrors[`articulo-select-${index}`] ? (
                    <p
                      id={`articulo-select-${index}-error`}
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {fieldErrors[`articulo-select-${index}`]}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor={`articulo-cantidad-${index}`}
                    className="block text-xs font-semibold text-stone-700"
                  >
                    Cantidad artículo #{index + 1}
                  </label>
                  <input
                    id={`articulo-cantidad-${index}`}
                    type="number"
                    min={1}
                    value={articulo.cantidad}
                    onChange={(e) => onArticuloChange(index, "cantidad", Number(e.target.value))}
                    disabled={saving || loadingRegistro || loadedAnulado}
                    aria-invalid={Boolean(fieldErrors[`articulo-cantidad-${index}`])}
                    aria-describedby={
                      fieldErrors[`articulo-cantidad-${index}`]
                        ? `articulo-cantidad-${index}-error`
                        : undefined
                    }
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                  {fieldErrors[`articulo-cantidad-${index}`] ? (
                    <p
                      id={`articulo-cantidad-${index}-error`}
                      className="mt-1 text-xs font-medium text-rose-700"
                    >
                      {fieldErrors[`articulo-cantidad-${index}`]}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveArticulo(index)}
                  disabled={
                    saving ||
                    loadingRegistro ||
                    loadedAnulado ||
                    (draft.articulos.length <= 1 && draft.equipos.length === 0)
                  }
                  className="min-h-[44px] w-full rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-200 disabled:opacity-50 sm:w-auto"
                >
                  Quitar artículo #{index + 1}
                </button>
              </div>

              <div>
                <label
                  htmlFor={`articulo-comentario-${index}`}
                  className="block text-xs font-medium text-stone-600"
                >
                  Comentario artículo #{index + 1} (opcional)
                </label>
                <input
                  id={`articulo-comentario-${index}`}
                  type="text"
                  value={articulo.comentario}
                  onChange={(e) => onArticuloChange(index, "comentario", e.target.value)}
                  disabled={saving || loadingRegistro || loadedAnulado}
                  placeholder="Comentario sobre el artículo (opcional)"
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={onAddArticulo}
            disabled={saving || loadingRegistro || loadedAnulado}
            className="mt-2 inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-400 hover:bg-stone-50"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-stone-700">
              +
            </span>
            Agregar artículo
          </button>
        </div>

        <div className="mt-6">
          <label
            htmlFor="asignacion-comentarios"
            className="block text-sm font-medium text-stone-700"
          >
            Comentarios generales (opcional)
          </label>
          <input
            id="asignacion-comentarios"
            value={draft.comentarios}
            onChange={(e) => updateDraft("comentarios", e.target.value)}
            disabled={saving || loadingRegistro || loadedAnulado}
            placeholder="Detalle breve del recibo"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
        </div>

        <section
          aria-label="Resumen de la operación"
          className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800"
        >
          <h3 className="text-xs font-bold uppercase tracking-wide text-stone-600">
            Resumen de la operación
          </h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-stone-500">Fecha</dt>
              <dd className="font-semibold">{draft.fecha || "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Beneficiario</dt>
              <dd className="font-semibold">
                {draft.entidadBeneficiariaTipo === "INTERNO" ? "Interno" : "Externo"} ·{" "}
                {draft.entidadBeneficiariaDetalle.trim() || "Sin definir"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Responsable</dt>
              <dd className="font-semibold">{responsableResumen}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Totales</dt>
              <dd className="font-semibold">
                {validEquiposSummary.length} eq. ({totalEquiposUnidades} u.) ·{" "}
                {validArticulosSummary.length} art. ({totalArticulosUnidades} u.)
              </dd>
            </div>
          </dl>
        </section>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-stone-100 pt-6">
          <button
            type="button"
            onClick={onBack}
            disabled={saving}
            className="min-h-[44px] rounded-xl px-6 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit("save")}
            disabled={saving || loadingRegistro || loadedAnulado || Boolean(pendingPrintRegistroId)}
            className="min-h-[44px] rounded-xl border border-violet-700 bg-white px-6 py-2.5 text-sm font-bold text-violet-800 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit("save_and_print")}
            disabled={saving || loadingRegistro || loadedAnulado || Boolean(pendingPrintRegistroId)}
            className="min-h-[44px] rounded-xl bg-violet-700 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-800 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar e imprimir"}
          </button>
        </div>
      </article>
    </section>
  );
}
