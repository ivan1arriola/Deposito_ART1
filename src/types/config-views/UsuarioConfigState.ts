import type { Role } from "../entities/Role";
import type { UsuarioAdmin } from "../entities/UsuarioAdmin";

export interface UsuarioConfigState {
  usuarios: UsuarioAdmin[];
  newGrado: string;
  newNombre: string;
  newApellido: string;
  newUsername: string;
  newPassword: string;
  newPasswordConfirm: string;
  newMailReferencia: string;
  newRole: Role;
}
