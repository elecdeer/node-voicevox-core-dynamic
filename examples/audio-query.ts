/**
 * AudioQueryを使った音声合成の例
 *
 * AudioQueryを生成してパラメータを調整してから音声合成を行います。
 */

import {
	loadOnnxruntime,
	createOpenJtalk,
	createSynthesizer,
	openVoiceModelFile,
	loadVoiceModel,
	createAudioQuery,
	synthesis,
	deleteSynthesizer,
	deleteOpenJtalk,
	closeVoiceModelFile,
} from "../src/index.js";
import { writeFile } from "node:fs/promises";

async function main() {
	console.log("🎤 AudioQuery Example\n");

	// 環境変数チェック
	if (!process.env.VOICEVOX_CORE_LIB_PATH) {
		console.error("❌ VOICEVOX_CORE_LIB_PATH environment variable is not set");
		process.exit(1);
	}

	// 初期化
	console.log("⚙️  Initializing...");
	const onnxruntime = loadOnnxruntime();
	const openJtalk = createOpenJtalk("./voicevox/voicevox_core/dict");
	const synthesizer = createSynthesizer(onnxruntime, openJtalk);

	// 音声モデルをロード
	const model = openVoiceModelFile(
		"./voicevox/voicevox_core/models/0.vvm",
	);
	loadVoiceModel(synthesizer, model);
	closeVoiceModelFile(model);
	console.log("✅ Initialized\n");

	// AudioQueryを生成
	console.log("📝 Creating AudioQuery...");
	const text = "今日はいい天気ですね。";
	const styleId = 0;

	const audioQuery = createAudioQuery(synthesizer, text, styleId);
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
	const wav = synthesis(synthesizer, audioQuery, styleId, {
		enableInterrogativeUpspeak: true,
	});
	console.log(`✅ Generated ${wav.length} bytes of WAV data`);

	// 保存
	const outputPath = "output_audio_query.wav";
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
