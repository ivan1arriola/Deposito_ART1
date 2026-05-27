import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

interface MatrixItem {
  itemId: string;
  nombre: string;
}

interface MatrixRow {
  ci: string;
  apellido1: string;
  apellido2: string | null;
  nombre1: string;
  nombre2: string | null;
  bateria: string | null;
  grado: string;
  gradoAbreviacion: string;
  totales: number[];
  totalGeneral: number;
}

interface MatrixDataRequest {
  items: MatrixItem[];
  rows: MatrixRow[];
  generatedAt?: string;
}

// Constantes de diseño
const MM_TO_PT = 2.834645669;
const MARGINS = {
  top: 10 * MM_TO_PT,
  right: 10 * MM_TO_PT,
  bottom: 10 * MM_TO_PT,
  left: 10 * MM_TO_PT,
};

const COLORS = {
  border: "#000000",
  borderSoft: "rgba(0,0,0,0.35)",
  bgSoft: "#f2f2f2",
};

const FONTS = {
  default: "Times-Roman",
  bold: "Times-Bold",
  headingSize: 12,
  normalSize: 10,
  smallSize: 9,
};

function formatInstitutionalPrintDate(date = new Date()) {
  const formattedDate = new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `Montevideo, ${formattedDate}`;
}

function drawTableCell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options: {
    bold?: boolean;
    bg?: string;
    align?: "left" | "center" | "right";
    fontSize?: number;
  } = {}
): void {
  const { bold = false, bg, align = "left", fontSize = FONTS.smallSize } = options;

  // Fondo
  if (bg) {
    doc.rect(x, y, width, height).fill(bg);
  }

  // Borde
  doc.lineWidth(0.5).strokeColor(COLORS.border).rect(x, y, width, height).stroke();

  // Texto
  const font = bold ? FONTS.bold : FONTS.default;
  doc
    .font(font)
    .fontSize(fontSize)
    
    .fillColor("#000000")
    .text(text, x + 2, y + 1, {
      width: width - 4,
      height: height - 2,
      align: align,
      lineBreak: true,
    });
}

