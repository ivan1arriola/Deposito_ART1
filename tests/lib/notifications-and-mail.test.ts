import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockTransportSendMail,
  mockCreateTransport,
  mockSetVapidDetails,
  mockSendNotification,
  mockPrisma,
  mockGetPersonalNotificationTarget,
} = vi.hoisted(() => {
  const transportSendMail = vi.fn();
  return {
    mockTransportSendMail: transportSendMail,
    mockCreateTransport: vi.fn(() => ({
      sendMail: transportSendMail,
    })),
    mockSetVapidDetails: vi.fn(),
    mockSendNotification: vi.fn(),
    mockPrisma: {
      $executeRawUnsafe: vi.fn(),
      $executeRaw: vi.fn(),
      $queryRaw: vi.fn(),
    },
    mockGetPersonalNotificationTarget: vi.fn(),
  };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/personal-auth", () => ({
  getPersonalNotificationTarget: mockGetPersonalNotificationTarget,
}));

import { sendMail } from "@/lib/mailer";
import { notifyAdminOnLogin, notifyAdminOnMovement } from "@/lib/notify-admins";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import {
  disableAdminPushSubscription,
  getWebPushConfigStatus,
  sendPushToAdmins,
  upsertAdminPushSubscription,
} from "@/lib/web-push";

describe("mailer.ts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.MAIL_FROM;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falla si falta configuración SMTP o el puerto es inválido", async () => {
    await expect(
      sendMail({ to: "a@b.com", subject: "Hola", text: "txt", html: "<p>txt</p>" })
    ).rejects.toThrow(
      "Configuración SMTP incompleta: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM."
    );

    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_PORT = "0";
    process.env.SMTP_USER = "user@test.local";
    process.env.SMTP_PASS = "secret";

    await expect(
      sendMail({ to: "a@b.com", subject: "Hola", text: "txt", html: "<p>txt</p>" })
    ).rejects.toThrow("Configuración SMTP incompleta: SMTP_PORT.");
  });

  it("reutiliza el transporter cuando la configuración no cambia y lo recrea si cambia", async () => {
    mockTransportSendMail.mockResolvedValue({ messageId: "1" });
    process.env.SMTP_HOST = "smtp.test.local";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "noreply@test.local";
    process.env.SMTP_PASS = "secret";

    await sendMail({
      to: "dest@test.local",
      subject: "Asunto 1",
      text: "Texto 1",
      html: "<p>Texto 1</p>",
    });

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.test.local",
      port: 465,
      secure: true,
      auth: { user: "noreply@test.local", pass: "secret" },
    });
    expect(mockTransportSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@test.local",
        to: "dest@test.local",
      })
    );

    // Misma configuración -> usa transporter cacheado
    await sendMail({
      to: "dest2@test.local",
      subject: "Asunto 2",
      text: "Texto 2",
      html: "<p>Texto 2</p>",
    });
    expect(mockCreateTransport).toHaveBeenCalledTimes(1);

    // Cambia puerto y MAIL_FROM -> nuevo transporter no seguro (587)
    process.env.SMTP_PORT = "587";
    process.env.MAIL_FROM = "Deposito <dep@test.local>";

    await sendMail({
      to: "dest3@test.local",
      subject: "Asunto 3",
      text: "Texto 3",
      html: "<p>Texto 3</p>",
      attachments: [{ filename: "a.txt", content: "hola" }],
    });
    expect(mockCreateTransport).toHaveBeenCalledTimes(2);
    expect(mockCreateTransport).toHaveBeenLastCalledWith({
      host: "smtp.test.local",
      port: 587,
      secure: false,
      auth: { user: "noreply@test.local", pass: "secret" },
    });
  });
});

