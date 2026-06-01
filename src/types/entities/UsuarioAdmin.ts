import type { AccountType } from "./AccountType";
import type { Rango } from "./Rango";
import type { Role } from "./Role";

export type UsuarioAdmin = {
  usuarioId: string;
  rangoId: number | null;
  rango: Rango | null;
  grado: string;
  nombre: string;
  apellido: string;
  username: string;
  mailReferencia: string | null;
  mailVerificadaAt: string | null;
  rol: Role;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  accountType: AccountType;
  personalCi: string | null;
};
