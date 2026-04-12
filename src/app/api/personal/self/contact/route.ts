import { NextResponse } from "next/server";
import { getUserFromRequest, invalidateAuthUserCache } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isValidEmailAddress, normalizeEmailAddress } from "@/lib/email-address";
import { sendPersonalMovementEmailNotification } from "@/lib/personal-email-notifications";
import { getPersonalSelfContact, updatePersonalSelfContact } from "@/lib/personal-auth";
import { normalizeOptionalUruguayanMobileNumber } from "@/lib/uruguayan-phone";

type UpdateContactPayload = {
  telefonoContacto?: unknown;
  mailReferencia?: unknown;
};

export async function GET() {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "PERSONAL" || !user.personalCi) {
    return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
  }

  const contact = await getPersonalSelfContact(user.personalCi);
  if (!contact) {
    return NextResponse.json({ error: "Cuenta de personal no encontrada." }, { status: 404 });
  }

  return NextResponse.json(contact);
}

export async function PUT(request: Request) {
  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (user.accountType !== "PERSONAL" || !user.personalCi) {
    return NextResponse.json({ error: "No autorizado para esta accion." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as UpdateContactPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Payload invalido." }, { status: 400 });
  }

  const hasTelefonoContacto = Object.prototype.hasOwnProperty.call(body, "telefonoContacto");
  const hasMailReferencia = Object.prototype.hasOwnProperty.call(body, "mailReferencia");
  if (!hasTelefonoContacto && !hasMailReferencia) {
    return NextResponse.json({ error: "No hay campos para actualizar." }, { status: 400 });
  }

  let nextTelefonoContacto: string | null | undefined;
  if (hasTelefonoContacto) {
    const rawTelefonoContacto = body.telefonoContacto;
    if (rawTelefonoContacto !== null && typeof rawTelefonoContacto !== "string") {
      return NextResponse.json({ error: "telefonoContacto debe ser texto o null." }, { status: 400 });
    }

    if (rawTelefonoContacto === null || rawTelefonoContacto.trim() === "") {
      nextTelefonoContacto = null;
    } else {
      const normalized = normalizeOptionalUruguayanMobileNumber(rawTelefonoContacto);
      if (!normalized) {
        return NextResponse.json({ error: "telefonoContacto debe ser un celular uruguayo valido." }, { status: 400 });
      }
      nextTelefonoContacto = normalized;
    }
  }

  let nextMailReferencia: string | null | undefined;
  if (hasMailReferencia) {
    const rawMailReferencia = body.mailReferencia;
    if (rawMailReferencia !== null && typeof rawMailReferencia !== "string") {
      return NextResponse.json({ error: "mailReferencia debe ser texto o null." }, { status: 400 });
    }

    if (rawMailReferencia === null || rawMailReferencia.trim() === "") {
      nextMailReferencia = null;
    } else {
      const normalized = normalizeEmailAddress(rawMailReferencia);
      if (!isValidEmailAddress(normalized)) {
        return NextResponse.json({ error: "Mail de referencia invalido." }, { status: 400 });
      }
      nextMailReferencia = normalized;
    }
  }

  const updated = await updatePersonalSelfContact(user.personalCi, {
    ...(hasTelefonoContacto ? { telefonoContacto: nextTelefonoContacto ?? null } : {}),
    ...(hasMailReferencia ? { mailReferencia: nextMailReferencia ?? null } : {}),
  });

  if (!updated) {
    return NextResponse.json({ error: "Cuenta de personal no encontrada." }, { status: 404 });
  }

  await logAudit({
    usuarioId: null,
    accion: "UPDATE",
    entidad: "PERSONAL_CONTACTO",
    entidadId: user.personalCi,
    detalle: {
      accountType: "PERSONAL",
      ci: user.personalCi,
      updatedFields: [
        ...(hasTelefonoContacto ? ["telefonoContacto"] : []),
        ...(hasMailReferencia ? ["mailReferencia"] : []),
      ],
      telefonoContacto: updated.telefonoContacto,
      mailReferencia: updated.mailReferencia,
    },
  });

  const actorLabel = `${user.grado} ${user.apellido}, ${user.nombre}`.replace(/\s+/g, " ").trim();
  await Promise.allSettled([
    sendPersonalMovementEmailNotification({
      request,
      ci: user.personalCi,
      subject: "Notificacion de datos personales - Deposito ART1",
      headline: "Se actualizaron datos de contacto de tu ficha personal.",
      detailLines: [
        hasTelefonoContacto ? `Celular: ${updated.telefonoContacto ?? "sin registrar"}` : "",
        hasMailReferencia ? `Correo: ${updated.mailReferencia ?? "sin registrar"}` : "",
      ],
      actorLabel,
      portalPath: "/",
    }),
  ]);

  invalidateAuthUserCache(user.usuarioId);
  return NextResponse.json(updated);
}
