import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { getFirmaConfig, updateFirmaConfig } from "@/lib/firma-config";

type FirmaConfigPayload = {
  encargadoTexto: string;
  oficialTexto: string;
};

function isValidPayload(body: unknown): body is FirmaConfigPayload {
  if (!body || typeof body !== "object") return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.encargadoTexto === "string" &&
    candidate.encargadoTexto.trim() !== "" &&
    typeof candidate.oficialTexto === "string" &&
    candidate.oficialTexto.trim() !== ""
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
      { error: "Payload invalido. 'encargadoTexto' y 'oficialTexto' son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const previous = await getFirmaConfig();
    const updated = await updateFirmaConfig({
      encargadoTexto: body.encargadoTexto.trim(),
      oficialTexto: body.oficialTexto.trim(),
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

