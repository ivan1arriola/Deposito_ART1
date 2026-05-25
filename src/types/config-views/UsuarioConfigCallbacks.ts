import type { FormEvent } from "react";
import type { Role } from "../entities/Role";
import type { UsuarioAdmin } from "../entities/UsuarioAdmin";

export interface UsuarioConfigCallbacks {
  onNewGradoChange: (value: string) => void;
  onNewNombreChange: (value: string) => void;
  onNewApellidoChange: (value: string) => void;
  onNewUsernameChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewPasswordConfirmChange: (value: string) => void;
  onNewMailReferenciaChange: (value: string) => void;
  onNewRoleChange: (role: Role) => void;
  onCreateUsuario: (event: FormEvent<HTMLFormElement>) => void;
  onEditUsuario: (usuario: UsuarioAdmin) => void;
  onChangeUserRole: (usuario: UsuarioAdmin) => void;
  onChangeUserPassword: (usuario: UsuarioAdmin) => void;
  onToggleUserActive: (usuario: UsuarioAdmin) => void;
  onDeleteUsuario: (usuario: UsuarioAdmin) => void;
}
