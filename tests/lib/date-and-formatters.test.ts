import { describe, expect, it } from "vitest";
import {
  compareDateInputValues,
  dateInputToDate,
  extractDateParts,
  formatDateOnlyForDisplay,
  formatDateOnlyFromDate,
  formatDateTimeExact,
  formatDateTimeForDisplay,
  getTodayDateInput,
  isDateInputAfter,
  isDateInputAfterToday,
  normalizeDateInput,
  parseDateInput,
} from "@/lib/date-helpers";
import {
  getTodayDateInput as getTodayFromFormMappers,
  oficialSuboficialPayload,
  personalPayload,
  tallasMap,
  toDateInput,
  toEditableOficialSuboficial,
  toEditablePersonal,
  toFormTallaValue,
} from "@/lib/form-mappers";
import {
  apellidosLabel,
  nombresLabel,
  rangoAbreviacionLabel,
  rangoLabel,
  ROLE_DETAILS,
  roleDescription,
  roleLabel,
  roleScope,
  systemUserLabel,
  tallasEntries,
} from "@/lib/formatters";
import type { OficialSuboficial, Personal, Role } from "@/types/entities";
import type { OficialSuboficialForm, PersonalForm } from "@/types/forms";

describe("date-helpers", () => {
  it("normalizeDateInput inserta barras progresivamente y recorta a 8 dígitos", () => {
    expect(normalizeDateInput("1")).toBe("1");
    expect(normalizeDateInput("12")).toBe("12");
    expect(normalizeDateInput("1205")).toBe("12/05");
    expect(normalizeDateInput("12a05b202699")).toBe("12/05/2026");
  });

  it("parseDateInput parsea DD/MM/AAAA, YYYY-MM-DD, fechas inválidas e incompletas", () => {
    expect(parseDateInput("   ")).toEqual({
      year: 0,
      month: 0,
      day: 0,
      valid: false,
      complete: false,
      displayValue: "",
      isoValue: null,
      sortKey: null,
      date: null,
    });

    const leap = parseDateInput("29/02/2024");
    expect(leap.valid).toBe(true);
    expect(leap.complete).toBe(true);
    expect(leap.displayValue).toBe("29/02/2024");
    expect(leap.isoValue).toBe("2024-02-29");
    expect(leap.sortKey).toBe("20240229");
    expect(leap.date?.toISOString()).toBe("2024-02-29T00:00:00.000Z");

    const iso = parseDateInput("2026-05-07");
    expect(iso.valid).toBe(true);
    expect(iso.displayValue).toBe("07/05/2026");
    expect(iso.isoValue).toBe("2026-05-07");

    const invalidCalendar = parseDateInput("31/02/2024");
    expect(invalidCalendar.valid).toBe(false);
    expect(invalidCalendar.complete).toBe(true);
    expect(invalidCalendar.displayValue).toBe("31/02/2024");
    expect(invalidCalendar.date).toBeNull();

    const invalidMonth = parseDateInput("2024-13-01");
    expect(invalidMonth.valid).toBe(false);
    expect(invalidMonth.complete).toBe(true);
    expect(invalidMonth.displayValue).toBe("20/24/1301");

    const incomplete = parseDateInput("15/06");
    expect(incomplete.valid).toBe(false);
    expect(incomplete.complete).toBe(false);
    expect(incomplete.displayValue).toBe("15/06");

    expect(dateInputToDate("10/03/2026")?.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(dateInputToDate("31/02/2026")).toBeNull();
  });

  it("compara fechas entre sí y contra la fecha de hoy", () => {
    expect(compareDateInputValues("10/05/2026", "12/05/2026")).toBeLessThan(0);
    expect(compareDateInputValues("12/05/2026", "12/05/2026")).toBe(0);
    expect(compareDateInputValues("15/05/2026", "12/05/2026")).toBeGreaterThan(0);
    expect(compareDateInputValues("invalida", "12/05/2026")).toBeNull();

    expect(isDateInputAfter("15/05/2026", "12/05/2026")).toBe(true);
    expect(isDateInputAfter("10/05/2026", "12/05/2026")).toBe(false);
    expect(isDateInputAfter("invalida", "12/05/2026")).toBe(false);

    const today = new Date(2026, 4, 20, 15, 0, 0);
    expect(getTodayDateInput(today)).toBe("20/05/2026");
    expect(isDateInputAfterToday("21/05/2026", today)).toBe(true);
    expect(isDateInputAfterToday("20/05/2026", today)).toBe(false);
    expect(isDateInputAfterToday("invalida", today)).toBe(false);
  });

  it("extrae y formatea fechas solo-fecha y fecha-hora en todos los formatos soportados", () => {
    expect(extractDateParts(null)).toBeNull();
    expect(extractDateParts("")).toBeNull();
    expect(extractDateParts("20/05/2026")).toEqual({ year: "2026", month: "05", day: "20" });
    expect(extractDateParts("2026-05-20T18:30:00.000Z")).toEqual({
      year: "2026",
      month: "05",
      day: "20",
    });
    expect(extractDateParts(new Date("2026-05-21T00:00:00.000Z"))).toEqual({
      year: "2026",
      month: "05",
      day: "21",
    });
    expect(extractDateParts("May 22, 2026")).toEqual({ year: "2026", month: "05", day: "22" });
    expect(extractDateParts("texto-no-fecha")).toBeNull();
    expect(extractDateParts("00/05/2026")).toBeNull();

    expect(formatDateOnlyFromDate(null)).toBeNull();
    expect(formatDateOnlyFromDate(new Date("2026-05-20T00:00:00.000Z"))).toBe("20/05/2026");

    expect(formatDateOnlyForDisplay("2026-05-20")).toBe("20/05/2026");
    expect(formatDateOnlyForDisplay("valor-crudo")).toBe("valor-crudo");
    expect(formatDateOnlyForDisplay("   ", "N/A")).toBe("N/A");
    expect(formatDateOnlyForDisplay(null, "Sin fecha")).toBe("Sin fecha");

    expect(formatDateTimeForDisplay(null, "N/D")).toBe("N/D");
    expect(formatDateTimeForDisplay("20/05/2026")).toBe("20/05/2026");
    expect(formatDateTimeForDisplay("2026-05-20")).toBe("20/05/2026");
    expect(formatDateTimeForDisplay(new Date(2026, 4, 20, 8, 5, 0))).toBe("20/05/2026");
    expect(formatDateTimeForDisplay("   ", "Vacío")).toBe("Vacío");
    expect(formatDateTimeForDisplay("fecha-mala", "Vacío")).toBe("fecha-mala");
    expect(formatDateTimeForDisplay(new Date("invalid"), "Inválida")).toBe("Inválida");

    expect(formatDateTimeExact(null)).toBe("");
    expect(formatDateTimeExact("no-valida")).toBe("no-valida");
    expect(formatDateTimeExact(new Date(2026, 4, 20, 9, 4, 7))).toBe("20/05/2026 09:04:07");
    expect(formatDateTimeExact(new Date(2026, 4, 20, 9, 4, 7).toISOString())).toBe(
      "20/05/2026 09:04:07"
    );
  });
});

describe("form-mappers", () => {
  it("reexporta getTodayDateInput y mapea tallas, fechas y formularios editables", () => {
    expect(getTodayFromFormMappers(new Date(2026, 0, 5))).toBe("05/01/2026");

    expect(tallasMap([])).toEqual({
      PARKA: "-",
      CAMISACO: "-",
      PANTALON: "-",
      KEPI: "-",
      CALZADO: "-",
    });
    expect(
      tallasMap([
        { tallaTipo: { nombre: "PARKA" }, tallaValor: "L" },
        { tallaTipo: { nombre: "CALZADO" }, tallaValor: "42" },
      ])
    ).toEqual({
      PARKA: "L",
      CAMISACO: "-",
      PANTALON: "-",
      KEPI: "-",
      CALZADO: "42",
    });

    expect(toDateInput(null)).toBe("");
    expect(toDateInput("2026-05-20T00:00:00.000Z")).toBe("20/05/2026");

    expect(toFormTallaValue("PARKA", "-")).toBe("");
    expect(toFormTallaValue("PARKA", " xl ")).toBe("XL");
    expect(toFormTallaValue("KEPI", "")).toBe("");
    expect(toFormTallaValue("CALZADO", " 041 ")).toBe("41");
  });

  it("construye payloads para personal y oficiales/suboficiales y convierte entidades a formularios", () => {
    const pForm: PersonalForm = {
      ci: " 41234567 ",
      apellido1: " Silva ",
      apellido2: " Gómez ",
      nombre1: " Pedro ",
      nombre2: " Luis ",
      telefonoContacto: " 099111222 ",
      esReingreso: true,
      fechaIngreso: "20/05/2026",
      fechaIngresoOriginal: "10/01/2023",
      rangoId: "5",
      bateriaId: "2",
      PARKA: " m ",
      CAMISACO: "",
      PANTALON: "l",
      KEPI: "57",
      CALZADO: "41",
    };

    expect(personalPayload(pForm, true)).toEqual({
      ci: "41234567",
      apellido1: "Silva",
      apellido2: "Gómez",
      nombre1: "Pedro",
      nombre2: "Luis",
      telefonoContacto: "099111222",
      esReingreso: true,
      fechaIngreso: "20/05/2026",
      fechaIngresoOriginal: "10/01/2023",
      rangoId: 5,
      bateriaId: 2,
      tallas: {
        PARKA: "M",
        CAMISACO: "",
        PANTALON: "L",
        KEPI: "57",
        CALZADO: "41",
      },
    });

    expect(
      personalPayload(
        {
          ...pForm,
          esReingreso: false,
          fechaIngreso: "",
          bateriaId: "",
        },
        false
      )
    ).toEqual({
      apellido1: "Silva",
      apellido2: "Gómez",
      nombre1: "Pedro",
      nombre2: "Luis",
      telefonoContacto: "099111222",
      esReingreso: false,
      fechaIngreso: undefined,
      fechaIngresoOriginal: undefined,
      rangoId: 5,
      bateriaId: undefined,
      tallas: {
        PARKA: "M",
        CAMISACO: "",
        PANTALON: "L",
        KEPI: "57",
        CALZADO: "41",
      },
    });

    expect(
      personalPayload(
        {
          ...pForm,
          esReingreso: true,
          fechaIngresoOriginal: "",
        },
        false
      ).fechaIngresoOriginal
    ).toBeUndefined();

    const oForm: OficialSuboficialForm = {
      ci: " 31112223 ",
      tipo: "OFICIAL",
      apellido1: " Díaz ",
      apellido2: " ",
      nombre1: " Sofía ",
      nombre2: " ",
      telefonoContacto: " 098000111 ",
      rangoId: "9",
      PARKA: "s",
      CAMISACO: "s",
      PANTALON: "m",
      KEPI: "55",
      CALZADO: "38",
    };

    expect(oficialSuboficialPayload(oForm, true)).toEqual({
      ci: "31112223",
      tipo: "OFICIAL",
      apellido1: "Díaz",
      apellido2: "",
      nombre1: "Sofía",
      nombre2: "",
      telefonoContacto: "098000111",
      rangoId: 9,
      tallas: {
        PARKA: "S",
        CAMISACO: "S",
        PANTALON: "M",
        KEPI: "55",
        CALZADO: "38",
      },
    });
    expect(oficialSuboficialPayload(oForm, false)).not.toHaveProperty("ci");

    const personaEntity: Personal = {
      ci: "41234567",
      apellido1: "Silva",
      apellido2: null,
      nombre1: "Pedro",
      nombre2: null,
      telefonoContacto: null,
      esReingreso: false,
      fechaIngreso: null,
      fechaIngresoOriginal: null,
      rangoId: 5,
      bateriaId: null,
      rango: { rangoId: 5, abreviacion: "Sdo.", nombreCompleto: "Soldado", orden: 5 },
      bateria: null,
      tallas: [{ tallaTipo: { nombre: "PARKA" }, tallaValor: "L" }],
    };

    expect(toEditablePersonal(personaEntity)).toEqual({
      ci: "41234567",
      apellido1: "Silva",
      apellido2: "",
      nombre1: "Pedro",
      nombre2: "",
      telefonoContacto: "",
      esReingreso: false,
      fechaIngreso: "",
      fechaIngresoOriginal: "",
      rangoId: "5",
      bateriaId: "",
      PARKA: "L",
      CAMISACO: "",
      PANTALON: "",
      KEPI: "",
      CALZADO: "",
    });

    expect(
      toEditablePersonal({
        ...personaEntity,
        apellido2: "Gómez",
        nombre2: "Luis",
        telefonoContacto: "099",
        bateriaId: 3,
      }).bateriaId
    ).toBe("3");

    const oficialEntity: OficialSuboficial = {
      ci: "31112223",
      apellido1: "Díaz",
      apellido2: null,
      nombre1: "Sofía",
      nombre2: null,
      telefonoContacto: null,
      rangoId: 9,
      nombre: "Sofía",
      apellido: "Díaz",
      tipo: "SUBOFICIAL",
      gradoMandoId: 1,
      gradoMando: {
        gradoMandoId: 1,
        abreviacion: "Subof.",
        nombreCompleto: "Suboficial",
        orden: 1,
      },
      tallas: [{ tallaTipo: { nombre: "KEPI" }, tallaValor: "56" }],
    };

    expect(toEditableOficialSuboficial(oficialEntity)).toEqual({
      ci: "31112223",
      tipo: "SUBOFICIAL",
      apellido1: "Díaz",
      apellido2: "",
      nombre1: "Sofía",
      nombre2: "",
      telefonoContacto: "",
      rangoId: "9",
      PARKA: "",
      CAMISACO: "",
      PANTALON: "",
      KEPI: "56",
      CALZADO: "",
    });
  });
});

describe("formatters", () => {
  it("formatea nombres, apellidos, roles, rangos, usuarios de sistema y entradas de tallas", () => {
    const persona: Personal = {
      ci: "12345678",
      apellido1: "Pérez",
      apellido2: "  Rodríguez ",
      nombre1: "Juan",
      nombre2: null,
      telefonoContacto: null,
      esReingreso: false,
      fechaIngreso: null,
      fechaIngresoOriginal: null,
      rangoId: 1,
      bateriaId: null,
      rango: { rangoId: 1, abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 1 },
      bateria: null,
      tallas: [],
    };

    expect(apellidosLabel(persona)).toBe("Pérez Rodríguez");
    expect(apellidosLabel({ ...persona, apellido2: null })).toBe("Pérez");
    expect(nombresLabel(persona)).toBe("Juan");
    expect(nombresLabel({ ...persona, nombre2: "Carlos" })).toBe("Juan Carlos");

    expect(Object.keys(ROLE_DETAILS)).toEqual(["ADMIN", "DESARROLLADOR", "EDITOR", "READ_ONLY"]);
    expect(roleLabel("ADMIN")).toBe("Administrador");
    expect(roleLabel(null)).toBe("Sin rol");
    expect(roleLabel("CUSTOM" as unknown as Role)).toBe("CUSTOM");

    expect(roleDescription("EDITOR")).toContain("Opera personal");
    expect(roleDescription(undefined)).toBe("Sin permisos asignados.");
    expect(roleDescription("CUSTOM" as unknown as Role)).toBe("CUSTOM");

    expect(roleScope("READ_ONLY")).toContain("visualización");
    expect(roleScope(null)).toBe("");
    expect(roleScope("CUSTOM" as unknown as Role)).toBe("");

    expect(rangoAbreviacionLabel({ abreviacion: " Cap. " })).toBe("Cap.");
    expect(rangoAbreviacionLabel({ abreviacion: "   " }, "N/A")).toBe("N/A");
    expect(rangoAbreviacionLabel(null)).toBe("Sin grado");

    expect(
      systemUserLabel({
        rango: { abreviacion: "Tte.2º" },
        apellido: "Otero",
        nombre: "Gerardo",
        username: "gotero",
      })
    ).toBe("Tte.2º Otero, Gerardo");
    expect(
      systemUserLabel({ rango: null, apellido: "Lara", nombre: null, username: "wlara" })
    ).toBe("Lara");
    expect(systemUserLabel({ rango: null, apellido: " ", nombre: " ", username: " dev " })).toBe(
      "dev"
    );
    expect(systemUserLabel({})).toBe("Usuario sin nombre");

    expect(
      rangoLabel({ rangoId: 1, abreviacion: "Sgto.", nombreCompleto: "Sargento", orden: 1 })
    ).toBe("Sgto. - Sargento");

    expect(tallasEntries({ PARKA: "L", CAMISACO: "-", CALZADO: "42" })).toEqual([
      { key: "PARKA", label: "Parka", value: "L" },
      { key: "CAMISACO", label: "Camisaco", value: "Sin dato" },
      { key: "PANTALON", label: "Pantalon", value: "Sin dato" },
      { key: "KEPI", label: "Kepi", value: "Sin dato" },
      { key: "CALZADO", label: "Calzado", value: "42" },
    ]);
  });
});
