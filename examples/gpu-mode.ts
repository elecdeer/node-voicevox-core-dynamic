/**
 * GPUモードを使った音声合成の例
 *
 * GPUモードを有効にして音声合成を行います。
 * GPUが利用できない環境では自動的にCPUモードにフォールバックします。
 * 高レベルAPIを使用し、リソース管理は自動化されます。
 */

import { createVoicevoxClient, VoicevoxAccelerationMode } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 GPU Mode Example\n");

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
    initializeOptions: {
      accelerationMode: VoicevoxAccelerationMode.Gpu,
      cpuNumThreads: 0, // auto
    },
  });

  // GPUモードが有効かチェック
  const gpuEnabled = client.isGpuMode;
  if (gpuEnabled) {
    console.log("✅ GPU mode is enabled");
  } else {
    console.log("⚠️  GPU mode is not available, using CPU mode");
  }

  // 音声モデルをロード
  console.log("\n📥 Loading voice model...");
  using modelFile = await client.openModelFile(`${process.env.VOICEVOX_MODELS_PATH}/0.vvm`);
  await client.loadVoiceModel(modelFile);
  console.log("✅ Voice model loaded");

  // 音声合成
  console.log("\n🎵 Synthesizing speech...");
  const text = "GPUモードで音声合成をしています。";
  const styleId = modelFile.metas[0].styles[0].id;

  const startTime = performance.now();
  const wav = await client.tts(text, styleId);
  const endTime = performance.now();

  console.log(`✅ Generated ${wav.length} bytes of WAV data`);
  console.log(`⏱️  Synthesis time: ${(endTime - startTime).toFixed(2)}ms`);

  // 保存
  const outputPath = gpuEnabled
    ? `${process.env.OUTPUT_DIR}/output_gpu.wav`
    : `${process.env.OUTPUT_DIR}/output_cpu.wav`;
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
