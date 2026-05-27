import "server-only";

import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFImage, type PDFFont, type PDFPage } from "pdf-lib";

import { normalizeOutputText } from "@/lib/spanish-text";

export const MM_TO_PT = 2.834645669;
export const A4_WIDTH = 210 * MM_TO_PT;
export const A4_HEIGHT = 297 * MM_TO_PT;

export const PAGE_MARGIN_X = 12 * MM_TO_PT;
export const PAGE_MARGIN_Y = 20 * MM_TO_PT;
export const RECEIPT_PADDING = 8 * MM_TO_PT;
export const INNER_WIDTH = A4_WIDTH - PAGE_MARGIN_X * 2 - RECEIPT_PADDING * 2;
export const CONTENT_BOTTOM = A4_HEIGHT - PAGE_MARGIN_Y - RECEIPT_PADDING;

const WATERMARK_FILENAME = "marca-agua-recibo-prestamo-bn.png";
const WATERMARK_OPACITY = 0.24;
const WATERMARK_MAX_WIDTH_RATIO = 0.98;
const WATERMARK_MAX_HEIGHT_RATIO = 0.98;
const DEFAULT_TOP_UNIT = 'GRUPO "BRIG. GRAL. MANUEL ORIBE" DE ARTILLERIA 105MM NO. 1';
const DEFAULT_TITLE = "DEPOSITO GENERAL";

export type ReceiptPdfAssets = {
  regular: PDFFont;
  bold: PDFFont;
  watermarkImage: PDFImage | null;
};

export type ReceiptHeaderConfig = {
  subtitle: string;
  documentLabel: string;
  documentNumber: string;
  createdDate: string;
  createdTime: string;
  headerDateLabel: string;
  topUnit?: string;
  title?: string;
};

export type ReceiptAcknowledgementConfig = {
  body: string;
  leftSignatureTitle: string;
  leftSignatureName: string;
  rightSignatureTitle: string;
  rightSignatureName: string;
  footerNote: string;
  sectionTitle?: string;
  leftStampTitle?: string | null;
  rightStampTitle?: string | null;
};

function yForTop(top: number, fontSize: number) {
  return A4_HEIGHT - top - fontSize;
}

export function sanitizeForPdf(value: string | null | undefined) {
  return normalizeOutputText(value);
}

export function toPrintUppercase(value: string | null | undefined) {
  return sanitizeForPdf(value).toLocaleUpperCase("es-UY");
}

export function normalizeReceiptValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? "-" : trimmed;
}

