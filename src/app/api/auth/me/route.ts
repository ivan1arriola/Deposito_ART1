import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        usuarioId: user.usuarioId,
        username: user.username,
        rol: user.rol,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la base de datos." }, { status: 503 });
  }
}
