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

const ALLOWED_DIACRITIC_STRIP_FILES = new Set(["src/lib/spanish-text.ts"]);

const NFD_NORMALIZE_RE = /normalize\(\s*["']NFD["']\s*\)/;
const DIACRITICS_CLASS_RE = /\\u0300-\\u036f/;
const TRANSLITERATION_PAIR_RE =
  /["'`](á|é|í|ó|ú|Á|É|Í|Ó|Ú|ñ|Ñ)["'`]\s*:\s*["'`](a|e|i|o|u|A|E|I|O|U|n|N)["'`]/;

const COMMON_SPANISH_ASCII_MISTAKES = [
  { wrong: /\bcontrasena\b/gi, correct: "contraseña" },
  { wrong: /\bcontrasenas\b/gi, correct: "contraseñas" },
  { wrong: /\bcontrasenia\b/gi, correct: "contraseña" },
  { wrong: /\bcontrasenias\b/gi, correct: "contraseñas" },
  { wrong: /\bcontrasenna\b/gi, correct: "contraseña" },
  { wrong: /\bcontrasennas\b/gi, correct: "contraseñas" },
  { wrong: /\bdevolucion\b/gi, correct: "devolución" },
  { wrong: /\bsesion\b/gi, correct: "sesión" },
  { wrong: /\baccion\b/gi, correct: "acción" },
  { wrong: /\bconfiguracion\b/gi, correct: "configuración" },
  { wrong: /\bimpresion\b/gi, correct: "impresión" },
  { wrong: /\binformacion\b/gi, correct: "información" },
  { wrong: /\bobservacion\b/gi, correct: "observación" },
  { wrong: /\benvio\b/gi, correct: "envío" },
  { wrong: /\benvios\b/gi, correct: "envíos" },
  { wrong: /\bprestamo\b/gi, correct: "préstamo" },
  { wrong: /\bprestamos\b/gi, correct: "préstamos" },
  { wrong: /\bespanol\b/gi, correct: "español" },
  { wrong: /\bespanola\b/gi, correct: "española" },
  { wrong: /\bespanoles\b/gi, correct: "españoles" },
  { wrong: /\bespanolas\b/gi, correct: "españolas" },
];

const TYPO_SCAN_SKIP_DIRECTORIES = ["src/generated/", "prisma/"];

const SOURCE_CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const STRING_LITERAL_RE = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/gs;

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

// Solo corregir strings literales y comentarios, nunca identificadores ni claves de objetos
function buildSpellingSegments(filePath, text) {
  const ext = path.extname(filePath).toLowerCase();
  if (!SOURCE_CODE_EXTENSIONS.has(ext)) {
    return [{ content: text, index: 0, type: "text" }];
  }

  const segments = [];
  // Strings literales
  for (const match of text.matchAll(STRING_LITERAL_RE)) {
    const literal = match[0];
    const index = match.index ?? 0;
    if (literal.length < 3) continue;
    // Si es template string, eliminar ${...}
    if (literal[0] === "`") {
      // Eliminar todo lo que esté dentro de ${...}
      let filtered = "";
      let depth = 0;
      for (let i = 1; i < literal.length - 1; i++) {
        if (literal[i] === "$" && literal[i + 1] === "{") {
          depth++;
          i++;
          continue;
        }
        if (literal[i] === "}" && depth > 0) {
          depth--;
          continue;
        }
        if (depth === 0) filtered += literal[i];
      }
      if (filtered.trim().length > 0) {
        segments.push({ content: filtered, index: index + 1, type: "string-template" });
      }
    } else {
      segments.push({ content: literal.slice(1, -1), index: index + 1, type: "string" });
    }
  }
  // Comentarios (solo para .ts, .tsx, .js, .jsx, .mjs, .cjs)
  const COMMENT_RE = /\/\/.*|\/\*[\s\S]*?\*\//g;
  for (const match of text.matchAll(COMMENT_RE)) {
    const comment = match[0];
    const index = match.index ?? 0;
    if (comment.length < 3) continue;
    segments.push({ content: comment, index, type: "comment" });
  }
  return segments;
}

function matchCasing(original, replacement) {
  if (original.toUpperCase() === original) return replacement.toUpperCase();
  if (original[0].toUpperCase() === original[0] && original.slice(1).toLowerCase() === original.slice(1))
    return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

const args = process.argv.slice(2);
const DO_FIX = args.includes("--fix");

function collectCommonSpanishTypos(filePath, text, findings, fixEdits) {
  if (TYPO_SCAN_SKIP_DIRECTORIES.some((prefix) => filePath.startsWith(prefix))) {
    return;
  }

  const segments = buildSpellingSegments(filePath, text);
  for (const segment of segments) {
    const segmentText = segment.content;
    const trimmedSegmentText = segmentText.trim();
    const hasNaturalLanguageShape =
      /\s/.test(trimmedSegmentText) ||
      /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(trimmedSegmentText);
    const looksTechnicalToken =
      /[\/_-]/.test(trimmedSegmentText) ||
      /^[A-Z0-9_]+$/.test(trimmedSegmentText);

    if (!hasNaturalLanguageShape || looksTechnicalToken) {
      continue;
    }

    for (const typo of COMMON_SPANISH_ASCII_MISTAKES) {
      for (const match of segmentText.matchAll(typo.wrong)) {
        const typoIndex = (match.index ?? 0) + segment.index;
        const found = match[0];
        findings.push(
          `[SPANISH] ${filePath}:${lineNumberAt(text, typoIndex)} posible typo habitual "${found}"; sugerido: "${typo.correct}"`,
        );
        if (DO_FIX) {
          fixEdits.push({
            start: typoIndex,
            end: typoIndex + found.length,
            replacement: matchCasing(found, typo.correct),
          });
        }
      }
    }
  }
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

  const fixEdits = [];

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

  collectCommonSpanishTypos(filePath, text, findings, fixEdits);

  if (DO_FIX && fixEdits.length > 0) {
    // Aplicar los reemplazos de atrás hacia adelante para no desplazar índices
    fixEdits.sort((a, b) => b.start - a.start);
    let fixed = text;
    for (const edit of fixEdits) {
      fixed = fixed.slice(0, edit.start) + edit.replacement + fixed.slice(edit.end);
    }
    writeFileSync(filePath, fixed);
    console.log(`[FIXED] ${filePath}: ${fixEdits.length} correcciones aplicadas.`);
  }
}

if (findings.length > 0) {
  console.log("Se detectaron riesgos de pérdida de caracteres en español:");
  for (const finding of findings) {
    console.log(`- ${finding}`);
  }
  console.log(`Resumen: ${findings.length} problema(s) detectado(s).`);
  if (!DO_FIX) process.exit(1);
}

if (!findings.length) {
  console.log("OK: no se detectaron riesgos de eliminación de tildes/Ñ fuera de los módulos permitidos.");
}
