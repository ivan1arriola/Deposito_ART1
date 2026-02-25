import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSessionFromRequest, getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  await deleteSessionFromRequest(request);

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);

  await logAudit({
    usuarioId: user?.usuarioId ?? null,
    accion: "LOGOUT",
    entidad: "AUTH",
    entidadId: user?.usuarioId ?? null,
  });

  return response;
}