describe("web-push.ts y notify-admins.ts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.WEB_PUSH_PUBLIC_KEY;
    delete process.env.WEB_PUSH_PRIVATE_KEY;
    delete process.env.WEB_PUSH_SUBJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("reporta estado de configuración VAPID y no envía push si falta configuración", async () => {
    const missingBoth = getWebPushConfigStatus();
    expect(missingBoth.ready).toBe(false);
    expect(missingBoth.missing).toEqual(["WEB_PUSH_PUBLIC_KEY", "WEB_PUSH_PRIVATE_KEY"]);
    expect(missingBoth.subject).toBe("mailto:admin@example.com");

    await sendPushToAdmins({
      kind: "LOGIN",
      title: "Inicio",
      body: "Cuerpo",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    expect(mockSetVapidDetails).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw).not.toHaveBeenCalled();

    process.env.WEB_PUSH_PUBLIC_KEY = "pub-key";
    const missingPrivate = getWebPushConfigStatus();
    expect(missingPrivate.ready).toBe(false);
    expect(missingPrivate.missing).toEqual(["WEB_PUSH_PRIVATE_KEY"]);
  });

  it("recupera error al inicializar esquema web push y administra suscripciones", async () => {
    process.env.WEB_PUSH_PUBLIC_KEY = "pub-key";
    process.env.WEB_PUSH_PRIVATE_KEY = "priv-key";
    process.env.WEB_PUSH_SUBJECT = "mailto:soporte@art1.mil.uy";

    const status = getWebPushConfigStatus();
    expect(status.ready).toBe(true);
    expect(status.missing).toEqual([]);

    // Primer intento falla creación de tabla
    mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("error DDL"));
    await expect(
      upsertAdminPushSubscription(
        "usr-admin",
        { endpoint: "https://push.example/1", keys: { p256dh: "p1", auth: "a1" } },
        "Mozilla/5.0"
      )
    ).rejects.toThrow("error DDL");

    // Reintento exitoso
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.$executeRaw.mockResolvedValue(1);
    await upsertAdminPushSubscription(
      "usr-admin",
      { endpoint: "https://push.example/1", keys: { p256dh: "p1", auth: "a1" } },
      null
    );
    await disableAdminPushSubscription("usr-admin", "https://push.example/1");
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
  });

  it("envía notificaciones a administradores, deshabilita 404/410 e ignora otros errores", async () => {
    process.env.WEB_PUSH_PUBLIC_KEY = "pub-key";
    process.env.WEB_PUSH_PRIVATE_KEY = "priv-key";
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);

    // Sin suscripciones activas
    mockPrisma.$queryRaw.mockResolvedValueOnce([]);
    await sendPushToAdmins({
      kind: "LOGIN",
      title: "T",
      body: "B",
      createdAt: "2026-06-01T00:00:00.000Z",
    });
    expect(mockSetVapidDetails).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).not.toHaveBeenCalled();

    // Con suscripciones y distintos resultados (ok, 404, 410, 500, error plano)
    mockPrisma.$queryRaw.mockResolvedValueOnce([
      { subscription_id: BigInt(1), endpoint: "https://push/ok", p256dh: "p1", auth: "a1" },
      { subscription_id: BigInt(2), endpoint: "https://push/404", p256dh: "p2", auth: "a2" },
      { subscription_id: BigInt(3), endpoint: "https://push/410", p256dh: "p3", auth: "a3" },
      { subscription_id: BigInt(4), endpoint: "https://push/500", p256dh: "p4", auth: "a4" },
      { subscription_id: BigInt(5), endpoint: "https://push/null", p256dh: "p5", auth: "a5" },
    ]);
    mockSendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce({ statusCode: 404 })
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 500 })
      .mockRejectedValueOnce(null);
    mockPrisma.$executeRaw.mockResolvedValue(1);

    await sendPushToAdmins({
      kind: "MOVIMIENTO",
      title: "Movimiento",
      body: "Detalle",
      url: "/prestamos",
      createdAt: "2026-06-01T00:00:00.000Z",
    });

    // Solo deshabilita 404 y 410
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
    // VAPID ya estaba configurado
    expect(mockSetVapidDetails).toHaveBeenCalledTimes(1);
  });

  it("notifyAdminOnLogin y notifyAdminOnMovement omiten administradores y notifican otros roles", async () => {
    process.env.WEB_PUSH_PUBLIC_KEY = "pub-key";
    process.env.WEB_PUSH_PRIVATE_KEY = "priv-key";
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
    mockPrisma.$queryRaw.mockResolvedValue([
      { subscription_id: BigInt(10), endpoint: "https://push/admin", p256dh: "p", auth: "a" },
    ]);
    mockSendNotification.mockResolvedValue(undefined);

    await notifyAdminOnLogin({
      usuarioId: "a1",
      username: "admin",
      nombre: "Admin",
      apellido: "Uno",
      rol: "ADMIN",
    });
    await notifyAdminOnMovement(
      {
        usuarioId: "d1",
        username: "dev",
        nombre: "Dev",
        apellido: "Uno",
        rol: "DESARROLLADOR",
      },
      "Alta"
    );
    expect(mockSendNotification).not.toHaveBeenCalled();

    await notifyAdminOnLogin({
      usuarioId: "e1",
      username: "ed",
      nombre: "Ana",
      apellido: "Silva",
      rol: "EDITOR",
    });
    await notifyAdminOnMovement(
      {
        usuarioId: "e1",
        username: "ed",
        nombre: "Ana",
        apellido: "Silva",
        rol: "EDITOR",
      },
      "Préstamo registrado",
      "/movimientos"
    );
    await notifyAdminOnMovement(
      {
        usuarioId: "r1",
        username: "ro",
        nombre: "Luis",
        apellido: "Paz",
        rol: "READ_ONLY",
      },
      "Consulta"
    );

    expect(mockSendNotification).toHaveBeenCalledTimes(3);
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.stringContaining("Silva, Ana (ed) inicio sesión.")
    );
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.stringContaining('"/movimientos"')
    );
    expect(mockSendNotification).toHaveBeenNthCalledWith(
      3,
      expect.anything(),
      expect.stringContaining('"url":"/"')
    );
  });
});

