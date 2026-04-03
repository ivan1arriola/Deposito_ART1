import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { formatHojaEntregaDisplayDate, getAllHojasEntregaData } from "@/lib/hoja-entrega-data";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
import { buildUnidadHojasEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

    const hojas = await getAllHojasEntregaData();
    if (hojas.length === 0) {
      return NextResponse.json({ error: "No hay personal para generar hojas de entrega." }, { status: 404 });
    }

    const fechaImpresion = formatHojaEntregaDisplayDate(new Date());
    const pdfBytes = await renderHojasEntregaPdf(hojas, fechaImpresion, {
      includePageNumbers: true,
      pageNumberLabel: "Hoja",
    });
    const fileName = buildUnidadHojasEntregaFileName();
    const requesterLabel = [usuario.rango.abreviacion, usuario.nombre, usuario.apellido].filter(Boolean).join(" ").trim();

    await sendMail({
      to: recipient,
      subject: `Hojas de entrega unidad - ${fechaImpresion}`,
      text:
        `Se adjunta el PDF consolidado de hojas de entrega de la unidad.\n\n` +
        `Total de hojas: ${hojas.length}\n` +
        `Fecha de impresion: ${fechaImpresion}\n` +
        `Usuario solicitante: ${requesterLabel || usuario.username}\n` +
        `Archivo adjunto: ${fileName}\n`,
      html:
        "<p>Se adjunta el PDF consolidado de hojas de entrega de la unidad.</p>" +
        `<p><strong>Total de hojas:</strong> ${hojas.length}<br/>` +
        `<strong>Fecha de impresion:</strong> ${fechaImpresion}<br/>` +
        `<strong>Usuario solicitante:</strong> ${requesterLabel || usuario.username}<br/>` +
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
      usuarioId: usuario.usuarioId,
      accion: "HOJAS_ENTREGA_PDF_EMAIL_SENT",
      entidad: "HOJA_ENTREGA",
      detalle: {
        to: recipient,
        fileName,
        hojas: hojas.length,
        fechaImpresion,
      },
    });

    return NextResponse.json({
      ok: true,
      to: recipient,
      hojas: hojas.length,
      fileName,
      message: "PDF enviado por correo correctamente.",
    });
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
