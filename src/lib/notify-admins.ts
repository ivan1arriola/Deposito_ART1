import type { UserRole } from "@/generated/prisma/client";
import { isAdminRole } from "@/lib/user-role";
import { sendPushToAdmins } from "@/lib/web-push";

type Actor = {
  usuarioId: string;
  username: string;
  nombre: string;
  apellido: string;
  rol: UserRole;
};

function actorLabel(actor: Actor) {
  return `${actor.apellido}, ${actor.nombre} (${actor.username})`;
}

export async function notifyAdminOnLogin(actor: Actor) {
  if (isAdminRole(actor.rol)) return;
  await sendPushToAdmins({
    kind: "LOGIN",
    title: "Nuevo inicio de sesión",
    body: `${actorLabel(actor)} inicio sesión.`,
    url: "/",
    createdAt: new Date().toISOString(),
  });
}

export async function notifyAdminOnMovement(actor: Actor, detail: string, url = "/") {
  if (isAdminRole(actor.rol)) return;
  await sendPushToAdmins({
    kind: "MOVIMIENTO",
    title: "Movimiento registrado",
    body: `${actorLabel(actor)}: ${detail}`,
    url,
    createdAt: new Date().toISOString(),
  });
}
