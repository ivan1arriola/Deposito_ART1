export interface BateriaConfigCallbacks {
  onNewNombreChange: (value: string) => void;
  onNewOrdenChange: (value: string) => void;
  onEditIdChange: (id: number | null) => void;
  onEditNombreChange: (value: string) => void;
  onEditOrdenChange: (value: string) => void;
  onCreate: () => void;
  onUpdate: (bateriaId: number) => void;
  onDelete: (bateriaId: number) => void;
}
