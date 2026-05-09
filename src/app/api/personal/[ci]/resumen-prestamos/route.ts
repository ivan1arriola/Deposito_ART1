import { NextResponse } from "next/server";
import { TipoMovimiento, type Prisma } from "@/generated/prisma/client";
import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";
import { authorizeRequest } from "@/lib/auth";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { prisma } from "@/lib/prisma";
import { normalizeOutputText } from "@/lib/spanish-text";

const MM_TO_PT = 2.834645669;
const A4_WIDTH = 210 * MM_TO_PT;
const A4_HEIGHT = 297 * MM_TO_PT;

const PAGE_MARGIN_X = 12 * MM_TO_PT;
const PAGE_MARGIN_Y = 12 * MM_TO_PT;
const RECEIPT_PADDING = 8 * MM_TO_PT;
const INNER_WIDTH = A4_WIDTH - PAGE_MARGIN_X * 2 - RECEIPT_PADDING * 2;
const CONTENT_BOTTOM = A4_HEIGHT - PAGE_MARGIN_Y - RECEIPT_PADDING;

const TABLE_HEADER_HEIGHT = 16;
const TABLE_MIN_ROW_HEIGHT = 14;
const TABLE_CELL_TEXT_SIZE = 9;
const TABLE_CELL_LINE_HEIGHT = 9;
const TABLE_CELL_TOP_PADDING = 3;
const TABLE_CELL_BOTTOM_PADDING = 2;

const TABLE_COL_QTY = 45;
const TABLE_COL_ESTADO = 70;
const TABLE_COL_OBS = 90;
const TABLE_COL_EFECTO = INNER_WIDTH - TABLE_COL_QTY - TABLE_COL_ESTADO - TABLE_COL_OBS;

const WATERMARK_FILENAME = "marca-agua-recibo-prestamo-bn.png";
const WATERMARK_OPACITY = 0.15;

const MOVIMIENTO_RESUMEN_INCLUDE = {
  usuarioEntrega: {
    include: {
      rango: true,
    },
  },
  prestamoActivo: true,
  items: {
    include: { item: true },
    orderBy: { item: { ordenPdf: "asc" } },
  },
} as const satisfies Prisma.MovimientoInclude;

type MovimientoResumen = Prisma.MovimientoGetPayload<{
  include: typeof MOVIMIENTO_RESUMEN_INCLUDE;
}>;

function formatTimeUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

function formatDateUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatLongDateUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function sanitizeForPdf(value: string | null | undefined) {
  return normalizeOutputText(value);
}

function toPrintUppercase(value: string | null | undefined) {
  return sanitizeForPdf(value).toLocaleUpperCase("es-UY");
}

