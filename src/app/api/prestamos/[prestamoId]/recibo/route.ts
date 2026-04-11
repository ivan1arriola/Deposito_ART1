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
const PAGE_MARGIN_Y = 20 * MM_TO_PT;
const RECEIPT_PADDING = 8 * MM_TO_PT;
const INNER_WIDTH = A4_WIDTH - PAGE_MARGIN_X * 2 - RECEIPT_PADDING * 2;
const CONTENT_BOTTOM = A4_HEIGHT - PAGE_MARGIN_Y - RECEIPT_PADDING;
const CLOSING_BLOCK_RESERVE = 248;
const TABLE_HEADER_HEIGHT = 20;
const TABLE_MIN_ROW_HEIGHT = 18;
const TABLE_CELL_TEXT_SIZE = 10;
const TABLE_CELL_LINE_HEIGHT = 10;
const TABLE_CELL_TOP_PADDING = 5;
const TABLE_CELL_BOTTOM_PADDING = 3;
const TABLE_COL_QTY = 58;
const TABLE_COL_ESTADO = 90;
const TABLE_COL_OBS = 120;
const TABLE_COL_EFECTO = INNER_WIDTH - TABLE_COL_QTY - TABLE_COL_ESTADO - TABLE_COL_OBS;
const WATERMARK_FILENAME = "marca-agua-recibo-prestamo-bn.png";
const WATERMARK_OPACITY = 0.24;
const WATERMARK_MAX_WIDTH_RATIO = 0.98;
const WATERMARK_MAX_HEIGHT_RATIO = 0.98;

type TableRow = {
  cantidad: string;
  efecto: string;
  estado: string;
  observaciones: string;
};

type TableRowLayout = {
  cantidadLines: string[];
  efectoLines: string[];
  estadoLines: string[];
  observacionesLines: string[];
  height: number;
};

type PageContext = {
  page: PDFPage;
  y: number;
  tableX: number;
  tableW: number;
  colQty: number;
  colEfecto: number;
  colEstado: number;
  colObs: number;
};

function parsePrestamoId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

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

function yForTop(top: number, fontSize: number) {
  return A4_HEIGHT - top - fontSize;
}

function drawTextAt(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  top: number,
  size: number,
  color = rgb(0, 0, 0),
) {
  page.drawText(sanitizeForPdf(text), { x, y: yForTop(top, size), size, font, color });
}

function drawTextRight(
  page: PDFPage,
  font: PDFFont,
  text: string,
  rightX: number,
  top: number,
  size: number,
  color = rgb(0, 0, 0),
) {
  const safe = sanitizeForPdf(text);
  const width = font.widthOfTextAtSize(safe, size);
  page.drawText(safe, { x: rightX - width, y: yForTop(top, size), size, font, color });
}

function drawRectTop(page: PDFPage, x: number, top: number, width: number, height: number, border = rgb(0, 0, 0)) {
  page.drawRectangle({
    x,
    y: A4_HEIGHT - top - height,
    width,
    height,
    borderColor: border,
    borderWidth: 1,
  });
}

function drawHorizontalLine(page: PDFPage, x: number, yTop: number, width: number, thickness = 1) {
  page.drawLine({
    start: { x, y: A4_HEIGHT - yTop },
    end: { x: x + width, y: A4_HEIGHT - yTop },
    thickness,
    color: rgb(0, 0, 0),
  });
}

function fitOneLine(text: string, maxWidth: number, font: PDFFont, size: number) {
  const clean = sanitizeForPdf(text || "-");
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;

  const ellipsis = "...";
  let end = clean.length;
  while (end > 1 && font.widthOfTextAtSize(`${clean.slice(0, end)}${ellipsis}`, size) > maxWidth) {
    end -= 1;
  }
  return `${clean.slice(0, end).trimEnd()}${ellipsis}`;
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

function normalizeCellValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? "-" : trimmed;
}

