import { describe, expect, it } from "vitest";

import { itemByIdRouteTestables } from "@/app/api/items/[itemId]/route";
import { prestamoByIdRouteTestables } from "@/app/api/prestamos/[prestamoId]/route";
import { stockRouteTestables } from "@/app/api/stock/route";

describe("route parser helpers", () => {
  describe("stockRouteTestables", () => {
    it("parseBigIntId acepta ids numericos", () => {
      expect(stockRouteTestables.parseBigIntId("42")).toBe(BigInt(42));
      expect(stockRouteTestables.parseBigIntId(" 007 ")).toBe(BigInt(7));
      expect(stockRouteTestables.parseBigIntId(BigInt(15))).toBe(BigInt(15));
    });

    it("parseBigIntId rechaza valores invalidos", () => {
      expect(stockRouteTestables.parseBigIntId("abc")).toBeNull();
      expect(stockRouteTestables.parseBigIntId("12.5")).toBeNull();
      expect(stockRouteTestables.parseBigIntId("")).toBeNull();
    });

    it("parseCantidad valida enteros positivos", () => {
      expect(stockRouteTestables.parseCantidad(1)).toBe(1);
      expect(stockRouteTestables.parseCantidad("3")).toBe(3);
      expect(stockRouteTestables.parseCantidad(0)).toBeNull();
      expect(stockRouteTestables.parseCantidad(-1)).toBeNull();
      expect(stockRouteTestables.parseCantidad(1.5)).toBeNull();
    });

    it("parseTipoStockOperacion normaliza ingreso y egreso", () => {
      expect(stockRouteTestables.parseTipoStockOperacion("ingreso")).toBe("INGRESO");
      expect(stockRouteTestables.parseTipoStockOperacion(" EGRESO ")).toBe("EGRESO");
      expect(stockRouteTestables.parseTipoStockOperacion("otro")).toBeNull();
    });

    it("isValidPayload exige tipo valido y al menos un item", () => {
      expect(stockRouteTestables.isValidPayload({ tipo: "INGRESO", items: [{ itemId: "1", cantidad: 1 }] })).toBe(true);
      expect(stockRouteTestables.isValidPayload({ tipo: "INGRESO", items: [] })).toBe(false);
      expect(stockRouteTestables.isValidPayload({ tipo: "X", items: [{ itemId: "1", cantidad: 1 }] })).toBe(false);
      expect(stockRouteTestables.isValidPayload(null)).toBe(false);
    });

    it("parseFecha devuelve fecha valida o null segun entrada", () => {
      expect(stockRouteTestables.parseFecha("22/03/2026")).toBeInstanceOf(Date);
      expect(stockRouteTestables.parseFecha("fecha invalida")).toBeNull();
      expect(stockRouteTestables.parseFecha(undefined)).toBeInstanceOf(Date);
    });
  });

  describe("prestamoByIdRouteTestables", () => {
    it("parsePrestamoId y parseBigIntId funcionan con ids validos", () => {
      expect(prestamoByIdRouteTestables.parsePrestamoId("123")).toBe(BigInt(123));
      expect(prestamoByIdRouteTestables.parseBigIntId("500")).toBe(BigInt(500));
      expect(prestamoByIdRouteTestables.parsePrestamoId("x")).toBeNull();
      expect(prestamoByIdRouteTestables.parseBigIntId("x")).toBeNull();
    });

    it("parseCantidad valida enteros positivos", () => {
      expect(prestamoByIdRouteTestables.parseCantidad("2")).toBe(2);
      expect(prestamoByIdRouteTestables.parseCantidad(0)).toBeNull();
      expect(prestamoByIdRouteTestables.parseCantidad("abc")).toBeNull();
    });

    it("parseEstadoEquipoPrestamo normaliza estados esperados", () => {
      expect(prestamoByIdRouteTestables.parseEstadoEquipoPrestamo("nuevo")).toBe("NUEVO");
      expect(prestamoByIdRouteTestables.parseEstadoEquipoPrestamo(" bueno ")).toBe("BUENO");
      expect(prestamoByIdRouteTestables.parseEstadoEquipoPrestamo("desconocido")).toBeNull();
    });

    it("buildGeneralChanges solo incluye campos cambiados", () => {
      const before = {
        fechaPrestamo: "01/01/2026",
        fechaDevolucion: null,
        fechaEstimadaDevolucionTexto: "05/01/2026",
        comentarios: "A",
      };
      const after = {
        fechaPrestamo: "01/01/2026",
        fechaDevolucion: "02/01/2026",
        fechaEstimadaDevolucionTexto: "05/01/2026",
        comentarios: "B",
      };

      const changes = prestamoByIdRouteTestables.buildGeneralChanges(before as never, after as never);
      expect(Object.keys(changes)).toEqual(["fechaDevolucion", "comentarios"]);
    });

    it("buildItemChanges detecta diferencias por item", () => {
      const before = {
        items: [
          {
            itemId: "1",
            nombre: "Casco",
            cantidad: 1,
            estadoEntrega: "BUENO",
            comentarioEntrega: null,
            estadoDevolucion: null,
            comentarioDevolucion: null,
          },
        ],
      };
      const after = {
        items: [
          {
            itemId: "1",
            nombre: "Casco",
            cantidad: 2,
            estadoEntrega: "REGULAR",
            comentarioEntrega: "uso",
            estadoDevolucion: "BUENO",
            comentarioDevolucion: "ok",
          },
        ],
      };

      const changes = prestamoByIdRouteTestables.buildItemChanges(before as never, after as never);
      expect(changes).toHaveLength(1);
      expect(Object.keys(changes[0].changes)).toEqual([
        "cantidad",
        "estadoEntrega",
        "comentarioEntrega",
        "estadoDevolucion",
        "comentarioDevolucion",
      ]);
    });
  });

  describe("itemByIdRouteTestables", () => {
    it("parseItemId valida bigint", () => {
      expect(itemByIdRouteTestables.parseItemId("9")).toBe(BigInt(9));
      expect(itemByIdRouteTestables.parseItemId("nope")).toBeNull();
    });

    it("isValidOrder valida numeros enteros positivos o undefined", () => {
      expect(itemByIdRouteTestables.isValidOrder(undefined)).toBe(true);
      expect(itemByIdRouteTestables.isValidOrder(1)).toBe(true);
      expect(itemByIdRouteTestables.isValidOrder(0)).toBe(false);
      expect(itemByIdRouteTestables.isValidOrder(1.2)).toBe(false);
      expect(itemByIdRouteTestables.isValidOrder("1")).toBe(false);
    });
  });
});
