import crypto from "node:crypto";
import { UserRole } from "@/generated/prisma/client";

type WidgetTokenPayload = {
  sub: string;
  usr: string;
  rol: UserRole;
  iat: number;
  exp: number;
  scope: "soldado-widget";
};

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_HOURS = 24 * 30;
const NEVER_EXPIRES_UNIX_SECONDS = 4_102_444_800; // 2100-01-01T00:00:00Z

function getSecret() {
  const secret =
    process.env.SOLDADO_WIDGET_AUTH_SECRET?.trim() ??
    process.env.NEXTAUTH_SECRET?.trim() ??
    process.env.AUTH_SECRET?.trim() ??
    "";
  return secret;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadPart: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

function timingSafeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function ttlHoursFromEnv() {
  const raw = process.env.SOLDADO_WIDGET_TOKEN_TTL_HOURS?.trim();
  if (!raw) return DEFAULT_TTL_HOURS;

  if (raw === "0") return 0;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_TTL_HOURS;
  return Math.min(parsed, 24 * 180);
}

export function isSoldadoWidgetAuthEnabled() {
  return getSecret() !== "";
}

export function issueSoldadoWidgetToken(input: { usuarioId: string; username: string; rol: UserRole }) {
  const secret = getSecret();
  if (!secret) {
    throw new Error("Soldado Widget auth secret no configurado.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttlHours = ttlHoursFromEnv();
  const expSeconds = ttlHours === 0 ? NEVER_EXPIRES_UNIX_SECONDS : nowSeconds + ttlHours * 60 * 60;
  const payload: WidgetTokenPayload = {
    sub: input.usuarioId,
    usr: input.username,
    rol: input.rol,
    iat: nowSeconds,
    exp: expSeconds,
    scope: "soldado-widget",
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signedPart = `${TOKEN_VERSION}.${payloadPart}`;
  const signature = signPayload(signedPart, secret);

  return {
    token: `${signedPart}.${signature}`,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function verifySoldadoWidgetToken(token: string) {
  const secret = getSecret();
  if (!secret) return { ok: false as const, reason: "disabled" as const };

  const [version, payloadPart, signature] = token.split(".");
  if (!version || !payloadPart || !signature) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (version !== TOKEN_VERSION) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const expected = signPayload(`${version}.${payloadPart}`, secret);
  if (!timingSafeEqualString(signature, expected)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as WidgetTokenPayload;
    if (!payload || payload.scope !== "soldado-widget") {
      return { ok: false as const, reason: "invalid" as const };
    }

    if (typeof payload.sub !== "string" || typeof payload.usr !== "string") {
      return { ok: false as const, reason: "invalid" as const };
    }

    if (typeof payload.exp !== "number" || typeof payload.iat !== "number") {
      return { ok: false as const, reason: "invalid" as const };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp <= nowSeconds) {
      return { ok: false as const, reason: "expired" as const };
    }

    return { ok: true as const, payload };
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }
}
