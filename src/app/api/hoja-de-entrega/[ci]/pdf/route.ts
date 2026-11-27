import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { isValidUruguayanCi } from "@/lib/ci";
import { formatHojaEntregaDisplayDate, getHojaEntregaData } from "@/lib/hoja-entrega-data";
import { hasPermission } from "@/lib/permissions";
import { buildSingleHojaEntregaFileName } from "@/lib/server/pdf-filename";
import { renderHojasEntregaPdf } from "@/lib/server/render-hoja-entrega-react-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const { ci } = await context.params;
  const { searchParams } = new URL(request.url);
  const documentParam = (searchParams.get("document") || "").trim().toLowerCase();
  const isGuideOnly = documentParam === "guia" || documentParam === "guia-responsabilidad";
  const ciValue = decodeURIComponent(ci).trim();
  if (!ciValue) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }
  if (!isValidUruguayanCi(ciValue)) {
    return NextResponse.json({ error: "CI invalida." }, { status: 400 });
  }

  const user = await getUserFromRequest();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (user.accountType === "PERSONAL") {
    if (!user.personalCi || user.personalCi !== ciValue) {
      return NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 });
    }
  } else if (!hasPermission(user.rol, "read_data", user.accountType)) {
    return NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 });
  }

  const hoja = await getHojaEntregaData(ciValue);
  if (!hoja) {
    return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });
  }

  const pdfBytes = await renderHojasEntregaPdf([hoja], formatHojaEntregaDisplayDate(new Date()), {
    includePageNumbers: true,
    pageNumberLabel: isGuideOnly ? "Guía" : "Hoja",
    includeSheetPage: !isGuideOnly,
    includeUsageGuidePage: isGuideOnly,
  });

  const baseFileName = buildSingleHojaEntregaFileName({
    ci: hoja.persona.ci,
    grado: hoja.persona.rangoAbreviacion,
    apellido: hoja.persona.apellido1,
    nombre: hoja.persona.nombre1,
  });
  const fileName = isGuideOnly
    ? baseFileName.includes("-hoja-entrega.pdf")
      ? baseFileName.replace("-hoja-entrega.pdf", "-guia-responsabilidad.pdf")
      : `${baseFileName.replace(/\.pdf$/i, "")}-guia-responsabilidad.pdf`
    : baseFileName;
  const contentDisposition = `inline; filename="${fileName}"`;
  const pdfArrayBuffer = Uint8Array.from(pdfBytes).buffer;
  const pdfBlob = new Blob([pdfArrayBuffer], { type: "application/pdf" });

  return new NextResponse(pdfBlob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition,
      "X-Hoja-Entrega-Pdf-Layout": "firmas-v2",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    },
  });
}
