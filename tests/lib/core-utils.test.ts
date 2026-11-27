import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TipoMovimiento, TipoPersonal } from "@/generated/prisma/client";

const mockPrisma = vi.hoisted(() => ({
  equipo: {
    findMany: vi.fn(),
  },
  personal: {
    findMany: vi.fn(),
  },
  configFirma: {
    findUnique: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { api } from "@/lib/api";
import { getAppBaseUrl } from "@/lib/app-url";
import { compareTallaOptions, moveIdInOrder } from "@/lib/array-utils";
import { LEGACY_CIRR_BATTERY_NAMES } from "@/lib/cirr-classification";
import { getEquipoResumenData } from "@/lib/equipo-resumen";
import {
  buildEquipoTipoDescriptor,
  buildEquipoTipoOptions,
  GENERAL_TIPO_EQUIPO_CLAVE,
  GENERAL_TIPO_EQUIPO_NOMBRE,
  GENERAL_TIPO_EQUIPO_ORDEN,
  normalizeEquipoTipoClave,
} from "@/lib/equipo-tipos";
import { serializeEquipoTipoData, tipoEquipoRelationSelect } from "@/lib/equipo-tipos-data";
import {
  DEFAULT_FIRMA_CONFIG,
  getFirmaConfig,
  TEXTO_ENCARGADO,
  TEXTO_OFICIAL,
  updateFirmaConfig,
} from "@/lib/firma-config";
import { normalizeSearchTerm } from "@/lib/search";
import { buildSearchIndex, filterSearchIndex, normalizeDigits } from "@/lib/search-index";

describe("api", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("ejecuta GET por defecto con cabeceras anti-caché sin emitir logs con headers ni payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
          "Set-Cookie": "session=xyz",
        },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await api<{ ok: boolean }>("/api/equipos", {
      headers: {
        Authorization: "Bearer token-123",
        Cookie: "sid=abc",
        "X-Custom": "valor",
      },
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentHeaders = options.headers as Headers;
    expect(options.cache).toBe("no-store");
    expect(sentHeaders.get("Cache-Control")).toBe("no-cache");
    expect(sentHeaders.get("Pragma")).toBe("no-cache");
    expect(sentHeaders.get("X-Custom")).toBe("valor");
    expect(console.groupCollapsed).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.groupEnd).not.toHaveBeenCalled();
  });

  it("respeta cabeceras anti-caché y cache en HEAD y omite anti-caché en POST", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ head: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 7 }), { status: 201 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await api<{ head: boolean }>("/api/ping", {
      method: "head",
      cache: "reload",
      headers: {
        "Cache-Control": "max-age=60",
        Pragma: "public",
      },
    });

    const [, headOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headHeaders = headOptions.headers as Headers;
    expect(headOptions.cache).toBe("reload");
    expect(headHeaders.get("Cache-Control")).toBe("max-age=60");
    expect(headHeaders.get("Pragma")).toBe("public");

    const postResult = await api<{ id: number }>("/api/items", {
      method: "post",
      body: JSON.stringify({ nombre: "Casco" }),
    });
    expect(postResult).toEqual({ id: 7 });

    const [, postOptions] = fetchMock.mock.calls[1] as [string, RequestInit];
    const postHeaders = postOptions.headers as Headers;
    expect(postOptions.cache).toBeUndefined();
    expect(postHeaders.has("Cache-Control")).toBe(false);
    expect(postHeaders.has("Pragma")).toBe(false);
  });

  it("propaga errores de fetch sin emitir trazas", async () => {
    const domAbort = new DOMException("Cancelado", "AbortError");
    const errAbort = new Error("Aborted");
    errAbort.name = "AbortError";
    const codeAbort = { code: 20 };
    const messageAbort = { message: "signal is aborted without reason" };
    const plainStringError = "fallo primitivo";

    for (const err of [domAbort, errAbort, codeAbort, messageAbort, plainStringError]) {
      globalThis.fetch = vi.fn().mockRejectedValue(err) as unknown as typeof fetch;
      await expect(api("/api/fail")).rejects.toBe(err);
    }

    expect(console.log).not.toHaveBeenCalled();
    expect(console.groupEnd).not.toHaveBeenCalled();
  });

  it("propaga errores al leer response.text() tanto abortados como genéricos", async () => {
    const abortError = new Error("Request aborted by client");
    const responseAbort = {
      ok: true,
      status: 200,
      statusText: "OK",
      url: "/api/a",
      type: "basic",
      redirected: false,
      headers: new Headers(),
      text: vi.fn().mockRejectedValue(abortError),
    } as unknown as Response;

    globalThis.fetch = vi.fn().mockResolvedValue(responseAbort) as unknown as typeof fetch;
    await expect(api("/api/a")).rejects.toBe(abortError);

    const ioError = new Error("Stream broken");
    const responseIo = {
      ok: true,
      status: 200,
      statusText: "OK",
      url: "/api/b",
      type: "basic",
      redirected: false,
      headers: new Headers(),
      text: vi.fn().mockRejectedValue(ioError),
    } as unknown as Response;

    globalThis.fetch = vi.fn().mockResolvedValue(responseIo) as unknown as typeof fetch;
    await expect(api("/api/b")).rejects.toBe(ioError);
  });

  it("maneja JSON inválido, respuestas !ok con/sin mensaje de error y body vacío en respuesta ok", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("{no-es-json", { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Sin permisos" }), { status: 403 })
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "" }), { status: 400 }))
      .mockResolvedValueOnce(new Response("", { status: 500 }))
      .mockResolvedValueOnce(new Response("", { status: 200 })) as unknown as typeof fetch;

    await expect(api("/api/bad-json")).rejects.toThrow(
      "El servidor devolvió una respuesta inválida."
    );
    await expect(api("/api/forbidden")).rejects.toThrow("Sin permisos");
    await expect(api("/api/empty-err")).rejects.toThrow("Error en la operacion.");
    await expect(api("/api/server-err")).rejects.toThrow("Error en la operacion.");
    await expect(api("/api/empty-ok")).rejects.toThrow(
      "El servidor no devolvió datos. No se pudo completar la lectura."
    );
  });
});

