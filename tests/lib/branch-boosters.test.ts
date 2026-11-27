import { generateValidationDigit } from "ciuy";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatUruguayanCi,
  generatePlaceholderUruguayanCi,
  generateRandomUruguayanCi,
  isValidUruguayanCi,
  normalizeCi,
} from "@/lib/ci";
import {
  buildFirmasLineas,
  getFirmaLineInlineOffsetCss,
  getFirmaLineInlineOffsetPt,
} from "@/lib/firma-lineas";
import {
  formatPrestamoDestinatario,
  prestamoInclude,
  serializePrestamoWithActuante,
  totalUnidadesPrestamo,
  type PrestamoWithRelations,
} from "@/lib/prestamos";
import { normalizeOutputText } from "@/lib/spanish-text";
import { calcularStockTodos } from "@/lib/stock-calc";
import { isAllowedTallaValue, normalizeTallaValue, validateAndNormalizeTallas } from "@/lib/tallas";
import {
  formatUruguayanMobileNumber,
  normalizeOptionalUruguayanMobileNumber,
  normalizeUruguayanMobileNumber,
} from "@/lib/uruguayan-phone";

function makeBasePrestamo(overrides?: Partial<PrestamoWithRelations>): PrestamoWithRelations {
  return {
    movimientoId: BigInt(42),
    tipo: "PRESTAMO",
    fecha: new Date("2026-06-10T00:00:00.000Z"),
    usuarioEntregaId: "usr-entrega",
    afectaStock: true,
    observaciones: "Préstamo de prueba",
    createdAt: new Date("2026-06-10T10:00:00.000Z"),
    updatedAt: new Date("2026-06-10T10:00:00.000Z"),
    destinatarioPersonal: null,
    destinatarioExterno: null,
    usuarioEntrega: {
      usuarioId: "usr-entrega",
      rango: { abreviacion: "Alf." },
      apellido: "Martínez",
      nombre: "Lucía",
      username: "lmartinez",
    },
    prestamoActivo: {
      reciboNumero: "PR-00000042",
      estado: "PENDIENTE",
      fechaEstimadaDevolucionTexto: "15 días",
    },
    prestamoHistorial: null,
    equipos: [
      {
        movimientoId: BigInt(42),
        equipoId: BigInt(7),
        cantidad: 2,
        estadoEntrega: "NUEVO",
        comentarioEntrega: null,
        estadoDevolucion: null,
        comentarioDevolucion: null,
        equipo: {
          equipoId: BigInt(7),
          nombre: "Casco",
          ordenPdf: 1,
        },
      },
      {
        movimientoId: BigInt(42),
        equipoId: BigInt(8),
        cantidad: 3,
        estadoEntrega: "BUENO",
        comentarioEntrega: "Con detalle",
        estadoDevolucion: "BUENO",
        comentarioDevolucion: "Sin novedad",
        equipo: {
          equipoId: BigInt(8),
          nombre: "Chaleco",
          ordenPdf: 2,
        },
      },
    ],
    ...overrides,
  };
}

