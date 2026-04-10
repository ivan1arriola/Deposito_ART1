import type { NextConfig } from "next";

const parseCsvEnv = (rawValue: string | undefined) =>
  (rawValue ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const allowedDevOrigins = parseCsvEnv(process.env.NEXT_DEV_ALLOWED_ORIGINS);
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? process.env.npm_package_version ?? "dev";

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
