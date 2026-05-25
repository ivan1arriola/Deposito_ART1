import type { RegistroView } from "./RegistroView";

export type RegistroViewerState = {
  ci: string;
  nombre: string;
  loading: boolean;
  error: string | null;
  registros: RegistroView[];
};
