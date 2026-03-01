import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { generateValidationDigit, validateIdentificationNumber } from "ciuy";

const prisma = new PrismaClient();

const TALLA_KEYS = ["PARKA", "CAMISACO", "PANTALON", "KEPI", "CALZADO"];
const ROPA_TALLES = new Set(["XS", "S", "M", "L", "XL", "XXL", "XXXL"]);
const KEPI_TALLES = new Set(["54", "55", "56", "57", "58", "59", "60", "61", "62", "63"]);
const CALZADO_TALLES = new Set(["34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47"]);
const CDO_SERV_BATTERY_NAME = "Cdo. y Serv.";
const CIRR_GRADE_BY_LEGACY_BATTERY = {
  "S/ CIRR": {
    abreviacion: "Sdo 1° S/CIRR",
    nombreCompleto: "Soldado Primero Sin CIRR",
  },
  "Cursando CIRR": {
    abreviacion: "Sdo 1° C/CIRR",
    nombreCompleto: "Soldado Primero Cursando CIRR",
  },
};
const RANGO_FULLNAME_BY_ABBR = {
  Sgto: "Sargento",
  "Cabo 1°": "Cabo Primero",
  "Cabo 2°": "Cabo Segundo",
  "Sdo 1°": "Soldado Primero",
  "Sdo 1° C/CIRR": "Soldado Primero Cursando CIRR",
  "Sdo 1° S/CIRR": "Soldado Primero Sin CIRR",
};

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalizeCi(input) {
  return String(input ?? "").replace(/\D/g, "");
}

function isValidUruguayanCi(input) {
  const digits = normalizeCi(input);
  if (digits.length < 2 || digits.length > 8) return false;

  if (digits.length >= 7) {
    return validateIdentificationNumber(digits);
  }

  const body = digits.slice(0, -1);
  const checkDigit = Number(digits.slice(-1));
  if (Number.isNaN(checkDigit)) return false;

  const expected = generateValidationDigit(body);
  return expected === checkDigit;
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function normalizeRangoAbreviacion(value) {
  const base = String(value ?? "")
    .replace(/\u00BA/g, "\u00B0")
    .replace(/\s+/g, " ")
    .trim();
  const key = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const map = {
    SGTO: "Sgto",
    "CABO 1\u00B0": "Cabo 1\u00B0",
    "CABO 1": "Cabo 1\u00B0",
    "CABO 2\u00B0": "Cabo 2\u00B0",
    "CABO 2": "Cabo 2\u00B0",
    "SDO 1\u00B0": "Sdo 1\u00B0",
    "SDO 1": "Sdo 1\u00B0",
  };

  return map[key] ?? base;
}

function normalizeBateriaNombre(value) {
  const base = String(value ?? "").trim();
  if (!base) return null;

  const key = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

  const map = {
    "CDO. Y SERV.": "Cdo. y Serv.",
    'BA. OBUS. "A"': 'Ba. Obus. "A"',
    'BA. OBUS. "B"': 'Ba. Obus. "B"',
  };

  return map[key] ?? base;
}

function resolveCirrClassification(rangoAbreviacion, bateriaNombre) {
  if (!bateriaNombre) {
    return {
      rangoAbreviacion,
      bateriaNombre,
    };
  }

  const cirrGrade = CIRR_GRADE_BY_LEGACY_BATTERY[bateriaNombre];
  if (!cirrGrade) {
    return {
      rangoAbreviacion,
      bateriaNombre,
    };
  }

  return {
    rangoAbreviacion: cirrGrade.abreviacion,
    bateriaNombre: CDO_SERV_BATTERY_NAME,
  };
}

function normalizeTallaRopa(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!ROPA_TALLES.has(normalized)) return null;
  return normalized;
}

function normalizeTallaNumero(value) {
  const parsed = Number(String(value ?? "").trim());
  if (!Number.isInteger(parsed)) return null;
  return String(parsed);
}

function parseFechaIngreso(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  if (date.getTime() > todayUtc) return null;
  return date;
}

function splitLine(line) {
  if (line.includes("\t")) {
    return line.split("\t");
  }
  return line.trim().split(/\s{2,}/g);
}

function parseRow(line, lineNumber) {
  const pieces = splitLine(line).map((part) => part.trim());
  if (pieces.length < 13) {
    return { error: `Linea ${lineNumber}: columnas insuficientes (${pieces.length}).` };
  }

  const columns = pieces.length > 13 ? [...pieces.slice(0, 12), pieces.slice(12).join(" ").trim()] : pieces;
  const [rango, apellido1, apellido2, nombre1, nombre2, ciRaw, parka, camisaco, pantalon, kepi, calzado, fechaIngreso, bateria] =
    columns;

  const ci = normalizeCi(ciRaw);
  if (!isValidUruguayanCi(ci)) {
    return { error: `Linea ${lineNumber}: CI invalida (${ciRaw}).` };
  }

  const apellido1Value = normalizeText(apellido1);
  const nombre1Value = normalizeText(nombre1);
  if (!apellido1Value || !nombre1Value) {
    return { error: `Linea ${lineNumber}: apellido1 o nombre1 vacio.` };
  }

  const parkaValue = normalizeTallaRopa(parka);
  const camisacoValue = normalizeTallaRopa(camisaco);
  const pantalonValue = normalizeTallaRopa(pantalon);
  const kepiValue = normalizeTallaNumero(kepi);
  const calzadoValue = normalizeTallaNumero(calzado);

  if (!parkaValue || !camisacoValue || !pantalonValue || !kepiValue || !calzadoValue) {
    return { error: `Linea ${lineNumber}: talles invalidos.` };
  }
  if (!KEPI_TALLES.has(kepiValue) || !CALZADO_TALLES.has(calzadoValue)) {
    return { error: `Linea ${lineNumber}: kepi o calzado fuera de rango permitido.` };
  }

  const parsedDate = parseFechaIngreso(fechaIngreso);
  if (String(fechaIngreso ?? "").trim() && !parsedDate) {
    return { error: `Linea ${lineNumber}: fecha de ingreso invalida (${fechaIngreso}).` };
  }

  const normalizedBateriaNombre = normalizeBateriaNombre(bateria);
  const classification = resolveCirrClassification(normalizeRangoAbreviacion(rango), normalizedBateriaNombre);

  return {
    value: {
      ci,
      apellido1: apellido1Value,
      apellido2: normalizeText(apellido2),
      nombre1: nombre1Value,
      nombre2: normalizeText(nombre2),
      fechaIngreso: parsedDate,
      rangoAbreviacion: classification.rangoAbreviacion,
      bateriaNombre: classification.bateriaNombre,
      tallas: {
        PARKA: parkaValue,
        CAMISACO: camisacoValue,
        PANTALON: pantalonValue,
        KEPI: kepiValue,
        CALZADO: calzadoValue,
      },
    },
  };
}

