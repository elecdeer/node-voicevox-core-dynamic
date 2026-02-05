/**
 * 複数の音声モデルを扱う例
 *
 * 複数のVVMファイルをロード・アンロードしながら音声合成を行います。
 */

import {
  loadOnnxruntime,
  createOpenJtalk,
  createSynthesizer,
  openVoiceModelFile,
  loadVoiceModel,
  unloadVoiceModel,
  isLoadedVoiceModel,
  getVoiceModelId,
  getVoiceModelMetasJson,
  getSynthesizerMetasJson,
  tts,
  deleteSynthesizer,
  deleteOpenJtalk,
  closeVoiceModelFile,
} from "../src/index.js";
import { loadLibrary } from "../src/ffi/library.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 Multiple Models Example\n");

  // ライブラリをロード
  const functions = loadLibrary();

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
  const onnxruntime = await loadOnnxruntime(functions, {
    filename: process.env.VOICEVOX_ONNXRUNTIME_LIB_PATH,
  });
  const openJtalk = await createOpenJtalk(
    functions,
    "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
  );
  const synthesizer = await createSynthesizer(functions, onnxruntime, openJtalk);
  console.log("✅ Initialized\n");

  // モデル1をロード
  console.log("📥 Loading model 1...");
  const model1 = await openVoiceModelFile(functions, "./voicevox/voicevox_core/models/vvms/0.vvm");
  const model1Id = getVoiceModelId(functions, model1);
  const model1Meta = getVoiceModelMetasJson(functions, model1);
  console.log(`📋 Model 1 ID: ${Buffer.from(model1Id).toString("hex")}`);
  console.log(`📋 Model 1 Meta:`, JSON.parse(model1Meta));

  await loadVoiceModel(functions, synthesizer, model1);
  closeVoiceModelFile(functions, model1);
  console.log("✅ Model 1 loaded");

  // ロード済みモデルの確認
  console.log("\n📊 Checking loaded models...");
  const isModel1Loaded = isLoadedVoiceModel(functions, synthesizer, model1Id);
  console.log(`Model 1 is loaded: ${isModel1Loaded}`);

  // シンセサイザのメタ情報を確認
  const synthesizerMetas = getSynthesizerMetasJson(functions, synthesizer);
  console.log("📋 Synthesizer metas:", JSON.parse(synthesizerMetas));

  // モデル1で音声合成
  console.log("\n🎵 Synthesizing with model 1...");
  const text1 = "これはモデル1の音声です。";
  const wav1 = await tts(functions, synthesizer, text1, 0);
  await writeFile("output_model1.wav", wav1);
  console.log(`💾 Saved to output_model1.wav`);

  // モデル1をアンロード
  console.log("\n🗑️  Unloading model 1...");
  unloadVoiceModel(functions, synthesizer, model1Id);
  const isModel1LoadedAfter = isLoadedVoiceModel(functions, synthesizer, model1Id);
  console.log(`Model 1 is loaded: ${isModel1LoadedAfter}`);
  console.log("✅ Model 1 unloaded");

  // 複数モデルを同時にロードすることも可能
  console.log("\n📥 Loading multiple models...");
  const modelA = await openVoiceModelFile(functions, "./voicevox/voicevox_core/models/vvms/0.vvm");
  await loadVoiceModel(functions, synthesizer, modelA);
  closeVoiceModelFile(functions, modelA);
  console.log("✅ Model A loaded");

  // 注: 実際に複数のモデルを使用するには、異なるVVMファイルが必要です
  // この例では同じファイルを使用していますが、実際のユースケースでは
  // 異なるキャラクターやスタイルのモデルをロードします

  // クリーンアップ
  console.log("\n🧹 Cleaning up...");
  deleteSynthesizer(functions, synthesizer);
  deleteOpenJtalk(functions, openJtalk);
  console.log("✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
