import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  Prisma,
  TipoMovimiento,
  TipoPersonal,
  TipoStockOperacion,
} from "@/generated/prisma/client";

const mockPrisma = vi.hoisted(() => ({
  auditoria: {
    create: vi.fn(),
  },
  equipo: {
    findUnique: vi.fn(),
  },
  movimientoEquipo: {
    findMany: vi.fn(),
  },
  prestamoActivo: {
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { logAudit } from "@/lib/audit";
import {
  auditActionLabel,
  auditEntityLabel,
  formatAuditCi,
  formatAuditEntityId,
  renderAuditDetalle,
  resolveAuditEntityName,
} from "@/lib/audit-helpers";
import {
  buildStockSummaryMaps,
  movimientoStockDeltaFactor,
  stockOperacionDeltaFactor,
} from "@/lib/stock";
import {
  buildStockEquipoTraceData,
  hasStockItemTraceDelegates,
  parseStockTraceColumn,
  parseStockTraceItemId,
} from "@/lib/stock-equipo-trace";

describe("audit.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra la auditoría con todos los campos informados", async () => {
    mockPrisma.auditoria.create.mockResolvedValueOnce({ auditoriaId: BigInt(1) });

    await logAudit({
      usuarioId: "user-1",
      accion: "UPDATE",
      entidad: "EQUIPO",
      entidadId: "42",
      detalle: { nombre: "Casco" },
    });

    expect(mockPrisma.auditoria.create).toHaveBeenCalledWith({
      data: {
        usuarioId: "user-1",
        accion: "UPDATE",
        entidad: "EQUIPO",
        entidadId: "42",
        detalle: { nombre: "Casco" },
      },
    });
  });

  it("normaliza campos opcionales ausentes y detalle nulo", async () => {
    mockPrisma.auditoria.create.mockResolvedValue({ auditoriaId: BigInt(2) });

    await logAudit({
      accion: "CREATE",
      entidad: "STOCK",
    });

    expect(mockPrisma.auditoria.create).toHaveBeenNthCalledWith(1, {
      data: {
        usuarioId: null,
        accion: "CREATE",
        entidad: "STOCK",
        entidadId: null,
        detalle: undefined,
      },
    });

    await logAudit({
      usuarioId: null,
      accion: "DELETE",
      entidad: "STOCK",
      entidadId: null,
      detalle: null,
    });

    expect(mockPrisma.auditoria.create).toHaveBeenNthCalledWith(2, {
      data: {
        usuarioId: null,
        accion: "DELETE",
        entidad: "STOCK",
        entidadId: null,
        detalle: Prisma.JsonNull,
      },
    });
  });

  it("no propaga errores si falla la escritura en base de datos", async () => {
    mockPrisma.auditoria.create.mockRejectedValueOnce(new Error("DB caída"));

    await expect(
      logAudit({
        accion: "LOGIN",
        entidad: "AUTH",
      })
    ).resolves.toBeUndefined();
  });
});

describe("audit-helpers.ts", () => {
  it("formatea cédulas, etiquetas de acción/entidad e IDs", () => {
    const refs = { "12345672": "Sgto. Pérez, Juan" };

    expect(formatAuditCi("12345672", refs)).toBe("1.234.567-2 - Sgto. Pérez, Juan");
    expect(formatAuditCi("12345672")).toBe("1.234.567-2");
    expect(formatAuditCi(" 12345 ", { "12345": "  " })).toBe("12345");

    expect(auditActionLabel("CREATE")).toBe("Creó");
    expect(auditActionLabel("UPDATE")).toBe("Actualizó");
    expect(auditActionLabel("DELETE")).toBe("Eliminó");
    expect(auditActionLabel("LOGIN")).toBe("Inició sesión");
    expect(auditActionLabel("LOGIN_PERSONAL")).toBe("Inició sesión");
    expect(auditActionLabel("LOGOUT")).toBe("Cerró sesión");
    expect(auditActionLabel("PASSWORD_CHANGE")).toBe("Cambió contraseña");
    expect(auditActionLabel("PASSWORD_CHANGE_PERSONAL")).toBe("Cambió contraseña");
    expect(auditActionLabel("CUSTOM_ACTION")).toBe("CUSTOM_ACTION");

    expect(auditEntityLabel("AUTH")).toBe("autenticación");
    expect(auditEntityLabel("PERSONAL_AUTH")).toBe("autenticación");
    expect(auditEntityLabel("REGISTRO")).toBe("movimiento");
    expect(auditEntityLabel("PERSONAL")).toBe("personal");
    expect(auditEntityLabel("USUARIO")).toBe("usuario");
    expect(auditEntityLabel("RANGO")).toBe("grado");
    expect(auditEntityLabel("BATERIA")).toBe("batería");
    expect(auditEntityLabel("ARTICULO")).toBe("artículo");
    expect(auditEntityLabel("ARTICULO_STOCK")).toBe("stock de artículo");
    expect(auditEntityLabel("ARTICULO_ENTREGA_PERSONAL")).toBe("entrega de artículos");
    expect(auditEntityLabel("EQUIPO")).toBe("equipo");
    expect(auditEntityLabel("FIRMAS_CONFIG")).toBe("firmas institucionales");
    expect(auditEntityLabel("OBSERVACION")).toBe("observación");
    expect(auditEntityLabel("STOCK")).toBe("stock");
    expect(auditEntityLabel("OTRA_ENTIDAD")).toBe("otra_entidad");

    expect(formatAuditEntityId(null)).toBe("Entidad sin ID");
    expect(formatAuditEntityId("12345672", refs)).toBe(
      "Entidad ID: 1.234.567-2 - Sgto. Pérez, Juan"
    );
  });

  it("renderiza eventos de autenticación, deshacer y entradas no objeto", () => {
    expect(renderAuditDetalle(null)).toBe("");
    expect(renderAuditDetalle(["array"])).toBe("");

    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "LOGIN"))).toContain(
      "Sesión iniciada correctamente."
    );
    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "LOGOUT"))).toContain(
      "Sesión cerrada correctamente."
    );
    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "PASSWORD_CHANGE"))).toContain(
      "Contraseña cambiada correctamente."
    );
    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "CAMBIO_CONTRASEÑA"))).toContain(
      "Contraseña cambiada correctamente."
    );
    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "SESSION_PING"))).toContain(
      "Evento de seguridad registrado."
    );
    expect(renderToStaticMarkup(renderAuditDetalle({}, undefined, "AUTENTICACION_FAIL"))).toContain(
      "Intento de inicio de sesión fallido."
    );
    expect(
      renderToStaticMarkup(renderAuditDetalle({}, undefined, "AUTENTICACION_FALLIDA"))
    ).toContain("Intento de inicio de sesión fallido.");

    expect(
      renderToStaticMarkup(
        renderAuditDetalle({ evento: "UNDO_ACCION_AUDITORIA", auditoriaIdRestaurada: 99 })
      )
    ).toContain("Fue por un deshacer de la acción #99");
    expect(
      renderToStaticMarkup(renderAuditDetalle({ evento: "UNDO_ACCION_AUDITORIA", auditoriaId: 45 }))
    ).toContain("Fue por un deshacer de la acción #45");
    expect(renderToStaticMarkup(renderAuditDetalle({ evento: "UNDO_ACCION_AUDITORIA" }))).toContain(
      "Fue por un deshacer de la acción #"
    );
  });

  it("renderiza diferencias granulares previo/nuevo con distintos tipos de datos", () => {
    const html = renderToStaticMarkup(
      renderAuditDetalle({
        previo: {
          ip: "1.1.1.1",
          igual: "mismo",
          ci: "12345672",
          activo: true,
          notas: null,
          tallas: [{ tipo: "PARKA", valor: "M" }],
          etiquetas: [{ a: 1 }, "texto"],
          meta: { x: 1 },
          cantidad: 2,
        },
        nuevo: {
          ip: "2.2.2.2",
          igual: "mismo",
          ci: "45678905",
          activo: false,
          notas: "Actualizado",
          tallas: [{ tipo: "PARKA", valor: "L" }],
          etiquetas: [{ a: 2 }],
          meta: undefined,
          cantidad: 5,
        },
      })
    );

    expect(html).not.toContain("1.1.1.1");
    expect(html).not.toContain("mismo");
    expect(html).toContain("CI:");
    expect(html).toContain("Sí");
    expect(html).toContain("No");
    expect(html).toContain("PARKA: M");
    expect(html).toContain("PARKA: L");
    expect(html).toContain("{&quot;a&quot;:1}, texto");
    expect(html).toContain("{&quot;x&quot;:1}");
    expect(html).toContain("—");
  });

  it("renderiza estructuras planas con pares Anterior/Nuevo y acciones CREATE/DELETE/UPDATE", () => {
    const htmlCreate = renderToStaticMarkup(
      renderAuditDetalle(
        {
          evento: "CUSTOM",
          ip: "10.0.0.1",
          nombreAnterior: "Casco",
          nombreNuevo: "Casco táctico",
          fechaAnterior: "2026-01-01",
          fechaNueva: "2026-01-02",
          ciAnterior: "12345672",
          ci: "45678905",
          sueltoAnterior: "A",
          estado: "Nuevo",
          orden: 3,
        },
        undefined,
        "CREATE"
      )
    );

    expect(htmlCreate).toContain("nombre:");
    expect(htmlCreate).toContain("Casco táctico");
    expect(htmlCreate).toContain("fecha:");
    expect(htmlCreate).toContain("CI:");
    expect(htmlCreate).toContain("sueltoAnterior:");
    expect(htmlCreate).toContain("estado:");

    const htmlDelete = renderToStaticMarkup(
      renderAuditDetalle({ ci: "12345672", motivo: "Baja" }, undefined, "DELETE")
    );
    expect(htmlDelete).toContain("Baja");

    const htmlUpdate = renderToStaticMarkup(
      renderAuditDetalle({ motivo: "Ajuste" }, undefined, "UPDATE")
    );
    expect(htmlUpdate).toContain("Ajuste");

    const htmlFallbackFlat = renderToStaticMarkup(
      renderAuditDetalle({
        evento: "OTRO_EVENTO",
        ip: "127.0.0.1",
        username: "admin",
        extra: { a: 1 },
      })
    );
    expect(htmlFallbackFlat).toContain("127.0.0.1");
    expect(htmlFallbackFlat).toContain("username:");
    expect(htmlFallbackFlat).not.toContain("extra");
  });

  it("renderiza detalles de movimientos y stock cuando solo incluyen objetos, arreglos o claves ignoradas", () => {
    const refs = { "12345672": "Pérez, Juan", "45678905": "García, Ana" };

    const htmlCompleto = renderToStaticMarkup(
      renderAuditDetalle(
        {
          evento: "MOVIMIENTO_UPDATE",
          personal: { grado: "Sgto.", nombre: "Pérez", ci: "12345672", bateria: "Alfa" },
          ordenante: { grado: "Tte.", nombre: "García", ci: "45678905" },
          articulos: [{ nombre: "Bota", cantidad: 2 }],
          equipos: [{ nombre: "Casco", cantidad: 1 }],
          itemsAnteriores: [{ nombre: "Chaleco", cantidad: 1 }],
          itemsNuevos: [{ nombre: "Mochila", cantidad: 3 }],
          ip: "192.168.1.10",
        },
        refs
      )
    );

    expect(htmlCompleto).toContain("Personal: ");
    expect(htmlCompleto).toContain("Batería Alfa");
    expect(htmlCompleto).toContain("Ordenó: ");
    expect(htmlCompleto).toContain("Bota (2x)");
    expect(htmlCompleto).toContain("Casco (1x)");
    expect(htmlCompleto).toContain("Chaleco (1x)");
    expect(htmlCompleto).toContain("Mochila (3x)");
    expect(htmlCompleto).toContain("192.168.1.10");

    const htmlParcial = renderToStaticMarkup(
      renderAuditDetalle(
        {
          evento: "STOCK_CREATE",
          personal: {},
          ordenante: {},
          equipos: [null, { cantidad: 2 }, { nombre: "Linterna" }],
        },
        refs
      )
    );
    expect(htmlParcial).toContain("Elemento sin nombre (2x)");
    expect(htmlParcial).toContain("Linterna (0x)");

    expect(renderAuditDetalle({ evento: "MOVIMIENTO_VACIO", equipos: { invalid: true } })).toBe("");
  });

  it("resuelve el nombre descriptivo de entidad según tipo y detalle", () => {
    const refs = { "12345672": "Pérez, Juan" };

    expect(resolveAuditEntityName("PERSONAL", null)).toBeNull();
    expect(resolveAuditEntityName("PERSONAL", [])).toBeNull();
    expect(
      resolveAuditEntityName("PERSONAL", {
        nuevo: { apellido1: "Pérez", apellido2: "Gómez", nombre1: "Juan", nombre2: "Carlos" },
      })
    ).toBe("Pérez Gómez Juan Carlos");
    expect(resolveAuditEntityName("PERSONAL", { previo: { ci: "12345672" } }, refs)).toBe(
      "Pérez, Juan"
    );
    expect(resolveAuditEntityName("PERSONAL", { ci: "99999999" }, refs)).toBeNull();
    expect(resolveAuditEntityName("PERSONAL", {})).toBeNull();

    expect(resolveAuditEntityName("GRADO_PERSONAL", { nombreCompleto: "Sargento" })).toBe(
      "Sargento"
    );
    expect(resolveAuditEntityName("RANGO", { abreviacion: "Sgto." })).toBe("Sgto.");
    expect(resolveAuditEntityName("RANGO", {})).toBeNull();
    expect(resolveAuditEntityName("BATERIA", { nombre: "Comando" })).toBe("Batería: Comando");
    expect(resolveAuditEntityName("BATERIA", {})).toBeNull();
    expect(resolveAuditEntityName("ARTICULO", { nombre: "Guantes" })).toBe("Guantes");
    expect(resolveAuditEntityName("EQUIPO", { nombre: "Casco" })).toBe("Casco");
    expect(resolveAuditEntityName("EQUIPO", {})).toBeNull();

    expect(resolveAuditEntityName("OBSERVACION", { texto: "Nota breve" })).toBe(
      'Obs: "Nota breve"'
    );
    const textoLargo = "Esta observación supera ampliamente los cuarenta caracteres exigidos";
    expect(resolveAuditEntityName("OBSERVACION", { texto: textoLargo })).toBe(
      `Obs: "${textoLargo.substring(0, 40)}..."`
    );
    expect(resolveAuditEntityName("OBSERVACION", {})).toBeNull();

    expect(
      resolveAuditEntityName("STOCK", {
        evento: "STOCK_OPERACION_CREATE",
        tipo: "INGRESO",
        totalUnidades: 10,
      })
    ).toBe("INGRESO (10 uds)");
    expect(resolveAuditEntityName("STOCK", { tipo: "EGRESO", cantidad: 4 })).toBe("EGRESO (4 uds)");
    expect(resolveAuditEntityName("STOCK", { evento: "STOCK_OPERACION_CREATE" })).toBe(
      "OPERACION ()"
    );
    expect(resolveAuditEntityName("STOCK", { evento: "OTRO" })).toBeNull();

    expect(resolveAuditEntityName("REGISTRO", { tipo: "ENTREGA", totalUnidades: 3 })).toBe(
      "ENTREGA (3 uds)"
    );
    expect(resolveAuditEntityName("MOVIMIENTO", {})).toBe("MOVIMIENTO ()");

    expect(resolveAuditEntityName("OTRO", { nombre: "Genérico" })).toBe("Genérico");
    expect(resolveAuditEntityName("OTRO", { nombreCompleto: "Completo" })).toBe("Completo");
    expect(resolveAuditEntityName("OTRO", { abreviacion: "Abr." })).toBe("Abr.");
    expect(resolveAuditEntityName("OTRO", { texto: "Texto libre" })).toBe("Texto libre");
    expect(resolveAuditEntityName("OTRO", {})).toBeNull();
  });
});

