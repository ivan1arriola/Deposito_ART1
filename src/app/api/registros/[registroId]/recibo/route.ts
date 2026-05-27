import { NextResponse } from "next/server";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Prisma } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { buildPersonaExternaEtiqueta, buildPersonalDestinatarioNombre, normalizeRecintoClase } from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import { prisma } from "@/lib/prisma";
import {
  MOVIMIENTO_TIPO_ASIGNACION,
  MOVIMIENTO_TIPO_DEVOLUCION,
  MOVIMIENTO_TIPO_ENTREGA,
} from "@/lib/tipo-movimiento";
import {
  A4_HEIGHT,
  CONTENT_BOTTOM,
  INNER_WIDTH,
  PAGE_MARGIN_Y,
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
  normalizeReceiptValue,
  wrapText,
} from "@/lib/server/receipt-pdf-layout";

const TABLE_HEADER_HEIGHT = 20;
const TABLE_MIN_ROW_HEIGHT = 18;
const TABLE_CELL_TEXT_SIZE = 10;
const TABLE_CELL_LINE_HEIGHT = 10;
const TABLE_CELL_TOP_PADDING = 5;
const TABLE_CELL_BOTTOM_PADDING = 3;
const TABLE_COL_QTY = 58;
const TABLE_COL_OBS = 140;
const TABLE_COL_EFECTO = INNER_WIDTH - TABLE_COL_QTY - TABLE_COL_OBS;
const FOOTER_RESERVE = 250;

type TableRow = {
  cantidad: string;
  efecto: string;
  observaciones: string;
};

type TableRowLayout = {
  cantidadLines: string[];
  efectoLines: string[];
  observacionesLines: string[];
  height: number;
};

type PageContext = {
  page: PDFPage;
  y: number;
  tableX: number;
  tableW: number;
};