function fullName(apellido1: string, apellido2: string | null, nombre1: string, nombre2: string | null) {
  const apellidos = `${apellido1} ${apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
  const nombres = `${nombre1} ${nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
  return `${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

function militaryShortLabel(gradoAbreviacion: string, apellido: string, nombre: string) {
  return `${gradoAbreviacion} ${firstWord(apellido)} ${firstWord(nombre)}`.replace(/\s+/g, " ").trim();
}

function movementTypeLabel(tipo: TipoMovimiento) {
  if (tipo === TipoMovimiento.ENTREGA) return "ENTREGA";
  if (tipo === TipoMovimiento.DEVOLUCION) return "DEVOLUCION";
  return "PRESTAMO";
}

function movementTypeColor(tipo: TipoMovimiento) {
  // Optimizado para Blanco y Negro (B&W)
  return rgb(0, 0, 0);
}

function movementReference(movimiento: MovimientoResumen) {
  if (movimiento.tipo === TipoMovimiento.PRESTAMO) {
    return movimiento.prestamoActivo?.reciboNumero ?? `PR-${movimiento.movimientoId.toString().padStart(8, "0")}`;
  }
  return `MV-${movimiento.movimientoId.toString().padStart(8, "0")}`;
}

function resolveItemEstado(movimiento: MovimientoResumen, item: MovimientoResumen["items"][number]) {
  if (movimiento.tipo === TipoMovimiento.DEVOLUCION) {
    return item.estadoDevolucion ?? item.estadoEntrega ?? "BUENO";
  }
  return item.estadoEntrega ?? item.estadoDevolucion ?? "BUENO";
}

function resolveItemObservacion(movimiento: MovimientoResumen, item: MovimientoResumen["items"][number]) {
  if (movimiento.tipo === TipoMovimiento.DEVOLUCION) {
    return item.comentarioDevolucion ?? item.comentarioEntrega ?? "-";
  }
  return item.comentarioEntrega ?? item.comentarioDevolucion ?? "-";
}

function yForTop(top: number, fontSize: number) {
  return A4_HEIGHT - top - fontSize;
}

function drawTextAt(page: PDFPage, font: PDFFont, text: string, x: number, top: number, size: number, color = rgb(0, 0, 0)) {
  page.drawText(sanitizeForPdf(text), { x, y: yForTop(top, size), size, font, color });
}

function drawTextRight(page: PDFPage, font: PDFFont, text: string, rightX: number, top: number, size: number, color = rgb(0, 0, 0)) {
  const safe = sanitizeForPdf(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - width, y: yForTop(top, size), size, font, color });
}

function drawRectTop(page: PDFPage, x: number, top: number, width: number, height: number, border = rgb(0, 0, 0), fill?: boolean) {
  page.drawRectangle({
    x,
    y: A4_HEIGHT - top - height,
    width,
    height,
    borderColor: border,
    borderWidth: 0.5,
    color: fill ? rgb(0.97, 0.97, 0.97) : undefined,
  });
}

function drawHorizontalLine(page: PDFPage, x: number, yTop: number, width: number, thickness = 0.5) {
  page.drawLine({
    start: { x, y: A4_HEIGHT - yTop },
    end: { x: x + width, y: A4_HEIGHT - yTop },
    thickness,
    color: rgb(0, 0, 0),
  });
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const clean = sanitizeForPdf(text);
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

async function loadWatermarkBytes() {
  const watermarkPath = path.join(process.cwd(), WATERMARK_FILENAME);
  try { return await readFile(watermarkPath); } catch { return null; }
}

export async function GET(request: Request, context: { params: Promise<{ ci: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { ci } = await context.params;
  const personal = await prisma.personal.findUnique({
    where: { ci },
    include: {
      rango: true,
      subalterno: { include: { bateria: true } }
    }
  });

  if (!personal) return NextResponse.json({ error: "Personal no encontrado." }, { status: 404 });

  const movimientos = await prisma.movimiento.findMany({
    where: {
      personalCi: ci,
      OR: [
        { tipo: { in: [TipoMovimiento.ENTREGA, TipoMovimiento.DEVOLUCION] } },
        { tipo: TipoMovimiento.PRESTAMO, prestamoActivo: { isNot: null } },
      ],
    },
    include: MOVIMIENTO_RESUMEN_INCLUDE,
    orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
  });

  if (movimientos.length === 0) {
    return NextResponse.json({ error: "No se encontraron movimientos vigentes para esta persona." }, { status: 404 });
  }

  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const watermarkBytes = await loadWatermarkBytes();
  const watermarkImage = watermarkBytes ? await pdfDoc.embedPng(watermarkBytes) : null;
  const movementsByType = movimientos.reduce(
    (acc, movimiento) => {
      acc[movimiento.tipo] += 1;
      return acc;
    },
    { [TipoMovimiento.ENTREGA]: 0, [TipoMovimiento.DEVOLUCION]: 0, [TipoMovimiento.PRESTAMO]: 0 },
  );
  const totalUnidades = movimientos.reduce(
    (acc, movimiento) => acc + movimiento.items.reduce((itemsAcc, item) => itemsAcc + item.cantidad, 0),
    0,
  );

  let currentPage: PDFPage | null = null;
  let currentY = 0;
  let pageNumber = 0;

  function addNewPage() {
    currentPage = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    pageNumber++;
    currentY = PAGE_MARGIN_Y + RECEIPT_PADDING;
    
    // Marco de página (Simple y elegante)
    drawRectTop(currentPage, PAGE_MARGIN_X, PAGE_MARGIN_Y, A4_WIDTH - PAGE_MARGIN_X * 2, A4_HEIGHT - PAGE_MARGIN_Y * 2);
    
    if (watermarkImage) {
      const native = watermarkImage.scale(1);
      const scale = 0.5;
      const w = native.width * scale;
      const h = native.height * scale;
      currentPage.drawImage(watermarkImage, {
        x: (A4_WIDTH - w) / 2,
        y: (A4_HEIGHT - h) / 2,
        width: w,
        height: h,
        opacity: WATERMARK_OPACITY
      });
    }

    // Cabecera Institucional
    const headerTitle = "HOJA DE MOVIMIENTOS V3 - DEPÓSITO GENERAL";
    const headerUnit = 'GRUPO "BRIG. GRAL. MANUEL ORIBE" DE ARTILLERIA 105MM NO. 1';
    
    drawTextAt(currentPage!, bold, headerUnit, PAGE_MARGIN_X + RECEIPT_PADDING, currentY, 8);
    drawTextRight(currentPage!, regular, `Impreso: ${formatDateUy(new Date())} ${formatTimeUy(new Date())}`, A4_WIDTH - PAGE_MARGIN_X - RECEIPT_PADDING, currentY, 7);
    currentY += 12;
    
    drawTextAt(currentPage!, bold, headerTitle, PAGE_MARGIN_X + RECEIPT_PADDING, currentY, 14);
    drawTextRight(currentPage!, bold, `Página ${pageNumber}`, A4_WIDTH - PAGE_MARGIN_X - RECEIPT_PADDING, currentY, 9);
    currentY += 18;
    
    drawHorizontalLine(currentPage!, PAGE_MARGIN_X + RECEIPT_PADDING, currentY, INNER_WIDTH, 1.5);
    currentY += 14;

    if (pageNumber === 1) {
      // Información del Personal (Compacta)
      const pName = fullName(personal!.apellido1, personal!.apellido2, personal!.nombre1, personal!.nombre2);
      const pGrado = personal!.rango.abreviacion;
      const pCi = formatUruguayanCi(personal!.ci);
      const pBat = personal!.subalterno?.bateria?.nombre || "No aplica";

      drawTextAt(currentPage!, bold, "PERSONAL:", PAGE_MARGIN_X + RECEIPT_PADDING, currentY, 10);
      drawTextAt(currentPage!, regular, `${pGrado} ${pName}`, PAGE_MARGIN_X + RECEIPT_PADDING + 65, currentY, 10);
      drawTextRight(currentPage!, regular, `C.I. ${pCi}  |  UNIDAD: ${pBat}`, A4_WIDTH - PAGE_MARGIN_X - RECEIPT_PADDING, currentY, 10);
      currentY += 16;
      
      // Resumen (Una sola fila compacta)
      drawRectTop(currentPage!, PAGE_MARGIN_X + RECEIPT_PADDING, currentY, INNER_WIDTH, 18, rgb(0, 0, 0), false);
      const summaryText = `RESUMEN GENERAL: ${movimientos.length} Movimientos — ${totalUnidades} Unidades — ENTREGAS: ${movementsByType[TipoMovimiento.ENTREGA]} | DEVOLUCIONES: ${movementsByType[TipoMovimiento.DEVOLUCION]} | PRÉSTAMOS: ${movementsByType[TipoMovimiento.PRESTAMO]}`;
      drawTextAt(currentPage!, bold, summaryText, PAGE_MARGIN_X + RECEIPT_PADDING + 8, currentY + 5, 8.5);
      
      currentY += 28;
    }
  }

  addNewPage();

  for (const mov of movimientos) {
    const referencia = movementReference(mov);
    const fechaM = formatDateOnlyFromDate(mov.fecha) ?? "-";
    const tipoM = movementTypeLabel(mov.tipo);
    const resp = militaryShortLabel(mov.usuarioEntrega.rango?.abreviacion ?? "", mov.usuarioEntrega.apellido, mov.usuarioEntrega.nombre);
    const totalUnidadesMovimiento = mov.items.reduce((acc, item) => acc + item.cantidad, 0);

    // Estimación de altura compacta
    const headerH = 22; // Título del movimiento
    const subHeaderH = 15; // Fecha, responsable
    const tableHeaderH = TABLE_HEADER_HEIGHT;
    const rowCount = Math.max(mov.items.length, 1);
    const rowH = rowCount * TABLE_MIN_ROW_HEIGHT;
    const obsH = mov.observaciones ? wrapText(mov.observaciones, INNER_WIDTH - 20, regular, 8).length * 12 + 15 : 0;
    const spacing = 15;
    const totalMovH = headerH + subHeaderH + tableHeaderH + rowH + obsH + spacing;

    if (currentY + totalMovH > CONTENT_BOTTOM) {
      addNewPage();
    }

    // Separador de Movimiento (Línea simple)
    drawHorizontalLine(currentPage!, PAGE_MARGIN_X + RECEIPT_PADDING, currentY, INNER_WIDTH, 0.5);
    let movY = currentY + 10;

    // Fila 1: Tipo e ID combinados (Ej: ENTREGA MV-00000001)
    drawTextAt(currentPage!, bold, `${tipoM} ${referencia}`, PAGE_MARGIN_X + RECEIPT_PADDING, movY, 11);
    movY += 15;

    // Fila 2: Fecha, Responsable y Unidades
    drawTextAt(currentPage!, regular, `Fecha: ${fechaM}  |  Responsable: ${resp}  |  Total Unidades: ${totalUnidadesMovimiento}`, PAGE_MARGIN_X + RECEIPT_PADDING, movY, 9);
    movY += 15;

    // Tabla de Equipos
    const tableX = PAGE_MARGIN_X + RECEIPT_PADDING;
    const tableW = INNER_WIDTH;
    
    // Encabezado de tabla (Sin fondo para ahorrar tinta, solo bordes)
    drawRectTop(currentPage!, tableX, movY, tableW, tableHeaderH, rgb(0, 0, 0));
    drawTextAt(currentPage!, bold, "EQUIPO", tableX + 5, movY + 4, 8);
    drawTextAt(currentPage!, bold, "CANT", tableX + TABLE_COL_EFECTO, movY + 4, 8);
    drawTextAt(currentPage!, bold, "ESTADO", tableX + TABLE_COL_EFECTO + TABLE_COL_QTY, movY + 4, 8);
    drawTextAt(currentPage!, bold, "OBSERVACIONES", tableX + TABLE_COL_EFECTO + TABLE_COL_QTY + TABLE_COL_ESTADO, movY + 4, 8);
    movY += tableHeaderH;

    if (mov.items.length === 0) {
      drawRectTop(currentPage!, tableX, movY, tableW, TABLE_MIN_ROW_HEIGHT, rgb(0, 0, 0));
      drawTextAt(currentPage!, regular, "Sin equipos asociados", tableX + 5, movY + 3, 8);
      movY += TABLE_MIN_ROW_HEIGHT;
    } else {
      for (const item of mov.items) {
        drawRectTop(currentPage!, tableX, movY, tableW, TABLE_MIN_ROW_HEIGHT, rgb(0, 0, 0));
        drawTextAt(currentPage!, regular, toPrintUppercase(item.item.nombre).slice(0, 60), tableX + 5, movY + 3, 8);
        drawTextAt(currentPage!, regular, String(item.cantidad), tableX + TABLE_COL_EFECTO + 5, movY + 3, 8);
        drawTextAt(currentPage!, regular, resolveItemEstado(mov, item), tableX + TABLE_COL_EFECTO + TABLE_COL_QTY + 5, movY + 3, 8);
        drawTextAt(
          currentPage!,
          regular,
          resolveItemObservacion(mov, item).slice(0, 35),
          tableX + TABLE_COL_EFECTO + TABLE_COL_QTY + TABLE_COL_ESTADO + 5,
          movY + 3,
          8,
        );
        movY += TABLE_MIN_ROW_HEIGHT;
      }
    }

    if (mov.observaciones) {
      const lines = wrapText(mov.observaciones, tableW - 10, regular, 8);
      drawTextAt(currentPage!, bold, "Nota:", tableX, movY + 5, 8);
      lines.forEach((l, i) => drawTextAt(currentPage!, regular, l, tableX + 35, movY + 5 + i * 11, 8));
      movY += lines.length * 11 + 8;
    }

    currentY = movY + 10;
  }

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"Hoja_Movimientos_${ci}.pdf\"`
    }
  });
}
