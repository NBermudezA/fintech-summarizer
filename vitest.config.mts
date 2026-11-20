import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // Vendored by the shadcn / AI Elements CLIs — upstream code, not ours.
        "src/components/ui/**",
        "src/components/ai-elements/**",
      ],
      reporter: ["text", "html", "lcov", "json-summary"],
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 95 },
    },
  },
});
