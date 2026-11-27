/**
 * Handler functions para operaciones de catálogos (Rangos, Baterías, Artículos, Equipos)
 * Estas funciones contienen la lógica de negocio envuelta con API y side effects
 */

import { api } from "@/lib/api";
import type { TipoArticulo, TipoEquipo } from "@/types/entities";

interface CallbackProps {
  onSuccess: (data?: unknown) => void;
  onError: (message: string) => void;
}

// ==================== RANGOS ====================

export async function createRangoHandler(
  abreviacion: string,
  nombreCompleto: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api("/api/rangos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abreviacion, nombreCompleto, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el grado.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateRangoHandler(
  rangoId: number,
  abreviacion: string,
  nombreCompleto: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/rangos/${rangoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abreviacion, nombreCompleto, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el grado.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteRangoHandler(rangoId: number, callbacks: CallbackProps) {
  try {
    await api(`/api/rangos/${rangoId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el grado.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== BATERIAS ====================

export async function createBateriaHandler(
  nombre: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api("/api/baterias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la batería.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateBateriaHandler(
  bateriaId: number,
  nombre: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/baterias/${bateriaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la batería.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteBateriaHandler(bateriaId: number, callbacks: CallbackProps) {
  try {
    await api(`/api/baterias/${bateriaId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar la batería.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== TIPOS DE EQUIPO ====================

export async function createEquipoTipoHandler(
  nombre: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    const data = await api("/api/equipos/tipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el tipo de equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateEquipoTipoHandler(
  tipoEquipoId: number,
  nombre: string,
  orden: number | undefined,
  callbacks: CallbackProps
) {
  try {
    const data = await api(`/api/equipos/tipos/${tipoEquipoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden }),
    });
    callbacks.onSuccess(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el tipo de equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteEquipoTipoHandler(tipoEquipoId: number, callbacks: CallbackProps) {
  try {
    const data = await api(`/api/equipos/tipos/${tipoEquipoId}`, { method: "DELETE" });
    callbacks.onSuccess(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo eliminar el tipo de equipo.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== ARTICULOS ====================

export async function createArticuloHandler(
  nombre: string,
  tipo: TipoArticulo,
  callbacks: CallbackProps
) {
  try {
    await api("/api/articulos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el artículo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateArticuloHandler(
  articuloId: number,
  nombre: string,
  tipo: TipoArticulo,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/articulos/${articuloId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el artículo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteArticuloHandler(articuloId: number, callbacks: CallbackProps) {
  try {
    await api(`/api/articulos/${articuloId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el artículo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function ingresarStockArticuloHandler(
  articuloId: number,
  cantidad: number,
  comentarios: string | undefined,
  callbacks: CallbackProps
) {
  try {
    await api("/api/articulos/ingresos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articuloId, cantidad, comentarios }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar el ingreso de stock del artículo.";
    callbacks.onError(message);
    throw error;
  }
}

// ==================== EQUIPOS ====================

export async function createEquipoHandler(
  nombre: string,
  tipo: TipoEquipo,
  activo: boolean,
  callbacks: CallbackProps
) {
  try {
    await api("/api/equipos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo, activo }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateEquipoHandler(
  equipoId: string,
  nombre: string,
  tipo: TipoEquipo,
  activo: boolean,
  ordenPdf: number,
  callbacks: CallbackProps
) {
  try {
    await api(`/api/equipos/${equipoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, tipo, activo, ordenPdf }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function deleteEquipoHandler(equipoId: string, callbacks: CallbackProps) {
  try {
    await api(`/api/equipos/${equipoId}`, { method: "DELETE" });
    callbacks.onSuccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo eliminar el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export type EquipoMergeResult = {
  ok: boolean;
  sourceEquipo: {
    equipoId: string;
    nombre: string;
  };
  targetEquipo: {
    equipoId: string;
    nombre: string;
  };
  resumen: {
    totalRegistrosAfectados: number;
    totalStockAfectados: number;
    totalMovimientosAfectados: number;
    registrosConsolidados: number;
    stockConsolidados: number;
    unidadesRegistrosReasignadas: number;
    unidadesStockReasignadas: number;
    unidadesTotalesReasignadas: number;
  };
};

export async function mergeEquipoHandler(
  sourceEquipoId: string,
  targetEquipoId: string,
  callbacks: CallbackProps
) {
  try {
    const result = await api<EquipoMergeResult>(`/api/equipos/${sourceEquipoId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEquipoId }),
    });
    callbacks.onSuccess(result);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo unificar el equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export type EquipoDeleteImpact = {
  equipo: {
    equipoId: string;
    nombre: string;
  };
  resumen: {
    totalMovimientos: number;
    totalRegistros: number;
    totalStock: number;
    movimientosQueSeEliminan: number;
    movimientosQueSeActualizan: number;
    totalCodigosSIE: number;
    totalCodigosSIEEnCajas: number;
    totalAparicionesEquipoEnCajas: number;
    totalCajasAfectadas: number;
    cajasQueQuedanSinEquipos: number;
  };
  codigosSIE: Array<{
    codigo: string;
    talla: string | null;
    aparicionesEnCajas: number;
  }>;
  cajas: Array<{
    codigoDepositoGeneral: number;
    estanteria: string;
    totalEquiposEnCaja: number;
    tieneRelacionEquipoDirecta: boolean;
    codigosSIERelacionados: string[];
    quedaSinEquipos: boolean;
  }>;
  registros: Array<{
    movimientoId: string;
    fecha: string;
    tipo: string;
    ci: string;
    persona: string;
    cantidadItems: number;
    seEliminaMovimiento: boolean;
  }>;
  stock: Array<{
    movimientoId: string;
    fecha: string;
    tipo: string;
    cantidadItems: number;
    seEliminaMovimiento: boolean;
  }>;
};

export async function loadEquipoDeleteImpactHandler(equipoId: string, callbacks: CallbackProps) {
  try {
    const result = await api<EquipoDeleteImpact>(`/api/equipos/${equipoId}`, { method: "GET" });
    callbacks.onSuccess(result);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo calcular el impacto de borrado del equipo.";
    callbacks.onError(message);
    throw error;
  }
}

export async function updateMultipleEquipoOrdersHandler(
  orderedEquipoIds: string[],
  callbacks: CallbackProps,
  activo = true
) {
  try {
    await api("/api/equipos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedItemIds: orderedEquipoIds, activo }),
    });
    callbacks.onSuccess();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el orden de PDF.";
    callbacks.onError(message);
    throw error;
  }
}

export async function entregarArticulosPersonalHandler(
  personalCi: string,
  ordenanteCi: string,
  fecha: string,
  comentario: string | undefined,
  equipos: Array<{ articuloId: number; cantidad: number }>,
  callbacks: CallbackProps
) {
  try {
    const result = await api("/api/articulos/entregas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personalCi, ordenanteCi, fecha, comentario, equipos }),
    });
    callbacks.onSuccess(result);
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar la entrega de artículos a personal.";
    callbacks.onError(message);
    throw error;
  }
}
