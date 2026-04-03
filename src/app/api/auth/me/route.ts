import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromRequest();

    if (!user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        usuarioId: user.usuarioId,
        rangoId: user.rangoId,
        grado: user.grado,
        nombre: user.nombre,
        apellido: user.apellido,
        username: user.username,
        mailReferencia: user.mailReferencia,
        rol: user.rol,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la sesión." }, { status: 503 });
  }
}
