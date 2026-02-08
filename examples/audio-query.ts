/**
 * AudioQueryを使った音声合成の例
 *
 * AudioQueryを生成してパラメータを調整してから音声合成を行います。
 * 高レベルAPIを使用し、リソース管理は自動化されます。
 */

import { createVoicevoxClient } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 AudioQuery Example\n");

  // クライアントを作成
   await using client = await createVoicevoxClient({
    corePath: "./voicevox/voicevox_core/c_api/lib/libvoicevox_core.dylib",
    onnxruntimePath: "./voicevox/voicevox_core/c_api/lib/libonnxruntime.1.13.1.dylib",
    openJtalkDictDir: "./voicevox/voicevox_core/dict/open_jtalk_dic_utf_8-1.11",
  });

  // 音声モデルをロード
   await using modelFile = await client.openModelFile(
    "./voicevox/voicevox_core/models/vvms/0.vvm",
  );
  await client.loadModel(modelFile);
  console.log("✅ Initialized\n");

  // AudioQueryを生成
  console.log("📝 Creating AudioQuery...");
  const text = "今日はいい天気ですね。";
  const styleId = modelFile.metas[0].styles[0].id;

  const audioQuery = await client.createAudioQuery(text, styleId);
  console.log("✅ AudioQuery created");
  console.log(`📊 Original parameters:`);
  console.log(`   - Speed: ${audioQuery.speedScale}`);
  console.log(`   - Pitch: ${audioQuery.pitchScale}`);
  console.log(`   - Intonation: ${audioQuery.intonationScale}`);
  console.log(`   - Volume: ${audioQuery.volumeScale}`);

  // パラメータを調整
  console.log("\n🎛️  Adjusting parameters...");
  audioQuery.speedScale = 1.2; // 速く
  audioQuery.pitchScale = 1.1; // 高く
  audioQuery.intonationScale = 1.3; // 抑揚を大きく
  audioQuery.volumeScale = 1.0;

  console.log(`📊 Adjusted parameters:`);
  console.log(`   - Speed: ${audioQuery.speedScale} (faster)`);
  console.log(`   - Pitch: ${audioQuery.pitchScale} (higher)`);
  console.log(`   - Intonation: ${audioQuery.intonationScale} (more expressive)`);
  console.log(`   - Volume: ${audioQuery.volumeScale}`);

  // 音声合成
  console.log("\n🎵 Synthesizing speech...");
  const wav = await client.synthesize(audioQuery, styleId, {
    enableInterrogativeUpspeak: true,
  });
  console.log(`✅ Generated ${wav.length} bytes of WAV data`);

  // 保存
  const outputPath = "output_audio_query.wav";
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
