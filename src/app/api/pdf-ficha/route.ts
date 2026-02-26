import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";

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

function getDatePart(value: string | null | undefined, part: "day" | "month" | "year"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (part === "day") return String(date.getDate());
  if (part === "month") return String(date.getMonth() + 1);
  return String(date.getFullYear());
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = (await request.json()) as FichaDataRequest;

    // Crear documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 20,
    });

    const pageWidth = doc.page.width - 40;
    const buffer: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => {
      buffer.push(chunk);
    });

    // ===== ENCABEZADO =====
    doc.fontSize(10).font("Helvetica-Bold").text('Grupo "Brig.Gral.Manuel Oribe" de Artillería 105mm No.1.-', {
      align: "center",
    });

    doc.fontSize(9).font("Helvetica-Bold").text("ADMINISTRACIÓN.-", {
      align: "center",
    });

    doc.moveDown(0.3);

    // ===== DATOS PERSONALES =====
    const apellidos = [body.persona.apellido1, body.persona.apellido2].filter(Boolean).join(" ");
    const nombres = [body.persona.nombre1, body.persona.nombre2].filter(Boolean).join(" ");

    doc.fontSize(8).font("Helvetica").text(
      `Apellidos: ${apellidos} | Nombres: ${nombres} | Grado: ${body.persona.gradoPersonal}`,
      { width: pageWidth }
    );

    // ===== TALLAS =====
    doc.fontSize(8).text(
      `Talle - Parka: ${body.persona.tallas.PARKA} | Camisaco: ${body.persona.tallas.CAMISACO} | Pantalón: ${body.persona.tallas.PANTALON} | Kepi: ${body.persona.tallas.KEPI} | Calzado: ${body.persona.tallas.CALZADO}`,
      { width: pageWidth }
    );

    // ===== INFORMACIÓN ADMINISTRATIVA =====
    doc.fontSize(8).text(
      `C.I: ${body.persona.ci} | Batería: ${body.persona.bateria ?? "Pendiente"} | Fecha Ingreso: ${
        body.persona.fechaIngreso ? new Date(body.persona.fechaIngreso).toLocaleDateString("es-UY") : ""
      }`,
      { width: pageWidth }
    );

    doc.moveDown(0.3);

    // ===== TABLA DE DISTRIBUCIÓN =====
    doc.fontSize(8).font("Helvetica-Bold").text("VESTUARIO - DISTRIBUCIÓN / ENTREGA - DEVOLUCIÓN", {
      align: "center",
    });

    const colWidth = pageWidth / 15;
    const rowHeight = 12;

    // Encabezado principal
    drawRow(doc, [
      { text: "VESTUARIO", width: colWidth * 1, bold: true },
      { text: "DISTRIBUCIÓN", width: colWidth * 6, align: "center", bold: true },
      { text: "T", width: colWidth * 1, align: "center", bold: true },
      { text: "ENTREGA/DEVOLUCIÓN", width: colWidth * 6, align: "center", bold: true },
      { text: "T", width: colWidth * 1, align: "center", bold: true },
    ]);

    // Fila DÍA
    const dayRow: Cell[] = [{ text: "DÍA", width: colWidth * 1, align: "center", bold: true }];
    for (let i = 0; i < 6; i++) {
      dayRow.push({
        text: getDatePart(body.entregas[i]?.fecha, "day"),
        width: colWidth * 1,
        align: "center",
      });
    }
    dayRow.push({ text: "", width: colWidth * 1, align: "center" });
    for (let i = 0; i < 6; i++) {
      dayRow.push({
        text: getDatePart(body.devoluciones[i]?.fecha, "day"),
        width: colWidth * 1,
        align: "center",
      });
    }
    dayRow.push({ text: "", width: colWidth * 1, align: "center" });
    drawRow(doc, dayRow);

    // Fila MES
    const monthRow: Cell[] = [{ text: "MES", width: colWidth * 1, align: "center", bold: true }];
    for (let i = 0; i < 6; i++) {
      monthRow.push({
        text: getDatePart(body.entregas[i]?.fecha, "month"),
        width: colWidth * 1,
        align: "center",
      });
    }
    monthRow.push({ text: "", width: colWidth * 1, align: "center" });
    for (let i = 0; i < 6; i++) {
      monthRow.push({
        text: getDatePart(body.devoluciones[i]?.fecha, "month"),
        width: colWidth * 1,
        align: "center",
      });
    }
    monthRow.push({ text: "", width: colWidth * 1, align: "center" });
    drawRow(doc, monthRow);

    // Fila AÑO
    const yearRow: Cell[] = [{ text: "AÑO", width: colWidth * 1, align: "center", bold: true }];
    for (let i = 0; i < 6; i++) {
      yearRow.push({
        text: getDatePart(body.entregas[i]?.fecha, "year"),
        width: colWidth * 1,
        align: "center",
      });
    }
    yearRow.push({ text: "", width: colWidth * 1, align: "center" });
    for (let i = 0; i < 6; i++) {
      yearRow.push({
        text: getDatePart(body.devoluciones[i]?.fecha, "year"),
        width: colWidth * 1,
        align: "center",
      });
    }
    yearRow.push({ text: "", width: colWidth * 1, align: "center" });
    drawRow(doc, yearRow);

    // Encabezado columnas numeradas
    const headerRow: Cell[] = [{ text: "VESTUARIO", width: colWidth * 1, align: "center", bold: true }];
    for (let i = 1; i <= 6; i++) {
      headerRow.push({ text: String(i), width: colWidth * 1, align: "center", bold: true });
    }
    headerRow.push({ text: "T", width: colWidth * 1, align: "center", bold: true });
    for (let i = 1; i <= 6; i++) {
      headerRow.push({ text: String(i), width: colWidth * 1, align: "center", bold: true });
    }
    headerRow.push({ text: "T", width: colWidth * 1, align: "center", bold: true });
    drawRow(doc, headerRow);

    // Items
    body.matrix.forEach((row) => {
      const itemRow: Cell[] = [{ text: row.item, width: colWidth * 1 }];
      row.entrega.forEach((val) => {
        itemRow.push({ text: String(val || ""), width: colWidth * 1, align: "center" });
      });
      itemRow.push({ text: String(row.entregaTotal), width: colWidth * 1, align: "center", bold: true });
      row.devolucion.forEach((val) => {
        itemRow.push({ text: String(val || ""), width: colWidth * 1, align: "center" });
      });
      itemRow.push({ text: String(row.devolucionTotal), width: colWidth * 1, align: "center", bold: true });
      drawRow(doc, itemRow);
    });

    doc.moveDown(0.3);

    // ===== OBSERVACIONES =====
    doc.fontSize(8).font("Helvetica-Bold").text("OBSERVACIONES", {
      align: "center",
    });

    const obsLineHeight = 14;
    const observacionesTexto = body.observaciones.slice(0, 5).map((obs) => {
      const fecha = new Date(obs.fecha).toLocaleDateString("es-UY");
      return `${fecha}: ${obs.texto}`;
    });

    for (let i = 0; i < 5; i++) {
      const yStart = doc.y;
      doc
        .rect(20, yStart, pageWidth, obsLineHeight)
        .stroke();
      doc.fontSize(7).text(observacionesTexto[i] ?? "", 22, yStart + 1, {
        width: pageWidth - 4,
        height: obsLineHeight - 2,
      });
      doc.y = yStart + obsLineHeight;
    }

    doc.moveDown(0.3);

    // ===== SECCIÓN DE FIRMAS =====
    doc.fontSize(8).font("Helvetica-Bold").text("FIRMAS", {
      align: "center",
    });

    doc.moveDown(0.2);

    // Firma del alistado
    doc.fontSize(7).font("Helvetica").text("Firma del alistado:", 20);
    doc.font("Helvetica-Bold").text(body.persona.gradoPersonal, 20);
    doc.moveDown(0.3);
    doc.moveTo(20, doc.y).lineTo(150, doc.y).stroke();
    const nombreFirmaAlistado = [body.persona.nombre1, body.persona.apellido1].filter(Boolean).join(" ");
    doc.font("Helvetica").text(nombreFirmaAlistado, 20);
    doc.moveDown(0.3);

    // Firma Encargado
    doc.fontSize(7).font("Helvetica").text(body.firmas.encargadoTexto, 180);
    doc.font("Helvetica-Bold").text(body.firmas.encargadoRango, 180);
    doc.moveDown(0.3);
    doc.moveTo(180, doc.y).lineTo(doc.page.width - 20, doc.y).stroke();
    doc.font("Helvetica").text(body.firmas.encargadoNombre, 180);
    doc.moveDown(0.3);

    // Firma Oficial
    const oficialX = doc.page.width - 150;
    doc.fontSize(7).font("Helvetica").text(body.firmas.oficialTexto, oficialX);
    doc.font("Helvetica-Bold").text(body.firmas.oficialRango, oficialX);
    doc.moveDown(0.3);
    doc.moveTo(oficialX, doc.y).lineTo(doc.page.width - 20, doc.y).stroke();
    doc.font("Helvetica").text(body.firmas.oficialNombre, oficialX);

    // Finalizar y retornar buffer
    doc.end();

    // Esperar a que el documento se complete
    return new Promise((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(buffer);
        resolve(
          new NextResponse(pdfBuffer, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="ficha-${body.persona.ci}.pdf"`,
            },
          })
        );
      });
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

// Helper: Draw a row with multiple cells
interface Cell {
  text: string;
  width: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

function drawRow(doc: PDFKit.PDFDocument, cells: Cell[], yStart?: number) {
  const rowHeight = 12;
  const startY = yStart ?? doc.y;
  let x = 20;

  cells.forEach((cell) => {
    doc.rect(x, startY, cell.width, rowHeight).stroke();

    const fontSize = 6;
    const font = cell.bold ? "Helvetica-Bold" : "Helvetica";

    doc
      .fontSize(fontSize)
      .font(font)
      .text(cell.text, x + 2, startY + 2, {
        width: cell.width - 4,
        height: rowHeight - 4,
        align: cell.align || "left",
      });

    x += cell.width;
  });

  doc.y = startY + rowHeight;
}
