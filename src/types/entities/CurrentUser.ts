import type { AccountType } from "./AccountType";
import type { Role } from "./Role";

export type CurrentUser = {
  usuarioId: string;
  rangoId: number | null;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  rol: Role;
  accountType: AccountType;
  personalCi: string | null;
};
