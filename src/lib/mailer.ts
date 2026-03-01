import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || "no-reply@soldados.local";

function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Falta configurar ${name} para envio de correo.`);
  }
  return value;
}

function getTransport() {
  const host = requireEnv(SMTP_HOST, "SMTP_HOST");
  const user = requireEnv(SMTP_USER, "SMTP_USER");
  const pass = requireEnv(SMTP_PASS, "SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user, pass },
  });
}

export async function sendPasswordResetEmail(to: string, code: string) {
  const transport = getTransport();
  const subject = "Codigo para cambiar contraseña";
  const text = `Tu codigo para cambiar la contraseña es: ${code}\n\nVigencia: 5 minutos.`;

  await transport.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
  });
}
