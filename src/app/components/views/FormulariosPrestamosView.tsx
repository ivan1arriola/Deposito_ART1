"use client";

import { useMemo, useState } from "react";
import { ModalFrame } from "@/app/components/modals/ModalFrame";
import { DateTextInput } from "@/app/components/shared/DateTextInput";
import { DestinatarioSearchSelect } from "@/app/components/shared/DestinatarioSearchSelect";
import { LoadingInline } from "@/app/components/shared";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { formatDateOnlyForDisplay, getTodayDateInput } from "@/lib/date-helpers";
import type { PrestamoClase, PrestamoEstadoEquipo } from "@/types/forms";
import type { StockDashboardData } from "@/types/views";
import { PrestamoList } from "./formularios-prestamos/components/PrestamoList";
import type { FormulariosPrestamosViewProps, PrestamosTab } from "./formularios-prestamos/types";
import {
  buildActuanteOptions,
  buildDestinatarioOptions,
  destinatarioTipoLabel,
  ESTADO_OPTIONS,
  prestamoClaseLabel,
  reciboHref,
} from "./formularios-prestamos/utils";

export type { PrestamoEditPayload } from "./formularios-prestamos/types";

function splitExternalDraftName(value: string) {
  const [apellido = "", nombre = ""] = value.split(",");
  return {
    apellido: apellido.trim(),
    nombre: nombre.trim(),
  };
}

