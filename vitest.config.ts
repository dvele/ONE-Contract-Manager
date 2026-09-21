import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["server/**/__tests__/**/*.test.ts", "client/src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@shared": new URL("./shared", import.meta.url).pathname },
  },
});
