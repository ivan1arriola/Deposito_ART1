import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Endpoint obsoleto. Usa NextAuth con signIn('credentials')." },
    { status: 410 },
  );
}
