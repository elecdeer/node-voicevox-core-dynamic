import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["e2e/**/*.e2e.test.ts"],
    // 音声合成は時間がかかるためタイムアウトを延長
    testTimeout: 60000,
    hookTimeout: 30000,
    // 各テストファイルを別プロセスで実行
    isolate: true,
    fileParallelism: false,
    // node:ffiを利用可能にする
    execArgv: ["--experimental-ffi"],
    // レポート出力設定
    reporters: [
      "default", // コンソール出力
      "json", // JSONレポート
      "html", // HTMLレポート
    ],
    outputFile: {
      json: "./output/test-results.json",
      html: "./output/test-results.html",
    },
  },
});
