import "server-only";

import React from "react";
import { formatUruguayanCi, isValidUruguayanCi } from "@/lib/ci";
import { buildFirmasHojaEntregaLineas, type FirmaLinea } from "@/lib/firma-lineas";
import { ParseSpeeds, PDFDocument } from "pdf-lib";
import { getHojaEntregaDatePart, type HojaEntregaSheetData } from "@/lib/hoja-entrega-data";
import {
  getArtilleriaLogoDataUrl,
  getPublicAssetAbsolutePath,
} from "@/lib/server/react-pdf-assets";

type RenderHojasEntregaPdfOptions = {
  pageNumberLabel?: string;
  includePageNumbers?: boolean;
  includeSheetPage?: boolean;
  performanceMode?: "adaptive" | "fast-batch";
  fastBatchInitialProfileId?: DensityProfile["id"];
  fastBatchChunkSize?: number;
  adaptiveInitialProfileId?: DensityProfile["id"];
  includeUsageGuidePage?: boolean;
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

type FirmaBloqueId = "alistado" | "encargado" | "oficial";

type FirmaLineaTipo = "titulo" | "rango" | "nombre";

type FirmaLineaConMeta = {
  linea: FirmaLinea;
  bloqueId: FirmaBloqueId;
  tipo: FirmaLineaTipo;
};

type FirmaBloque = {
  id: FirmaBloqueId;
  lineas: FirmaLineaConMeta[];
};

type PreparedHojaEntregaData = {
  data: HojaEntregaSheetData;
  entregaCols: Array<string | null>;
  devolCols: Array<string | null>;
  headerInfoRows: HeaderInfoCell[][];
  firmaBloques: FirmaBloque[];
  observacionesText: string[];
};

type DensityProfile = {
  id: "normal" | "compact" | "tight" | "ultra" | "micro" | "nano" | "pico" | "atomic";
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

const HOJA_ENTREGA_MONO_REGULAR_FAMILY = "HojaEntregaMonoRegular";
const HOJA_ENTREGA_MONO_BOLD_FAMILY = "HojaEntregaMonoBold";
const HOJA_ENTREGA_MONO_REGULAR_ASSET = "assets/fonts/RobotoMono-Regular.ttf";
const HOJA_ENTREGA_MONO_BOLD_ASSET = "assets/fonts/RobotoMono-Bold.ttf";

let hojaEntregaFontsRegistrationPromise: Promise<boolean> | null = null;

async function ensureHojaEntregaFontsRegistered(ReactPdf: {
  Font: {
    register: (descriptor: { family: string; src: string }) => void;
  };
}) {
  if (hojaEntregaFontsRegistrationPromise) return hojaEntregaFontsRegistrationPromise;

  hojaEntregaFontsRegistrationPromise = (async () => {
    try {
      const regularFontPath = getPublicAssetAbsolutePath(HOJA_ENTREGA_MONO_REGULAR_ASSET);
      const boldFontPath = getPublicAssetAbsolutePath(HOJA_ENTREGA_MONO_BOLD_ASSET);
      ReactPdf.Font.register({ family: HOJA_ENTREGA_MONO_REGULAR_FAMILY, src: regularFontPath });
      ReactPdf.Font.register({ family: HOJA_ENTREGA_MONO_BOLD_FAMILY, src: boldFontPath });
      return true;
    } catch (error) {
      console.warn(
        "[hoja-entrega-pdf] No se pudieron registrar fuentes embebidas, usando fallback estándar.",
        error
      );
      return false;
    }
  })();

  return hojaEntregaFontsRegistrationPromise;
}

const DATE_ROW_CONFIGS: DateRowConfig[] = [
  { key: "day", label: "DÍA", part: "day", showTMarkers: false, mergedVariant: "top" },
  { key: "month", label: "MES", part: "month", showTMarkers: true, mergedVariant: "middle" },
  { key: "year", label: "AÑO", part: "year", showTMarkers: false, mergedVariant: "bottom" },
];

const FIRMA_BLOQUE_ORDEN: FirmaBloqueId[] = ["alistado", "encargado", "oficial"];
const DEFAULT_FAST_BATCH_CHUNK_SIZE = 50;
const MAX_FAST_BATCH_CHUNK_SIZE = 300;
const FAST_BATCH_CHUNK_SIZE_ENV_VAR = "HOJAS_ENTREGA_PDF_FAST_BATCH_CHUNK_SIZE";

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

function getDensityProfileById(profileId: DensityProfile["id"]) {
  return DENSITY_PROFILES.find((profile) => profile.id === profileId) ?? DENSITY_PROFILES[0];
}

function buildTighterProfileOrder(initialProfileId: DensityProfile["id"]) {
  const preferred = getDensityProfileById(initialProfileId);
  const preferredIndex = DENSITY_PROFILES.findIndex((entry) => entry.id === preferred.id);
  return DENSITY_PROFILES.slice(preferredIndex >= 0 ? preferredIndex : 0);
}

function normalizeFastBatchChunkSize(rawValue: number | undefined) {
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue))
    return DEFAULT_FAST_BATCH_CHUNK_SIZE;
  const parsedValue = Math.floor(rawValue);
  if (parsedValue < 1) return DEFAULT_FAST_BATCH_CHUNK_SIZE;
  return Math.min(parsedValue, MAX_FAST_BATCH_CHUNK_SIZE);
}

