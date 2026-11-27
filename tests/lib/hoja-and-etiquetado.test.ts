import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";

const mockPrisma = vi.hoisted(() => ({
  caja: {
    findMany: vi.fn(),
  },
  personal: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  equipo: {
    findMany: vi.fn(),
  },
  movimiento: {
    findMany: vi.fn(),
  },
  configFirma: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { getEtiquetasCajaData, getListadoCajasPrintData } from "@/lib/etiquetado-data";
import {
  getAllHojasEntregaData,
  getHojaEntregaData,
  getMovimientosFueraHojaData,
} from "@/lib/hoja-entrega-data";
import { buildHojaObservaciones } from "@/lib/hoja-entrega-observaciones";
import { formatHojaEntregaDisplayDate, getHojaEntregaDatePart } from "@/lib/hoja-entrega-sheet";
import { getHojaMatrixData } from "@/lib/hoja-matrix";

describe("etiquetado-data.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("construye etiquetas filtradas respetando el orden solicitado y derivando equipos desde códigos SIE", async () => {
    mockPrisma.caja.findMany.mockResolvedValueOnce([
      {
        codigoDepositoGeneral: 10,
        estanteria: "B",
        piso: 2,
        equipos: [],
        codigosSIE: [
          {
            equipoCodigoSIE: {
              codigo: "SIE-002",
              talla: "L",
              equipo: { equipoId: BigInt(2), nombre: "Pantalón" },
            },
          },
          {
            equipoCodigoSIE: {
              codigo: "SIE-001",
              talla: null,
              equipo: { equipoId: BigInt(1), nombre: "Camisaco" },
            },
          },
          {
            equipoCodigoSIE: {
              codigo: "SIE-001",
              talla: "M",
              equipo: { equipoId: BigInt(1), nombre: "Camisaco" },
            },
          },
        ],
      },
      {
        codigoDepositoGeneral: 20,
        estanteria: "A",
        piso: 1,
        equipos: [
          { cantidad: 5, equipo: { equipoId: BigInt(3), nombre: "Parka" } },
          { cantidad: 2, equipo: { equipoId: BigInt(4), nombre: "Botas" } },
        ],
        codigosSIE: [
          {
            equipoCodigoSIE: {
              codigo: "SIE-010",
              talla: "-",
              equipo: { equipoId: BigInt(3), nombre: "Parka" },
            },
          },
        ],
      },
      {
        codigoDepositoGeneral: 30,
        estanteria: "C",
        piso: 3,
        equipos: [],
        codigosSIE: [],
      },
    ]);

    const etiquetas = await getEtiquetasCajaData({
      codigosDepositoGeneral: [20, 10, 20, 0, -5, 1.5],
    });

    expect(mockPrisma.caja.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigoDepositoGeneral: { in: [20, 10] } },
      })
    );

    expect(etiquetas.map((e) => e.codigoDepositoGeneral)).toEqual([20, 10, 30]);
    expect(etiquetas[0]).toMatchObject({
      codigoDepositoGeneral: 20,
      cantidad: 7,
      equipoNombres: ["Botas", "Parka"],
      tallas: [],
    });
    expect(etiquetas[0]?.equipos[0]?.sinCodigo).toBe(true);
    expect(etiquetas[0]?.equipos[1]?.sinCodigo).toBe(false);

    expect(etiquetas[1]).toMatchObject({
      codigoDepositoGeneral: 10,
      cantidad: 3,
      equipoNombres: ["Camisaco", "Pantalón"],
      tallas: ["L", "M"],
    });
    expect(etiquetas[1]?.codigosSIE).toEqual([
      { codigo: "SIE-001", talla: null },
      { codigo: "SIE-001", talla: "M" },
      { codigo: "SIE-002", talla: "L" },
    ]);
  });

  it("construye el listado general de cajas ordenado por piso, estantería, código y contenido", async () => {
    mockPrisma.caja.findMany.mockResolvedValueOnce([
      {
        codigoDepositoGeneral: 5,
        estanteria: "B",
        piso: "PB",
        equipos: [],
        codigosSIE: [],
      },
      {
        codigoDepositoGeneral: 2,
        estanteria: "A",
        piso: 1,
        equipos: [
          { cantidad: 4, equipo: { equipoId: BigInt(2), nombre: "Kepi" } },
          { cantidad: 2, equipo: { equipoId: BigInt(1), nombre: "Cinturón" } },
        ],
        codigosSIE: [],
      },
      {
        codigoDepositoGeneral: 1,
        estanteria: "A",
        piso: 1,
        equipos: [{ cantidad: 1, equipo: { equipoId: BigInt(3), nombre: "Bolso" } }],
        codigosSIE: [],
      },
      {
        codigoDepositoGeneral: 3,
        estanteria: "B",
        piso: 1,
        equipos: [{ cantidad: 3, equipo: { equipoId: BigInt(4), nombre: "Mochila" } }],
        codigosSIE: [],
      },
    ]);

    const listado = await getListadoCajasPrintData();

    expect(listado).toEqual([
      { piso: "1", estanteria: "A", codigoDepositoGeneral: 1, contenido: "Bolso", cantidad: 1 },
      { piso: "1", estanteria: "A", codigoDepositoGeneral: 2, contenido: "Cinturón", cantidad: 2 },
      { piso: "1", estanteria: "A", codigoDepositoGeneral: 2, contenido: "Kepi", cantidad: 4 },
      { piso: "1", estanteria: "B", codigoDepositoGeneral: 3, contenido: "Mochila", cantidad: 3 },
      { piso: "PB", estanteria: "B", codigoDepositoGeneral: 5, contenido: "-", cantidad: 0 },
    ]);
  });
});

