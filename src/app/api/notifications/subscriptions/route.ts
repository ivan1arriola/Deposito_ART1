import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { disableAdminPushSubscription, upsertAdminPushSubscription } from "@/lib/web-push";
import { isAdminRole } from "@/lib/user-role";

type SubscribeBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

type UnsubscribeBody = {
  endpoint?: string;
};

function parseSubscribeBody(body: unknown) {
  const candidate = body as SubscribeBody;
  const endpoint = String(candidate?.endpoint ?? "").trim();
  const p256dh = String(candidate?.keys?.p256dh ?? "").trim();
  const auth = String(candidate?.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) return null;
  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

function parseUnsubscribeBody(body: unknown) {
  const candidate = body as UnsubscribeBody;
  const endpoint = String(candidate?.endpoint ?? "").trim();
  if (!endpoint) return null;
  return endpoint;
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;
  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json({ error: "Solo el administrador puede suscribirse a notificaciones." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseSubscribeBody(body);
  if (!parsed) {
    return NextResponse.json({ error: "Suscripcion invalida." }, { status: 400 });
  }

  try {
    const userAgent = request.headers.get("user-agent");
    await upsertAdminPushSubscription(auth.user.usuarioId, parsed, userAgent);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo guardar la suscripcion. Verifica migracion web_push_subscription." },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;
  if (!isAdminRole(auth.user.rol)) {
    return NextResponse.json({ error: "Solo el administrador puede desuscribirse." }, { status: 403 });
  }

  const body = await request.json();
  const endpoint = parseUnsubscribeBody(body);
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint invalido." }, { status: 400 });
  }

  try {
    await disableAdminPushSubscription(auth.user.usuarioId, endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo desactivar la suscripcion. Verifica migracion web_push_subscription." },
      { status: 503 },
    );
  }
}