describe("getAppBaseUrl", () => {
  const prevNextAuthUrl = process.env.NEXTAUTH_URL;
  const prevAppBaseUrl = process.env.APP_BASE_URL;

  afterEach(() => {
    if (prevNextAuthUrl === undefined) {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = prevNextAuthUrl;
    }

    if (prevAppBaseUrl === undefined) {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = prevAppBaseUrl;
    }
  });

  it("prioriza NEXTAUTH_URL, luego APP_BASE_URL, luego request y finalmente localhost", () => {
    process.env.NEXTAUTH_URL = "  https://art1.ejemplo.uy///  ";
    process.env.APP_BASE_URL = "https://respaldo.ejemplo.uy";
    expect(getAppBaseUrl(new Request("https://req.ejemplo.uy/ruta"))).toBe(
      "https://art1.ejemplo.uy"
    );

    process.env.NEXTAUTH_URL = "   ";
    expect(getAppBaseUrl()).toBe("http://localhost:3000");

    delete process.env.NEXTAUTH_URL;
    expect(getAppBaseUrl()).toBe("https://respaldo.ejemplo.uy");

    process.env.APP_BASE_URL = "";
    expect(getAppBaseUrl(new Request("https://deposito.local:8443/api/estado?x=1"))).toBe(
      "https://deposito.local:8443"
    );

    delete process.env.APP_BASE_URL;
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("array-utils", () => {
  it("moveIdInOrder retorna la misma referencia cuando fromIndex === toIndex y mueve elementos correctamente", () => {
    const original = ["a", "b", "c"];
    expect(moveIdInOrder(original, 1, 1)).toBe(original);
    expect(moveIdInOrder(original, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveIdInOrder(original, 2, 0)).toEqual(["c", "a", "b"]);
    expect(original).toEqual(["a", "b", "c"]);
  });

  it("compareTallaOptions ordena tallas de ropa y numéricas incluyendo valores fuera de catálogo", () => {
    expect(compareTallaOptions("PARKA", "XS", "XL")).toBeLessThan(0);
    expect(compareTallaOptions("CAMISACO", "L", "ESPECIAL")).toBeLessThan(0);
    expect(compareTallaOptions("PANTALON", "ESPECIAL", "M")).toBeGreaterThan(0);
    expect(compareTallaOptions("PARKA", "B2", "B10")).toBeLessThan(0);

    expect(compareTallaOptions("CALZADO", "38", "42")).toBeLessThan(0);
    expect(compareTallaOptions("KEPI", "56", "Sin dato")).toBeLessThan(0);
    expect(compareTallaOptions("KEPI", "Sin dato", "56")).toBeGreaterThan(0);
    expect(compareTallaOptions("CALZADO", "T2", "T10")).toBeLessThan(0);
  });
});

describe("cirr-classification", () => {
  it("expone las baterías legadas de clasificación CIRR", () => {
    expect(LEGACY_CIRR_BATTERY_NAMES).toEqual(["S/ CIRR", "Cursando CIRR"]);
  });
});

describe("equipo-tipos y equipo-tipos-data", () => {
  it("normaliza claves de tipo de equipo eliminando acentos y símbolos", () => {
    expect(normalizeEquipoTipoClave("  Equipo de Campaña / N° 1! ")).toBe("EQUIPO_DE_CAMPANA_N_1");
    expect(normalizeEquipoTipoClave("---")).toBe("");
  });

  it("construye descriptor general cuando falta tipoEquipo y acota el orden mínimo a 1", () => {
    expect(buildEquipoTipoDescriptor(null)).toEqual({
      tipo: GENERAL_TIPO_EQUIPO_CLAVE,
      tipoEquipoId: null,
      tipoLabel: GENERAL_TIPO_EQUIPO_NOMBRE,
      tipoOrden: GENERAL_TIPO_EQUIPO_ORDEN,
    });

    expect(
      buildEquipoTipoDescriptor({
        tipoEquipoId: 5,
        clave: "ARMAMENTO",
        nombre: "Armamento",
        orden: 0,
      })
    ).toEqual({
      tipo: "ARMAMENTO",
      tipoEquipoId: 5,
      tipoLabel: "Armamento",
      tipoOrden: 1,
    });

    expect(
      serializeEquipoTipoData({
        tipoEquipoId: 5,
        tipoEquipo: {
          tipoEquipoId: 5,
          clave: "OPTICA",
          nombre: "Óptica",
          orden: 4,
        },
      })
    ).toEqual({
      tipo: "OPTICA",
      tipoEquipoId: 5,
      tipoLabel: "Óptica",
      tipoOrden: 4,
    });

    expect(serializeEquipoTipoData({ tipoEquipoId: null })).toEqual({
      tipo: GENERAL_TIPO_EQUIPO_CLAVE,
      tipoEquipoId: null,
      tipoLabel: GENERAL_TIPO_EQUIPO_NOMBRE,
      tipoOrden: GENERAL_TIPO_EQUIPO_ORDEN,
    });

    expect(tipoEquipoRelationSelect).toEqual({
      tipoEquipoId: true,
      clave: true,
      nombre: true,
      orden: true,
    });
  });

  it("buildEquipoTipoOptions antepone General y ordena tipos por orden y nombre", () => {
    const options = buildEquipoTipoOptions([
      { tipoEquipoId: 2, clave: "ZETA", nombre: "Zeta", orden: 2 },
      { tipoEquipoId: 1, clave: "BETA", nombre: "Beta", orden: 2 },
      { tipoEquipoId: 3, clave: "ALFA", nombre: "Alfa", orden: 0 },
    ]);

    expect(options).toEqual([
      {
        tipoEquipoId: null,
        clave: GENERAL_TIPO_EQUIPO_CLAVE,
        nombre: GENERAL_TIPO_EQUIPO_NOMBRE,
        orden: GENERAL_TIPO_EQUIPO_ORDEN,
        esGeneral: true,
      },
      {
        tipoEquipoId: 3,
        clave: "ALFA",
        nombre: "Alfa",
        orden: 1,
        esGeneral: false,
      },
      {
        tipoEquipoId: 1,
        clave: "BETA",
        nombre: "Beta",
        orden: 2,
        esGeneral: false,
      },
      {
        tipoEquipoId: 2,
        clave: "ZETA",
        nombre: "Zeta",
        orden: 2,
        esGeneral: false,
      },
    ]);
  });
});

describe("getEquipoResumenData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve matriz vacía cuando no hay equipos ni personal", async () => {
    mockPrisma.equipo.findMany.mockResolvedValue([]);
    mockPrisma.personal.findMany.mockResolvedValue([]);

    const resumen = await getEquipoResumenData();

    expect(resumen.equipos).toEqual([]);
    expect(resumen.unidad).toEqual({
      key: "ALL",
      nombre: "Unidad completa",
      orden: -1,
      totales: [],
      totalGeneral: 0,
    });
    expect(resumen.baterias).toEqual([]);
    expect(resumen.generatedAt).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

    const personalArgs = mockPrisma.personal.findMany.mock.calls[0]?.[0];
    expect(personalArgs?.where).toEqual({ rango: { tipo: TipoPersonal.SUBALTERNO } });
  });

  it("agrupa entregas, devoluciones y asignaciones por batería y calcula totales de unidad", async () => {
    mockPrisma.equipo.findMany.mockResolvedValue([
      { equipoId: BigInt(1), nombre: "Casco" },
      { equipoId: BigInt(2), nombre: "Mochila" },
    ]);

    mockPrisma.personal.findMany.mockResolvedValue([
      {
        bateria: { bateriaId: 20, nombre: "Batería Bravo", orden: 2 },
        movimientosDestinatario: [
          {
            movimiento: {
              tipo: TipoMovimiento.ENTREGA,
              equipos: [
                { equipoId: BigInt(1), cantidad: 3 },
                { equipoId: BigInt(999), cantidad: 5 },
              ],
            },
          },
          {
            movimiento: {
              tipo: TipoMovimiento.DEVOLUCION,
              equipos: [{ equipoId: BigInt(1), cantidad: 1 }],
            },
          },
        ],
      },
      {
        bateria: { bateriaId: 20, nombre: "Batería Bravo", orden: 2 },
        movimientosDestinatario: [
          {
            movimiento: {
              tipo: TipoMovimiento.ASIGNACION,
              equipos: [{ equipoId: BigInt(2), cantidad: 2 }],
            },
          },
        ],
      },
      {
        bateria: { bateriaId: 10, nombre: "Batería Alfa", orden: 2 },
        movimientosDestinatario: [
          {
            movimiento: {
              tipo: TipoMovimiento.ENTREGA,
              equipos: [{ equipoId: BigInt(2), cantidad: 4 }],
            },
          },
        ],
      },
      {
        bateria: null,
        movimientosDestinatario: [
          {
            movimiento: {
              tipo: TipoMovimiento.ENTREGA,
              equipos: [{ equipoId: BigInt(1), cantidad: 1 }],
            },
          },
        ],
      },
    ]);

    const resumen = await getEquipoResumenData();

    expect(resumen.equipos).toEqual([
      { equipoId: "1", nombre: "Casco" },
      { equipoId: "2", nombre: "Mochila" },
    ]);
    expect(resumen.unidad).toEqual({
      key: "ALL",
      nombre: "Unidad completa",
      orden: -1,
      totales: [3, 6],
      totalGeneral: 9,
    });
    expect(resumen.baterias).toEqual([
      {
        key: "10",
        nombre: "Batería Alfa",
        orden: 2,
        totales: [0, 4],
        totalGeneral: 4,
      },
      {
        key: "20",
        nombre: "Batería Bravo",
        orden: 2,
        totales: [2, 2],
        totalGeneral: 4,
      },
      {
        key: "NONE",
        nombre: "Sin batería",
        orden: null,
        totales: [1, 0],
        totalGeneral: 1,
      },
    ]);
  });
});

describe("firma-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("expone los textos institucionales y configuración por defecto", () => {
    expect(TEXTO_ENCARGADO).toContain("Encargado del Depósito General");
    expect(TEXTO_OFICIAL).toContain("Oficial de Administración");
    expect(DEFAULT_FIRMA_CONFIG.updatedAt).toBeNull();
  });

  it("crea la configuración por defecto cuando no existe registro id=1", async () => {
    const createdAt = new Date(2026, 4, 20, 10, 0, 0);
    mockPrisma.configFirma.findUnique.mockResolvedValue(null);
    mockPrisma.configFirma.create.mockResolvedValue({
      id: 1,
      ...DEFAULT_FIRMA_CONFIG,
      updatedAt: createdAt,
    });

    const config = await getFirmaConfig();

    expect(mockPrisma.configFirma.create).toHaveBeenCalledWith({
      data: {
        id: 1,
        encargadoRango: DEFAULT_FIRMA_CONFIG.encargadoRango,
        encargadoNombre: DEFAULT_FIRMA_CONFIG.encargadoNombre,
        oficialRango: DEFAULT_FIRMA_CONFIG.oficialRango,
        oficialNombre: DEFAULT_FIRMA_CONFIG.oficialNombre,
      },
    });
    expect(config).toEqual({
      encargadoRango: DEFAULT_FIRMA_CONFIG.encargadoRango,
      encargadoNombre: DEFAULT_FIRMA_CONFIG.encargadoNombre,
      oficialRango: DEFAULT_FIRMA_CONFIG.oficialRango,
      oficialNombre: DEFAULT_FIRMA_CONFIG.oficialNombre,
      updatedAt: "20/05/2026",
    });
  });

  it("retorna la configuración existente y permite actualizarla con upsert", async () => {
    const existingDate = new Date(2026, 5, 1, 14, 30, 0);
    mockPrisma.configFirma.findUnique.mockResolvedValue({
      id: 1,
      encargadoRango: "Sgto. 1º",
      encargadoNombre: "Juan Pérez",
      oficialRango: "Cap.",
      oficialNombre: "Ana Silva",
      updatedAt: existingDate,
    });

    const existing = await getFirmaConfig();
    expect(mockPrisma.configFirma.create).not.toHaveBeenCalled();
    expect(existing).toEqual({
      encargadoRango: "Sgto. 1º",
      encargadoNombre: "Juan Pérez",
      oficialRango: "Cap.",
      oficialNombre: "Ana Silva",
      updatedAt: "01/06/2026",
    });

    const updatedDate = new Date(2026, 6, 15, 9, 0, 0);
    const input = {
      encargadoRango: "Subof.",
      encargadoNombre: "Carlos Gómez",
      oficialRango: "May.",
      oficialNombre: "Lucía Díaz",
    };
    mockPrisma.configFirma.upsert.mockResolvedValue({
      id: 1,
      ...input,
      updatedAt: updatedDate,
    });

    const updated = await updateFirmaConfig(input);
    expect(mockPrisma.configFirma.upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, ...input },
      update: { ...input },
    });
    expect(updated).toEqual({
      ...input,
      updatedAt: "15/07/2026",
    });
  });
});

