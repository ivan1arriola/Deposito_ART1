"use client";

import { StockView } from "@/app/components/views/StockView";
import { FormulariosPrestamosView } from "@/app/components/views/FormulariosPrestamosView";
import { MovimientosPorEquipoView } from "@/app/components/views/MovimientosPorEquipoView";
import type { PrestamoDraft, StockOperacionDraft } from "@/types/forms";
import type { StockPrestamoViewsProps } from "./types";

function applyPrestamoDraftFieldChange(
  prev: PrestamoDraft,
  field:
    | "clasePrestamo"
    | "destinatarioTipo"
    | "destinatarioCi"
    | "destinatarioExternoGrado"
    | "destinatarioExternoNombre"
    | "destinatarioExternoApellido"
    | "destinatarioExternoCi"
    | "destinatarioExternoUnidadDestino"
    | "actuanteCi"
    | "fechaPrestamo"
    | "fechaEstimadaDevolucionTexto"
    | "comentarios",
  value: string,
): PrestamoDraft {
  if (field === "clasePrestamo") {
    if (value === "INTERNO") {
      return {
        ...prev,
        clasePrestamo: "INTERNO",
        destinatarioCi: "",
        destinatarioExternoGrado: "",
        destinatarioExternoNombre: "",
        destinatarioExternoApellido: "",
        destinatarioExternoCi: "",
        destinatarioExternoUnidadDestino: "",
      };
    }
    if (value === "EXTERNO") {
      return {
        ...prev,
        clasePrestamo: "EXTERNO",
        destinatarioCi: "",
      };
    }
    return {
      ...prev,
      clasePrestamo: "PENDIENTE",
      destinatarioCi: "",
      destinatarioExternoGrado: "",
      destinatarioExternoNombre: "",
      destinatarioExternoApellido: "",
      destinatarioExternoCi: "",
      destinatarioExternoUnidadDestino: "",
    };
  }

  if (field === "destinatarioTipo") {
    return { ...prev, destinatarioTipo: value as PrestamoDraft["destinatarioTipo"], destinatarioCi: "" };
  }

  return { ...prev, [field]: value };
}

export function StockPrestamoViews(props: StockPrestamoViewsProps) {
  const {
    activeView,
    stockData,
    stockLoading,
    stockError,
    canWrite,
    isAdmin,
    equiposOrdenados,
    stockDraft,
    stockSaving,
    maxFechaIngreso,
    setStockDraft,
    updateStockDraftItem,
    addStockDraftItem,
    removeStockDraftItem,
    saveStockOperation,
    personal,
    oficialesSuboficiales,
    prestamoDraft,
    prestamoSaving,
    returningPrestamoId,
    setPrestamoDraft,
    updatePrestamoDraftItem,
    addPrestamoDraftItem,
    removePrestamoDraftItem,
    savePrestamo,
    returnPrestamo,
    reloadActiveStockData,
    editingPrestamoId,
    editPrestamo,
    deletePrestamo,
    openPersonaProfileByCi,
  } = props;

  const isStockView = ["stock", "stock_total", "stock_actual", "stock_alta", "stock_baja", "stock_historial", "stock_prestamos"].includes(activeView);
  const isPrestamosModuleView = ["formularios", "prestamos_registrar", "prestamos_vigentes", "prestamos_historial"].includes(activeView);
  const prestamosViewMode =
    activeView === "prestamos_registrar"
      ? "registrar"
      : activeView === "prestamos_vigentes"
        ? "vigentes"
        : activeView === "prestamos_historial"
          ? "historial"
          : "integrado";

  return (
    <>
      {isStockView ? (
        <StockView
          section={
            activeView === "stock" || activeView === "stock_total"
              ? "total"
              : activeView === "stock_alta"
                ? "alta"
                : activeView === "stock_baja"
                  ? "baja"
                  : activeView === "stock_historial"
                    ? "historial"
                    : activeView === "stock_prestamos"
                      ? "prestamos"
                      : "actual"
          }
          data={stockData}
          loading={stockLoading}
          error={stockError}
          canWrite={canWrite}
          isAdmin={isAdmin}
          equipos={equiposOrdenados}
          draft={stockDraft}
          saving={stockSaving}
          maxDate={maxFechaIngreso}
          onDraftChange={(field, value) => setStockDraft((prev: StockOperacionDraft) => ({ ...prev, [field]: value }))}
          onDraftItemChange={updateStockDraftItem}
          onAddItem={addStockDraftItem}
          onRemoveItem={removeStockDraftItem}
          onSubmit={() => void saveStockOperation()}
          personal={personal}
          oficialesSuboficiales={oficialesSuboficiales}
          prestamoDraft={prestamoDraft}
          prestamoSaving={prestamoSaving}
          returningPrestamoId={returningPrestamoId}
          onPrestamoDraftChange={(field, value) =>
            setPrestamoDraft((prev: PrestamoDraft) => applyPrestamoDraftFieldChange(prev, field, value))
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, equipos) => void returnPrestamo(prestamoId, fechaDevolucion, equipos)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}

      {activeView === "movimientos_por_equipo" ? (
        <MovimientosPorEquipoView onOpenPersonaProfileByCi={openPersonaProfileByCi} />
      ) : null}

      {isPrestamosModuleView ? (
        <FormulariosPrestamosView
          viewMode={prestamosViewMode}
          data={stockData}
          loading={stockLoading}
          error={stockError}
          canWrite={canWrite}
          isAdmin={isAdmin}
          equipos={equiposOrdenados}
          personal={personal}
          oficialesSuboficiales={oficialesSuboficiales}
          prestamoDraft={prestamoDraft}
          prestamoSaving={prestamoSaving}
          returningPrestamoId={returningPrestamoId}
          editingPrestamoId={editingPrestamoId}
          maxDate={maxFechaIngreso}
          onPrestamoDraftChange={(field, value) =>
            setPrestamoDraft((prev: PrestamoDraft) => applyPrestamoDraftFieldChange(prev, field, value))
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, equipos) => void returnPrestamo(prestamoId, fechaDevolucion, equipos)}
          onEditPrestamo={(prestamoId, payload) => editPrestamo(prestamoId, payload)}
          onDeletePrestamo={(prestamoId) => void deletePrestamo(prestamoId)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}
    </>
  );
}
