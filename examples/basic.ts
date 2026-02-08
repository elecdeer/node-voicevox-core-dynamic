/**
 * 基本的な使用例
 *
 * 高レベルAPIを使った基本的な音声合成の例です。
 * `using`宣言により、リソース管理が自動化されます。
 *
 * 使用例:
 * pnpm tsx examples/basic.ts
 */

import { createVoicevoxClient } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 VOICEVOX CORE Node.js Binding Example\n");

  // クライアントを作成（using宣言により自動的にリソース解放される）
  using client = await createVoicevoxClient({
    corePath: "./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib",
    onnxruntimePath:
      "./voicevox/voicevox_core/onnxruntime/lib/libvoicevox_onnxruntime.1.17.3.dylib",
    openJtalkDictDir: "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
  });

  console.log(`📦 Version: ${client.getVersion()}`);
  console.log(`🎮 GPU Mode: ${client.isGpuMode ? "enabled" : "disabled"}\n`);

  // 音声モデルをロード
  console.log("📥 Loading voice model...");
  using modelFile = await client.openModelFile("./voicevox/voicevox_core/models/vvms/0.vvm");
  console.log("🗂️  Voice Model Meta:", JSON.stringify(modelFile.metas, null, 2));

  await client.loadModel(modelFile);
  console.log("✅ Voice model loaded\n");

  // 音声合成
  console.log("🎵 Synthesizing speech...");
  const text = "こんにちは、VOICEVOXです。";
  const styleId = modelFile.metas[0].styles[0].id;

  console.log(`📝 Text: ${text}`);
  console.log(`🎨 Style ID: ${styleId}`);

  const timeStart = performance.now();
  const wav = await client.tts(text, styleId);
  console.log(`✅ Generated ${wav.length} bytes of WAV data`);

  const timeEnd = performance.now();
  console.log(`⏱️  Synthesis time: ${(timeEnd - timeStart).toFixed(2)} ms`);

  // WAVファイルに保存
  const outputPath = "output.wav";
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
  // usingブロックを抜けると自動的にリソースが解放される
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
