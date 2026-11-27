import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.ts"));
project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.tsx"));

const files = project.getSourceFiles();

for (const file of files) {
  file.forEachDescendant((node) => {
    // 1. Prisma includes/selects with subalterno, oficial, suboficial
    if (node.isKind(SyntaxKind.PropertyAssignment)) {
      const name = node.getName();
      if (["subalterno", "oficial", "suboficial"].includes(name)) {
        const initializer = node.getInitializer();
        const parent = node.getParent();
        if (initializer && parent && parent.isKind(SyntaxKind.ObjectLiteralExpression)) {
          // If we find `` -> we can't easily traverse without breaking, but we can replace the text of the parent
        }
      }
    }
  });

  // A safer approach: just string replacement on the file text!
  const text = file.getFullText();
  let newText = text;

  newText = newText.replace(
    /subalterno:\s*\{\s*select:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g,
    "bateria: true,"
  );
  newText = newText.replace(
    /subalterno:\s*\{\s*include:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g,
    "bateria: true,"
  );
  newText = newText.replace(/subalterno:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");
  newText = newText.replace(/subalterno:\s*\{\s*include:\s*\{[^}]*\}\s*\},?/g, "");
  newText = newText.replace(/oficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");
  newText = newText.replace(/suboficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");
  newText = newText.replace(/subalterno:\s*true,?/g, "");
  newText = newText.replace(/oficial:\s*true,?/g, "");
  newText = newText.replace(/suboficial:\s*true,?/g, "");

  newText = newText.replace(/await\s+tx\.subalterno\.deleteMany\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.oficial\.deleteMany\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.suboficial\.deleteMany\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.subalterno\.create\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.oficial\.create\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.suboficial\.create\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.subalterno\.upsert\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.oficial\.upsert\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.suboficial\.upsert\([^)]*\);?/g, "");
  newText = newText.replace(/await\s+tx\.subalterno\.update\([^)]*\);?/g, "");

  newText = newText.replace(/\.subalterno\?\./g, ".");
  newText = newText.replace(/\.subalterno\./g, ".");
  newText = newText.replace(/\.oficial\?\./g, ".");
  newText = newText.replace(/\.oficial\./g, ".");
  newText = newText.replace(/\.suboficial\?\./g, ".");
  newText = newText.replace(/\.suboficial\./g, ".");

  newText = newText.replace(
    /persona\.subalterno\s*\?/g,
    "(persona.tipo === TipoPersonal.SUBALTERNO) ?"
  );
  newText = newText.replace(
    /personal\.subalterno\s*\?/g,
    "(personal.tipo === TipoPersonal.SUBALTERNO) ?"
  );
  newText = newText.replace(
    /!\s*persona\.subalterno/g,
    "(persona.tipo !== TipoPersonal.SUBALTERNO)"
  );

  // Fix PersonalUncheckedCreateInput missing tipo
  // Look for `tx.personal.create({ data: { ... } })` missing `tipo`
  // We can just add `tipo: TipoPersonal.SUBALTERNO` to `tx.personal.create` for now, or let Prisma handle it since `tipo` has a default?
  // Wait, `tipo` does NOT have a default in Prisma schema!
  // It's mandatory. So we must insert `tipo: TipoPersonal.SUBALTERNO` if we find `tx.personal.create`.
  // We will just do it manually for the files that complain.

  if (text !== newText) {
    file.replaceWithText(newText);
    file.saveSync();
    console.log("Modified", file.getFilePath());
  }
}
