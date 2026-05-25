import type { FirmaConfig } from "../entities/FirmaConfig";

export interface FirmaConfigState {
  firmaConfig: FirmaConfig | null;
  firmaConfigDraft: Omit<FirmaConfig, "updatedAt">;
  firmaConfigLoading: boolean;
  firmaConfigSaving: boolean;
  firmaConfigError: string | null;
}
