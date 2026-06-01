import { NextResponse } from "next/server";
import path from "node:path";
import ExcelJS from "exceljs";
import { authorizeRequest } from "@/lib/auth";
import { SIN_BATERIA_LABEL, getHojaMatrixData } from "@/lib/hoja-matrix";
import type { HojaMatrixRow } from "@/types/views";

export const runtime = "nodejs";

const FONT_TEXT = 10;
const FONT_NUMBERS = 10;
const FONT_TITLES = 10;
const ROW_HEIGHT = 20;
const ITEM_COLUMN_WIDTH = 5.5;
const GRADE_COLUMN_MIN_WIDTH = 8;
const GRADE_COLUMN_MAX_WIDTH = 16;
const NAME_COLUMN_MIN_WIDTH = 18;
const NAME_COLUMN_MAX_WIDTH = 44;

function sanitizeFilePart(value: string) {
  return value
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type PrintableRow =
  | {
      kind: "grade";
      label: string;
    }
  | {
      kind: "battery";
      label: string;
    }
  | {
      kind: "person";
      number: number;
      grade: string;
      name: string;
      totales: number[];
    };

function buildDisplayName(row: HojaMatrixRow) {
  return [row.nombre1, row.apellido1].filter(Boolean).join(" ").trim();
}

function buildPrintableRows(rows: HojaMatrixRow[], includeBatterySeparators: boolean): PrintableRow[] {
  const printableRows: PrintableRow[] = [];
  let currentGrade = "";
  let currentBattery = "";
  let counter = 0;

  for (const row of rows) {
    const batteryLabel = row.bateria ?? SIN_BATERIA_LABEL;

    if (row.gradoAbreviacion !== currentGrade) {
      currentGrade = row.gradoAbreviacion;
      currentBattery = "";
      printableRows.push({
        kind: "grade",
        label: row.gradoAbreviacion.toUpperCase(),
      });
    }

    if (includeBatterySeparators && batteryLabel !== currentBattery) {
      currentBattery = batteryLabel;
      printableRows.push({
        kind: "battery",
        label: batteryLabel,
      });
    }

    counter += 1;
    printableRows.push({
      kind: "person",
      number: counter,
      grade: row.gradoAbreviacion,
      name: buildDisplayName(row),
      totales: row.totales,
    });
  }

  return printableRows;
}

function thinBorder() {
  return {
    top: { style: "thin" as const, color: { argb: "FF000000" } },
    left: { style: "thin" as const, color: { argb: "FF000000" } },
    bottom: { style: "thin" as const, color: { argb: "FF000000" } },
    right: { style: "thin" as const, color: { argb: "FF000000" } },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, "read_data");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const bateria = searchParams.get("bateria")?.trim() || null;
  const data = await getHojaMatrixData({ bateria });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Deposito General";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Hoja Matriz");
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.2,
      right: 0.2,
      top: 0.25,
      bottom: 0.25,
      header: 0.1,
      footer: 0.1,
    },
  };

  const firstItemCol = 4; // D
  const equipoCount = data.equipos.length;
  const equipmentColumnCount = Math.max(equipoCount, 1);
  const lastCol = firstItemCol + equipmentColumnCount - 1;
  const topStartRow = 1;
  const topEndRow = 8;
  const logoEndRow = 4;
  const titleStartRow = logoEndRow + 1;
  const labelRow = topEndRow + 1;

  const longestGrade = data.rows.reduce((max, row) => Math.max(max, row.gradoAbreviacion.length), "Grado".length);
  const longestName = data.rows.reduce((max, row) => Math.max(max, buildDisplayName(row).length), "Nombre".length);
  const gradeColumnWidth = clamp(longestGrade + 2, GRADE_COLUMN_MIN_WIDTH, GRADE_COLUMN_MAX_WIDTH);
  const nameColumnWidth = clamp(longestName + 2, NAME_COLUMN_MIN_WIDTH, NAME_COLUMN_MAX_WIDTH);

  worksheet.getColumn(1).width = 6;
  worksheet.getColumn(2).width = gradeColumnWidth;
  worksheet.getColumn(3).width = nameColumnWidth;
  for (let col = firstItemCol; col <= lastCol; col += 1) {
    worksheet.getColumn(col).width = ITEM_COLUMN_WIDTH;
  }

  for (let row = topStartRow; row <= labelRow; row += 1) {
    worksheet.getRow(row).height = ROW_HEIGHT;
  }

  worksheet.mergeCells(topStartRow, 1, logoEndRow, 3);
  const logoAreaCell = worksheet.getCell(topStartRow, 1);
  logoAreaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  worksheet.mergeCells(titleStartRow, 1, topEndRow, 3);
  const titleCell = worksheet.getCell(titleStartRow, 1);
  titleCell.value = {
    richText: [
      {
        text: 'Grupo "Brig. Gral. Manuel Oribe" de\nArtilleria 105mm No.1.-\n',
        font: { name: "Times New Roman", size: FONT_TEXT, bold: true },
      },
      {
        text: "HOJA MATRIZ\n",
        font: { name: "Times New Roman", size: FONT_TITLES, bold: true },
      },
      {
        text: bateria ? bateria.toUpperCase() : "UNIDAD",
        font: { name: "Times New Roman", size: FONT_TITLES, bold: true },
      },
    ],
  };
  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFD9D9D9" },
  };

  for (let index = 0; index < equipoCount; index += 1) {
    const col = firstItemCol + index;
    worksheet.mergeCells(topStartRow, col, topEndRow, col);
    const headerCell = worksheet.getCell(topStartRow, col);
    headerCell.value = data.equipos[index].nombre;
    headerCell.alignment = {
      horizontal: "center",
      vertical: "middle",
      textRotation: 90,
      wrapText: true,
    };
    headerCell.font = {
      name: "Times New Roman",
      size: FONT_TITLES,
      bold: true,
    };
    headerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9D9D9" },
    };
  }

  const nCell = worksheet.getCell(labelRow, 1);
  nCell.value = "N°";
  nCell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
  nCell.alignment = { horizontal: "center", vertical: "middle" };
  nCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

  const gradeCell = worksheet.getCell(labelRow, 2);
  gradeCell.value = "Grado";
  gradeCell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
  gradeCell.alignment = { horizontal: "center", vertical: "middle" };
  gradeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

  const nameCell = worksheet.getCell(labelRow, 3);
  nameCell.value = "Nombre";
  nameCell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
  nameCell.alignment = { horizontal: "center", vertical: "middle" };
  nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

  if (equipoCount > 0) {
    worksheet.mergeCells(labelRow, firstItemCol, labelRow, lastCol);
  }
  const equipCell = worksheet.getCell(labelRow, firstItemCol);
  equipCell.value = "EQUIPO";
  equipCell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
  equipCell.alignment = { horizontal: "center", vertical: "middle" };
  equipCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };

  const includeBatterySeparators = bateria === null;
  const printableRows = buildPrintableRows(data.rows, includeBatterySeparators);
  const totalsByItem = Array.from({ length: data.equipos.length }, () => 0);
  for (const row of data.rows) {
    row.totales.forEach((value, idx) => {
      totalsByItem[idx] += value;
    });
  }

  let currentRow = labelRow + 1;
  for (const row of printableRows) {
    if (row.kind === "grade") {
      worksheet.mergeCells(currentRow, 1, currentRow, lastCol);
      const cell = worksheet.getCell(currentRow, 1);
      cell.value = row.label.endsWith(".") ? row.label : `${row.label}.`;
      cell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6E6E6" } };
      worksheet.getRow(currentRow).height = ROW_HEIGHT;
      currentRow += 1;
      continue;
    }

    if (row.kind === "battery") {
      worksheet.mergeCells(currentRow, 1, currentRow, lastCol);
      const cell = worksheet.getCell(currentRow, 1);
      cell.value = row.label;
      cell.font = { name: "Times New Roman", size: FONT_TEXT, bold: true };
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
      worksheet.getRow(currentRow).height = ROW_HEIGHT;
      currentRow += 1;
      continue;
    }

    worksheet.getRow(currentRow).height = ROW_HEIGHT;
    const numberCell = worksheet.getCell(currentRow, 1);
    numberCell.value = row.number;
    numberCell.font = { name: "Times New Roman", size: FONT_NUMBERS, bold: true };
    numberCell.alignment = { horizontal: "center", vertical: "middle" };

    const rowGradeCell = worksheet.getCell(currentRow, 2);
    rowGradeCell.value = row.grade;
    rowGradeCell.font = { name: "Times New Roman", size: FONT_TEXT, bold: true };
    rowGradeCell.alignment = { horizontal: "center", vertical: "middle" };

    const rowNameCell = worksheet.getCell(currentRow, 3);
    rowNameCell.value = row.name;
    rowNameCell.font = { name: "Times New Roman", size: FONT_TEXT, bold: false };
    rowNameCell.alignment = { horizontal: "left", vertical: "middle" };

    row.totales.forEach((value, index) => {
      const col = firstItemCol + index;
      const valueCell = worksheet.getCell(currentRow, col);
      valueCell.value = value;
      valueCell.font = {
        name: "Arial",
        size: FONT_NUMBERS,
        bold: true,
      };
      valueCell.alignment = { horizontal: "center", vertical: "middle" };
    });

    currentRow += 1;
  }

  worksheet.getRow(currentRow).height = ROW_HEIGHT;
  worksheet.mergeCells(currentRow, 1, currentRow, 3);
  const totalLabelCell = worksheet.getCell(currentRow, 1);
  totalLabelCell.value = "TOTAL";
  totalLabelCell.font = { name: "Times New Roman", size: FONT_TITLES, bold: true };
  totalLabelCell.alignment = { horizontal: "center", vertical: "middle" };
  totalLabelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } };

  totalsByItem.forEach((value, index) => {
    const col = firstItemCol + index;
    const totalCell = worksheet.getCell(currentRow, col);
    totalCell.value = value;
    totalCell.font = {
      name: "Arial",
      size: FONT_NUMBERS,
      bold: true,
    };
    totalCell.alignment = { horizontal: "center", vertical: "middle" };
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDEDED" } };
  });

  for (let r = topStartRow; r <= currentRow; r += 1) {
    for (let c = 1; c <= lastCol; c += 1) {
      worksheet.getCell(r, c).border = thinBorder();
    }
  }

  for (let c = 1; c <= lastCol; c += 1) {
    worksheet.getCell(topStartRow, c).border = {
      ...worksheet.getCell(topStartRow, c).border,
      top: { style: "medium", color: { argb: "FF000000" } },
    };
    worksheet.getCell(currentRow, c).border = {
      ...worksheet.getCell(currentRow, c).border,
      bottom: { style: "medium", color: { argb: "FF000000" } },
    };
  }
  for (let r = topStartRow; r <= currentRow; r += 1) {
    worksheet.getCell(r, 1).border = {
      ...worksheet.getCell(r, 1).border,
      left: { style: "medium", color: { argb: "FF000000" } },
    };
    worksheet.getCell(r, lastCol).border = {
      ...worksheet.getCell(r, lastCol).border,
      right: { style: "medium", color: { argb: "FF000000" } },
    };
  }

  // El bloque superior izquierdo debe verse como un unico rectangulo (sin linea interna entre logo y texto).
  for (let c = 1; c <= 3; c += 1) {
    const upperCell = worksheet.getCell(logoEndRow, c);
    upperCell.border = {
      ...upperCell.border,
      bottom: undefined,
    };

    const lowerCell = worksheet.getCell(titleStartRow, c);
    lowerCell.border = {
      ...lowerCell.border,
      top: undefined,
    };
  }

  worksheet.views = [{ state: "frozen", ySplit: labelRow }];

  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo-artilleria.jpg");
    const logoImageId = workbook.addImage({
      filename: logoPath,
      extension: "jpeg",
    });

    const logoSourceWidth = 1210;
    const logoSourceHeight = 1225;
    const logoTargetHeight = 114;
    const logoTargetWidth = Math.round((logoTargetHeight * logoSourceWidth) / logoSourceHeight);

    worksheet.addImage(logoImageId, {
      // Posicion replicada desde la planilla de referencia adjunta por el usuario.
      tl: { col: 1.6, row: 0.177 },
      ext: { width: logoTargetWidth, height: logoTargetHeight },
      editAs: "oneCell",
    });
  } catch (error) {
    console.warn("No se pudo cargar el logo para la planilla de hoja matriz:", error);
  }

  for (let row = topStartRow; row <= currentRow; row += 1) {
    worksheet.getRow(row).height = ROW_HEIGHT;
  }

  const workbookBuffer = await workbook.xlsx.writeBuffer();
  const buffer = Buffer.isBuffer(workbookBuffer) ? workbookBuffer : Buffer.from(workbookBuffer);

  const batterySuffix = bateria ? `_${sanitizeFilePart(bateria)}` : "_unidad";
  const fileName = `hoja_matriz${batterySuffix}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
      "Content-Length": String(buffer.length),
    },
  });
}
