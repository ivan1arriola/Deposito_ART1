import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPrismaDatabaseUnavailable, withPrismaReadRetry } from "@/lib/prisma-errors";
import { cancelHojasEntregaEmailJob, getHojasEntregaEmailJob } from "@/lib/server/hojas-entrega-email-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const { jobId } = await context.params;
    const usuario = await withPrismaReadRetry(() =>
      prisma.usuario.findUnique({
        where: { usuarioId: auth.user.usuarioId },
        select: {
          usuarioId: true,
          activo: true,
        },
      }),
    );

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const job = getHojasEntregaEmailJob(jobId, usuario.usuarioId);
    if (!job) {
      return NextResponse.json({ error: "No se encontro el seguimiento del envio solicitado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job }, { status: 200 });
  } catch (error: unknown) {
    if (isPrismaDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "No se pudo consultar el estado del envio." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const { jobId } = await context.params;
    const usuario = await withPrismaReadRetry(() =>
      prisma.usuario.findUnique({
        where: { usuarioId: auth.user.usuarioId },
        select: {
          usuarioId: true,
          activo: true,
        },
      }),
    );

    if (!usuario || !usuario.activo) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    const cancelledJob = cancelHojasEntregaEmailJob(jobId, usuario.usuarioId);
    if (!cancelledJob) {
      return NextResponse.json({ error: "No se encontro el seguimiento del envio solicitado." }, { status: 404 });
    }

    if (cancelledJob.status !== "cancelled") {
      return NextResponse.json(
        {
          error: "El envio ya finalizo y no puede cancelarse.",
          job: cancelledJob,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        cancelled: true,
        message: "Envio cancelado por el usuario.",
        job: cancelledJob,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (isPrismaDatabaseUnavailable(error)) {
      return NextResponse.json(
        { error: "Base de datos no disponible temporalmente. Intenta nuevamente." },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: "No se pudo cancelar el envio." }, { status: 500 });
  }
}
