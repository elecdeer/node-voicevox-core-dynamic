/**
 * ストリーミング音声合成の例
 *
 * 音声を少しずつ生成し、生成できた部分からファイルに書き出します。
 * 最初のチャンクが届くまでの時間と、全体の合成時間を比較できます。
 *
 * 新形式（vvm_format_version=2）のVVMが必要です。
 *
 * 使用例:
 * NODE_OPTIONS="--experimental-ffi" pnpm tsx --env-file=.env examples/streaming.ts
 */

import { createWriteStream } from "node:fs";
import { once } from "node:events";
import { createVoicevoxClient, VOICEVOX_FRAME_RATE } from "../src/index.js";

async function main() {
  const corePath = process.env.VOICEVOX_CORE_C_API_PATH;
  const onnxruntimePath = process.env.VOICEVOX_ONNXRUNTIME_PATH;
  const openJtalkDictDir = process.env.VOICEVOX_OPEN_JTALK_DICT_DIR;
  const modelsPath = process.env.VOICEVOX_MODELS_PATH;
  const outputDir = process.env.OUTPUT_DIR;
  if (
    corePath == null ||
    onnxruntimePath == null ||
    openJtalkDictDir == null ||
    modelsPath == null ||
    outputDir == null
  ) {
    throw new Error(
      "Please set VOICEVOX_CORE_C_API_PATH, VOICEVOX_ONNXRUNTIME_PATH, VOICEVOX_OPEN_JTALK_DICT_DIR, VOICEVOX_MODELS_PATH, and OUTPUT_DIR environment variables.",
    );
  }

  using client = await createVoicevoxClient({ corePath, onnxruntimePath, openJtalkDictDir });
  await client.loadVoiceModelFromPath(`${modelsPath}/0.vvm`);
  const styleId = client.getLoadedSpeakers()[0].styles[0].id;

  const text =
    "ストリーミング音声合成では、音声を少しずつ生成できます。長い文章でも、すぐに再生を始められます。";
  const audioQuery = await client.createAudioQuery(text, styleId);

  // AudioQueryから音声の長さを見積もる
  const frameLength = client.getAudioQueryFrameLength(audioQuery);
  console.log(
    `📏 ${frameLength} frames (${(frameLength / VOICEVOX_FRAME_RATE).toFixed(2)} s of audio)`,
  );

  const outputPath = `${outputDir}/streaming.wav`;
  const output = createWriteStream(outputPath);

  const timeStart = performance.now();
  let index = 0;
  // 1つ目はWAVヘッダ、以降は16bit PCM。順に書き出すとWAVファイルになる
  for await (const chunk of client.streamingSynthesis(audioQuery, styleId)) {
    const elapsed = (performance.now() - timeStart).toFixed(2);
    console.log(`🧩 chunk #${index} (${chunk.byteLength} bytes) at ${elapsed} ms`);
    if (!output.write(chunk)) {
      await once(output, "drain");
    }
    index++;
  }
  output.end();
  await once(output, "finish");

  console.log(`⏱️  Total: ${(performance.now() - timeStart).toFixed(2)} ms`);
  console.log(`💾 Saved to ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
