export type FirmaLinea = {
  key: string;
  text: string;
  indentLevel: number;
  isBold?: boolean;
  inlineOffsetChars?: number;
};

export type FirmasInstitucionalesInput = {
  encargadoTexto: string;
  encargadoRango: string;
  encargadoNombre: string;
  oficialTexto: string;
  oficialRango: string;
  oficialNombre: string;
};

export type FirmasHojaEntregaInput = FirmasInstitucionalesInput & {
  alistadoRango: string;
  alistadoNombre: string;
  encargadoStartIndentLevel?: number;
};

export type FirmaBloqueInput = {
  keyPrefix: string;
  titulo: string;
  grado: string;
  nombre: string;
  indentOffsetLevel?: number;
  titleKeySuffix?: string;
  gradeKeySuffix?: string;
  nameKeySuffix?: string;
};

function countMonospaceChars(value: string) {
  return Array.from(value).length;
}

function buildFirmaBloqueLineas(input: {
  bloque: FirmaBloqueInput;
  baseIndentLevel: number;
}): FirmaLinea[] {
  const baseLevel = input.baseIndentLevel + (input.bloque.indentOffsetLevel ?? 0);
  const titleKeySuffix = input.bloque.titleKeySuffix ?? "titulo";
  const gradeKeySuffix = input.bloque.gradeKeySuffix ?? "grado";
  const nameKeySuffix = input.bloque.nameKeySuffix ?? "nombre";

  return [
    {
      key: `${input.bloque.keyPrefix}-${titleKeySuffix}`,
      text: input.bloque.titulo,
      indentLevel: baseLevel,
    },
    {
      key: `${input.bloque.keyPrefix}-${gradeKeySuffix}`,
      text: input.bloque.grado,
      indentLevel: baseLevel + 1,
      isBold: true,
    },
    {
      key: `${input.bloque.keyPrefix}-${nameKeySuffix}`,
      text: input.bloque.nombre,
      indentLevel: baseLevel + 2,
    },
  ];
}

export function buildFirmasLineas(input: {
  bloques: FirmaBloqueInput[];
  baseIndentLevel?: number;
}): FirmaLinea[] {
  const baseIndentLevel = input.baseIndentLevel ?? 0;
  return input.bloques.flatMap((bloque) =>
    buildFirmaBloqueLineas({
      bloque,
      baseIndentLevel,
    }),
  );
}

export function getFirmaLineBaseIndentCss(linea: Pick<FirmaLinea, "indentLevel">): string {
  return `calc(${linea.indentLevel} * var(--firma-tab-size))`;
}

export function getFirmaLineInlineOffsetCss(linea: Pick<FirmaLinea, "inlineOffsetChars">): string {
  const inlineOffsetChars = linea.inlineOffsetChars ?? 0;
  if (inlineOffsetChars <= 0) {
    return "0";
  }

  return `${inlineOffsetChars}ch`;
}

export function getFirmaLineIndentCss(linea: Pick<FirmaLinea, "indentLevel" | "inlineOffsetChars">): string {
  const inlineOffsetChars = linea.inlineOffsetChars ?? 0;
  if (inlineOffsetChars <= 0) return getFirmaLineBaseIndentCss(linea);

  return `calc(${getFirmaLineBaseIndentCss(linea)} + ${inlineOffsetChars}ch)`;
}

export function getFirmaLineBaseIndentPt(linea: Pick<FirmaLinea, "indentLevel">, tabSizePt: number): number {
  return tabSizePt * linea.indentLevel;
}

export function getFirmaLineInlineOffsetPt(
  linea: Pick<FirmaLinea, "inlineOffsetChars">,
  monospaceCharWidthPt: number,
): number {
  return monospaceCharWidthPt * (linea.inlineOffsetChars ?? 0);
}

export function getFirmaLineIndentPt(
  linea: Pick<FirmaLinea, "indentLevel" | "inlineOffsetChars">,
  tabSizePt: number,
  monospaceCharWidthPt: number,
): number {
  return getFirmaLineBaseIndentPt(linea, tabSizePt) + getFirmaLineInlineOffsetPt(linea, monospaceCharWidthPt);
}

export function buildFirmasInstitucionalesLineas(
  input: FirmasInstitucionalesInput,
  startIndentLevel = 0,
): FirmaLinea[] {
  return buildFirmasLineas({
    baseIndentLevel: startIndentLevel,
    bloques: [
      {
        keyPrefix: "encargado",
        titulo: input.encargadoTexto,
        grado: input.encargadoRango,
        nombre: input.encargadoNombre,
        indentOffsetLevel: 0,
        titleKeySuffix: "texto",
        gradeKeySuffix: "rango",
      },
      {
        keyPrefix: "oficial",
        titulo: input.oficialTexto,
        grado: input.oficialRango,
        nombre: input.oficialNombre,
        indentOffsetLevel: 1,
        titleKeySuffix: "texto",
        gradeKeySuffix: "rango",
      },
    ],
  });
}

export function buildFirmasHojaEntregaLineas(input: FirmasHojaEntregaInput): FirmaLinea[] {
  const encargadoStartIndentLevel = input.encargadoStartIndentLevel ?? 1;

  return buildFirmasLineas({
    baseIndentLevel: 0,
    bloques: [
      {
        keyPrefix: "alistado",
        titulo: "Firma del alistado:",
        grado: input.alistadoRango,
        nombre: input.alistadoNombre,
        indentOffsetLevel: 0,
        gradeKeySuffix: "rango",
      },
      {
        keyPrefix: "encargado",
        titulo: input.encargadoTexto,
        grado: input.encargadoRango,
        nombre: input.encargadoNombre,
        indentOffsetLevel: encargadoStartIndentLevel,
        titleKeySuffix: "texto",
        gradeKeySuffix: "rango",
      },
      {
        keyPrefix: "oficial",
        titulo: input.oficialTexto,
        grado: input.oficialRango,
        nombre: input.oficialNombre,
        indentOffsetLevel: encargadoStartIndentLevel + 1,
        titleKeySuffix: "texto",
        gradeKeySuffix: "rango",
      },
    ],
  });
}
