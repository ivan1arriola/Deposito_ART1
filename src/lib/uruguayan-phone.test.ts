import { describe, expect, it } from "vitest";
import {
  formatUruguayanMobileNumber,
  isValidUruguayanMobileNumber,
  normalizeOptionalUruguayanMobileNumber,
  normalizeUruguayanMobileNumber,
} from "@/lib/uruguayan-phone";

describe("uruguayan-phone", () => {
  it("normaliza celulares uruguayos a formato local", () => {
    expect(normalizeUruguayanMobileNumber("099123456")).toBe("099123456");
    expect(normalizeUruguayanMobileNumber("99123456")).toBe("099123456");
    expect(normalizeUruguayanMobileNumber("+598 99 123 456")).toBe("099123456");
    expect(normalizeUruguayanMobileNumber("+598 099 123 456")).toBe("099123456");
  });

  it("rechaza telefonos que no son celulares uruguayos validos", () => {
    expect(normalizeUruguayanMobileNumber("24871234")).toBeNull();
    expect(normalizeUruguayanMobileNumber("123")).toBeNull();
    expect(isValidUruguayanMobileNumber("24871234")).toBe(false);
    expect(isValidUruguayanMobileNumber("099123456")).toBe(true);
  });

  it("normaliza opcionales y formatea salida", () => {
    expect(normalizeOptionalUruguayanMobileNumber("")).toBeNull();
    expect(normalizeOptionalUruguayanMobileNumber("  ")).toBeNull();
    expect(formatUruguayanMobileNumber("099123456")).toBe("099 123 456");
  });
});
