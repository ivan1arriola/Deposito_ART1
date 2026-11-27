import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const externas = await prisma.personaExterna.findMany({
      select: { unidadDestino: true },
      distinct: ["unidadDestino"],
    });
    
    // Some are formatted like "Interno a la Unidad - Batería Comando", let's extract the detail
    // to suggest it again cleanly. Or just return them as they are and filter on frontend.
    const rawEntities = externas.map((e) => e.unidadDestino);
    
    const parsedEntities = new Set<string>();
    for (const e of rawEntities) {
      if (!e || e === "-") continue;
      if (e.startsWith("Interno a la Unidad - ")) {
        parsedEntities.add(e.replace("Interno a la Unidad - ", "").trim());
      } else if (e.startsWith("Externo a la Unidad - ")) {
        parsedEntities.add(e.replace("Externo a la Unidad - ", "").trim());
      } else {
        parsedEntities.add(e.trim());
      }
    }

    return NextResponse.json(Array.from(parsedEntities).sort());
  } catch (_error) {
    return NextResponse.json({ error: "Error al cargar entidades" }, { status: 500 });
  }
}
