import Image from "next/image";
import type { EtiquetaCajaPrintData } from "@/lib/etiquetado-data";

export type EtiquetaOrientacion = "horizontal" | "vertical";

type Codigo = {
  codigo: string;
  talle: string;
};

type Equipo = {
  nombre: string;
  cantidad: number;
  codigos: Codigo[];
};

type Caja = {
  identificador: string;
  piso: string;
  estante: string;
  destino: string;
  equipos: Equipo[];
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

function buildPrintStyles(orientacion: EtiquetaOrientacion) {
  const pageWidth = orientacion === "horizontal" ? "297mm" : "210mm";
  const pageHeight = orientacion === "horizontal" ? "210mm" : "297mm";
  const pageSize = `${pageWidth} ${pageHeight}`;

  return `
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
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    main {
      display: flex;
      flex-direction: column;
      align-items: center;
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
      align-items: stretch;
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
      align-items: center;
      justify-content: center;
      background: #fff;
      color: #111;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
    }

    @media print {
      html, body {
        background: #fff;
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

function toCajaModel(caja: EtiquetaCajaPrintData): Caja {
  return {
    identificador: `Caja N°${caja.codigoDepositoGeneral}`,
    piso: normalizeValue(caja.piso, "-"),
    estante: normalizeValue(caja.estanteria, "-"),
    destino: DESTINO_CAJA,
    equipos: caja.equipos.map((equipo) => ({
      nombre: normalizeValue(equipo.itemNombre, "-"),
      cantidad: equipo.cantidad,
      codigos: equipo.codigosSIE.map((codigo) => ({
        codigo: normalizeValue(codigo.codigo, "Sin código"),
        talle: normalizeValue(codigo.talla, "-"),
      })),
    })),
  };
}

function getLayoutClass(totalEquipos: number): string {
  if (totalEquipos <= 2) return "grid-cols-2";
  if (totalEquipos === 3) return "grid-cols-3";
  if (totalEquipos === 4) return "grid-cols-2";
  return "grid-cols-3";
}

function getNameSizeClass(totalEquipos: number): string {
  if (totalEquipos <= 2) return "text-[42px] leading-[0.9]";
  if (totalEquipos === 3) return "text-[34px] leading-[0.9]";
  if (totalEquipos === 4) return "text-[28px] leading-[0.92]";
  return "text-[26px] leading-[0.92]";
}

function getQtySizeClass(totalEquipos: number): string {
  if (totalEquipos <= 2) return "text-[44px]";
  if (totalEquipos === 3) return "text-[38px]";
  if (totalEquipos === 4) return "text-[34px]";
  return "text-[32px]";
}

function getCodigoLayout(totalCodigos: number, orientacion: EtiquetaOrientacion): CodigoLayout {
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
  equipo: Equipo;
  totalEquipos: number;
  orientacion: EtiquetaOrientacion;
}) {
  const codigos = equipo.codigos.length > 0 ? equipo.codigos : [{ codigo: "Sin código", talle: "-" }];
  const codigoLayout = getCodigoLayout(codigos.length, orientacion);
  const codigoColumns = buildCodigoColumns(codigos, codigoLayout.columns);
  const visibleCodigoColumns = codigoColumns.length;

  return (
    <div className="rounded-[14px] border-[2px] border-black px-3 py-3 grid grid-rows-[auto_minmax(0,1fr)] gap-2 min-h-0 overflow-hidden">
      <div className="shrink-0">
        <div className={`font-black uppercase tracking-tight break-words ${getNameSizeClass(totalEquipos)}`}>
          {equipo.nombre}
        </div>
        <div className="text-right leading-none pt-1.5 border-t border-black/20 mt-1.5">
          <div className="text-[10px] font-extrabold uppercase tracking-tight">Cant.</div>
          <div className={`${getQtySizeClass(totalEquipos)} font-black`}>{equipo.cantidad}</div>
        </div>
      </div>

      <div className="min-h-0 overflow-hidden grid grid-rows-[auto_minmax(0,1fr)]">
        <div className="bg-neutral-200 px-3 py-1 border-t border-b border-neutral-300">
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
                <div className="text-[10px] font-extrabold uppercase tracking-tight">Código:</div>
                <div className="h-full w-px bg-black/40 justify-self-center" aria-hidden="true" />
                <div className="text-[10px] font-extrabold uppercase tracking-tight text-right">Talle:</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="px-3 py-2 min-h-0 grid gap-x-3"
          style={{ gridTemplateColumns: `repeat(${visibleCodigoColumns}, minmax(0,1fr))` }}
        >
          {codigoColumns.map((column, columnIndex) => (
            <div key={`${equipo.nombre}-col-${columnIndex}`} className={`${codigoLayout.rowGapClass}`}>
              {column.map((codigo, index) => (
                <div
                  key={`${equipo.nombre}-${codigo.codigo}-${codigo.talle}-${columnIndex}-${index}`}
                  className={`grid gap-2 items-end ${
                    index < column.length - 1 ? `border-b border-black/15 ${codigoLayout.rowPaddingClass}` : ""
                  }`}
                  style={{
                    gridTemplateColumns: `minmax(0,1fr) ${codigoLayout.separatorWidth} ${codigoLayout.talleColumnWidth}`,
                  }}
                >
                  <div
                    className={`${codigoLayout.valueSizeClass} font-black leading-tight whitespace-nowrap tabular-nums tracking-[0.01em]`}
                  >
                    {codigo.codigo}
                  </div>
                  <div className="h-full w-px bg-black/35 justify-self-center" aria-hidden="true" />
                  <div
                    className={`${codigoLayout.valueSizeClass} font-black leading-tight whitespace-nowrap tabular-nums text-right tracking-[0.01em]`}
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
  const cajaModel = toCajaModel(caja);
  const totalEquipos = cajaModel.equipos.length;
  const totalUnidades = cajaModel.equipos.reduce((acc, equipo) => acc + equipo.cantidad, 0);
  const totalCodigos = cajaModel.equipos.reduce((acc, equipo) => acc + equipo.codigos.length, 0);

  return (
    <section className="etiqueta-sheet" data-orientacion={orientacion}>
      <div className="bg-white shadow-2xl border-[3px] border-black rounded-[18px] p-[10px] w-full h-full">
        <div className="w-full h-full rounded-[14px] border-[2px] border-black p-4 flex flex-col gap-3 text-black font-sans overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr] gap-3 shrink-0">
            <div className="rounded-[14px] border-[2px] border-black px-4 py-3 flex flex-col justify-center min-w-0">
              <div className="text-[13px] font-extrabold uppercase tracking-tight">Etiqueta de caja</div>
              <div className="text-[56px] font-black uppercase leading-[0.9] tracking-tight break-words">
                {cajaModel.identificador}
              </div>
            </div>

            <div className="rounded-[14px] border-[2px] border-black px-4 py-3 flex flex-col justify-center min-w-0">
              <div className="text-[13px] font-extrabold uppercase tracking-tight">Ubicación</div>
              <div className="text-[42px] font-black uppercase leading-[0.9] tracking-tight break-words">
                Piso {cajaModel.piso} - Estante {cajaModel.estante}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_1fr] gap-3 shrink-0">
            <div className="rounded-[14px] border-[2px] border-black overflow-hidden">
              <div className="grid grid-cols-2 divide-x-[2px] divide-black h-full">
                <div className="px-4 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-tight">Equipos distintos</div>
                  <div className="text-[28px] font-black leading-none">{totalEquipos}</div>
                </div>
                <div className="px-4 py-2">
                  <div className="text-[11px] font-extrabold uppercase tracking-tight">Unidades totales</div>
                  <div className="text-[28px] font-black leading-none">{totalUnidades}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border-[2px] border-black px-4 py-2 flex items-center min-w-0">
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-tight">Códigos registrados</div>
                <div className="text-[28px] font-black leading-none">{totalCodigos}</div>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <div className="text-[12px] font-extrabold uppercase tracking-tight">Contenido de la caja</div>
          </div>

          <div className={`grid ${getLayoutClass(totalEquipos)} gap-3 flex-1 min-h-0 auto-rows-fr`}>
            {cajaModel.equipos.length === 0 ? (
              <div className="rounded-[14px] border-[2px] border-dashed border-black px-4 py-3 flex items-center justify-center col-span-full">
                <span className="text-[24px] font-black uppercase tracking-tight">Sin equipos registrados</span>
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
            <div className="grid grid-cols-[1fr_auto_1fr] items-center">
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
              <div className="text-[34px] font-black uppercase leading-[0.95] tracking-tight text-center">{cajaModel.destino}</div>
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
