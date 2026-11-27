#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const decoder = new TextDecoder("utf-8", { fatal: true });

const SKIP_DIRECTORIES = [".git/", ".next/", ".vercel/", "node_modules/"];
const SKIP_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".cer",
  ".crt",
  ".der",
  ".dll",
  ".eot",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".pem",
  ".png",
  ".p12",
  ".so",
  ".svgz",
  ".ttf",
  ".wasm",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".zip",
]);

const COMMON_MOJIBAKE_TOKENS = [
  "Ã¡",
  "Ã©",
  "Ã­",
  "Ã³",
  "Ãº",
  "Ã±",
  "Ã",
  "Ã‰",
  "Ã",
  "Ã“",
  "Ãš",
  "Ã‘",
  "Â¿",
  "Â¡",
  "â€œ",
  "â€",
  "â€™",
  "â€“",
  "â€”",
];

const ESCAPED_LATIN1_RE = /\\u00(?:e1|e9|ed|f3|fa|f1|c1|c9|cd|d3|da|d1|bf|a1)/gi;
const argv = new Set(process.argv.slice(2));
const fixBom = argv.has("--fix-bom");

if (argv.has("--help") || argv.has("-h")) {
  console.log("Uso: node scripts/check-utf8.mjs [--fix-bom]");
  console.log("  --fix-bom   Elimina BOM UTF-8 de archivos de texto rastreados por git.");
  process.exit(0);
}

function shouldSkipFile(filePath) {
  if (SKIP_DIRECTORIES.some((prefix) => filePath.startsWith(prefix))) {
    return true;
  }

  const extension = path.extname(filePath).toLowerCase();
  return SKIP_EXTENSIONS.has(extension);
}

function isLikelyBinary(buffer) {
  if (buffer.length === 0) {
    return false;
  }

  const sampleSize = Math.min(buffer.length, 8000);
  let suspicious = 0;

  for (let i = 0; i < sampleSize; i += 1) {
    const byte = buffer[i];
    if (byte === 0x00) {
      return true;
    }

    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
      suspicious += 1;
    }
  }

  return suspicious / sampleSize > 0.3;
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { encoding: "buffer" });
  return output
    .toString("utf8")
    .split("\0")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function hasUtf8Bom(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
}

const findings = [];
const bomFiles = [];
let fixedBomCount = 0;

for (const filePath of listTrackedFiles()) {
  if (filePath === "scripts/check-utf8.mjs") {
    continue;
  }

  if (shouldSkipFile(filePath)) {
    continue;
  }

  let content;
  try {
    content = readFileSync(filePath);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
      continue;
    }
    throw error;
  }

  if (hasUtf8Bom(content)) {
    bomFiles.push(filePath);

    if (fixBom) {
      writeFileSync(filePath, content.slice(3));
      fixedBomCount += 1;
      content = readFileSync(filePath);
    }

    if (!fixBom) {
      findings.push(`[BOM] ${filePath}`);
    }
  }

  if (isLikelyBinary(content)) {
    continue;
  }

  let text;
  try {
    text = decoder.decode(content);
  } catch {
    findings.push(`[UTF8] ${filePath} (bytes invalidos para UTF-8)`);
    continue;
  }

  const tokenHits = COMMON_MOJIBAKE_TOKENS.filter((token) => text.includes(token));
  const hasReplacementChar = text.includes("\ufffd");
  const escapedLatin1Hits = Array.from(new Set(text.match(ESCAPED_LATIN1_RE) ?? []));

  if (hasReplacementChar || tokenHits.length > 0 || escapedLatin1Hits.length > 0) {
    const details = [];
    if (hasReplacementChar) {
      details.push("contiene caracter de reemplazo U+FFFD");
    }
    if (tokenHits.length > 0) {
      details.push(`tokens sospechosos: ${tokenHits.slice(0, 5).join(", ")}`);
    }
    if (escapedLatin1Hits.length > 0) {
      details.push(`escapes \\u00xx no permitidos: ${escapedLatin1Hits.slice(0, 5).join(", ")}`);
    }
    findings.push(`[MOJIBAKE] ${filePath} (${details.join("; ")})`);
  }
}

if (fixBom && fixedBomCount > 0) {
  console.log(`Se eliminaron ${fixedBomCount} archivo(s) con BOM UTF-8.`);
}

if (findings.length > 0) {
  console.log("Se detectaron problemas de codificacion UTF-8:");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }

  if (bomFiles.length > 0 && !fixBom) {
    console.log("Tip: ejecuta 'npm run check:encoding:fix' para remover BOM automaticamente.");
  }

  console.log(`Resumen: ${findings.length} problema(s) detectado(s).`);
  process.exit(1);
}

if (fixBom && fixedBomCount === 0) {
  console.log("No se encontraron archivos con BOM para corregir.");
}

console.log("OK: no se encontro BOM ni mojibake en archivos de texto.");
