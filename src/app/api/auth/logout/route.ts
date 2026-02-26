import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSessionFromRequest, getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function readRequestMeta(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;
  const userAgent = request.headers.get("user-agent") || null;
  return { ip, userAgent };
}

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  await deleteSessionFromRequest(request);
  const requestMeta = readRequestMeta(request);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  await logAudit({
    usuarioId: user?.usuarioId ?? null,
    accion: "LOGOUT",
    entidad: "AUTH",
    entidadId: user?.usuarioId ?? null,
    detalle: {
      username: user?.username ?? null,
      rol: user?.rol ?? null,
      ip: requestMeta.ip,
      userAgent: requestMeta.userAgent,
    },
  });

  return response;
}
