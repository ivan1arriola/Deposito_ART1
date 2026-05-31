import fs from "fs";
import path from "path";

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
  { from: /\bstockOperacionItem\b/g, to: "stockOperacionEquipo" },
  { from: /\bcajaItem\b/g, to: "cajaEquipo" },
  { from: /\bitemCodigoSIEId\b/g, to: "equipoCodigoSieId" },
  { from: /\bItemCodigoSIEId\b/g, to: "EquipoCodigoSieId" },
  { from: /\bcodigoDepositoGeneral_itemId\b/g, to: "codigoDepositoGeneral_equipoId" },
  { from: /\bmovimientoId_itemId\b/g, to: "movimientoId_equipoId" },
  { from: /\bstockOperacionId_itemId\b/g, to: "stockOperacionId_equipoId" },
  { from: /\btargetItemId\b/g, to: "targetEquipoId" },
  { from: /\bsourceItem\b/g, to: "sourceEquipo" },
  { from: /\btargetItem\b/g, to: "targetEquipo" },
  { from: /\bapplyItemOrder\b/g, to: "applyEquipoOrder" },
  { from: /\bgetOrderedItemIds\b/g, to: "getOrderedEquipoIds" },
  { from: /\binsertItemAtOrder\b/g, to: "insertEquipoAtOrder" },
  { from: /\bItemOrdering\b/g, to: "EquipoOrdering" },
  { from: /\bcajaItems\b/g, to: "cajaEquipos" },
  { from: /\bcajaItem\b/g, to: "cajaEquipo" },
  { from: /\bitem-trace\b/g, to: "equipo-trace" },
  { from: /\bItemTrace\b/g, to: "EquipoTrace" },
  { from: /ItemTraceData/g, to: "EquipoTraceData" },
  { from: /itemTrace/g, to: "equipoTrace" },
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

console.log(`Updated ${changedCount} files in pass 2`);
