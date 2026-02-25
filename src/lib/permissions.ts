import { UserRole } from "@prisma/client";

export type Permission = "read_data" | "write_data" | "delete_data" | "manage_users" | "view_audit";

const permissionMatrix: Record<UserRole, Record<Permission, boolean>> = {
  ADMIN: {
    read_data: true,
    write_data: true,
    delete_data: true,
    manage_users: true,
    view_audit: true,
  },
  EDITOR: {
    read_data: true,
    write_data: true,
    delete_data: true,
    manage_users: false,
    view_audit: false,
  },
  VIEWER: {
    read_data: true,
    write_data: false,
    delete_data: false,
    manage_users: false,
    view_audit: false,
  },
};

export function hasPermission(role: UserRole, permission: Permission) {
  return permissionMatrix[role][permission];
}
