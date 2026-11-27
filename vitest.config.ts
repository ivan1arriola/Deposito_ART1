import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/lib/server-only-mock.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["dotenv/config"],
    reporters: ["verbose"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/lib/*.ts"],
      exclude: [
        "node_modules/",
        "tests/",
        "src/generated/**",
        "src/lib/server-only-mock.ts",
        "src/lib/mui-theme.ts",
        "src/lib/design-tokens.ts",
        "src/lib/prisma.ts",
        "src/lib/hojas-entrega-email-job.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["node_modules"],
    testTimeout: 10000,
    hookTimeout: 10000,
    deps: {
      optimizer: {
        web: {
          include: ["vitest/browser"],
        },
      },
    },
  },
});
