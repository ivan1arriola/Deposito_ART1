import { after, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { formatHojaEntregaDisplayDate, getAllHojasEntregaData } from "@/lib/hoja-entrega-data";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
import {
  completeHojasEntregaEmailJob,
  createHojasEntregaEmailJob,
  failHojasEntregaEmailJob,
  findActiveHojasEntregaEmailJob,
  isHojasEntregaEmailJobCancelled,
  setHojasEntregaEmailJobProgress,
} from "@/lib/server/hojas-entrega-email-jobs";
import { buildUnidadHojasEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function throwIfHojasEntregaEmailJobCancelled(jobId: string) {
  if (isHojasEntregaEmailJobCancelled(jobId)) {
    throw new Error("Envio cancelado por el usuario.");
  }
}

async function runHojasEntregaEmailJob(input: {
  jobId: string;
  recipient: string;
  requesterLabel: string;
  username: string;
  usuarioId: string;
}) {
  try {
    throwIfHojasEntregaEmailJobCancelled(input.jobId);
    setHojasEntregaEmailJobProgress(input.jobId, {
      step: "loading-data",
      progress: 18,
      message: "Consultando personal, tallas y movimientos para generar las hojas de entrega...",
      to: input.recipient,
    });

    const hojas = await getAllHojasEntregaData();
    if (hojas.length === 0) {
      throw new Error("No hay personal para generar hojas de entrega.");
    }

    throwIfHojasEntregaEmailJobCancelled(input.jobId);
    const fechaImpresion = formatHojaEntregaDisplayDate(new Date());
    setHojasEntregaEmailJobProgress(input.jobId, {
      step: "rendering-pdf",
      progress: 48,
      message: `Generando PDF A4 consolidado de ${hojas.length} hoja(s)...`,
      to: input.recipient,
      hojas: hojas.length,
    });

    const pdfBytes = await renderHojasEntregaPdf(hojas, fechaImpresion, {
      includePageNumbers: true,
      pageNumberLabel: "Hoja",
    });

    throwIfHojasEntregaEmailJobCancelled(input.jobId);
    const fileName = buildUnidadHojasEntregaFileName();
    setHojasEntregaEmailJobProgress(input.jobId, {
      step: "preparing-email",
      progress: 76,
      message: `Adjuntando ${fileName} al mensaje de correo...`,
      to: input.recipient,
      hojas: hojas.length,
      fileName,
    });

    setHojasEntregaEmailJobProgress(input.jobId, {
      step: "sending-email",
      progress: 90,
      message: `Enviando correo a ${input.recipient} y confirmando entrega al servidor SMTP...`,
      to: input.recipient,
      hojas: hojas.length,
      fileName,
    });

    throwIfHojasEntregaEmailJobCancelled(input.jobId);
    await sendMail({
      to: input.recipient,
      subject: `Hojas de entrega unidad - ${fechaImpresion}`,
      text:
        `Se adjunta el PDF consolidado de hojas de entrega de la unidad.\n\n` +
        `Total de hojas: ${hojas.length}\n` +
        `Fecha de impresion: ${fechaImpresion}\n` +
        `Usuario solicitante: ${input.requesterLabel || input.username}\n` +
        `Archivo adjunto: ${fileName}\n`,
      html:
        "<p>Se adjunta el PDF consolidado de hojas de entrega de la unidad.</p>" +
        `<p><strong>Total de hojas:</strong> ${hojas.length}<br/>` +
        `<strong>Fecha de impresion:</strong> ${fechaImpresion}<br/>` +
        `<strong>Usuario solicitante:</strong> ${input.requesterLabel || input.username}<br/>` +
        `<strong>Archivo adjunto:</strong> ${fileName}</p>`,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdfBytes),
          contentType: "application/pdf",
        },
      ],
    });

    await logAudit({
      usuarioId: input.usuarioId,
      accion: "HOJAS_ENTREGA_PDF_EMAIL_SENT",
      entidad: "HOJA_ENTREGA",
      detalle: {
        to: input.recipient,
        fileName,
        hojas: hojas.length,
        fechaImpresion,
      },
    });

    completeHojasEntregaEmailJob(input.jobId, {
      to: input.recipient,
      fileName,
      hojas: hojas.length,
      message: `PDF enviado por correo a ${input.recipient}.`,
    });
  } catch (error: unknown) {
    if (isHojasEntregaEmailJobCancelled(input.jobId)) {
      return;
    }
    const message = error instanceof Error ? error.message : "No se pudo enviar el PDF por correo.";
    failHojasEntregaEmailJob(input.jobId, message);
  }
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const usuario = await withPrismaReadRetry(() =>
      prisma.usuario.findUnique({
        where: { usuarioId: auth.user.usuarioId },
        select: {
          usuarioId: true,
          username: true,
          nombre: true,
          apellido: true,
          activo: true,
          mailReferencia: true,
          rango: {
            select: {
              abreviacion: true,
            },
          },
        },
      }),
    );

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (!usuario.mailReferencia) {
      return NextResponse.json(
        { error: "Tu usuario no tiene correo de referencia configurado." },
        { status: 400 },
      );
    }

    const recipient = normalizeEmailAddress(usuario.mailReferencia);
    if (!isValidEmailAddress(recipient)) {
      return NextResponse.json(
        { error: "El correo de referencia del usuario no es valido." },
        { status: 400 },
      );
    }

    const existingJob = findActiveHojasEntregaEmailJob(usuario.usuarioId);
    if (existingJob) {
      return NextResponse.json(
        {
          error: "Ya hay un envio de hojas de entrega en curso para este usuario.",
          job: existingJob,
        },
        { status: 409 },
      );
    }

    const requesterLabel = [usuario.rango.abreviacion, usuario.nombre, usuario.apellido].filter(Boolean).join(" ").trim();
    const job = createHojasEntregaEmailJob({
      userId: usuario.usuarioId,
      to: recipient,
      message: "Solicitud aceptada. Iniciando envio del PDF en segundo plano...",
    });

    after(async () => {
      await runHojasEntregaEmailJob({
        jobId: job.jobId,
        recipient,
        requesterLabel,
        username: usuario.username,
        usuarioId: usuario.usuarioId,
      });
    });

    return NextResponse.json({
      ok: true,
      accepted: true,
      message: "Envio iniciado en segundo plano.",
      job,
    }, { status: 202 });
  } catch (error: unknown) {
    if (isPrismaDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo enviar el PDF por correo.";
    if (message.startsWith("Configuracion SMTP incompleta")) {
      return NextResponse.json(
        { error: "El servicio de correo no esta configurado. Contacta al administrador." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message || "No se pudo enviar el PDF por correo." }, { status: 500 });
  }
}
