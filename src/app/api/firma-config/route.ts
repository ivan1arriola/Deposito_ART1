import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getFirmaConfig, updateFirmaConfig } from "@/lib/firma-config";

type FirmaConfigPayload = {
  encargadoRango: string;
  encargadoNombre: string;
  oficialRango: string;
  oficialNombre: string;
};

function isValidPayload(body: unknown): body is FirmaConfigPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.encargadoRango === "string" &&
    candidate.encargadoRango.trim() !== "" &&
    typeof candidate.encargadoNombre === "string" &&
    candidate.encargadoNombre.trim() !== "" &&
    typeof candidate.oficialRango === "string" &&
    candidate.oficialRango.trim() !== "" &&
    typeof candidate.oficialNombre === "string" &&
    candidate.oficialNombre.trim() !== ""
  );
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  try {
    const config = await getFirmaConfig();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "No se pudo leer la configuracion de firmas." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await authorizeRequest(request, "manage_users");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Payload invalido. Todos los campos de rango y nombre son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const previous = await getFirmaConfig();
    const updated = await updateFirmaConfig({
      encargadoRango: body.encargadoRango.trim(),
      encargadoNombre: body.encargadoNombre.trim(),
      oficialRango: body.oficialRango.trim(),
      oficialNombre: body.oficialNombre.trim(),
    });

    await logAudit({
      usuarioId: auth.user.usuarioId,
      accion: "UPDATE",
      entidad: "FIRMAS_CONFIG",
      entidadId: "1",
      detalle: {
        before: previous,
        after: updated,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "No se pudo guardar la configuracion de firmas." }, { status: 500 });
  }
}

