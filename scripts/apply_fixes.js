const fs = require("fs");
const path = require("path");

const walk = (dir, callback) => {
  if (
    dir.includes("node_modules") ||
    dir.includes(".next") ||
    dir.includes(".git") ||
    dir.includes("generated")
  )
    return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith(".ts") || filepath.endsWith(".tsx")) {
      callback(filepath);
    }
  }
};

walk(path.join(__dirname, "../src"), (filepath) => {
  let text = fs.readFileSync(filepath, "utf8");
  let original = text;

  // 1. Prisma nested selects
  text = text.replace(
    /subalterno:\s*\{\s*select:\s*\{\s*bateria:\s*\{\s*select:\s*\{\s*nombre:\s*true\s*\}\s*\}\s*\}\s*\},?/g,
    "bateria: { select: { nombre: true } },"
  );
  text = text.replace(
    /subalterno:\s*\{\s*select:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g,
    "bateria: true,"
  );
  text = text.replace(
    /subalterno:\s*\{\s*include:\s*\{\s*bateria:\s*true\s*\}\s*\},?/g,
    "bateria: true,"
  );
  text = text.replace(/subalterno:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");
  text = text.replace(/oficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");
  text = text.replace(/suboficial:\s*\{\s*select:\s*\{[^}]*\}\s*\},?/g, "");

  // 2. tx.subalterno.deleteMany / create / upsert (handles multi-line)
  text = text.replace(/await\s+tx\.subalterno\.deleteMany\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.oficial\.deleteMany\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.suboficial\.deleteMany\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.subalterno\.create\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.oficial\.create\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.suboficial\.create\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.subalterno\.upsert\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.oficial\.upsert\(\{[^)]*\}\);?/g, "");
  text = text.replace(/await\s+tx\.suboficial\.upsert\(\{[^)]*\}\);?/g, "");

  // 3. Property tipo missing in create
  // Find `tx.personal.create({ data: { ` or `tx.personal.update({ data: { `
  // If we find `bateriaId: `, it implies SUBALTERNO, otherwise OFICIAL/SUBOFICIAL. But we can just inject `tipo: TipoPersonal.SUBALTERNO` if we find `tx.personal.create` and it's missing `tipo`.
  // Wait, in most cases, `tipo` should be derived from `rango.tipo`. Since it's a create, they should supply `tipo`.
  text = text.replace(
    /(tx\.personal\.create\(\{\s*data:\s*\{[^}]*)(rangoId:)/g,
    "$1tipo: TipoPersonal.SUBALTERNO, $2"
  );

  if (text !== original) {
    fs.writeFileSync(filepath, text);
    console.log("Updated", filepath);
  }
});
