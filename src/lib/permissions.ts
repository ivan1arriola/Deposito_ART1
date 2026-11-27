import { UserRole } from "@/generated/prisma/client";

export type AuthAccountType = "SISTEMA" | "PERSONAL";

export type Permission =
  | "read_data"
  | "write_data"
  | "delete_data"
  | "manage_users"
  | "view_audit"
  | "read_own_data"
  | "change_own_password";

const permissionMatrix: Record<UserRole, Record<Permission, boolean>> = {
  ADMIN: {
    read_data: true,
    write_data: true,
    delete_data: true,
    manage_users: true,
    view_audit: true,
    read_own_data: true,
    change_own_password: true,
  },
  DESARROLLADOR: {
    read_data: true,
    write_data: true,
    delete_data: true,
    manage_users: true,
    view_audit: true,
    read_own_data: true,
    change_own_password: true,
  },
  EDITOR: {
    read_data: true,
    write_data: true,
    delete_data: true,
    manage_users: false,
    view_audit: false,
    read_own_data: true,
    change_own_password: true,
  },
  READ_ONLY: {
    read_data: true,
    write_data: false,
    delete_data: false,
    manage_users: false,
    view_audit: false,
    read_own_data: true,
    change_own_password: false,
  },
};

const personalPermissionMatrix: Record<Permission, boolean> = {
  read_data: false,
  write_data: false,
  delete_data: false,
  manage_users: false,
  view_audit: false,
  read_own_data: true,
  change_own_password: true,
};

export function hasPermission(
  role: UserRole,
  permission: Permission,
  accountType: AuthAccountType = "SISTEMA",
) {
  if (accountType === "PERSONAL") {
    return personalPermissionMatrix[permission];
  }
  return permissionMatrix[role][permission];
}
