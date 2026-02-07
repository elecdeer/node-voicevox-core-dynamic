/**
 * 基本的な使用例
 *
 * 環境変数VOICEVOX_CORE_LIB_PATHを設定してから実行してください。
 * 例: VOICEVOX_CORE_LIB_PATH=./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib pnpm tsx examples/basic.ts
 */

import {
  loadOnnxruntime,
  createOpenJtalk,
  createSynthesizer,
  getVoiceModelMetasJson,
  openVoiceModelFile,
  loadVoiceModel,
  tts,
  deleteSynthesizer,
  deleteOpenJtalk,
  closeVoiceModelFile,
  getVersion,
} from "../src/index.js";
import { loadLibrary } from "../src/ffi/library.js";
import { writeFile } from "node:fs/promises";
import { freeJson } from "../src/utils/memory.js";

async function main() {
  // ライブラリをロード
  const functions = loadLibrary();

  console.log("🎤 VOICEVOX CORE Node.js Binding Example");
  console.log(`📦 Version: ${getVersion(functions)}\n`);

  // 環境変数チェック
  if (!process.env.VOICEVOX_CORE_LIB_PATH) {
    console.error("❌ VOICEVOX_CORE_LIB_PATH environment variable is not set");
    console.error(
      "Example: VOICEVOX_CORE_LIB_PATH=./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib",
    );
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

  // ONNX Runtimeをロード
  const onnxruntime = await loadOnnxruntime(functions, {
    filename: process.env.VOICEVOX_ONNXRUNTIME_LIB_PATH,
  });
  console.log("✅ ONNX Runtime loaded");

  // OpenJTalkを初期化
  const openJtalk = await createOpenJtalk(
    functions,
    "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
  );
  console.log("✅ OpenJTalk initialized");

  // シンセサイザを作成
  const synthesizer = await createSynthesizer(functions, onnxruntime, openJtalk);
  console.log("✅ Synthesizer created");

  // 音声モデルをロード
  console.log("\n📥 Loading voice model...");
  const model = await openVoiceModelFile(functions, "./voicevox/voicevox_core/models/vvms/0.vvm");

  await loadVoiceModel(functions, synthesizer, model);
  console.log("✅ Voice model loaded");

  const meta = getVoiceModelMetasJson(functions, model);
  console.log("🗂️  Voice Model Meta:", JSON.stringify(meta, null, 2));

  // モデルファイルは閉じてOK（内部でコピーされている）
  closeVoiceModelFile(functions, model);

  // 音声合成
  console.log("\n🎵 Synthesizing speech...");
  const text = "こんにちは、VOICEVOXです。";
  const styleId = 0; // スタイルID（モデルによって異なる）

  console.log(`📝 Text: ${text}`);
  console.log(`🎨 Style ID: ${styleId}`);

  const timeStart = performance.now();
  const wav = await tts(functions, synthesizer, text, styleId);
  console.log(`✅ Generated ${wav.length} bytes of WAV data`);

  const timeEnd = performance.now();
  console.log(`⏱️  Synthesis time: ${(timeEnd - timeStart).toFixed(2)} ms`);

  // WAVファイルに保存
  const outputPath = "output.wav";
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

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
