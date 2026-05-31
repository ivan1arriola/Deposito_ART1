import { Project, SyntaxKind, PropertyAssignment } from "ts-morph";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.ts"));
project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.tsx"));

const files = project.getSourceFiles();

for (const file of files) {
  let changed = false;

  // Add `bateria: true` inside `include` or `select` blocks of Prisma queries where personal is being fetched
  // A heuristic: if it has `rango: true` or `rango: { ... }`, add `bateria: true` next to it.
  
  file.forEachDescendant(node => {
      if (node.isKind(SyntaxKind.PropertyAssignment)) {
          if (node.getName() === "rango") {
              const parent = node.getParentIfKind(SyntaxKind.ObjectLiteralExpression);
              if (parent) {
                  // check if bateria exists
                  if (!parent.getProperty("bateria") && !parent.getProperty("bateriaId")) {
                      parent.addPropertyAssignment({ name: "bateria", initializer: "true" });
                      changed = true;
                  }
              }
          }
      }
      // Same for PersonalUncheckedCreateInput missing `tipo`
      if (node.isKind(SyntaxKind.CallExpression)) {
          const exprText = node.getExpression().getText();
          if (exprText.endsWith("tx.personal.create") || exprText.endsWith("prisma.personal.create")) {
              const args = node.getArguments();
              if (args.length > 0 && args[0].isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const dataProp = args[0].getProperty("data");
                  if (dataProp && dataProp.isKind(SyntaxKind.PropertyAssignment)) {
                      const dataInit = dataProp.getInitializer();
                      if (dataInit && dataInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
                          if (!dataInit.getProperty("tipo")) {
                              // By default, just set to SUBALTERNO or based on context
                              let tipoVal = "TipoPersonal.SUBALTERNO";
                              if (file.getFilePath().includes("oficiales-suboficiales")) {
                                  // This is a bit tricky, oficiales-suboficiales creates Oficial and Suboficial
                                  tipoVal = "personal.tipo"; // they have personal.tipo in scope usually, or we can see what it was
                              }
                              dataInit.addPropertyAssignment({ name: "tipo", initializer: tipoVal });
                              changed = true;
                          }
                      }
                  }
              }
          }
      }
  });

  if (changed) {
      file.saveSync();
      console.log("Added bateria/tipo to", file.getFilePath());
  }
}