describe("stock.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calcula factores de delta para movimientos y operaciones de stock", () => {
    expect(movimientoStockDeltaFactor(TipoMovimiento.ENTREGA)).toBe(-1);
    expect(movimientoStockDeltaFactor("ENTREGA")).toBe(-1);
    expect(movimientoStockDeltaFactor("ASIGNACION")).toBe(-1);
    expect(movimientoStockDeltaFactor(TipoMovimiento.PRESTAMO)).toBe(-1);
    expect(movimientoStockDeltaFactor("PRESTAMO")).toBe(-1);
    expect(movimientoStockDeltaFactor(TipoMovimiento.DEVOLUCION)).toBe(1);
    expect(movimientoStockDeltaFactor("DEVOLUCION")).toBe(1);
    expect(movimientoStockDeltaFactor("DESCONOCIDO" as unknown as TipoMovimiento)).toBe(0);

    expect(stockOperacionDeltaFactor(TipoStockOperacion.INGRESO)).toBe(1);
    expect(stockOperacionDeltaFactor("INGRESO")).toBe(1);
    expect(stockOperacionDeltaFactor(TipoStockOperacion.EGRESO)).toBe(-1);
    expect(stockOperacionDeltaFactor("EGRESO")).toBe(-1);
  });

  it("construye los mapas de resumen de stock convirtiendo tipos SQL a enteros seguros", async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([
        { equipoId: BigInt(1), total: BigInt(15) },
        { equipoId: 2, total: null },
      ])
      .mockResolvedValueOnce([
        { equipoId: "1", total: "7" },
        { equipoId: "2", total: Number.POSITIVE_INFINITY },
      ])
      .mockResolvedValueOnce([{ equipoId: 3, total: 4 }])
      .mockResolvedValueOnce([{ equipoId: 4, total: "no-numérico" }]);

    const maps = await buildStockSummaryMaps(mockPrisma);

    expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(4);
    expect(maps.unidadByItem.get("1")).toBe(15);
    expect(maps.unidadByItem.get("2")).toBe(0);
    expect(maps.personalByItem.get("1")).toBe(7);
    expect(maps.personalByItem.get("2")).toBe(0);
    expect(maps.asignacionByItem.get("3")).toBe(4);
    expect(maps.prestamoByItem.get("4")).toBe(0);
  });
});

