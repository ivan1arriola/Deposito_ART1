import { Project, SyntaxKind } from "ts-morph";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

console.log("Adding source files...");
project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.ts"));
project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.tsx"));
console.log("Source files added.");

let changedFiles = new Set<string>();

const files = project.getSourceFiles();

// Replace `subalterno: ...` in `select` and `include` objects.
for (const file of files) {
  let changed = false;

  file.forEachDescendant(node => {
    // Remove `tx.deleteMany`, `create`, `upsert`
    if (node.isKind(SyntaxKind.ExpressionStatement)) {
      const text = node.getText();
      if (text.includes("tx.deleteMany") || text.includes("tx.deleteMany") || text.includes("tx.deleteMany") ||
          text.includes("tx.create") || text.includes("tx.create") || text.includes("tx.create") ||
          text.includes("tx.upsert") || text.includes("tx.upsert") || text.includes("tx.upsert") ||
          text.includes("tx.update") || text.includes("tx.update") || text.includes("tx.update")) {
        node.remove();
        changed = true;
      }
    }

    if (node.isKind(SyntaxKind.PropertyAssignment)) {
      const name = node.getName();
      if (name === "subalterno" || name === "oficial" || name === "suboficial") {
        const initializer = node.getInitializer();
        if (initializer && (initializer.isKind(SyntaxKind.ObjectLiteralExpression) || initializer.isKind(SyntaxKind.TrueKeyword) || initializer.isKind(SyntaxKind.FalseKeyword))) {
           // We might need to keep bateria if it's nested, but since bateria is now flat on personal, we can just drop subalterno, except if we are inside a select that needs bateria!
           // If it's ``, we should add `bateria: ...` to the parent object.
           const parent = node.getParent();
           if (parent.isKind(SyntaxKind.ObjectLiteralExpression)) {
             if (initializer.isKind(SyntaxKind.ObjectLiteralExpression)) {
               const text = initializer.getText();
               if (text.includes("bateria")) {
                  parent.addPropertyAssignment({ name: "bateria", initializer: "true" });
               }
             }
             node.remove();
             changed = true;
           }
        }
      }
    }

    if (node.isKind(SyntaxKind.PropertyAccessExpression)) {
      const name = node.getName();
      if (name === "subalterno" || name === "oficial" || name === "suboficial") {
        // e.g. p.bateria -> p.bateria
        // We will just replace `p.subalterno` with `p`
        const expr = node.getExpression();
        node.replaceWithText(expr.getText());
        changed = true;
      }
    }
  });

  // Second pass for PersonalUncheckedCreateInput missing `tipo`
  file.forEachDescendant(node => {
     if (node.isKind(SyntaxKind.CallExpression)) {
        const expr = node.getExpression();
        if (expr.getText().endsWith(".create") || expr.getText().endsWith(".upsert")) {
          // just a heuristic for prisma create
        }
     }
  });

  if (changed) {
    console.log("Modified", file.getFilePath());
    file.saveSync();
  }
}
console.log("Done");
