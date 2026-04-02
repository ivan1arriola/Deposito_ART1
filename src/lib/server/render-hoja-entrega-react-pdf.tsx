import "server-only";

import React from "react";
import {
  formatUruguayanCi,
  isValidUruguayanCi,
} from "@/lib/ci";
import { PDFDocument } from "pdf-lib";
import {
  getHojaEntregaDatePart,
  type HojaEntregaSheetData,
} from "@/lib/hoja-entrega-data";

type RenderHojasEntregaPdfOptions = {
  pageNumberLabel?: string;
  includePageNumbers?: boolean;
};

const ITEM_COL_WIDTH = 26;
const DATA_COL_WIDTH = (100 - ITEM_COL_WIDTH) / 14;

function widthPct(value: number) {
  return `${value}%`;
}

function renderDate(value: string | null | undefined, part: "day" | "month" | "year") {
  return getHojaEntregaDatePart(value, part);
}

function buildAlistadoNombre(data: HojaEntregaSheetData) {
  return [data.persona.nombre1, data.persona.apellido1].filter(Boolean).join(" ").trim();
}

function normalizeSixDates(values: Array<{ fecha: string | null }>) {
  return Array.from({ length: 6 }, (_, index) => values[index]?.fecha ?? null);
}

export async function renderHojasEntregaPdf(
  hojas: HojaEntregaSheetData[],
  fechaImpresion: string,
  options: RenderHojasEntregaPdfOptions = {},
): Promise<Uint8Array> {
  const ReactPdf = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf } = ReactPdf;

  const styles = StyleSheet.create({
    page: {
      paddingHorizontal: 8,
      paddingTop: 8,
      paddingBottom: 10,
      fontFamily: "Courier",
      fontSize: 8,
      color: "#000000",
      backgroundColor: "#ffffff",
    },
    table: {
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: "#000000",
    },
    row: {
      flexDirection: "row",
      width: "100%",
    },
    cell: {
      borderRightWidth: 1,
      borderBottomWidth: 1,
      borderColor: "#000000",
      paddingHorizontal: 4,
      paddingVertical: 2.5,
      justifyContent: "center",
    },
    center: {
      textAlign: "center",
    },
    left: {
      textAlign: "left",
    },
    bold: {
      fontWeight: 700,
    },
    headerRowCell: {
      paddingVertical: 7,
      backgroundColor: "#ececec",
      textAlign: "center",
      fontWeight: 700,
      fontSize: 10,
    },
    infoCell: {
      minHeight: 36,
    },
    infoLabel: {
      fontWeight: 700,
      marginBottom: 1,
      fontSize: 8.5,
    },
    infoValue: {
      fontSize: 8.5,
      fontWeight: 700,
      lineHeight: 1.1,
    },
    sectionHeader: {
      backgroundColor: "#d9d9d9",
      fontWeight: 700,
      textAlign: "center",
      fontSize: 9.5,
      minHeight: 34,
    },
    dateCell: {
      backgroundColor: "#e6e6e6",
      fontWeight: 700,
      textAlign: "center",
      minHeight: 29,
    },
    tMergedTop: {
      backgroundColor: "#d9d9d9",
      borderBottomWidth: 0,
      minHeight: 34,
    },
    tMergedMiddle: {
      backgroundColor: "#d9d9d9",
      borderTopWidth: 0,
      borderBottomWidth: 0,
      minHeight: 29,
    },
    tMergedBottom: {
      backgroundColor: "#d9d9d9",
      borderTopWidth: 0,
      minHeight: 29,
    },
    itemName: {
      textAlign: "left",
      fontSize: 7.2,
      fontWeight: 500,
      lineHeight: 1.12,
      minHeight: 20,
    },
    totalCell: {
      backgroundColor: "#efefef",
      fontWeight: 700,
    },
    observacionesCell: {
      minHeight: 30,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    observacionesTitle: {
      textAlign: "center",
      fontWeight: 700,
      borderBottomWidth: 0.7,
      borderColor: "#000000",
      paddingBottom: 2,
      marginBottom: 2,
    },
    observacionLine: {
      fontSize: 7.2,
      lineHeight: 1.15,
      marginBottom: 1,
    },
    firmas: {
      marginTop: 7,
      paddingHorizontal: 2,
      gap: 5,
    },
    firmaBlock: {
      fontSize: 8,
      lineHeight: 1.2,
    },
    firmaNivel1: {
      marginLeft: 16,
    },
    firmaNivel2: {
      marginLeft: 32,
    },
    firmaCargo: {
      fontWeight: 700,
    },
    pageNumber: {
      position: "absolute",
      right: 10,
      bottom: 6,
      fontSize: 8,
      fontFamily: "Helvetica",
    },
  });

  const pageNumberLabel = options.pageNumberLabel ?? "Hoja";
  const includePageNumbers = options.includePageNumbers ?? true;

  const HojaEntregaSheetPage = ({ data }: { data: HojaEntregaSheetData }) => {
    const apellidos = `${data.persona.apellido1} ${data.persona.apellido2 ?? ""}`.trim();
    const nombres = `${data.persona.nombre1} ${data.persona.nombre2 ?? ""}`.trim();
    const alistadoNombre = buildAlistadoNombre(data);
    const entregaCols = normalizeSixDates(data.entregas);
    const devolCols = normalizeSixDates(data.devoluciones);
    const ciPrefix = isValidUruguayanCi(data.persona.ci) ? "" : "⚠ ";
    const ciDisplay = `${ciPrefix}${formatUruguayanCi(data.persona.ci)}`;

    return (
      <Page size="A4" style={styles.page}>
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: "100%" }]}>
              <Text style={styles.headerRowCell}>
                Grupo "Brig.Gral.Manuel Oribe" de Artillería 105mm No.1.-
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, { width: "100%" }]}>
              <Text style={styles.headerRowCell}>ADMINISTRACIÓN - S4</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.infoCell, { width: "30%" }]}>
              <Text style={styles.infoLabel}>Grado:</Text>
              <Text style={styles.infoValue}>{data.persona.rango}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "35%" }]}>
              <Text style={styles.infoLabel}>Apellidos:</Text>
              <Text style={styles.infoValue}>{apellidos}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "35%" }]}>
              <Text style={styles.infoLabel}>Nombres:</Text>
              <Text style={styles.infoValue}>{nombres}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.infoCell, { width: "20%" }]}>
              <Text style={styles.infoLabel}>Parka:</Text>
              <Text style={styles.infoValue}>{data.persona.tallas.PARKA}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "20%" }]}>
              <Text style={styles.infoLabel}>Camisaco:</Text>
              <Text style={styles.infoValue}>{data.persona.tallas.CAMISACO}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "24%" }]}>
              <Text style={styles.infoLabel}>Pantalón:</Text>
              <Text style={styles.infoValue}>{data.persona.tallas.PANTALON}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "20%" }]}>
              <Text style={styles.infoLabel}>Kepí:</Text>
              <Text style={styles.infoValue}>{data.persona.tallas.KEPI}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "16%" }]}>
              <Text style={styles.infoLabel}>Calzado:</Text>
              <Text style={styles.infoValue}>{data.persona.tallas.CALZADO}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.infoCell, { width: "22%" }]}>
              <Text style={styles.infoLabel}>C.I:</Text>
              <Text style={styles.infoValue}>{ciDisplay}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "25%" }]}>
              <Text style={styles.infoLabel}>Batería:</Text>
              <Text style={styles.infoValue}>{data.persona.bateria || "Cdo. y Serv."}</Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "25%" }]}>
              <Text style={styles.infoLabel}>
                {data.persona.esReingreso ? "Fecha Re-ingreso:" : "Fecha Ingreso:"}
              </Text>
              <Text style={styles.infoValue}>
                {data.persona.fechaIngreso
                  ? `${renderDate(data.persona.fechaIngreso, "day")}/${renderDate(data.persona.fechaIngreso, "month")}/${renderDate(data.persona.fechaIngreso, "year")}`
                  : "-"}
              </Text>
            </View>
            <View style={[styles.cell, styles.infoCell, { width: "28%" }]}>
              <Text style={styles.infoLabel}>Fecha de impresión:</Text>
              <Text style={styles.infoValue}>{fechaImpresion}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.sectionHeader, { width: widthPct(ITEM_COL_WIDTH) }]}>
              <Text>EQUIPO</Text>
            </View>
            <View style={[styles.cell, styles.sectionHeader, { width: widthPct(DATA_COL_WIDTH * 6) }]}>
              <Text>ENTREGAS</Text>
            </View>
            <View style={[styles.cell, styles.tMergedTop, { width: widthPct(DATA_COL_WIDTH) }]} />
            <View style={[styles.cell, styles.sectionHeader, { width: widthPct(DATA_COL_WIDTH * 6) }]}>
              <Text>DEVOLUCIONES</Text>
            </View>
            <View style={[styles.cell, styles.tMergedTop, { width: widthPct(DATA_COL_WIDTH) }]} />
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.dateCell, { width: widthPct(ITEM_COL_WIDTH) }]}>
              <Text>DÍA</Text>
            </View>
            {entregaCols.map((value, idx) => (
              <View key={`eday-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "day")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedMiddle, { width: widthPct(DATA_COL_WIDTH) }]} />
            {devolCols.map((value, idx) => (
              <View key={`dday-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "day")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedMiddle, { width: widthPct(DATA_COL_WIDTH) }]} />
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.dateCell, { width: widthPct(ITEM_COL_WIDTH) }]}>
              <Text>MES</Text>
            </View>
            {entregaCols.map((value, idx) => (
              <View key={`emonth-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "month")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedMiddle, { width: widthPct(DATA_COL_WIDTH) }]}>
              <Text style={styles.center}>T</Text>
            </View>
            {devolCols.map((value, idx) => (
              <View key={`dmonth-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "month")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedMiddle, { width: widthPct(DATA_COL_WIDTH) }]}>
              <Text style={styles.center}>T</Text>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, styles.dateCell, { width: widthPct(ITEM_COL_WIDTH) }]}>
              <Text>AÑO</Text>
            </View>
            {entregaCols.map((value, idx) => (
              <View key={`eyear-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "year")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedBottom, { width: widthPct(DATA_COL_WIDTH) }]} />
            {devolCols.map((value, idx) => (
              <View key={`dyear-${idx}`} style={[styles.cell, styles.dateCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text>{renderDate(value, "year")}</Text>
              </View>
            ))}
            <View style={[styles.cell, styles.tMergedBottom, { width: widthPct(DATA_COL_WIDTH) }]} />
          </View>

          {data.matrix.map((row, index) => (
            <View key={`${row.item}-${index}`} style={styles.row}>
              <View style={[styles.cell, { width: widthPct(ITEM_COL_WIDTH) }]}>
                <Text style={styles.itemName}>{row.item}</Text>
              </View>
              {row.entrega.slice(0, 6).map((qty, idx) => (
                <View key={`en-${index}-${idx}`} style={[styles.cell, { width: widthPct(DATA_COL_WIDTH) }]}>
                  <Text style={styles.center}>{qty || ""}</Text>
                </View>
              ))}
              <View style={[styles.cell, styles.totalCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text style={[styles.bold, styles.center]}>{row.entregaTotal}</Text>
              </View>
              {row.devolucion.slice(0, 6).map((qty, idx) => (
                <View key={`de-${index}-${idx}`} style={[styles.cell, { width: widthPct(DATA_COL_WIDTH) }]}>
                  <Text style={styles.center}>{qty || ""}</Text>
                </View>
              ))}
              <View style={[styles.cell, styles.totalCell, { width: widthPct(DATA_COL_WIDTH) }]}>
                <Text style={[styles.bold, styles.center]}>{row.devolucionTotal}</Text>
              </View>
            </View>
          ))}

          <View style={styles.row}>
            <View style={[styles.cell, styles.observacionesCell, { width: "100%" }]}>
              <Text style={styles.observacionesTitle}>OBSERVACIONES</Text>
              {data.observaciones.length === 0 ? (
                <Text style={styles.observacionLine}> </Text>
              ) : (
                data.observaciones.map((obs, index) => (
                  <Text key={`${obs.fecha}-${index}`} style={styles.observacionLine}>
                    {renderDate(obs.fecha, "day")}/{renderDate(obs.fecha, "month")}/{renderDate(obs.fecha, "year")} - {" "}
                    {obs.texto}
                  </Text>
                ))
              )}
            </View>
          </View>
        </View>

        <View style={styles.firmas}>
          <View style={styles.firmaBlock}>
            <Text>Firma del alistado:</Text>
            <Text style={[styles.firmaCargo, styles.firmaNivel1]}>{data.persona.rangoAbreviacion}</Text>
            <Text style={styles.firmaNivel2}>{alistadoNombre}</Text>
          </View>

          <View style={[styles.firmaBlock, styles.firmaNivel1]}>
            <Text>{data.firmas.encargadoTexto}</Text>
            <Text style={[styles.firmaCargo, styles.firmaNivel1]}>{data.firmas.encargadoRango}</Text>
            <Text style={styles.firmaNivel2}>{data.firmas.encargadoNombre}</Text>
          </View>

          <View style={[styles.firmaBlock, styles.firmaNivel2]}>
            <Text>{data.firmas.oficialTexto}</Text>
            <Text style={[styles.firmaCargo, styles.firmaNivel1]}>{data.firmas.oficialRango}</Text>
            <Text style={styles.firmaNivel2}>{data.firmas.oficialNombre}</Text>
          </View>
        </View>

        {includePageNumbers ? (
          <Text
            fixed
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumberLabel} ${pageNumber} de ${totalPages}`
            }
          />
        ) : null}
      </Page>
    );
  };

  const renderSingleHojaBytes = async (hoja: HojaEntregaSheetData) => {
    const HojaEntregaPdfDocument = () => (
      <Document title="Hoja de Entrega" author="Deposito ART1">
        <HojaEntregaSheetPage data={hoja} />
      </Document>
    );
    const blob = await pdf(<HojaEntregaPdfDocument />).toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  };

  if (hojas.length === 0) {
    return new Uint8Array();
  }

  if (hojas.length === 1) {
    return renderSingleHojaBytes(hojas[0]);
  }

  // Generamos cada persona por separado para que el contador de páginas
  // se reinicie por hoja (Hoja 1 de N por persona) y luego unimos todo.
  const mergedPdf = await PDFDocument.create();
  for (const hoja of hojas) {
    const singleBytes = await renderSingleHojaBytes(hoja);
    const singlePdf = await PDFDocument.load(singleBytes);
    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return mergedPdf.save();
}
