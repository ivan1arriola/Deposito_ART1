import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/auth";
import { getHojaMatrixData } from "@/lib/hoja-matrix";

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const bateria = searchParams.get("bateria");
  const data = await getHojaMatrixData({ bateria });

  return NextResponse.json(data);
}
