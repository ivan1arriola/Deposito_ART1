import { after, NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import {
  formatHojaEntregaDisplayDate,
  getAllHojasEntregaData,
  getMovimientosFueraHojaData,
} from "@/lib/hoja-entrega-data";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { hasConstraintName, isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
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
import { renderMovimientosFueraHojaPdf } from "@/lib/server/render-movimientos-fuera-hoja-react-pdf";
import type { HojasEntregaEmailJobMetrics } from "@/lib/hojas-entrega-email-job";
import { ParseSpeeds, PDFDocument } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function throwIfHojasEntregaEmailJobCancelled(jobId: string) {
  if (await isHojasEntregaEmailJobCancelled(jobId)) {
    throw new Error("Envío cancelado por el usuario.");
  }
}

async function runHojasEntregaEmailJob(input: {
  jobId: string;
  recipient: string;
  requesterLabel: string;
  username: string;
  usuarioId: string;
}) {
  const startedAtMs = Date.now();
  const metrics: HojasEntregaEmailJobMetrics = {
    loadingMs: null,
    renderingMs: null,
    sendingMs: null,
    totalMs: null,
  };

  const reportProgress = (payload: Parameters<typeof setHojasEntregaEmailJobProgress>[1]) => {
    void setHojasEntregaEmailJobProgress(input.jobId, {
      ...payload,
      metrics: { ...metrics },
    }).catch(() => {});
  };

  try {
    await throwIfHojasEntregaEmailJobCancelled(input.jobId);
    reportProgress({
      step: "loading-data",
      progress: 18,
      message: "Consultando personal, tallas y movimientos para generar las hojas de entrega...",
      to: input.recipient,
    });

    const loadingStartedAtMs = Date.now();
    const [hojas, movimientosFueraHoja] = await Promise.all([getAllHojasEntregaData(), getMovimientosFueraHojaData()]);
    metrics.loadingMs = Math.max(0, Date.now() - loadingStartedAtMs);
    if (hojas.length === 0) {
      throw new Error("No hay personal para generar hojas de entrega.");
    }

    await throwIfHojasEntregaEmailJobCancelled(input.jobId);
    const fechaImpresion = formatHojaEntregaDisplayDate(new Date());
    reportProgress({
      step: "rendering-pdf",
      progress: 48,
      message: `Generando PDF A4 consolidado de ${hojas.length} hoja(s) con anexo de movimientos fuera de hoja...`,
      to: input.recipient,
      hojas: hojas.length,
    });

    const renderingStartedAtMs = Date.now();
    const [hojasPdfBytes, fueraHojaPdfBytes] = await Promise.all([
      renderHojasEntregaPdf(hojas, fechaImpresion, {
        includePageNumbers: true,
        pageNumberLabel: "Hoja",
        includeSheetPage: true,
        includeUsageGuidePage: false,
        performanceMode: "fast-batch",
        fastBatchInitialProfileId: "tight",
      }),
      renderMovimientosFueraHojaPdf(movimientosFueraHoja, fechaImpresion, {
        pageNumberLabel: "Movimientos fuera de hoja",
      }),
    ]);

    const mergedPdf = await PDFDocument.create();
    const hojasPdf = await PDFDocument.load(hojasPdfBytes, { parseSpeed: ParseSpeeds.Fastest });
    const fueraHojaPdf = await PDFDocument.load(fueraHojaPdfBytes, { parseSpeed: ParseSpeeds.Fastest });

    const hojasPages = await mergedPdf.copyPages(hojasPdf, hojasPdf.getPageIndices());
    for (const page of hojasPages) {
      mergedPdf.addPage(page);
    }

    const fueraHojaPages = await mergedPdf.copyPages(fueraHojaPdf, fueraHojaPdf.getPageIndices());
    for (const page of fueraHojaPages) {
      mergedPdf.addPage(page);
    }

    const pdfBytes = await mergedPdf.save();
    metrics.renderingMs = Math.max(0, Date.now() - renderingStartedAtMs);

    await throwIfHojasEntregaEmailJobCancelled(input.jobId);
    const fileName = buildUnidadHojasEntregaFileName();
    reportProgress({
      step: "preparing-email",
      progress: 76,
      message: `Adjuntando ${fileName} al mensaje de correo...`,
      to: input.recipient,
      hojas: hojas.length,
      fileName,
    });

    reportProgress({
      step: "sending-email",
      progress: 90,
      message: `Enviando correo a ${input.recipient} y confirmando entrega al servidor SMTP...`,
      to: input.recipient,
      hojas: hojas.length,
      fileName,
    });

    await throwIfHojasEntregaEmailJobCancelled(input.jobId);
    const sendingStartedAtMs = Date.now();
    await sendMail({
      to: input.recipient,
      subject: `Hojas de entrega unidad - ${fechaImpresion}`,
      text:
        `Se adjunta el PDF consolidado de hojas de entrega de la unidad.\n\n` +
        `Total de hojas: ${hojas.length}\n` +
        `Fecha de impresión: ${fechaImpresion}\n` +
        `Usuario solicitante: ${input.requesterLabel || input.username}\n` +
        `Archivo adjunto: ${fileName}\n`,
      html:
        "<p>Se adjunta el PDF consolidado de hojas de entrega de la unidad.</p>" +
        `<p><strong>Total de hojas:</strong> ${hojas.length}<br/>` +
        `<strong>Fecha de impresión:</strong> ${fechaImpresion}<br/>` +
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
    metrics.sendingMs = Math.max(0, Date.now() - sendingStartedAtMs);
    metrics.totalMs = Math.max(0, Date.now() - startedAtMs);

    await logAudit({
      usuarioId: input.usuarioId,
      accion: "HOJAS_ENTREGA_PDF_EMAIL_SENT",
      entidad: "HOJA_ENTREGA",
      detalle: {
        to: input.recipient,
        fileName,
        hojas: hojas.length,
        fechaImpresion,
        metrics,
      },
    });

    await completeHojasEntregaEmailJob(input.jobId, {
      to: input.recipient,
      fileName,
      hojas: hojas.length,
      metrics,
      message: `PDF enviado por correo a ${input.recipient}.`,
    });

    console.info("[hojas-entrega-email-job] completed", {
      jobId: input.jobId,
      to: input.recipient,
      hojas: hojas.length,
      metrics,
    });
  } catch (error: unknown) {
    if (await isHojasEntregaEmailJobCancelled(input.jobId)) {
      return;
    }
    const message = error instanceof Error ? error.message : "No se pudo enviar el PDF por correo.";
    metrics.totalMs = Math.max(0, Date.now() - startedAtMs);
    await failHojasEntregaEmailJob(input.jobId, message, { metrics });
    console.log("[hojas-entrega-email-job] failed", {
      jobId: input.jobId,
      to: input.recipient,
      metrics,
      message,
    });
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

    const existingJob = await findActiveHojasEntregaEmailJob(usuario.usuarioId);
    if (existingJob) {
      return NextResponse.json(
        {
          error: "Ya hay un envío de hojas de entrega en curso para este usuario.",
          job: existingJob,
        },
        { status: 409 },
      );
    }

    const requesterLabel = [usuario.rango.abreviacion, usuario.nombre, usuario.apellido].filter(Boolean).join(" ").trim();
    const job = await createHojasEntregaEmailJob({
      userId: usuario.usuarioId,
      to: recipient,
      message: "Solicitud aceptada. Iniciando envío del PDF en segundo plano...",
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
      message: "Envío iniciado en segundo plano.",
      job,
    }, { status: 202 });
  } catch (error: unknown) {
    if (hasConstraintName(error, "uq_hojas_entrega_email_job_user_active")) {
      let existingJob = null;
      try {
        existingJob = await findActiveHojasEntregaEmailJob(auth.user.usuarioId);
      } catch {
        existingJob = null;
      }
      return NextResponse.json(
        {
          error: "Ya hay un envío de hojas de entrega en curso para este usuario.",
          job: existingJob,
        },
        { status: 409 },
      );
    }

    if (isPrismaDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo enviar el PDF por correo.";
    if (message.startsWith("Configuración SMTP incompleta")) {
      return NextResponse.json(
        { error: "El servicio de correo no esta configurado. Contacta al administrador." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message || "No se pudo enviar el PDF por correo." }, { status: 500 });
  }
}
