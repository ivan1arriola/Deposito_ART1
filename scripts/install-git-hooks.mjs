#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HOOK_MARKER = "AUTO_VERSION_BUMP_HOOK";

function resolveHooksDir() {
  try {
    return execFileSync("git", ["rev-parse", "--git-path", "hooks"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

const hooksDir = resolveHooksDir();
if (!hooksDir) {
  console.log("No se detecto un repositorio git. Se omite la instalacion de hooks.");
  process.exit(0);
}

mkdirSync(hooksDir, { recursive: true });
const hookPath = join(hooksDir, "pre-commit");

const hookBlock = `
# ${HOOK_MARKER}
if command -v node >/dev/null 2>&1; then
  node scripts/bump-version-precommit.mjs || exit $?
else
  echo "Node.js no disponible: no se puede hacer bump de version automatico." >&2
  exit 1
fi
`;

if (!existsSync(hookPath)) {
  writeFileSync(hookPath, `#!/bin/sh${hookBlock}\n`, "utf8");
  chmodSync(hookPath, 0o755);
  console.log(`Hook pre-commit instalado en ${hookPath}`);
  process.exit(0);
}

const existing = readFileSync(hookPath, "utf8");
if (existing.includes(HOOK_MARKER)) {
  chmodSync(hookPath, 0o755);
  console.log("Hook pre-commit ya configurado.");
  process.exit(0);
}

const combined = existing.trimEnd() + "\n" + hookBlock + "\n";
writeFileSync(hookPath, combined, "utf8");
chmodSync(hookPath, 0o755);
console.log(`Hook pre-commit actualizado en ${hookPath}`);
