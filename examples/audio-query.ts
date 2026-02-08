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

  // 音声モデルをロード
  using modelFile = await client.openModelFile(`${process.env.VOICEVOX_MODELS_PATH}/0.vvm`);
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
  const outputPath = `${process.env.OUTPUT_DIR}/audio_query.wav`;
  await writeFile(outputPath, wav);
  console.log(`💾 Saved to ${outputPath}`);

  console.log("\n✅ Done!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
