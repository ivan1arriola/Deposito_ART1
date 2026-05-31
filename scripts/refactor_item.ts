import fs from "fs";
import path from "path";

// 1. Rename directories and files
const renames = [
  { from: "src/app/api/items", to: "src/app/api/equipos" },
  { from: "src/app/api/equipos/[itemId]", to: "src/app/api/equipos/[equipoId]" },
  { from: "src/app/api/stock/item-trace", to: "src/app/api/stock/equipo-trace" },
  { from: "src/lib/item-ordering.ts", to: "src/lib/equipo-ordering.ts" },
  { from: "src/lib/stock-item-trace.ts", to: "src/lib/stock-equipo-trace.ts" },
];

for (const { from, to } of renames) {
  if (fs.existsSync(from)) {
    fs.renameSync(from, to);
    console.log(`Renamed ${from} to ${to}`);
  }
}

// 2. Glob all ts and tsx files
function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== ".git" && file !== "generated") {
        walk(filePath, fileList);
      }
    } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = [...walk("src"), ...walk("tests")];

const replacements = [
  // Prisma relation/model renames
  { from: /\bItem\b/g, to: "Equipo" },
  { from: /\bitem\b/g, to: "equipo" },
  { from: /\bitems\b/g, to: "equipos" },
  { from: /\bItems\b/g, to: "Equipos" },
  { from: /\bitemId\b/g, to: "equipoId" },
  { from: /\bitemIds\b/g, to: "equipoIds" },
  { from: /\bItemId\b/g, to: "EquipoId" },
  
  // Specific casing and compounds
  { from: /\bMovimientoItem\b/g, to: "MovimientoEquipo" },
  { from: /\bmovimientoItem\b/g, to: "movimientoEquipo" },
  { from: /\bmovimientoItems\b/g, to: "movimientoEquipos" },
  { from: /\bCajaItem\b/g, to: "CajaEquipo" },
  { from: /\bcajaItems\b/g, to: "cajaEquipos" },
  { from: /\bStockOperacionItem\b/g, to: "StockOperacionEquipo" },
  { from: /\bstockOperacionItems\b/g, to: "stockOperacionEquipos" },
  { from: /\bItemCodigoSIE\b/g, to: "EquipoCodigoSIE" },
  { from: /\bitemCodigoSIE\b/g, to: "equipoCodigoSIE" },
  { from: /\bitemCodigoSieId\b/g, to: "equipoCodigoSieId" },
  { from: /\bcajaItemCodigoSIE\b/g, to: "cajaEquipoCodigoSIE" },
  
  // Paths
  { from: /\/api\/items/g, to: "/api/equipos" },
  { from: /\/api\/stock\/item-trace/g, to: "/api/stock/equipo-trace" },
  { from: /item-ordering/g, to: "equipo-ordering" },
  { from: /stock-item-trace/g, to: "stock-equipo-trace" },
  { from: /\[itemId\]/g, to: "[equipoId]" },
  
  // Plurals and specific edge cases
  { from: /\bITEM\b/g, to: "EQUIPO" },
  { from: /\bITEMS\b/g, to: "EQUIPOS" },
];

let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, "utf-8");
  let modified = false;

  for (const { from, to } of replacements) {
    if (from.test(content)) {
      content = content.replace(from, to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(file, content);
    changedCount++;
  }
}

console.log(`Updated ${changedCount} files with item->equipo replacements`);
