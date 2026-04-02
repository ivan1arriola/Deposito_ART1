import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatDateOnlyForDisplay, formatDateTimeForDisplay } from "@/lib/date-helpers";
import { normalizeOutputText } from "@/lib/spanish-text";

interface MatrixRow {
  item: string;
  entrega: number[];
  entregaTotal: number;
  devolucion: number[];
  devolucionTotal: number;
}

interface FichaDataRequest {
  persona: {
    ci: string;
    apellido1: string;
    apellido2: string | null;
    nombre1: string;
    nombre2: string | null;
    fechaIngreso: string | null;
    gradoPersonal: string;
    bateria: string | null;
    tallas: {
      PARKA: string;
      CAMISACO: string;
      PANTALON: string;
      KEPI: string;
      CALZADO: string;
    };
  };
  entregas: Array<{ fecha: string | null }>;
  devoluciones: Array<{ fecha: string | null }>;
  matrix: MatrixRow[];
  firmas: {
    encargadoTexto: string;
    encargadoRango: string;
    encargadoNombre: string;
    oficialTexto: string;
    oficialRango: string;
    oficialNombre: string;
  };
  observaciones: Array<{ fecha: string; texto: string }>;
}

// Constantes de diseño (en puntos: 72pt = 1 inch / 25.4mm = 2.834645669 pt/mm)
const MM_TO_PT = 2.834645669;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;

const MARGINS = {
  top: 12 * MM_TO_PT,
  right: 12 * MM_TO_PT,
  bottom: 12 * MM_TO_PT,
  left: 12 * MM_TO_PT,
};

// Función para sanitizar texto para WinAnsi encoding
function sanitizeForPDF(text: string | null | undefined): string {
  return normalizeOutputText(text);
}

