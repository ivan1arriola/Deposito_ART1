import "server-only";

import React from "react";
import type { MovimientoFueraHojaRow } from "@/lib/hoja-entrega-data";

type RenderMovimientosFueraHojaPdfOptions = {
  pageNumberLabel?: string;
  rowsPerPage?: number;
};

const DEFAULT_ROWS_PER_PAGE = 28;

function chunkRows(rows: MovimientoFueraHojaRow[], rowsPerPage: number) {
  if (rows.length === 0) return [[]] as MovimientoFueraHojaRow[][];
  const chunks: MovimientoFueraHojaRow[][] = [];
  for (let start = 0; start < rows.length; start += rowsPerPage) {
    chunks.push(rows.slice(start, start + rowsPerPage));
  }
  return chunks;
}

function buildTipoLabel(tipo: MovimientoFueraHojaRow["tipo"]) {
  return tipo === "ENTREGA" ? "Entrega" : "Devolución";
}

export async function renderMovimientosFueraHojaPdf(
  rows: MovimientoFueraHojaRow[],
  fechaImpresion: string,
  options: RenderMovimientosFueraHojaPdfOptions = {},
): Promise<Uint8Array> {
  const ReactPdf = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf } = ReactPdf;

  const pageNumberLabel = options.pageNumberLabel ?? "Movimientos";
  const rowsPerPage =
    typeof options.rowsPerPage === "number" && Number.isFinite(options.rowsPerPage) && options.rowsPerPage > 0
      ? Math.floor(options.rowsPerPage)
      : DEFAULT_ROWS_PER_PAGE;

  const chunks = chunkRows(rows, rowsPerPage);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 18,
      paddingBottom: 18,
      paddingHorizontal: 18,
      fontFamily: "Courier",
      fontSize: 8,
      color: "#000000",
      backgroundColor: "#ffffff",
    },
    title: {
      fontFamily: "Courier-Bold",
      fontSize: 11,
      textAlign: "center",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 8,
      textAlign: "center",
      marginBottom: 8,
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
      paddingHorizontal: 2,
      paddingVertical: 2,
      fontFamily: "Courier-Bold",
      textAlign: "center",
      justifyContent: "center",
    },
    cell: {
      borderRightWidth: 0.8,
      borderBottomWidth: 0.8,
      borderColor: "#000000",
      paddingHorizontal: 2,
      paddingVertical: 2,
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
  });

  const widths = {
    fecha: "11%",
    tipo: "8%",
    ci: "11%",
    persona: "22%",
    item: "23%",
    cantidad: "7%",
    observaciones: "18%",
  } as const;

  const DocumentNode = () => (
    <Document title="Movimientos fuera de hoja" author="Deposito ART1">
      {chunks.map((chunk, pageIndex) => (
        <Page key={`mov-fuera-${pageIndex}`} size="A4" style={styles.page}>
          <Text style={styles.title}>Movimientos de equipos no incluidos en hoja de entrega</Text>
          <Text style={styles.subtitle}>Fecha de impresion: {fechaImpresion}</Text>

          <View style={styles.table}>
            <View style={styles.row}>
              <View style={[styles.headerCell, { width: widths.fecha }]}>
                <Text>Fecha</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.tipo }]}>
                <Text>Tipo</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.ci }]}>
                <Text>CI</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.persona }]}>
                <Text>Persona</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.item }]}>
                <Text>Equipo</Text>
              </View>
              <View style={[styles.headerCell, { width: widths.cantidad }]}>
                <Text>Cant.</Text>
              </View>
              <View style={[styles.headerCell, styles.noRightBorder, { width: widths.observaciones }]}>
                <Text>Obs.</Text>
              </View>
            </View>

            {chunk.length === 0 ? (
              <Text style={styles.muted}>No hay movimientos fuera de hoja.</Text>
            ) : (
              chunk.map((row) => (
                <View key={`${row.movimientoId}-${row.item}-${row.ci}`} style={styles.row}>
                  <View style={[styles.cell, { width: widths.fecha }]}>
                    <Text style={styles.center}>{row.fecha}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.tipo }]}>
                    <Text style={styles.center}>{buildTipoLabel(row.tipo)}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.ci }]}>
                    <Text style={styles.center}>{row.ci}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.persona }]}>
                    <Text style={styles.left}>{row.persona}</Text>
                  </View>
                  <View style={[styles.cell, { width: widths.item }]}>
                    <Text style={styles.left}>{row.item}</Text>
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
      const chunks: Buffer[] = [];

      await new Promise<void>((resolve, reject) => {
        renderedBuffer.on("data", (chunk: Buffer | Uint8Array | ArrayBuffer | string) => {
          if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk);
            return;
          }
          if (chunk instanceof Uint8Array) {
            chunks.push(Buffer.from(chunk));
            return;
          }
          if (chunk instanceof ArrayBuffer) {
            chunks.push(Buffer.from(chunk));
            return;
          }
          chunks.push(Buffer.from(chunk));
        });
        renderedBuffer.on("end", () => resolve());
        renderedBuffer.on("error", (error: unknown) => reject(error));
      });

      return new Uint8Array(Buffer.concat(chunks));
    }
    if (Buffer.isBuffer(renderedBuffer)) return new Uint8Array(renderedBuffer);
    if (renderedBuffer instanceof Uint8Array) return new Uint8Array(renderedBuffer);
    if (renderedBuffer instanceof ArrayBuffer) return new Uint8Array(renderedBuffer);
  }

  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}
