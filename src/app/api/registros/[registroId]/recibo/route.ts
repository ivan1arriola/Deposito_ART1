import { NextResponse } from "next/server";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Prisma } from "@/generated/prisma/client";
import { authorizeRequest } from "@/lib/auth";
import { formatUruguayanCi } from "@/lib/ci";
import { formatDateOnlyFromDate } from "@/lib/date-helpers";
import { buildPersonaExternaEtiqueta, buildPersonalDestinatarioNombre } from "@/lib/movimiento-destinatario";
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

function joinNonEmpty(...values: Array<string | null | undefined>) {
  return values
    .filter((value) => typeof value === "string" && value.trim() !== "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatApellidoNombre(apellido: string | null | undefined, nombre: string | null | undefined) {
  return joinNonEmpty(apellido ? `${apellido},` : "", nombre);
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
      responsableGrado: true,
      responsableNombre: true,
      responsableApellido: true,
      responsableCi: true,
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
  const isPersonal = Boolean(registro.destinatarioPersonal);
  const now = new Date();
  const documentPrefix =
    registro.tipo === MOVIMIENTO_TIPO_ENTREGA ? "ER" : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "DR" : "AR";
  const documentNumber = `${documentPrefix}-${registro.movimientoId.toString().padStart(8, "0")}`;
  const tipoLabel =
    registro.tipo === MOVIMIENTO_TIPO_ENTREGA ? "Entrega" : registro.tipo === MOVIMIENTO_TIPO_DEVOLUCION ? "Devolución" : "Asignación";
  const subtitle = `${tipoLabel} ${isRecinto ? "a recinto" : isExterno ? "a externo" : "a personal"}`;
  const fechaMovimiento = formatDateOnlyFromDate(registro.fecha) ?? "-";
  const usuarioEntregaGrado = registro.usuarioEntrega.rango?.abreviacion?.trim() ?? "";
  const usuarioEntregaNombreApellidoRaw =
    formatApellidoNombre(registro.usuarioEntrega.apellido, registro.usuarioEntrega.nombre) || registro.usuarioEntrega.username;
  const usuarioEntregaNombreApellido = normalizeReceiptValue(usuarioEntregaNombreApellidoRaw);

  const isExternalAssignment = isExterno && !registro.destinatarioExterno?.personaExterna?.unidadDestino?.startsWith("Interno");

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

  const destinatarioGradoRaw = isRecinto
    ? registro.destinatarioRecinto?.responsableGrado ?? ""
    : isExterno
      ? registro.destinatarioExterno?.personaExterna?.grado ?? ""
      : registro.destinatarioPersonal?.personal?.rango.abreviacion ?? "";
  const destinatarioNombreApellidoRaw = isRecinto
    ? formatApellidoNombre(registro.destinatarioRecinto?.responsableApellido, registro.destinatarioRecinto?.responsableNombre)
    : isExterno
      ? formatApellidoNombre(
          registro.destinatarioExterno?.personaExterna?.apellido,
          registro.destinatarioExterno?.personaExterna?.nombre,
        )
      : registro.destinatarioPersonal?.personal
        ? buildPersonalDestinatarioNombre(registro.destinatarioPersonal.personal)
        : "";
  const destinatarioCi = isRecinto
    ? registro.destinatarioRecinto?.responsableCi ?? ""
    : isExterno
      ? registro.destinatarioExterno?.personaExterna?.ci ?? ""
      : registro.destinatarioPersonal?.personal?.ci ?? "";
  const destinatarioGrado = normalizeReceiptValue(destinatarioGradoRaw);
  const destinatarioNombreApellido = normalizeReceiptValue(destinatarioNombreApellidoRaw);
  const destinatarioCiDisplay =
    destinatarioCi && !destinatarioCi.startsWith("SD-") ? formatUruguayanCi(destinatarioCi) : null;

  let destinoFull = "No definido";
  if (isRecinto) {
    const clase = registro.destinatarioRecinto?.clase === "EXTERNO" ? "Fuera de la Unidad" : "Dentro de la Unidad";
    destinoFull = `${registro.destinatarioRecinto?.nombre ?? "Recinto no definido"} - ${clase}`;
  } else if (isExterno) {
    const unidad = registro.destinatarioExterno?.personaExterna?.unidadDestino || "";
    const isInterno = unidad.startsWith("Interno a la Unidad");
    const name = unidad.replace("Externo a la Unidad - ", "").replace("Interno a la Unidad - ", "").trim();
    destinoFull = `${name} - ${isInterno ? "Dentro de la Unidad" : "Fuera de la Unidad"}`;
  } else if (isPersonal) {
    const bat = registro.destinatarioPersonal?.personal?.bateria?.nombre;
    destinoFull = bat ? `Batería ${bat} - Dentro de la Unidad` : "Dentro de la Unidad";
  }

  const tableRows = registro.equipos.map((equipo) => {
    let observaciones = equipo.comentarioEntrega?.trim() || "";
    if (registro.observaciones && registro.observaciones.trim() !== "") {
      observaciones = observaciones ? `${observaciones} | ${registro.observaciones}` : registro.observaciones;
    }
    
    return {
      cantidad: String(equipo.cantidad),
      efecto: equipo.equipo.nombre,
      observaciones: observaciones || "-",
    };
  });

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
    const firstRowGap = 6;
    const tipoWidth = 100;
    const fechaWidth = 96;
    const gradoWidth = 72;
    const nombreWidth = header.innerW - tipoWidth - fechaWidth - gradoWidth - firstRowGap * 3;
    const fechaX = header.innerX + tipoWidth + firstRowGap;
    const gradoX = fechaX + fechaWidth + firstRowGap;
    const nombreX = gradoX + gradoWidth + firstRowGap;

    drawField(page, assets, header.innerX, y, tipoWidth, 30, "Tipo", tipoLabel);
    drawField(page, assets, fechaX, y, fechaWidth, 30, "Fecha del movimiento", fechaMovimiento);
    drawField(page, assets, gradoX, y, gradoWidth, 30, "Grado", normalizeReceiptValue(usuarioEntregaGrado));
    drawField(page, assets, nombreX, y, nombreWidth, 30, "Nombre y apellido", usuarioEntregaNombreApellido);
    y += 36;

    y = drawFieldMultiline(
      page,
      assets,
      header.innerX,
      y,
      header.innerW,
      "Destino",
      destinoFull,
    );

    const responsableGap = 6;
    const responsableGradoWidth = 110;
    if (destinatarioCiDisplay) {
      const responsableCiWidth = 150;
      const responsableNombreWidth = header.innerW - responsableGradoWidth - responsableCiWidth - responsableGap * 2;
      const responsableNombreX = header.innerX + responsableGradoWidth + responsableGap;
      const responsableCiX = responsableNombreX + responsableNombreWidth + responsableGap;

      drawField(page, assets, header.innerX, y, responsableGradoWidth, 30, "Grado", destinatarioGrado);
      drawField(page, assets, responsableNombreX, y, responsableNombreWidth, 30, "Nombre y apellido", destinatarioNombreApellido);
      drawField(page, assets, responsableCiX, y, responsableCiWidth, 30, "Cédula de identidad", destinatarioCiDisplay);
    } else {
      const responsableNombreWidth = header.innerW - responsableGradoWidth - responsableGap;
      const responsableNombreX = header.innerX + responsableGradoWidth + responsableGap;

      drawField(page, assets, header.innerX, y, responsableGradoWidth, 30, "Grado", destinatarioGrado);
      drawField(page, assets, responsableNombreX, y, responsableNombreWidth, 30, "Nombre y apellido", destinatarioNombreApellido);
    }
    y += 36;

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
    leftSignatureName: [normalizeReceiptValue(usuarioEntregaGrado), usuarioEntregaNombreApellido],
    rightSignatureTitle: isRecinto ? "Superior responsable" : isExternalAssignment ? "Recibe asignación" : "Recibe",
    rightSignatureName: isExternalAssignment ? [
      "Grado: _______________________________",
      "Nombre y apellido: ____________________",
      "Firma: _____________________   CI: ________________",
    ] : [
      destinatarioGrado,
      destinatarioNombreApellido,
      destinatarioCiDisplay ? `CI: ${destinatarioCiDisplay}` : "",
    ].filter(Boolean),
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
