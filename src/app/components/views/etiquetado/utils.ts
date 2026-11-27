import type {
  EtiquetadoCaja,
  EtiquetadoCodigoSIE,
  EtiquetadoEstanteria,
  EtiquetadoEquipo,
} from "@/types/etiquetado";
import type { EtiquetadoSection } from "./types";

export const SECTION_META: Record<EtiquetadoSection, { title: string; description: string }> = {
  codigos_sie: {
    title: "Codigos SIE",
    description: "Registra equipos, codigos SIE y estanterias para su vinculacion.",
  },
  listado_cajas: {
    title: "Listado de Cajas",
    description: "Consulta cajas registradas e imprime etiquetas individuales por caja.",
  },
  imprimir_todas: {
    title: "Imprimir Todas las Etiquetas",
    description: "Genera e imprime en bloque todas las etiquetas registradas.",
  },
};

export const SIE_CODE_REGEX = /^(?:\d{8}|[A-Z]{3}\d{2})$/;

export function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeEstanteriaName(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 1);
}

export function isValidEstanteriaName(value: string) {
  return /^[A-Z]$/.test(value.trim().toUpperCase());
}

export function formatEstanteriaLabel(piso: number, nombreEstanteria: string) {
  return `Estanteria P${piso} - ${nombreEstanteria}`;
}

export function buildEstanteriaKey(codigo: string, piso: number) {
  return `${piso}:${codigo.trim().toUpperCase()}`;
}

export function sortEtiquetadoItems(equipos: EtiquetadoEquipo[]) {
  return [...equipos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
}

export function buildEstanteriaOptions(estanterias: EtiquetadoEstanteria[]) {
  return [...estanterias]
    .map((estanteria) => ({
      value: buildEstanteriaKey(estanteria.codigo, estanteria.piso),
      codigo: estanteria.codigo,
      piso: estanteria.piso,
      label: estanteria.etiqueta || formatEstanteriaLabel(estanteria.piso, estanteria.codigo),
    }))
    .sort((a, b) => {
      if (a.piso !== b.piso) return a.piso - b.piso;
      return a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
    });
}

export function buildEstanteriaLabelByKey(estanterias: EtiquetadoEstanteria[]) {
  const map = new Map<string, string>();
  for (const estanteria of estanterias) {
    map.set(
      buildEstanteriaKey(estanteria.codigo, estanteria.piso),
      estanteria.etiqueta || formatEstanteriaLabel(estanteria.piso, estanteria.codigo)
    );
  }
  return map;
}

export function sortCodigosSIE(codigosSIE: EtiquetadoCodigoSIE[]) {
  return [...codigosSIE].sort((a, b) => {
    const byCodigo = a.codigo.localeCompare(b.codigo, "es", { sensitivity: "base" });
    if (byCodigo !== 0) return byCodigo;
    return (a.talla ?? "").localeCompare(b.talla ?? "", "es", { sensitivity: "base" });
  });
}

export function filterCajas(cajas: EtiquetadoCaja[], filtro: string) {
  const normalized = filtro.trim().toLowerCase();
  if (!normalized) return cajas;

  return cajas.filter((caja) => {
    const texto = [
      String(caja.codigoDepositoGeneral),
      caja.equipoNombres.join(" "),
      caja.estanteria,
      String(caja.piso),
      buildEstanteriaKey(caja.estanteria, caja.piso),
      caja.codigosSIE.map((codigo) => codigo.codigo).join(" "),
    ]
      .join(" ")
      .toLowerCase();

    return texto.includes(normalized);
  });
}

export function sanitizeNumericInput(value: string) {
  return value.replace(/[^\d]/g, "");
}
