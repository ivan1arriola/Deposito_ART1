import type { Role } from "@/types/entities";

export const ADMIN_ROLE_VALUES = ["ADMIN", "DESARROLLADOR"] as const satisfies readonly Role[];
export const WRITE_ROLE_VALUES = ["ADMIN", "DESARROLLADOR", "EDITOR"] as const satisfies readonly Role[];

export function isRoleValue(value: unknown): value is Role {
  return value === "ADMIN" || value === "DESARROLLADOR" || value === "EDITOR" || value === "READ_ONLY";
}

export function isAdminRole(value: unknown): value is (typeof ADMIN_ROLE_VALUES)[number] {
  return value === "ADMIN" || value === "DESARROLLADOR";
}

export function canWriteRole(value: unknown): value is (typeof WRITE_ROLE_VALUES)[number] {
  return value === "ADMIN" || value === "DESARROLLADOR" || value === "EDITOR";
}

export function isReadOnlyRole(value: unknown) {
  return value === "READ_ONLY";
}