async function main() {
  const defaultFile = path.join("scripts", "data", "personal-import.tsv");
  const filePath = getArg("file", defaultFile);

  const fileContent = await fs.readFile(filePath, "utf8");
  const lines = fileContent
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    throw new Error("No hay datos para importar.");
  }

  const rows = [];
  const errors = [];

  for (let index = 1; index < lines.length; index += 1) {
    const parsed = parseRow(lines[index], index + 1);
    if ("error" in parsed) {
      errors.push(parsed.error);
      continue;
    }
    rows.push(parsed.value);
  }

  const rangoList = await prisma.rango.findMany({
    select: { rangoId: true, abreviacion: true },
  });
  const rangoIdByAbrev = new Map(rangoList.map((row) => [row.abreviacion, row.rangoId]));

  const bateriaList = await prisma.bateria.findMany({
    select: { bateriaId: true, nombre: true },
  });
  const bateriaIdByNombre = new Map(bateriaList.map((row) => [row.nombre, row.bateriaId]));

  const tallaTipos = await prisma.tallaTipo.findMany({
    where: { nombre: { in: TALLA_KEYS } },
    select: { tallaTipoId: true, nombre: true },
  });
  const tallaTipoIdByNombre = new Map(tallaTipos.map((row) => [row.nombre, row.tallaTipoId]));

  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const rangoId = rangoIdByAbrev.get(row.rangoAbreviacion);
    let ensuredRangoId = rangoId ?? null;
    if (!ensuredRangoId) {
      const nombreCompleto = RANGO_FULLNAME_BY_ABBR[row.rangoAbreviacion];
      if (!nombreCompleto) {
        errors.push(`CI ${row.ci}: grado no encontrado (${row.rangoAbreviacion}).`);
        continue;
      }

      const createdRango = await prisma.rango.create({
        data: {
          abreviacion: row.rangoAbreviacion,
          nombreCompleto,
        },
        select: {
          rangoId: true,
          abreviacion: true,
        },
      });

      ensuredRangoId = createdRango.rangoId;
      rangoIdByAbrev.set(createdRango.abreviacion, createdRango.rangoId);
    }

    let bateriaId = null;
    if (row.bateriaNombre) {
      bateriaId = bateriaIdByNombre.get(row.bateriaNombre) ?? null;
      if (!bateriaId) {
        const createdBateria = await prisma.bateria.create({
          data: { nombre: row.bateriaNombre },
          select: { bateriaId: true, nombre: true },
        });
        bateriaId = createdBateria.bateriaId;
        bateriaIdByNombre.set(createdBateria.nombre, createdBateria.bateriaId);
      }
    }

    const exists = await prisma.personal.findUnique({
      where: { ci: row.ci },
      select: { ci: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.personal.upsert({
        where: { ci: row.ci },
        create: {
          ci: row.ci,
          apellido1: row.apellido1,
          apellido2: row.apellido2,
          nombre1: row.nombre1,
          nombre2: row.nombre2,
          fechaIngreso: row.fechaIngreso,
          rangoId: ensuredRangoId,
          bateriaId,
        },
        update: {
          apellido1: row.apellido1,
          apellido2: row.apellido2,
          nombre1: row.nombre1,
          nombre2: row.nombre2,
          fechaIngreso: row.fechaIngreso,
          rangoId: ensuredRangoId,
          bateriaId,
        },
      });

      for (const tallaKey of TALLA_KEYS) {
        const tallaTipoId = tallaTipoIdByNombre.get(tallaKey);
        if (!tallaTipoId) continue;

        await tx.personalTalla.upsert({
          where: {
            ci_tallaTipoId: {
              ci: row.ci,
              tallaTipoId,
            },
          },
          create: {
            ci: row.ci,
            tallaTipoId,
            tallaValor: row.tallas[tallaKey],
          },
          update: {
            tallaValor: row.tallas[tallaKey],
          },
        });
      }
    });

    if (exists) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  console.log(`Filas parseadas: ${rows.length}`);
  console.log(`Personal creados: ${created}`);
  console.log(`Personal actualizados: ${updated}`);
  console.log(`Errores: ${errors.length}`);
  if (errors.length > 0) {
    for (const error of errors.slice(0, 30)) {
      console.error(`- ${error}`);
    }
    if (errors.length > 30) {
      console.error(`... y ${errors.length - 30} errores mas.`);
    }
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Importacion fallida: ${message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
