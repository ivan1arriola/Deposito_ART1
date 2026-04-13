"use client";

import type { PersonalObservacion } from "@/types/entities";

export type PersonalCurrentUser = {
  accountType: "PERSONAL";
  personalCi: number | null;
  username: string;
  apellido: string;
  nombre: string;
  grado: string;
  mailReferencia?: string | null;
};

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

export type UserRoleDialogState = {
  usuarioId: string;
  username: string;
  currentRole: import("@/types/entities").Role;
  nextRole: import("@/types/entities").Role;
};

export type UserPasswordDialogState = {
  usuarioId: string;
  username: string;
  newPassword: string;
  confirmPassword: string;
};

export type UserProfileDialogState = {
  usuarioId: string;
  rangoId: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string;
  title: string;
  description: string;
};