describe("hoja-entrega-sheet.ts", () => {
  it("extrae partes de fecha y formatea fechas de hoja de entrega", () => {
    expect(getHojaEntregaDatePart("15/03/2026", "day")).toBe("15");
    expect(getHojaEntregaDatePart("15/03/2026", "month")).toBe("03");
    expect(getHojaEntregaDatePart("15/03/2026", "year")).toBe("2026");
    expect(getHojaEntregaDatePart(null, "day")).toBe("");

    expect(formatHojaEntregaDisplayDate("2026-03-15")).toBe("15/03/2026");
    expect(formatHojaEntregaDisplayDate(new Date("2026-03-15T00:00:00.000Z"))).toBe("15/03/2026");
    expect(formatHojaEntregaDisplayDate(null)).toBe("-");
  });
});

describe("hoja-entrega-observaciones.ts", () => {
  it("combina y ordena observaciones personales y de movimientos incluyendo fuera de hoja", () => {
    const observaciones = buildHojaObservaciones(
      [
        { fecha: "2026-01-10", texto: "  Alta en unidad  " },
        { fecha: "2026-01-10", texto: "Apto físico" },
        { fecha: "2026-01-11", texto: "   " },
        { fecha: "   ", texto: "Ignorar" },
        { fecha: "99/99/2026", texto: "Fecha no parseable" },
      ],
      [
        {
          fecha: new Date("2026-01-10T00:00:00.000Z"),
          tipo: TipoMovimiento.DEVOLUCION,
          observaciones: "Completa",
          equipos: [{ cantidad: 1, equipo: { nombre: "Casco", activo: true } }],
        },
        {
          fecha: "10/01/2026",
          tipo: TipoMovimiento.ENTREGA,
          observaciones: "Dotación",
          equipos: [
            { cantidad: 1, equipo: { nombre: "Casco", activo: true } },
            {
              cantidad: 1,
              equipo: null as unknown as { nombre: string; activo: boolean },
            },
          ],
        },
        {
          fecha: "10/01/2026",
          tipo: TipoMovimiento.ENTREGA,
          observaciones: "Temporal",
          equipos: [{ cantidad: 2, equipo: { nombre: "Linterna", activo: false } }],
        },
        {
          fecha: "10/01/2026",
          tipo: "DEVOLUCION",
          observaciones: "",
          equipos: [{ cantidad: 1, equipo: { nombre: "Radio", activo: false } }],
        },
        {
          fecha: "10/01/2026",
          tipo: TipoMovimiento.PRESTAMO,
          observaciones: "Se ignora préstamo",
        },
        {
          fecha: "10/01/2026",
          tipo: "" as unknown as TipoMovimiento,
          observaciones: "Sin tipo",
        },
        {
          fecha: "12/01/2026",
          tipo: TipoMovimiento.ENTREGA,
          observaciones: null,
        },
        {
          fecha: "",
          tipo: TipoMovimiento.ENTREGA,
          observaciones: "Vacía",
        },
      ]
    );

    expect(observaciones).toEqual([
      { fecha: "10/01/2026", texto: "Alta en unidad" },
      { fecha: "10/01/2026", texto: "Apto físico" },
      { fecha: "10/01/2026", texto: "Entrega: Dotación" },
      { fecha: "10/01/2026", texto: "Devolución: Completa" },
      { fecha: "10/01/2026", texto: "Entrega Fuera de Hoja: 2 x Linterna (Temporal)" },
      { fecha: "10/01/2026", texto: "Devolución Fuera de Hoja: 1 x Radio" },
      { fecha: "99/99/2026", texto: "Fecha no parseable" },
    ]);
  });
});

