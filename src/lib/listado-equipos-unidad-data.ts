import {
  compareEquiposByTipoAndName,
  compareEquiposByTipoAndOrder,
  groupEquiposByTipo,
} from "@/lib/equipo-sort";
import { serializeEquipoTipoData } from "@/lib/equipo-tipos-data";

export type EquipoStockTotalsRow = {
  stockSubalternos: number;
  stockAsignacion: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
};

export function computeEquipoStockTotals(rows: EquipoStockTotalsRow[]) {
  const totalSubalternos = rows.reduce((total, equipo) => total + equipo.stockSubalternos, 0);
  const totalAsignacion = rows.reduce((total, equipo) => total + equipo.stockAsignacion, 0);
  const totalPrestamo = rows.reduce((total, equipo) => total + equipo.stockPrestamo, 0);
  const totalDeposito = rows.reduce((total, equipo) => total + equipo.stockDeposito, 0);
  const totalUnidad = rows.reduce((total, equipo) => total + equipo.stockUnidad, 0);

  return {
    totalSubalternos,
    totalAsignacion,
    totalPrestamo,
    totalDeposito,
    totalUnidad,
  };
}

export type ListadoEquipoInput = {
  equipoId: bigint;
  nombre: string;
  tipoEquipoId: number | null;
  tipoEquipo: {
    tipoEquipoId: number;
    clave: string;
    nombre: string;
    orden: number;
  } | null;
  ordenPdf: number;
  existenciaSie: number;
};

export type StockSummaryMapsInput = {
  unidadByItem: Map<string, number>;
  personalByItem: Map<string, number>;
  asignacionByItem: Map<string, number>;
  prestamoByItem: Map<string, number>;
};

export type ListadoEquipoResumenRow = {
  equipoId: string;
  nombre: string;
  tipo: string;
  tipoEquipoId: number | null;
  tipoLabel: string;
  tipoOrden: number;
  ordenPdf: number;
  stockSubalternos: number;
  stockAsignacion: number;
  stockPrestamo: number;
  stockDeposito: number;
  stockUnidad: number;
  existenciaSie: number;
};

export function buildListadoEquiposUnidadModel(
  equipos: ListadoEquipoInput[],
  stockSummaryMaps: StockSummaryMapsInput,
  isAlphaSort: boolean
) {
  const resumen: ListadoEquipoResumenRow[] = equipos.map((equipo) => {
    const itemKey = equipo.equipoId.toString();
    const stockUnidad = stockSummaryMaps.unidadByItem.get(itemKey) ?? 0;
    const stockSubalternos = stockSummaryMaps.personalByItem.get(itemKey) ?? 0;
    const stockAsignacion = stockSummaryMaps.asignacionByItem.get(itemKey) ?? 0;
    const stockPrestamo = stockSummaryMaps.prestamoByItem.get(itemKey) ?? 0;
    const stockDeposito = stockUnidad - stockSubalternos - stockAsignacion - stockPrestamo;
    const tipo = serializeEquipoTipoData(equipo);

    return {
      equipoId: itemKey,
      nombre: equipo.nombre,
      ...tipo,
      ordenPdf: equipo.ordenPdf,
      stockSubalternos,
      stockAsignacion,
      stockPrestamo,
      stockDeposito,
      stockUnidad,
      existenciaSie: equipo.existenciaSie,
    };
  });

  const resumenOrdenado = [...resumen].sort(
    isAlphaSort ? compareEquiposByTipoAndName : compareEquiposByTipoAndOrder
  );
  const resumenPorTipo = groupEquiposByTipo(resumenOrdenado).map((section) => ({
    ...section,
    title: isAlphaSort ? `Equipos ${section.label} (A-Z)` : `Equipos ${section.label}`,
  }));

  const totals = computeEquipoStockTotals(resumen);

  return {
    resumen,
    resumenOrdenado,
    resumenPorTipo,
    totals,
  };
}
