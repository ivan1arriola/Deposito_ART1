import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient, TipoRegistro } from "@prisma/client";

const prisma = new PrismaClient();

const COMMENT_TAG = "Importacion de datos anteriores ";

const CATALOGO_ITEMS = [
  { nombre: "Buzo Verde M/C", ordenPdf: 1 },
  { nombre: "Buzo M/L V/Oliva", ordenPdf: 2 },
  { nombre: "Parka Pixelada 4A", ordenPdf: 3 },
  { nombre: "Birrete Eq. Pixelado A4", ordenPdf: 4 },
  { nombre: "Camisaco Eq. Pixelado A4", ordenPdf: 5 },
  { nombre: "Pantalón Eq. Pixelado A4", ordenPdf: 6 },
  { nombre: "Birrete Eq.Pixelado", ordenPdf: 7 },
  { nombre: "Camisaco Eq.Pixelado", ordenPdf: 8 },
  { nombre: "Pantalón Eq.Pixelado", ordenPdf: 9 },
  { nombre: "Parka Pixelada", ordenPdf: 10 },
  { nombre: "Campera Eq. Deportivo Largo", ordenPdf: 11 },
  { nombre: "Pantalón Eq. Deportivo Largo", ordenPdf: 12 },
  { nombre: "Buzo Verde Polar.", ordenPdf: 13 },
  { nombre: "Medias Verdes", ordenPdf: 14 },
  { nombre: "Equipo Termico", ordenPdf: 15 },
  { nombre: "Funda de Almohada", ordenPdf: 16 },
  { nombre: "Sabanas", ordenPdf: 17 },
  { nombre: "Arnes Combate (Y)", ordenPdf: 18 },
  { nombre: "Arnes de tela (H)", ordenPdf: 19 },
  { nombre: "Cinturon de Combate tela (H)", ordenPdf: 20 },
  { nombre: "Cinturon de combate (Y)", ordenPdf: 21 },
  { nombre: "Frazada", ordenPdf: 22 },
  { nombre: "Bota Corta de Cuero SIE", ordenPdf: 23 },
  { nombre: "Bota Corta de tela S.I.E.", ordenPdf: 24 },
];

function getArg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalizeTextKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildCanonicalMap() {
  const map = new Map();
  for (const item of CATALOGO_ITEMS) {
    map.set(normalizeTextKey(item.nombre), item.nombre);
  }

  map.set(normalizeTextKey("Buzo Verde M/C Escote Redondo"), "Buzo Verde M/C");
  map.set(normalizeTextKey("Buzo Manga Larga V/ Oliva"), "Buzo M/L V/Oliva");
  map.set(normalizeTextKey("Parka Pixelada con Forro Polar"), "Parka Pixelada");
  map.set(normalizeTextKey("Parka Pixelada CON Forro Polar"), "Parka Pixelada");
  map.set(normalizeTextKey("Parka Pixelada SIN Forro Polar"), "Parka Pixelada");
  map.set(normalizeTextKey("Parka Pixelada con Forro Polar 4A"), "Parka Pixelada 4A");
  map.set(normalizeTextKey("Birrete Pixelado 4A"), "Birrete Eq. Pixelado A4");
  map.set(normalizeTextKey("Birrete Eq. Pixelado 4A"), "Birrete Eq. Pixelado A4");
  map.set(normalizeTextKey("Camisaco Pixelado 4A"), "Camisaco Eq. Pixelado A4");
  map.set(normalizeTextKey("Camisaco Eq. Pixelado 4A"), "Camisaco Eq. Pixelado A4");
  map.set(normalizeTextKey("Pantalon Pixelado 4A"), "Pantalón Eq. Pixelado A4");
  map.set(normalizeTextKey("Pantalon Eq. Pixelado 4A"), "Pantalón Eq. Pixelado A4");
  map.set(normalizeTextKey("Campera Eq.Deportivo Largo"), "Campera Eq. Deportivo Largo");
  map.set(normalizeTextKey("Pantalon Eq.Deportivo Largo"), "Pantalón Eq. Deportivo Largo");
  map.set(normalizeTextKey("Buzo Verde Polar"), "Buzo Verde Polar.");
  map.set(normalizeTextKey("Medias verdes"), "Medias Verdes");
  map.set(normalizeTextKey("Arnes de combate (Y)"), "Arnes Combate (Y)");
  map.set(normalizeTextKey("Arnes en tela H"), "Arnes de tela (H)");
  map.set(normalizeTextKey("Cinturon de Combate en tela H"), "Cinturon de Combate tela (H)");
  map.set(normalizeTextKey("Cinturon de combate"), "Cinturon de combate (Y)");
  map.set(normalizeTextKey("Cinturon de cobate (Y)"), "Cinturon de combate (Y)");
  map.set(normalizeTextKey("Bota Corta de cuero S.I.E"), "Bota Corta de Cuero SIE");
  map.set(normalizeTextKey("Bota Corta de tela S.I.E"), "Bota Corta de tela S.I.E.");

  return map;
}

function parseDateUruguay(value) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function parseTipoRegistro(rawValue) {
  const key = normalizeTextKey(rawValue);
  if (key.startsWith("distribucion")) return TipoRegistro.ENTREGA;
  if (key.startsWith("devolucion")) return TipoRegistro.DEVOLUCION;
  return null;
}

