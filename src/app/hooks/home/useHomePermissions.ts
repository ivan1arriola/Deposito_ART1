import { useMemo } from "react";
import type { CurrentUser } from "@/types/entities";

export type HomePermissions = {
  isPersonalAccount: boolean;
  isSystemAccount: boolean;
  isAdmin: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canDeleteRegistros: boolean;
  canManageOwnAccount: boolean;
};

export function useHomePermissions(currentUser: CurrentUser | null | undefined): HomePermissions {
  return useMemo(() => {
    const isPersonalAccount = currentUser?.accountType === "PERSONAL";
    const isSystemAccount = currentUser?.accountType === "SISTEMA";
    const isAdmin = isSystemAccount && currentUser?.rol === "ADMIN";
    const canWrite = isSystemAccount && (currentUser?.rol === "ADMIN" || currentUser?.rol === "EDITOR");

    return {
      isPersonalAccount,
      isSystemAccount,
      isAdmin,
      canWrite,
      canDelete: canWrite,
      canDeleteRegistros: isAdmin,
      canManageOwnAccount: canWrite || isPersonalAccount,
    };
  }, [currentUser]);
}
