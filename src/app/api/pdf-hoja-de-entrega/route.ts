import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { formatDateOnlyForDisplay, formatDateTimeForDisplay } from "@/lib/date-helpers";
import { buildFirmasHojaEntregaLineas } from "@/lib/firma-lineas";
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

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as FichaDataRequest;
    const fechaImpresion = sanitizeForPDF(formatDateTimeForDisplay(new Date()));

    if (!body.persona?.ci) {
      return NextResponse.json({ error: "CI is required" }, { status: 400 });
    }

    // Crear documento PDF con pdflib
    const pdfDoc = await PDFDocument.create();
    
    // Registrar fontkit para soporte UTF-8 con fuentes estándar
    pdfDoc.registerFontkit(fontkit);

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

    // Crest box
    const crestSize = 28 * MM_TO_PT;
    const crestX = topbarX + 6 * MM_TO_PT;
    const crestY = topbarY + 2 * MM_TO_PT;

    page.drawRectangle({
      x: crestX,
      y: crestY,
      width: crestSize,
      height: crestSize,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    page.drawText("ESCUDO\nEJÉRCITO\nNACIONAL", {
      x: crestX + 2,
      y: crestY + 8,
      size: 8,
      color: rgb(0, 0, 0),
    });

    // Texto lado derecho del topbar
    const headtxtX = crestX + crestSize + 10 * MM_TO_PT;
    const headtxtWidth = pageWidth - (crestSize + 16 * MM_TO_PT);

    page.drawText('Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm N° 1', {
      x: headtxtX,
      y: topbarY + 20 * MM_TO_PT,
      size: 14,
      color: rgb(0, 0, 0),
      maxWidth: headtxtWidth,
    });

    page.drawText("ADMINISTRACIÓN - S4", {
      x: headtxtX,
      y: topbarY + 6 * MM_TO_PT,
      size: 10,
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

    // ===== SECCIÓN DE FIRMAS =====
    const signAreaHeight = 44 * MM_TO_PT;
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

    const firmaLineas = buildFirmasHojaEntregaLineas({
      alistadoRango: sanitizeForPDF(body.persona.gradoPersonal),
      alistadoNombre: sanitizeForPDF(
        `${body.persona.nombre1 ?? ""} ${body.persona.apellido1 ?? ""}`.replace(/\s+/g, " ").trim(),
      ),
      encargadoTexto: sanitizeForPDF(body.firmas.encargadoTexto),
      encargadoRango: sanitizeForPDF(body.firmas.encargadoRango),
      encargadoNombre: sanitizeForPDF(body.firmas.encargadoNombre),
      oficialTexto: sanitizeForPDF(body.firmas.oficialTexto),
      oficialRango: sanitizeForPDF(body.firmas.oficialRango),
      oficialNombre: sanitizeForPDF(body.firmas.oficialNombre),
    });
    const signTextSize = 8;
    const signLineHeight = signTextSize * 1.5;
    const signTab = 4 * MM_TO_PT;
    const signTextTop = signAreaY + signAreaHeight - 5 * MM_TO_PT - signTextSize;

    firmaLineas.forEach((linea, index) => {
      page.drawText(linea.text, {
        x: signAreaX + 4 * MM_TO_PT + signTab * linea.indentLevel,
        y: signTextTop - signLineHeight * index,
        size: signTextSize,
        color: rgb(0, 0, 0),
      });
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
