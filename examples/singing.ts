/**
 * 歌唱音声合成の使用例
 *
 * 高レベルAPIを使った歌唱音声合成の例です。
 * v0.16.4以降で追加された歌唱音声合成機能を使用します。
 *
 * 使用例:
 * pnpm tsx examples/singing.ts
 */

import { createVoicevoxClient } from "../src/index.js";
import type { Score } from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
  console.log("🎤 VOICEVOX Singing Voice Synthesis Example\n");

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
  console.log("✅ Voice model loaded\n");

  // 歌唱対応スタイルを探す
  const singStyle = loadedSpeakers
    .flatMap((speaker) => speaker.styles)
    .find((style) => style.type === "sing");

  if (!singStyle) {
    console.error("❌ No singing style found. Please load a model with singing capability.");
    console.log("\n利用可能なスタイル:");
    loadedSpeakers.forEach((speaker) => {
      console.log(`  ${speaker.name}:`);
      speaker.styles.forEach((style) => {
        console.log(`    - ${style.name} (type: ${style.type}, id: ${style.id})`);
      });
    });
    return;
  }

  console.log(`🎨 Using singing style: ${singStyle.name} (ID: ${singStyle.id})\n`);

  // 楽譜を作成（ドレミファソラシド）
  const score: Score = {
    notes: [
      { key: 60, frame_length: 15, lyric: "ド" }, // C4
      { key: 62, frame_length: 15, lyric: "レ" }, // D4
      { key: 64, frame_length: 15, lyric: "ミ" }, // E4
      { key: 65, frame_length: 15, lyric: "フ" }, // F4
      { key: 67, frame_length: 15, lyric: "ァ" }, // G4
      { key: 69, frame_length: 15, lyric: "ラ" }, // A4
      { key: 71, frame_length: 15, lyric: "シ" }, // B4
      { key: 72, frame_length: 15, lyric: "ド" }, // C5
    ],
  };

  console.log("🎵 Score:");
  console.log("  Notes:");
  score.notes.forEach((note, i) => {
    const midiNote = note.key !== null ? `MIDI ${note.key}` : "Rest";
    console.log(`    ${i + 1}. ${note.lyric} (${midiNote}, ${note.frame_length} frames)`);
  });
  console.log();

  // 方法1: sing()便利メソッドを使用
  console.log("🎵 Method 1: Using sing() convenience method...");
  const timeStart1 = performance.now();
  const wav1 = await client.sing(score, singStyle.id);
  const timeEnd1 = performance.now();

  console.log(`✅ Generated ${wav1.length} bytes of WAV data`);
  console.log(`⏱️  Synthesis time: ${(timeEnd1 - timeStart1).toFixed(2)} ms`);

  const outputPath1 = `${process.env.OUTPUT_DIR}/singing-simple.wav`;
  await writeFile(outputPath1, wav1);
  console.log(`💾 Saved to ${outputPath1}\n`);

  // 方法2: createSingFrameAudioQuery()とframeSynthesize()を個別に使用
  console.log("🎵 Method 2: Using createSingFrameAudioQuery() + frameSynthesize()...");

  const timeStart2 = performance.now();

  // FrameAudioQueryを生成
  console.log("  📝 Creating FrameAudioQuery...");
  const frameAudioQuery = await client.createSingFrameAudioQuery(score, singStyle.id);
  console.log(`  ✅ FrameAudioQuery created:`);
  console.log(`     - F0 frames: ${frameAudioQuery.f0.length}`);
  console.log(`     - Volume frames: ${frameAudioQuery.volume.length}`);
  console.log(`     - Phonemes: ${frameAudioQuery.phonemes.length}`);
  console.log(
    `     - Phoneme details: ${frameAudioQuery.phonemes.map((p) => `${p.phoneme}(${p.frame_length})`).join(", ")}`,
  );

  // 必要に応じてFrameAudioQueryを編集可能
  // 例: frameAudioQuery.volumeScale = 1.5;

  // 音声合成
  console.log("  🎵 Synthesizing...");
  const wav2 = await client.frameSynthesize(frameAudioQuery, singStyle.id);
  const timeEnd2 = performance.now();

  console.log(`✅ Generated ${wav2.length} bytes of WAV data`);
  console.log(`⏱️  Total time: ${(timeEnd2 - timeStart2).toFixed(2)} ms`);

  const outputPath2 = `${process.env.OUTPUT_DIR}/singing-detailed.wav`;
  await writeFile(outputPath2, wav2);
  console.log(`💾 Saved to ${outputPath2}\n`);

  // 方法3: 休符を含む楽譜
  console.log("🎵 Method 3: Score with rests...");

  const scoreWithRest: Score = {
    notes: [
      { key: 60, frame_length: 15, lyric: "ド" }, // C4
      { key: 62, frame_length: 15, lyric: "レ" }, // D4
      { key: null, frame_length: 10, lyric: "" }, // 休符
      { key: 64, frame_length: 15, lyric: "ミ" }, // E4
      { key: 65, frame_length: 15, lyric: "フ" }, // F4
      { key: null, frame_length: 10, lyric: "" }, // 休符
      { key: 67, frame_length: 15, lyric: "ァ" }, // G4
    ],
  };

  const timeStart3 = performance.now();
  const wav3 = await client.sing(scoreWithRest, singStyle.id);
  const timeEnd3 = performance.now();

  console.log(`✅ Generated ${wav3.length} bytes of WAV data`);
  console.log(`⏱️  Synthesis time: ${(timeEnd3 - timeStart3).toFixed(2)} ms`);

  const outputPath3 = `${process.env.OUTPUT_DIR}/singing-with-rests.wav`;
  await writeFile(outputPath3, wav3);
  console.log(`💾 Saved to ${outputPath3}\n`);

  console.log("✅ All singing voice synthesis examples completed!");
  // usingブロックを抜けると自動的にリソースが解放される
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
