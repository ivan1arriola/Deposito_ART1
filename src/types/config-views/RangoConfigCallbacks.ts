export interface RangoConfigCallbacks {
  onNewAbreviacionChange: (value: string) => void;
  onNewNombreCompletoChange: (value: string) => void;
  onNewOrdenChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditAbreviacionChange: (value: string) => void;
  onEditNombreCompletoChange: (value: string) => void;
  onEditOrdenChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (rangoId: number) => void;
  onDelete: (rangoId: number) => void;
}