function getFastBatchChunkSizeFromEnv() {
  const raw = process.env[FAST_BATCH_CHUNK_SIZE_ENV_VAR]?.trim();
  if (!raw) return undefined;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function buildHojaDensityScore(hoja: HojaEntregaSheetData) {
  const entregasConFecha = hoja.entregas.reduce((acc, equipo) => acc + (equipo.fecha ? 1 : 0), 0);
  const devolucionesConFecha = hoja.devoluciones.reduce(
    (acc, equipo) => acc + (equipo.fecha ? 1 : 0),
    0
  );
  const observacionesChars = hoja.observaciones.reduce(
    (acc, equipo) => acc + equipo.texto.length,
    0
  );
  return (
    hoja.matrix.length * 8 +
    hoja.observaciones.length * 20 +
    observacionesChars +
    entregasConFecha * 4 +
    devolucionesConFecha * 4
  );
}

function pickFastBatchSampleHojas(hojas: HojaEntregaSheetData[], maxItems = 3) {
  if (hojas.length <= maxItems) return hojas;

  let densestIndex = 0;
  let densestScore = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < hojas.length; index += 1) {
    const nextScore = buildHojaDensityScore(hojas[index]);
    if (nextScore > densestScore) {
      densestScore = nextScore;
      densestIndex = index;
    }
  }

  const candidates = [0, densestIndex, hojas.length - 1, Math.floor(hojas.length / 2)];
  const selectedIndexes: number[] = [];
  for (const candidateIndex of candidates) {
    if (candidateIndex < 0 || candidateIndex >= hojas.length) continue;
    if (selectedIndexes.includes(candidateIndex)) continue;
    selectedIndexes.push(candidateIndex);
    if (selectedIndexes.length === maxItems) break;
  }

  return selectedIndexes.map((index) => hojas[index]);
}

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
  ciDisplay: string
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
      {
        width: "25%",
        label: "Batería:",
        value: data.persona.bateria || "Cdo. y Serv.",
        minHeight: 14,
      },
      {
        width: "25%",
        label: ingresoLabel,
        value: formatShortDate(data.persona.fechaIngreso),
        minHeight: 14,
      },
      { width: "28%", label: "Fecha de impresión:", value: fechaImpresion, minHeight: 14 },
    ],
  ];
}

function parseFirmaBloqueId(linea: FirmaLinea): FirmaBloqueId {
  const prefix = linea.key.split("-", 1)[0];
  if (prefix === "encargado" || prefix === "oficial") {
    return prefix;
  }
  return "alistado";
}

function parseFirmaLineaTipo(linea: FirmaLinea): FirmaLineaTipo {
  if (linea.key.endsWith("-nombre")) return "nombre";
  if (linea.key.endsWith("-rango") || linea.key.endsWith("-grado")) return "rango";
  return "titulo";
}

