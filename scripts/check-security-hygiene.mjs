import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["src", "tests"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const RULES = [
  {
    id: "no-ts-ignore",
    pattern: /@ts-ignore\b|@ts-nocheck\b/,
    message: "Prohibido usar @ts-ignore o @ts-nocheck.",
  },
  {
    id: "no-eval",
    pattern: /\b(?:eval|Function)\s*\(/,
    message: "Prohibido usar eval() o new Function().",
  },
  {
    id: "no-dangerously-set-inner-html",
    pattern: /dangerouslySetInnerHTML/,
    validate: (_line, lines, index) => {
      const windowText = lines.slice(Math.max(0, index - 2), index + 1).join(" ");
      return !(windowText.includes("<style") && windowText.includes("data-emotion="));
    },
    message: "Prohibido usar dangerouslySetInnerHTML sin sanitización auditada.",
  },
  {
    id: "no-hardcoded-private-key",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----/,
    message: "Posible clave privada embebida en código fuente.",
  },
  {
    id: "no-unjustified-eslint-disable",
    pattern: /eslint-disable(?:-next-line|-line)?(?:\s+[\w/@-]+)*\s*(?:\*\/|$)/,
    validate: (line) => !line.includes("-- "),
    message: "eslint-disable requiere justificación técnica con '-- motivo'.",
  },
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        full.includes(`src${path.sep}generated`)
      ) {
        continue;
      }
      files.push(...walk(full));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];
for (const dir of TARGET_DIRS) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) continue;
  for (const file of walk(absDir)) {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line) && (!rule.validate || rule.validate(line, lines, index))) {
          violations.push(`${rel}:${index + 1} [${rule.id}] ${rule.message}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error("Fallas de higiene y seguridad detectadas:");
  for (const v of violations) {
    console.error(`- ${v}`);
  }
  process.exit(1);
}

console.log("OK: higiene y seguridad sin violaciones.");
