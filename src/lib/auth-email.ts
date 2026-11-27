import { getAppBaseUrl } from "@/lib/app-url";
import { createEmailVerificationToken, createPasswordResetToken } from "@/lib/password-reset";
import { sendMail } from "@/lib/mailer";

type AuthMailUser = {
  usuarioId: string;
  username: string;
  nombre: string;
  apellido: string;
  mailReferencia: string;
};

function displayName(user: Pick<AuthMailUser, "nombre" | "apellido" | "username">) {
  const full = `${user.nombre} ${user.apellido}`.trim();
  return full || user.username;
}

function buildLink(baseUrl: string, pathname: string, token: string) {
  return `${baseUrl}${pathname}?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetMagicLinkEmail(request: Request, user: AuthMailUser) {
  const { token, expiresAt } = await createPasswordResetToken(user.usuarioId, user.mailReferencia);
  const baseUrl = getAppBaseUrl(request);
  const link = buildLink(baseUrl, "/auth/password-reset", token);
  const expiresLabel = expiresAt.toLocaleString("es-UY");
  const name = displayName(user);

  await sendMail({
    to: user.mailReferencia,
    subject: "Recuperación de contraseña - Sistema de Depósito General - Artilleria 1",
    text:
      `Hola ${name},\n\n` +
      `Recibimos una solicitud para cambiar tu contraseña.\n` +
      `Usa este enlace para continuar:\n${link}\n\n` +
      `Este enlace vence el ${expiresLabel}.\n` +
      "Si no solicitaste este cambio, puedes ignorar este mensaje.",
    html:
      `<p>Hola ${name},</p>` +
      "<p>Recibimos una solicitud para cambiar tu contraseña.</p>" +
      `<p><a href="${link}">Restablecer contraseña</a></p>` +
      `<p>Este enlace vence el <strong>${expiresLabel}</strong>.</p>` +
      "<p>Si no solicitaste este cambio, puedes ignorar este mensaje.</p>",
  });

  return { expiresAt };
}

export async function sendEmailVerificationMagicLinkEmail(request: Request, user: AuthMailUser) {
  const { token, expiresAt } = await createEmailVerificationToken(
    user.usuarioId,
    user.mailReferencia
  );
  const baseUrl = getAppBaseUrl(request);
  const link = buildLink(baseUrl, "/auth/verify-email", token);
  const expiresLabel = expiresAt.toLocaleString("es-UY");
  const name = displayName(user);

  await sendMail({
    to: user.mailReferencia,
    subject: "Validación de correo - Sistema de Depósito General - Artilleria 1",
    text:
      `Hola ${name},\n\n` +
      "Confirma este correo para habilitar la recuperación de contraseña por enlace mágico.\n" +
      `Valida tu correo aqui:\n${link}\n\n` +
      `Este enlace vence el ${expiresLabel}.`,
    html:
      `<p>Hola ${name},</p>` +
      "<p>Confirma este correo para habilitar la recuperación de contraseña por enlace mágico.</p>" +
      `<p><a href="${link}">Validar correo</a></p>` +
      `<p>Este enlace vence el <strong>${expiresLabel}</strong>.</p>`,
  });

  return { expiresAt };
}
