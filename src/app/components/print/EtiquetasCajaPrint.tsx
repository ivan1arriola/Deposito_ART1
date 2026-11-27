import Image from "next/image";
import type { EtiquetaCajaPrintData } from "@/lib/etiquetado-data";
import {
  formatInstitutionalPrintDate,
  InstitutionalPrintHeader,
  INSTITUTIONAL_PRINT_HEADER_STYLES,
} from "@/app/components/print/InstitutionalPrintHeader";

export type EtiquetaOrientacion = "horizontal" | "vertical";

type Codigo = {
  codigo: string;
  talle: string;
};

type EtiquetaEquipo = {
  nombre: string;
  cantidad: number;
  codigos: Codigo[];
};

type Caja = {
  identificador: string;
  piso: string;
  estante: string;
  destino: string;
  equipos: EtiquetaEquipo[];
};

type CodigoLayout = {
  columns: 1 | 2 | 3;
  valueSizeClass: string;
  rowGapClass: string;
  rowPaddingClass: string;
  talleColumnWidth: string;
  separatorWidth: string;
};

const DESTINO_CAJA = "Depósito General";

const PRINT_SAFE_NUMERIC_STYLE = {
  fontVariantNumeric: "lining-nums tabular-nums",
} as const;

function buildPrintStyles(orientacion: EtiquetaOrientacion) {
  const pageWidth = orientacion === "horizontal" ? "297mm" : "210mm";
  const pageHeight = orientacion === "horizontal" ? "210mm" : "297mm";
  const pageSize = `${pageWidth} ${pageHeight}`;
  return `
    ${INSTITUTIONAL_PRINT_HEADER_STYLES}

    @page {
      size: ${pageSize};
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      width: 100%;
      min-height: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      background: #e5e5e5;
      font-family: "Times New Roman", Times, serif;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    main {
      display: flex;
      flex-direction: column;
      align-equipos: center;
      gap: 8mm;
      padding: 6mm 0;
    }

    .etiqueta-sheet {
      width: ${pageWidth};
      height: ${pageHeight};
      min-width: ${pageWidth};
      max-width: ${pageWidth};
      min-height: ${pageHeight};
      max-height: ${pageHeight};
      padding: 4mm;
      display: flex;
      align-equipos: stretch;
      justify-content: center;
      page-break-after: always;
      break-after: page;
    }

    .etiqueta-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .etiqueta-empty {
      width: ${pageWidth};
      height: ${pageHeight};
      min-width: ${pageWidth};
      max-width: ${pageWidth};
      min-height: ${pageHeight};
      max-height: ${pageHeight};
      margin: 0 auto;
      padding: 14mm 10mm;
      display: flex;
      align-equipos: center;
      justify-content: center;
      background: #f4f4f4;
      color: #111;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }

    @media print {
      html, body {
        background: #f4f4f4;
      }

      main {
        gap: 0;
        padding: 0;
      }

      .etiqueta-sheet {
        margin: 0;
        padding: 4mm;
      }
    }
  `;
}

