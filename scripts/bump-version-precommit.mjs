#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PACKAGE_JSON = "package.json";
const LOCK_JSON = "package-lock.json";
const MAX_SEGMENT_VALUE = 10;

function bumpPatchWithCarry(version) {
  const [core] = version.split("-");
  const parts = core.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`Version invalida: ${version}`);
  }

  let [major, minor, patch] = parts.map((part) => Number(part));
  patch += 1;

  if (patch > MAX_SEGMENT_VALUE) {
    patch = 0;
    minor += 1;
  }

  if (minor > MAX_SEGMENT_VALUE) {
    minor = 0;
    major += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

const pkg = readJson(PACKAGE_JSON);
const oldVersion = String(pkg.version ?? "").trim();
if (!oldVersion) {
  throw new Error("No se encontro version en package.json");
}

const newVersion = bumpPatchWithCarry(oldVersion);
if (process.argv.includes("--dry-run")) {
  console.log(`Version (dry-run): ${oldVersion} -> ${newVersion}`);
  process.exit(0);
}

pkg.version = newVersion;
writeJson(PACKAGE_JSON, pkg);

const lock = readJson(LOCK_JSON);
lock.version = newVersion;
if (lock.packages && lock.packages[""]) {
  lock.packages[""].version = newVersion;
}
writeJson(LOCK_JSON, lock);

execFileSync("git", ["add", PACKAGE_JSON, LOCK_JSON], { stdio: "ignore" });
console.log(`Version actualizada: ${oldVersion} -> ${newVersion}`);
