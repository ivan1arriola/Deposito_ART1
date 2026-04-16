#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const DEFAULT_TARGETS = ["src", "lib", "scripts"];
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set(["node_modules", ".next", ".git", "out", "build", "dist", "coverage"]);
const IGNORE_FILE_PATTERNS = [/\.d\.ts$/i, /\.test\./i, /\.spec\./i, /\.stories\./i];
const IGNORE_PATH_PATTERNS = [
  /^src\/generated\/prisma\//i,
  /(^|\/)__generated__(\/|$)/i,
  /(^|\/)generated(\/|$)/i,
];

function parseArgs(argv) {
  const options = {
    targets: DEFAULT_TARGETS,
    top: 20,
    format: "table",
    out: null,
    markdownOut: null,
    failOnHighRisk: false,
    includeTests: false,
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

    if (arg === "--markdown-out") {
      options.markdownOut = argv[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--fail-on-high-risk") {
      options.failOnHighRisk = true;
      continue;
    }

    if (arg === "--include-tests") {
      options.includeTests = true;
      continue;
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

async function collectFiles(targetPath, rootDir, options, files = []) {
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

    if (IGNORE_PATH_PATTERNS.some((pattern) => pattern.test(relativePath))) {
      continue;
    }

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await collectFiles(relativePath, rootDir, options, files);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!CODE_EXTENSIONS.has(extension)) {
      continue;
    }

    if (!options.includeTests && IGNORE_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function safeDivide(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function round(value, digits = 3) {
  return Number(value.toFixed(digits));
}

function countMatches(text, pattern) {
  return (text.match(pattern) ?? []).length;
}

function uniqueStrings(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function lineNumberFromIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function findMatchingBrace(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== "{") {
    return -1;
  }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1] ?? "";

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inSingle) {
      if (!escaped && char === "'") {
        inSingle = false;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (inDouble) {
      if (!escaped && char === '"') {
        inDouble = false;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (inTemplate) {
      if (!escaped && char === "`") {
        inTemplate = false;
      }
      escaped = !escaped && char === "\\";
      continue;
    }

    if (char === "/" && next === "/") {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      escaped = false;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      escaped = false;
      continue;
    }

    if (char === "`") {
      inTemplate = true;
      escaped = false;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

function extractBalancedBody(text, startIndex) {
  const openIndex = text.indexOf("{", startIndex);
  if (openIndex < 0) {
    return null;
  }

  const closeIndex = findMatchingBrace(text, openIndex);
  if (closeIndex < 0) {
    return null;
  }

  return {
    openIndex,
    closeIndex,
    body: text.slice(openIndex + 1, closeIndex),
  };
}

function extractFunctions(text) {
  const patterns = [
    {
      kind: "function",
      regex: /\b(?:export\s+default\s+|export\s+)?async\s+function\s+([A-Za-z0-9_$]+)\s*\(/g,
    },
    {
      kind: "function",
      regex: /\b(?:export\s+default\s+|export\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/g,
    },
    {
      kind: "arrow",
      regex: /\b(?:export\s+const\s+|export\s+let\s+|const\s+|let\s+)([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    },
    {
      kind: "arrow",
      regex: /\b(?:export\s+const\s+|export\s+let\s+|const\s+|let\s+)([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?[A-Za-z0-9_$]+\s*=>/g,
    },
  ];

  const results = [];

  for (const { kind, regex } of patterns) {
    for (const match of text.matchAll(regex)) {
      const name = match[1];
      const index = match.index ?? 0;
      results.push({
        name,
        kind,
        line: lineNumberFromIndex(text, index),
      });
    }
  }

  results.sort((a, b) => a.line - b.line);

  const deduped = [];
  const seen = new Set();
  for (const item of results) {
    const key = `${item.name}:${item.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped;
}

function extractPropContracts(text) {
  const contracts = [];

  const interfaceRegex = /interface\s+([A-Za-z0-9_]+Props)\s*{/g;
  for (const match of text.matchAll(interfaceRegex)) {
    const name = match[1];
    const start = (match.index ?? 0) + match[0].lastIndexOf("{");
    const block = extractBalancedBody(text, start);
    if (!block) {
      continue;
    }
    contracts.push(parsePropContract(name, block.body));
  }

  const typeRegex = /type\s+([A-Za-z0-9_]+Props)\s*=\s*{/g;
  for (const match of text.matchAll(typeRegex)) {
    const name = match[1];
    const start = (match.index ?? 0) + match[0].lastIndexOf("{");
    const block = extractBalancedBody(text, start);
    if (!block) {
      continue;
    }
    contracts.push(parsePropContract(name, block.body));
  }

  return contracts;
}

function parsePropContract(name, body) {
  const lines = body.split(/\r?\n/).map((line) => line.trim());
  let propCount = 0;
  let booleanCount = 0;
  let callbackCount = 0;
  let childrenCount = 0;

  for (const line of lines) {
    if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
      continue;
    }

    if (/^[A-Za-z0-9_$"'[\]?]+\??\s*:/.test(line)) {
      propCount += 1;

      if (/:\s*boolean\b/.test(line) || /:\s*Boolean\b/.test(line)) {
        booleanCount += 1;
      }

      if (/:\s*\(/.test(line) || /=>/.test(line)) {
        callbackCount += 1;
      }

      if (/^children\??\s*:/.test(line)) {
        childrenCount += 1;
      }
    }
  }

  return {
    name,
    propCount,
    booleanCount,
    callbackCount,
    childrenCount,
  };
}

function detectRole(filePath, text) {
  const normalizedPath = toPosixPath(filePath);
  const extension = path.extname(normalizedPath).toLowerCase();
  const baseName = path.basename(normalizedPath, extension);

  const hasJsx =
    /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(text) &&
    !/^\s*<\?xml\b/i.test(text);

  const isHookLike = /^use[A-Z0-9]/.test(baseName) || /\/hooks?\//i.test(normalizedPath);
  const isServiceLike =
    /\.service\./i.test(normalizedPath) ||
    /\/services?\//i.test(normalizedPath) ||
    /\/api\//i.test(normalizedPath);
  const isUtilityLike =
    /\.utils?\./i.test(normalizedPath) ||
    /\.helpers?\./i.test(normalizedPath) ||
    /\/utils?\//i.test(normalizedPath) ||
    /\/helpers?\//i.test(normalizedPath);
  const isTypeLike =
    /\.types\./i.test(normalizedPath) ||
    /\.models?\./i.test(normalizedPath) ||
    /\/types?\//i.test(normalizedPath) ||
    /\/model\//i.test(normalizedPath);
  const isComponentLikePath =
    /\/components?\//i.test(normalizedPath) ||
    /\/app\//i.test(normalizedPath) ||
    /\/views?\//i.test(normalizedPath) ||
    /\/screens?\//i.test(normalizedPath) ||
    /\/pages?\//i.test(normalizedPath);

  const isScriptLike = /\/scripts?\//i.test(normalizedPath);

  if (isTypeLike && !hasJsx) {
    return "TYPE";
  }

  if (isHookLike && !hasJsx) {
    return "HOOK";
  }

  if ((extension === ".tsx" || extension === ".jsx") && (hasJsx || isComponentLikePath)) {
    return "REACT_COMPONENT";
  }

  if (hasJsx && isComponentLikePath) {
    return "REACT_COMPONENT";
  }

  if (isServiceLike) {
    return "SERVICE";
  }

  if (isUtilityLike) {
    return "UTILITY";
  }

  if (isScriptLike) {
    return "SCRIPT";
  }

  return "MODULE";
}

function computeSharedMetrics(filePath, text) {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((line) => line.trimEnd());
  const nonEmptyLines = lines.filter((line) => line.trim().length > 0);

  const commentLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
  });

  const maxLineLength = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const todoCount = countMatches(text, /\b(TODO|FIXME|HACK|REFACTOR)\b/gi);
  const anyCount = countMatches(text, /\bany\b/g);
  const consoleCount = countMatches(text, /\bconsole\.(log|warn|error|info|debug)\b/g);

  const importMatches = text.match(/^import\s.+from\s+['"].+['"];?/gm) ?? [];
  const internalImports = importMatches.filter((line) => /from\s+['"](\.|@\/)/.test(line)).length;
  const externalImports = importMatches.length - internalImports;

  const complexityText = text
    .replace(/\?\./g, "")
    .replace(/\?\?/g, "");

  const branchPoints = countMatches(
    complexityText,
    /\b(if|else\s+if|for|while|switch|case|catch)\b/g,
  );
  const ternaryPoints = countMatches(complexityText, /\?/g);
  const logicalPoints = countMatches(complexityText, /&&|\|\|/g);
  const complexityEstimate = 1 + branchPoints + Math.floor(ternaryPoints / 2) + Math.floor(logicalPoints / 3);

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
    .filter(
      (line) =>
        line.length >= 16 &&
        !line.startsWith("import ") &&
        !line.startsWith("export ") &&
        !line.startsWith("//"),
    );

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

  const duplicationRatio = safeDivide(duplicatedLines, normalizedLines.length);
  const functionList = extractFunctions(text);
  const exportCount = countMatches(
    text,
    /\bexport\s+(?:default\s+)?(?:const|let|function|class|type|interface)\b/g,
  );

  return {
    filePath,
    loc: nonEmptyLines.length,
    commentRatio: round(safeDivide(commentLines.length, nonEmptyLines.length)),
    maxLineLength,
    todoCount,
    anyCount,
    consoleCount,
    internalImports,
    externalImports,
    importCount: importMatches.length,
    complexityEstimate,
    maxDepth,
    duplicationRatio: round(duplicationRatio),
    functionCount: functionList.length,
    exportCount,
    topFunctions: functionList.slice(0, 12),
  };
}

function estimateReturnedObjectFields(text) {
  const match = /return\s*{/.exec(text);
  if (!match) {
    return 0;
  }

  const openIndex = text.indexOf("{", match.index);
  const block = extractBalancedBody(text, openIndex);
  if (!block) {
    return 0;
  }

  return block.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[A-Za-z0-9_$]+\s*(,|:)/.test(line)).length;
}

function analyzeReactComponent(filePath, text, shared) {
  const propContracts = extractPropContracts(text);
  const maxProps = propContracts.reduce((max, item) => Math.max(max, item.propCount), 0);
  const maxBooleanProps = propContracts.reduce((max, item) => Math.max(max, item.booleanCount), 0);
  const maxCallbackProps = propContracts.reduce((max, item) => Math.max(max, item.callbackCount), 0);

  const hookCalls = countMatches(text, /\buse[A-Z][A-Za-z0-9_]*\s*\(/g);
  const stateHooks = countMatches(text, /\buseState\s*\(/g);
  const effectHooks = countMatches(text, /\buseEffect\s*\(/g);
  const memoHooks = countMatches(text, /\buseMemo\s*\(/g) + countMatches(text, /\buseCallback\s*\(/g);
  const refHooks = countMatches(text, /\buseRef\s*\(/g);
  const customHookCalls = Math.max(0, hookCalls - stateHooks - effectHooks - memoHooks - refHooks - countMatches(text, /\buseContext\s*\(/g));

  const jsxLines = text
    .split(/\r?\n/)
    .filter((line) => /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(line))
    .length;

  const jsxElements = countMatches(text, /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/g);
  const customElements = countMatches(text, /<([A-Z][A-Za-z0-9_]*)\b/g);
  const htmlElements = countMatches(text, /<([a-z][A-Za-z0-9-]*)\b/g);
  const conditionalRenderCount =
    countMatches(text, /\?\s*</g) +
    countMatches(text, /&&\s*</g) +
    countMatches(text, /:\s*</g);
  const helperFunctions = shared.topFunctions.filter((item) => !/^[A-Z]/.test(item.name)).length;
  const componentFunctions = shared.topFunctions.filter((item) => /^[A-Z]/.test(item.name)).length;

  const fetchCalls =
    countMatches(text, /\bfetch\s*\(/g) +
    countMatches(text, /\baxios\./g) +
    countMatches(text, /\bprisma\./g) +
    countMatches(text, /\bgraphqlClient\./g);

  const routeCalls = countMatches(text, /\buseRouter\s*\(/g) + countMatches(text, /\brouter\./g);

  const heavyLogicSignals =
    countMatches(text, /\.map\s*\(/g) +
    countMatches(text, /\.filter\s*\(/g) +
    countMatches(text, /\.reduce\s*\(/g) +
    countMatches(text, /\bnew Map\s*\(/g) +
    countMatches(text, /\bnew Set\s*\(/g);

  let compositionPenalty = 0;

  if (shared.loc > 220) {
    compositionPenalty += Math.min(30, Math.ceil((shared.loc - 220) / 12));
  }

  if (jsxLines > 80) {
    compositionPenalty += Math.min(18, Math.ceil((jsxLines - 80) / 8));
  }

  if (maxProps > 8) {
    compositionPenalty += Math.min(16, (maxProps - 8) * 2);
  }

  if (maxBooleanProps >= 3) {
    compositionPenalty += Math.min(12, (maxBooleanProps - 2) * 3);
  }

  if (hookCalls > 8) {
    compositionPenalty += Math.min(14, hookCalls - 8);
  }

  if (stateHooks > 4) {
    compositionPenalty += Math.min(10, (stateHooks - 4) * 2);
  }

  if (customElements < 4 && shared.loc > 180) {
    compositionPenalty += 14;
  }

  if (fetchCalls > 0) {
    compositionPenalty += Math.min(12, fetchCalls * 4);
  }

  if (helperFunctions > 8) {
    compositionPenalty += Math.min(10, helperFunctions - 8);
  }

  if (shared.internalImports > 12) {
    compositionPenalty += Math.min(12, shared.internalImports - 12);
  }

  const compositionHealth = Math.max(0, 100 - compositionPenalty);

  return {
    role: "REACT_COMPONENT",
    propContracts,
    maxProps,
    maxBooleanProps,
    maxCallbackProps,
    hookCalls,
    stateHooks,
    effectHooks,
    memoHooks,
    refHooks,
    customHookCalls,
    jsxLines,
    jsxElements,
    customElements,
    htmlElements,
    conditionalRenderCount,
    helperFunctions,
    componentFunctions,
    fetchCalls,
    routeCalls,
    heavyLogicSignals,
    compositionHealth,
  };
}

function analyzeHook(text, shared) {
  const hookCalls = countMatches(text, /\buse[A-Z][A-Za-z0-9_]*\s*\(/g);
  const stateHooks = countMatches(text, /\buseState\s*\(/g);
  const effectHooks = countMatches(text, /\buseEffect\s*\(/g);
  const memoHooks = countMatches(text, /\buseMemo\s*\(/g) + countMatches(text, /\buseCallback\s*\(/g);
  const fetchCalls =
    countMatches(text, /\bfetch\s*\(/g) +
    countMatches(text, /\baxios\./g) +
    countMatches(text, /\bprisma\./g) +
    countMatches(text, /\bgraphqlClient\./g);
  const returnedFieldCount = estimateReturnedObjectFields(text);

  let modularityPenalty = 0;

  if (shared.loc > 180) {
    modularityPenalty += Math.min(24, Math.ceil((shared.loc - 180) / 10));
  }

  if (shared.complexityEstimate > 20) {
    modularityPenalty += Math.min(18, shared.complexityEstimate - 20);
  }

  if (returnedFieldCount > 8) {
    modularityPenalty += Math.min(12, (returnedFieldCount - 8) * 2);
  }

  if (effectHooks > 3) {
    modularityPenalty += Math.min(10, (effectHooks - 3) * 2);
  }

  const modularityHealth = Math.max(0, 100 - modularityPenalty);

  return {
    role: "HOOK",
    hookCalls,
    stateHooks,
    effectHooks,
    memoHooks,
    fetchCalls,
    returnedFieldCount,
    modularityHealth,
  };
}

function analyzeService(text, shared) {
  const exportedFunctions = countMatches(
    text,
    /\bexport\s+(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/g,
  ) + countMatches(
    text,
    /\bexport\s+const\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\(/g,
  );

  const fetchCalls =
    countMatches(text, /\bfetch\s*\(/g) +
    countMatches(text, /\baxios\./g) +
    countMatches(text, /\bprisma\./g) +
    countMatches(text, /\bgraphqlClient\./g);

  const hasJsx = /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(text);
  const hasHookCalls = /\buse[A-Z][A-Za-z0-9_]*\s*\(/.test(text);

  let modularityPenalty = 0;

  if (shared.loc > 220) {
    modularityPenalty += Math.min(24, Math.ceil((shared.loc - 220) / 12));
  }

  if (shared.complexityEstimate > 22) {
    modularityPenalty += Math.min(20, shared.complexityEstimate - 22);
  }

  if (exportedFunctions > 8) {
    modularityPenalty += Math.min(12, exportedFunctions - 8);
  }

  if (hasJsx) {
    modularityPenalty += 18;
  }

  if (hasHookCalls) {
    modularityPenalty += 16;
  }

  const modularityHealth = Math.max(0, 100 - modularityPenalty);

  return {
    role: "SERVICE",
    exportedFunctions,
    fetchCalls,
    hasJsx,
    hasHookCalls,
    modularityHealth,
  };
}

function analyzeUtility(text, shared) {
  const exportedFunctions = countMatches(
    text,
    /\bexport\s+(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/g,
  ) + countMatches(
    text,
    /\bexport\s+const\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\(/g,
  );

  const hasJsx = /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(text);
  const hasFetch =
    /\bfetch\s*\(/.test(text) ||
    /\baxios\./.test(text) ||
    /\bprisma\./.test(text) ||
    /\bgraphqlClient\./.test(text);

  let modularityPenalty = 0;

  if (shared.loc > 200) {
    modularityPenalty += Math.min(20, Math.ceil((shared.loc - 200) / 12));
  }

  if (shared.complexityEstimate > 18) {
    modularityPenalty += Math.min(18, shared.complexityEstimate - 18);
  }

  if (exportedFunctions > 12) {
    modularityPenalty += Math.min(12, exportedFunctions - 12);
  }

  if (hasJsx) {
    modularityPenalty += 18;
  }

  if (hasFetch) {
    modularityPenalty += 10;
  }

  const modularityHealth = Math.max(0, 100 - modularityPenalty);

  return {
    role: "UTILITY",
    exportedFunctions,
    hasJsx,
    hasFetch,
    modularityHealth,
  };
}

function analyzeTypeModule(text, shared) {
  const interfaceCount = countMatches(text, /\binterface\s+[A-Za-z0-9_]+\b/g);
  const typeCount = countMatches(text, /\btype\s+[A-Za-z0-9_]+\s*=/g);
  const enumCount = countMatches(text, /\benum\s+[A-Za-z0-9_]+\b/g);
  const hasJsx = /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(text);

  let modularityPenalty = 0;

  if (shared.loc > 180) {
    modularityPenalty += Math.min(18, Math.ceil((shared.loc - 180) / 12));
  }

  if (hasJsx) {
    modularityPenalty += 24;
  }

  const modularityHealth = Math.max(0, 100 - modularityPenalty);

  return {
    role: "TYPE",
    interfaceCount,
    typeCount,
    enumCount,
    hasJsx,
    modularityHealth,
  };
}

function analyzeGenericModule(role, text, shared) {
  const exportedFunctions = countMatches(
    text,
    /\bexport\s+(?:async\s+)?function\s+[A-Za-z0-9_$]+\s*\(/g,
  ) + countMatches(
    text,
    /\bexport\s+const\s+[A-Za-z0-9_$]+\s*=\s*(?:async\s*)?\(/g,
  );

  const hasJsx = /<([A-Za-z][A-Za-z0-9._:-]*)(\s|\/?>)/.test(text);
  const hookCalls = countMatches(text, /\buse[A-Z][A-Za-z0-9_]*\s*\(/g);
  const fetchCalls =
    countMatches(text, /\bfetch\s*\(/g) +
    countMatches(text, /\baxios\./g) +
    countMatches(text, /\bprisma\./g);

  let modularityPenalty = 0;

  if (shared.loc > 220) {
    modularityPenalty += Math.min(20, Math.ceil((shared.loc - 220) / 12));
  }

  if (shared.complexityEstimate > 22) {
    modularityPenalty += Math.min(18, shared.complexityEstimate - 22);
  }

  const modularityHealth = Math.max(0, 100 - modularityPenalty);

  return {
    role,
    exportedFunctions,
    hasJsx,
    hookCalls,
    fetchCalls,
    modularityHealth,
  };
}

function buildTargetStructure(filePath, role) {
  const normalized = toPosixPath(filePath);
  const dir = path.posix.dirname(normalized);
  const ext = path.posix.extname(normalized);
  const name = path.posix.basename(normalized, ext);

  if (role === "REACT_COMPONENT") {
    return {
      style: "feature-folder",
      suggestedPaths: [
        `${dir}/${name}/${name}${ext}`,
        `${dir}/${name}/${name}.types.ts`,
        `${dir}/${name}/${name}.utils.ts`,
        `${dir}/${name}/components/`,
        `${dir}/${name}/hooks/`,
      ],
    };
  }

  if (role === "HOOK") {
    return {
      style: "hook-split",
      suggestedPaths: [
        `${dir}/${name}${ext}`,
        `${dir}/${name}.types.ts`,
        `${dir}/${name}.utils.ts`,
      ],
    };
  }

  if (role === "SERVICE") {
    return {
      style: "service-split",
      suggestedPaths: [
        `${dir}/${name}${ext}`,
        `${dir}/${name}.types.ts`,
        `${dir}/${name}.mapper.ts`,
      ],
    };
  }

  return {
    style: "module-split",
    suggestedPaths: [
      `${dir}/${name}${ext}`,
      `${dir}/${name}.types.ts`,
      `${dir}/${name}.utils.ts`,
    ],
  };
}

function createRefactorPlan(filePath, role, shared, architecture, risk) {
  const actions = [];
  const notes = [];
  const targetStructure = buildTargetStructure(filePath, role);

  function addAction(kind, priority, reason, destination = null, detail = null) {
    actions.push({ kind, priority, reason, destination, detail });
  }

  if (role === "REACT_COMPONENT") {
    if (shared.loc > 220 || architecture.jsxLines > 80 || architecture.customElements < 4) {
      addAction(
        "extract_subcomponents",
        architecture.compositionHealth < 60 ? "high" : "medium",
        "El componente esta demasiado grande para la poca composicion visual detectada.",
        `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}/components/`,
        {
          suggestedNames: ["Header", "Body", "Actions", "Toolbar", "List", "Item"],
        },
      );
    }

    if (architecture.hookCalls > 8 || architecture.stateHooks > 4 || architecture.effectHooks > 2) {
      addAction(
        "extract_hook",
        "high",
        "Hay demasiada logica de estado/efectos dentro del componente.",
        `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}/hooks/`,
        {
          suggestedNames: [
            `use${path.posix.basename(filePath, path.posix.extname(filePath))}State`,
            `use${path.posix.basename(filePath, path.posix.extname(filePath))}Actions`,
            `use${path.posix.basename(filePath, path.posix.extname(filePath))}ViewModel`,
          ],
        },
      );
    }

    if (architecture.fetchCalls > 0) {
      addAction(
        "extract_service",
        "high",
        "Se detecto acceso a datos directo dentro del componente.",
        `${path.posix.dirname(filePath)}/services/`,
        {
          suggestedNames: [`${path.posix.basename(filePath, path.posix.extname(filePath))}.service.ts`],
        },
      );
    }

    if (architecture.helperFunctions > 6 || architecture.heavyLogicSignals > 10) {
      addAction(
        "extract_utils",
        "medium",
        "Hay bastante logica derivada o helpers puros dentro del componente.",
        `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}/${path.posix.basename(filePath, path.posix.extname(filePath))}.utils.ts`,
      );
    }

    if (architecture.maxProps > 8 || architecture.maxBooleanProps >= 3) {
      addAction(
        "reduce_props_api",
        "high",
        "El contrato de props es demasiado ancho o esta dominado por booleans.",
        `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}/${path.posix.basename(filePath, path.posix.extname(filePath))}.types.ts`,
        {
          strategy: "agrupar props por dominio, reemplazar booleans por variant o dividir componente",
        },
      );
    }

    if (shared.anyCount > 0 || architecture.propContracts.length > 0) {
      addAction(
        "create_types_module",
        shared.anyCount > 0 ? "high" : "medium",
        "Conviene formalizar contratos de props y tipos auxiliares en un modulo aparte.",
        `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}/${path.posix.basename(filePath, path.posix.extname(filePath))}.types.ts`,
      );
    }

    notes.push("Patron recomendado: orquestador + secciones + hojas + hook de dominio + types + utils.");
  }

  if (role === "HOOK") {
    if (shared.loc > 180 || architecture.effectHooks > 3 || architecture.returnedFieldCount > 8) {
      addAction(
        "split_hook",
        architecture.modularityHealth < 60 ? "high" : "medium",
        "El hook concentra demasiadas responsabilidades o devuelve un contrato demasiado ancho.",
        path.posix.dirname(filePath),
        {
          suggestedNames: [
            `${path.posix.basename(filePath, path.posix.extname(filePath))}.utils.ts`,
            `${path.posix.basename(filePath, path.posix.extname(filePath))}.types.ts`,
            `${path.posix.basename(filePath, path.posix.extname(filePath))}.effects.ts`,
          ],
        },
      );
    }

    if (architecture.fetchCalls > 0) {
      addAction(
        "move_io_to_service",
        "high",
        "El hook mezcla orquestacion con acceso a datos.",
        `${path.posix.dirname(filePath)}/../services/`,
      );
    }

    notes.push("Patron recomendado: hook orquestador pequeno + service + utils + type contract reducido.");
  }

  if (role === "SERVICE") {
    if (architecture.hasJsx) {
      addAction(
        "remove_ui_from_service",
        "high",
        "Un service no deberia renderizar UI.",
        `${path.posix.dirname(filePath)}/../components/`,
      );
    }

    if (architecture.hasHookCalls) {
      addAction(
        "remove_hooks_from_service",
        "high",
        "Un service no deberia depender de hooks de React.",
        `${path.posix.dirname(filePath)}/../hooks/`,
      );
    }

    if (shared.loc > 220 || shared.complexityEstimate > 22) {
      addAction(
        "split_service_by_use_case",
        architecture.modularityHealth < 60 ? "high" : "medium",
        "El service parece concentrar demasiados casos de uso.",
        path.posix.dirname(filePath),
        {
          strategy: "partir por recurso, caso de uso o adapter/mapper",
        },
      );
    }

    notes.push("Patron recomendado: service puro + mapper + types, sin JSX ni hooks.");
  }

  if (role === "UTILITY") {
    if (architecture.hasJsx) {
      addAction(
        "move_ui_out_of_utils",
        "high",
        "Las utilidades no deberian contener JSX.",
        `${path.posix.dirname(filePath)}/../components/`,
      );
    }

    if (architecture.hasFetch) {
      addAction(
        "move_io_out_of_utils",
        "medium",
        "Las utilidades estan mezcladas con efectos secundarios o IO.",
        `${path.posix.dirname(filePath)}/../services/`,
      );
    }
  }

  if (role === "TYPE" && architecture.hasJsx) {
    addAction(
      "separate_types_and_render",
      "high",
      "El archivo de tipos esta mezclado con render.",
      `${path.posix.dirname(filePath)}/../components/`,
    );
  }

  if (shared.duplicationRatio > 0.15) {
    addAction(
      "deduplicate",
      shared.duplicationRatio > 0.25 ? "high" : "medium",
      "Hay repeticion suficiente como para justificar extraccion.",
      `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}.utils.ts`,
    );
  }

  if (shared.anyCount > 0) {
    addAction(
      "replace_any",
      "high",
      "Hay deuda de tipado que dificulta refactors seguros.",
      `${path.posix.dirname(filePath)}/${path.posix.basename(filePath, path.posix.extname(filePath))}.types.ts`,
    );
  }

  if (shared.internalImports > 18) {
    addAction(
      "reduce_coupling",
      "medium",
      "El archivo depende de demasiados modulos internos.",
      null,
      {
        strategy: "introducir fachada local, barrel por dominio o partir responsabilidades",
      },
    );
  }

  actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3);
  });

  let firstStep = "Revisar el archivo y partir por responsabilidad.";
  if (actions[0]?.kind === "extract_subcomponents") {
    firstStep = "Primero separar bloques visuales en subcomponentes antes de tocar la logica.";
  } else if (actions[0]?.kind === "extract_hook") {
    firstStep = "Primero sacar estado y efectos a un hook de dominio.";
  } else if (actions[0]?.kind === "extract_service" || actions[0]?.kind === "move_io_to_service") {
    firstStep = "Primero mover IO/acceso a datos fuera de la UI.";
  } else if (actions[0]?.kind === "reduce_props_api") {
    firstStep = "Primero adelgazar la API de props para facilitar el resto del refactor.";
  }

  return {
    targetStructure,
    firstStep,
    notes,
    actions: actions.slice(0, 8),
    estimatedRefactorSize:
      risk.score >= 65 ? "large" : risk.score >= 45 ? "medium" : "small",
  };
}

function calculateRiskScore(shared, roleMetrics) {
  let score = 0;
  const reasons = [];
  const suggestions = [];

  function add(points, reason, suggestion) {
    if (points <= 0) {
      return;
    }
    score += points;
    reasons.push({ points, reason });
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  if (shared.loc > 280) {
    add(
      Math.min(24, Math.ceil((shared.loc - 280) / 12)),
      `Archivo demasiado grande (${shared.loc} LOC).`,
      "Partir por responsabilidad y dejar un punto de entrada pequeno por archivo.",
    );
  }

  if (shared.complexityEstimate > 24) {
    add(
      Math.min(20, shared.complexityEstimate - 24),
      `Complejidad estimada alta (${shared.complexityEstimate}).`,
      "Reducir ramas condicionales y mover logica compleja a funciones puras o hooks.",
    );
  }

  if (shared.maxDepth >= 6) {
    add(
      Math.min(12, (shared.maxDepth - 5) * 2),
      `Anidamiento alto (profundidad ${shared.maxDepth}).`,
      "Usar guard clauses y retornos tempranos para bajar la profundidad.",
    );
  }

  if (shared.duplicationRatio > 0.15) {
    add(
      Math.min(12, Math.ceil((shared.duplicationRatio - 0.15) * 60)),
      `Duplicacion perceptible (${round(shared.duplicationRatio * 100, 1)}%).`,
      "Extraer repeticion a utilidades compartidas o subcomponentes reutilizables.",
    );
  }

  if (shared.anyCount > 0) {
    add(
      Math.min(10, shared.anyCount),
      `Uso de any (${shared.anyCount}).`,
      "Reemplazar any por tipos explicitos para preservar contratos y refactors seguros.",
    );
  }

  if (shared.todoCount > 0) {
    add(
      Math.min(8, shared.todoCount * 2),
      `Pendientes tecnicos detectados (${shared.todoCount} TODO/FIXME/HACK).`,
      "Convertir deuda tecnica en tickets o resolverla antes de seguir agregando capas.",
    );
  }

  if (shared.maxLineLength > 150) {
    add(
      4,
      `Lineas demasiado largas (maximo ${shared.maxLineLength}).`,
      "Partir expresiones largas para mejorar lectura y revision.",
    );
  }

  if (shared.internalImports > 18) {
    add(
      Math.min(10, Math.ceil((shared.internalImports - 18) / 2)),
      `Acoplamiento interno alto (${shared.internalImports} imports internos).`,
      "Agrupar dependencias por dominio y exponer una API mas chica por modulo.",
    );
  }

  if (roleMetrics.role === "REACT_COMPONENT") {
    if (roleMetrics.compositionHealth < 80) {
      add(
        Math.min(20, Math.ceil((80 - roleMetrics.compositionHealth) / 4)),
        `Salud de composicion baja (${roleMetrics.compositionHealth}/100).`,
        "Usar patron ensamblador: componente orquestador + subcomponentes + hooks + types.",
      );
    }

    if (roleMetrics.maxProps > 8) {
      add(
        Math.min(12, (roleMetrics.maxProps - 8) * 2),
        `Demasiadas props en el contrato principal (${roleMetrics.maxProps}).`,
        "Reducir props, agruparlas por dominio o mover parte del contrato a subcomponentes/contexto local.",
      );
    }

    if (roleMetrics.maxBooleanProps >= 3) {
      add(
        Math.min(10, (roleMetrics.maxBooleanProps - 2) * 3),
        `Demasiadas boolean props (${roleMetrics.maxBooleanProps}).`,
        "Reemplazar matrices de booleans por variants, slots o subcomponentes.",
      );
    }

    if (roleMetrics.hookCalls > 8 || roleMetrics.stateHooks > 4) {
      add(
        8,
        `Demasiados hooks en un mismo componente (hooks=${roleMetrics.hookCalls}, state=${roleMetrics.stateHooks}).`,
        "Extraer estado derivado y logica de interaccion a hooks de dominio.",
      );
    }

    if (roleMetrics.fetchCalls > 0) {
      add(
        Math.min(10, roleMetrics.fetchCalls * 4),
        `Acceso a datos dentro del componente (${roleMetrics.fetchCalls} senales).`,
        "Mover fetch/axios/prisma a services o hooks de datos.",
      );
    }

    if (roleMetrics.customElements < 4 && shared.loc > 180) {
      add(
        8,
        `Poca composicion visual para el tamano del archivo (subcomponentes usados=${roleMetrics.customElements}).`,
        "Extraer bloques de UI a componentes hoja o secciones con responsabilidad unica.",
      );
    }

    if (roleMetrics.helperFunctions > 8) {
      add(
        Math.min(8, roleMetrics.helperFunctions - 8),
        `Mucha logica auxiliar local (${roleMetrics.helperFunctions} helpers).`,
        "Mover helpers puros a utils.ts y dejar el componente enfocado en ensamblar UI.",
      );
    }

    if (shared.exportCount > 3) {
      add(
        4,
        `Demasiadas exportaciones en archivo de componente (${shared.exportCount}).`,
        "Dejar un componente principal por archivo y mover lo demas a modulos vecinos si crece.",
      );
    }
  }

  if (roleMetrics.role === "HOOK") {
    if (roleMetrics.modularityHealth < 80) {
      add(
        Math.min(18, Math.ceil((80 - roleMetrics.modularityHealth) / 4)),
        `Hook demasiado grande o cargado (${roleMetrics.modularityHealth}/100).`,
        "Separar fetch, estado derivado y acciones en hooks o helpers mas pequenos.",
      );
    }

    if (roleMetrics.returnedFieldCount > 8) {
      add(
        Math.min(8, roleMetrics.returnedFieldCount - 8),
        `El hook devuelve demasiados campos (${roleMetrics.returnedFieldCount}).`,
        "Reducir el contrato del hook o dividirlo por casos de uso.",
      );
    }
  }

  if (roleMetrics.role === "SERVICE") {
    if (roleMetrics.hasJsx) {
      add(
        18,
        "JSX dentro de un service.",
        "Sacar UI del service y dejar solo IO / acceso a datos / adaptadores.",
      );
    }

    if (roleMetrics.hasHookCalls) {
      add(
        16,
        "Hooks dentro de un service.",
        "Mover hooks a la capa de UI y dejar el service como modulo puro.",
      );
    }
  }

  if (roleMetrics.role === "UTILITY") {
    if (roleMetrics.hasJsx) {
      add(
        18,
        "JSX dentro de un util.",
        "Mover UI a componentes y dejar utils para logica pura reutilizable.",
      );
    }

    if (roleMetrics.hasFetch) {
      add(
        10,
        "Llamadas de red dentro de utilidades.",
        "Mover IO a services y dejar utils libres de efectos secundarios.",
      );
    }
  }

  if (roleMetrics.role === "TYPE" && roleMetrics.hasJsx) {
    add(
      24,
      "JSX dentro de archivo de tipos/modelos.",
      "Separar tipos del render para mantener fronteras claras de responsabilidad.",
    );
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
    reasons: reasons.sort((a, b) => b.points - a.points).slice(0, 6),
    suggestions: uniqueStrings(suggestions).slice(0, 6),
  };
}

function computeMetrics(filePath, text) {
  const shared = computeSharedMetrics(filePath, text);
  const role = detectRole(filePath, text);

  let architecture;
  switch (role) {
    case "REACT_COMPONENT":
      architecture = analyzeReactComponent(filePath, text, shared);
      break;
    case "HOOK":
      architecture = analyzeHook(text, shared);
      break;
    case "SERVICE":
      architecture = analyzeService(text, shared);
      break;
    case "UTILITY":
      architecture = analyzeUtility(text, shared);
      break;
    case "TYPE":
      architecture = analyzeTypeModule(text, shared);
      break;
    default:
      architecture = analyzeGenericModule(role, text, shared);
      break;
  }

  const risk = calculateRiskScore(shared, architecture);
  const refactorPlan = createRefactorPlan(filePath, role, shared, architecture, risk);

  return {
    filePath,
    role,
    loc: shared.loc,
    functionCount: shared.functionCount,
    exportCount: shared.exportCount,
    complexityEstimate: shared.complexityEstimate,
    maxDepth: shared.maxDepth,
    duplicationRatio: shared.duplicationRatio,
    todoCount: shared.todoCount,
    anyCount: shared.anyCount,
    consoleCount: shared.consoleCount,
    internalImports: shared.internalImports,
    externalImports: shared.externalImports,
    importCount: shared.importCount,
    maxLineLength: shared.maxLineLength,
    commentRatio: shared.commentRatio,
    riskScore: risk.score,
    riskLevel: risk.level,
    reasons: risk.reasons,
    suggestions: risk.suggestions,
    topFunctions: shared.topFunctions,
    architecture,
    refactorPlan,
  };
}

function summarize(metricsList) {
  const totalFiles = metricsList.length;
  const totalLoc = metricsList.reduce((acc, item) => acc + item.loc, 0);

  const averageRisk = totalFiles
    ? round(metricsList.reduce((acc, item) => acc + item.riskScore, 0) / totalFiles, 1)
    : 0;

  const byLevel = metricsList.reduce(
    (acc, item) => {
      acc[item.riskLevel] = (acc[item.riskLevel] ?? 0) + 1;
      return acc;
    },
    { BAJO: 0, MEDIO: 0, ALTO: 0, CRITICO: 0 },
  );

  const byRole = metricsList.reduce((acc, item) => {
    acc[item.role] = (acc[item.role] ?? 0) + 1;
    return acc;
  }, {});

  const byAction = {};
  for (const item of metricsList) {
    for (const action of item.refactorPlan.actions) {
      byAction[action.kind] = (byAction[action.kind] ?? 0) + 1;
    }
  }

  const componentFiles = metricsList.filter((item) => item.role === "REACT_COMPONENT");
  const averageComponentCompositionHealth = componentFiles.length
    ? round(
        componentFiles.reduce((acc, item) => acc + (item.architecture.compositionHealth ?? 0), 0) /
          componentFiles.length,
        1,
      )
    : null;

  return {
    totalFiles,
    totalLoc,
    averageRisk,
    averageComponentCompositionHealth,
    byLevel,
    byRole,
    byAction,
  };
}

function formatRoleSpecific(item) {
  if (item.role === "REACT_COMPONENT") {
    return [
      `props=${item.architecture.maxProps}`,
      `bool=${item.architecture.maxBooleanProps}`,
      `hooks=${item.architecture.hookCalls}`,
      `jsx=${item.architecture.jsxLines}`,
      `comp=${item.architecture.compositionHealth}`,
    ].join(" | ");
  }

  if (item.role === "HOOK") {
    return [
      `hooks=${item.architecture.hookCalls}`,
      `effects=${item.architecture.effectHooks}`,
      `return=${item.architecture.returnedFieldCount}`,
      `mod=${item.architecture.modularityHealth}`,
    ].join(" | ");
  }

  return [
    `mod=${item.architecture.modularityHealth ?? "--"}`,
    `imports=${item.importCount}`,
  ].join(" | ");
}

function formatActions(item) {
  if (!item.refactorPlan.actions.length) {
    return "sin acciones";
  }

  return item.refactorPlan.actions
    .slice(0, 3)
    .map((action) => `${action.priority}:${action.kind}`)
    .join(", ");
}

function formatTable(summary, hotspots, top) {
  const lines = [];

  lines.push("=== Architecture Refactor Report v2 ===");
  lines.push(`Archivos analizados: ${summary.totalFiles}`);
  lines.push(`LOC total: ${summary.totalLoc}`);
  lines.push(`Riesgo promedio: ${summary.averageRisk}/100`);

  if (summary.averageComponentCompositionHealth !== null) {
    lines.push(
      `Salud promedio de composicion en componentes: ${summary.averageComponentCompositionHealth}/100`,
    );
  }

  lines.push(
    `Distribucion: BAJO=${summary.byLevel.BAJO}, MEDIO=${summary.byLevel.MEDIO}, ALTO=${summary.byLevel.ALTO}, CRITICO=${summary.byLevel.CRITICO}`,
  );
  lines.push(
    `Roles: ${Object.entries(summary.byRole)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([role, count]) => `${role}=${count}`)
      .join(", ")}`,
  );
  lines.push(
    `Acciones sugeridas: ${Object.entries(summary.byAction)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([action, count]) => `${action}=${count}`)
      .join(", ")}`,
  );

  lines.push("");
  lines.push(`Top ${Math.min(top, hotspots.length)} hotspots:`);
  lines.push("score | nivel    | rol             | loc  | compl | depth | archivo");
  lines.push("------|----------|-----------------|------|-------|-------|--------");

  for (const item of hotspots.slice(0, top)) {
    const row = [
      String(item.riskScore).padStart(5),
      item.riskLevel.padEnd(8),
      item.role.padEnd(15),
      String(item.loc).padStart(4),
      String(item.complexityEstimate).padStart(5),
      String(item.maxDepth).padStart(5),
      item.filePath,
    ];

    lines.push(`${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]}`);
    lines.push(`      ${formatRoleSpecific(item)}`);
    lines.push(`      plan=${formatActions(item)}`);
  }

  lines.push("");
  lines.push("Primer paso por hotspot:");
  for (const item of hotspots.slice(0, Math.min(top, 10))) {
    lines.push(`- ${item.filePath}: ${item.refactorPlan.firstStep}`);
  }

  lines.push("");
  lines.push("Arquitectura destino sugerida:");
  for (const item of hotspots.slice(0, Math.min(top, 10))) {
    lines.push(`- ${item.filePath}: ${item.refactorPlan.targetStructure.style}`);
    for (const targetPath of item.refactorPlan.targetStructure.suggestedPaths.slice(0, 5)) {
      lines.push(`    · ${targetPath}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function buildFolderBacklog(metrics) {
  const byFolder = new Map();

  for (const item of metrics) {
    const folder = path.posix.dirname(item.filePath);
    const current = byFolder.get(folder) ?? {
      folder,
      files: [],
      riskTotal: 0,
      highRiskCount: 0,
      criticalCount: 0,
      actionCounter: new Map(),
    };

    current.files.push(item);
    current.riskTotal += item.riskScore;
    if (item.riskLevel === "ALTO") current.highRiskCount += 1;
    if (item.riskLevel === "CRITICO") current.criticalCount += 1;

    for (const action of item.refactorPlan.actions) {
      current.actionCounter.set(action.kind, (current.actionCounter.get(action.kind) ?? 0) + 1);
    }

    byFolder.set(folder, current);
  }

  const backlog = Array.from(byFolder.values()).map((entry) => {
    const avgRisk = safeDivide(entry.riskTotal, entry.files.length);
    const filesSorted = entry.files
      .slice()
      .sort((a, b) => b.riskScore - a.riskScore || b.loc - a.loc)
      .slice(0, 8);

    const topActions = Array.from(entry.actionCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kind, count]) => ({ kind, count }));

    return {
      folder: entry.folder,
      totalFiles: entry.files.length,
      avgRisk: round(avgRisk, 1),
      highRiskCount: entry.highRiskCount,
      criticalCount: entry.criticalCount,
      topActions,
      files: filesSorted,
    };
  });

  backlog.sort((a, b) => {
    if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount;
    if (b.highRiskCount !== a.highRiskCount) return b.highRiskCount - a.highRiskCount;
    if (b.avgRisk !== a.avgRisk) return b.avgRisk - a.avgRisk;
    return b.totalFiles - a.totalFiles;
  });

  return backlog;
}

function formatMarkdownBacklog(report) {
  const lines = [];
  const backlog = buildFolderBacklog(report.hotspots);

  lines.push("# Backlog de Refactor Priorizado por Carpeta");
  lines.push("");
  lines.push(`Generado: ${report.generatedAt}`);
  lines.push(`Archivos analizados: ${report.summary.totalFiles}`);
  lines.push(`Riesgo promedio global: ${report.summary.averageRisk}/100`);
  lines.push("");

  lines.push("## Prioridades por carpeta");
  lines.push("");
  lines.push("| Carpeta | Archivos | Riesgo promedio | Criticos | Altos |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const folder of backlog) {
    lines.push(
      `| ${folder.folder} | ${folder.totalFiles} | ${folder.avgRisk} | ${folder.criticalCount} | ${folder.highRiskCount} |`,
    );
  }

  lines.push("");
  lines.push("## Plan por carpeta");
  lines.push("");

  for (const folder of backlog) {
    lines.push(`### ${folder.folder}`);
    lines.push("");
    lines.push(`- Riesgo promedio: ${folder.avgRisk}/100`);
    lines.push(`- Archivos en carpeta: ${folder.totalFiles}`);
    lines.push(`- Criticos: ${folder.criticalCount} | Altos: ${folder.highRiskCount}`);

    if (folder.topActions.length > 0) {
      lines.push(`- Acciones mas frecuentes: ${folder.topActions.map((a) => `${a.kind} (${a.count})`).join(", ")}`);
    } else {
      lines.push("- Acciones mas frecuentes: sin acciones sugeridas");
    }

    lines.push("");
    lines.push("#### Primeros archivos a atacar");
    lines.push("");
    for (const file of folder.files.slice(0, 5)) {
      lines.push(`- ${file.filePath} (score=${file.riskScore}, ${file.riskLevel})`);
      lines.push(`  - Primer paso: ${file.refactorPlan.firstStep}`);
      lines.push(`  - Acciones: ${formatActions(file)}`);
    }

    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function writeOutputFile(rootDir, outputPath, content) {
  const absolutePath = path.resolve(rootDir, outputPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  return path.relative(rootDir, absolutePath).replace(/\\/g, "/");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();

  const allFiles = [];
  for (const target of options.targets) {
    await collectFiles(target, rootDir, options, allFiles);
  }

  const uniqueFiles = Array.from(new Set(allFiles)).sort();
  const metrics = [];

  for (const filePath of uniqueFiles) {
    const absolutePath = path.resolve(rootDir, filePath);
    const content = await fs.readFile(absolutePath, "utf8");
    metrics.push(computeMetrics(filePath, content));
  }

  metrics.sort(
    (a, b) =>
      b.riskScore - a.riskScore ||
      b.loc - a.loc ||
      a.filePath.localeCompare(b.filePath),
  );

  const summary = summarize(metrics);

  const report = {
    generatedAt: new Date().toISOString(),
    rulesVersion: 3,
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
    const written = await writeOutputFile(rootDir, options.out, output);
    console.log(`Reporte generado en: ${written}`);
  } else {
    process.stdout.write(output);
  }

  if (options.markdownOut) {
    const markdown = formatMarkdownBacklog(report);
    const written = await writeOutputFile(rootDir, options.markdownOut, markdown);
    console.log(`Backlog markdown generado en: ${written}`);
  }

  const highRiskCount = metrics.filter(
    (item) => item.riskLevel === "ALTO" || item.riskLevel === "CRITICO",
  ).length;

  process.exitCode = options.failOnHighRisk && highRiskCount > 0 ? 2 : 0;
}

main().catch((error) => {
  console.error("No se pudo generar el reporte arquitectonico de refactorizacion.");
  console.error(error);
  process.exit(1);
});