export async function POST(request: NextRequest): Promise<Response> {
  const chunks: Buffer[] = [];

  try {
    const body = (await request.json()) as MatrixDataRequest;

    if (!body.items || !body.rows) {
      return NextResponse.json({ error: "Items and rows are required" }, { status: 400 });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: false,
      layout: "landscape",
    });

    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    doc.on("error", (err: Error) => {
      throw err;
    });

    try {
      const pageWidth = doc.page.width - MARGINS.left - MARGINS.right;
      const pageHeight = doc.page.height - MARGINS.top - MARGINS.bottom;
      let currentY = MARGINS.top;
      const institutionalPrintDate = formatInstitutionalPrintDate(new Date());

      // ===== TOPBAR =====
      const topbarHeight = 26 * MM_TO_PT;
      const topbarX = MARGINS.left;
      const topbarY = currentY;
      const topbarPaddingX = 4 * MM_TO_PT;

      doc.lineWidth(1).strokeColor(COLORS.border).rect(topbarX, topbarY, pageWidth, topbarHeight).stroke();

      doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor("#000000")
        .text('Grupo "Brig. Gral. Manuel Oribe" de Artillería 105mm No. 1', topbarX + topbarPaddingX, topbarY + 2 * MM_TO_PT, {
          width: pageWidth * 0.62,
          align: "left",
          lineBreak: false,
        });

      doc
        .font(FONTS.bold)
        .fontSize(10)
        .fillColor("#000000")
        .text(institutionalPrintDate, topbarX + pageWidth * 0.55, topbarY + 2 * MM_TO_PT, {
          width: pageWidth * 0.45 - topbarPaddingX,
          align: "right",
          lineBreak: false,
        });

      doc
        .font(FONTS.bold)
        .fontSize(28)
        .fillColor("#000000")
        .text("Deposito General", topbarX + topbarPaddingX, topbarY + 9 * MM_TO_PT, {
          width: pageWidth - topbarPaddingX * 2,
          align: "center",
          lineBreak: false,
        });

      doc
        .font(FONTS.bold)
        .fontSize(14)
        .fillColor("#000000")
        .text("HOJA MATRIZ - DISTRIBUCION DE EQUIPO", topbarX + topbarPaddingX, topbarY + 18 * MM_TO_PT, {
          width: pageWidth - topbarPaddingX * 2,
          align: "center",
          lineBreak: false,
        });

      currentY += topbarHeight + 3 * MM_TO_PT;

      // ===== TABLA PRINCIPAL =====
      const colPersonal = 120;
      const colBateria = 70;
      const colGrado = 50;
      const colItemWidth = Math.floor((pageWidth - colPersonal - colBateria - colGrado) / (body.items.length + 1)) || 20;
      const rowHeight = 6 * MM_TO_PT;

      let currentX = topbarX;
      const tableStartY = currentY;

      // Encabezados principales
      // Columna de datos personales
      drawTableCell(doc, currentX, tableStartY, colPersonal, rowHeight, "Personal", {
        bold: true,
        bg: COLORS.bgSoft,
      });
      currentX += colPersonal;

      // Batería
      drawTableCell(doc, currentX, tableStartY, colBateria, rowHeight, "Batería", {
        bold: true,
        bg: COLORS.bgSoft,
      });
      currentX += colBateria;

      // Grado
      drawTableCell(doc, currentX, tableStartY, colGrado, rowHeight, "Grado", {
        bold: true,
        bg: COLORS.bgSoft,
      });
      currentX += colGrado;

      // Items
      body.items.forEach((item) => {
        drawTableCell(doc, currentX, tableStartY, colItemWidth, rowHeight, item.nombre.substring(0, 10), {
          bold: true,
          bg: COLORS.bgSoft,
          align: "center",
          fontSize: 7,
        });
        currentX += colItemWidth;
      });

      // Total
      drawTableCell(doc, currentX, tableStartY, colItemWidth, rowHeight, "Total", {
        bold: true,
        bg: COLORS.bgSoft,
        align: "center",
      });

      currentY += rowHeight;

      // Filas de datos
      const dataRows = body.rows || [];
      dataRows.forEach((row) => {
        let rowX = topbarX;

        // Personal
        const personalText = `${row.grado} ${row.apellido1} ${row.nombre1}`.trim();
        drawTableCell(doc, rowX, currentY, colPersonal, rowHeight, personalText, {
          fontSize: 7,
        });
        rowX += colPersonal;

        // Batería
        drawTableCell(doc, rowX, currentY, colBateria, rowHeight, row.bateria || "N/A", {
          fontSize: 7,
          align: "left",
        });
        rowX += colBateria;

        // Grado abreviación
        drawTableCell(doc, rowX, currentY, colGrado, rowHeight, row.gradoAbreviacion, {
          fontSize: 8,
          align: "center",
          bold: true,
        });
        rowX += colGrado;

        // Items
        row.totales.forEach((cantidad) => {
          drawTableCell(doc, rowX, currentY, colItemWidth, rowHeight, String(cantidad), {
            align: "center",
            fontSize: 8,
          });
          rowX += colItemWidth;
        });

        // Total general
        drawTableCell(doc, rowX, currentY, colItemWidth, rowHeight, String(row.totalGeneral), {
          align: "center",
          bold: true,
          fontSize: 9,
        });

        currentY += rowHeight;

        // Control de salto de página
        if (currentY > pageHeight - 20 * MM_TO_PT) {
          doc.addPage({ layout: "landscape", margin: 0 });
          currentY = MARGINS.top;
          
          // Repetir encabezados en nueva página
          let repX = topbarX;
          drawTableCell(doc, repX, currentY, colPersonal, rowHeight, "Personal", {
            bold: true,
            bg: COLORS.bgSoft,
          });
          repX += colPersonal;

          drawTableCell(doc, repX, currentY, colBateria, rowHeight, "Batería", {
            bold: true,
            bg: COLORS.bgSoft,
          });
          repX += colBateria;

          drawTableCell(doc, repX, currentY, colGrado, rowHeight, "Grado", {
            bold: true,
            bg: COLORS.bgSoft,
          });
          repX += colGrado;

          body.items.forEach((item) => {
            drawTableCell(doc, repX, currentY, colItemWidth, rowHeight, item.nombre.substring(0, 10), {
              bold: true,
              bg: COLORS.bgSoft,
              align: "center",
              fontSize: 7,
            });
            repX += colItemWidth;
          });

          drawTableCell(doc, repX, currentY, colItemWidth, rowHeight, "Total", {
            bold: true,
            bg: COLORS.bgSoft,
            align: "center",
          });

          currentY += rowHeight;
        }
      });

      // Finalizar documento
      doc.end();
    } catch (contentError) {
      doc.end();
      throw contentError;
    }

    // Esperar a que se complete la generación del PDF
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("PDF generation timeout after 30 seconds"));
      }, 30000);

      doc.on("end", () => {
        clearTimeout(timeout);
          try {
          const pdfBuffer = Buffer.concat(chunks);

          resolve(
            new NextResponse(pdfBuffer, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "inline; filename=HojaMatriz.pdf",
                "Content-Length": String(pdfBuffer.length),
              },
            })
          );
        } catch (bufferError) {
          reject(bufferError);
        }
      });

      doc.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  } catch (error) {
    
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json(
      { error: `PDF generation failed: ${message}` },
      { status: 500 }
    );
  }
}
