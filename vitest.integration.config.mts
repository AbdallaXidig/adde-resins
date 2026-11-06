import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // "server-only" guards Next.js bundles; the finance tests call the library directly.
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") } },
  test: { include: ["tests/integration/**/*.test.ts"], testTimeout: 30_000, fileParallelism: false },
});
