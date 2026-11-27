import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const hasProductionBuild = fs.existsSync(path.join(process.cwd(), ".next", "BUILD_ID"));
const mode = process.env.PLAYWRIGHT_NEXT_MODE ?? (hasProductionBuild ? "start" : "dev");

const child = spawn(process.execPath, [nextBin, mode, "-p", "3005", "-H", "127.0.0.1"], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "http://127.0.0.1:3005",
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET || "playwright-synthetic-nextauth-secret-key-0123456789",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@127.0.0.1:5432/deposito_e2e?schema=public",
  },
});

const shutdown = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