describe("personal-email-notifications.ts", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      SMTP_HOST: "smtp.test.local",
      SMTP_PORT: "587",
      SMTP_USER: "dep@test.local",
      SMTP_PASS: "pass",
      MAIL_FROM: "dep@test.local",
      APP_BASE_URL: "https://deposito.local/",
    };
    delete process.env.NEXTAUTH_URL;
    mockTransportSendMail.mockResolvedValue({ messageId: "ok" });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("retorna NOT_FOUND, NO_EMAIL o INVALID_EMAIL cuando corresponde", async () => {
    const request = new Request("http://localhost:3000/api/test");

    mockGetPersonalNotificationTarget.mockResolvedValueOnce(null);
    expect(
      await sendPersonalMovementEmailNotification({
        request,
        ci: "51067524",
        subject: "Aviso",
        headline: "Titular",
      })
    ).toEqual({ sent: false, reason: "NOT_FOUND" });

    mockGetPersonalNotificationTarget.mockResolvedValueOnce({
      ci: "51067524",
      mailReferencia: null,
      gradoAbreviacion: "Cbo.",
      nombreCompleto: "Silva, Juan",
    });
    expect(
      await sendPersonalMovementEmailNotification({
        request,
        ci: "51067524",
        subject: "Aviso",
        headline: "Titular",
      })
    ).toEqual({ sent: false, reason: "NO_EMAIL" });

    mockGetPersonalNotificationTarget.mockResolvedValueOnce({
      ci: "51067524",
      mailReferencia: "correo-invalido",
      gradoAbreviacion: "Cbo.",
      nombreCompleto: "Silva, Juan",
    });
    expect(
      await sendPersonalMovementEmailNotification({
        request,
        ci: "51067524",
        subject: "Aviso",
        headline: "Titular",
      })
    ).toEqual({ sent: false, reason: "INVALID_EMAIL" });
  });

  it("envía notificación HTML y texto escapando caracteres especiales y manejando campos opcionales", async () => {
    const request = new Request("http://localhost:3000/api/test");

    mockGetPersonalNotificationTarget.mockResolvedValueOnce({
      ci: "51067524",
      mailReferencia: "  Juan.Silva@Example.COM ",
      gradoAbreviacion: "Cbo.",
      nombreCompleto: "Silva & Hijos, Juan",
    });

    const withDetails = await sendPersonalMovementEmailNotification({
      request,
      ci: "51067524",
      subject: "Entrega registrada",
      headline: "Se registró <entrega> \"nueva\" 'ok'",
      detailLines: ["  Parka x1  ", "   ", "Botas & casco"],
      actorLabel: "  Alf. Gómez  ",
      portalPath: "/mi-perfil",
    });

    expect(withDetails).toEqual({ sent: true, email: "juan.silva@example.com" });
    expect(mockTransportSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "juan.silva@example.com",
        subject: "Entrega registrada",
        text: expect.stringContaining("- Parka x1"),
        html: expect.stringContaining("Se registró &lt;entrega&gt; &quot;nueva&quot; &#39;ok&#39;"),
      })
    );

    // Sin detailLines ni actorLabel, portalPath por defecto
    mockGetPersonalNotificationTarget.mockResolvedValueOnce({
      ci: "51067524",
      mailReferencia: "juan@example.com",
      gradoAbreviacion: "Cbo.",
      nombreCompleto: "Silva, Juan",
    });

    const minimal = await sendPersonalMovementEmailNotification({
      request,
      ci: "51067524",
      subject: "Aviso simple",
      headline: "Devolución confirmada",
      actorLabel: "   ",
    });

    expect(minimal).toEqual({ sent: true, email: "juan@example.com" });
    const lastCall = mockTransportSendMail.mock.calls[1][0] as { text: string; html: string };
    expect(lastCall.text).not.toContain("Detalle:");
    expect(lastCall.text).not.toContain("Registrado por:");
    expect(lastCall.html).toContain('href="https://deposito.local/"');
  });
});
