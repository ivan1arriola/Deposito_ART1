import { NextResponse } from "next/server";
import { type Prisma } from "@/generated/prisma/client";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { authorizeRequest } from "@/lib/auth";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
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
  fullName,
  militaryShortLabel,
  normalizeReceiptValue,
  toPrintUppercase,
  wrapText,
} from "@/lib/server/receipt-pdf-layout";

const CLOSING_BLOCK_RESERVE = 236;
const TABLE_HEADER_HEIGHT = 20;
const TABLE_MIN_ROW_HEIGHT = 18;
const TABLE_CELL_TEXT_SIZE = 10;
const TABLE_CELL_LINE_HEIGHT = 10;
const TABLE_CELL_TOP_PADDING = 5;
const TABLE_CELL_BOTTOM_PADDING = 3;
const TABLE_COL_QTY = 58;
const TABLE_COL_TIPO = 112;
const TABLE_COL_ARTICULO = INNER_WIDTH - TABLE_COL_QTY - TABLE_COL_TIPO;

type TableRow = {
  articulo: string;
  tipo: string;
  cantidad: string;
};

type TableRowLayout = {
  articuloLines: string[];
  tipoLines: string[];
  cantidadLines: string[];
  height: number;
};

type PageContext = {
  page: PDFPage;
  y: number;
  tableX: number;
  tableW: number;
  colArticulo: number;
  colTipo: number;
  colQty: number;
};

function parseEntregaId(raw: string) {
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
  const articuloLines = wrapText(normalizeCellValue(row.articulo), TABLE_COL_ARTICULO - 10, font, TABLE_CELL_TEXT_SIZE);
  const tipoLines = wrapText(normalizeCellValue(row.tipo), TABLE_COL_TIPO - 10, font, TABLE_CELL_TEXT_SIZE);
  const cantidadLines = wrapText(normalizeCellValue(row.cantidad), TABLE_COL_QTY - 10, font, TABLE_CELL_TEXT_SIZE);

  const lineCount = Math.max(articuloLines.length, tipoLines.length, cantidadLines.length, 1);
  const height = Math.max(
    TABLE_MIN_ROW_HEIGHT,
    TABLE_CELL_TOP_PADDING + TABLE_CELL_BOTTOM_PADDING + lineCount * TABLE_CELL_LINE_HEIGHT,
  );

  return {
    articuloLines,
    tipoLines,
    cantidadLines,
    height,
  };
}

