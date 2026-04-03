import "server-only";

import React from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { buildFirmasHojaEntregaLineas, getFirmaLineBaseIndentPt, getFirmaLineInlineOffsetPt } from "@/lib/firma-lineas";
import { PDFDocument } from "pdf-lib";
import {
  getHojaEntregaDatePart,
  type HojaEntregaSheetData,
} from "@/lib/hoja-entrega-data";

type RenderHojasEntregaPdfOptions = {
  pageNumberLabel?: string;
  includePageNumbers?: boolean;
};

type DatePart = "day" | "month" | "year";

type HeaderInfoCell = {
  width: string;
  label: string;
  value: string;
  align?: "left" | "center";
  minHeight?: number;
};

type DateRowConfig = {
  key: string;
  label: string;
  part: DatePart;
  showTMarkers: boolean;
  mergedVariant: "top" | "middle" | "bottom";
};

type DensityProfile = {
  id:
    | "normal"
    | "compact"
    | "tight"
    | "ultra"
    | "micro"
    | "nano"
    | "pico"
    | "atomic";
  scale: number;
};

const ITEM_COL_WIDTH = 38;
const DATA_COL_WIDTH = (100 - ITEM_COL_WIDTH) / 14;

const A4_PAGE_HEIGHT = 841.89;
const A4_MARGIN_X = 14;
const A4_MARGIN_TOP = 10;
const A4_MARGIN_BOTTOM = 10;
const A4_CONTENT_HEIGHT = A4_PAGE_HEIGHT - A4_MARGIN_TOP - A4_MARGIN_BOTTOM;
const PT_PER_MM = 72 / 25.4;

const BORDER = "#000000";
const BG_WHITE = "#ffffff";
const BG_MID = "#d9d9d9";
const BG_TOTAL = "#efefef";

const DATE_ROW_CONFIGS: DateRowConfig[] = [
  { key: "day", label: "DÍA", part: "day", showTMarkers: false, mergedVariant: "top" },
  { key: "month", label: "MES", part: "month", showTMarkers: true, mergedVariant: "middle" },
  { key: "year", label: "AÑO", part: "year", showTMarkers: false, mergedVariant: "bottom" },
];

const DENSITY_PROFILES: DensityProfile[] = [
  { id: "normal", scale: 1.26 },
  { id: "compact", scale: 1.18 },
  { id: "tight", scale: 1.1 },
  { id: "ultra", scale: 1.02 },
  { id: "micro", scale: 0.94 },
  { id: "nano", scale: 0.88 },
  { id: "pico", scale: 0.82 },
  { id: "atomic", scale: 0.76 },
];

function scaled(profile: DensityProfile, value: number, min = 0) {
  const output = Number((value * profile.scale).toFixed(2));
  return Math.max(min, output);
}

function getSignatureTabSize(profile: DensityProfile) {
  if (profile.id === "normal") return 8 * PT_PER_MM;
  if (profile.id === "compact") return 7 * PT_PER_MM;
  if (profile.id === "tight") return 6 * PT_PER_MM;
  return 5 * PT_PER_MM;
}

function widthPct(value: number) {
  return `${value}%`;
}

function renderDate(value: string | null | undefined, part: DatePart) {
  return getHojaEntregaDatePart(value, part);
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  return `${renderDate(value, "day")}/${renderDate(value, "month")}/${renderDate(value, "year")}`;
}

function formatQuantity(value: number) {
  return value === 0 ? "" : String(value);
}

function formatTotal(value: number) {
  return String(value ?? 0);
}

