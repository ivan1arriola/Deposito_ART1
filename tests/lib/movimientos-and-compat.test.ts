import { beforeEach, describe, expect, it, vi } from "vitest";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";

const mockPrisma = vi.hoisted(() => ({
  $executeRawUnsafe: vi.fn(),
  equipo: {
    findMany: vi.fn(),
  },
  movimientoEquipo: {
    findMany: vi.fn(),
  },
}));

const mockEnsurePrestamoActuanteCompatibility = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/prestamo-actuante", () => ({
  ensurePrestamoActuanteCompatibility: mockEnsurePrestamoActuanteCompatibility,
}));

import {
  buildPersonaExternaEtiqueta,
  buildPersonaExternaNombre,
  buildPersonalDestinatarioEtiqueta,
  buildPersonalDestinatarioNombre,
  buildRecintoDestinatarioEtiqueta,
  mapDestinatarioTipoFromPersonal,
  normalizeRecintoClase,
  resolveDestinatarioMovimiento,
} from "@/lib/movimiento-destinatario";
import { ensureMovimientoDestinatarioRecintoCompatibility } from "@/lib/movimiento-destinatario-recinto-compat";
import {
  buildMovimientoTipoLabel,
  getMovimientosEquipoData,
  parseEquipoMovimientoItemId,
} from "@/lib/movimientos-equipo-data";

type CompatGlobal = typeof globalThis & {
  ensureMovimientoDestinatarioRecintoPromise?: Promise<void> | null;
};

describe("movimiento-destinatario.ts", () => {
  it("mapea tipos de personal y construye nombres y etiquetas", () => {
    expect(mapDestinatarioTipoFromPersonal(TipoPersonal.SUBALTERNO)).toBe("PERSONAL");
    expect(mapDestinatarioTipoFromPersonal(TipoPersonal.OFICIAL)).toBe("OFICIAL");
    expect(mapDestinatarioTipoFromPersonal(TipoPersonal.SUBOFICIAL)).toBe("SUBOFICIAL");

    expect(
      buildPersonalDestinatarioNombre({
        ci: "12345672",
        apellido1: "Pérez",
        apellido2: "Gómez",
        nombre1: "Juan",
        nombre2: "Carlos",
        rango: { abreviacion: "Sgto." },
      })
    ).toBe("Pérez Gómez, Juan Carlos");

    expect(
      buildPersonalDestinatarioNombre({
        ci: "12345672",
        apellido1: "",
        apellido2: null,
        nombre1: "Juan",
        nombre2: null,
        rango: { abreviacion: "Sgto." },
      })
    ).toBe("Juan");

    expect(
      buildPersonalDestinatarioEtiqueta({
        ci: "12345672",
        apellido1: "Pérez",
        apellido2: null,
        nombre1: "Juan",
        nombre2: null,
        rango: { abreviacion: "Sgto." },
      })
    ).toBe("Sgto. Pérez, Juan");

    expect(
      buildPersonaExternaNombre({
        ci: "45678905",
        grado: "Cap.",
        nombre: "Elena",
        apellido: "Díaz",
        unidadDestino: "Regimiento 2",
      })
    ).toBe("Díaz, Elena");

    expect(
      buildPersonaExternaNombre({
        ci: "45678905",
        grado: "Cap.",
        nombre: "Elena",
        apellido: "",
        unidadDestino: "Regimiento 2",
      })
    ).toBe("Elena");

    expect(
      buildPersonaExternaEtiqueta({
        ci: "45678905",
        grado: "Cap.",
        nombre: "Elena",
        apellido: "Díaz",
        unidadDestino: "Regimiento 2",
      })
    ).toBe("Cap. Díaz, Elena");

    expect(normalizeRecintoClase("externo")).toBe("EXTERNO");
    expect(normalizeRecintoClase(undefined)).toBe("INTERNO");
    expect(buildRecintoDestinatarioEtiqueta({ clase: "INTERNO", nombre: "  Sala   Armas  " })).toBe(
      "Sala Armas"
    );
  });

  it("resuelve destinatarios personales, externos, de recinto o nulos", () => {
    const personalConTipo = resolveDestinatarioMovimiento({
      destinatarioPersonal: {
        personal: {
          ci: "12345672",
          apellido1: "Pérez",
          apellido2: null,
          nombre1: "Juan",
          nombre2: null,
          rango: {
            abreviacion: "Tte.",
            nombreCompleto: "Teniente",
            tipo: TipoPersonal.OFICIAL,
            orden: 2,
          },
          bateria: { nombre: "Alfa" },
        },
      },
    });
    expect(personalConTipo).toEqual({
      clase: "INTERNO",
      tipo: "OFICIAL",
      ci: "12345672",
      perfilCi: "12345672",
      nombre: "Pérez, Juan",
      etiqueta: "Tte. Pérez, Juan",
      grado: "Teniente",
      gradoAbreviacion: "Tte.",
      gradoOrden: 2,
      unidadDestino: null,
      bateria: "Alfa",
    });

    const personalSinOpcionales = resolveDestinatarioMovimiento({
      destinatarioPersonal: {
        personal: {
          ci: "45678905",
          apellido1: "López",
          apellido2: null,
          nombre1: "Ana",
          nombre2: null,
          rango: {
            abreviacion: "Sgto.",
            nombreCompleto: "   ",
          },
          bateria: null,
        },
      },
    });
    expect(personalSinOpcionales).toMatchObject({
      tipo: "PERSONAL",
      grado: "Sgto.",
      gradoOrden: null,
      bateria: null,
    });

    const externo = resolveDestinatarioMovimiento({
      destinatarioExterno: {
        personaExterna: {
          ci: "98765432",
          grado: "May.",
          nombre: "Diego",
          apellido: "Silva",
          unidadDestino: "Escuela Militar",
        },
      },
    });
    expect(externo).toEqual({
      clase: "EXTERNO",
      tipo: "EXTERNO",
      ci: "98765432",
      perfilCi: null,
      nombre: "Silva, Diego",
      etiqueta: "May. Silva, Diego",
      grado: "May.",
      gradoAbreviacion: null,
      gradoOrden: null,
      unidadDestino: "Escuela Militar",
      bateria: null,
    });

    const recintoInterno = resolveDestinatarioMovimiento({
      destinatarioRecinto: { clase: "INTERNO", nombre: "Guardia" },
    });
    expect(recintoInterno).toMatchObject({
      clase: "INTERNO",
      tipo: "RECINTO",
      grado: "Recinto interno",
      unidadDestino: "Dentro de la unidad",
    });

    const recintoExterno = resolveDestinatarioMovimiento({
      destinatarioRecinto: { clase: "EXTERNO", nombre: "Taller" },
    });
    expect(recintoExterno).toMatchObject({
      clase: "EXTERNO",
      tipo: "RECINTO",
      grado: "Recinto externo",
      unidadDestino: "Fuera de la unidad",
    });

    expect(resolveDestinatarioMovimiento({})).toBeNull();
  });
});