describe("prestamos.ts", () => {
  it("expone prestamoInclude con las relaciones esperadas", () => {
    expect(prestamoInclude).toHaveProperty("destinatarioPersonal");
    expect(prestamoInclude).toHaveProperty("destinatarioExterno");
    expect(prestamoInclude).toHaveProperty("prestamoActivo");
    expect(prestamoInclude).toHaveProperty("prestamoHistorial");
    expect(prestamoInclude).toHaveProperty("equipos");
  });

  it("formatPrestamoDestinatario cubre interno, externo, pendiente y recinto", () => {
    const interno = formatPrestamoDestinatario({
      destinatarioPersonal: {
        movimientoId: BigInt(1),
        ci: "51067524",
        personal: {
          ci: "51067524",
          tipo: "OFICIAL",
          apellido1: "Rodríguez",
          apellido2: null,
          nombre1: "Leandro",
          nombre2: null,
          telefonoContacto: null,
          rangoId: 1,
          bateriaId: 1,
          esReingreso: false,
          fechaIngreso: new Date(),
          fechaIngresoOriginal: null,
          baja: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          rango: {
            tipo: "OFICIAL",
            abreviacion: "Alf.",
            nombreCompleto: "Alférez",
            orden: 5,
          },
          bateria: { nombre: "Batería A", orden: 1 },
        },
      },
      destinatarioExterno: null,
    });
    expect(interno).toMatchObject({
      clase: "INTERNO",
      tipo: "OFICIAL",
      ci: "51067524",
      bateria: "Batería A",
    });

    const externo = formatPrestamoDestinatario({
      destinatarioPersonal: null,
      destinatarioExterno: {
        movimientoId: BigInt(2),
        personaExternaCi: "12345672",
        personaExterna: {
          ci: "12345672",
          grado: "Sgto.",
          nombre: "Juan",
          apellido: "Pérez",
          unidadDestino: "Unidad X",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    });
    expect(externo).toMatchObject({
      clase: "EXTERNO",
      tipo: "EXTERNO",
      unidadDestino: "Unidad X",
    });

    const pendiente = formatPrestamoDestinatario({
      destinatarioPersonal: null,
      destinatarioExterno: null,
    });
    expect(pendiente).toMatchObject({
      clase: "PENDIENTE",
      tipo: null,
      nombre: "Pendiente de completar",
      etiqueta: "Destinatario pendiente",
    });

    const conRecinto = formatPrestamoDestinatario({
      destinatarioPersonal: null,
      destinatarioExterno: null,
      destinatarioRecinto: { clase: "INTERNO", nombre: "Guardia" },
    } as Parameters<typeof formatPrestamoDestinatario>[0]);
    expect(conRecinto.clase).toBe("PENDIENTE");
  });

  it("serializePrestamoWithActuante cubre préstamo pendiente, devuelto, sin recibo y fallback de nombre", () => {
    const actuanteMap = new Map([["42", { ci: "51067524", label: "Sgto. Wilson Lara" }]]);

    const pendiente = serializePrestamoWithActuante(makeBasePrestamo(), actuanteMap);
    expect(pendiente).toMatchObject({
      prestamoId: "42",
      reciboNumero: "PR-00000042",
      estado: "PENDIENTE",
      actuanteCi: "51067524",
      actuanteNombre: "Sgto. Wilson Lara",
      fechaPrestamo: "10/06/2026",
      fechaEstimadaDevolucionTexto: "15 días",
      fechaDevolucion: null,
      usuarioRecibeDevolucionId: null,
      usuarioRecibeDevolucionNombre: null,
    });
    expect(pendiente.equipos).toHaveLength(2);

    // Devuelto con receptor y sin rangos / nombres vacíos en usuarioEntrega
    const devuelto = serializePrestamoWithActuante(
      makeBasePrestamo({
        fecha: null as unknown as Date,
        prestamoActivo: null,
        usuarioEntrega: {
          usuarioId: "usr-dev",
          rango: null,
          apellido: " ",
          nombre: "",
          username: "devuser",
        },
        prestamoHistorial: {
          reciboNumero: "PR-HIST-42",
          estado: "DEVUELTO",
          fechaDevolucion: new Date("2026-06-20T00:00:00.000Z"),
          fechaEstimadaDevolucionTexto: "20/06/2026",
          createdAt: new Date("2026-06-20T12:00:00.000Z"),
          usuarioRecibeDevolucionId: "usr-recibe",
          usuarioRecibeDevolucion: {
            usuarioId: "usr-recibe",
            rango: { abreviacion: "Sgto." },
            apellido: "Gómez",
            nombre: "Pedro",
            username: "pgomez",
          },
        },
      })
    );
    expect(devuelto).toMatchObject({
      reciboNumero: "PR-HIST-42",
      estado: "DEVUELTO",
      fechaPrestamo: "",
      usuarioEntregaNombre: ",",
      fechaDevolucion: "20/06/2026",
      usuarioRecibeDevolucionId: "usr-recibe",
      usuarioRecibeDevolucionNombre: "Sgto. Gómez, Pedro",
      actuanteCi: null,
      actuanteNombre: null,
    });

    // Sin prestamoActivo ni prestamoHistorial -> genera PR-00000042 y fechaEstimada null
    const sinRegistros = serializePrestamoWithActuante(
      makeBasePrestamo({
        prestamoActivo: null,
        prestamoHistorial: null,
      })
    );
    expect(sinRegistros.reciboNumero).toBe("PR-00000042");
    expect(sinRegistros.fechaEstimadaDevolucionTexto).toBeNull();

    // Devuelto sin usuarioRecibeDevolucion
    const devueltoSinReceptor = serializePrestamoWithActuante(
      makeBasePrestamo({
        prestamoActivo: null,
        prestamoHistorial: {
          reciboNumero: "PR-HIST-43",
          estado: "DEVUELTO",
          fechaDevolucion: new Date("2026-06-21T00:00:00.000Z"),
          fechaEstimadaDevolucionTexto: null,
          createdAt: new Date("2026-06-21T12:00:00.000Z"),
          usuarioRecibeDevolucionId: null,
          usuarioRecibeDevolucion: null,
        },
      })
    );
    expect(devueltoSinReceptor.usuarioRecibeDevolucionNombre).toBeNull();

    // totalUnidadesPrestamo
    expect(totalUnidadesPrestamo(makeBasePrestamo())).toBe(5);
    expect(totalUnidadesPrestamo({ equipos: [] })).toBe(0);
  });
});

describe("ci.ts", () => {
  it("normaliza, formatea y valida cédulas uruguayas cortas, largas e inválidas", () => {
    const randomCi = generateRandomUruguayanCi();
    const placeholderCi = generatePlaceholderUruguayanCi();

    expect(normalizeCi("5.106.752-4")).toBe("51067524");
    expect(isValidUruguayanCi(randomCi)).toBe(true);
    expect(isValidUruguayanCi(placeholderCi)).toBe(true);

    // Formato fuera de rango y con relleno a 7 dígitos
    expect(formatUruguayanCi("1")).toBe("1");
    expect(formatUruguayanCi("123456789")).toBe("123456789");
    expect(formatUruguayanCi("1234567")).toBe("0.123.456-7");
    expect(formatUruguayanCi("51067524")).toBe("5.106.752-4");

    // Validación longitudes inválidas
    expect(isValidUruguayanCi("1")).toBe(false);
    expect(isValidUruguayanCi("123456789")).toBe(false);

    // Validación de CI corta (< 7 dígitos) válida e inválida
    const shortBody = "12345";
    const expectedDigit = generateValidationDigit(shortBody);
    expect(isValidUruguayanCi(`${shortBody}${expectedDigit}`)).toBe(true);
    expect(isValidUruguayanCi(`${shortBody}${(expectedDigit + 1) % 10}`)).toBe(false);

    // Validación de CI larga inválida
    const wrongLastDigit = (Number(randomCi.slice(-1)) + 1) % 10;
    expect(isValidUruguayanCi(`${randomCi.slice(0, -1)}${wrongLastDigit}`)).toBe(false);
  });
});

describe("firma-lineas.ts", () => {
  it("cubre valores por defecto y offsets en cero o indefinidos", () => {
    expect(getFirmaLineInlineOffsetCss({ inlineOffsetChars: 0 })).toBe("0");
    expect(getFirmaLineInlineOffsetCss({})).toBe("0");
    expect(getFirmaLineInlineOffsetPt({}, 2.5)).toBe(0);

    const lineas = buildFirmasLineas({
      bloques: [
        {
          keyPrefix: "test",
          titulo: "Título",
          grado: "Cbo.",
          nombre: "Juan Pérez",
        },
      ],
    });

    expect(lineas).toEqual([
      { key: "test-titulo", text: "Título", indentLevel: 0 },
      { key: "test-grado", text: "Cbo.", indentLevel: 0, isBold: true },
      { key: "test-nombre", text: "Juan Pérez", indentLevel: 0, inlineOffsetChars: 4 },
    ]);
  });
});

describe("spanish-text.ts", () => {
  it("retorna cadena vacía ante null, undefined o vacío en normalizeOutputText", () => {
    expect(normalizeOutputText(null)).toBe("");
    expect(normalizeOutputText(undefined)).toBe("");
    expect(normalizeOutputText("")).toBe("");
  });
});

describe("tallas.ts", () => {
  it("cubre formatos inválidos, calzado fuera de rango, valores decimales y vacíos", () => {
    expect(normalizeTallaValue("PARKA", "  xl ")).toBe("XL");
    expect(normalizeTallaValue("PARKA", "   ")).toBeNull();
    expect(normalizeTallaValue("KEPI", "58.5")).toBe("58.5");
    expect(normalizeTallaValue("CALZADO", "042")).toBe("42");

    expect(isAllowedTallaValue("PARKA", "")).toBe(true);
    expect(isAllowedTallaValue("CALZADO", "42")).toBe(true);
    expect(isAllowedTallaValue("CALZADO", "30")).toBe(false);

    const calzadoRangeErr = validateAndNormalizeTallas({ CALZADO: "99" });
    expect(calzadoRangeErr.ok).toBe(false);
    if (!calzadoRangeErr.ok) expect(calzadoRangeErr.error).toContain("34 a 47");

    const calzadoFormatErr = validateAndNormalizeTallas({ CALZADO: "abc" });
    expect(calzadoFormatErr.ok).toBe(false);
    if (!calzadoFormatErr.ok) expect(calzadoFormatErr.error).toContain("Formato no permitido");

    const ropaFormatErr = validateAndNormalizeTallas({ PARKA: "M@!" });
    expect(ropaFormatErr.ok).toBe(false);
    if (!ropaFormatErr.ok) expect(ropaFormatErr.error).toContain("Formato no permitido");
  });
});

describe("uruguayan-phone.ts", () => {
  it("cubre entradas vacías, nulas e indefinidas", () => {
    expect(normalizeUruguayanMobileNumber("")).toBeNull();
    expect(normalizeUruguayanMobileNumber("abc")).toBeNull();
    expect(normalizeOptionalUruguayanMobileNumber(null)).toBeNull();
    expect(normalizeOptionalUruguayanMobileNumber(undefined)).toBeNull();
    expect(formatUruguayanMobileNumber(null)).toBe("");
    expect(formatUruguayanMobileNumber("123")).toBe("");
  });
});

describe("stock-calc.ts", () => {
  const mockTx = {
    articuloStockMovimiento: {
      groupBy: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maneja _sum.cantidad null en calcularStockTodos para INGRESO y EGRESO", async () => {
    mockTx.articuloStockMovimiento.groupBy.mockResolvedValue([
      { articuloId: 10, tipo: "INGRESO", _sum: { cantidad: null } },
      { articuloId: 20, tipo: "EGRESO", _sum: { cantidad: null } },
    ]);

    const result = await calcularStockTodos(mockTx as never);
    expect(result.get(10)).toBe(0);
    expect(result.get(20)).toBe(0);
  });
});
