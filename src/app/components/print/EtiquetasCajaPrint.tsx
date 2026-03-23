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

const DESTINO_CAJA = "Deposito General";

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
        padding: 0;
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

function EquipoCard({
  equipo,
  totalEquipos,
}: {
  equipo: Equipo;
  totalEquipos: number;
}) {
  const codigoPrincipal = equipo.codigos[0];

  return (
    <div className="rounded-[14px] border-[2px] border-black px-3 py-3 flex flex-col min-h-0 overflow-hidden">
      <div className="min-h-[72px]">
        <div className={`font-black uppercase tracking-tight break-words ${getNameSizeClass(totalEquipos)}`}>
          {equipo.nombre}
        </div>
        <div className="text-right leading-none pt-2">
          <div className="text-[10px] font-extrabold uppercase tracking-tight">Cant.</div>
          <div className={`${getQtySizeClass(totalEquipos)} font-black`}>{equipo.cantidad}</div>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <div className="grid grid-cols-2 bg-neutral-200 px-3 py-1 border-t border-b border-neutral-300">
          <div className="text-[10px] font-extrabold uppercase tracking-tight">Codigo:</div>
          <div className="text-[10px] font-extrabold uppercase tracking-tight">Talle:</div>
        </div>
        <div className="grid grid-cols-2 px-3 py-2 items-end">
          <div className="text-[19px] font-black leading-none break-words">{codigoPrincipal?.codigo || "Sin código"}</div>
          <div className="text-[19px] font-black leading-none">{codigoPrincipal?.talle || "-"}</div>
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
              <div className="text-[13px] font-extrabold uppercase tracking-tight">Ubicacion</div>
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
                <div className="text-[11px] font-extrabold uppercase tracking-tight">Codigos registrados</div>
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
                <EquipoCard key={`${equipo.nombre}-${index}`} equipo={equipo} totalEquipos={totalEquipos} />
              ))
            )}
          </div>

          <div className="rounded-[14px] border-[2px] border-black px-4 py-2 shrink-0 text-center">
            <div className="text-[11px] font-extrabold uppercase tracking-tight leading-none">Destino</div>
            <div className="text-[34px] font-black uppercase leading-[0.95] tracking-tight">{cajaModel.destino}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
