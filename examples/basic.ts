/**
 * 基本的な使用例
 *
 * 高レベルAPIを使った基本的な音声合成の例です。
 * `using`宣言により、リソース管理が自動化されます。
 *
 * 使用例:
 * NODE_OPTIONS="--experimental-ffi" pnpm tsx examples/basic.ts
 */

import { createVoicevoxClient } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 VOICEVOX CORE Node.js Binding Example\n");

  console.log({
    VOICEVOX_CORE_C_API_PATH: process.env.VOICEVOX_CORE_C_API_PATH,
    VOICEVOX_ONNXRUNTIME_PATH: process.env.VOICEVOX_ONNXRUNTIME_PATH,
    VOICEVOX_OPEN_JTALK_DICT_DIR: process.env.VOICEVOX_OPEN_JTALK_DICT_DIR,
    VOICEVOX_MODELS_PATH: process.env.VOICEVOX_MODELS_PATH,
    OUTPUT_DIR: process.env.OUTPUT_DIR,
  });

  if (
    process.env.VOICEVOX_CORE_C_API_PATH == null ||
    process.env.VOICEVOX_ONNXRUNTIME_PATH == null ||
    process.env.VOICEVOX_OPEN_JTALK_DICT_DIR == null ||
    process.env.VOICEVOX_MODELS_PATH == null ||
    process.env.OUTPUT_DIR == null
  ) {
    throw new Error(
      "Please set VOICEVOX_CORE_C_API_PATH, VOICEVOX_ONNXRUNTIME_PATH, VOICEVOX_OPEN_JTALK_DICT_DIR, VOICEVOX_MODELS_PATH, and OUTPUT_DIR environment variables.",
    );
  }

  // クライアントを作成（using宣言により自動的にリソース解放される）
  using client = await createVoicevoxClient({
    corePath: process.env.VOICEVOX_CORE_C_API_PATH!,
    onnxruntimePath: process.env.VOICEVOX_ONNXRUNTIME_PATH!,
    openJtalkDictDir: process.env.VOICEVOX_OPEN_JTALK_DICT_DIR!,
  });

  console.log(`📦 Version: ${client.getVersion()}`);
  console.log(`🎮 GPU Mode: ${client.isGpuMode ? "enabled" : "disabled"}\n`);

  // 音声モデルをロード
  console.log("📥 Loading voice model...");
  await client.loadVoiceModelFromPath(`${process.env.VOICEVOX_MODELS_PATH}/0.vvm`);

  const loadedSpeakers = client.getLoadedSpeakers();
  console.log("🗂️  Voice Model Meta:", JSON.stringify(loadedSpeakers, null, 2));
  console.log("✅ Voice model loaded\n");

  // 音声合成
  console.log("🎵 Synthesizing speech...");
  const text = "こんにちは、VOICEVOXです。";
  const styleId = loadedSpeakers[0].styles[0].id;

  console.log(`📝 Text: ${text}`);
  console.log(`🎨 Style ID: ${styleId}`);

  const timeStart = performance.now();
  const wav = await client.tts(text, styleId);
  console.log(`✅ Generated ${wav.length} bytes of WAV data`);

  const timeEnd = performance.now();
  console.log(`⏱️  Synthesis time: ${(timeEnd - timeStart).toFixed(2)} ms`);

  // WAVファイルに保存
  const outputPath = `${process.env.OUTPUT_DIR}/basic.wav`;
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
