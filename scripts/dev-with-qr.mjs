import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import qrcode from "qrcode-terminal";

const require = createRequire(import.meta.url);
const nextBinPath = require.resolve("next/dist/bin/next");
const nextArgs = ["dev", ...process.argv.slice(2)];

let qrShown = false;
let outputBuffer = "";
const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, "");

const isPrivateIpv4 = (value) =>
  /^10\./.test(value) || /^192\.168\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value);

const rankInterface = (name, address) => {
  let score = 0;

  if (/^192\.168\./.test(address)) score += 50;
  else if (/^10\./.test(address)) score += 40;
  else if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) score += 30;

  if (/wi-?fi|wlan|wireless/i.test(name)) score += 8;
  if (/ethernet|lan|^en\d|^eth/i.test(name)) score += 6;
  if (/docker|veth|vmware|virtual|hyper-v|wsl|loopback/i.test(name)) score -= 25;

  return score;
};

const getPreferredLanIpv4 = () => {
  const nets = networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(nets)) {
    if (!Array.isArray(addresses)) continue;

    for (const info of addresses) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (!isPrivateIpv4(info.address)) continue;
      if (info.address.startsWith("169.254.")) continue;

      candidates.push({
        name,
        address: info.address,
        score: rankInterface(name, info.address),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].address;
};

const resolveQrUrl = (textBuffer) => {
  const forcedHost = process.env.NEXT_DEV_QR_HOST?.trim();
  const networkMatch = textBuffer.match(/-\s*Network:\s*(https?:\/\/[^\s]+)/i);
  const localMatch = textBuffer.match(/-\s*Local:\s*(https?:\/\/[^\s]+)/i);
  const baseUrl = networkMatch?.[1] ?? localMatch?.[1];

  if (!baseUrl) return null;

  try {
    const parsed = new URL(baseUrl);
    const localHost = forcedHost || getPreferredLanIpv4();
    if (!localHost) return parsed.toString();

    parsed.hostname = localHost;
    return parsed.toString();
  } catch {
    return baseUrl;
  }
};

const printQrFromText = (text) => {
  if (qrShown) {
    return;
  }

  outputBuffer += stripAnsi(text);

  if (outputBuffer.length > 4000) {
    outputBuffer = outputBuffer.slice(-4000);
  }

  const url = resolveQrUrl(outputBuffer);
  if (!url) {
    return;
  }

  qrShown = true;
  process.stdout.write("\nQR para abrir en el telefono (IP local):\n");
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