function parseRegistroId(raw: string) {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

function layoutTableRow(row: TableRow, font: PDFFont): TableRowLayout {
  const cantidadLines = wrapText(normalizeReceiptValue(row.cantidad), TABLE_COL_QTY - 10, font, TABLE_CELL_TEXT_SIZE);
  const efectoLines = wrapText(normalizeReceiptValue(row.efecto), TABLE_COL_EFECTO - 10, font, TABLE_CELL_TEXT_SIZE);
  const observacionesLines = wrapText(normalizeReceiptValue(row.observaciones), TABLE_COL_OBS - 10, font, TABLE_CELL_TEXT_SIZE);

  const lineCount = Math.max(cantidadLines.length, efectoLines.length, observacionesLines.length, 1);
  const height = Math.max(
    TABLE_MIN_ROW_HEIGHT,
    TABLE_CELL_TOP_PADDING + TABLE_CELL_BOTTOM_PADDING + lineCount * TABLE_CELL_LINE_HEIGHT,
  );

  return {
    cantidadLines,
    efectoLines,
    observacionesLines,
    height,
  };
}

function drawTableHeader(page: PDFPage, assets: Awaited<ReturnType<typeof createReceiptPdfAssets>>, x: number, top: number, width: number) {
  drawRectTop(page, x, top, width, TABLE_HEADER_HEIGHT);
  drawTextAt(page, assets.bold, "CANT.", x + 6, top + 5, 8);
  drawTextAt(page, assets.bold, "EFECTO", x + TABLE_COL_QTY + 6, top + 5, 8);
  drawTextAt(page, assets.bold, "OBSERVACIONES", x + TABLE_COL_QTY + TABLE_COL_EFECTO + 6, top + 5, 8);
  return top + TABLE_HEADER_HEIGHT;
}

function drawTableRow(
  page: PDFPage,
  assets: Awaited<ReturnType<typeof createReceiptPdfAssets>>,
  x: number,
  top: number,
  row: TableRow,
  layout: TableRowLayout,
) {
  drawRectTop(page, x, top, INNER_WIDTH, layout.height);
  page.drawLine({
    start: { x: x + TABLE_COL_QTY, y: A4_HEIGHT - top },
    end: { x: x + TABLE_COL_QTY, y: A4_HEIGHT - top - layout.height },
    thickness: 1,
    color: rgb(0, 0, 0),
  });
  page.drawLine({
    start: { x: x + TABLE_COL_QTY + TABLE_COL_EFECTO, y: A4_HEIGHT - top },
    end: { x: x + TABLE_COL_QTY + TABLE_COL_EFECTO, y: A4_HEIGHT - top - layout.height },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  layout.cantidadLines.forEach((line, index) => {
    drawTextAt(page, assets.regular, line, x + 6, top + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT, TABLE_CELL_TEXT_SIZE);
  });
  layout.efectoLines.forEach((line, index) => {
    drawTextAt(
      page,
      assets.regular,
      line,
      x + TABLE_COL_QTY + 6,
      top + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
      TABLE_CELL_TEXT_SIZE,
    );
  });
  layout.observacionesLines.forEach((line, index) => {
    drawTextAt(
      page,
      assets.regular,
      line,
      x + TABLE_COL_QTY + TABLE_COL_EFECTO + 6,
      top + TABLE_CELL_TOP_PADDING + index * TABLE_CELL_LINE_HEIGHT,
      TABLE_CELL_TEXT_SIZE,
    );
  });

  return top + layout.height;
}

const registroReciboInclude = {
  usuarioEntrega: {
    select: {
      username: true,
      nombre: true,
      apellido: true,
      rango: {
        select: {
          abreviacion: true,
        },
      },
    },
  },
  destinatarioPersonal: {
    include: {
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
    },
  },
  destinatarioExterno: {
    select: {
      personaExterna: {
        select: {
          ci: true,
          grado: true,
          nombre: true,
          apellido: true,
          unidadDestino: true,
        },
      },
    },
  },
  destinatarioRecinto: {
    select: {
      clase: true,
      nombre: true,
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

export async function GET(request: Request, context: { params: Promise<{ registroId: string }> }) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { registroId: registroIdParam } = await context.params;
  const registroId = parseRegistroId(registroIdParam);
  if (!registroId) {
    return NextResponse.json({ error: "registroId invalido." }, { status: 400 });
  }

  await ensureMovimientoDestinatarioRecintoCompatibility();

  const registro = await prisma.movimiento.findUnique({
    where: { movimientoId: registroId },
    include: registroReciboInclude,
  });

  if (
    !registro ||
    (registro.tipo !== MOVIMIENTO_TIPO_ENTREGA &&
      registro.tipo !== MOVIMIENTO_TIPO_DEVOLUCION &&
      registro.tipo !== MOVIMIENTO_TIPO_ASIGNACION)
  ) {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  const isRecinto = Boolean(registro.destinatarioRecinto);
  const isExterno = Boolean(registro.destinatarioExterno);
  const now = new Date();
  const documentPrefix =
    registro.tipo === MOVIMIENTO_TIPO_ENTREGA ? "ER" : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "DR" : "AR";
  const documentNumber = `${documentPrefix}-${registro.movimientoId.toString().padStart(8, "0")}`;
  const tipoLabel =
    registro.tipo === MOVIMIENTO_TIPO_ENTREGA ? "Entrega" : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "Devolución" : "Asignación";
  const subtitle = `${tipoLabel} ${isRecinto ? "a recinto" : isExterno ? "a externo" : "a personal"}`;
  const fechaMovimiento = formatDateOnlyFromDate(registro.fecha) ?? "-";
  const usuarioEntregaLabel =
    `${registro.usuarioEntrega.rango?.abreviacion ?? ""} ${registro.usuarioEntrega.apellido}, ${registro.usuarioEntrega.nombre}`
      .replace(/\s+/g, " ")
      .trim() || registro.usuarioEntrega.username;

  const destinatarioLabel = isRecinto
    ? registro.destinatarioRecinto?.nombre ?? "Recinto no definido"
    : isExterno
      ? registro.destinatarioExterno?.personaExterna
        ? buildPersonaExternaEtiqueta(registro.destinatarioExterno.personaExterna)
        : "Destinatario externo no definido"
    : registro.destinatarioPersonal?.personal
      ? `${registro.destinatarioPersonal.personal.rango.abreviacion} ${buildPersonalDestinatarioNombre(registro.destinatarioPersonal.personal)}`
          .replace(/\s+/g, " ")
          .trim()
      : "Destinatario no definido";

  const recintoClase = registro.destinatarioRecinto ? normalizeRecintoClase(registro.destinatarioRecinto.clase) : null;
  const destinoDetalle = isRecinto
    ? recintoClase === "EXTERNO"
      ? "Fuera de la Unidad"
      : "Dentro de la Unidad"
    : isExterno
      ? registro.destinatarioExterno?.personaExterna
        ? `CI ${formatUruguayanCi(registro.destinatarioExterno.personaExterna.ci)} | ${registro.destinatarioExterno.personaExterna.unidadDestino}`
        : "-"
    : registro.destinatarioPersonal?.personal
      ? `CI ${formatUruguayanCi(registro.destinatarioPersonal.personal.ci)}${
          registro.destinatarioPersonal.personal.subalterno?.bateria?.nombre
            ? ` | Batería ${registro.destinatarioPersonal.personal.subalterno.bateria.nombre}`
            : ""
        }`
      : "-";

  const destinatarioFinalLabel = isRecinto 
    ? `${registro.destinatarioRecinto?.nombre ?? "Recinto no definido"} - ${destinoDetalle}`
    : destinatarioLabel;

  const tableRows = registro.items.map((item) => ({
    cantidad: String(item.cantidad),
    efecto: item.item.nombre,
    observaciones: registro.observaciones ?? "-",
  }));

  const pdfDoc = await PDFDocument.create();
  const assets = await createReceiptPdfAssets(pdfDoc);
  const pages: PDFPage[] = [];

  const beginPage = () => {
    const page = pdfDoc.addPage([210 * 2.834645669, 297 * 2.834645669]);
    pages.push(page);
    const header = drawReceiptHeaderAndFrame(
      page,
      assets,
      {
        subtitle,
        documentLabel: "Recibo",
        documentNumber,
        createdDate: formatDateUy(now),
        createdTime: formatTimeUy(now),
        headerDateLabel: `Montevideo, ${formatLongDateUy(now)}`,
      },
      PAGE_MARGIN_Y + 10,
    );

    let y = header.nextY;
    drawField(page, assets, header.innerX, y, 150, 30, "Tipo", tipoLabel);
    drawField(page, assets, header.innerX + 156, y, 120, 30, "Fecha del movimiento", fechaMovimiento);
    drawField(page, assets, header.innerX + 282, y, header.innerW - 282, 30, "Registrado por", usuarioEntregaLabel);
    y += 36;

    y = drawFieldMultiline(
      page,
      assets,
      header.innerX,
      y,
      header.innerW,
      isRecinto ? "Destino" : isExterno ? "Destinatario externo" : "Destinatario",
      destinatarioFinalLabel,
    );

    if (!isRecinto) {
      const ciValue = isExterno
        ? registro.destinatarioExterno?.personaExterna?.ci
        : registro.destinatarioPersonal?.personal?.ci;

      if (ciValue) {
        drawField(page, assets, header.innerX, y, 150, 30, "Cédula de identidad", formatUruguayanCi(ciValue));

        const detailValue = isExterno
          ? registro.destinatarioExterno?.personaExterna?.unidadDestino ?? "-"
          : registro.destinatarioPersonal?.personal?.subalterno?.bateria?.nombre
            ? `Batería ${registro.destinatarioPersonal.personal.subalterno.bateria.nombre}`
            : "-";

        drawField(
          page,
          assets,
          header.innerX + 156,
          y,
          header.innerW - 156,
          30,
          isExterno ? "Unidad de destino" : "Detalle",
          detailValue,
        );
      } else {
        drawField(page, assets, header.innerX, y, header.innerW, 30, "Detalle", destinoDetalle);
      }
      y += 36;
    }

    y = drawFieldMultiline(page, assets, header.innerX, y, header.innerW, "Comentarios", registro.observaciones ?? "-");
    y = drawSectionTitle(
      page,
      assets,
      header.innerX,
      y,
      header.innerW,
      registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "Equipos devueltos" : "Equipos entregados",
    );
    y = drawTableHeader(page, assets, header.innerX, y, header.innerW);

    return {
      page,
      y,
      tableX: header.innerX,
      tableW: header.innerW,
    } satisfies PageContext;
  };

  let current = beginPage();
  for (const row of tableRows) {
    const layout = layoutTableRow(row, assets.regular);
    if (current.y + layout.height + FOOTER_RESERVE > CONTENT_BOTTOM) {
      current = beginPage();
    }
    current.y = drawTableRow(current.page, assets, current.tableX, current.y, row, layout);
  }

  const footerBody =
    registro.tipo === MOVIMIENTO_TIPO_ENTREGA
      ? `Se deja constancia que el Depósito General hace entrega de los efectos detallados a ${destinatarioLabel}, según lo asentado en el presente recibo.`
      : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION
        ? `Se deja constancia que el Depósito General recibe la devolución de los efectos detallados desde ${destinatarioLabel}, según lo asentado en el presente recibo.`
        : `Se deja constancia que el Depósito General registra la asignación de los efectos detallados a ${destinatarioLabel}, según lo asentado en el presente recibo.`;

  drawAcknowledgementFooter(current.page, assets, Math.max(current.y + 12, CONTENT_BOTTOM - FOOTER_RESERVE + 12), {
    body: footerBody,
    leftSignatureTitle:
      registro.tipo === MOVIMIENTO_TIPO_ENTREGA
        ? "Entrega"
        : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION
          ? "Recibe devolución"
          : "Registra asignación",
    leftSignatureName: usuarioEntregaLabel,
    rightSignatureTitle: isRecinto ? "Superior responsable" : isExterno ? "Recibe asignación" : "Recibe",
    rightSignatureName: destinatarioLabel,
    footerNote: `Generado: ${formatDateUy(now)} ${formatTimeUy(now)}`,
    sectionTitle: "Constancia",
  });

  pages.forEach((page, index) => {
    drawReceiptPageNumber(page, assets, index + 1, pages.length);
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"Recibo_${documentNumber}.pdf\"`,
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
