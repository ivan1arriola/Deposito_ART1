import { NextResponse } from "next/server";
import { TipoMovimiento, type Prisma } from "@/generated/prisma/client";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { authorizeRequest } from "@/lib/auth";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { rangoAbreviacionLabel } from "@/lib/formatters";
import {
  buildPersonaExternaNombre,
  buildPersonalDestinatarioNombre,
} from "@/lib/movimiento-destinatario";
import { prisma } from "@/lib/prisma";
import {
  A4_HEIGHT,
  A4_WIDTH,
  CONTENT_BOTTOM,
  INNER_WIDTH,
  PAGE_MARGIN_X,
  PAGE_MARGIN_Y,
  RECEIPT_PADDING,
  createReceiptPdfAssets,
  drawAcknowledgementFooter,
  drawField,
  drawFieldMultiline,
  drawReceiptHeaderAndFrame,
  drawReceiptPageNumber,
  drawRectTop,
  drawSectionTitle,
  drawTextAt,
  formatDateUy,
  formatLongDateUy,
  formatTimeUy,
  militaryShortLabel,
  normalizeReceiptValue,
  toPrintUppercase,
  wrapText,
} from "@/lib/server/receipt-pdf-layout";

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

function normalizeCellValue(value: string | null | undefined) {
  return normalizeReceiptValue(value);
}

