import type { TipoArticulo } from "./TipoArticulo";

export type Articulo = {
  articuloId: number;
  nombre: string;
  tipo: TipoArticulo;
  stockActual: number;
};
