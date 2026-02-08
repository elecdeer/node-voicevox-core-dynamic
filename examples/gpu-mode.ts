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

  // GPUモードでクライアントを作成
  console.log("🎮 Attempting to create client with GPU mode...");
   await using client = await createVoicevoxClient({
    corePath: "./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib",
    onnxruntimePath: "./voicevox/voicevox_core/c_api/lib/libonnxruntime.1.13.1.dylib",
    openJtalkDictDir: "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
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
   await using modelFile = await client.openModelFile(
    "./voicevox/voicevox_core/models/vvms/0.vvm",
  );
  await client.loadModel(modelFile);
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
  const outputPath = gpuEnabled ? "output_gpu.wav" : "output_cpu.wav";
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
