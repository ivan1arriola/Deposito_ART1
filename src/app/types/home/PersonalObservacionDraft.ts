import type { PersonalObservacion } from "@/types/entities";

export type PersonalObservacionDraft = {
  ci: string;
  nombre: string;
  observacionId: string | null;
  fecha: string;
  texto: string;
  observaciones: PersonalObservacion[];
  loading: boolean;
  error: string | null;
};
