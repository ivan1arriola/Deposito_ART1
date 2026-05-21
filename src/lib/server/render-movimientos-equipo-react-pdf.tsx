import "server-only";

import React from "react";
import type { EquipoMovimientoCatalogItem, EquipoMovimientoViewRow } from "@/types/views";
import { buildFirmasInstitucionalesLineas, type FirmasInstitucionalesInput } from "@/lib/firma-lineas";
import { getArtilleriaLogoDataUrl } from "@/lib/server/react-pdf-assets";

type RenderMovimientosEquipoPdfOptions = {
  pageNumberLabel?: string;
  rowsPerPage?: number;
  firmas?: FirmasInstitucionalesInput;
};

const DEFAULT_ROWS_PER_PAGE = 52;

function chunkRows(rows: EquipoMovimientoViewRow[], rowsPerPage: number) {
  if (rows.length === 0) return [[]] as EquipoMovimientoViewRow[][];
  const chunks: EquipoMovimientoViewRow[][] = [];
  for (let start = 0; start < rows.length; start += rowsPerPage) {
    chunks.push(rows.slice(start, start + rowsPerPage));
  }
  return chunks;
}

export async function renderMovimientosEquipoPdf(
  selectedItem: EquipoMovimientoCatalogItem,
  rows: EquipoMovimientoViewRow[],
  fechaImpresion: string,
  options: RenderMovimientosEquipoPdfOptions = {},
): Promise<Uint8Array> {
  const ReactPdf = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf, Image } = ReactPdf;

  const logoDataUrl = await getArtilleriaLogoDataUrl();

  const pageNumberLabel = options.pageNumberLabel ?? "Movimientos equipo";
  const rowsPerPage =
    typeof options.rowsPerPage === "number" && Number.isFinite(options.rowsPerPage) && options.rowsPerPage > 0
      ? Math.floor(options.rowsPerPage)
      : DEFAULT_ROWS_PER_PAGE;

  const chunks = chunkRows(rows, rowsPerPage);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingHorizontal: 12,
      fontFamily: "Courier",
      fontSize: 8,
      color: "#000000",
      backgroundColor: "#ffffff",
    },
    headerWrapper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      position: "relative",
    },
    logo: {
      width: 30,
      height: 30,
      position: "absolute",
      left: 0,
    },
    title: {
      fontFamily: "Courier-Bold",
      fontSize: 10,
      textAlign: "center",
      flexGrow: 1,
    },
    subtitle: {
      fontSize: 8,
      textAlign: "center",
      marginBottom: 2,
    },
    subtitleMuted: {
      fontSize: 7,
      textAlign: "center",
      marginBottom: 8,
      color: "#444444",
    },
    table: {
      width: "100%",
      borderWidth: 1,
      borderColor: "#000000",
      flexDirection: "column",
      flexGrow: 1,
    },
    row: {
      flexDirection: "row",
      width: "100%",
    },
    headerCell: {
      backgroundColor: "#e5e5e5",
      borderRightWidth: 0.8,
      borderBottomWidth: 0.8,
      borderColor: "#000000",
      paddingHorizontal: 1.5,
      paddingVertical: 1.5,
      fontFamily: "Courier-Bold",
      textAlign: "center",
      justifyContent: "center",
    },
    cell: {
      borderRightWidth: 0.8,
      borderBottomWidth: 0.8,
      borderColor: "#000000",
      paddingHorizontal: 1.5,
      paddingVertical: 1.5,
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
    muted: {
      textAlign: "center",
      marginTop: 14,
      fontSize: 9,
    },
    pageNumber: {
      position: "absolute",
      right: 18,
      bottom: 8,
      fontSize: 7,
      fontFamily: "Helvetica",
    },
    firmas: {
      marginTop: 20,
      paddingTop: 10,
      borderTopWidth: 1,
      borderColor: "#eeeeee",
    },
    firmaLineRow: {
      width: "100%",
      flexDirection: "row",
    },
    firmaLine: {
      fontSize: 7,
      lineHeight: 1.2,
    },
    firmaLineStrong: {
      fontFamily: "Courier-Bold",
    },
  });

  const widths = {
    fecha: "10%",
    tipo: "15%",
    movimiento: "8%",
    ci: "10%",
    grado: "8%",
    persona: "21%",
    cantidad: "6%",
    observaciones: "22%",
  } as const;

  const equipoEstado = selectedItem.activo ? "Visible en hoja de entrega" : "Fuera de hoja de entrega";

  const DocumentNode = () => (
    <Document title="Movimientos por equipo" author="Sistema de Depósito General - Artilleria 1">
      {chunks.map((chunk, pageIndex) => (
        <Page key={`mov-equipo-${pageIndex}`} size="A4" style={styles.page}>
          <View style={styles.headerWrapper}>
            <Text style={styles.title}>Trazabilidad de movimientos por equipo</Text>
          </View>
          <Text style={styles.subtitle}>{`Equipo: ${selectedItem.nombre}`}</Text>
          <Text style={styles.subtitleMuted}>{`${equipoEstado} | Fecha de impresion: ${fechaImpresion}`}</Text>

          <View style={styles.table}>
            <View style={styles.row}>
              <View style={[styles.headerCell, { width: widths.fecha }]}>
                <Text>Fecha</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.tipo }]}>
                <Text>Tipo</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.movimiento }]}>
                <Text>Mov.</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.ci }]}>
                <Text>CI</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.grado }]}>
                <Text>Grado</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.persona }]}>
                <Text>Persona</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.cantidad }]}>
                <Text>Cant.</Text>
              </View>
              <View style={[styles.headerCell, styles.noRightBorder, { width: widths.observaciones }]}>
                <Text>Obs.</Text>
              </View>
            </View>

            {chunk.length === 0 ? (
              <Text style={styles.muted}>No hay movimientos para el equipo seleccionado.</Text>
            ) : (
              chunk.map((row) => (
                <View key={`${row.movimientoId}-${row.ci}`} style={styles.row}>
                  <View style={[styles.cell, { width: widths.fecha }]}>
                    <Text style={styles.center}>{row.fecha}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.tipo }]}>
                    <Text style={styles.center}>{row.tipoLabel}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.movimiento }]}>
                    <Text style={styles.center}>{row.movimientoId}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.ci }]}>
                    <Text style={styles.center}>{row.ci}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.grado }]}>
                    <Text style={styles.center}>{row.gradoAbreviacion}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.persona }]}>
                    <Text style={styles.left}>{row.persona}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.cantidad }]}>
                    <Text style={styles.center}>{String(row.cantidad)}</Text>
                  </View>
                  <View style={[styles.cell, styles.noRightBorder, { width: widths.observaciones }]}>
                    <Text style={styles.left}>{row.observaciones ?? ""}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {pageIndex === chunks.length - 1 && options.firmas && (
            <View style={styles.firmas} wrap={false}>
              {buildFirmasInstitucionalesLineas(options.firmas).map((linea, lineIndex) => (
                <View
                  key={`${linea.key}-${lineIndex}`}
                  style={[
                    styles.firmaLineRow,
                    {
                      paddingLeft: (linea.indentLevel || 0) * 40,
                      marginTop: linea.key.endsWith("-nombre") ? 8 : linea.key.endsWith("-texto") ? 25 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.firmaLine, linea.isBold ? styles.firmaLineStrong : {}]}>{linea.text}</Text>
                </View>
              ))}
            </View>
          )}

          <Text
            fixed
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `${pageNumberLabel} ${pageNumber} de ${totalPages}`
            }
          />
        </Page>
      ))}
    </Document>
  );

  const instance = pdf(<DocumentNode />);
  if (typeof instance.toBuffer === "function") {
    const renderedBuffer = await instance.toBuffer();
    if (renderedBuffer && typeof renderedBuffer.on === "function") {
      const chunksBuffer: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        renderedBuffer.on("data", (chunk: Buffer | Uint8Array | ArrayBuffer | string) => {
          if (Buffer.isBuffer(chunk)) {
            chunksBuffer.push(chunk);
            return;
          }
          if (chunk instanceof Uint8Array) {
            chunksBuffer.push(Buffer.from(chunk));
            return;
          }
          if (chunk instanceof ArrayBuffer) {
            chunksBuffer.push(Buffer.from(chunk));
            return;
          }
          chunksBuffer.push(Buffer.from(chunk));
        });
        renderedBuffer.on("end", () => resolve());
        renderedBuffer.on("error", (error: unknown) => reject(error));
      });

      return new Uint8Array(Buffer.concat(chunksBuffer));
    }
    if (Buffer.isBuffer(renderedBuffer)) return new Uint8Array(renderedBuffer);
    if (renderedBuffer instanceof Uint8Array) return new Uint8Array(renderedBuffer);
    if (renderedBuffer instanceof ArrayBuffer) return new Uint8Array(renderedBuffer);
  }

  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
