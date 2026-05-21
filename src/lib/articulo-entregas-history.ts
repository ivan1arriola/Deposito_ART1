export interface ArticuloEntregaHistorialItem {
  articuloId: number;
  nombre: string;
  tipo: string;
  cantidad: number;
}

export interface ArticuloEntregaHistorialEntry {
  articuloEntregaPersonalId: string;
  personalCi: string;
  personalLabel: string;
  ordenanteCi: string;
  ordenanteLabel: string;
  usuarioEntregaId: string;
  usuarioEntregaLabel: string;
  fecha: string;
  comentario: string | null;
  items: ArticuloEntregaHistorialItem[];
}

export type ArticuloEntregaHistorialFilters = {
  searchTerm?: string;
  startDate?: string;
  endDate?: string;
};

export function filterArticuloEntregasHistorial(
  entregas: ArticuloEntregaHistorialEntry[],
  filters: ArticuloEntregaHistorialFilters,
) {
  const normalizedSearchTerm = filters.searchTerm?.trim().toLowerCase() ?? "";
  const normalizedStartDate = filters.startDate?.trim() ?? "";
  const normalizedEndDate = filters.endDate?.trim() ?? "";

  return entregas.filter((entrega) => {
    if (normalizedSearchTerm !== "") {
      const matchesDestinatario =
        entrega.personalLabel.toLowerCase().includes(normalizedSearchTerm) ||
        entrega.personalCi.includes(normalizedSearchTerm);
      const matchesOrdenante =
        entrega.ordenanteLabel.toLowerCase().includes(normalizedSearchTerm) ||
        entrega.ordenanteCi.includes(normalizedSearchTerm);
      const matchesArticulo = entrega.items.some((item) => item.nombre.toLowerCase().includes(normalizedSearchTerm));
      const matchesComentario = entrega.comentario?.toLowerCase().includes(normalizedSearchTerm) ?? false;

      if (!matchesDestinatario && !matchesOrdenante && !matchesArticulo && !matchesComentario) {
        return false;
      }
    }

    if (normalizedStartDate !== "" && entrega.fecha < normalizedStartDate) {
      return false;
    }

    if (normalizedEndDate !== "" && entrega.fecha > normalizedEndDate) {
      return false;
    }

    return true;
  });
}
