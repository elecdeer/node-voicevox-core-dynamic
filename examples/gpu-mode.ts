/**
 * GPUモードを使った音声合成の例
 *
 * GPUモードを有効にして音声合成を行います。
 * GPUが利用できない環境では自動的にCPUモードにフォールバックします。
 */

import {
  loadOnnxruntime,
  createOpenJtalk,
  createSynthesizer,
  openVoiceModelFile,
  loadVoiceModel,
  tts,
  isGpuMode,
  getOnnxruntimeSupportedDevicesJson,
  deleteSynthesizer,
  deleteOpenJtalk,
  closeVoiceModelFile,
  VoicevoxAccelerationMode,
} from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 GPU Mode Example\n");

  // 環境変数チェック
  if (!process.env.VOICEVOX_CORE_LIB_PATH) {
    console.error("❌ VOICEVOX_CORE_LIB_PATH environment variable is not set");
    process.exit(1);
  }

  if (!process.env.VOICEVOX_ONNXRUNTIME_LIB_PATH) {
    console.error("❌ VOICEVOX_ONNXRUNTIME_LIB_PATH environment variable is not set");
    process.exit(1);
  }

  console.log(`🛠️  Using VOICEVOX_CORE_LIB_PATH: ${process.env.VOICEVOX_CORE_LIB_PATH}`);
  console.log(
    `🛠️  Using VOICEVOX_ONNXRUNTIME_LIB_PATH: ${process.env.VOICEVOX_ONNXRUNTIME_LIB_PATH}\n`,
  );

  // 初期化
  console.log("⚙️  Initializing...");
  const onnxruntime = loadOnnxruntime({
    filename: process.env.VOICEVOX_ONNXRUNTIME_LIB_PATH,
  });

  // サポートされているデバイス情報を確認
  console.log("\n📊 Checking supported devices...");
  const devicesJson = getOnnxruntimeSupportedDevicesJson(onnxruntime);
  const devices = JSON.parse(devicesJson);
  console.log("Supported devices:", JSON.stringify(devices, null, 2));

  const openJtalk = createOpenJtalk("./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11");

  // GPUモードで初期化を試みる
  console.log("\n🎮 Attempting to create synthesizer with GPU mode...");
  const synthesizer = createSynthesizer(onnxruntime, openJtalk, {
    accelerationMode: VoicevoxAccelerationMode.Gpu,
    cpuNumThreads: 0, // auto
  });

  // GPUモードが有効かチェック
  const gpuEnabled = isGpuMode(synthesizer);
  if (gpuEnabled) {
    console.log("✅ GPU mode is enabled");
  } else {
    console.log("⚠️  GPU mode is not available, using CPU mode");
  }

  // 音声モデルをロード
  console.log("\n📥 Loading voice model...");
  const model = openVoiceModelFile("./voicevox/voicevox_core/models/vvms/0.vvm");
  loadVoiceModel(synthesizer, model);
  closeVoiceModelFile(model);
  console.log("✅ Voice model loaded");

  // 音声合成
  console.log("\n🎵 Synthesizing speech...");
  const text = "GPUモードで音声合成をしています。";
  const styleId = 0;

  const startTime = performance.now();
  const wav = tts(synthesizer, text, styleId);
  const endTime = performance.now();

  console.log(`✅ Generated ${wav.length} bytes of WAV data`);
  console.log(`⏱️  Synthesis time: ${(endTime - startTime).toFixed(2)}ms`);

  // 保存
  const outputPath = gpuEnabled ? "output_gpu.wav" : "output_cpu.wav";
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  // クリーンアップ
  deleteSynthesizer(synthesizer);
  deleteOpenJtalk(openJtalk);
  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
