import type { Role } from "@/types/entities";

export type UserRoleDialogState = {
  usuarioId: string;
  username: string;
  currentRole: Role;
  nextRole: Role;
};
