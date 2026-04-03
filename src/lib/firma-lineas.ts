export type FirmaLinea = {
  key: string;
  text: string;
  indentLevel: number;
  isBold?: boolean;
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
};

export function buildFirmasInstitucionalesLineas(
  input: FirmasInstitucionalesInput,
  startIndentLevel = 0,
): FirmaLinea[] {
  return [
    {
      key: "encargado-texto",
      text: input.encargadoTexto,
      indentLevel: startIndentLevel,
    },
    {
      key: "encargado-rango",
      text: input.encargadoRango,
      indentLevel: startIndentLevel + 1,
      isBold: true,
    },
    {
      key: "encargado-nombre",
      text: input.encargadoNombre,
      indentLevel: startIndentLevel + 2,
    },
    {
      key: "oficial-texto",
      text: input.oficialTexto,
      indentLevel: startIndentLevel + 3,
    },
    {
      key: "oficial-rango",
      text: input.oficialRango,
      indentLevel: startIndentLevel + 4,
      isBold: true,
    },
    {
      key: "oficial-nombre",
      text: input.oficialNombre,
      indentLevel: startIndentLevel + 5,
    },
  ];
}

export function buildFirmasHojaEntregaLineas(input: FirmasHojaEntregaInput): FirmaLinea[] {
  return [
    {
      key: "alistado-titulo",
      text: "Firma del alistado:",
      indentLevel: 0,
    },
    {
      key: "alistado-rango",
      text: input.alistadoRango,
      indentLevel: 1,
      isBold: true,
    },
    {
      key: "alistado-nombre",
      text: input.alistadoNombre,
      indentLevel: 2,
    },
    ...buildFirmasInstitucionalesLineas(input, 3),
  ];
}