function formatInstitutionalPrintDate(date = new Date()) {
  const formattedDate = new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `Montevideo, ${formattedDate}`;
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as FichaDataRequest;
    const fechaImpresion = sanitizeForPDF(formatDateTimeForDisplay(new Date()));
    const institutionalPrintDate = sanitizeForPDF(formatInstitutionalPrintDate(new Date()));

    if (!body.persona?.ci) {
      return NextResponse.json({ error: "CI is required" }, { status: 400 });
    }

    // Crear documento PDF con pdflib
    const pdfDoc = await PDFDocument.create();
    
    // Registrar fontkit para soporte UTF-8 con fuentes estándar
    pdfDoc.registerFontkit(fontkit);
    const headerBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

    const pageWidth = page.getWidth() - MARGINS.left - MARGINS.right;
    let currentY = page.getHeight() - MARGINS.top;

    // ===== TOPBAR =====
    const topbarHeight = 28 * MM_TO_PT;
    const topbarX = MARGINS.left;
    const topbarY = currentY - topbarHeight;

    // Bordes del topbar
    page.drawRectangle({
      x: topbarX,
      y: topbarY,
      width: pageWidth,
      height: topbarHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const topbarPaddingX = 4 * MM_TO_PT;
    const groupLabel = 'Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1';
    const appLabel = "Deposito General";
    const documentLabel = "HOJA DE ENTREGA";

    const groupSize = 9;
    const titleSize = 20;
    const documentSize = 11;
    const dateSize = 9;

    const groupY = topbarY + topbarHeight - 5 * MM_TO_PT;
    const titleY = topbarY + topbarHeight - 13.2 * MM_TO_PT;
    const documentY = topbarY + topbarHeight - 19.2 * MM_TO_PT;

    page.drawText(groupLabel, {
      x: topbarX + topbarPaddingX,
      y: groupY,
      size: groupSize,
      font: headerBoldFont,
      color: rgb(0, 0, 0),
      maxWidth: pageWidth * 0.62,
    });

    const dateWidth = headerBoldFont.widthOfTextAtSize(institutionalPrintDate, dateSize);
    page.drawText(institutionalPrintDate, {
      x: topbarX + pageWidth - topbarPaddingX - dateWidth,
      y: groupY,
      size: dateSize,
      font: headerBoldFont,
      color: rgb(0, 0, 0),
    });

    const titleWidth = headerBoldFont.widthOfTextAtSize(appLabel, titleSize);
    page.drawText(appLabel, {
      x: topbarX + (pageWidth - titleWidth) / 2,
      y: titleY,
      size: titleSize,
      font: headerBoldFont,
      color: rgb(0, 0, 0),
    });

    const documentWidth = headerBoldFont.widthOfTextAtSize(documentLabel, documentSize);
    page.drawText(documentLabel, {
      x: topbarX + (pageWidth - documentWidth) / 2,
      y: documentY,
      size: documentSize,
      font: headerBoldFont,
      color: rgb(0, 0, 0),
    });

    currentY = topbarY - 4 * MM_TO_PT;

    // ===== GRID: IDENTIFICACIÓN + TALLES =====
    const gridItemHeight = 50 * MM_TO_PT;
    const col1Width = (pageWidth * 1.2) / 2.2;
    const col2Width = (pageWidth * 1) / 2.2;
    const gapWidth = 4 * MM_TO_PT;

    // BOX 1: Identificación del personal
    const box1X = MARGINS.left;
    const box1Y = currentY - gridItemHeight;

    page.drawRectangle({
      x: box1X,
      y: box1Y,
      width: col1Width,
      height: gridItemHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Identificación del personal", {
      x: box1X + 4 * MM_TO_PT,
      y: box1Y + gridItemHeight - 8 * MM_TO_PT,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Línea de separación
    const lineY = box1Y + gridItemHeight - 8 * MM_TO_PT - 5;
    page.drawLine({
      start: { x: box1X + 4 * MM_TO_PT, y: lineY },
      end: { x: box1X + col1Width - 4 * MM_TO_PT, y: lineY },
      color: rgb(0.2, 0.2, 0.2),
      thickness: 0.5,
    });

    // Key-value pairs
    const kvStartY = box1Y + gridItemHeight - 12 * MM_TO_PT;
    const kvLineHeight = 5.5 * MM_TO_PT;
    const apellidos = sanitizeForPDF(
      [body.persona.apellido1, body.persona.apellido2]
        .filter(Boolean)
        .join(" ")
    );
    const nombres = sanitizeForPDF(
      [body.persona.nombre1, body.persona.nombre2]
        .filter(Boolean)
        .join(" ")
    );

    const kvPairs = [
      ["Grado", sanitizeForPDF(body.persona.gradoPersonal) || "N/A"],
      ["Apellidos", apellidos],
      ["Nombres", nombres],
      ["C.I.", sanitizeForPDF(body.persona.ci)],
      ["Batería / Subunidad", sanitizeForPDF(body.persona.bateria) || "Pendiente"],
      ["Fecha de ingreso", sanitizeForPDF(formatDateOnlyForDisplay(body.persona.fechaIngreso))],
    ];

    kvPairs.forEach((pair, idx) => {
      const y = kvStartY - idx * kvLineHeight;
      const kvColWidth = col1Width / 2 - 4 * MM_TO_PT;

      page.drawText(pair[0], {
        x: box1X + 4 * MM_TO_PT,
        y,
        size: 10,
        color: rgb(0, 0, 0),
        maxWidth: kvColWidth - 4 * MM_TO_PT,
      });

      page.drawLine({
        start: { x: box1X + 4 * MM_TO_PT + 70, y: y - 2 },
        end: { x: box1X + col1Width - 4 * MM_TO_PT, y: y - 2 },
        color: rgb(0.2, 0.2, 0.2),
        thickness: 0.5,
      });

      page.drawText(pair[1], {
        x: box1X + col1Width / 2,
        y,
        size: 10,
        color: rgb(0, 0, 0),
        maxWidth: col1Width / 2 - 4 * MM_TO_PT,
      });
    });

    // BOX 2: Talles
    const box2X = box1X + col1Width + gapWidth;
    const box2Y = box1Y;

    page.drawRectangle({
      x: box2X,
      y: box2Y,
      width: col2Width,
      height: gridItemHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("Talles", {
      x: box2X + 4 * MM_TO_PT,
      y: box2Y + gridItemHeight - 8 * MM_TO_PT,
      size: 12,
      color: rgb(0, 0, 0),
    });

    page.drawLine({
      start: { x: box2X + 4 * MM_TO_PT, y: lineY },
      end: { x: box2X + col2Width - 4 * MM_TO_PT, y: lineY },
      color: rgb(0.2, 0.2, 0.2),
      thickness: 0.5,
    });

    const tallasPairs = [
      ["Parka", sanitizeForPDF(body.persona.tallas.PARKA)],
      ["Camisaco", sanitizeForPDF(body.persona.tallas.CAMISACO)],
      ["Pantalon", sanitizeForPDF(body.persona.tallas.PANTALON)],
      ["Kepi", sanitizeForPDF(body.persona.tallas.KEPI)],
      ["Calzado", sanitizeForPDF(body.persona.tallas.CALZADO)],
      ["Fecha de impresion", fechaImpresion],
    ];

    tallasPairs.forEach((pair, idx) => {
      const y = kvStartY - idx * kvLineHeight;

      page.drawText(pair[0], {
        x: box2X + 4 * MM_TO_PT,
        y,
        size: 10,
        color: rgb(0, 0, 0),
      });

      page.drawText(pair[1], {
        x: box2X + col2Width / 2,
        y,
        size: 10,
        color: rgb(0, 0, 0),
      });
    });

    currentY = box1Y - 4 * MM_TO_PT;

    // ===== SECCIÓN DE FIRMAS (simplificado) =====
    const signAreaHeight = 30 * MM_TO_PT;
    const signAreaX = MARGINS.left;
    const signAreaY = currentY - signAreaHeight;

    page.drawRectangle({
      x: signAreaX,
      y: signAreaY,
      width: pageWidth,
      height: signAreaHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    const colWidth = pageWidth / 3;
    const signLabelY = signAreaY + signAreaHeight - 12 * MM_TO_PT;

    page.drawText("Firma del alistado:", {
      x: signAreaX + 4 * MM_TO_PT,
      y: signLabelY,
      size: 10,
      color: rgb(0, 0, 0),
    });

    page.drawText(sanitizeForPDF(body.firmas.encargadoTexto), {
      x: signAreaX + colWidth + 4 * MM_TO_PT,
      y: signLabelY,
      size: 10,
      color: rgb(0, 0, 0),
    });

    page.drawText(sanitizeForPDF(body.firmas.oficialTexto), {
      x: signAreaX + colWidth * 2 + 4 * MM_TO_PT,
      y: signLabelY,
      size: 10,
      color: rgb(0, 0, 0),
    });

    // Convertir PDF a bytes
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="HojaEntrega_${body.persona.ci}.pdf"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error in PDF generation endpoint:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