describe("hoja-entrega-data.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna null si la CI es inválida o si la persona no existe", async () => {
    expect(await getHojaEntregaData("12345678")).toBeNull();
    expect(mockPrisma.personal.findFirst).not.toHaveBeenCalled();

    mockPrisma.personal.findFirst.mockResolvedValueOnce(null);
    mockPrisma.equipo.findMany.mockResolvedValueOnce([]);
    mockPrisma.configFirma.findUnique.mockResolvedValueOnce({
      id: 1,
      encargadoRango: "Sgto.",
      encargadoNombre: "Lara",
      oficialRango: "Tte.",
      oficialNombre: "Otero",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(await getHojaEntregaData("12345672")).toBeNull();
  });

  it("mapea una hoja individual consolidando más de cinco columnas y calculando saldos", async () => {
    const entregas = [1, 2, 3, 4, 5, 6, 7].map((day) => ({
      movimiento: {
        fecha: new Date(`2026-01-0${day}T00:00:00.000Z`),
        tipo: TipoMovimiento.ENTREGA,
        observaciones: day === 1 ? "Inicial" : null,
        equipos: [
          { cantidad: 1, equipo: { nombre: "Camisaco", activo: true } },
          { cantidad: 1, equipo: { nombre: "Linterna", activo: false } },
        ],
      },
    }));

    const devoluciones = [
      {
        movimiento: {
          fecha: new Date("2026-02-01T00:00:00.000Z"),
          tipo: TipoMovimiento.DEVOLUCION,
          observaciones: "Devolución parcial",
          equipos: [{ cantidad: 2, equipo: { nombre: "Camisaco", activo: true } }],
        },
      },
    ];

    mockPrisma.personal.findFirst.mockResolvedValueOnce({
      ci: "12345672",
      apellido1: "Pérez",
      apellido2: null,
      nombre1: "Juan",
      nombre2: null,
      esReingreso: true,
      fechaIngreso: new Date("2024-01-10T00:00:00.000Z"),
      fechaIngresoOriginal: new Date("2020-05-01T00:00:00.000Z"),
      rango: { abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 1 },
      bateria: null,
      tallas: [{ tallaValor: "L", tallaTipo: { nombre: "PARKA" } }],
      movimientosDestinatario: [...entregas, ...devoluciones],
      observaciones: [{ fecha: new Date("2024-01-10T00:00:00.000Z"), texto: "Reingreso" }],
    });

    mockPrisma.equipo.findMany.mockResolvedValueOnce([
      { nombre: "Camisaco" },
      { nombre: "Pantalón" },
    ]);

    mockPrisma.configFirma.findUnique.mockResolvedValueOnce({
      id: 1,
      encargadoRango: "",
      encargadoNombre: "",
      oficialRango: "",
      oficialNombre: "",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const sheet = await getHojaEntregaData("12345672");

    expect(sheet).not.toBeNull();
    expect(sheet?.persona.tallas).toEqual({
      PARKA: "L",
      CAMISACO: "-",
      PANTALON: "-",
      KEPI: "-",
      CALZADO: "-",
    });
    expect(sheet?.entregas.map((e) => e.fecha)).toEqual([
      "02/01/2026",
      "03/01/2026",
      "04/01/2026",
      "05/01/2026",
      "06/01/2026",
      "07/01/2026",
    ]);
    expect(sheet?.devoluciones.map((d) => d.fecha)).toEqual([
      "01/02/2026",
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(sheet?.matrix[0]).toEqual({
      equipo: "Camisaco",
      entrega: [2, 1, 1, 1, 1, 1],
      entregaTotal: 7,
      devolucion: [2, 0, 0, 0, 0, 0],
      devolucionTotal: 5,
    });
    expect(sheet?.firmas).toMatchObject({
      encargadoRango: "Sargento",
      encargadoNombre: "NOMBRE",
      oficialRango: "Oficial",
      oficialNombre: "NOMBRE",
    });
  });

  it("retorna todas las hojas ordenadas por jerarquía y lista movimientos fuera de hoja", async () => {
    mockPrisma.personal.findMany.mockResolvedValueOnce([
      {
        ci: "45678905",
        apellido1: "Zeta",
        apellido2: null,
        nombre1: "Ana",
        nombre2: null,
        esReingreso: null,
        fechaIngreso: null,
        fechaIngresoOriginal: null,
        rango: { abreviacion: "Sdo. 1º", nombreCompleto: "Soldado 1º", orden: 4 },
        bateria: { nombre: "Alfa" },
        tallas: [],
        movimientosDestinatario: [],
        observaciones: [],
      },
      {
        ci: "12345672",
        apellido1: "Alfa",
        apellido2: null,
        nombre1: "Juan",
        nombre2: null,
        esReingreso: false,
        fechaIngreso: null,
        fechaIngresoOriginal: null,
        rango: { abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 1 },
        bateria: { nombre: "Beta" },
        tallas: [],
        movimientosDestinatario: [],
        observaciones: [],
      },
    ]);
    mockPrisma.equipo.findMany.mockResolvedValueOnce([{ nombre: "Casco" }]);
    mockPrisma.configFirma.findUnique.mockResolvedValueOnce({
      id: 1,
      encargadoRango: "Sgto.",
      encargadoNombre: "Lara",
      oficialRango: "Tte.",
      oficialNombre: "Otero",
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const allSheets = await getAllHojasEntregaData();
    expect(allSheets.map((s) => s.persona.ci)).toEqual(["12345672", "45678905"]);

    mockPrisma.movimiento.findMany.mockResolvedValueOnce([
      {
        movimientoId: BigInt(100),
        fecha: new Date("2026-05-10T00:00:00.000Z"),
        tipo: TipoMovimiento.ENTREGA,
        observaciones: "Sin comentario",
        destinatarioPersonal: null,
        equipos: [{ cantidad: 1, equipo: { nombre: "Linterna" } }],
      },
      {
        movimientoId: BigInt(101),
        fecha: new Date("2026-05-11T00:00:00.000Z"),
        tipo: TipoMovimiento.DEVOLUCION,
        observaciones: null,
        destinatarioPersonal: {
          personal: {
            ci: "12345672",
            apellido1: "Pérez",
            apellido2: "Gómez",
            nombre1: "Juan",
            nombre2: null,
            rango: { abreviacion: "Sgto.", orden: null },
          },
        },
        equipos: [{ cantidad: 2, equipo: { nombre: "Linterna" } }],
      },
    ]);

    const fueraHoja = await getMovimientosFueraHojaData();
    expect(fueraHoja).toEqual([
      {
        movimientoId: "101",
        fecha: "11/05/2026",
        tipo: TipoMovimiento.DEVOLUCION,
        ci: "12345672",
        persona: "Pérez Gómez Juan",
        gradoAbreviacion: "Sgto.",
        gradoOrden: null,
        equipo: "Linterna",
        cantidad: 2,
        observaciones: null,
      },
    ]);
  });
});

describe("hoja-matrix.ts (cálculo de totales y desempates)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePersonaRow(overrides: {
    ci: string;
    apellido1: string;
    apellido2?: string | null;
    nombre1: string;
    nombre2?: string | null;
    bateria?: { nombre: string; orden: number | null } | null;
    rango?: { abreviacion: string; nombreCompleto: string; orden: number | null };
    movimientos?: Array<{
      tipo: TipoMovimiento;
      equipos: Array<{ equipoId: bigint; cantidad: number }>;
    }>;
  }) {
    return {
      ci: overrides.ci,
      apellido1: overrides.apellido1,
      apellido2: overrides.apellido2 ?? null,
      nombre1: overrides.nombre1,
      nombre2: overrides.nombre2 ?? null,
      bateria: overrides.bateria ?? null,
      rango: overrides.rango ?? {
        abreviacion: "Sgto.",
        nombreCompleto: "Sargento",
        orden: 1,
      },
      movimientosDestinatario: (overrides.movimientos ?? []).map((mov) => ({
        movimiento: mov,
      })),
    };
  }

  it("calcula saldos por equipo y aplica todos los criterios de ordenamiento", async () => {
    mockPrisma.equipo.findMany.mockResolvedValueOnce([
      { equipoId: BigInt(1), nombre: "Casco" },
      { equipoId: BigInt(2), nombre: "Parka" },
    ]);

    mockPrisma.personal.findMany.mockResolvedValueOnce([
      makePersonaRow({
        ci: "9",
        apellido1: "López",
        nombre1: "Carlos",
        rango: { abreviacion: "Cabo 1º", nombreCompleto: "Cabo 1º", orden: 2 },
      }),
      makePersonaRow({
        ci: "8",
        apellido1: "Díaz",
        nombre1: "Luis",
        bateria: null,
      }),
      makePersonaRow({
        ci: "7",
        apellido1: "Díaz",
        nombre1: "Luis",
        bateria: { nombre: "Bravo", orden: 1 },
      }),
      makePersonaRow({
        ci: "6",
        apellido1: "Díaz",
        nombre1: "Luis",
        bateria: { nombre: "Alfa", orden: 1 },
      }),
      makePersonaRow({
        ci: "5",
        apellido1: "Acosta",
        apellido2: "Zeta",
        nombre1: "Juan",
        bateria: { nombre: "Alfa", orden: 1 },
      }),
      makePersonaRow({
        ci: "4",
        apellido1: "Acosta",
        apellido2: "Baez",
        nombre1: "Pedro",
        bateria: { nombre: "Alfa", orden: 1 },
      }),
      makePersonaRow({
        ci: "3",
        apellido1: "Acosta",
        apellido2: "Baez",
        nombre1: "Ana",
        nombre2: "Sofía",
        bateria: { nombre: "Alfa", orden: 1 },
      }),
      makePersonaRow({
        ci: "2",
        apellido1: "Acosta",
        apellido2: "Baez",
        nombre1: "Ana",
        nombre2: "Beatriz",
        bateria: { nombre: "Alfa", orden: 1 },
      }),
      makePersonaRow({
        ci: "1",
        apellido1: "Acosta",
        apellido2: "Baez",
        nombre1: "Ana",
        nombre2: "Beatriz",
        bateria: { nombre: "Alfa", orden: 1 },
        movimientos: [
          {
            tipo: TipoMovimiento.ENTREGA,
            equipos: [
              { equipoId: BigInt(1), cantidad: 3 },
              { equipoId: BigInt(999), cantidad: 5 },
            ],
          },
          {
            tipo: TipoMovimiento.DEVOLUCION,
            equipos: [{ equipoId: BigInt(1), cantidad: 1 }],
          },
        ],
      }),
    ]);

    const result = await getHojaMatrixData({ bateria: "   " });

    expect(mockPrisma.personal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { rango: { tipo: TipoPersonal.SUBALTERNO } },
      })
    );

    expect(result.equipos).toEqual([
      { equipoId: "1", nombre: "Casco" },
      { equipoId: "2", nombre: "Parka" },
    ]);
    expect(result.rows.map((r) => r.ci)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(result.rows[0]?.totales).toEqual([2, 0]);
    expect(result.rows[0]?.totalGeneral).toBe(2);
  });

  it("cubre el desempate asimétrico de batería nula, filtros de batería y apellidos/nombres nulos", async () => {
    mockPrisma.equipo.findMany.mockResolvedValue([]);
    mockPrisma.personal.findMany.mockResolvedValueOnce([
      makePersonaRow({
        ci: "1",
        apellido1: "Acosta",
        apellido2: null,
        nombre1: "Ana",
        nombre2: null,
        bateria: null,
      }),
      makePersonaRow({
        ci: "2",
        apellido1: "Acosta",
        apellido2: "Baez",
        nombre1: "Ana",
        nombre2: "Lucía",
        bateria: { nombre: "Alfa", orden: null },
      }),
      makePersonaRow({
        ci: "3",
        apellido1: "Baez",
        apellido2: null,
        nombre1: "Ana",
        nombre2: null,
        bateria: null,
      }),
      makePersonaRow({
        ci: "4",
        apellido1: "Acosta",
        apellido2: null,
        nombre1: "Ana",
        nombre2: "Beatriz",
        bateria: null,
      }),
    ]);

    const result = await getHojaMatrixData();
    expect(result.rows.map((r) => r.ci)).toEqual(["2", "1", "4", "3"]);

    mockPrisma.personal.findMany.mockResolvedValueOnce([]);
    await getHojaMatrixData({ bateria: "Batería A" });
    expect(mockPrisma.personal.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          rango: { tipo: TipoPersonal.SUBALTERNO },
          bateria: { is: { nombre: "Batería A" } },
        },
      })
    );

    mockPrisma.personal.findMany.mockResolvedValueOnce([]);
    await getHojaMatrixData({ bateria: "Sin batería" });
    expect(mockPrisma.personal.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          rango: { tipo: TipoPersonal.SUBALTERNO },
          bateriaId: null,
        },
      })
    );
  });
});
