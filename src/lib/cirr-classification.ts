export const CDO_SERV_BATTERY_NAME = "Cdo. y Serv.";

export const LEGACY_CIRR_BATTERY_NAMES = ["S/ CIRR", "Cursando CIRR"] as const;

export const CIRR_GRADE_BY_LEGACY_BATTERY = {
  "S/ CIRR": {
    abreviacion: "Sdo 1° S/CIRR",
    nombreCompleto: "Soldado Primero Sin CIRR",
  },
  "Cursando CIRR": {
    abreviacion: "Sdo 1° C/CIRR",
    nombreCompleto: "Soldado Primero Cursando CIRR",
  },
} as const;

export function isLegacyCirrBatteryName(value: string | null | undefined): value is (typeof LEGACY_CIRR_BATTERY_NAMES)[number] {
  if (!value) return false;
  return LEGACY_CIRR_BATTERY_NAMES.includes(value as (typeof LEGACY_CIRR_BATTERY_NAMES)[number]);
}
