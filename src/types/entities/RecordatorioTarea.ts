export type RecordatorioTarea = {
  tareaId: string;
  usuarioId: string;
  titulo: string;
  nota: string;
  fechaLimite: string | null;
  prioridad: "NORMAL" | "URGENTE";
  completada: boolean;
  createdAt: string;
  updatedAt: string;
};
