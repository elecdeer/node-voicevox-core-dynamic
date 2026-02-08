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

  // クライアントを作成
   await using client = await createVoicevoxClient({
    corePath: "./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib",
    onnxruntimePath: "./voicevox/voicevox_core/c_api/lib/libonnxruntime.1.13.1.dylib",
    openJtalkDictDir: "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
  });
  console.log("✅ Initialized\n");

  // モデル1をロード
  console.log("📥 Loading model 1...");
   await using model1 = await client.openModelFile("./voicevox/voicevox_core/models/vvms/0.vvm");
  console.log(`📋 Model 1 ID: ${Buffer.from(model1.id).toString("hex")}`);
  console.log(`📋 Model 1 Meta:`, model1.metas);

  await client.loadModel(model1);
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
  await writeFile("output_model1.wav", wav1);
  console.log(`💾 Saved to output_model1.wav`);

  // 複数モデルを同時にロードすることも可能
  console.log("\n📥 Loading model 2...");
   await using model2 = await client.openModelFile("./voicevox/voicevox_core/models/vvms/1.vvm");
  await client.loadModel(model2);
  console.log("✅ Model 2 loaded");

  // 両方のモデルがロードされていることを確認
  const loadedSpeakers2 = client.getLoadedSpeakers();
  console.log(`\n📊 Now ${loadedSpeakers2.length} speakers are loaded`);

  // モデル2で音声合成
  console.log("\n🎵 Synthesizing with model 2...");
  const text2 = "これはモデル2の音声です。";
  const styleId2 = model2.metas[0].styles[0].id;
  const wav2 = await client.tts(text2, styleId2);
  await writeFile("output_model2.wav", wav2);
  console.log(`💾 Saved to output_model2.wav`);

  console.log("\n✅ Done!");
  // usingブロックを抜けると、モデルファイルとクライアントが自動的に解放される
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
