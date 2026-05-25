import type { FormEvent } from "react";
import type { FirmaConfig } from "../entities/FirmaConfig";

export interface FirmaConfigCallbacks {
  onFirmaConfigDraftChange: (key: keyof Omit<FirmaConfig, "updatedAt">, value: string) => void;
  onSaveFirmaConfig: (event: FormEvent<HTMLFormElement>) => void;
}
