/**
 * すべての音声モデルをロードする例
 *
 * VOICEVOX_MODELS_PATHディレクトリ内のすべての.vvmファイルを検出して
 * 一括でロードします。メモリ消費量も表示します。
 *
 * 使用例:
 * pnpm run tsx examples/load-all-models.ts
 */

import { createVoicevoxClient } from "../src/index.js";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * メモリ使用量を人間が読みやすい形式で表示します。
 */
function formatMemoryUsage() {
  const usage = process.memoryUsage();
  const formatBytes = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return {
    rss: formatBytes(usage.rss), // 全メモリ使用量
    heapTotal: formatBytes(usage.heapTotal), // ヒープ全体のサイズ
    heapUsed: formatBytes(usage.heapUsed), // 使用中のヒープ
    external: formatBytes(usage.external), // C++オブジェクトのメモリ
  };
}

/**
 * メモリ使用量をログ出力します。
 */
function logMemoryUsage(label: string) {
  const memory = formatMemoryUsage();
  console.log(`\n📊 メモリ使用量 (${label}):`);
  console.log(`   RSS (総メモリ): ${memory.rss}`);
  console.log(`   ヒープ合計: ${memory.heapTotal}`);
  console.log(`   ヒープ使用中: ${memory.heapUsed}`);
  console.log(`   外部メモリ: ${memory.external}`);
}

async function main() {
  console.log("🎤 すべてのモデルをロードする例\n");

  console.log({
    VOICEVOX_CORE_C_API_PATH: process.env.VOICEVOX_CORE_C_API_PATH,
    VOICEVOX_ONNXRUNTIME_PATH: process.env.VOICEVOX_ONNXRUNTIME_PATH,
    VOICEVOX_OPEN_JTALK_DICT_DIR: process.env.VOICEVOX_OPEN_JTALK_DICT_DIR,
    VOICEVOX_MODELS_PATH: process.env.VOICEVOX_MODELS_PATH,
  });

  if (
    process.env.VOICEVOX_CORE_C_API_PATH == null ||
    process.env.VOICEVOX_ONNXRUNTIME_PATH == null ||
    process.env.VOICEVOX_OPEN_JTALK_DICT_DIR == null ||
    process.env.VOICEVOX_MODELS_PATH == null
  ) {
    throw new Error(
      "Please set VOICEVOX_CORE_C_API_PATH, VOICEVOX_ONNXRUNTIME_PATH, VOICEVOX_OPEN_JTALK_DICT_DIR, and VOICEVOX_MODELS_PATH environment variables.",
    );
  }

  // 初期メモリ使用量
  logMemoryUsage("初期状態");

  // クライアントを作成
  using client = await createVoicevoxClient({
    corePath: process.env.VOICEVOX_CORE_C_API_PATH!,
    onnxruntimePath: process.env.VOICEVOX_ONNXRUNTIME_PATH!,
    openJtalkDictDir: process.env.VOICEVOX_OPEN_JTALK_DICT_DIR!,
  });

  console.log(`\n📦 Version: ${client.getVersion()}`);
  console.log(`🎮 GPU Mode: ${client.isGpuMode ? "enabled" : "disabled"}`);

  logMemoryUsage("クライアント作成後");

  // モデルディレクトリ内のすべての.vvmファイルを検索
  console.log("\n🔍 モデルファイルを検索中...");
  const modelsPath = process.env.VOICEVOX_MODELS_PATH!;
  const files = await readdir(modelsPath);
  const vvmFiles = files.filter((file) => file.endsWith(".vvm")).sort();

  console.log(`📁 ${vvmFiles.length}個のモデルファイルを発見:`);
  vvmFiles.forEach((file) => console.log(`   - ${file}`));

  if (vvmFiles.length === 0) {
    console.log("⚠️  モデルファイルが見つかりませんでした");
    return;
  }

  // ステップ1: すべてのモデルファイルのメタ情報を取得
  console.log("\n📂 すべてのモデルファイルのメタ情報を取得中...");

  const timeStart = performance.now();
  const speakerMetas = await client.peekModelFilesMeta(modelsPath);
  const timeEnd = performance.now();

  console.log(`\n✅ ${speakerMetas.length}個のスピーカーメタ情報を取得しました`);
  console.log(`⏱️  取得時間: ${(timeEnd - timeStart).toFixed(2)} ms`);

  for (const meta of speakerMetas) {
    console.log(`\n📋 Speaker: ${meta.name}`);
    console.log(`   📁 Model File: ${meta.modelFilePath}`);
    console.log(`   📋 Model ID: ${meta.modelId}`);
    console.log(`   🎨 Styles: ${meta.styles.length}個`);
  }

  logMemoryUsage("メタ情報取得後");

  // ステップ2: すべてのモデルをロード
  console.log("\n📥 すべてのモデルをメモリにロード中...");

  const modelPaths = vvmFiles.map((file) => join(modelsPath, file));
  for (const modelPath of modelPaths) {
    const fileName = modelPath.split("/").pop()!;
    console.log(`\n📦 Loading: ${fileName}`);

    try {
      logMemoryUsage(`${fileName} load前`);

      const timeStart = performance.now();
      await client.loadVoiceModelFromPath(modelPath);
      const timeEnd = performance.now();

      console.log(`   ✅ ロード完了 (${(timeEnd - timeStart).toFixed(2)} ms)`);

      logMemoryUsage(`${fileName} load後`);
    } catch (error) {
      console.error(`   ❌ エラー: ${error}`);
    }
  }

  // 最終的にロードされたスピーカーの確認
  console.log("\n📊 ロード結果:");
  const loadedSpeakers = client.getLoadedSpeakers();
  console.log(`✅ ${loadedSpeakers.length}個のスピーカーがロードされました`);

  loadedSpeakers.forEach((speaker) => {
    console.log(`   - ${speaker.name} (${speaker.styles.length} styles)`);
  });

  // 最終メモリ使用量
  logMemoryUsage("全モデルロード後");

  // ガベージコレクションを実行して正確なメモリ使用量を確認
  if (global.gc) {
    console.log("\n🧹 ガベージコレクション実行中...");
    global.gc();
    logMemoryUsage("GC実行後");
  } else {
    console.log("\n💡 ヒント: --expose-gc フラグを使用するとGC後のメモリ使用量も確認できます");
    console.log("   例: node --expose-gc node_modules/.bin/tsx examples/load-all-models.ts");
  }

  console.log("\n✅ 完了!");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
