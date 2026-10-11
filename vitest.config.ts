import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // node:ffiを利用可能にする
    execArgv: ["--experimental-ffi"],
  },
});
