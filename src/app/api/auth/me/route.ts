import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        usuarioId: session.user.id,
        username: session.user.name,
        rol: session.user.role,
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la sesión." }, { status: 503 });
  }
}