function buildFirmaBloques(lineas: FirmaLinea[]): FirmaBloque[] {
  const grouped: Record<FirmaBloqueId, FirmaLineaConMeta[]> = {
    alistado: [],
    encargado: [],
    oficial: [],
  };

  for (const linea of lineas) {
    const bloqueId = parseFirmaBloqueId(linea);
    grouped[bloqueId].push({
      linea,
      bloqueId,
      tipo: parseFirmaLineaTipo(linea),
    });
  }

  return FIRMA_BLOQUE_ORDEN.map((id) => ({
    id,
    lineas: grouped[id],
  })).filter((bloque) => bloque.lineas.length > 0);
}

function prepareHojaEntregaData(
  data: HojaEntregaSheetData,
  fechaImpresion: string
): PreparedHojaEntregaData {
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
    encargadoStartIndentLevel: 0,
  });
  const ciPrefix = isValidUruguayanCi(data.persona.ci) ? "" : "⚠ ";
  const ciDisplay = `${ciPrefix}${formatUruguayanCi(data.persona.ci)}`;

  return {
    data,
    entregaCols: normalizeSixDates(data.entregas),
    devolCols: normalizeSixDates(data.devoluciones),
    headerInfoRows: buildHeaderInfoRows(data, fechaImpresion, ciDisplay),
    firmaBloques: buildFirmaBloques(firmaLineas),
    observacionesText: data.observaciones.map(
      (obs) =>
        `${renderDate(obs.fecha, "day")}/${renderDate(obs.fecha, "month")}/${renderDate(obs.fecha, "year")} - ${obs.texto}`
    ),
  };
}

