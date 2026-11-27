import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeRequest } from "@/lib/auth";

type DbRow = {
  db: string;
  db_user: string;
};

function readConfiguredHost() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    return url.hostname || null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  try {
    const rows = await prisma.$queryRawUnsafe<DbRow[]>(
      "select current_database() as db, current_user as db_user;"
    );
    const row = rows[0] ?? null;

    return NextResponse.json({
      ok: true,
      database: row?.db ?? null,
      dbUser: row?.db_user ?? null,
      host: readConfiguredHost(),
    });
  } catch {
    return NextResponse.json({ error: "No se pudo leer la base de datos." }, { status: 503 });
  }
}
