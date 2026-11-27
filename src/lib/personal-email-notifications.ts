import { getAppBaseUrl } from "@/lib/app-url";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendMail } from "@/lib/mailer";
import { getPersonalNotificationTarget } from "@/lib/personal-auth";

type PersonalEmailNotificationInput = {
  request: Request;
  ci: string;
  subject: string;
  headline: string;
  detailLines?: string[];
  actorLabel?: string | null;
  portalPath?: string;
};

type PersonalEmailNotificationResult =
  | { sent: true; email: string }
  | { sent: false; reason: "NOT_FOUND" | "NO_EMAIL" | "INVALID_EMAIL" };

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendPersonalMovementEmailNotification(
  input: PersonalEmailNotificationInput
): Promise<PersonalEmailNotificationResult> {
  const target = await getPersonalNotificationTarget(input.ci);
  if (!target) return { sent: false, reason: "NOT_FOUND" };

  if (!target.mailReferencia) {
    return { sent: false, reason: "NO_EMAIL" };
  }

  const email = normalizeEmailAddress(target.mailReferencia);
  if (!isValidEmailAddress(email)) {
    return { sent: false, reason: "INVALID_EMAIL" };
  }

  const baseUrl = getAppBaseUrl(input.request);
  const portalUrl = `${baseUrl}${input.portalPath ?? "/"}`;
  const detailLines = (input.detailLines ?? [])
    .map((line) => line.trim())
    .filter((line) => line !== "");
  const actorLabel = input.actorLabel?.trim() || null;

  const greetingName = `${target.gradoAbreviacion} ${target.nombreCompleto}`.trim();
  const textSections: string[] = [`Hola ${greetingName},`, "", input.headline.trim()];

  if (detailLines.length > 0) {
    textSections.push("", "Detalle:");
    for (const line of detailLines) {
      textSections.push(`- ${line}`);
    }
  }

  if (actorLabel) {
    textSections.push("", `Registrado por: ${actorLabel}`);
  }

  textSections.push("", `Portal: ${portalUrl}`, "", "Este aviso es informativo.");

  const htmlDetailList =
    detailLines.length > 0
      ? `<p><strong>Detalle:</strong></p><ul>${detailLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      : "";
  const htmlActor = actorLabel
    ? `<p><strong>Registrado por:</strong> ${escapeHtml(actorLabel)}</p>`
    : "";

  await sendMail({
    to: email,
    subject: input.subject,
    text: textSections.join("\n"),
    html:
      `<p>Hola ${escapeHtml(greetingName)},</p>` +
      `<p>${escapeHtml(input.headline.trim())}</p>` +
      htmlDetailList +
      htmlActor +
      `<p><a href="${escapeHtml(portalUrl)}">Abrir portal</a></p>` +
      "<p>Este aviso es informativo.</p>",
  });

  return { sent: true, email };
}