export async function renderHojasEntregaPdf(
  hojas: HojaEntregaSheetData[],
  fechaImpresion: string,
  options: RenderHojasEntregaPdfOptions = {}
): Promise<Uint8Array> {
  const ReactPdf = await import("@react-pdf/renderer");
  const { Document, Page, Text, View, StyleSheet, pdf, Image } = ReactPdf;
  const usingEmbeddedMonoFonts = await ensureHojaEntregaFontsRegistered(ReactPdf);
  const monoRegularFontFamily = usingEmbeddedMonoFonts
    ? HOJA_ENTREGA_MONO_REGULAR_FAMILY
    : "Courier";
  const monoBoldFontFamily = usingEmbeddedMonoFonts
    ? HOJA_ENTREGA_MONO_BOLD_FAMILY
    : "Courier-Bold";
  const sansRegularFontFamily = "Helvetica";
  const sansBoldFontFamily = "Helvetica-Bold";

  const logoDataUrl = await getArtilleriaLogoDataUrl();

  const pageNumberLabel = options.pageNumberLabel ?? "Hoja";
  const includePageNumbers = options.includePageNumbers ?? true;
  const includeSheetPage = options.includeSheetPage ?? true;
  const includeUsageGuidePage = options.includeUsageGuidePage ?? false;
  if (!includeSheetPage && !includeUsageGuidePage) {
    throw new Error("Debe renderizarse al menos una pagina (hoja o guia de responsabilidad).");
  }
  const expectedPagesPerHoja = (includeSheetPage ? 1 : 0) + (includeUsageGuidePage ? 1 : 0);
  const performanceMode = options.performanceMode ?? "adaptive";
  const fastBatchInitialProfileId = options.fastBatchInitialProfileId ?? "tight";
  const fastBatchChunkSize = normalizeFastBatchChunkSize(
    options.fastBatchChunkSize ?? getFastBatchChunkSizeFromEnv()
  );
  const adaptiveInitialProfileId =
    options.adaptiveInitialProfileId ??
    (performanceMode === "fast-batch" ? fastBatchInitialProfileId : "normal");
  const stylesCache = new Map<DensityProfile["id"], ReturnType<typeof StyleSheet.create>>();

  const renderDocumentToUint8Array = async (document: React.ReactElement) => {
    const instance = pdf(document as Parameters<typeof pdf>[0]);
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
  };

  const renderHojasBytesWithProfile = async (
    hojasToRender: PreparedHojaEntregaData[],
    profile: DensityProfile
  ) => {
    const signatureTab = getSignatureTabSize(profile);
    const signatureLineHeight = 1.2;
    const signatureFontSize = scaled(profile, 6.6, 4.7);
    const signatureBlockSeparatorGap = scaled(profile, 22, 16);
    const signatureNameGap = scaled(profile, 8.2, 6.2);

    const cachedStyles = stylesCache.get(profile.id);
    const styles =
      cachedStyles ??
      StyleSheet.create({
        page: {
          paddingLeft: A4_MARGIN_X,
          paddingRight: A4_MARGIN_X,
          paddingTop: A4_MARGIN_TOP,
          paddingBottom: A4_MARGIN_BOTTOM,
          fontFamily: monoRegularFontFamily,
          fontSize: scaled(profile, 6.7, 4.6),
          color: "#000000",
          backgroundColor: "#ffffff",
        },

        sheet: {
          minHeight: A4_CONTENT_HEIGHT,
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
          minHeight: scaled(profile, 22, 16),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        },

        logo: {
          width: 35,
          height: 35,
          position: "absolute",
          left: 10,
          top: 2,
        },

        topTitle: {
          textAlign: "center",
          fontFamily: monoBoldFontFamily,
          fontSize: scaled(profile, 8.1, 5.8),
        },

        subTitleCell: {
          backgroundColor: BG_WHITE,
          paddingVertical: scaled(profile, 1.4, 0.65),
          minHeight: scaled(profile, 16.5, 11.5),
        },

        subTitle: {
          textAlign: "center",
          fontFamily: monoBoldFontFamily,
          fontSize: scaled(profile, 7.9, 5.7),
        },

        infoCell: {
          backgroundColor: BG_WHITE,
          justifyContent: "center",
          paddingTop: scaled(profile, 0.8, 0.25),
          paddingBottom: scaled(profile, 0.8, 0.25),
        },

        infoLine: {
          fontFamily: monoRegularFontFamily,
          fontSize: scaled(profile, 6.9, 4.9),
          lineHeight: 1,
        },

        infoLabel: {
          fontFamily: monoBoldFontFamily,
          fontSize: scaled(profile, 6.9, 4.9),
          lineHeight: 1,
        },

        infoValue: {
          fontFamily: monoRegularFontFamily,
          fontWeight: "normal",
          fontSize: scaled(profile, 6.9, 4.9),
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
          fontFamily: monoBoldFontFamily,
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
          fontFamily: monoBoldFontFamily,
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
          fontFamily: monoRegularFontFamily,
          fontWeight: "normal",
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
          fontFamily: monoRegularFontFamily,
          fontWeight: "normal",
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
          fontFamily: monoRegularFontFamily,
          fontWeight: "normal",
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
          fontFamily: monoBoldFontFamily,
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
          marginTop: scaled(profile, 13, 8),
          marginBottom: scaled(profile, 11, 7),
          paddingTop: scaled(profile, 2.2, 1.2),
          paddingBottom: scaled(profile, 1.8, 1),
          paddingLeft: 0,
          paddingRight: 0,
          flexShrink: 0,
        },
        firmaLineRow: {
          width: "100%",
          flexDirection: "row",
          paddingLeft: 0,
        },
        firmaBlock: {
          width: "100%",
          paddingBottom: scaled(profile, 0.6, 0.4),
        },
        firmaLine: {
          fontSize: signatureFontSize,
          lineHeight: signatureLineHeight,
        },
        firmaLineStrong: {
          fontFamily: monoBoldFontFamily,
        },

        pageNumber: {
          position: "absolute",
          right: A4_MARGIN_X,
          bottom: 4,
          fontSize: scaled(profile, 5.2, 3.8),
          fontFamily: sansRegularFontFamily,
        },

        // Manual / Guia Styles
        manualPage: {
          padding: 40,
          fontFamily: sansRegularFontFamily,
          fontSize: 10,
          color: "#1e293b",
        },
        manualTitle: {
          fontSize: 18,
          fontFamily: sansBoldFontFamily,
          color: "#0f172a",
          marginBottom: 15,
          textAlign: "center",
          textDecoration: "underline",
        },
        manualSection: {
          marginBottom: 15,
          padding: 10,
          backgroundColor: "#f8fafc",
          borderLeftWidth: 3,
          borderLeftColor: "#059669",
        },
        manualSubtitle: {
          fontSize: 12,
          fontFamily: sansBoldFontFamily,
          color: "#334155",
          marginBottom: 5,
        },
        manualText: {
          fontSize: 10,
          lineHeight: 1.4,
          textAlign: "justify",
        },
      });
    if (!cachedStyles) {
      stylesCache.set(profile.id, styles);
    }

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
              <Text
                style={[styles.infoLine, cell.align === "center" ? styles.center : styles.left]}
              >
                {cell.label ? <Text style={styles.infoLabel}>{`${cell.label} `}</Text> : null}
                <Text style={styles.infoValue}>{cell.value || " "}</Text>
              </Text>
            </View>
          );
        })}
      </View>
    );

    const HojaEntregaSheetPage = ({ hoja }: { hoja: PreparedHojaEntregaData }) => {
      const { data, entregaCols, devolCols, headerInfoRows, firmaBloques, observacionesText } =
        hoja;

      const itemWidthStyle = { width: widthPct(ITEM_COL_WIDTH) };
      const dataWidthStyle = { width: widthPct(DATA_COL_WIDTH) };
      const sixDataWidthStyle = { width: widthPct(DATA_COL_WIDTH * 6) };

      return (
        <Page size="A4" style={styles.page}>
          <View style={styles.sheet}>
            <View style={styles.content}>
              <View style={styles.table}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.cell,
                      styles.topTitleCell,
                      styles.noRightBorder,
                      { width: "100%" },
                    ]}
                  >
                    <Text style={styles.topTitle}>
                      {'Grupo "Brig.Gral.Manuel Oribe" de Artillería 105mm No.1.-'}
                    </Text>
                  </View>
                </View>

                <View style={styles.row}>
                  <View
                    style={[
                      styles.cell,
                      styles.subTitleCell,
                      styles.noRightBorder,
                      { width: "100%" },
                    ]}
                  >
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

                  <View
                    style={[
                      styles.cell,
                      styles.sectionHeader,
                      styles.noRightBorder,
                      dataWidthStyle,
                    ]}
                  />
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

                      <View
                        style={[styles.cell, mergedStyle, styles.noRightBorder, dataWidthStyle]}
                      >
                        {config.showTMarkers ? <Text style={styles.tText}>T</Text> : null}
                      </View>
                    </View>
                  );
                })}

                <View style={styles.matrixSection}>
                  {data.matrix.map((row, index) => (
                    <View key={`${row.equipo}-${index}`} style={[styles.row, styles.matrixRow]}>
                      <View style={[styles.cell, styles.itemCell, itemWidthStyle]}>
                        <Text style={styles.itemName}>{row.equipo}</Text>
                      </View>

                      {row.entrega.slice(0, 6).map((qty, idx) => (
                        <View
                          key={`entrega-${index}-${idx}`}
                          style={[styles.cell, styles.qtyCell, dataWidthStyle]}
                        >
                          <Text style={styles.qtyText}>{formatQuantity(qty)}</Text>
                        </View>
                      ))}

                      <View style={[styles.cell, styles.totalCell, dataWidthStyle]}>
                        <Text style={styles.totalText}>{formatTotal(row.entregaTotal)}</Text>
                      </View>

                      {row.devolucion.slice(0, 6).map((qty, idx) => (
                        <View
                          key={`devolucion-${index}-${idx}`}
                          style={[styles.cell, styles.qtyCell, dataWidthStyle]}
                        >
                          <Text style={styles.qtyText}>{formatQuantity(qty)}</Text>
                        </View>
                      ))}

                      <View
                        style={[
                          styles.cell,
                          styles.totalCell,
                          styles.noRightBorder,
                          dataWidthStyle,
                        ]}
                      >
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

                    {observacionesText.length === 0 ? (
                      <Text style={styles.observacionLine}> </Text>
                    ) : (
                      observacionesText.map((texto, index) => (
                        <Text key={`observacion-${index}`} style={styles.observacionLine}>
                          {texto}
                        </Text>
                      ))
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.firmas}>
                {firmaBloques.map((bloque, blockIndex) => {
                  const isLastBlock = blockIndex === firmaBloques.length - 1;

                  return (
                    <View
                      key={`firma-bloque-${bloque.id}-${blockIndex}`}
                      style={[
                        styles.firmaBlock,
                        !isLastBlock ? { marginBottom: signatureBlockSeparatorGap } : {},
                      ]}
                    >
                      {bloque.lineas.map(({ linea, tipo }, lineIndex) => (
                        <View
                          key={`${linea.key}-${lineIndex}`}
                          style={[
                            styles.firmaLineRow,
                            {
                              paddingLeft: (linea.indentLevel || 0) * signatureTab,
                              marginTop: tipo === "nombre" ? signatureNameGap : 0,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.firmaLine, linea.isBold ? styles.firmaLineStrong : {}]}
                          >
                            {linea.text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {includePageNumbers && hojasToRender.length === 1 ? (
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

    const GuiaUsoPage = () => (
      <Page size="A4" style={styles.manualPage}>
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          {logoDataUrl
            ? React.createElement(Image, { src: logoDataUrl, style: { width: 60, height: 60 } })
            : null}
        </View>
        <Text style={styles.manualTitle}>GUÍA DE CUIDADO Y RESPONSABILIDAD</Text>

        <View style={styles.manualSection}>
          <Text style={styles.manualSubtitle}>1. Conservación del Equipo</Text>
          <Text style={styles.manualText}>
            El equipo entregado es propiedad del Estado y su cuidado es responsabilidad directa del
            personal que lo recibe. Mantenga sus prendas limpias, secas y almacenadas en lugares
            adecuados para evitar el deterioro prematuro.
          </Text>
        </View>

        <View style={styles.manualSection}>
          <Text style={styles.manualSubtitle}>2. Pérdidas y Deterioro</Text>
          <Text style={styles.manualText}>
            Cualquier pérdida o daño por negligencia deberá ser reportado inmediatamente a su
            superior. La reposición de equipos extraviados se rige por las normativas
            administrativas vigentes.
          </Text>
        </View>

        <View style={styles.manualSection}>
          <Text style={styles.manualSubtitle}>3. Proceso de Devolución</Text>
          <Text style={styles.manualText}>
            Al finalizar su servicio o ser destinado a otra unidad, todo el equipo registrado en
            esta hoja debe ser devuelto al Depósito en condiciones óptimas de higiene. Se dejará
            constancia en la columna de DEVOLUCIONES.
          </Text>
        </View>

        <View
          style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 10 }}
        >
          <Text style={{ fontSize: 8, color: "#64748b", textAlign: "center" }}>
            &ldquo;La disciplina en el equipo refleja la disciplina en el servicio.&rdquo;
          </Text>
        </View>
      </Page>
    );

    const HojaEntregaPdfDocument = () => (
      <Document title="Hoja de Entrega" author="Sistema de Depósito General - Artilleria 1">
        {hojasToRender.flatMap((hoja, index) => {
          const pages: React.ReactElement[] = [];
          if (includeSheetPage) {
            pages.push(
              <HojaEntregaSheetPage key={`${hoja.data.persona.ci}-${index}`} hoja={hoja} />
            );
          }
          if (includeUsageGuidePage) {
            pages.push(<GuiaUsoPage key={`guia-${hoja.data.persona.ci}-${index}`} />);
          }
          return pages;
        })}
      </Document>
    );

    return renderDocumentToUint8Array(<HojaEntregaPdfDocument />);
  };

  const renderSingleHojaBytesWithProfile = async (
    hoja: PreparedHojaEntregaData,
    profile: DensityProfile
  ) => {
    return renderHojasBytesWithProfile([hoja], profile);
  };

  const getPdfPageCount = async (bytes: Uint8Array) => {
    return (await PDFDocument.load(bytes, { parseSpeed: ParseSpeeds.Fastest })).getPageCount();
  };

  const renderFastBatchBytesForProfile = async (
    hojasToRender: PreparedHojaEntregaData[],
    profile: DensityProfile,
    chunkSize: number
  ): Promise<Uint8Array | null> => {
    if (hojasToRender.length <= chunkSize) {
      const bytes = await renderHojasBytesWithProfile(hojasToRender, profile);
      const pageCount = await getPdfPageCount(bytes);
      return pageCount === hojasToRender.length * expectedPagesPerHoja ? bytes : null;
    }

    const mergedPdf = await PDFDocument.create();

    for (let start = 0; start < hojasToRender.length; start += chunkSize) {
      const chunk = hojasToRender.slice(start, start + chunkSize);
      const chunkBytes = await renderHojasBytesWithProfile(chunk, profile);
      const chunkPdf = await PDFDocument.load(chunkBytes, { parseSpeed: ParseSpeeds.Fastest });

      if (chunkPdf.getPageCount() !== chunk.length * expectedPagesPerHoja) {
        return null;
      }

      const copiedPages = await mergedPdf.copyPages(chunkPdf, chunkPdf.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    return mergedPdf.save();
  };

  const renderSingleHojaBestFitBytes = async (hoja: PreparedHojaEntregaData) => {
    let bestProfileId: DensityProfile["id"] | null = null;
    let bestPageCount = 0;
    let bestEffortBytes: Uint8Array | null = null;
    const profileOrder = buildTighterProfileOrder(adaptiveInitialProfileId);

    for (const profile of profileOrder) {
      const bytes = await renderSingleHojaBytesWithProfile(hoja, profile);
      bestProfileId = profile.id;
      bestEffortBytes = bytes;

      const pageCount = await getPdfPageCount(bytes);
      bestPageCount = pageCount;
      if (pageCount === expectedPagesPerHoja) {
        return bytes;
      }
    }

    if (bestEffortBytes) {
      console.warn(
        `[hoja-entrega-pdf] Ajuste de una hoja fuera de objetivo para ${buildAlistadoNombre(hoja.data)}. Perfil final=${bestProfileId}, esperado=${expectedPagesPerHoja}, obtenido=${bestPageCount}. Se devuelve mejor esfuerzo sin cortar contenido.`
      );
      return bestEffortBytes;
    }

    throw new Error(
      `No se pudo generar el PDF de hoja de entrega para ${buildAlistadoNombre(hoja.data)}.`
    );
  };

  if (hojas.length === 0) {
    return new Uint8Array();
  }

  const preparedHojas = hojas.map((hoja) => prepareHojaEntregaData(hoja, fechaImpresion));

  if (preparedHojas.length === 1) {
    return renderSingleHojaBestFitBytes(preparedHojas[0]);
  }

  if (performanceMode === "fast-batch") {
    const fastProfiles = buildTighterProfileOrder(fastBatchInitialProfileId);
    const fastBatchSample = pickFastBatchSampleHojas(hojas);
    const preparedFastBatchSample =
      fastBatchSample.length === hojas.length
        ? preparedHojas
        : fastBatchSample.map((hoja) => prepareHojaEntregaData(hoja, fechaImpresion));

    for (const profile of fastProfiles) {
      if (preparedFastBatchSample.length !== preparedHojas.length) {
        const sampleBytes = await renderHojasBytesWithProfile(preparedFastBatchSample, profile);
        const samplePageCount = await getPdfPageCount(sampleBytes);
        if (samplePageCount !== preparedFastBatchSample.length * expectedPagesPerHoja) {
          continue;
        }
      }

      const bytes = await renderFastBatchBytesForProfile(
        preparedHojas,
        profile,
        fastBatchChunkSize
      );
      if (bytes) {
        return bytes;
      }
    }
  }

  const mergedPdf = await PDFDocument.create();

  for (const hoja of preparedHojas) {
    const singleBytes = await renderSingleHojaBestFitBytes(hoja);
    const singlePdf = await PDFDocument.load(singleBytes, { parseSpeed: ParseSpeeds.Fastest });
    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());

    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  return mergedPdf.save();
}