export function formatTimeUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatDateUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function formatLongDateUy(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    timeZone: "America/Montevideo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

export function fullName(apellido1: string, apellido2: string | null, nombre1: string, nombre2: string | null) {
  const apellidos = `${apellido1} ${apellido2 ?? ""}`.replace(/\s+/g, " ").trim();
  const nombres = `${nombre1} ${nombre2 ?? ""}`.replace(/\s+/g, " ").trim();
  return `${apellidos}, ${nombres}`.replace(/\s+/g, " ").trim();
}

function firstWord(value: string) {
  return value.trim().split(/\s+/)[0] ?? "";
}

export function militaryShortLabel(gradoAbreviacion: string, apellido: string, nombre: string) {
  return `${gradoAbreviacion} ${firstWord(apellido)} ${firstWord(nombre)}`.replace(/\s+/g, " ").trim();
}

export function drawTextAt(
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

export function drawTextRight(
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

export function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  x: number,
  width: number,
  top: number,
  size: number,
  color = rgb(0, 0, 0),
) {
  const safe = sanitizeForPdf(text);
  const textWidth = font.widthOfTextAtSize(safe, size);
  const drawX = x + Math.max(0, (width - textWidth) / 2);
  page.drawText(safe, { x: drawX, y: yForTop(top, size), size, font, color });
}

export function drawRectTop(page: PDFPage, x: number, top: number, width: number, height: number, border = rgb(0, 0, 0)) {
  page.drawRectangle({
    x,
    y: A4_HEIGHT - top - height,
    width,
    height,
    borderColor: border,
    borderWidth: 1,
  });
}

export function drawHorizontalLine(page: PDFPage, x: number, yTop: number, width: number, thickness = 1) {
  page.drawLine({
    start: { x, y: A4_HEIGHT - yTop },
    end: { x: x + width, y: A4_HEIGHT - yTop },
    thickness,
    color: rgb(0, 0, 0),
  });
}

export function fitOneLine(text: string, maxWidth: number, font: PDFFont, size: number) {
  const clean = sanitizeForPdf(text ?? "-");
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;

  const ellipsis = "...";
  let end = clean.length;
  while (end > 1 && font.widthOfTextAtSize(`${clean.slice(0, end)}${ellipsis}`, size) > maxWidth) {
    end -= 1;
  }

  return `${clean.slice(0, end).trimEnd()}${ellipsis}`;
}

export function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
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
  try {
    return await readFile(watermarkPath);
  } catch {
    return null;
  }
}

export async function createReceiptPdfAssets(pdfDoc: PDFDocument): Promise<ReceiptPdfAssets> {
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const watermarkBytes = await loadWatermarkBytes();
  const watermarkImage = watermarkBytes ? await pdfDoc.embedPng(watermarkBytes) : null;

  return {
    regular,
    bold,
    watermarkImage,
  };
}

function drawWatermark(page: PDFPage, assets: ReceiptPdfAssets, innerX: number, innerW: number) {
  if (!assets.watermarkImage) return;

  const frameY = PAGE_MARGIN_Y + RECEIPT_PADDING;
  const frameH = A4_HEIGHT - 2 * (PAGE_MARGIN_Y + RECEIPT_PADDING);
  const native = assets.watermarkImage.scale(1);
  const scale = Math.min(
    (innerW * WATERMARK_MAX_WIDTH_RATIO) / native.width,
    (frameH * WATERMARK_MAX_HEIGHT_RATIO) / native.height,
  );

  const width = native.width * scale;
  const height = native.height * scale;
  const x = innerX + (innerW - width) / 2;
  const top = frameY + (frameH - height) / 2;

  page.drawImage(assets.watermarkImage, {
    x,
    y: A4_HEIGHT - top - height,
    width,
    height,
    opacity: WATERMARK_OPACITY,
  });
}

export function drawReceiptHeaderAndFrame(
  page: PDFPage,
  assets: ReceiptPdfAssets,
  config: ReceiptHeaderConfig,
  yStart: number,
  innerX = PAGE_MARGIN_X + RECEIPT_PADDING,
  innerW = INNER_WIDTH,
) {
  drawRectTop(page, PAGE_MARGIN_X, PAGE_MARGIN_Y, A4_WIDTH - PAGE_MARGIN_X * 2, A4_HEIGHT - PAGE_MARGIN_Y * 2);
  drawWatermark(page, assets, innerX, innerW);

  const topUnit = config.topUnit ?? DEFAULT_TOP_UNIT;
  const title = config.title ?? DEFAULT_TITLE;
  const subtitle = config.subtitle;

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

  drawTextAt(page, assets.bold, topUnit, titleAreaX, topUnitTop, topUnitSize);
  drawTextRight(page, assets.bold, config.headerDateLabel, metaRightX, topUnitTop, topUnitSize);
  drawCenteredText(page, assets.bold, title, titleAreaX, titleAreaW, titleTop, titleSize);
  drawCenteredText(page, assets.regular, subtitle, titleAreaX, titleAreaW, subtitleTop, subtitleSize);

  drawTextRight(page, assets.bold, `${config.documentLabel}: ${config.documentNumber}`, metaRightX, titleTop + 3, 9);
  drawTextRight(page, assets.bold, `Hora: ${config.createdTime}`, metaRightX, titleTop + 14, 9);

  const dividerY = yStart + 47;
  drawHorizontalLine(page, innerX, dividerY, innerW, 1);

  return { nextY: dividerY + 8, innerX, innerW };
}

export function drawField(
  page: PDFPage,
  assets: ReceiptPdfAssets,
  x: number,
  top: number,
  width: number,
  height: number,
  label: string,
  value: string,
) {
  drawRectTop(page, x, top, width, height);
  drawTextAt(page, assets.bold, label.toUpperCase(), x + 6, top + 4, 7);
  drawTextAt(page, assets.regular, fitOneLine(value, width - 12, assets.regular, 10), x + 6, top + 16, 10);
}

export function drawSectionTitle(
  page: PDFPage,
  assets: ReceiptPdfAssets,
  x: number,
  top: number,
  width: number,
  text: string,
) {
  drawRectTop(page, x, top, width, 16);
  drawTextAt(page, assets.bold, text.toUpperCase(), x + 6, top + 4, 8);
  return top + 20;
}

export function drawFieldMultiline(
  page: PDFPage,
  assets: ReceiptPdfAssets,
  x: number,
  top: number,
  width: number,
  label: string,
  value: string,
) {
  const lines = wrapText(normalizeReceiptValue(value), width - 12, assets.regular, 10);
  const lineHeight = 10;
  const height = Math.max(28, 20 + lines.length * lineHeight + 4);

  drawRectTop(page, x, top, width, height);
  drawTextAt(page, assets.bold, label.toUpperCase(), x + 6, top + 4, 7);
  lines.forEach((line, index) => {
    drawTextAt(page, assets.regular, line, x + 6, top + 16 + index * lineHeight, 10);
  });

  return top + height + 6;
}

export function drawAcknowledgementFooter(
  page: PDFPage,
  assets: ReceiptPdfAssets,
  startY: number,
  config: ReceiptAcknowledgementConfig,
  innerX = PAGE_MARGIN_X + RECEIPT_PADDING,
  innerW = INNER_WIDTH,
) {
  let y = startY + 8;
  y = drawSectionTitle(page, assets, innerX, y, innerW, config.sectionTitle ?? "Constancia");

  const bodyLines = wrapText(config.body, innerW - 12, assets.regular, 8).slice(0, 4);
  const constanciaH = Math.max(46, 12 + bodyLines.length * 10);
  drawRectTop(page, innerX, y, innerW, constanciaH);
  bodyLines.forEach((line, idx) => {
    drawTextAt(page, assets.regular, line, innerX + 6, y + 8 + idx * 10, 8);
  });
  y += constanciaH + 12;

  const signGap = 12;
  const signW = (innerW - signGap) / 2;
  const lineY = y + 26;
  drawHorizontalLine(page, innerX, lineY, signW, 1);
  drawHorizontalLine(page, innerX + signW + signGap, lineY, signW, 1);
  drawCenteredText(page, assets.bold, config.leftSignatureTitle, innerX, signW, lineY + 4, 9);
  drawCenteredText(page, assets.regular, config.leftSignatureName, innerX, signW, lineY + 16, 8);
  drawCenteredText(page, assets.bold, config.rightSignatureTitle, innerX + signW + signGap, signW, lineY + 4, 9);
  drawCenteredText(page, assets.regular, config.rightSignatureName, innerX + signW + signGap, signW, lineY + 16, 8);
  y = lineY + 34;

  if (config.leftStampTitle || config.rightStampTitle) {
    const stampGap = 12;
    const stampW = (innerW - stampGap) / 2;
    const stampH = 70;

    if (config.leftStampTitle) {
      drawCenteredText(page, assets.bold, config.leftStampTitle, innerX, stampW, y + 2, 8);
      drawRectTop(page, innerX, y + 12, stampW, stampH);
    }

    if (config.rightStampTitle) {
      drawCenteredText(page, assets.bold, config.rightStampTitle, innerX + stampW + stampGap, stampW, y + 2, 8);
      drawRectTop(page, innerX + stampW + stampGap, y + 12, stampW, stampH);
    }

    y += stampH + 20;
  } else {
    y += 10;
  }

  drawTextRight(page, assets.regular, config.footerNote, innerX + innerW - 2, y, 7, rgb(0.35, 0.35, 0.35));
  return y + 12;
}

export function drawReceiptPageNumber(page: PDFPage, assets: ReceiptPdfAssets, pageNumber: number, totalPages: number) {
  const label = `Hoja ${pageNumber}/${totalPages}`;
  const size = 8;
  const textWidth = assets.bold.widthOfTextAtSize(sanitizeForPdf(label), size);
  const x = A4_WIDTH - PAGE_MARGIN_X - RECEIPT_PADDING - textWidth;
  const top = A4_HEIGHT - PAGE_MARGIN_Y - 10;
  drawTextAt(page, assets.bold, label, x, top, size);
}