describe("stock-equipo-trace.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parsea identificadores, columnas y verifica delegados", () => {
    expect(parseStockTraceItemId(BigInt(9))).toBe(BigInt(9));
    expect(parseStockTraceItemId("123")).toBe(BigInt(123));
    expect(parseStockTraceItemId("abc")).toBeNull();
    expect(parseStockTraceItemId(null)).toBeNull();

    expect(parseStockTraceColumn("subalternos")).toBe("SUBALTERNOS");
    expect(parseStockTraceColumn(" PRESTAMO ")).toBe("PRESTAMO");
    expect(parseStockTraceColumn("recinto")).toBe("RECINTO");
    expect(parseStockTraceColumn("otro")).toBeNull();
    expect(parseStockTraceColumn(undefined)).toBeNull();

    expect(hasStockItemTraceDelegates()).toBe(true);
    expect(hasStockItemTraceDelegates({ equipo: {}, movimientoEquipo: {} })).toBe(false);
    expect(hasStockItemTraceDelegates({})).toBe(false);
  });

  it("retorna null si el equipo no existe", async () => {
    mockPrisma.equipo.findUnique.mockResolvedValueOnce(null);

    const result = await buildStockEquipoTraceData(BigInt(99));

    expect(result).toBeNull();
    expect(mockPrisma.movimientoEquipo.findMany).not.toHaveBeenCalled();
  });

  it("agrupa y ordena trazabilidad de subalternos, recintos y préstamos", async () => {
    mockPrisma.equipo.findUnique.mockResolvedValueOnce({
      equipoId: BigInt(10),
      nombre: "Casco balístico",
    });

    mockPrisma.movimientoEquipo.findMany.mockResolvedValueOnce([
      {
        cantidad: 3,
        movimiento: {
          movimientoId: BigInt(1),
          tipo: TipoMovimiento.ENTREGA,
          fecha: new Date("2026-04-01T00:00:00.000Z"),
          observaciones: "Entrega inicial",
          destinatarioPersonal: {
            personal: {
              ci: "12345672",
              apellido1: "Pérez",
              apellido2: null,
              nombre1: "Juan",
              nombre2: null,
              rango: {
                abreviacion: "Sgto.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Sargento",
              },
              bateria: { nombre: "Alfa" },
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(1),
          tipo: TipoMovimiento.DEVOLUCION,
          fecha: null as unknown as Date,
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "12345672",
              apellido1: "Pérez",
              apellido2: null,
              nombre1: "Juan",
              nombre2: null,
              rango: {
                abreviacion: "Sgto.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Sargento",
              },
              bateria: { nombre: "Alfa" },
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 2,
        movimiento: {
          movimientoId: BigInt(2),
          tipo: TipoMovimiento.ENTREGA,
          fecha: new Date("2026-04-02T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "45678905",
              apellido1: "Acosta",
              apellido2: null,
              nombre1: "Luis",
              nombre2: null,
              rango: { abreviacion: "Cabo", tipo: TipoPersonal.SUBALTERNO, nombreCompleto: "Cabo" },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 2,
        movimiento: {
          movimientoId: BigInt(3),
          tipo: TipoMovimiento.DEVOLUCION,
          fecha: new Date("2026-04-03T00:00:00.000Z"),
          observaciones: "Devuelto completo",
          destinatarioPersonal: {
            personal: {
              ci: "45678905",
              apellido1: "Acosta",
              apellido2: null,
              nombre1: "Luis",
              nombre2: null,
              rango: { abreviacion: "Cabo", tipo: TipoPersonal.SUBALTERNO, nombreCompleto: "Cabo" },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(4),
          tipo: TipoMovimiento.ENTREGA,
          fecha: new Date("2026-04-05T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "33333333",
              apellido1: "Blanco",
              apellido2: null,
              nombre1: "Mario",
              nombre2: null,
              rango: {
                abreviacion: "Sdo.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Soldado",
              },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(4),
          tipo: TipoMovimiento.ENTREGA,
          fecha: new Date("2026-04-05T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "33333333",
              apellido1: "Blanco",
              apellido2: null,
              nombre1: "Mario",
              nombre2: null,
              rango: {
                abreviacion: "Sdo.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Soldado",
              },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 2,
        movimiento: {
          movimientoId: BigInt(11),
          tipo: TipoMovimiento.ENTREGA,
          fecha: null as unknown as Date,
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "77777777",
              apellido1: "Álvarez",
              apellido2: null,
              nombre1: "Bruno",
              nombre2: null,
              rango: {
                abreviacion: "Sdo.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Soldado",
              },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(5),
          tipo: TipoMovimiento.ENTREGA,
          fecha: new Date("2026-04-05T00:00:00.000Z"),
          observaciones: "Sin destinatario personal",
          destinatarioPersonal: null,
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 4,
        movimiento: {
          movimientoId: BigInt(6),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: new Date("2026-04-06T00:00:00.000Z"),
          observaciones: "Guardia",
          destinatarioPersonal: null,
          destinatarioRecinto: { clase: "INTERNO", nombre: "Guardia" },
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(7),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: null as unknown as Date,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioRecinto: { clase: "INTERNO", nombre: "Guardia" },
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(7),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: new Date("2026-04-06T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioRecinto: { clase: "INTERNO", nombre: "Guardia" },
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 5,
        movimiento: {
          movimientoId: BigInt(8),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: new Date("2026-04-07T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: {
            personal: {
              ci: "12345672",
              apellido1: "Pérez",
              apellido2: null,
              nombre1: "Juan",
              nombre2: null,
              rango: {
                abreviacion: "Sgto.",
                tipo: TipoPersonal.SUBALTERNO,
                nombreCompleto: "Sargento",
              },
              bateria: null,
            },
          },
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
      {
        cantidad: 5,
        movimiento: {
          movimientoId: BigInt(9),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: new Date("2026-04-08T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioRecinto: null,
          destinatarioExterno: {
            personaExterna: {
              ci: "55555555",
              grado: "Cap.",
              nombre: "Elena",
              apellido: "Díaz",
              unidadDestino: "Regimiento 2",
            },
          },
        },
      },
      {
        cantidad: 1,
        movimiento: {
          movimientoId: BigInt(10),
          tipo: TipoMovimiento.ASIGNACION,
          fecha: null as unknown as Date,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioRecinto: null,
          destinatarioExterno: null,
        },
      },
    ]);

    mockPrisma.prestamoActivo.findMany.mockResolvedValueOnce([
      {
        movimientoId: BigInt(20),
        reciboNumero: "R-20",
        estado: "PENDIENTE",
        movimiento: {
          movimientoId: BigInt(20),
          fecha: new Date("2026-04-10T00:00:00.000Z"),
          observaciones: "Préstamo interno",
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
              },
            },
          },
          destinatarioExterno: null,
          equipos: [{ cantidad: 2 }, { cantidad: 1 }],
        },
      },
      {
        movimientoId: BigInt(21),
        reciboNumero: "R-21",
        estado: "DEVUELTO",
        movimiento: {
          movimientoId: BigInt(21),
          fecha: new Date("2026-04-10T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: {
            personaExterna: {
              ci: "66666666",
              grado: "Tte.",
              nombre: "Sofía",
              apellido: "López",
              unidadDestino: "Grupo 3",
            },
          },
          equipos: [{ cantidad: 1 }],
        },
      },
      {
        movimientoId: BigInt(21),
        reciboNumero: "R-21B",
        estado: "DEVUELTO",
        movimiento: {
          movimientoId: BigInt(21),
          fecha: new Date("2026-04-10T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          equipos: [{ cantidad: 1 }],
        },
      },
      {
        movimientoId: BigInt(22),
        reciboNumero: "R-22",
        estado: "PENDIENTE",
        movimiento: {
          movimientoId: BigInt(22),
          fecha: null as unknown as Date,
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          equipos: [{ cantidad: 1 }],
        },
      },
      {
        movimientoId: BigInt(23),
        reciboNumero: "R-23",
        estado: "PENDIENTE",
        movimiento: {
          movimientoId: BigInt(23),
          fecha: new Date("2026-04-11T00:00:00.000Z"),
          observaciones: null,
          destinatarioPersonal: null,
          destinatarioExterno: null,
          equipos: [],
        },
      },
    ]);

    const trace = await buildStockEquipoTraceData(BigInt(10));

    expect(trace).not.toBeNull();
    expect(trace?.totals).toEqual({
      subalternos: 6,
      prestamo: 6,
      recinto: 17,
    });
    expect(trace?.subalternos.map((s) => s.ci)).toEqual(["77777777", "33333333", "12345672"]);
    expect(trace?.subalternos[2]?.movimientos.map((m) => m.movimientoId)).toEqual(["1", "1"]);
    expect(trace?.recintos.map((r) => r.recintoNombre)).toEqual([
      "Guardia",
      "Cap. Díaz, Elena (Regimiento 2)",
      "Sgto. Pérez, Juan",
      "Asignación sin destinatario",
    ]);
    expect(trace?.recintos[0]?.movimientos.map((m) => m.movimientoId)).toEqual(["7", "6", "7"]);
    expect(trace?.prestamos.map((p) => p.prestamoId)).toEqual(["21", "21", "20", "22"]);
    expect(trace?.prestamos[0]?.estado).toBe("DEVUELTO");
    expect(trace?.prestamos[0]?.clasePrestamo).toBe("EXTERNO");
    expect(trace?.prestamos[3]?.destinatarioEtiqueta).toBe("Destinatario pendiente");
  });
});
