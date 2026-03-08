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
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  );
}

const findings = [];

for (const filePath of listTrackedFiles()) {
  if (shouldSkipFile(filePath)) {
    continue;
  }

  const content = readFileSync(filePath);

  if (hasUtf8Bom(content)) {
    findings.push(`[BOM] ${filePath}`);
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

  if (hasReplacementChar || tokenHits.length > 0) {
    const details = [];
    if (hasReplacementChar) {
      details.push("contiene caracter de reemplazo U+FFFD");
    }
    if (tokenHits.length > 0) {
      details.push(`tokens sospechosos: ${tokenHits.slice(0, 5).join(", ")}`);
    }
    findings.push(`[MOJIBAKE] ${filePath} (${details.join("; ")})`);
  }
}

if (findings.length > 0) {
  console.error("Se detectaron problemas de codificacion UTF-8:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("OK: no se encontro BOM ni mojibake en archivos de texto.");
