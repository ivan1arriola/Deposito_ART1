import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isSoldadoWidgetAuthEnabled, issueSoldadoWidgetToken } from "@/lib/soldado-widget-auth";

const DEFAULT_REDIRECT_URI = "soldadowidget://auth/callback";
const ALLOWED_REDIRECT_PREFIXES = ["soldadowidget://auth"];

function normalizeRedirectUri(rawValue: string | null) {
  const value = (rawValue ?? "").trim() || DEFAULT_REDIRECT_URI;
  try {
    const parsed = new URL(value);
    const normalized = parsed.toString();
    const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => normalized.startsWith(prefix));
    if (!isAllowed) return null;
    return normalized;
  } catch {
    return null;
  }
}

function sanitizeState(rawValue: string | null) {
  const value = (rawValue ?? "").trim();
  if (!value) return "";
  return value.slice(0, 200);
}

function buildLoginRedirect(requestUrl: URL) {
  const signInUrl = new URL("/", requestUrl.origin);
  signInUrl.searchParams.set("widgetAuthCallback", requestUrl.toString());
  return NextResponse.redirect(signInUrl, { status: 302 });
}

export async function GET(request: Request) {
  if (!isSoldadoWidgetAuthEnabled()) {
    return NextResponse.json(
      { error: "Autenticacion de Soldado Widget no habilitada en este entorno." },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const redirectUri = normalizeRedirectUri(requestUrl.searchParams.get("redirect_uri"));
  if (!redirectUri) {
    return NextResponse.json(
      {
        error:
          "redirect_uri invalido. Debe usar el esquema de la app (ej: soldadowidget://auth/callback).",
      },
      { status: 400 },
    );
  }

  const state = sanitizeState(requestUrl.searchParams.get("state"));

  const user = await getUserFromRequest();
  if (!user) {
    return buildLoginRedirect(requestUrl);
  }

  const token = issueSoldadoWidgetToken({
    usuarioId: user.usuarioId,
    username: user.username,
    rol: user.rol,
  });

  await logAudit({
    usuarioId: user.usuarioId,
    accion: "LOGIN_WIDGET_WEB",
    entidad: "AUTH",
    entidadId: user.usuarioId,
    detalle: {
      origen: "soldado-widget-web-auth",
      username: user.username,
      rol: user.rol,
    },
  });

  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("accessToken", token.token);
  callbackUrl.searchParams.set("expiresAt", token.expiresAt.toISOString());
  callbackUrl.searchParams.set("usuarioId", user.usuarioId);
  callbackUrl.searchParams.set("username", user.username);
  if (state) callbackUrl.searchParams.set("state", state);

  return NextResponse.redirect(callbackUrl, { status: 302 });
}
