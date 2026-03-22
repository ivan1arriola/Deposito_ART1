import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import qrcode from "qrcode-terminal";

const require = createRequire(import.meta.url);
const nextBinPath = require.resolve("next/dist/bin/next");
const nextArgs = ["dev", ...process.argv.slice(2)];

let qrShown = false;
let outputBuffer = "";
const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "");

const printQrFromText = (text) => {
  if (qrShown) {
    return;
  }

  outputBuffer += stripAnsi(text);

  if (outputBuffer.length > 4000) {
    outputBuffer = outputBuffer.slice(-4000);
  }

  const match = outputBuffer.match(/-\s*Network:\s*(https?:\/\/[^\s]+)/i);

  if (!match) {
    return;
  }

  qrShown = true;
  const url = match[1];
  process.stdout.write("\nQR para abrir en el telefono:\n");
  qrcode.generate(url, { small: true });
  process.stdout.write(`${url}\n\n`);
};

const child = spawn(process.execPath, [nextBinPath, ...nextArgs], {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

child.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);
  printQrFromText(text);
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);
  printQrFromText(text);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});

child.on("close", (code) => {
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  process.stderr.write(`No se pudo iniciar Next.js: ${error.message}\n`);
  process.exit(1);
});
