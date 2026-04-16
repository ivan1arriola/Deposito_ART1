import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: NonNullable<nodemailer.SendMailOptions["attachments"]>;
};

type MailerConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedConfigKey: string | null = null;

function readMailerConfig(): MailerConfig {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const portRaw = process.env.SMTP_PORT?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const from = process.env.MAIL_FROM?.trim() || user;
  const port = Number(portRaw);

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!portRaw || !Number.isInteger(port) || port <= 0) missing.push("SMTP_PORT");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!from) missing.push("MAIL_FROM");

  if (missing.length > 0) {
    throw new Error(`Configuración SMTP incompleta: ${missing.join(", ")}.`);
  }

  return { host, port, user, pass, from };
}

function getTransporter(config: MailerConfig) {
  const configKey = `${config.host}|${config.port}|${config.user}|${config.from}`;
  if (cachedTransporter && cachedConfigKey === configKey) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
  cachedConfigKey = configKey;
  return cachedTransporter;
}

export async function sendMail(payload: MailPayload) {
  const config = readMailerConfig();
  const transporter = getTransporter(config);

  await transporter.sendMail({
    from: config.from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    attachments: payload.attachments,
  });
}
