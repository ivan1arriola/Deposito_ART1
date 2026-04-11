import type { UserRole } from "@/generated/prisma/client";
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
  if (actor.rol === "ADMIN") return;
  await sendPushToAdmins({
    kind: "LOGIN",
    title: "Nuevo inicio de sesion",
    body: `${actorLabel(actor)} inicio sesion.`,
    url: "/",
    createdAt: new Date().toISOString(),
  });
}

export async function notifyAdminOnMovement(actor: Actor, detail: string, url = "/") {
  if (actor.rol === "ADMIN") return;
  await sendPushToAdmins({
    kind: "MOVIMIENTO",
    title: "Movimiento registrado",
    body: `${actorLabel(actor)}: ${detail}`,
    url,
    createdAt: new Date().toISOString(),
  });
}

