"use client";

import { StockView } from "@/app/components/views/StockView";
import { FormulariosPrestamosView } from "@/app/components/views/FormulariosPrestamosView";
import type { PrestamoDraft, PrestamoDraftItem, StockOperacionDraft } from "@/types/forms";
import type { StockPrestamoViewsProps } from "./types";

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
  } = props;

  const isStockView = ["stock", "stock_total", "stock_actual", "stock_alta", "stock_baja", "stock_historial", "stock_prestamos"].includes(activeView);

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
            setPrestamoDraft((prev: PrestamoDraft) => {
              if (field === "destinatarioTipo") {
                return { ...prev, destinatarioTipo: value, destinatarioCi: "" };
              }
              return { ...prev, [field]: value };
            })
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, items) => void returnPrestamo(prestamoId, fechaDevolucion, items)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}

      {activeView === "formularios" ? (
        <FormulariosPrestamosView
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
            setPrestamoDraft((prev: PrestamoDraft) => {
              if (field === "destinatarioTipo") {
                return { ...prev, destinatarioTipo: value, destinatarioCi: "" };
              }
              return { ...prev, [field]: value };
            })
          }
          onPrestamoItemChange={updatePrestamoDraftItem}
          onAddPrestamoItem={addPrestamoDraftItem}
          onRemovePrestamoItem={removePrestamoDraftItem}
          onSubmitPrestamo={() => void savePrestamo(false)}
          onSubmitPrestamoAndPrint={() => void savePrestamo(true)}
          onReturnPrestamo={(prestamoId, fechaDevolucion, items) => void returnPrestamo(prestamoId, fechaDevolucion, items)}
          onEditPrestamo={(prestamoId, payload) => editPrestamo(prestamoId, payload)}
          onDeletePrestamo={(prestamoId) => void deletePrestamo(prestamoId)}
          onReload={() => void reloadActiveStockData()}
        />
      ) : null}
    </>
  );
}