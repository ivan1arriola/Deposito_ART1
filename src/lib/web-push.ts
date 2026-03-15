import webpush from "web-push";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationKind = "LOGIN" | "MOVIMIENTO";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  kind: NotificationKind;
  createdAt: string;
};

type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type SubscriptionRow = {
  subscription_id: bigint;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let vapidConfigured = false;

function getVapidConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() ?? "mailto:admin@example.com";
  return { publicKey, privateKey, subject };
}

export function getWebPushConfigStatus() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  const missing: string[] = [];
  if (!publicKey) missing.push("WEB_PUSH_PUBLIC_KEY");
  if (!privateKey) missing.push("WEB_PUSH_PRIVATE_KEY");
  return {
    publicKey,
    privateKey,
    subject,
    missing,
    ready: missing.length === 0,
  };
}

function ensureVapidConfigured() {
  if (vapidConfigured) return true;
  const { publicKey, privateKey, subject, ready } = getWebPushConfigStatus();
  if (!ready) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export function getWebPushPublicKey() {
  return getVapidConfig().publicKey;
}

export async function upsertAdminPushSubscription(usuarioId: string, subscription: PushSubscriptionInput, userAgent: string | null) {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO web_push_subscription (usuario_id, endpoint, p256dh, auth, user_agent, enabled)
      VALUES (${usuarioId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${userAgent}, true)
      ON CONFLICT (endpoint)
      DO UPDATE SET
        usuario_id = EXCLUDED.usuario_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        enabled = true,
        updated_at = now()
    `,
  );
}

export async function disableAdminPushSubscription(usuarioId: string, endpoint: string) {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE web_push_subscription
      SET enabled = false, updated_at = now()
      WHERE usuario_id = ${usuarioId} AND endpoint = ${endpoint}
    `,
  );
}

function isGoneSubscriptionError(error: unknown) {
  const candidate = error as { statusCode?: number };
  return candidate?.statusCode === 404 || candidate?.statusCode === 410;
}

async function listAdminSubscriptions() {
  const rows = await prisma.$queryRaw<SubscriptionRow[]>(
    Prisma.sql`
      SELECT s.subscription_id, s.endpoint, s.p256dh, s.auth
      FROM web_push_subscription s
      JOIN usuario u ON u.usuario_id = s.usuario_id
      WHERE s.enabled = true AND u.activo = true AND u.rol = 'ADMIN'
    `,
  );
  return rows;
}

export async function sendPushToAdmins(payload: PushPayload) {
  if (!ensureVapidConfigured()) return;

  const rows = await listAdminSubscriptions();
  if (rows.length === 0) return;

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        if (!isGoneSubscriptionError(error)) return;
        await prisma.$executeRaw(
          Prisma.sql`UPDATE web_push_subscription SET enabled = false, updated_at = now() WHERE subscription_id = ${row.subscription_id}`,
        );
      }
    }),
  );
}