function splitColumns(line) {
  if (line.includes("\t")) return line.split("\t");
  return line.split(/\s{2,}/g);
}

async function ensureCatalogItems() {
  for (const item of CATALOGO_ITEMS) {
    await prisma.item.upsert({
      where: { nombre: item.nombre },
      update: {
        activo: true,
        ordenPdf: item.ordenPdf,
      },
      create: {
        nombre: item.nombre,
        activo: true,
        ordenPdf: item.ordenPdf,
      },
    });
  }
}

async function main() {
  const canonicalNameMap = buildCanonicalMap();
  const defaultFile = path.join("scripts", "data", "movimientos-import.tsv");
  const filePath = getArg("file", defaultFile);

  const raw = await fs.readFile(filePath, "utf8");
  const lines = raw
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("El archivo de movimientos esta vacio.");
  }

  await ensureCatalogItems();

  const existingItems = await prisma.item.findMany({
    select: { itemId: true, nombre: true },
  });
  const itemIdByName = new Map(existingItems.map((row) => [row.nombre, row.itemId]));

  const personalRows = await prisma.personal.findMany({ select: { ci: true } });
  const existingCi = new Set(personalRows.map((row) => row.ci));

  let headerItemNames = [];
  let created = 0;
  let updated = 0;
  const errors = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const colsRaw = splitColumns(line).map((col) => col.trim());

    const firstColumn = colsRaw[0] ?? "";
    if (!headerItemNames.length) {
      if (normalizeTextKey(firstColumn) === "persona") {
        if (colsRaw.length < 8) {
          errors.push(`Linea ${index + 1}: encabezado invalido.`);
          continue;
        }
        headerItemNames = colsRaw.slice(4).map((itemHeader) => {
          const canonical = canonicalNameMap.get(normalizeTextKey(itemHeader));
          if (!canonical) {
            errors.push(`Linea ${index + 1}: item no reconocido en encabezado (${itemHeader}).`);
            return itemHeader;
          }
          return canonical;
        });
      }
      continue;
    }

    if (colsRaw.length < 4) {
      continue;
    }

    const ci = String(colsRaw[1] ?? "").replace(/\D/g, "");
    const fecha = parseDateUruguay(colsRaw[2] ?? "");
    const tipo = parseTipoRegistro(colsRaw[3] ?? "");

    if (!ci || !fecha || !tipo) {
      errors.push(`Linea ${index + 1}: CI/fecha/tipo invalido.`);
      continue;
    }
    if (!existingCi.has(ci)) {
      errors.push(`Linea ${index + 1}: CI no existe en personal (${ci}).`);
      continue;
    }

    const qtyColumns = colsRaw.slice(4);
    if (qtyColumns.length < headerItemNames.length) {
      errors.push(`Linea ${index + 1}: cantidades incompletas.`);
      continue;
    }

    const details = [];
    let rowHasNumericErrors = false;

    for (let itemIndex = 0; itemIndex < headerItemNames.length; itemIndex += 1) {
      const canonicalItemName = headerItemNames[itemIndex];
      const itemId = itemIdByName.get(canonicalItemName);
      if (!itemId) {
        errors.push(`Linea ${index + 1}: item no encontrado en BD (${canonicalItemName}).`);
        rowHasNumericErrors = true;
        continue;
      }

      const rawQty = String(qtyColumns[itemIndex] ?? "0").replace(",", ".").trim();
      const qty = Number(rawQty);
      if (!Number.isFinite(qty)) {
        errors.push(`Linea ${index + 1}: cantidad invalida (${canonicalItemName}: ${rawQty}).`);
        rowHasNumericErrors = true;
        continue;
      }

      if (qty === 0) continue;

      const cantidad = Math.abs(Math.trunc(qty));
      if (cantidad <= 0) continue;
      details.push({ itemId, cantidad });
    }

    if (rowHasNumericErrors) {
      continue;
    }
    if (details.length === 0) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const existingRegistro = await tx.registro.findFirst({
        where: {
          ci,
          fecha,
          tipo,
          comentarios: COMMENT_TAG,
        },
        select: { registroId: true },
      });

      if (existingRegistro) {
        await tx.registroItem.deleteMany({
          where: { registroId: existingRegistro.registroId },
        });
        await tx.registroItem.createMany({
          data: details.map((detail) => ({
            registroId: existingRegistro.registroId,
            itemId: detail.itemId,
            cantidad: detail.cantidad,
          })),
        });
        updated += 1;
      } else {
        const createdRegistro = await tx.registro.create({
          data: {
            ci,
            fecha,
            tipo,
            comentarios: COMMENT_TAG,
          },
          select: { registroId: true },
        });
        await tx.registroItem.createMany({
          data: details.map((detail) => ({
            registroId: createdRegistro.registroId,
            itemId: detail.itemId,
            cantidad: detail.cantidad,
          })),
        });
        created += 1;
      }
    });
  }

  console.log(`Items catalogo asegurados: ${CATALOGO_ITEMS.length}`);
  console.log(`Registros creados: ${created}`);
  console.log(`Registros actualizados: ${updated}`);
  console.log(`Errores: ${errors.length}`);
  if (errors.length > 0) {
    for (const error of errors.slice(0, 40)) {
      console.error(`- ${error}`);
    }
    if (errors.length > 40) {
      console.error(`... y ${errors.length - 40} errores mas.`);
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
