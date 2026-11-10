import { Project } from "ts-morph";
import * as path from "path";

const project = new Project({
  tsConfigFilePath: path.join(__dirname, "../tsconfig.json"),
});

project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.ts"));
project.addSourceFilesAtPaths(path.join(__dirname, "../src/**/*.tsx"));

const files = project.getSourceFiles();

for (const file of files) {
  let text = file.getFullText();
  const original = text;
  
  // Fix types where subalterno is defined
  text = text.replace(/subalterno:\s*\{\s*bateria:\s*\{\s*nombre:\s*string;?\s*\}\s*\|\s*null;?\s*\}\s*\|\s*null;?/g, "bateria: { nombre: string } | null;");
  text = text.replace(/subalterno\?:\s*\{\s*bateria:\s*\{\s*nombre:\s*string;?\s*\}\s*\|\s*null;?\s*\}\s*\|\s*null\s*\|\s*undefined;?/g, "bateria?: { nombre: string } | null;");
  text = text.replace(/subalterno:\s*\{\s*bateria:\s*\{\s*nombre:\s*string;?\s*\}\s*\|\s*null;?\s*\};?/g, "bateria: { nombre: string } | null;");
  text = text.replace(/subalterno:\s*\{\s*bateria:\s*\{\s*nombre:\s*string;?\s*\}\s*\} \| null;?/g, "bateria: { nombre: string } | null;");

  // Replace usage inside the function body
  text = text.replace(/\.subalterno\?\.bateria\?\.nombre/g, ".bateria?.nombre");
  text = text.replace(/\.subalterno\?\.bateria/g, ".bateria");
  
  if (text !== original) {
    file.replaceWithText(text);
    file.saveSync();
    console.log("Updated", file.getFilePath());
  }
}