describe("movimiento-destinatario-recinto-compat.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as CompatGlobal).ensureMovimientoDestinatarioRecintoPromise = null;
    mockEnsurePrestamoActuanteCompatibility.mockResolvedValue(undefined);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
  });

  it("ejecuta el DDL de compatibilidad una sola vez y reutiliza la promesa en memoria", async () => {
    await ensureMovimientoDestinatarioRecintoCompatibility();
    await ensureMovimientoDestinatarioRecintoCompatibility();

    expect(mockEnsurePrestamoActuanteCompatibility).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(15);
  });

  it("limpia la promesa cacheada si ocurre un error para permitir reintentos", async () => {
    mockPrisma.$executeRawUnsafe.mockRejectedValueOnce(new Error("Fallo DDL"));

    await expect(ensureMovimientoDestinatarioRecintoCompatibility()).rejects.toThrow("Fallo DDL");
    expect((globalThis as CompatGlobal).ensureMovimientoDestinatarioRecintoPromise).toBeNull();

    await ensureMovimientoDestinatarioRecintoCompatibility();
    expect(mockEnsurePrestamoActuanteCompatibility).toHaveBeenCalledTimes(2);
  });
});

describe("movimientos-equipo-data.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as CompatGlobal).ensureMovimientoDestinatarioRecintoPromise = null;
    mockEnsurePrestamoActuanteCompatibility.mockResolvedValue(undefined);
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0);
  });

  it("parsea IDs de equipo y genera todas las etiquetas de tipo de movimiento", () => {
    expect(parseEquipoMovimientoItemId(BigInt(5))).toBe(BigInt(5));
    expect(parseEquipoMovimientoItemId("12")).toBe(BigInt(12));
    expect(parseEquipoMovimientoItemId("abc")).toBeNull();
    expect(parseEquipoMovimientoItemId(null)).toBeNull();

    expect(buildMovimientoTipoLabel("ENTREGA", null, null)).toBe("Entrega");
    expect(buildMovimientoTipoLabel("DEVOLUCION", null, null)).toBe("Devolución");
    expect(buildMovimientoTipoLabel("ASIGNACION", null, null)).toBe("Asignación");
    expect(buildMovimientoTipoLabel("PRESTAMO", "PENDIENTE", "EXTERNO")).toBe(
      "Préstamo externo (pendiente)"
    );
    expect(buildMovimientoTipoLabel("PRESTAMO", "DEVUELTO", "EXTERNO")).toBe(
      "Préstamo externo (devuelto)"
    );
    expect(buildMovimientoTipoLabel("PRESTAMO", "PENDIENTE", "INTERNO")).toBe(
      "Préstamo interno (pendiente)"
    );
    expect(buildMovimientoTipoLabel("PRESTAMO", "DEVUELTO", "INTERNO")).toBe(
      "Préstamo interno (devuelto)"
    );
    expect(buildMovimientoTipoLabel("PRESTAMO", "PENDIENTE", "PENDIENTE")).toBe(
      "Préstamo pendiente"
    );
    expect(buildMovimientoTipoLabel("PRESTAMO", "DEVUELTO", null)).toBe("Préstamo devuelto");
    expect(buildMovimientoTipoLabel("PRESTAMO", null, null)).toBe("Préstamo");
  });

  it("retorna catálogo vacío de filas cuando equipoId es nulo o inexistente", async () => {
    mockPrisma.equipo.findMany.mockResolvedValue([
      { equipoId: BigInt(1), nombre: "Casco", activo: true },
    ]);

    const sinSeleccion = await getMovimientosEquipoData();
    expect(sinSeleccion).toEqual({
      equipos: [{ equipoId: "1", nombre: "Casco", activo: true }],
      selectedItem: null,
      rows: [],
    });

    const inexistente = await getMovimientosEquipoData(BigInt(999));
    expect(inexistente).toEqual({
      equipos: [{ equipoId: "1", nombre: "Casco", activo: true }],
      selectedItem: null,
      rows: [],
    });
    expect(mockPrisma.movimientoEquipo.findMany).not.toHaveBeenCalled();
  });

  it("mapea movimientos de préstamos activos/históricos, destinatarios externos y pendientes", async () => {
    mockPrisma.equipo.findMany.mockResolvedValueOnce([
      { equipoId: BigInt(10), nombre: "Radio", activo: true },
    ]);

    mockPrisma.movimientoEquipo.findMany.mockResolvedValueOnce([
      {
        cantidad: 2,
        movimiento: {
          movimientoId: BigInt(1),
          fecha: new Date("2026-06-01T00:00:00.000Z"),
          tipo: TipoMovimiento.PRESTAMO,
          observaciones: "Activo pendiente",
          destinatarioPersonal: {
            personal: {
              ci: "12345672",
              apellido1: "Pérez",
              apellido2: null,
              nombre1: "Juan",
              nombre2: null,
              rango: {
                tipo: TipoPersonal.SUBALTERNO,
                abreviacion: "Sgto.",
                nombreCompleto: "Sargento",
                orden: 1,
              },
            },
          },
          destinatarioExterno: null,
          destinatarioRecinto: null,
          prestamoActivo: { estado: "PENDIENTE" },
          prestamoHistorial: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(2),
          fecha: new Date("2026-06-02T00:00:00.000Z"),
          tipo: TipoMovimiento.PRESTAMO,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: {
            personaExterna: {
              ci: "45678905",
              grado: "Cap.",
              nombre: "Sofía",
              apellido: "López",
              unidadDestino: "Grupo 2",
            },
          },
          destinatarioRecinto: null,
          prestamoActivo: { estado: "DEVUELTO" },
          prestamoHistorial: null,
        },
      },
      {
        cantidad: 3,
        movimiento: {
          movimientoId: BigInt(3),
          fecha: new Date("2026-06-03T00:00:00.000Z"),
          tipo: TipoMovimiento.PRESTAMO,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          destinatarioRecinto: null,
          prestamoActivo: null,
          prestamoHistorial: { estado: "DEVUELTO" },
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(4),
          fecha: new Date("2026-06-04T00:00:00.000Z"),
          tipo: TipoMovimiento.PRESTAMO,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          destinatarioRecinto: null,
          prestamoActivo: null,
          prestamoHistorial: { estado: "PENDIENTE" },
        },
      },
      {
        cantidad: 4,
        movimiento: {
          movimientoId: BigInt(5),
          fecha: null,
          tipo: "ASIGNACION" as TipoMovimiento,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          destinatarioRecinto: { clase: "INTERNO", nombre: "Depósito" },
          prestamoActivo: null,
          prestamoHistorial: null,
        },
      },
    ]);

    const data = await getMovimientosEquipoData(BigInt(10));

    expect(data.rows).toEqual([
      expect.objectContaining({
        movimientoId: "1",
        tipoLabel: "Préstamo interno (pendiente)",
        prestamoEstado: "PENDIENTE",
        clasePrestamo: "INTERNO",
        ci: "12345672",
        perfilCi: "12345672",
        persona: "Pérez, Juan",
        gradoAbreviacion: "Sgto.",
        gradoOrden: 1,
      }),
      expect.objectContaining({
        movimientoId: "2",
        tipoLabel: "Préstamo externo (devuelto)",
        prestamoEstado: "DEVUELTO",
        clasePrestamo: "EXTERNO",
        ci: "45678905",
        perfilCi: null,
        persona: "López, Sofía",
        gradoAbreviacion: "Cap.",
      }),
      expect.objectContaining({
        movimientoId: "3",
        tipoLabel: "Préstamo devuelto",
        prestamoEstado: "DEVUELTO",
        clasePrestamo: "PENDIENTE",
        ci: null,
        persona: "Destinatario pendiente",
        gradoAbreviacion: "Pendiente",
      }),
      expect.objectContaining({
        movimientoId: "4",
        tipoLabel: "Préstamo pendiente",
        prestamoEstado: "PENDIENTE",
        clasePrestamo: "PENDIENTE",
      }),
      expect.objectContaining({
        movimientoId: "5",
        fecha: "",
        tipoLabel: "Asignación",
        prestamoEstado: null,
        clasePrestamo: null,
        persona: "Depósito",
        gradoAbreviacion: "RECINTO",
      }),
    ]);
  });
});
