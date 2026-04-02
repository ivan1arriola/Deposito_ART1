#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

const ALLOWED_DIACRITIC_STRIP_FILES = new Set(["src/lib/spanish-text.ts"]);

const NFD_NORMALIZE_RE = /normalize\(\s*["']NFD["']\s*\)/;
const DIACRITICS_CLASS_RE = /\\u0300-\\u036f/;
const TRANSLITERATION_PAIR_RE =
  /["'`](á|é|í|ó|ú|Á|É|Í|Ó|Ú|ñ|Ñ)["'`]\s*:\s*["'`](a|e|i|o|u|A|E|I|O|U|n|N)["'`]/;

function shouldSkipFile(filePath) {
  if (SKIP_DIRECTORIES.some((prefix) => filePath.startsWith(prefix))) {
    return true;
  }
  return SKIP_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function isLikelyBinary(buffer) {
  if (buffer.length === 0) return false;
  const sampleSize = Math.min(buffer.length, 8000);
  let suspicious = 0;

  for (let i = 0; i < sampleSize; i += 1) {
    const byte = buffer[i];
    if (byte === 0x00) return true;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) suspicious += 1;
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

function lineNumberAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text[i] === "\n") line += 1;
  }
  return line;
}

const findings = [];

for (const filePath of listTrackedFiles()) {
  if (shouldSkipFile(filePath)) continue;

  let content;
  try {
    content = readFileSync(filePath);
  } catch {
    continue;
  }
  if (isLikelyBinary(content)) continue;

  let text;
  try {
    text = decoder.decode(content);
  } catch {
    continue;
  }

  if (!ALLOWED_DIACRITIC_STRIP_FILES.has(filePath)) {
    const nfdMatch = text.match(NFD_NORMALIZE_RE);
    if (nfdMatch && nfdMatch.index !== undefined) {
      findings.push(
        `[SPANISH] ${filePath}:${lineNumberAt(text, nfdMatch.index)} usa normalize(\"NFD\") fuera del módulo permitido`,
      );
    }

    const diacriticsMatch = text.match(DIACRITICS_CLASS_RE);
    if (diacriticsMatch && diacriticsMatch.index !== undefined) {
      findings.push(
        `[SPANISH] ${filePath}:${lineNumberAt(text, diacriticsMatch.index)} usa clase de diacríticos fuera del módulo permitido`,
      );
    }
  }

  const transliterationMatch = text.match(TRANSLITERATION_PAIR_RE);
  if (transliterationMatch && transliterationMatch.index !== undefined) {
    findings.push(
      `[SPANISH] ${filePath}:${lineNumberAt(text, transliterationMatch.index)} contiene transliteración manual acento->ASCII`,
    );
  }
}

if (findings.length > 0) {
  console.error("Se detectaron riesgos de pérdida de caracteres en español:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  console.error(`Resumen: ${findings.length} problema(s) detectado(s).`);
  process.exit(1);
}

console.log("OK: no se detectaron riesgos de eliminación de tildes/Ñ fuera de los módulos permitidos.");