describe("search y search-index", () => {
  it("normaliza términos de búsqueda y dígitos", () => {
    expect(normalizeSearchTerm('  Árbol. "Campaña"  ')).toBe("arbol campana");
    expect(normalizeDigits("1.234.567-8")).toBe("12345678");
  });

  it("construye índice de búsqueda y filtra por texto, dígitos o consulta vacía", () => {
    const people = [
      { id: 1, nombre: "Pérez, María", ci: "4.567.890-1" },
      { id: 2, nombre: "Rodríguez, José", ci: "3.111.222-9" },
    ];

    const indexWithDigits = buildSearchIndex(people, {
      text: (p) => p.nombre,
      digits: (p) => p.ci,
    });
    const indexWithoutDigits = buildSearchIndex(people, {
      text: (p) => p.nombre,
    });

    expect(filterSearchIndex(indexWithDigits, "   ")).toEqual(people);
    expect(filterSearchIndex(indexWithDigits, '""')).toEqual(people);
    expect(filterSearchIndex(indexWithDigits, "maria")).toEqual([people[0]]);
    expect(filterSearchIndex(indexWithDigits, "3.111")).toEqual([people[1]]);
    expect(filterSearchIndex(indexWithDigits, "99999")).toEqual([]);
    expect(filterSearchIndex(indexWithoutDigits, "123")).toEqual([]);
  });
});
