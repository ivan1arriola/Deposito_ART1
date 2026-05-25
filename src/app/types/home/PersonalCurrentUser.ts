export type PersonalCurrentUser = {
  accountType: "PERSONAL";
  personalCi: number | null;
  username: string;
  apellido: string;
  nombre: string;
  grado: string;
  mailReferencia?: string | null;
};