function layoutTableRow(row: TableRow, font: PDFFont): TableRowLayout {
  const efectoLines = wrapText(normalizeCellValue(row.efecto), TABLE_COL_EFECTO - 10, font, TABLE_CELL_TEXT_SIZE);
  const cantidadLines = wrapText(normalizeCellValue(row.cantidad), TABLE_COL_QTY - 10, font, TABLE_CELL_TEXT_SIZE);
  const estadoLines = wrapText(normalizeCellValue(row.estado), TABLE_COL_ESTADO - 10, font, TABLE_CELL_TEXT_SIZE);
  const observacionesLines = wrapText(
    normalizeCellValue(row.observaciones),
    TABLE_COL_OBS - 10,
    font,
    TABLE_CELL_TEXT_SIZE,
  );

  const lineCount = Math.max(efectoLines.length, cantidadLines.length, estadoLines.length, observacionesLines.length, 1);
  const height = Math.max(
    TABLE_MIN_ROW_HEIGHT,
    TABLE_CELL_TOP_PADDING + TABLE_CELL_BOTTOM_PADDING + lineCount * TABLE_CELL_LINE_HEIGHT,
  );

  return {
    cantidadLines,
    efectoLines,
    estadoLines,
    observacionesLines,
    height,
  };
}

function centerTextX(text: string, width: number, font: PDFFont, size: number) {
  const safe = sanitizeForPdf(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  return (width - textWidth) / 2;
}

async function loadWatermarkBytes() {
  const watermarkPath = path.join(process.cwd(), WATERMARK_FILENAME);
  try {
    return await readFile(watermarkPath);
  } catch {
    return null;
  }
}

const prestamoReciboInclude = {
  personal: {
    include: {
      rango: {
        select: {
          abreviacion: true,
        },
      },
      subalterno: {
        include: {
          bateria: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  },
  usuarioEntrega: {
    select: {
      nombre: true,
      apellido: true,
      rango: {
        select: {
          abreviacion: true,
        },
      },
    },
  },
  prestamoActivo: {
    select: {
      reciboNumero: true,
      fechaEstimadaDevolucionTexto: true,
    },
  },
  prestamoHistorial: {
    select: {
      reciboNumero: true,
      fechaDevolucion: true,
      fechaEstimadaDevolucionTexto: true,
      usuarioRecibeDevolucion: {
        select: {
          nombre: true,
          apellido: true,
          rango: {
            select: {
              abreviacion: true,
            },
          },
        },
      },
    },
  },
  items: {
    include: {
      item: {
        select: {
          nombre: true,
          ordenPdf: true,
        },
      },
    },
    orderBy: {
      item: {
        ordenPdf: "asc",
      },
    },
  },
} satisfies Prisma.MovimientoInclude;

export async function GET(request: Request, context: { params: Promise<{ prestamoId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { prestamoId: prestamoIdParam } = await context.params;
  const prestamoId = parsePrestamoId(prestamoIdParam);
  if (!prestamoId) {
    return NextResponse.json({ error: "prestamoId invalido." }, { status: 400 });
  }

  const prestamo = await prisma.movimiento.findUnique({
    where: { movimientoId: prestamoId },
    include: prestamoReciboInclude,
  });

  if (!prestamo || prestamo.tipo !== TipoMovimiento.PRESTAMO) {
    return NextResponse.json({ error: "Prestamo no encontrado." }, { status: 404 });
  }

  const reciboNumero =
    prestamo.prestamoHistorial?.reciboNumero ??
    prestamo.prestamoActivo?.reciboNumero ??
    `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`;

  const fechaPrestamo = formatDateOnlyFromDate(prestamo.fecha) ?? "-";
  const fechaDevolucion = formatDateOnlyFromDate(prestamo.prestamoHistorial?.fechaDevolucion) ?? "Pendiente";
  const fechaEstimadaDevolucion =
    prestamo.prestamoHistorial?.fechaEstimadaDevolucionTexto ??
    prestamo.prestamoActivo?.fechaEstimadaDevolucionTexto ??
    "-";

  const fechaRecibo = formatDateUy(prestamo.createdAt);
  const horaRecibo = formatTimeUy(prestamo.createdAt);
  const fechaImpresionCabecera = `Montevideo, ${formatLongDateUy(new Date())}`;
  const now = new Date();
  const fechaImpresion = `${formatDateUy(now)} ${formatTimeUy(now)}`;

  const destinatarioNombre = fullName(
    prestamo.personal.apellido1,
    prestamo.personal.apellido2,
    prestamo.personal.nombre1,
    prestamo.personal.nombre2,
  );
  const destinatarioGrado = prestamo.personal.rango.abreviacion;
  const destinatarioCi = formatUruguayanCi(prestamo.personal.ci);
  const bateria = prestamo.personal.subalterno?.bateria?.nombre ?? "No aplica";
  const observaciones = prestamo.observaciones?.trim() || "-";

  const entregaLabel = militaryShortLabel(
    prestamo.usuarioEntrega.rango.abreviacion,
    prestamo.usuarioEntrega.apellido,
    prestamo.usuarioEntrega.nombre,
  );
  const destinatarioFirmaLabel = militaryShortLabel(
    prestamo.personal.rango.abreviacion,
    prestamo.personal.apellido1,
    prestamo.personal.nombre1,
  );
  const recibeLabel = prestamo.prestamoHistorial?.usuarioRecibeDevolucion
    ? militaryShortLabel(
        prestamo.prestamoHistorial.usuarioRecibeDevolucion.rango.abreviacion,
        prestamo.prestamoHistorial.usuarioRecibeDevolucion.apellido,
        prestamo.prestamoHistorial.usuarioRecibeDevolucion.nombre,
      )
    : destinatarioFirmaLabel;

  const rows: TableRow[] = prestamo.items.map((item) => ({
    cantidad: String(item.cantidad),
    efecto: toPrintUppercase(item.item.nombre),
    estado: item.estadoDevolucion ?? item.estadoEntrega,
    observaciones: item.comentarioDevolucion?.trim() || item.comentarioEntrega?.trim() || "-",
  }));

  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const watermarkBytes = await loadWatermarkBytes();
  const watermarkImage: PDFImage | null = watermarkBytes ? await pdfDoc.embedPng(watermarkBytes) : null;

  const pages: PageContext[] = [];

  function drawWatermark(page: PDFPage, innerX: number, innerW: number) {
    if (!watermarkImage) return;
    const frameY = PAGE_MARGIN_Y + RECEIPT_PADDING;
    const frameH = A4_HEIGHT - 2 * (PAGE_MARGIN_Y + RECEIPT_PADDING);

    const native = watermarkImage.scale(1);
    const scale = Math.min(
      (innerW * WATERMARK_MAX_WIDTH_RATIO) / native.width,
      (frameH * WATERMARK_MAX_HEIGHT_RATIO) / native.height,
    );
    const width = native.width * scale;
    const height = native.height * scale;
    const x = innerX + (innerW - width) / 2;
    const top = frameY + (frameH - height) / 2;

    page.drawImage(watermarkImage, {
      x,
      y: A4_HEIGHT - top - height,
      width,
      height,
      opacity: WATERMARK_OPACITY,
    });
  }

  function drawHeaderAndFrame(page: PDFPage, yStart: number, innerX: number, innerW: number) {
    drawRectTop(page, PAGE_MARGIN_X, PAGE_MARGIN_Y, A4_WIDTH - PAGE_MARGIN_X * 2, A4_HEIGHT - PAGE_MARGIN_Y * 2);
    drawWatermark(page, innerX, innerW);

    const topUnit = 'GRUPO "BRIG. GRAL. MANUEL ORIBE" DE ARTILLERIA 105MM NO. 1';
    const title = "DEPOSITO GENERAL";
    const subtitle = "RECIBO DE PRESTAMO";

    const topUnitSize = 8;
    const titleSize = 16;
    const subtitleSize = 10;
    const metaBlockWidth = 182;
    const metaGap = 10;
    const titleAreaX = innerX;
    const titleAreaW = innerW - metaBlockWidth - metaGap;
    const metaRightX = innerX + innerW - 4;
    const topUnitTop = yStart + 2;
    const titleTop = yStart + 13;
    const subtitleTop = yStart + 31;

    drawTextAt(page, bold, topUnit, titleAreaX, topUnitTop, topUnitSize);
    drawTextRight(page, bold, fechaImpresionCabecera, metaRightX, topUnitTop, topUnitSize);

    drawTextAt(page, bold, title, titleAreaX + centerTextX(title, titleAreaW, bold, titleSize), titleTop, titleSize);
    drawTextAt(page, regular, subtitle, titleAreaX + centerTextX(subtitle, titleAreaW, regular, subtitleSize), subtitleTop, subtitleSize);

    drawTextRight(page, bold, `Recibo N.o: ${reciboNumero}`, metaRightX, titleTop + 3, 9);
    drawTextRight(page, bold, `Fecha: ${fechaRecibo}`, metaRightX, titleTop + 14, 9);
    drawTextRight(page, bold, `Hora: ${horaRecibo}`, metaRightX, titleTop + 25, 9);

    const dividerY = yStart + 47;
    drawHorizontalLine(page, innerX, dividerY, innerW, 1);
    return { nextY: dividerY + 8 };
  }

  function drawField(page: PDFPage, x: number, top: number, width: number, height: number, label: string, value: string) {
    drawRectTop(page, x, top, width, height);
    drawTextAt(page, bold, label.toUpperCase(), x + 6, top + 4, 7);
    drawTextAt(page, regular, fitOneLine(value, width - 12, regular, 10), x + 6, top + 16, 10);
  }

  function drawSectionTitle(page: PDFPage, x: number, top: number, width: number, text: string) {
    drawRectTop(page, x, top, width, 16);
    drawTextAt(page, bold, text.toUpperCase(), x + 6, top + 4, 8);
    return top + 20;
  }

  function drawFieldMultiline(
    page: PDFPage,
    x: number,
    top: number,
    width: number,
    label: string,
    value: string,
  ) {
    const lines = wrapText(normalizeCellValue(value), width - 12, regular, 10);
    const lineHeight = 10;
    const height = Math.max(28, 20 + lines.length * lineHeight + 4);

    drawRectTop(page, x, top, width, height);
    drawTextAt(page, bold, label.toUpperCase(), x + 6, top + 4, 7);
    lines.forEach((line, index) => {
      drawTextAt(page, regular, line, x + 6, top + 16 + index * lineHeight, 10);
    });

    return top + height + 6;
  }

  function startPage(continuation: boolean) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const innerX = PAGE_MARGIN_X + RECEIPT_PADDING;
    const innerW = INNER_WIDTH;
    const top0 = PAGE_MARGIN_Y + RECEIPT_PADDING;

    const header = drawHeaderAndFrame(page, top0, innerX, innerW);
    let y = header.nextY;

    if (!continuation) {
      const gap = 8;
      const boxH = 30;
      const row2H = 30;
      const col3 = (innerW - gap * 2) * 0.25;
      const col6 = innerW - col3 * 2 - gap * 2;

      drawField(page, innerX, y, col3, boxH, "Grado", destinatarioGrado);
      drawField(page, innerX + col3 + gap, y, col3, boxH, "C.I.", destinatarioCi);
      drawField(page, innerX + col3 * 2 + gap * 2, y, col6, boxH, "Bateria", bateria);
      y += boxH + 6;

      drawField(page, innerX, y, innerW, row2H, "Nombre", destinatarioNombre);
      y += row2H + 8;

      y = drawSectionTitle(page, innerX, y, innerW, "Datos del prestamo");

      const col4 = (innerW - gap * 2) / 3;
      drawField(page, innerX, y, col4, boxH, "Fecha de entrega", fechaPrestamo);
      drawField(page, innerX + col4 + gap, y, col4, boxH, "Fecha de devolucion", fechaDevolucion);
      drawField(page, innerX + col4 * 2 + gap * 2, y, col4, boxH, "Fecha estimada devolucion", fechaEstimadaDevolucion);
      y += boxH + 6;

      y = drawFieldMultiline(page, innerX, y, innerW, "Observaciones", observaciones);
    }

    y = drawSectionTitle(
      page,
      innerX,
      y,
      innerW,
      continuation ? "Detalle de equipo prestados (continuacion)" : "Detalle de equipo prestados",
    );

    const tableX = innerX;
    const tableW = innerW;
    const colQty = TABLE_COL_QTY;
    const colEstado = TABLE_COL_ESTADO;
    const colObs = TABLE_COL_OBS;
    const colEfecto = TABLE_COL_EFECTO;

    drawRectTop(page, tableX, y, tableW, TABLE_HEADER_HEIGHT);
    page.drawLine({
      start: { x: tableX + colEfecto, y: A4_HEIGHT - y - TABLE_HEADER_HEIGHT },
      end: { x: tableX + colEfecto, y: A4_HEIGHT - y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: tableX + colEfecto + colQty, y: A4_HEIGHT - y - TABLE_HEADER_HEIGHT },
      end: { x: tableX + colEfecto + colQty, y: A4_HEIGHT - y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: tableX + colEfecto + colQty + colEstado, y: A4_HEIGHT - y - TABLE_HEADER_HEIGHT },
      end: { x: tableX + colEfecto + colQty + colEstado, y: A4_HEIGHT - y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    drawTextAt(page, bold, "EQUIPO PRESTADO", tableX + 8, y + 6, 8);
    drawTextAt(page, bold, "CANTIDAD", tableX + colEfecto + 8, y + 6, 8);
    drawTextAt(page, bold, "ESTADO", tableX + colEfecto + colQty + 8, y + 6, 8);
    drawTextAt(page, bold, "OBSERVACIONES", tableX + colEfecto + colQty + colEstado + 8, y + 6, 8);

    y += TABLE_HEADER_HEIGHT;

    const context: PageContext = {
      page,
      y,
      tableX,
      tableW,
      colQty,
      colEfecto,
      colEstado,
      colObs,
    };

    pages.push(context);
    return context;
  }

  function startClosingPage() {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const innerX = PAGE_MARGIN_X + RECEIPT_PADDING;
    const innerW = INNER_WIDTH;
    const top0 = PAGE_MARGIN_Y + RECEIPT_PADDING;

    const header = drawHeaderAndFrame(page, top0, innerX, innerW);
    const context: PageContext = {
      page,
      y: header.nextY,
      tableX: innerX,
      tableW: innerW,
      colQty: 0,
      colEfecto: 0,
      colEstado: 0,
      colObs: 0,
    };

    pages.push(context);
    return context;
  }

  function drawTableRow(ctx: PageContext, layout: TableRowLayout) {
    drawRectTop(ctx.page, ctx.tableX, ctx.y, ctx.tableW, layout.height);
    ctx.page.drawLine({
      start: { x: ctx.tableX + ctx.colEfecto, y: A4_HEIGHT - ctx.y - layout.height },
      end: { x: ctx.tableX + ctx.colEfecto, y: A4_HEIGHT - ctx.y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    ctx.page.drawLine({
      start: { x: ctx.tableX + ctx.colEfecto + ctx.colQty, y: A4_HEIGHT - ctx.y - layout.height },
      end: { x: ctx.tableX + ctx.colEfecto + ctx.colQty, y: A4_HEIGHT - ctx.y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    ctx.page.drawLine({
      start: { x: ctx.tableX + ctx.colEfecto + ctx.colQty + ctx.colEstado, y: A4_HEIGHT - ctx.y - layout.height },
      end: { x: ctx.tableX + ctx.colEfecto + ctx.colQty + ctx.colEstado, y: A4_HEIGHT - ctx.y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    layout.efectoLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    layout.cantidadLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    layout.estadoLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + ctx.colQty + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    layout.observacionesLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + ctx.colQty + ctx.colEstado + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    ctx.y += layout.height;
  }

  function drawEmptyRow(ctx: PageContext) {
    drawTableRow(ctx, layoutTableRow({ cantidad: "", efecto: "", estado: "", observaciones: "" }, regular));
  }

  function drawClosingBlock(ctx: PageContext) {
    const innerX = PAGE_MARGIN_X + RECEIPT_PADDING;
    const innerW = A4_WIDTH - PAGE_MARGIN_X * 2 - RECEIPT_PADDING * 2;
    let y = ctx.y + 8;

    y = drawSectionTitle(ctx.page, innerX, y, innerW, "Constancia");

    const constanciaH = 46;
    drawRectTop(ctx.page, innerX, y, innerW, constanciaH);
    const constanciaLines = wrapText(
      "El militar que recibe deja constancia de haber retirado los efectos detallados, en el estado indicado, comprometiendose a su adecuada conservacion y devolucion cuando le sea requerida.",
      innerW - 12,
      regular,
      8,
    ).slice(0, 4);
    constanciaLines.forEach((line, idx) => {
      drawTextAt(ctx.page, regular, line, innerX + 6, y + 8 + idx * 10, 8);
    });
    y += constanciaH + 12;

    const signW = (innerW - 12) / 2;
    const lineY = y + 26;
    drawHorizontalLine(ctx.page, innerX, lineY, signW, 1);
    drawHorizontalLine(ctx.page, innerX + signW + 12, lineY, signW, 1);
    drawTextAt(ctx.page, bold, "Firma de quien entrega", innerX + 70, lineY + 4, 9);
    drawTextAt(ctx.page, regular, entregaLabel, innerX + 70, lineY + 16, 8);
    drawTextAt(ctx.page, bold, "Firma de quien recibe", innerX + signW + 78, lineY + 4, 9);
    drawTextAt(ctx.page, regular, recibeLabel, innerX + signW + 78, lineY + 16, 8);
    y = lineY + 34;

    const stampW = (innerW - 12) / 2;
    const stampH = 70;
    drawTextAt(ctx.page, bold, "SELLO DE ENTREGA", innerX + 82, y + 2, 8);
    drawTextAt(ctx.page, bold, "SELLO DE DEVOLUCION", innerX + stampW + 86, y + 2, 8);
    drawRectTop(ctx.page, innerX, y + 12, stampW, stampH);
    drawRectTop(ctx.page, innerX + stampW + 12, y + 12, stampW, stampH);
    y += stampH + 20;

    drawTextAt(
      ctx.page,
      regular,
      `Documento interno de control de prestamo de efectos. Impreso: ${fechaImpresion}`,
      innerX + 150,
      y,
      7,
      rgb(0.35, 0.35, 0.35),
    );
  }

  let ctx = startPage(false);
  let rowIndex = 0;
  let rowsOnCurrentPage = 0;
  const rowLayouts = rows.map((row) => layoutTableRow(row, regular));
  const remainingHeights = new Array(rowLayouts.length + 1).fill(0);
  for (let i = rowLayouts.length - 1; i >= 0; i -= 1) {
    remainingHeights[i] = rowLayouts[i].height + remainingHeights[i + 1];
  }

  while (rowIndex < rows.length) {
    const availableNoReserve = CONTENT_BOTTOM - ctx.y;
    const availableWithReserve = CONTENT_BOTTOM - CLOSING_BLOCK_RESERVE - ctx.y;
    const remainingHeight = remainingHeights[rowIndex];

    if (remainingHeight <= Math.max(0, availableWithReserve)) {
      while (rowIndex < rows.length) {
        drawTableRow(ctx, rowLayouts[rowIndex]);
        rowIndex += 1;
        rowsOnCurrentPage += 1;
      }
      break;
    }

    if (availableNoReserve <= 0) {
      ctx = startPage(true);
      rowsOnCurrentPage = 0;
      continue;
    }

    if (rowLayouts[rowIndex].height > availableNoReserve) {
      ctx = startPage(true);
      rowsOnCurrentPage = 0;
      continue;
    }

    while (rowIndex < rows.length) {
      const nextLayout = rowLayouts[rowIndex];
      if (ctx.y + nextLayout.height > CONTENT_BOTTOM) break;
      drawTableRow(ctx, nextLayout);
      rowIndex += 1;
      rowsOnCurrentPage += 1;
    }

    if (rowIndex < rows.length) {
      ctx = startPage(true);
      rowsOnCurrentPage = 0;
    }
  }

  const minimumRows = 5;
  while (rowsOnCurrentPage < minimumRows) {
    drawEmptyRow(ctx);
    rowsOnCurrentPage += 1;
  }

  if (ctx.y + CLOSING_BLOCK_RESERVE > CONTENT_BOTTOM) {
    ctx = startClosingPage();
  }
  drawClosingBlock(ctx);

  const totalPages = pages.length;
  pages.forEach((pageCtx, index) => {
    const label = `Hoja ${index + 1}/${totalPages}`;
    const size = 8;
    const textWidth = bold.widthOfTextAtSize(sanitizeForPdf(label), size);
    const x = A4_WIDTH - PAGE_MARGIN_X - RECEIPT_PADDING - textWidth;
    const top = A4_HEIGHT - PAGE_MARGIN_Y - 10;
    drawTextAt(pageCtx.page, bold, label, x, top, size);
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"Recibo_${reciboNumero}.pdf\"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