function buildAlistadoNombre(data: HojaEntregaSheetData) {
  return [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim();
}

function buildApellidos(data: HojaEntregaSheetData) {
  return `${data.persona.apellido1} ${data.persona.apellido2 ?? ""}`.trim();
}

function buildNombres(data: HojaEntregaSheetData) {
  return `${data.persona.nombre1} ${data.persona.nombre2 ?? ""}`.trim();
}

function normalizeSixDates(values: Array<{ fecha: string | null }>) {
  return Array.from({ length: 6 }, (_, index) => values[index]?.fecha ?? null);
}

function buildHeaderInfoRows(
  data: HojaEntregaSheetData,
  fechaImpresion: string,
  ciDisplay: string,
): HeaderInfoCell[][] {
  const ingresoLabel = data.persona.esReingreso ? "Fecha Re-ingreso:" : "Fecha Ingreso:";

  return [
    [
      {
        width: "30%",
        label: "Grado:",
        value: data.persona.rango,
        minHeight: 22,
      },
      {
        width: "35%",
        label: "Apellidos:",
        value: buildApellidos(data),
        minHeight: 22,
      },
      {
        width: "35%",
        label: "Nombres:",
        value: buildNombres(data),
        minHeight: 22,
      },
    ],
    [
      { width: "16%", label: "Parka:", value: data.persona.tallas.PARKA, minHeight: 14 },
      { width: "19%", label: "Camisaco:", value: data.persona.tallas.CAMISACO, minHeight: 14 },
      { width: "20%", label: "Pantalón:", value: data.persona.tallas.PANTALON, minHeight: 14 },
      { width: "20%", label: "Kepí:", value: data.persona.tallas.KEPI, minHeight: 14 },
      { width: "25%", label: "Calzado:", value: data.persona.tallas.CALZADO, minHeight: 14 },
    ],
    [
      { width: "22%", label: "C.I:", value: ciDisplay, minHeight: 14 },
      { width: "25%", label: "Batería:", value: data.persona.bateria || "Cdo. y Serv.", minHeight: 14 },
      { width: "25%", label: ingresoLabel, value: formatShortDate(data.persona.fechaIngreso), minHeight: 14 },
      { width: "28%", label: "Fecha de impresión:", value: fechaImpresion, minHeight: 14 },
    ],
  ];
}

export async function renderHojasEntregaPdf(
  hojas: HojaEntregaSheetData[],
  fechaImpresion: string,
  options: RenderHojasEntregaPdfOptions = {},
): Promise<Uint8Array> {
  const ReactPdf = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf } = ReactPdf;

  const pageNumberLabel = options.pageNumberLabel ?? "Hoja";
  const includePageNumbers = options.includePageNumbers ?? true;

  const renderSingleHojaBytesWithProfile = async (
    hoja: HojaEntregaSheetData,
    profile: DensityProfile,
  ) => {
    const signatureTab = getSignatureTabSize(profile);
    const signatureLineHeight = 1.5;
    const signatureFontSize = scaled(profile, 6.6, 4.7);
    const signatureMonospaceCharWidth = signatureFontSize * 0.6;
    const institutionalSignatureGap = scaled(profile, 2.2, 1.2);

    const styles = StyleSheet.create({
      page: {
        paddingLeft: A4_MARGIN_X,
        paddingRight: A4_MARGIN_X,
        paddingTop: A4_MARGIN_TOP,
        paddingBottom: A4_MARGIN_BOTTOM,
        fontFamily: "Courier",
        fontSize: scaled(profile, 6.7, 4.6),
        color: "#000000",
        backgroundColor: "#ffffff",
      },

      sheet: {
        height: A4_CONTENT_HEIGHT,
        flexDirection: "column",
      },

      content: {
        flexGrow: 1,
        flexDirection: "column",
      },

      table: {
        width: "100%",
        borderWidth: scaled(profile, 1, 0.55),
        borderColor: BORDER,
        flexDirection: "column",
        flexGrow: 1,
      },

      matrixSection: {
        flexGrow: 1,
        flexDirection: "column",
      },

      row: {
        flexDirection: "row",
        width: "100%",
      },

      matrixRow: {
        flexGrow: 1,
      },

      cell: {
        borderRightWidth: scaled(profile, 0.75, 0.42),
        borderBottomWidth: scaled(profile, 0.75, 0.42),
        borderColor: BORDER,
        paddingHorizontal: scaled(profile, 1.4, 0.7),
        paddingVertical: scaled(profile, 0.24, 0.05),
        justifyContent: "center",
      },

      noRightBorder: {
        borderRightWidth: 0,
      },

      center: {
        textAlign: "center",
      },

      left: {
        textAlign: "left",
      },

      topTitleCell: {
        backgroundColor: BG_WHITE,
        paddingVertical: scaled(profile, 1.5, 0.7),
        minHeight: scaled(profile, 18, 12),
      },

      topTitle: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 8.1, 5.8),
      },

      subTitleCell: {
        backgroundColor: BG_WHITE,
        paddingVertical: scaled(profile, 1.4, 0.65),
        minHeight: scaled(profile, 16.5, 11.5),
      },

      subTitle: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 7.9, 5.7),
      },

      infoCell: {
        backgroundColor: BG_WHITE,
        justifyContent: "flex-start",
        paddingTop: scaled(profile, 0.8, 0.25),
        paddingBottom: scaled(profile, 0.8, 0.25),
      },

      infoLabel: {
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 6.6, 4.8),
        marginBottom: scaled(profile, 0.1, 0.02),
        lineHeight: 1,
      },

      infoValue: {
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 7.2, 5.2),
        lineHeight: 1,
      },

      sectionHeader: {
        backgroundColor: BG_MID,
        minHeight: scaled(profile, 14.5, 9.2),
        paddingVertical: 0,
        justifyContent: "center",
      },

      sectionHeaderText: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 7.2, 5),
      },

      dateLabelCell: {
        backgroundColor: BG_MID,
        minHeight: scaled(profile, 11.2, 7.5),
        paddingVertical: 0,
        justifyContent: "center",
      },

      dateLabelText: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 6.7, 4.7),
      },

      dateValueCell: {
        backgroundColor: BG_MID,
        minHeight: scaled(profile, 11.2, 7.5),
        paddingVertical: 0,
        justifyContent: "center",
      },

      dateValueText: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 6.7, 4.7),
      },

      tMergedTop: {
        backgroundColor: BG_MID,
        borderBottomWidth: 0,
        minHeight: scaled(profile, 11.2, 7.5),
        paddingVertical: 0,
        justifyContent: "center",
      },

      tMergedMiddle: {
        backgroundColor: BG_MID,
        borderTopWidth: 0,
        borderBottomWidth: 0,
        minHeight: scaled(profile, 11.2, 7.5),
        paddingVertical: 0,
        justifyContent: "center",
      },

      tMergedBottom: {
        backgroundColor: BG_MID,
        borderTopWidth: 0,
        minHeight: scaled(profile, 11.2, 7.5),
        paddingVertical: 0,
        justifyContent: "center",
      },

      tText: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 6.8, 4.8),
      },

      itemCell: {
        backgroundColor: BG_WHITE,
        minHeight: scaled(profile, 11.2, 7.4),
        paddingVertical: 0,
        justifyContent: "center",
      },

      itemName: {
        textAlign: "left",
        fontSize: scaled(profile, 6.55, 4.6),
        lineHeight: 1,
      },

      qtyCell: {
        backgroundColor: BG_WHITE,
        minHeight: scaled(profile, 11.2, 7.4),
        paddingVertical: 0,
        justifyContent: "center",
      },

      qtyText: {
        textAlign: "center",
        fontSize: scaled(profile, 6.9, 4.8),
      },

      totalCell: {
        backgroundColor: BG_TOTAL,
        minHeight: scaled(profile, 11.2, 7.4),
        paddingVertical: 0,
        justifyContent: "center",
      },

      totalText: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 6.9, 4.8),
      },

      observacionesWrapper: {
        backgroundColor: BG_WHITE,
        minHeight: scaled(profile, 19, 12),
        paddingTop: scaled(profile, 0.6, 0.2),
        paddingBottom: scaled(profile, 0.9, 0.25),
        paddingHorizontal: scaled(profile, 1.5, 0.8),
        justifyContent: "flex-start",
      },

      observacionesTitle: {
        textAlign: "center",
        fontFamily: "Courier-Bold",
        fontSize: scaled(profile, 7.2, 5),
        marginBottom: scaled(profile, 0.8, 0.18),
      },

      observacionLine: {
        fontSize: scaled(profile, 6.3, 4.4),
        lineHeight: 1.2,
        marginBottom: 0,
        textAlign: "center",
      },

      firmas: {
        marginTop: scaled(profile, 8, 4), // Margen superior añadido
        marginBottom: scaled(profile, 8, 4), // Margen inferior añadido
        paddingLeft: 0,
        paddingRight: 0,
        flexShrink: 0,
      },
      firmaLineRow: {
        width: "100%",
        flexDirection: "row",
        paddingLeft: 0,
      },
      firmaInlineSpacer: {
        width: 0,
        flexShrink: 0,
      },
      firmaLine: {
        fontSize: signatureFontSize,
        lineHeight: signatureLineHeight,
      },
      firmaLineStrong: {
        fontFamily: "Courier-Bold",
      },

      pageNumber: {
        position: "absolute",
        right: A4_MARGIN_X,
        bottom: 4,
        fontSize: scaled(profile, 5.2, 3.8),
        fontFamily: "Helvetica",
      },
    });

    const HeaderInfoRow = ({ cells }: { cells: HeaderInfoCell[] }) => (
      <View style={styles.row}>
        {cells.map((cell, index) => {
          const isLast = index === cells.length - 1;

          return (
            <View
              key={`${cell.label}-${index}`}
              style={[
                styles.cell,
                styles.infoCell,
                { width: cell.width, minHeight: cell.minHeight ?? 14 },
                isLast ? styles.noRightBorder : {},
              ]}
            >
              {cell.label ? <Text style={styles.infoLabel}>{cell.label}</Text> : null}
              <Text style={[styles.infoValue, cell.align === "center" ? styles.center : styles.left]}>
                {cell.value || " "}
              </Text>
            </View>
          );
        })}
      </View>
    );

    const HojaEntregaSheetPage = ({ data }: { data: HojaEntregaSheetData }) => {
      const alistadoNombre = buildAlistadoNombre(data);
      const firmaLineas = buildFirmasHojaEntregaLineas({
        alistadoRango: data.persona.rangoAbreviacion,
        alistadoNombre,
        encargadoTexto: data.firmas.encargadoTexto,
        encargadoRango: data.firmas.encargadoRango,
        encargadoNombre: data.firmas.encargadoNombre,
        oficialTexto: data.firmas.oficialTexto,
        oficialRango: data.firmas.oficialRango,
        oficialNombre: data.firmas.oficialNombre,
        encargadoStartIndentLevel: 1,
      });
      const entregaCols = normalizeSixDates(data.entregas);
      const devolCols = normalizeSixDates(data.devoluciones);
      const ciPrefix = isValidUruguayanCi(data.persona.ci) ? "" : "⚠ ";
      const ciDisplay = `${ciPrefix}${formatUruguayanCi(data.persona.ci)}`;
      const headerInfoRows = buildHeaderInfoRows(data, fechaImpresion, ciDisplay);

      const itemWidthStyle = { width: widthPct(ITEM_COL_WIDTH) };
      const dataWidthStyle = { width: widthPct(DATA_COL_WIDTH) };
      const sixDataWidthStyle = { width: widthPct(DATA_COL_WIDTH * 6) };

      return (
        <Page size="A4" style={styles.page}>
          <View style={styles.sheet} wrap={false}>
            <View style={styles.content}>
              <View style={styles.table}>
                <View style={styles.row}>
                  <View style={[styles.cell, styles.topTitleCell, styles.noRightBorder, { width: "100%" }]}>
                    <Text style={styles.topTitle}>
                      {'Grupo "Brig.Gral.Manuel Oribe" de Artillería 105mm No.1.-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.cell, styles.subTitleCell, styles.noRightBorder, { width: "100%" }]}>
                    <Text style={styles.subTitle}>ADMINISTRACIÓN - S4</Text>
                  </View>
                </View>

                {headerInfoRows.map((row, index) => (
                  <HeaderInfoRow key={`info-row-${index}`} cells={row} />
                ))}

                <View style={styles.row}>
                  <View style={[styles.cell, styles.sectionHeader, itemWidthStyle]}>
                    <Text style={styles.sectionHeaderText}>EQUIPO</Text>
                  </View>

                  <View style={[styles.cell, styles.sectionHeader, sixDataWidthStyle]}>
                    <Text style={styles.sectionHeaderText}>ENTREGAS</Text>
                  </View>

                  <View style={[styles.cell, styles.sectionHeader, dataWidthStyle]} />

                  <View style={[styles.cell, styles.sectionHeader, sixDataWidthStyle]}>
                    <Text style={styles.sectionHeaderText}>DEVOLUCIONES</Text>
                  </View>

                  <View style={[styles.cell, styles.sectionHeader, styles.noRightBorder, dataWidthStyle]} />
                </View>

                {DATE_ROW_CONFIGS.map((config) => {
                  const mergedStyle =
                    config.mergedVariant === "top"
                      ? styles.tMergedTop
                      : config.mergedVariant === "middle"
                      ? styles.tMergedMiddle
                      : styles.tMergedBottom;

                  return (
                    <View key={config.key} style={styles.row}>
                      <View style={[styles.cell, styles.dateLabelCell, itemWidthStyle]}>
                        <Text style={styles.dateLabelText}>{config.label}</Text>
                      </View>

                      {entregaCols.map((value, idx) => (
                        <View
                          key={`${config.key}-entrega-${idx}`}
                          style={[styles.cell, styles.dateValueCell, dataWidthStyle]}
                        >
                          <Text style={styles.dateValueText}>{renderDate(value, config.part)}</Text>
                        </View>
                      ))}

                      <View style={[styles.cell, mergedStyle, dataWidthStyle]}>
                        {config.showTMarkers ? <Text style={styles.tText}>T</Text> : null}
                      </View>

                      {devolCols.map((value, idx) => (
                        <View
                          key={`${config.key}-devol-${idx}`}
                          style={[styles.cell, styles.dateValueCell, dataWidthStyle]}
                        >
                          <Text style={styles.dateValueText}>{renderDate(value, config.part)}</Text>
                        </View>
                      ))}

                      <View style={[styles.cell, mergedStyle, styles.noRightBorder, dataWidthStyle]}>
                        {config.showTMarkers ? <Text style={styles.tText}>T</Text> : null}
                      </View>
                    </View>
                  );
                })}

                <View style={styles.matrixSection}>
                  {data.matrix.map((row, index) => (
                    <View key={`${row.item}-${index}`} style={[styles.row, styles.matrixRow]}>
                      <View style={[styles.cell, styles.itemCell, itemWidthStyle]}>
                        <Text style={styles.itemName}>{row.item}</Text>
                      </View>

                      {row.entrega.slice(0, 6).map((qty, idx) => (
                        <View key={`entrega-${index}-${idx}`} style={[styles.cell, styles.qtyCell, dataWidthStyle]}>
                          <Text style={styles.qtyText}>{formatQuantity(qty)}</Text>
                        </View>
                      ))}

                      <View style={[styles.cell, styles.totalCell, dataWidthStyle]}>
                        <Text style={styles.totalText}>{formatTotal(row.entregaTotal)}</Text>
                      </View>

                      {row.devolucion.slice(0, 6).map((qty, idx) => (
                        <View key={`devolucion-${index}-${idx}`} style={[styles.cell, styles.qtyCell, dataWidthStyle]}>
                          <Text style={styles.qtyText}>{formatQuantity(qty)}</Text>
                        </View>
                      ))}

                      <View style={[styles.cell, styles.totalCell, styles.noRightBorder, dataWidthStyle]}>
                        <Text style={styles.totalText}>{formatTotal(row.devolucionTotal)}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.row}>
                  <View
                    style={[
                      styles.cell,
                      styles.observacionesWrapper,
                      styles.noRightBorder,
                      { width: "100%" },
                    ]}
                  >
                    <Text style={styles.observacionesTitle}>OBSERVACIONES</Text>

                    {data.observaciones.length === 0 ? (
                      <Text style={styles.observacionLine}> </Text>
                    ) : (
                      data.observaciones.map((obs, index) => (
                        <Text key={`${obs.fecha}-${index}`} style={styles.observacionLine}>
                          {`${renderDate(obs.fecha, "day")}/${renderDate(obs.fecha, "month")}/${renderDate(obs.fecha, "year")} - ${obs.texto}`}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.firmas}>
                {firmaLineas.map((linea) => (
                  <View
                    key={linea.key}
                    style={[
                      styles.firmaLineRow,
                      {
                        paddingLeft: getFirmaLineBaseIndentPt(linea, signatureTab),
                        marginTop: linea.key === "oficial-texto" ? institutionalSignatureGap : 0,
                      },
                    ]}
                  >
                    {(linea.inlineOffsetChars ?? 0) > 0 ? (
                      <View
                        style={[
                          styles.firmaInlineSpacer,
                          {
                            width: getFirmaLineInlineOffsetPt(linea, signatureMonospaceCharWidth),
                          },
                        ]}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.firmaLine,
                        linea.isBold ? styles.firmaLineStrong : {},
                      ]}
                    >
                      {linea.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {includePageNumbers ? (
            <Text
              fixed
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
                totalPages > 1 ? `${pageNumberLabel} ${pageNumber} de ${totalPages}` : ""
              }
            />
          ) : null}
        </Page>
      );
    };

    const HojaEntregaPdfDocument = () => (
      <Document title="Hoja de Entrega" author="Deposito ART1">
        <HojaEntregaSheetPage data={hoja} />
      </Document>
    );

    const blob = await pdf(<HojaEntregaPdfDocument />).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  const renderSingleHojaBestFitBytes = async (hoja: HojaEntregaSheetData) => {
    let bestProfileId: DensityProfile["id"] | null = null;

    for (const profile of DENSITY_PROFILES) {
      const bytes = await renderSingleHojaBytesWithProfile(hoja, profile);
      bestProfileId = profile.id;

      const pageCount = (await PDFDocument.load(bytes)).getPageCount();
      if (pageCount === 1) {
        return bytes;
      }
    }

    throw new Error(
      `La hoja de entrega de ${buildAlistadoNombre(hoja)} no entra completa en una sola página A4 incluso con el perfil más compacto (${bestProfileId}). No se generó un PDF cortado.`,
    );
  };

  if (hojas.length === 0) {
    return new Uint8Array();
  }

  if (hojas.length === 1) {
    return renderSingleHojaBestFitBytes(hojas[0]);
  }

  const mergedPdf = await PDFDocument.create();

  for (const hoja of hojas) {
    const singleBytes = await renderSingleHojaBestFitBytes(hoja);
    const singlePdf = await PDFDocument.load(singleBytes);
    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return mergedPdf.save();
}