function normalizeValue(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function toPrintUppercase(value: string | null | undefined, fallback = "-") {
  const normalized = normalizeValue(value, fallback);
  return normalized.toLocaleUpperCase("es-UY");
}

function toCajaModel(caja: EtiquetaCajaPrintData): Caja {
  return {
    identificador: `Caja N°${caja.codigoDepositoGeneral}`,
    piso: normalizeValue(caja.piso, "-"),
    estante: normalizeValue(caja.estanteria, "-"),
    destino: DESTINO_CAJA,
    equipos: caja.equipos.map((equipo) => ({
      nombre: toPrintUppercase(equipo.equipoNombre),
      cantidad: equipo.cantidad,
      codigos: equipo.codigosSIE.map((codigo) => ({
        codigo: normalizeValue(codigo.codigo, "Sin código"),
        talle: normalizeValue(codigo.talla, "-"),
      })),
    })),
  };
}

function getLayoutClass(totalEquipos: number): string {
  if (totalEquipos === 1) return "grid-cols-1";
  if (totalEquipos === 2) return "grid-cols-2";
  if (totalEquipos === 3) return "grid-cols-3";
  if (totalEquipos === 4) return "grid-cols-2";
  return "grid-cols-3";
}

function getCajaIdentifierSizeClass(
  identificador: string,
  orientacion: EtiquetaOrientacion
): string {
  const length = identificador.trim().length;

  if (orientacion === "vertical") {
    if (length <= 10) return "text-[52px]";
    if (length <= 13) return "text-[46px]";
    return "text-[40px]";
  }

  if (length <= 10) return "text-[56px]";
  if (length <= 13) return "text-[50px]";
  return "text-[44px]";
}

function getUbicacionSizeClass(ubicacion: string, orientacion: EtiquetaOrientacion): string {
  const length = ubicacion.trim().length;

  if (orientacion === "vertical") {
    if (length <= 18) return "text-[40px]";
    if (length <= 24) return "text-[34px]";
    return "text-[30px]";
  }

  if (length <= 18) return "text-[42px]";
  if (length <= 24) return "text-[36px]";
  return "text-[32px]";
}

function getMetricValueSizeClass(value: number): string {
  const digits = String(Math.abs(value)).length;
  if (digits <= 2) return "text-[28px]";
  if (digits <= 4) return "text-[26px]";
  return "text-[24px]";
}

function getNameSizeClass(
  totalEquipos: number,
  totalCodigos: number,
  orientacion: EtiquetaOrientacion
): string {
  if (totalEquipos === 1) {
    if (orientacion === "vertical") {
      if (totalCodigos <= 3) return "text-[66px] leading-[0.88]";
      if (totalCodigos <= 8) return "text-[58px] leading-[0.9]";
      if (totalCodigos <= 14) return "text-[50px] leading-[0.92]";
      if (totalCodigos <= 24) return "text-[42px] leading-[0.94]";
      return "text-[34px] leading-[0.96]";
    }

    if (totalCodigos <= 3) return "text-[74px] leading-[0.88]";
    if (totalCodigos <= 8) return "text-[66px] leading-[0.9]";
    if (totalCodigos <= 14) return "text-[58px] leading-[0.92]";
    if (totalCodigos <= 24) return "text-[48px] leading-[0.94]";
    if (totalCodigos <= 36) return "text-[40px] leading-[0.96]";
    return "text-[34px] leading-[0.98]";
  }

  if (totalEquipos === 2) return "text-[42px] leading-[0.9]";
  if (totalEquipos === 3) return "text-[34px] leading-[0.9]";
  if (totalEquipos === 4) return "text-[28px] leading-[0.92]";
  return "text-[26px] leading-[0.92]";
}

function getQtySizeClass(
  totalEquipos: number,
  totalCodigos: number,
  orientacion: EtiquetaOrientacion
): string {
  if (totalEquipos === 1) {
    if (orientacion === "vertical") {
      if (totalCodigos <= 8) return "text-[82px]";
      if (totalCodigos <= 14) return "text-[72px]";
      if (totalCodigos <= 24) return "text-[62px]";
      return "text-[52px]";
    }

    if (totalCodigos <= 8) return "text-[88px]";
    if (totalCodigos <= 14) return "text-[76px]";
    if (totalCodigos <= 24) return "text-[66px]";
    if (totalCodigos <= 36) return "text-[58px]";
    return "text-[50px]";
  }

  if (totalEquipos === 2) return "text-[44px]";
  if (totalEquipos === 3) return "text-[38px]";
  if (totalEquipos === 4) return "text-[34px]";
  return "text-[32px]";
}

function getCodigoLayout(
  totalCodigos: number,
  orientacion: EtiquetaOrientacion,
  totalEquipos: number
): CodigoLayout {
  if (totalEquipos === 1) {
    if (orientacion === "vertical") {
      if (totalCodigos <= 4) {
        return {
          columns: 1,
          valueSizeClass: "text-[26px]",
          rowGapClass: "space-y-1.5",
          rowPaddingClass: "pb-1.5",
          talleColumnWidth: "72px",
          separatorWidth: "12px",
        };
      }

      if (totalCodigos <= 8) {
        return {
          columns: 1,
          valueSizeClass: "text-[20px]",
          rowGapClass: "space-y-1",
          rowPaddingClass: "pb-1",
          talleColumnWidth: "64px",
          separatorWidth: "12px",
        };
      }

      if (totalCodigos <= 14) {
        return {
          columns: 2,
          valueSizeClass: "text-[15px]",
          rowGapClass: "space-y-0.5",
          rowPaddingClass: "pb-0.5",
          talleColumnWidth: "52px",
          separatorWidth: "10px",
        };
      }

      if (totalCodigos <= 24) {
        return {
          columns: 2,
          valueSizeClass: "text-[12px]",
          rowGapClass: "space-y-0",
          rowPaddingClass: "pb-0",
          talleColumnWidth: "42px",
          separatorWidth: "8px",
        };
      }

      if (totalCodigos <= 36) {
        return {
          columns: 3,
          valueSizeClass: "text-[10px]",
          rowGapClass: "space-y-0",
          rowPaddingClass: "pb-0",
          talleColumnWidth: "36px",
          separatorWidth: "6px",
        };
      }

      return {
        columns: 3,
        valueSizeClass: "text-[9px]",
        rowGapClass: "space-y-0",
        rowPaddingClass: "pb-0",
        talleColumnWidth: "32px",
        separatorWidth: "6px",
      };
    }

    if (totalCodigos <= 3) {
      return {
        columns: 1,
        valueSizeClass: "text-[34px]",
        rowGapClass: "space-y-1.5",
        rowPaddingClass: "pb-1.5",
        talleColumnWidth: "84px",
        separatorWidth: "12px",
      };
    }

    if (totalCodigos <= 8) {
      return {
        columns: 1,
        valueSizeClass: "text-[24px]",
        rowGapClass: "space-y-1",
        rowPaddingClass: "pb-1",
        talleColumnWidth: "70px",
        separatorWidth: "12px",
      };
    }

    if (totalCodigos <= 14) {
      return {
        columns: 2,
        valueSizeClass: "text-[16px]",
        rowGapClass: "space-y-0.5",
        rowPaddingClass: "pb-0.5",
        talleColumnWidth: "54px",
        separatorWidth: "10px",
      };
    }

    if (totalCodigos <= 24) {
      return {
        columns: 2,
        valueSizeClass: "text-[13px]",
        rowGapClass: "space-y-0",
        rowPaddingClass: "pb-0",
        talleColumnWidth: "46px",
        separatorWidth: "8px",
      };
    }

    if (totalCodigos <= 36) {
      return {
        columns: 3,
        valueSizeClass: "text-[11px]",
        rowGapClass: "space-y-0",
        rowPaddingClass: "pb-0",
        talleColumnWidth: "40px",
        separatorWidth: "6px",
      };
    }

    return {
      columns: 3,
      valueSizeClass: "text-[10px]",
      rowGapClass: "space-y-0",
      rowPaddingClass: "pb-0",
      talleColumnWidth: "34px",
      separatorWidth: "6px",
    };
  }

  if (orientacion === "vertical") {
    if (totalCodigos <= 4) {
      return {
        columns: 1,
        valueSizeClass: "text-[16px]",
        rowGapClass: "space-y-1",
        rowPaddingClass: "pb-1",
        talleColumnWidth: "56px",
        separatorWidth: "10px",
      };
    }

    if (totalCodigos <= 10) {
      return {
        columns: 1,
        valueSizeClass: "text-[14px]",
        rowGapClass: "space-y-0.5",
        rowPaddingClass: "pb-0.5",
        talleColumnWidth: "52px",
        separatorWidth: "10px",
      };
    }

    return {
      columns: 2,
      valueSizeClass: "text-[10px]",
      rowGapClass: "space-y-0",
      rowPaddingClass: "pb-0",
      talleColumnWidth: "34px",
      separatorWidth: "8px",
    };
  }

  if (totalCodigos <= 2) {
    return {
      columns: 1,
      valueSizeClass: "text-[18px]",
      rowGapClass: "space-y-1.5",
      rowPaddingClass: "pb-1.5",
      talleColumnWidth: "52px",
      separatorWidth: "8px",
    };
  }

  if (totalCodigos <= 4) {
    return {
      columns: 1,
      valueSizeClass: "text-[16px]",
      rowGapClass: "space-y-1",
      rowPaddingClass: "pb-1",
      talleColumnWidth: "48px",
      separatorWidth: "8px",
    };
  }

  if (totalCodigos <= 8) {
    return {
      columns: 2,
      valueSizeClass: "text-[12px]",
      rowGapClass: "space-y-0.5",
      rowPaddingClass: "pb-0.5",
      talleColumnWidth: "40px",
      separatorWidth: "6px",
    };
  }

  if (totalCodigos <= 12) {
    return {
      columns: 2,
      valueSizeClass: "text-[11px]",
      rowGapClass: "space-y-0.5",
      rowPaddingClass: "pb-0.5",
      talleColumnWidth: "36px",
      separatorWidth: "6px",
    };
  }

  return {
    columns: 3,
    valueSizeClass: "text-[10px]",
    rowGapClass: "space-y-0",
    rowPaddingClass: "pb-0",
    talleColumnWidth: "32px",
    separatorWidth: "6px",
  };
}

function buildCodigoColumns(codigos: Codigo[], columns: CodigoLayout["columns"]) {
  const rowsPerColumn = Math.ceil(codigos.length / columns);
  return Array.from({ length: columns }, (_, columnIndex) => {
    const start = columnIndex * rowsPerColumn;
    const end = start + rowsPerColumn;
    return codigos.slice(start, end);
  }).filter((column) => column.length > 0);
}

function EquipoCard({
  equipo,
  totalEquipos,
  orientacion,
}: {
  equipo: EtiquetaEquipo;
  totalEquipos: number;
  orientacion: EtiquetaOrientacion;
}) {
  const codigos =
    equipo.codigos.length > 0 ? equipo.codigos : [{ codigo: "Sin código", talle: "-" }];
  const codigoLayout = getCodigoLayout(codigos.length, orientacion, totalEquipos);
  const codigoColumns = buildCodigoColumns(codigos, codigoLayout.columns);
  const visibleCodigoColumns = codigoColumns.length;
  const isSingleEquipo = totalEquipos === 1;
  const qtyLabelClass = isSingleEquipo ? "text-[14px]" : "text-[10px]";
  const codigoHeaderClass = isSingleEquipo ? "text-[14px]" : "text-[10px]";
  const codigoHeaderPaddingClass = isSingleEquipo ? "px-4 py-1.5" : "px-3 py-1";
  const codigoSectionPaddingClass = isSingleEquipo ? "px-4 py-3" : "px-3 py-2";
  const cardPaddingClass = isSingleEquipo ? "px-4 py-4" : "px-3 py-3";
  const qtyTopPaddingClass = isSingleEquipo ? "pt-2.5 mt-2.5" : "pt-1.5 mt-1.5";
  const qtyValueClass = isSingleEquipo
    ? `${getQtySizeClass(totalEquipos, codigos.length, orientacion)} leading-[1.02]`
    : `${getQtySizeClass(totalEquipos, codigos.length, orientacion)} leading-[1.05]`;

  return (
    <div
      className={`rounded-[14px] border-[2px] border-black grid grid-rows-[auto_minmax(0,1fr)] gap-2 min-h-0 ${cardPaddingClass}`}
    >
      <div className="shrink-0">
        <div
          className={`font-black uppercase tracking-tight break-words ${getNameSizeClass(
            totalEquipos,
            codigos.length,
            orientacion
          )}`}
        >
          {equipo.nombre}
        </div>
        <div className={`text-right leading-[1] border-t border-black/20 ${qtyTopPaddingClass}`}>
          <div className={`${qtyLabelClass} font-extrabold uppercase tracking-tight`}>Cant.</div>
          <div className={`${qtyValueClass} font-black pt-[1px]`} style={PRINT_SAFE_NUMERIC_STYLE}>
            {equipo.cantidad}
          </div>
        </div>
      </div>

      <div className="min-h-0 grid grid-rows-[auto_minmax(0,1fr)]">
        <div
          className={`bg-neutral-200 ${codigoHeaderPaddingClass} border-t border-b border-neutral-300`}
        >
          <div
            className="grid gap-x-3"
            style={{ gridTemplateColumns: `repeat(${visibleCodigoColumns}, minmax(0,1fr))` }}
          >
            {codigoColumns.map((_, columnIndex) => (
              <div
                key={`${equipo.nombre}-header-${columnIndex}`}
                className="grid"
                style={{
                  gridTemplateColumns: `minmax(0,1fr) ${codigoLayout.separatorWidth} ${codigoLayout.talleColumnWidth}`,
                }}
              >
                <div className={`${codigoHeaderClass} font-extrabold uppercase tracking-tight`}>
                  Código:
                </div>
                <div className="h-full w-px bg-black/40 justify-self-center" aria-hidden="true" />
                <div
                  className={`${codigoHeaderClass} font-extrabold uppercase tracking-tight text-right`}
                >
                  Talle:
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`${codigoSectionPaddingClass} min-h-0 grid gap-x-3`}
          style={{ gridTemplateColumns: `repeat(${visibleCodigoColumns}, minmax(0,1fr))` }}
        >
          {codigoColumns.map((column, columnIndex) => (
            <div
              key={`${equipo.nombre}-col-${columnIndex}`}
              className={`${codigoLayout.rowGapClass}`}
            >
              {column.map((codigo, index) => (
                <div
                  key={`${equipo.nombre}-${codigo.codigo}-${codigo.talle}-${columnIndex}-${index}`}
                  className={`grid gap-2 equipos-end ${
                    index < column.length - 1
                      ? `border-b border-black/15 ${codigoLayout.rowPaddingClass}`
                      : ""
                  }`}
                  style={{
                    gridTemplateColumns: `minmax(0,1fr) ${codigoLayout.separatorWidth} ${codigoLayout.talleColumnWidth}`,
                  }}
                >
                  <div
                    className={`${codigoLayout.valueSizeClass} min-w-0 font-black leading-[1.08] whitespace-nowrap tracking-[0.01em]`}
                    style={PRINT_SAFE_NUMERIC_STYLE}
                  >
                    {codigo.codigo}
                  </div>
                  <div className="h-full w-px bg-black/35 justify-self-center" aria-hidden="true" />
                  <div
                    className={`${codigoLayout.valueSizeClass} min-w-0 font-black leading-[1.08] whitespace-nowrap text-right tracking-[0.01em]`}
                    style={PRINT_SAFE_NUMERIC_STYLE}
                  >
                    {codigo.talle}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EtiquetasCajaPrintStyles({ orientacion }: { orientacion: EtiquetaOrientacion }) {
  return <style>{buildPrintStyles(orientacion)}</style>;
}

export function EtiquetasCajaPrintEmptyState({ message }: { message: string }) {
  return <main className="etiqueta-empty">{message}</main>;
}

export function EtiquetaCajaPrintSheet({
  caja,
  orientacion,
}: {
  caja: EtiquetaCajaPrintData;
  orientacion: EtiquetaOrientacion;
}) {
  const institutionalPrintDate = formatInstitutionalPrintDate();
  const cajaModel = toCajaModel(caja);
  const totalEquipos = cajaModel.equipos.length;
  const totalUnidades = cajaModel.equipos.reduce((acc, equipo) => acc + equipo.cantidad, 0);
  const totalCodigos = cajaModel.equipos.reduce((acc, equipo) => acc + equipo.codigos.length, 0);
  const ubicacionLabel = `Piso ${cajaModel.piso} - Estante ${cajaModel.estante}`;

  return (
    <section className="etiqueta-sheet" data-orientacion={orientacion}>
      <div className="bg-white shadow-2xl border-[3px] border-black rounded-[18px] p-[10px] w-full h-full">
        <div
          className="w-full h-full rounded-[14px] border-[2px] border-black p-4 flex flex-col gap-2 text-black"
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          <InstitutionalPrintHeader printedAt={institutionalPrintDate} compact />
          <div className="grid grid-cols-[1fr_1fr] gap-3 shrink-0">
            <div className="rounded-[14px] border-[2px] border-black px-4 py-3 flex flex-col justify-center min-w-0">
              <div className="text-[13px] font-extrabold uppercase tracking-tight">
                Etiqueta de caja
              </div>
              <div
                className={`${getCajaIdentifierSizeClass(cajaModel.identificador, orientacion)} font-black uppercase leading-[1.02] tracking-tight break-words pt-[2px] pb-[1px]`}
                style={PRINT_SAFE_NUMERIC_STYLE}
              >
                {cajaModel.identificador}
              </div>
            </div>

            <div className="rounded-[14px] border-[2px] border-black px-4 py-3 flex flex-col justify-center min-w-0">
              <div className="text-[13px] font-extrabold uppercase tracking-tight">Ubicación</div>
              <div
                className={`${getUbicacionSizeClass(ubicacionLabel, orientacion)} font-black uppercase leading-[1.02] tracking-tight break-words pt-[2px] pb-[1px]`}
                style={PRINT_SAFE_NUMERIC_STYLE}
              >
                {ubicacionLabel}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3 shrink-0">
            <div className="rounded-[14px] border-[2px] border-black">
              <div className="grid grid-cols-2 divide-x-[2px] divide-black h-full">
                <div className="px-4 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-tight">
                    Equipos distintos
                  </div>
                  <div
                    className={`${getMetricValueSizeClass(totalEquipos)} font-black leading-[1.05] pt-[1px]`}
                    style={PRINT_SAFE_NUMERIC_STYLE}
                  >
                    {totalEquipos}
                  </div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-tight">
                    Unidades totales
                  </div>
                  <div
                    className={`${getMetricValueSizeClass(totalUnidades)} font-black leading-[1.05] pt-[1px]`}
                    style={PRINT_SAFE_NUMERIC_STYLE}
                  >
                    {totalUnidades}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border-[2px] border-black px-4 py-2 flex equipos-center min-w-0">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-tight">
                  Códigos registrados
                </div>
                <div
                  className={`${getMetricValueSizeClass(totalCodigos)} font-black leading-[1.05] pt-[1px]`}
                  style={PRINT_SAFE_NUMERIC_STYLE}
                >
                  {totalCodigos}
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-[12px] font-extrabold uppercase tracking-tight">
              Contenido de la caja
            </div>
          </div>

          <div className={`grid ${getLayoutClass(totalEquipos)} gap-3 flex-1 min-h-0 auto-rows-fr`}>
            {cajaModel.equipos.length === 0 ? (
              <div className="rounded-[14px] border-[2px] border-dashed border-black px-4 py-3 flex equipos-center justify-center col-span-full">
                <span className="text-[24px] font-black uppercase tracking-tight">
                  Sin equipos registrados
                </span>
              </div>
            ) : (
              cajaModel.equipos.map((equipo, index) => (
                <EquipoCard
                  key={`${equipo.nombre}-${index}`}
                  equipo={equipo}
                  totalEquipos={totalEquipos}
                  orientacion={orientacion}
                />
              ))
            )}
          </div>

          <div className="rounded-[14px] border-[2px] border-black px-4 py-2 shrink-0">
            <div className="grid grid-cols-[1fr_auto_1fr] equipos-center">
              <div className="justify-self-end pr-4">
                <Image
                  src="/assets/marca-agua-recibo-prestamo-bn.png"
                  alt=""
                  width={164}
                  height={60}
                  unoptimized
                  aria-hidden="true"
                  className="h-[34px] w-auto object-contain opacity-100"
                />
              </div>
              <div className="text-[34px] font-black uppercase leading-[1.02] tracking-tight text-center pt-[1px] pb-[1px]">
                {cajaModel.destino}
              </div>
              <div className="justify-self-start pl-4">
                <Image
                  src="/assets/marca-agua-recibo-prestamo-bn.png"
                  alt=""
                  width={164}
                  height={60}
                  unoptimized
                  aria-hidden="true"
                  className="h-[34px] w-auto object-contain opacity-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
