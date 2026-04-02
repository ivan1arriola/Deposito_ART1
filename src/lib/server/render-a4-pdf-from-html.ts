import "server-only";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type RenderA4PdfOptions = {
  cookieHeader?: string | null;
  pageNumbersIfMultipage?: boolean;
  pageNumberLabel?: string;
};

async function openChromium() {
  const [{ default: chromium }, playwright] = await Promise.all([
    import("@sparticuz/chromium"),
    import("playwright-core"),
  ]);

  const executablePath = await chromium.executablePath();
  return playwright.chromium.launch({
    args: chromium.args,
    executablePath,
    headless: true,
  });
}

export async function renderA4PdfFromHtml(html: string): Promise<Uint8Array> {
  const browser = await openChromium();

  try {
    const page = await browser.newPage();
    await page.emulateMedia({ media: "print" });
    await page.setContent(html, { waitUntil: "networkidle" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
  } finally {
    await browser.close();
  }
}

async function addPageNumbersIfMultipage(
  pdfBytes: Uint8Array,
  pageNumberLabel: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  if (totalPages <= 1) {
    return pdfBytes;
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;
  const marginRight = 10;
  const baselineY = 6;

  for (let index = 0; index < totalPages; index += 1) {
    const page = pages[index];
    const text = `${pageNumberLabel} ${index + 1} de ${totalPages}`;
    const width = page.getWidth();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const x = Math.max(6, width - textWidth - marginRight);
    page.drawText(text, {
      x,
      y: baselineY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
  }

  return pdfDoc.save();
}

export async function renderA4PdfFromUrl(url: string, options: RenderA4PdfOptions = {}): Promise<Uint8Array> {
  const browser = await openChromium();

  try {
    const page = await browser.newPage();
    if (options.cookieHeader && options.cookieHeader.trim() !== "") {
      await page.setExtraHTTPHeaders({ cookie: options.cookieHeader });
    }

    await page.emulateMedia({ media: "print" });
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });

    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });

    if (options.pageNumbersIfMultipage) {
      return addPageNumbersIfMultipage(pdfBytes, options.pageNumberLabel ?? "hoja");
    }

    return pdfBytes;
  } finally {
    await browser.close();
  }
}
