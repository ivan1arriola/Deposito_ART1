#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_TARGETS = ["src", "lib", "scripts"];
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "out", "build", "dist"]);
const IGNORE_FILE_PATTERNS = [/\.d\.ts$/i, /\.test\./i, /\.spec\./i];

function parseArgs(argv) {
  const options = {
    targets: DEFAULT_TARGETS,
    top: 20,
    format: "table",
    out: null,
    failOnHighRisk: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--targets") {
      const value = argv[i + 1] ?? "";
      options.targets = value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    if (arg === "--top") {
      const value = Number(argv[i + 1]);
      if (Number.isFinite(value) && value > 0) {
        options.top = Math.floor(value);
      }
      i += 1;
      continue;
    }

    if (arg === "--format") {
      const value = (argv[i + 1] ?? "table").toLowerCase();
      options.format = value === "json" ? "json" : "table";
      i += 1;
      continue;
    }

    if (arg === "--out") {
      options.out = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--fail-on-high-risk") {
      options.failOnHighRisk = true;
    }
  }

  return options;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(targetPath, rootDir, files = []) {
  const absoluteTarget = path.resolve(rootDir, targetPath);
  if (!(await pathExists(absoluteTarget))) {
    return files;
  }

  const entries = await fs.readdir(absoluteTarget, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(absoluteTarget, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await collectFiles(relativePath, rootDir, files);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!CODE_EXTENSIONS.has(extension)) {
      continue;
    }

    if (IGNORE_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function extractFunctions(text) {
  const lines = text.split(/\r?\n/);
  const functions = [];

  const patterns = [
    /\bfunction\s+([A-Za-z0-9_$]+)/,
    /\bconst\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /\blet\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /\b([A-Za-z0-9_$]+)\s*:\s*(?:async\s*)?\([^)]*\)\s*=>/,
    /\b([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/,
  ];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match?.[1]) {
        functions.push({ name: match[1], line: i + 1 });
        break;
      }
    }
  }

  return functions;
}

function computeMetrics(filePath, text) {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((line) => line.trimEnd());

  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
  const commentLines = lines.filter((line) => line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*"));
  const loc = nonEmptyLines.length;

  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const todoCount = (text.match(/\b(TODO|FIXME|HACK|REFACTOR)\b/gi) ?? []).length;
  const anyCount = (text.match(/\bany\b/g) ?? []).length;
  const consoleCount = (text.match(/\bconsole\.(log|warn|error|info|debug)\b/g) ?? []).length;

  const importMatches = text.match(/^import\s.+from\s+['"].+['"];?/gm) ?? [];
  const internalImports = importMatches.filter((line) => /from\s+['"](\.|@\/)/.test(line)).length;

  const branchPoints = (text.match(/\b(if|else\s+if|for|while|switch|case|catch)\b/g) ?? []).length;
  const ternaryPoints = (text.match(/\?/g) ?? []).length;
  const complexityEstimate = 1 + branchPoints + Math.floor(ternaryPoints / 2);

  let depth = 0;
  let maxDepth = 0;
  for (const char of text) {
    if (char === "{") {
      depth += 1;
      if (depth > maxDepth) {
        maxDepth = depth;
      }
    } else if (char === "}") {
      depth = Math.max(0, depth - 1);
    }
  }

  const normalizedLines = nonEmptyLines
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 12 && !line.startsWith("import ") && !line.startsWith("export "));
  const frequencies = new Map();
  for (const line of normalizedLines) {
    frequencies.set(line, (frequencies.get(line) ?? 0) + 1);
  }

  let duplicatedLines = 0;
  for (const count of frequencies.values()) {
    if (count > 1) {
      duplicatedLines += count;
    }
  }

  const duplicationRatio = normalizedLines.length === 0 ? 0 : duplicatedLines / normalizedLines.length;

  const functionList = extractFunctions(text);

  const risk = calculateRiskScore({
    loc,
    complexityEstimate,
    maxDepth,
    duplicationRatio,
    anyCount,
    todoCount,
    consoleCount,
    internalImports,
    maxLineLength,
    commentRatio: nonEmptyLines.length === 0 ? 0 : commentLines.length / nonEmptyLines.length,
  });

  return {
    filePath,
    loc,
    functionCount: functionList.length,
    complexityEstimate,
    maxDepth,
    duplicationRatio: Number(duplicationRatio.toFixed(3)),
    todoCount,
    anyCount,
    consoleCount,
    internalImports,
    maxLineLength,
    riskScore: risk.score,
    riskLevel: risk.level,
    suggestions: risk.suggestions,
    topFunctions: functionList.slice(0, 8),
  };
}

function calculateRiskScore(metrics) {
  let score = 0;
  const suggestions = [];

  if (metrics.loc > 300) {
    score += Math.min(26, Math.ceil((metrics.loc - 300) / 15));
    suggestions.push("Dividir archivo grande en modulos orientados por responsabilidad.");
  }

  if (metrics.complexityEstimate > 28) {
    score += Math.min(22, Math.ceil((metrics.complexityEstimate - 28) / 2));
    suggestions.push("Reducir ramas condicionales y extraer logica compleja a funciones puras.");
  }

  if (metrics.maxDepth >= 6) {
    score += Math.min(12, (metrics.maxDepth - 5) * 2);
    suggestions.push("Reducir anidamiento con guard clauses y retornos tempranos.");
  }

  if (metrics.duplicationRatio > 0.15) {
    score += Math.min(14, Math.ceil((metrics.duplicationRatio - 0.15) * 60));
    suggestions.push("Extraer codigo repetido a utilidades compartidas.");
  }

  if (metrics.anyCount > 0) {
    score += Math.min(10, metrics.anyCount);
    suggestions.push("Reemplazar any por tipos explicitos para evitar deuda de tipado.");
  }

  if (metrics.todoCount > 0) {
    score += Math.min(8, metrics.todoCount * 2);
    suggestions.push("Resolver TODO/FIXME pendientes o crear tickets formales.");
  }

  if (metrics.maxLineLength > 150) {
    score += 4;
    suggestions.push("Acortar lineas extensas para mejorar legibilidad y mantenibilidad.");
  }

  if (metrics.internalImports > 18) {
    score += Math.min(8, Math.ceil((metrics.internalImports - 18) / 3));
    suggestions.push("Revisar acoplamiento: demasiadas dependencias internas en un mismo archivo.");
  }

  const bounded = Math.min(100, Math.max(0, score));

  let level = "BAJO";
  if (bounded >= 65) {
    level = "CRITICO";
  } else if (bounded >= 45) {
    level = "ALTO";
  } else if (bounded >= 25) {
    level = "MEDIO";
  }

  return {
    score: bounded,
    level,
    suggestions: Array.from(new Set(suggestions)).slice(0, 4),
  };
}

function summarize(metricsList) {
  const totalFiles = metricsList.length;
  const totalLoc = metricsList.reduce((acc, item) => acc + item.loc, 0);
  const averageRisk =
    totalFiles === 0
      ? 0
      : Number(
          (metricsList.reduce((acc, item) => acc + item.riskScore, 0) / totalFiles).toFixed(1),
        );

  const byLevel = metricsList.reduce(
    (acc, item) => {
      acc[item.riskLevel] = (acc[item.riskLevel] ?? 0) + 1;
      return acc;
    },
    { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 },
  );

  return {
    totalFiles,
    totalLoc,
    averageRisk,
    byLevel,
  };
}

function formatTable(summary, hotspots, top) {
  const lines = [];
  lines.push("=== Refactor Readiness Report ===");
  lines.push(`Archivos analizados: ${summary.totalFiles}`);
  lines.push(`LOC total: ${summary.totalLoc}`);
  lines.push(`Riesgo promedio: ${summary.averageRisk}/100`);
  lines.push(
    `Distribucion: BAJO=${summary.byLevel.BAJO}, MEDIO=${summary.byLevel.MEDIO}, ALTO=${summary.byLevel.ALTO}, CRITICO=${summary.byLevel.CRITICO}`,
  );
  lines.push("");
  lines.push(`Top ${Math.min(top, hotspots.length)} hotspots:`);
  lines.push("score | nivel    | loc  | compl | depth | dup   | archivo");
  lines.push("------|----------|------|-------|-------|-------|--------");

  for (const item of hotspots.slice(0, top)) {
    const row = [
      String(item.riskScore).padStart(5),
      item.riskLevel.padEnd(8),
      String(item.loc).padStart(4),
      String(item.complexityEstimate).padStart(5),
      String(item.maxDepth).padStart(5),
      item.duplicationRatio.toFixed(3).padStart(5),
      item.filePath,
    ];
    lines.push(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]}`);
  }

  lines.push("");
  lines.push("Sugerencias para hotspots:");
  for (const item of hotspots.slice(0, Math.min(top, 10))) {
    const suggestion = item.suggestions[0] ?? "Sin sugerencias automáticas.";
    lines.push(`- ${item.filePath}: ${suggestion}`);
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();

  const allFiles = [];
  for (const target of options.targets) {
    await collectFiles(target, rootDir, allFiles);
  }

  const uniqueFiles = Array.from(new Set(allFiles)).sort();
  const metrics = [];

  for (const filePath of uniqueFiles) {
    const absolutePath = path.resolve(rootDir, filePath);
    const content = await fs.readFile(absolutePath, "utf8");
    metrics.push(computeMetrics(filePath, content));
  }

  metrics.sort((a, b) => b.riskScore - a.riskScore || b.loc - a.loc || a.filePath.localeCompare(b.filePath));
  const summary = summarize(metrics);

  const report = {
    generatedAt: new Date().toISOString(),
    options,
    summary,
    hotspots: metrics,
  };

  let output;
  if (options.format === "json") {
    output = `${JSON.stringify(report, null, 2)}\n`;
  } else {
    output = formatTable(summary, metrics, options.top);
  }

  if (options.out) {
    const outputPath = path.resolve(rootDir, options.out);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output, "utf8");
    console.log(`Reporte generado en: ${path.relative(rootDir, outputPath).replace(/\\/g, "/")}`);
  } else {
    process.stdout.write(output);
  }

  const highRiskCount = metrics.filter((item) => item.riskLevel === "ALTO" || item.riskLevel === "CRITICO").length;
  process.exitCode = options.failOnHighRisk && highRiskCount > 0 ? 2 : 0;
}

main().catch((error) => {
  console.error("No se pudo generar el reporte de refactorizacion.");
  console.error(error);
  process.exit(1);
});