const entregaConstanciaInclude = {
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
  ordenante: {
    include: {
      rango: {
        select: {
          abreviacion: true,
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
  movimientosStock: {
    include: {
      articulo: {
        select: {
          nombre: true,
          tipo: true,
        },
      },
    },
    orderBy: {
      articulo: {
        nombre: "asc",
      },
    },
  },
} satisfies Prisma.ArticuloEntregaPersonalInclude;

export async function GET(request: Request, context: { params: Promise<{ entregaId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { entregaId: entregaIdParam } = await context.params;
  const entregaId = parseEntregaId(entregaIdParam);
  if (!entregaId) {
    return NextResponse.json({ error: "entregaId invalido." }, { status: 400 });
  }

  const entrega = await prisma.articuloEntregaPersonal.findUnique({
    where: { articuloEntregaPersonalId: entregaId },
    include: entregaConstanciaInclude,
  });

  if (!entrega) {
    return NextResponse.json({ error: "Entrega no encontrada." }, { status: 404 });
  }

  const constanciaNumero = `EA-${entrega.articuloEntregaPersonalId.toString().padStart(8, "0")}`;
  const fechaEntrega = formatDateOnlyFromDate(entrega.fecha) ?? "-";
  const fechaRegistro = formatDateUy(entrega.createdAt);
  const horaRegistro = formatTimeUy(entrega.createdAt);
  const fechaImpresionCabecera = `Montevideo, ${formatLongDateUy(new Date())}`;
  const now = new Date();
  const fechaImpresion = `${formatDateUy(now)} ${formatTimeUy(now)}`;

  const destinatarioNombre = fullName(
    entrega.personal.apellido1,
    entrega.personal.apellido2,
    entrega.personal.nombre1,
    entrega.personal.nombre2,
  );
  const destinatarioGrado = entrega.personal.rango.abreviacion;
  const destinatarioCi = formatUruguayanCi(entrega.personal.ci);
  const bateria = entrega.personal.subalterno?.bateria?.nombre ?? "No aplica";
  const destinatarioFirmaLabel = militaryShortLabel(
    entrega.personal.rango.abreviacion,
    entrega.personal.apellido1,
    entrega.personal.nombre1,
  );

  const ordenanteLabel = `${entrega.ordenante.rango.abreviacion} ${fullName(
    entrega.ordenante.apellido1,
    entrega.ordenante.apellido2,
    entrega.ordenante.nombre1,
    entrega.ordenante.nombre2,
  )}`.replace(/\s+/g, " ").trim();
  const usuarioEntregaLabel = `${entrega.usuarioEntrega.rango.abreviacion} ${entrega.usuarioEntrega.apellido}, ${entrega.usuarioEntrega.nombre}`.replace(
    /\s+/g,
    " ",
  ).trim();
  const entregaFirmaLabel = militaryShortLabel(
    entrega.usuarioEntrega.rango.abreviacion,
    entrega.usuarioEntrega.apellido,
    entrega.usuarioEntrega.nombre,
  );
  const observaciones = entrega.comentario?.trim() || "-";

  const rows: TableRow[] = entrega.movimientosStock.map((movimiento) => ({
    articulo: toPrintUppercase(movimiento.articulo.nombre),
    tipo: toPrintUppercase(movimiento.articulo.tipo),
    cantidad: String(movimiento.cantidad),
  }));

  const totalArticulos = rows.length;
  const totalUnidades = entrega.movimientosStock.reduce((total, movimiento) => total + movimiento.cantidad, 0);

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
        subtitle: "CONSTANCIA DE ENTREGA DE ARTÍCULOS",
        documentLabel: "Constancia N.o",
        documentNumber: constanciaNumero,
        createdDate: fechaRegistro,
        createdTime: horaRegistro,
        headerDateLabel: fechaImpresionCabecera,
      },
      top0,
      innerX,
      innerW,
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
      drawField(page, assets, innerX + col3 * 2 + gap * 2, y, col6, boxH, "Bateria", bateria);
      y += boxH + 6;

      drawField(page, assets, innerX, y, innerW, row2H, "Nombre", destinatarioNombre);
      y += row2H + 8;

      y = drawSectionTitle(page, assets, innerX, y, innerW, "Datos de la entrega");

      const col4 = (innerW - gap * 2) / 3;
      drawField(page, assets, innerX, y, col4, boxH, "Fecha de entrega", fechaEntrega);
      drawField(page, assets, innerX + col4 + gap, y, col4, boxH, "Total articulos", String(totalArticulos));
      drawField(page, assets, innerX + col4 * 2 + gap * 2, y, col4, boxH, "Total unidades", String(totalUnidades));
      y += boxH + 6;

      const halfW = (innerW - gap) / 2;
      drawField(page, assets, innerX, y, halfW, boxH, "Ordenado por", ordenanteLabel);
      drawField(page, assets, innerX + halfW + gap, y, halfW, boxH, "Registrado por", usuarioEntregaLabel);
      y += boxH + 6;

      y = drawFieldMultiline(page, assets, innerX, y, innerW, "Observaciones", observaciones);
    }

    y = drawSectionTitle(
      page,
      assets,
      innerX,
      y,
      innerW,
      continuation ? "Detalle de articulos entregados (continuacion)" : "Detalle de articulos entregados",
    );

    const tableX = innerX;
    const tableW = innerW;
    const colArticulo = TABLE_COL_ARTICULO;
    const colTipo = TABLE_COL_TIPO;
    const colQty = TABLE_COL_QTY;

    drawRectTop(page, tableX, y, tableW, TABLE_HEADER_HEIGHT);
    page.drawLine({
      start: { x: tableX + colArticulo, y: A4_HEIGHT - y - TABLE_HEADER_HEIGHT },
      end: { x: tableX + colArticulo, y: A4_HEIGHT - y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: tableX + colArticulo + colTipo, y: A4_HEIGHT - y - TABLE_HEADER_HEIGHT },
      end: { x: tableX + colArticulo + colTipo, y: A4_HEIGHT - y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    drawTextAt(page, bold, "ARTÍCULO", tableX + 8, y + 6, 8);
    drawTextAt(page, bold, "TIPO", tableX + colArticulo + 8, y + 6, 8);
    drawTextAt(page, bold, "CANTIDAD", tableX + colArticulo + colTipo + 8, y + 6, 8);

    y += TABLE_HEADER_HEIGHT;

    const pageContext: PageContext = {
      page,
      y,
      tableX,
      tableW,
      colArticulo,
      colTipo,
      colQty,
    };
    pages.push(pageContext);
    return pageContext;
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
        subtitle: "CONSTANCIA DE ENTREGA DE ARTÍCULOS",
        documentLabel: "Constancia N.o",
        documentNumber: constanciaNumero,
        createdDate: fechaRegistro,
        createdTime: horaRegistro,
        headerDateLabel: fechaImpresionCabecera,
      },
      top0,
      innerX,
      innerW,
    );
    const pageContext: PageContext = {
      page,
      y: header.nextY,
      tableX: innerX,
      tableW: innerW,
      colArticulo: 0,
      colTipo: 0,
      colQty: 0,
    };
    pages.push(pageContext);
    return pageContext;
  }

  function drawTableRow(ctx: PageContext, layout: TableRowLayout) {
    drawRectTop(ctx.page, ctx.tableX, ctx.y, ctx.tableW, layout.height);
    ctx.page.drawLine({
      start: { x: ctx.tableX + ctx.colArticulo, y: A4_HEIGHT - ctx.y - layout.height },
      end: { x: ctx.tableX + ctx.colArticulo, y: A4_HEIGHT - ctx.y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });
    ctx.page.drawLine({
      start: { x: ctx.tableX + ctx.colArticulo + ctx.colTipo, y: A4_HEIGHT - ctx.y - layout.height },
      end: { x: ctx.tableX + ctx.colArticulo + ctx.colTipo, y: A4_HEIGHT - ctx.y },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    layout.articuloLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    layout.tipoLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colArticulo + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    layout.cantidadLines.forEach((line, index) => {
      drawTextAt(
        ctx.page,
        regular,
        line,
        ctx.tableX + ctx.colArticulo + ctx.colTipo + 8,
        ctx.y + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
        TABLE_CELL_TEXT_SIZE,
      );
    });
    ctx.y += layout.height;
  }

  function drawEmptyRow(ctx: PageContext) {
    drawTableRow(ctx, layoutTableRow({ articulo: "", tipo: "", cantidad: "" }, regular));
  }

  function drawClosingBlock(ctx: PageContext) {
    drawAcknowledgementFooter(ctx.page, assets, ctx.y, {
      body:
        "El militar que recibe deja constancia de haber recibido los articulos detallados, conformes a la presente entrega, para su uso institucional y bajo su responsabilidad.",
      leftSignatureTitle: "Firma de quien entrega",
      leftSignatureName: entregaFirmaLabel,
      rightSignatureTitle: "Firma de quien recibe",
      rightSignatureName: destinatarioFirmaLabel,
      leftStampTitle: "SELLO DE ENTREGA",
      rightStampTitle: "CONFORMIDAD / OBSERVACIONES",
      footerNote: `Documento interno de control de entrega de articulos. Impreso: ${fechaImpresion}`,
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
  pages.forEach((pageContext, index) => {
    drawReceiptPageNumber(pageContext.page, assets, index + 1, totalPages);
  });

  const pdfBytes = await pdfDoc.save();
  const buffer = Buffer.from(pdfBytes);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Constancia_${constanciaNumero}.pdf"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "no-store",
    },
  });
}
