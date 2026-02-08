/**
 * 複数の音声モデルを扱う例
 *
 * 複数のVVMファイルをロードして音声合成を行います。
 * 高レベルAPIを使用し、リソース管理は自動化されます。
 */

import { createVoicevoxClient } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 Multiple Models Example\n");

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

  // クライアントを作成
  using client = await createVoicevoxClient({
    corePath: process.env.VOICEVOX_CORE_C_API_PATH!,
    onnxruntimePath: process.env.VOICEVOX_ONNXRUNTIME_PATH!,
    openJtalkDictDir: process.env.VOICEVOX_OPEN_JTALK_DICT_DIR!,
  });
  console.log("✅ Initialized\n");

  // モデル1をロード
  console.log("📥 Loading model 1...");
  using model1 = await client.openModelFile(`${process.env.VOICEVOX_MODELS_PATH}/0.vvm`);
  console.log(`📋 Model 1 ID: ${Buffer.from(model1.id).toString("hex")}`);
  console.log(`📋 Model 1 Meta:`, model1.metas);

  await client.loadVoiceModel(model1);
  console.log("✅ Model 1 loaded");

  // ロード済みモデルの確認
  console.log("\n📊 Checking loaded models...");
  const loadedSpeakers = client.getLoadedSpeakers();
  console.log("📋 Loaded speakers:", loadedSpeakers);

  // モデル1で音声合成
  console.log("\n🎵 Synthesizing with model 1...");
  const text1 = "これはモデル1の音声です。";
  const styleId1 = model1.metas[0].styles[0].id;
  const wav1 = await client.tts(text1, styleId1);
  await writeFile(`${process.env.OUTPUT_DIR}/output_model1.wav`, wav1);
  console.log(`💾 Saved to ${process.env.OUTPUT_DIR}/output_model1.wav`);

  // 複数モデルを同時にロードすることも可能
  console.log("\n📥 Loading model 2...");
  using model2 = await client.openModelFile(`${process.env.VOICEVOX_MODELS_PATH}/1.vvm`);
  await client.loadVoiceModel(model2);
  console.log("✅ Model 2 loaded");

  // 両方のモデルがロードされていることを確認
  const loadedSpeakers2 = client.getLoadedSpeakers();
  console.log(`\n📊 Now ${loadedSpeakers2.length} speakers are loaded`);

  // モデル2で音声合成
  console.log("\n🎵 Synthesizing with model 2...");
  const text2 = "これはモデル2の音声です。";
  const styleId2 = model2.metas[0].styles[0].id;
  const wav2 = await client.tts(text2, styleId2);
  await writeFile(`${process.env.OUTPUT_DIR}/output_model2.wav`, wav2);
  console.log(`💾 Saved to ${process.env.OUTPUT_DIR}/output_model2.wav`);

  console.log("\n✅ Done!");
  // usingブロックを抜けると、モデルファイルとクライアントが自動的に解放される
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
