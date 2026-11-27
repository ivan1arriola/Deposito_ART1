import "server-only";

import path from "path";
import { readFile } from "fs/promises";

const publicAssetDataUrlCache = new Map<string, Promise<string | null>>();

function detectMimeTypeFromPath(assetPath: string) {
  const lower = assetPath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export function getPublicAssetAbsolutePath(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", normalizedAssetPath);
}

async function loadPublicAssetDataUrl(assetPath: string) {
  const normalizedAssetPath = assetPath.replace(/^\/+/, "");
  const absolutePath = getPublicAssetAbsolutePath(normalizedAssetPath);

  try {
    const bytes = await readFile(absolutePath);
    const mimeType = detectMimeTypeFromPath(normalizedAssetPath);
    return `data:${mimeType};base64,${bytes.toString("base64")}`;
  } catch (error) {
    console.warn(
      `[react-pdf-assets] No se pudo cargar asset "${normalizedAssetPath}" para PDF:`,
      error
    );
    return null;
  }
}

export function getPublicAssetDataUrl(assetPath: string) {
  const cacheKey = assetPath.replace(/^\/+/, "");
  const cached = publicAssetDataUrlCache.get(cacheKey);
  if (cached) return cached;

  const next = loadPublicAssetDataUrl(cacheKey);
  publicAssetDataUrlCache.set(cacheKey, next);
  return next;
}

export function getArtilleriaLogoDataUrl() {
  return getPublicAssetDataUrl("assets/logo-artilleria.jpg");
}
