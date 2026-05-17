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
      include: ["src/lib/handlers*.ts"],
      exclude: ["node_modules/", "src/lib/handlers.test/"],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    include: ["**/*.test.ts"],
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
