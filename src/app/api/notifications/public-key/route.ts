import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getWebPushConfigStatus } from "@/lib/web-push";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;
  if (auth.user.rol !== "ADMIN") {
    return NextResponse.json({ error: "Solo el administrador puede configurar notificaciones." }, { status: 403 });
  }

  const config = getWebPushConfigStatus();
  if (!config.ready) {
    const missing = config.missing.join(", ");
    return NextResponse.json(
      {
        error: `Web Push no configurado. Faltan: ${missing}. Ejecuta "npm run webpush:generate", agrega las variables en .env y reinicia la app.`,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ publicKey: config.publicKey });
}
