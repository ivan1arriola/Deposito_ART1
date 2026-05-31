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
  { from: /\bequipoCodigoSieId\b/g, to: "equipoCodigoSIEId" },
  { from: /\bitems:\b/g, to: "equipos:" },
  { from: /\.items\b/g, to: ".equipos" },
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

console.log(`Updated ${changedCount} files in pass 3`);