function layoutTableRow(row: TableRow, font: PDFFont): TableRowLayout {
  const efectoLines = wrapText(
    normalizeCellValue(row.efecto),
    TABLE_COL_EFECTO - 10,
    font,
    TABLE_CELL_TEXT_SIZE
  );
  const cantidadLines = wrapText(
    normalizeCellValue(row.cantidad),
    TABLE_COL_QTY - 10,
    font,
    TABLE_CELL_TEXT_SIZE
  );
  const estadoLines = wrapText(
    normalizeCellValue(row.estado),
    TABLE_COL_ESTADO - 10,
    font,
    TABLE_CELL_TEXT_SIZE
  );
  const observacionesLines = wrapText(
    normalizeCellValue(row.observaciones),
    TABLE_COL_OBS - 10,
    font,
    TABLE_CELL_TEXT_SIZE
  );

  const lineCount = Math.max(
    efectoLines.length,
    cantidadLines.length,
    estadoLines.length,
    observacionesLines.length,
    1
  );
  const height = Math.max(
    TABLE_MIN_ROW_HEIGHT,
    TABLE_CELL_TOP_PADDING + TABLE_CELL_BOTTOM_PADDING + lineCount * TABLE_CELL_LINE_HEIGHT
  );

  return {
    cantidadLines,
    efectoLines,
    estadoLines,
    observacionesLines,
    height,
  };
}
const prestamoReciboInclude = {
  destinatarioPersonal: {
    include: {
      personal: {
        include: {
          rango: {
            select: {
              abreviacion: true,
            },
          },
          bateria: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  },
  destinatarioExterno: {
    include: {
      personaExterna: true,
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
  equipos: {
    include: {
      equipo: {
        select: {
          nombre: true,
          ordenPdf: true,
        },
      },
    },
    orderBy: {
      equipo: {
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
    return NextResponse.json({ error: "Préstamo no encontrado." }, { status: 404 });
  }

  const reciboNumero =
    prestamo.prestamoHistorial?.reciboNumero ??
    prestamo.prestamoActivo?.reciboNumero ??
    `PR-${prestamo.movimientoId.toString().padStart(8, "0")}`;

  const fechaPrestamo = formatDateOnlyFromDate(prestamo.fecha) ?? "-";
  const fechaDevolucion =
    formatDateOnlyFromDate(prestamo.prestamoHistorial?.fechaDevolucion) ?? "Pendiente";
  const fechaEstimadaDevolucion =
    prestamo.prestamoHistorial?.fechaEstimadaDevolucionTexto ??
    prestamo.prestamoActivo?.fechaEstimadaDevolucionTexto ??
    "-";

  const fechaRecibo = formatDateUy(prestamo.createdAt);
  const horaRecibo = formatTimeUy(prestamo.createdAt);
  const fechaImpresionCabecera = `Montevideo, ${formatLongDateUy(new Date())}`;
  const now = new Date();
  const fechaImpresion = `${formatDateUy(now)} ${formatTimeUy(now)}`;

  const destinatarioPersonal = prestamo.destinatarioPersonal?.personal ?? null;
  const destinatarioExterno = prestamo.destinatarioExterno?.personaExterna ?? null;
  const clasePrestamo = destinatarioPersonal
    ? "INTERNO"
    : destinatarioExterno
      ? "EXTERNO"
      : "PENDIENTE";
  const isPendiente = clasePrestamo === "PENDIENTE";

  const destinatarioNombre = isPendiente
    ? ""
    : destinatarioPersonal
      ? buildPersonalDestinatarioNombre(destinatarioPersonal)
      : destinatarioExterno
        ? buildPersonaExternaNombre(destinatarioExterno)
        : "Pendiente de completar";
  const destinatarioGrado = isPendiente
    ? ""
    : (destinatarioPersonal?.rango.abreviacion ?? destinatarioExterno?.grado ?? "-");
  const destinatarioCi = isPendiente
    ? ""
    : destinatarioPersonal?.ci || destinatarioExterno?.ci
      ? formatUruguayanCi(destinatarioPersonal?.ci ?? destinatarioExterno?.ci ?? "")
      : "-";
  const tercerCampoLabel = clasePrestamo === "INTERNO" ? "Batería" : "Unidad";
  const tercerCampoValor = isPendiente
    ? ""
    : (destinatarioExterno?.unidadDestino ?? destinatarioPersonal?.bateria?.nombre ?? "No aplica");
  const observaciones = prestamo.observaciones?.trim() || "-";

  const entregaLabel = militaryShortLabel(
    rangoAbreviacionLabel(prestamo.usuarioEntrega.rango, ""),
    prestamo.usuarioEntrega.apellido,
    prestamo.usuarioEntrega.nombre
  );
  const destinatarioFirmaLabel = destinatarioPersonal
    ? militaryShortLabel(
        destinatarioPersonal.rango.abreviacion,
        destinatarioPersonal.apellido1,
        destinatarioPersonal.nombre1
      )
    : destinatarioExterno
      ? `${destinatarioExterno.grado} ${destinatarioExterno.apellido}`.replace(/\s+/g, " ").trim()
      : "";
  const recibeLabel = prestamo.prestamoHistorial?.usuarioRecibeDevolucion
    ? militaryShortLabel(
        rangoAbreviacionLabel(prestamo.prestamoHistorial.usuarioRecibeDevolucion.rango, ""),
        prestamo.prestamoHistorial.usuarioRecibeDevolucion.apellido,
        prestamo.prestamoHistorial.usuarioRecibeDevolucion.nombre
      )
    : destinatarioFirmaLabel;

  const rows: TableRow[] = prestamo.equipos.map((equipo) => ({
    cantidad: String(equipo.cantidad),
    efecto: toPrintUppercase(equipo.equipo.nombre),
    estado: equipo.estadoDevolucion ?? equipo.estadoEntrega,
    observaciones: equipo.comentarioDevolucion?.trim() || equipo.comentarioEntrega?.trim() || "-",
  }));

  const pdfDoc = await PDFDocument.create();
  const assets = await createReceiptPdfAssets(pdfDoc);
  const { regular, bold } = assets;

  const pages: PageContext[] = [];

  function startPage(continuation: boolean) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const innerX = PAGE_MARGIN_X + RECEIPT_PADDING;
    const innerW = INNER_WIDTH;
    const top0 = PAGE_MARGIN_Y + RECEIPT_PADDING;

    const header = drawReceiptHeaderAndFrame(
      page,
      assets,
      {
        subtitle: "RECIBO DE PRÉSTAMO",
        documentLabel: "Recibo N.o",
        documentNumber: reciboNumero,
        createdDate: fechaRecibo,
        createdTime: horaRecibo,
        headerDateLabel: fechaImpresionCabecera,
      },
      top0,
      innerX,
      innerW
    );
    let y = header.nextY;

    if (!continuation) {
      const gap = 8;
      const boxH = 30;
      const row2H = 30;
      const col3 = (innerW - gap * 2) * 0.25;
      const col6 = innerW - col3 * 2 - gap * 2;

      drawField(page, assets, innerX, y, col3, boxH, "Grado", destinatarioGrado);
      drawField(page, assets, innerX + col3 + gap, y, col3, boxH, "C.I.", destinatarioCi);
      drawField(
        page,
        assets,
        innerX + col3 * 2 + gap * 2,
        y,
        col6,
        boxH,
        tercerCampoLabel,
        tercerCampoValor
      );
      y += boxH + 6;

      drawField(page, assets, innerX, y, innerW, row2H, "Nombre", destinatarioNombre);
      y += row2H + 8;

      y = drawSectionTitle(page, assets, innerX, y, innerW, "Datos del préstamo");

      const col4 = (innerW - gap * 2) / 3;
      drawField(page, assets, innerX, y, col4, boxH, "Fecha de entrega", fechaPrestamo);
      drawField(
        page,
        assets,
        innerX + col4 + gap,
        y,
        col4,
        boxH,
        "Fecha de devolución",
        fechaDevolucion
      );
      drawField(
        page,
        assets,
        innerX + col4 * 2 + gap * 2,
        y,
        col4,
        boxH,
        "Fecha estimada devolución",
        fechaEstimadaDevolucion
      );
      y += boxH + 6;

      y = drawFieldMultiline(page, assets, innerX, y, innerW, "Observaciones", observaciones);
    }

    y = drawSectionTitle(
      page,
      assets,
      innerX,
      y,
      innerW,
      continuation ? "Detalle de equipo prestados (continuacion)" : "Detalle de equipo prestados"
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

    const header = drawReceiptHeaderAndFrame(
      page,
      assets,
      {
        subtitle: "RECIBO DE PRÉSTAMO",
        documentLabel: "Recibo N.o",
        documentNumber: reciboNumero,
        createdDate: fechaRecibo,
        createdTime: horaRecibo,
        headerDateLabel: fechaImpresionCabecera,
      },
      top0,
      innerX,
      innerW
    );
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
      start: {
        x: ctx.tableX + ctx.colEfecto + ctx.colQty + ctx.colEstado,
        y: A4_HEIGHT - ctx.y - layout.height,
      },
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
        TABLE_CELL_TEXT_SIZE
      );
    });
    layout.cantidadLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE
      );
    });
    layout.estadoLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + ctx.colQty + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE
      );
    });
    layout.observacionesLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colEfecto + ctx.colQty + ctx.colEstado + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE
      );
    });
    ctx.y += layout.height;
  }

  function drawEmptyRow(ctx: PageContext) {
    drawTableRow(
      ctx,
      layoutTableRow({ cantidad: "", efecto: "", estado: "", observaciones: "" }, regular)
    );
  }

  function drawClosingBlock(ctx: PageContext) {
    drawAcknowledgementFooter(ctx.page, assets, ctx.y, {
      body: "El militar que recibe deja constancia de haber retirado los efectos detallados, en el estado indicado, comprometiendose a su adecuada conservacion y devolución cuando le sea requerida.",
      leftSignatureTitle: "Firma de quien entrega",
      leftSignatureName: entregaLabel,
      rightSignatureTitle: "Firma de quien recibe",
      rightSignatureName: recibeLabel,
      leftStampTitle: "SELLO DE ENTREGA",
      rightStampTitle: "SELLO DE DEVOLUCIÓN",
      footerNote: `Documento interno de control de préstamo de efectos. Impreso: ${fechaImpresion}`,
    });
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
    drawReceiptPageNumber(pageCtx.page, assets, index + 1, totalPages);
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