export function FormulariosPrestamosView({
  viewMode = "integrado",
  data,
  loading,
  error,
  canWrite,
  isAdmin,
  equipos,
  personal,
  oficialesSuboficiales,
  prestamoDraft,
  prestamoSaving,
  returningPrestamoId,
  editingPrestamoId,
  maxDate,
  onPrestamoDraftChange,
  onPrestamoItemChange,
  onAddPrestamoItem,
  onRemovePrestamoItem,
  onSubmitPrestamo,
  onSubmitPrestamoAndPrint,
  onReturnPrestamo,
  onEditPrestamo,
  onDeletePrestamo,
  onReload,
}: FormulariosPrestamosViewProps) {
  const fixedTab: PrestamosTab | null = viewMode === "integrado" ? null : viewMode;
  const [tab, setTab] = useState<PrestamosTab>(canWrite ? "registrar" : "vigentes");
  const isIntegratedView = fixedTab === null;
  const activeTab: PrestamosTab = fixedTab ?? (!canWrite && tab === "registrar" ? "vigentes" : tab);
  const [selectedPrestamo, setSelectedPrestamo] = useState<
    StockDashboardData["prestamos"][number] | null
  >(null);
  const [prestamoIdFilter, setPrestamoIdFilter] = useState("");
  const [returnDateByPrestamo, setReturnDateByPrestamo] = useState<Record<string, string>>({});
  const [returnItemsByPrestamo, setReturnItemsByPrestamo] = useState<
    Record<
      string,
      Record<string, { estadoDevolucion: PrestamoEstadoEquipo; comentarioDevolucion: string }>
    >
  >({});
  const [returnDialog, setReturnDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    fechaDevolucion: string;
  } | null>(null);
  const [editDialogError, setEditDialogError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{
    prestamo: StockDashboardData["prestamos"][number];
    clasePrestamo: PrestamoClase;
    destinatarioTipo: "PERSONAL" | "OFICIAL" | "SUBOFICIAL";
    destinatarioCi: string;
    destinatarioExternoGrado: string;
    destinatarioExternoNombre: string;
    destinatarioExternoApellido: string;
    destinatarioExternoCi: string;
    destinatarioExternoUnidadDestino: string;
    fechaPrestamo: string;
    fechaEstimadaDevolucionTexto: string;
    fechaDevolucion: string;
    comentarios: string;
    motivo: string;
    equipos: Array<{
      equipoId: string;
      nombre: string;
      cantidad: string;
      estadoEntrega: PrestamoEstadoEquipo;
      comentarioEntrega: string;
      estadoDevolucion: PrestamoEstadoEquipo;
      comentarioDevolucion: string;
    }>;
  } | null>(null);
  const prestamos = useMemo(() => data?.prestamos ?? [], [data]);
  const normalizedPrestamoIdFilter = prestamoIdFilter.trim();

  const getReturnDate = (prestamoId: string) => {
    const saved = returnDateByPrestamo[prestamoId];
    return saved !== undefined ? saved : maxDate;
  };

  function openReturnDialog(prestamo: StockDashboardData["prestamos"][number]) {
    setReturnDialog({
      prestamo,
      fechaDevolucion: getReturnDate(prestamo.prestamoId) || getTodayDateInput(),
    });
  }

  function submitReturnDialog() {
    if (!returnDialog) return;
    const fechaDevolucion = returnDialog.fechaDevolucion.trim() || getTodayDateInput();
    setReturnDateByPrestamo((prev) => ({
      ...prev,
      [returnDialog.prestamo.prestamoId]: fechaDevolucion,
    }));
    onReturnPrestamo(
      returnDialog.prestamo.prestamoId,
      fechaDevolucion,
      returnDialog.prestamo.equipos.map((equipo) => {
        const itemData = getReturnItemData(returnDialog.prestamo.prestamoId, equipo);
        return {
          equipoId: equipo.equipoId,
          estadoDevolucion: itemData.estadoDevolucion,
          comentarioDevolucion: itemData.comentarioDevolucion.trim() || undefined,
        };
      })
    );
    setReturnDialog(null);
  }

  const getReturnItemData = (
    prestamoId: string,
    equipo: StockDashboardData["prestamos"][number]["equipos"][number]
  ) => {
    const byPrestamo = returnItemsByPrestamo[prestamoId];
    if (byPrestamo && byPrestamo[equipo.equipoId]) return byPrestamo[equipo.equipoId];
    return {
      estadoDevolucion: equipo.estadoEntrega,
      comentarioDevolucion: "",
    };
  };

  function openEditDialog(prestamo: StockDashboardData["prestamos"][number]) {
    const externalName = splitExternalDraftName(prestamo.destinatarioNombre);
    setEditDialogError(null);
    setEditDialog({
      prestamo,
      clasePrestamo: prestamo.clasePrestamo,
      destinatarioTipo:
        prestamo.destinatarioTipo && prestamo.destinatarioTipo !== "EXTERNO"
          ? prestamo.destinatarioTipo
          : "PERSONAL",
      destinatarioCi: prestamo.clasePrestamo === "INTERNO" ? (prestamo.destinatarioCi ?? "") : "",
      destinatarioExternoGrado:
        prestamo.clasePrestamo === "EXTERNO" ? (prestamo.destinatarioGrado ?? "") : "",
      destinatarioExternoNombre: prestamo.clasePrestamo === "EXTERNO" ? externalName.nombre : "",
      destinatarioExternoApellido:
        prestamo.clasePrestamo === "EXTERNO" ? externalName.apellido : "",
      destinatarioExternoCi:
        prestamo.clasePrestamo === "EXTERNO" ? (prestamo.destinatarioCi ?? "") : "",
      destinatarioExternoUnidadDestino:
        prestamo.clasePrestamo === "EXTERNO" ? (prestamo.destinatarioUnidadDestino ?? "") : "",
      fechaPrestamo: prestamo.fechaPrestamo || getTodayDateInput(),
      fechaEstimadaDevolucionTexto: prestamo.fechaEstimadaDevolucionTexto ?? "",
      fechaDevolucion: prestamo.fechaDevolucion || getTodayDateInput(),
      comentarios: prestamo.comentarios ?? "",
      motivo: "",
      equipos: prestamo.equipos.map((equipo) => ({
        equipoId: equipo.equipoId,
        nombre: equipo.nombre,
        cantidad: String(equipo.cantidad),
        estadoEntrega: equipo.estadoEntrega,
        comentarioEntrega: equipo.comentarioEntrega ?? "",
        estadoDevolucion: equipo.estadoDevolucion ?? equipo.estadoEntrega,
        comentarioDevolucion: equipo.comentarioDevolucion ?? "",
      })),
    });
  }

  async function submitEditDialog() {
    if (!editDialog) return;
    const motivo = editDialog.motivo.trim();
    if (!motivo) {
      setEditDialogError("Debes indicar el motivo de la correccion.");
      return;
    }

    const payloadItems = editDialog.equipos.map((equipo) => ({
      equipoId: equipo.equipoId,
      cantidad: Number(equipo.cantidad),
      estadoEntrega: equipo.estadoEntrega,
      comentarioEntrega: equipo.comentarioEntrega.trim() || undefined,
      estadoDevolucion:
        editDialog.prestamo.estado === "DEVUELTO" ? equipo.estadoDevolucion : undefined,
      comentarioDevolucion:
        editDialog.prestamo.estado === "DEVUELTO"
          ? equipo.comentarioDevolucion.trim() || undefined
          : undefined,
    }));

    if (payloadItems.some((equipo) => !Number.isInteger(equipo.cantidad) || equipo.cantidad <= 0)) {
      setEditDialogError("Todas las cantidades deben ser enteros mayores a 0.");
      return;
    }

    if (editDialog.clasePrestamo === "INTERNO" && editDialog.destinatarioCi.trim() === "") {
      setEditDialogError("Debes seleccionar un destinatario interno.");
      return;
    }

    if (editDialog.clasePrestamo === "EXTERNO") {
      if (
        !editDialog.destinatarioExternoGrado.trim() ||
        !editDialog.destinatarioExternoNombre.trim() ||
        !editDialog.destinatarioExternoApellido.trim() ||
        !editDialog.destinatarioExternoUnidadDestino.trim()
      ) {
        setEditDialogError(
          "Completa grado, nombre, apellido y unidad de destino del destinatario externo."
        );
        return;
      }
      if (!isValidUruguayanCi(editDialog.destinatarioExternoCi.trim())) {
        setEditDialogError("La CI del destinatario externo no es válida.");
        return;
      }
    }

    setEditDialogError(null);
    try {
      await onEditPrestamo(editDialog.prestamo.prestamoId, {
        clasePrestamo: editDialog.clasePrestamo,
        destinatarioTipo:
          editDialog.clasePrestamo === "INTERNO" ? editDialog.destinatarioTipo : undefined,
        destinatarioCi:
          editDialog.clasePrestamo === "INTERNO" ? editDialog.destinatarioCi.trim() : undefined,
        destinatarioExterno:
          editDialog.clasePrestamo === "EXTERNO"
            ? {
                grado: editDialog.destinatarioExternoGrado.trim(),
                nombre: editDialog.destinatarioExternoNombre.trim(),
                apellido: editDialog.destinatarioExternoApellido.trim(),
                ci: editDialog.destinatarioExternoCi.trim(),
                unidadDestino: editDialog.destinatarioExternoUnidadDestino.trim(),
              }
            : undefined,
        fechaPrestamo: editDialog.fechaPrestamo.trim(),
        fechaEstimadaDevolucionTexto: editDialog.fechaEstimadaDevolucionTexto.trim() || undefined,
        fechaDevolucion:
          editDialog.prestamo.estado === "DEVUELTO" ? editDialog.fechaDevolucion.trim() : undefined,
        comentarios: editDialog.comentarios.trim() || undefined,
        motivo,
        equipos: payloadItems,
      });
      setEditDialog(null);
      if (selectedPrestamo?.prestamoId === editDialog.prestamo.prestamoId) {
        setSelectedPrestamo(null);
      }
    } catch (error) {
      setEditDialogError(error instanceof Error ? error.message : "No se pudo editar el préstamo.");
    }
  }

  const equiposOrdenados = useMemo(
    () =>
      [...equipos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })),
    [equipos]
  );

  const destinatarioOptions = useMemo(() => {
    return buildDestinatarioOptions(
      prestamoDraft.destinatarioTipo,
      personal,
      oficialesSuboficiales
    );
  }, [prestamoDraft.destinatarioTipo, personal, oficialesSuboficiales]);
  const actuanteOptions = useMemo(() => {
    return buildActuanteOptions(oficialesSuboficiales, personal);
  }, [oficialesSuboficiales, personal]);

  const prestamosVigentes = useMemo(
    () => prestamos.filter((prestamo) => prestamo.estado === "PENDIENTE"),
    [prestamos]
  );
  const prestamosVigentesFiltrados = useMemo(() => {
    if (normalizedPrestamoIdFilter === "") return prestamosVigentes;
    return prestamosVigentes.filter((prestamo) =>
      prestamo.prestamoId.includes(normalizedPrestamoIdFilter)
    );
  }, [prestamosVigentes, normalizedPrestamoIdFilter]);
  const resumenPrestamosVigentesPrintHref = useMemo(() => {
    const params = new URLSearchParams();
    params.set("autoprint", "1");
    if (normalizedPrestamoIdFilter !== "") {
      params.set("prestamoId", normalizedPrestamoIdFilter);
    }
    return `/resumen-prestamos-vigentes?${params.toString()}`;
  }, [normalizedPrestamoIdFilter]);
  const prestamosFiltrados = useMemo(() => {
    if (normalizedPrestamoIdFilter === "") return prestamos;
    return prestamos.filter((prestamo) => prestamo.prestamoId.includes(normalizedPrestamoIdFilter));
  }, [prestamos, normalizedPrestamoIdFilter]);
  const selectedDestinatario = useMemo(
    () =>
      prestamoDraft.clasePrestamo === "INTERNO"
        ? (destinatarioOptions.find((option) => option.ci === prestamoDraft.destinatarioCi) ?? null)
        : null,
    [destinatarioOptions, prestamoDraft.clasePrestamo, prestamoDraft.destinatarioCi]
  );
  const selectedActuante = useMemo(
    () => actuanteOptions.find((option) => option.ci === prestamoDraft.actuanteCi) ?? null,
    [actuanteOptions, prestamoDraft.actuanteCi]
  );
  const draftDestinatarioResumen = useMemo(() => {
    if (prestamoDraft.clasePrestamo === "PENDIENTE") {
      return {
        label: "Destinatario pendiente",
        ci: "",
      };
    }
    if (prestamoDraft.clasePrestamo === "EXTERNO") {
      const nombre = [
        prestamoDraft.destinatarioExternoApellido.trim(),
        prestamoDraft.destinatarioExternoNombre.trim(),
      ]
        .filter(Boolean)
        .join(", ");
      return {
        label:
          [prestamoDraft.destinatarioExternoGrado.trim(), nombre].filter(Boolean).join(" ") ||
          "Sin completar",
        ci: prestamoDraft.destinatarioExternoCi.trim(),
      };
    }
    return {
      label: selectedDestinatario ? selectedDestinatario.label : "Sin seleccionar",
      ci: prestamoDraft.destinatarioCi.trim(),
    };
  }, [prestamoDraft, selectedDestinatario]);
  const editDestinatarioOptions = useMemo(() => {
    if (!editDialog || editDialog.clasePrestamo !== "INTERNO") return [];
    return buildDestinatarioOptions(editDialog.destinatarioTipo, personal, oficialesSuboficiales);
  }, [editDialog, personal, oficialesSuboficiales]);
  const equiposConSeleccion = useMemo(
    () => prestamoDraft.equipos.filter((equipo) => equipo.equipoId.trim() !== "").length,
    [prestamoDraft.equipos]
  );
  const totalUnidadesPrestadas = useMemo(
    () =>
      prestamoDraft.equipos.reduce(
        (total, equipo) => total + (Number(equipo.cantidad) > 0 ? Number(equipo.cantidad) : 0),
        0
      ),
    [prestamoDraft.equipos]
  );

  const headerTitle =
    fixedTab === "registrar"
      ? "Registrar préstamo"
      : fixedTab === "vigentes"
        ? "Préstamos vigentes"
        : fixedTab === "historial"
          ? "Historial de préstamos"
          : "Préstamos";
  const headerDescription =
    fixedTab === "registrar"
      ? "Registro de nuevos préstamos de equipo."
      : fixedTab === "vigentes"
        ? "Consulta y gestión de préstamos pendientes."
        : fixedTab === "historial"
          ? "Consulta histórica de préstamos registrados."
          : "Registro, vigentes e historial en un solo modulo.";

  return (
    <section className="mt-6 space-y-4">
      <article className="ej-card rounded-2xl p-4">
        <div className="flex flex-wrap equipos-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-900">{headerTitle}</h2>
            <p className="mt-1 text-xs text-stone-600">{headerDescription}</p>
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100"
          >
            {loading ? (
              <LoadingInline
                label="Recargando..."
                size="xs"
                textClassName="text-xs font-semibold text-stone-700"
              />
            ) : (
              "Recargar"
            )}
          </button>
        </div>

        {isIntegratedView ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {canWrite ? (
              <button
                type="button"
                onClick={() => setTab("registrar")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === "registrar" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
              >
                Registrar prestamo
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTab("vigentes")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === "vigentes" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
            >
              Prestamos vigentes ({prestamosVigentes.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("historial")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${activeTab === "historial" ? "bg-stone-900 text-white" : "border border-stone-300 bg-white text-stone-700 hover:bg-stone-100"}`}
            >
              Historial ({prestamos.length})
            </button>
          </div>
        ) : null}
      </article>

      {error ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {activeTab === "vigentes" || activeTab === "historial" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Buscar prestamo por ID</h3>
          <label className="mt-3 block text-xs text-stone-700">
            ID de prestamo
            <input
              type="text"
              inputMode="numeric"
              value={prestamoIdFilter}
              onChange={(event) => setPrestamoIdFilter(event.target.value)}
              placeholder="Ej: 145"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </label>
        </article>
      ) : null}

      {activeTab === "registrar" ? (
        canWrite ? (
          <article className="ej-card rounded-2xl p-4">
            <div className="flex flex-wrap equipos-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Registrar prestamo</h3>
                <p className="mt-1 text-xs text-stone-600">
                  Completa los pasos en orden para evitar errores al guardar.
                </p>
              </div>
              <span className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-700">
                {prestamoClaseLabel(prestamoDraft.clasePrestamo)}
              </span>
            </div>

            <section className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Resumen rapido
              </p>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-amber-900 md:grid-cols-2">
                <p>
                  <span className="font-semibold">Destinatario:</span>{" "}
                  {draftDestinatarioResumen.label}
                </p>
                <p>
                  <span className="font-semibold">Por orden de:</span>{" "}
                  {selectedActuante ? selectedActuante.label : "Sin seleccionar"}
                </p>
                <p>
                  <span className="font-semibold">Clase:</span>{" "}
                  {prestamoClaseLabel(prestamoDraft.clasePrestamo)}
                </p>
                <p>
                  <span className="font-semibold">CI:</span>{" "}
                  {draftDestinatarioResumen.ci
                    ? formatUruguayanCi(draftDestinatarioResumen.ci)
                    : "Pendiente"}
                </p>
                <p>
                  <span className="font-semibold">Fecha prestamo:</span>{" "}
                  {prestamoDraft.fechaPrestamo.trim() || "Sin definir"}
                </p>
                <p>
                  <span className="font-semibold">Equipos:</span> {equiposConSeleccion}/
                  {prestamoDraft.equipos.length} seleccionados
                  {" · "}
                  {totalUnidadesPrestadas} unidades
                </p>
              </div>
            </section>

            <section className="mt-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3 md:p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                1) Destinatario y autorizacion
              </h4>
              <p className="mt-1 text-xs text-stone-600">
                Define si el préstamo es interno, externo o si el destinatario queda pendiente para
                completarlo después.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs text-stone-700 md:col-span-2">
                  Clase de préstamo
                  <select
                    value={prestamoDraft.clasePrestamo}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("clasePrestamo", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="INTERNO">Interno</option>
                    <option value="EXTERNO">Externo</option>
                    <option value="PENDIENTE">Completar después</option>
                  </select>
                </label>

                {prestamoDraft.clasePrestamo === "INTERNO" ? (
                  <>
                    <label className="text-xs text-stone-700">
                      Tipo destinatario
                      <select
                        value={prestamoDraft.destinatarioTipo}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange("destinatarioTipo", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="PERSONAL">Subalternos</option>
                        <option value="OFICIAL">Oficiales</option>
                        <option value="SUBOFICIAL">Suboficiales</option>
                      </select>
                    </label>

                    <div className="text-xs text-stone-700">
                      Destinatario interno
                      <DestinatarioSearchSelect
                        key={prestamoDraft.destinatarioTipo}
                        options={destinatarioOptions}
                        value={prestamoDraft.destinatarioCi}
                        disabled={prestamoSaving}
                        placeholder={`Buscar ${destinatarioTipoLabel(prestamoDraft.destinatarioTipo).toLowerCase()} por grado, apellido, nombre o CI`}
                        onChange={(ci) => onPrestamoDraftChange("destinatarioCi", ci)}
                      />
                    </div>
                  </>
                ) : null}

                {prestamoDraft.clasePrestamo === "EXTERNO" ? (
                  <>
                    <label className="text-xs text-stone-700">
                      Grado
                      <input
                        value={prestamoDraft.destinatarioExternoGrado}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange("destinatarioExternoGrado", event.target.value)
                        }
                        placeholder="Ej: Sgto., Tte., Cabo"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Cédula de identidad
                      <input
                        value={prestamoDraft.destinatarioExternoCi}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange("destinatarioExternoCi", event.target.value)
                        }
                        placeholder="Solo números"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Nombre
                      <input
                        value={prestamoDraft.destinatarioExternoNombre}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange("destinatarioExternoNombre", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700">
                      Apellido
                      <input
                        value={prestamoDraft.destinatarioExternoApellido}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange("destinatarioExternoApellido", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="text-xs text-stone-700 md:col-span-2">
                      Unidad de destino
                      <input
                        value={prestamoDraft.destinatarioExternoUnidadDestino}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoDraftChange(
                            "destinatarioExternoUnidadDestino",
                            event.target.value
                          )
                        }
                        placeholder="Unidad u organismo externo"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </>
                ) : null}

                {prestamoDraft.clasePrestamo === "PENDIENTE" ? (
                  <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">
                    El préstamo se guardará sin destinatario y luego podrá completarse desde la
                    edición.
                  </p>
                ) : null}

                <div className="text-xs text-stone-700 md:col-span-2">
                  Por orden de
                  <DestinatarioSearchSelect
                    key="formularios-prestamo-actuante"
                    options={actuanteOptions}
                    value={prestamoDraft.actuanteCi}
                    disabled={prestamoSaving}
                    placeholder="Buscar oficial, suboficial o sargento por grado, apellido o CI"
                    onChange={(ci) => onPrestamoDraftChange("actuanteCi", ci)}
                  />
                </div>
              </div>
            </section>

            <section className="mt-3 rounded-xl border border-stone-200 bg-white p-3 md:p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                2) Datos del prestamo
              </h4>
              <p className="mt-1 text-xs text-stone-600">
                Completa fecha, estimacion de devolucion y cualquier observacion relevante.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs text-stone-700">
                  Fecha prestamo
                  <DateTextInput
                    value={prestamoDraft.fechaPrestamo}
                    disabled={prestamoSaving}
                    onChange={(value) => onPrestamoDraftChange("fechaPrestamo", value)}
                    ariaLabel={`Fecha del préstamo. Maximo ${maxDate}`}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-xs text-stone-700">
                  Fecha estimada devolucion (texto)
                  <input
                    value={prestamoDraft.fechaEstimadaDevolucionTexto}
                    disabled={prestamoSaving}
                    onChange={(event) =>
                      onPrestamoDraftChange("fechaEstimadaDevolucionTexto", event.target.value)
                    }
                    placeholder="Ej: 10 dias, fin de campana, 2 semanas"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>

                <label className="text-xs text-stone-700 md:col-span-2">
                  Comentarios
                  <input
                    value={prestamoDraft.comentarios}
                    disabled={prestamoSaving}
                    onChange={(event) => onPrestamoDraftChange("comentarios", event.target.value)}
                    placeholder="Dato adicional del préstamo (opcional)"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </section>

            <section className="mt-3 rounded-xl border border-stone-200 bg-white p-3 md:p-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-700">
                  3) Equipos prestados
                </h4>
                <p className="mt-1 text-xs text-stone-600">
                  Agrega cada equipo una sola vez e indica su estado de entrega.
                </p>
              </div>

              {equiposConSeleccion === 0 ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Todavia no seleccionaste equipos. Agrega al menos uno para registrar el prestamo.
                </p>
              ) : null}

              <div className="mt-3 space-y-2">
                {prestamoDraft.equipos.map((equipo, index) => (
                  <div
                    key={`formulario-prestamo-equipo-${index}`}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)_auto]"
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                      Equipo
                      <select
                        value={equipo.equipoId}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoItemChange(index, "equipoId", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900"
                      >
                        <option value="">Seleccionar equipo</option>
                        {equiposOrdenados
                          .filter((equipoOption) => {
                            if (equipoOption.equipoId === equipo.equipoId) return true;
                            return !prestamoDraft.equipos.some(
                              (selectedItem, selectedIndex) =>
                                selectedIndex !== index &&
                                selectedItem.equipoId === equipoOption.equipoId
                            );
                          })
                          .map((equipoOption) => (
                            <option key={equipoOption.equipoId} value={equipoOption.equipoId}>
                              {equipoOption.nombre}
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                      Cantidad
                      <input
                        type="number"
                        min={1}
                        value={equipo.cantidad}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoItemChange(index, "cantidad", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900"
                      />
                    </label>

                    <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                      Estado
                      <select
                        value={equipo.estadoEntrega}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoItemChange(index, "estadoEntrega", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900"
                      >
                        {ESTADO_OPTIONS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="text-[11px] font-semibold uppercase tracking-wide text-stone-600">
                      Comentario
                      <input
                        value={equipo.comentarioEntrega}
                        disabled={prestamoSaving}
                        onChange={(event) =>
                          onPrestamoItemChange(index, "comentarioEntrega", event.target.value)
                        }
                        placeholder="Comentario del equipo (opcional)"
                        className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900"
                      />
                    </label>

                    <div className="flex equipos-end">
                      <button
                        type="button"
                        onClick={() => onRemovePrestamoItem(index)}
                        disabled={prestamoSaving || prestamoDraft.equipos.length <= 1}
                        className="w-full rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 md:w-auto"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={onAddPrestamoItem}
                  disabled={prestamoSaving}
                  className="inline-flex w-full equipos-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
                >
                  <span className="inline-flex h-5 w-5 equipos-center justify-center rounded-full bg-stone-800 text-sm leading-none text-white">
                    +
                  </span>
                  Agregar
                </button>
              </div>
            </section>

            <div className="mt-3 flex flex-col-reverse gap-2 border-t border-stone-200 pt-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onSubmitPrestamo}
                disabled={prestamoSaving}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 disabled:opacity-50"
              >
                Solo guardar
              </button>
              <button
                type="button"
                onClick={onSubmitPrestamoAndPrint}
                disabled={prestamoSaving}
                className="ej-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                {prestamoSaving ? (
                  <LoadingInline
                    label="Guardando..."
                    size="xs"
                    tone="light"
                    textClassName="text-xs font-semibold text-white"
                  />
                ) : (
                  "Guardar e imprimir"
                )}
              </button>
            </div>
          </article>
        ) : (
          <article className="ej-card rounded-2xl p-4">
            <p className="text-sm text-stone-600">No tienes permisos para registrar prestamos.</p>
          </article>
        )
      ) : null}

      {activeTab === "vigentes" ? (
        <article className="ej-card rounded-2xl p-4">
          <div className="flex flex-wrap equipos-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-900">Prestamos vigentes</h3>
            <a
              href={resumenPrestamosVigentesPrintHref}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
            >
              Imprimir resumen
            </a>
          </div>
          <div className="mt-3">
            <PrestamoList
              equipos={prestamosVigentesFiltrados}
              emptyMessage={
                normalizedPrestamoIdFilter === ""
                  ? "No hay préstamos vigentes."
                  : `No hay préstamos vigentes para ID ${normalizedPrestamoIdFilter}.`
              }
              showReturnAction
              isAdmin={isAdmin}
              canWrite={canWrite}
              returningPrestamoId={returningPrestamoId}
              editingPrestamoId={editingPrestamoId}
              onSelectPrestamo={setSelectedPrestamo}
              onOpenEdit={openEditDialog}
              onOpenReturn={openReturnDialog}
            />
          </div>
        </article>
      ) : null}

      {activeTab === "historial" ? (
        <article className="ej-card rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-900">Historial (todos los prestamos)</h3>
          <div className="mt-3">
            <PrestamoList
              equipos={prestamosFiltrados}
              emptyMessage={
                normalizedPrestamoIdFilter === ""
                  ? "No hay préstamos registrados."
                  : `No hay préstamos para ID ${normalizedPrestamoIdFilter}.`
              }
              showReturnAction={false}
              isAdmin={isAdmin}
              canWrite={canWrite}
              returningPrestamoId={returningPrestamoId}
              editingPrestamoId={editingPrestamoId}
              onSelectPrestamo={setSelectedPrestamo}
              onOpenEdit={openEditDialog}
              onOpenReturn={openReturnDialog}
            />
          </div>
        </article>
      ) : null}

      {selectedPrestamo ? (
        <ModalFrame onClose={() => setSelectedPrestamo(null)} size="lg">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Detalle del prestamo</h3>
              <p className="text-sm text-stone-600">{selectedPrestamo.reciboNumero}</p>
            </header>

            <div className="grid grid-cols-1 gap-2 text-sm text-stone-700 md:grid-cols-2">
              <p>
                <span className="font-semibold text-stone-900">Identificador:</span>{" "}
                {selectedPrestamo.prestamoId}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Estado:</span>{" "}
                {selectedPrestamo.estado}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Clase:</span>{" "}
                {prestamoClaseLabel(selectedPrestamo.clasePrestamo)}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Destinatario:</span>{" "}
                {selectedPrestamo.destinatarioEtiqueta}
              </p>
              <p>
                <span className="font-semibold text-stone-900">CI:</span>{" "}
                {selectedPrestamo.destinatarioCi
                  ? formatUruguayanCi(selectedPrestamo.destinatarioCi)
                  : "Pendiente"}
              </p>
              {selectedPrestamo.destinatarioUnidadDestino ? (
                <p>
                  <span className="font-semibold text-stone-900">Unidad destino:</span>{" "}
                  {selectedPrestamo.destinatarioUnidadDestino}
                </p>
              ) : null}
              <p>
                <span className="font-semibold text-stone-900">Entregado por:</span>{" "}
                {selectedPrestamo.usuarioEntregaNombre}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Por orden de:</span>{" "}
                {selectedPrestamo.actuanteNombre ?? "No registrado"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Recibido por:</span>{" "}
                {selectedPrestamo.usuarioRecibeDevolucionNombre ?? "Pendiente"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Fecha prestamo:</span>{" "}
                {formatDateOnlyForDisplay(selectedPrestamo.fechaPrestamo)}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Fecha estimada devolución:</span>{" "}
                {selectedPrestamo.fechaEstimadaDevolucionTexto?.trim()
                  ? selectedPrestamo.fechaEstimadaDevolucionTexto
                  : "-"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Fecha devolución:</span>{" "}
                {selectedPrestamo.fechaDevolucion
                  ? formatDateOnlyForDisplay(selectedPrestamo.fechaDevolucion)
                  : "Pendiente"}
              </p>
              <p>
                <span className="font-semibold text-stone-900">Comentarios:</span>{" "}
                {selectedPrestamo.comentarios?.trim() ? selectedPrestamo.comentarios : "-"}
              </p>
            </div>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Equipos prestados
              </p>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                {selectedPrestamo.equipos.map((equipo) => (
                  <div
                    key={`${selectedPrestamo.prestamoId}-modal-${equipo.equipoId}`}
                    className="mb-2 rounded-lg border border-stone-200 bg-white p-2 last:mb-0"
                  >
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold text-amber-700">{equipo.cantidad}</span>{" "}
                      {equipo.nombre}
                    </p>
                    <p className="text-xs text-stone-600">
                      Entrega: {equipo.estadoEntrega}
                      {equipo.comentarioEntrega ? ` | ${equipo.comentarioEntrega}` : ""}
                    </p>
                    {selectedPrestamo.estado === "PENDIENTE" ? (
                      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                        <select
                          value={
                            getReturnItemData(selectedPrestamo.prestamoId, equipo).estadoDevolucion
                          }
                          disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                          onChange={(event) =>
                            setReturnItemsByPrestamo((prev) => ({
                              ...prev,
                              [selectedPrestamo.prestamoId]: {
                                ...(prev[selectedPrestamo.prestamoId] ?? {}),
                                [equipo.equipoId]: {
                                  ...getReturnItemData(selectedPrestamo.prestamoId, equipo),
                                  estadoDevolucion: event.target.value as PrestamoEstadoEquipo,
                                },
                              },
                            }))
                          }
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                        >
                          {ESTADO_OPTIONS.map((estado) => (
                            <option
                              key={`${selectedPrestamo.prestamoId}-${equipo.equipoId}-modal-${estado}`}
                              value={estado}
                            >
                              {estado}
                            </option>
                          ))}
                        </select>
                        <input
                          value={
                            getReturnItemData(selectedPrestamo.prestamoId, equipo)
                              .comentarioDevolucion
                          }
                          disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                          onChange={(event) =>
                            setReturnItemsByPrestamo((prev) => ({
                              ...prev,
                              [selectedPrestamo.prestamoId]: {
                                ...(prev[selectedPrestamo.prestamoId] ?? {}),
                                [equipo.equipoId]: {
                                  ...getReturnItemData(selectedPrestamo.prestamoId, equipo),
                                  comentarioDevolucion: event.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="Comentario devolución (opcional)"
                          className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-stone-600">
                        Devolucion: {equipo.estadoDevolucion ?? "-"}
                        {equipo.comentarioDevolucion ? ` | ${equipo.comentarioDevolucion}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-stone-200 pt-3">
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => openEditDialog(selectedPrestamo)}
                  disabled={editingPrestamoId === selectedPrestamo.prestamoId}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-100 disabled:opacity-50"
                >
                  {editingPrestamoId === selectedPrestamo.prestamoId ? "Guardando..." : "Editar"}
                </button>
              ) : null}
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => onDeletePrestamo(selectedPrestamo.prestamoId)}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Eliminar registro
                </button>
              ) : null}
              <a
                href={reciboHref(selectedPrestamo.prestamoId)}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Abrir recibo
              </a>
              {canWrite && selectedPrestamo.estado === "PENDIENTE" ? (
                <button
                  type="button"
                  onClick={() => openReturnDialog(selectedPrestamo)}
                  disabled={returningPrestamoId === selectedPrestamo.prestamoId}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {returningPrestamoId === selectedPrestamo.prestamoId
                    ? "Guardando..."
                    : "Devolver"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedPrestamo(null)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}

      {returnDialog ? (
        <ModalFrame onClose={() => setReturnDialog(null)} size="md">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Confirmar devolucion</h3>
              <p className="text-sm text-stone-600">
                {returnDialog.prestamo.reciboNumero} | {returnDialog.prestamo.destinatarioEtiqueta}
              </p>
            </header>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs text-stone-600">
                Fecha prestamo: {formatDateOnlyForDisplay(returnDialog.prestamo.fechaPrestamo)}
              </p>
              <label className="mt-3 block text-xs text-stone-700">
                Fecha devolucion
                <DateTextInput
                  value={returnDialog.fechaDevolucion}
                  disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                  onChange={(value) =>
                    setReturnDialog((current) =>
                      current ? { ...current, fechaDevolucion: value } : current
                    )
                  }
                  ariaLabel={`Fecha de devolución. Maximo ${maxDate}`}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                onClick={() =>
                  setReturnDialog((current) =>
                    current
                      ? {
                          ...current,
                          fechaDevolucion: getTodayDateInput(),
                        }
                      : current
                  )
                }
                className="mt-2 rounded border border-stone-300 bg-white px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Hoy
              </button>
            </div>

            <footer className="flex justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => setReturnDialog(null)}
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitReturnDialog}
                disabled={returningPrestamoId === returnDialog.prestamo.prestamoId}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {returningPrestamoId === returnDialog.prestamo.prestamoId
                  ? "Guardando..."
                  : "Confirmar devolución"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}

      {editDialog ? (
        <ModalFrame onClose={() => setEditDialog(null)} size="xl">
          <div className="space-y-4">
            <header>
              <h3 className="text-lg font-semibold text-stone-900">Editar prestamo (admin)</h3>
              <p className="text-sm text-stone-600">{editDialog.prestamo.reciboNumero}</p>
            </header>

            <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="text-xs text-stone-700 md:col-span-2">
                Clase de préstamo
                <select
                  value={editDialog.clasePrestamo}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(event) =>
                    setEditDialog((current) => {
                      if (!current) return current;
                      const nextClass = event.target.value as PrestamoClase;
                      if (nextClass === "INTERNO") {
                        return {
                          ...current,
                          clasePrestamo: nextClass,
                          destinatarioCi: "",
                          destinatarioExternoGrado: "",
                          destinatarioExternoNombre: "",
                          destinatarioExternoApellido: "",
                          destinatarioExternoCi: "",
                          destinatarioExternoUnidadDestino: "",
                        };
                      }
                      if (nextClass === "EXTERNO") {
                        return {
                          ...current,
                          clasePrestamo: nextClass,
                          destinatarioCi: "",
                        };
                      }
                      return {
                        ...current,
                        clasePrestamo: nextClass,
                        destinatarioCi: "",
                        destinatarioExternoGrado: "",
                        destinatarioExternoNombre: "",
                        destinatarioExternoApellido: "",
                        destinatarioExternoCi: "",
                        destinatarioExternoUnidadDestino: "",
                      };
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="INTERNO">Interno</option>
                  <option value="EXTERNO">Externo</option>
                  <option value="PENDIENTE">Completar después</option>
                </select>
              </label>

              {editDialog.clasePrestamo === "INTERNO" ? (
                <>
                  <label className="text-xs text-stone-700">
                    Tipo destinatario
                    <select
                      value={editDialog.destinatarioTipo}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? {
                                ...current,
                                destinatarioTipo: event.target.value as
                                  "PERSONAL" | "OFICIAL" | "SUBOFICIAL",
                                destinatarioCi: "",
                              }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    >
                      <option value="PERSONAL">Subalternos</option>
                      <option value="OFICIAL">Oficiales</option>
                      <option value="SUBOFICIAL">Suboficiales</option>
                    </select>
                  </label>
                  <div className="text-xs text-stone-700">
                    Destinatario interno
                    <DestinatarioSearchSelect
                      key={`edit-prestamo-destinatario-${editDialog.destinatarioTipo}`}
                      options={editDestinatarioOptions}
                      value={editDialog.destinatarioCi}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      placeholder={`Buscar ${destinatarioTipoLabel(editDialog.destinatarioTipo).toLowerCase()} por grado, apellido, nombre o CI`}
                      onChange={(ci) =>
                        setEditDialog((current) =>
                          current ? { ...current, destinatarioCi: ci } : current
                        )
                      }
                    />
                  </div>
                </>
              ) : null}

              {editDialog.clasePrestamo === "EXTERNO" ? (
                <>
                  <label className="text-xs text-stone-700">
                    Grado
                    <input
                      value={editDialog.destinatarioExternoGrado}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? { ...current, destinatarioExternoGrado: event.target.value }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-stone-700">
                    Cédula de identidad
                    <input
                      value={editDialog.destinatarioExternoCi}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? { ...current, destinatarioExternoCi: event.target.value }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-stone-700">
                    Nombre
                    <input
                      value={editDialog.destinatarioExternoNombre}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? { ...current, destinatarioExternoNombre: event.target.value }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-stone-700">
                    Apellido
                    <input
                      value={editDialog.destinatarioExternoApellido}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? { ...current, destinatarioExternoApellido: event.target.value }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-stone-700 md:col-span-2">
                    Unidad de destino
                    <input
                      value={editDialog.destinatarioExternoUnidadDestino}
                      disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                      onChange={(event) =>
                        setEditDialog((current) =>
                          current
                            ? { ...current, destinatarioExternoUnidadDestino: event.target.value }
                            : current
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                  </label>
                </>
              ) : null}

              {editDialog.clasePrestamo === "PENDIENTE" ? (
                <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 md:col-span-2">
                  El préstamo quedará sin destinatario hasta completarlo más adelante.
                </p>
              ) : null}
            </section>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="text-xs text-stone-700">
                Fecha prestamo
                <DateTextInput
                  value={editDialog.fechaPrestamo}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(value) =>
                    setEditDialog((current) =>
                      current ? { ...current, fechaPrestamo: value } : current
                    )
                  }
                  ariaLabel={`Fecha préstamo. Maximo ${maxDate}`}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              {editDialog.prestamo.estado === "DEVUELTO" ? (
                <label className="text-xs text-stone-700">
                  Fecha devolucion
                  <DateTextInput
                    value={editDialog.fechaDevolucion}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(value) =>
                      setEditDialog((current) =>
                        current ? { ...current, fechaDevolucion: value } : current
                      )
                    }
                    ariaLabel={`Fecha devolución. Maximo ${maxDate}`}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              <label className="text-xs text-stone-700">
                Fecha estimada devolucion (texto)
                <input
                  value={editDialog.fechaEstimadaDevolucionTexto}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(event) =>
                    setEditDialog((current) =>
                      current
                        ? { ...current, fechaEstimadaDevolucionTexto: event.target.value }
                        : current
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-stone-700">
                Comentarios
                <input
                  value={editDialog.comentarios}
                  disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                  onChange={(event) =>
                    setEditDialog((current) =>
                      current ? { ...current, comentarios: event.target.value } : current
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <section className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                Equipos
              </p>
              {editDialog.equipos.map((equipo, index) => (
                <div
                  key={`edit-prestamo-equipo-${equipo.equipoId}`}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_120px_140px_minmax(0,1fr)]"
                >
                  <p className="text-sm font-semibold text-stone-900">{equipo.nombre}</p>
                  <input
                    type="number"
                    min={1}
                    value={equipo.cantidad}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.equipos];
                        nextItems[index] = { ...nextItems[index], cantidad: event.target.value };
                        return { ...current, equipos: nextItems };
                      })
                    }
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={equipo.estadoEntrega}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.equipos];
                        nextItems[index] = {
                          ...nextItems[index],
                          estadoEntrega: event.target.value as PrestamoEstadoEquipo,
                        };
                        return { ...current, equipos: nextItems };
                      })
                    }
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  >
                    {ESTADO_OPTIONS.map((estado) => (
                      <option
                        key={`edit-prestamo-equipo-${equipo.equipoId}-${estado}`}
                        value={estado}
                      >
                        {estado}
                      </option>
                    ))}
                  </select>
                  <input
                    value={equipo.comentarioEntrega}
                    disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                    onChange={(event) =>
                      setEditDialog((current) => {
                        if (!current) return current;
                        const nextItems = [...current.equipos];
                        nextItems[index] = {
                          ...nextItems[index],
                          comentarioEntrega: event.target.value,
                        };
                        return { ...current, equipos: nextItems };
                      })
                    }
                    placeholder="Comentario entrega (opcional)"
                    className="rounded border border-stone-300 px-3 py-2 text-sm"
                  />
                  {editDialog.prestamo.estado === "DEVUELTO" ? (
                    <div className="md:col-span-4 grid grid-cols-1 gap-2 md:grid-cols-[140px_minmax(0,1fr)]">
                      <select
                        value={equipo.estadoDevolucion}
                        disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                        onChange={(event) =>
                          setEditDialog((current) => {
                            if (!current) return current;
                            const nextItems = [...current.equipos];
                            nextItems[index] = {
                              ...nextItems[index],
                              estadoDevolucion: event.target.value as PrestamoEstadoEquipo,
                            };
                            return { ...current, equipos: nextItems };
                          })
                        }
                        className="rounded border border-stone-300 px-3 py-2 text-sm"
                      >
                        {ESTADO_OPTIONS.map((estado) => (
                          <option
                            key={`edit-prestamo-devolucion-${equipo.equipoId}-${estado}`}
                            value={estado}
                          >
                            {estado}
                          </option>
                        ))}
                      </select>
                      <input
                        value={equipo.comentarioDevolucion}
                        disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                        onChange={(event) =>
                          setEditDialog((current) => {
                            if (!current) return current;
                            const nextItems = [...current.equipos];
                            nextItems[index] = {
                              ...nextItems[index],
                              comentarioDevolucion: event.target.value,
                            };
                            return { ...current, equipos: nextItems };
                          })
                        }
                        placeholder="Comentario devolución (opcional)"
                        className="rounded border border-stone-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </section>

            <label className="block text-xs text-stone-700">
              Motivo de la correccion (obligatorio para auditoria)
              <input
                value={editDialog.motivo}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                onChange={(event) =>
                  setEditDialog((current) =>
                    current ? { ...current, motivo: event.target.value } : current
                  )
                }
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              />
            </label>

            {editDialogError ? (
              <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {editDialogError}
              </p>
            ) : null}

            <footer className="flex justify-end gap-2 border-t border-stone-200 pt-3">
              <button
                type="button"
                onClick={() => setEditDialog(null)}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitEditDialog()}
                disabled={editingPrestamoId === editDialog.prestamo.prestamoId}
                className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {editingPrestamoId === editDialog.prestamo.prestamoId
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </footer>
          </div>
        </ModalFrame>
      ) : null}
    </section>
  );
}
