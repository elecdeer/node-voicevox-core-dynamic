/**
 * シンセサイザ関連API
 */

import { loadLibrary } from "../ffi/library.js";
import { declareFunctions } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
	OnnxruntimeHandle,
	OpenJtalkHandle,
	SynthesizerHandle,
	VoiceModelFileHandle,
	InitializeOptions,
	SynthesisOptions,
	TtsOptions,
	AudioQuery,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { freeJson, freeWav } from "../utils/memory.js";
import koffi from "koffi";

let cachedFunctions: ReturnType<typeof declareFunctions> | null = null;

/**
 * FFI関数を取得（キャッシュ）
 */
function getFunctions() {
	if (!cachedFunctions) {
		const lib = loadLibrary();
		cachedFunctions = declareFunctions(lib);
	}
	return cachedFunctions;
}

/**
 * シンセサイザを構築する
 *
 * @param onnxruntime - ONNX Runtimeハンドル
 * @param openJtalk - OpenJTalkハンドル
 * @param options - 初期化オプション
 * @returns シンセサイザハンドル
 * @throws {VoicevoxError} 構築に失敗した場合
 */
export function createSynthesizer(
	onnxruntime: OnnxruntimeHandle,
	openJtalk: OpenJtalkHandle,
	options?: InitializeOptions,
): SynthesizerHandle {
	const functions = getFunctions();

	const defaultOptions =
		functions.voicevox_make_default_initialize_options() as {
			acceleration_mode: number;
			cpu_num_threads: number;
		};

	const initOptions = {
		acceleration_mode: options?.accelerationMode ?? defaultOptions.acceleration_mode,
		cpu_num_threads: options?.cpuNumThreads ?? defaultOptions.cpu_num_threads,
	};

	const outSynthesizer = [null];
	const resultCode = functions.voicevox_synthesizer_new(
		onnxruntime,
		openJtalk,
		initOptions,
		outSynthesizer,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}

	const handle = outSynthesizer[0];
	if (handle == null) {
		throw new Error("Failed to create synthesizer: null handle returned");
	}

	return handle as SynthesizerHandle;
}

/**
 * シンセサイザを破棄する
 *
 * @param synthesizer - シンセサイザハンドル
 */
export function deleteSynthesizer(synthesizer: SynthesizerHandle): void {
	const functions = getFunctions();
	functions.voicevox_synthesizer_delete(synthesizer);
}

/**
 * 音声モデルをロードする
 *
 * @param synthesizer - シンセサイザハンドル
 * @param model - 音声モデルファイルハンドル
 * @throws {VoicevoxError} ロードに失敗した場合
 */
export function loadVoiceModel(
	synthesizer: SynthesizerHandle,
	model: VoiceModelFileHandle,
): void {
	const functions = getFunctions();

	const resultCode = functions.voicevox_synthesizer_load_voice_model(
		synthesizer,
		model,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}
}

/**
 * 音声モデルをアンロードする
 *
 * @param synthesizer - シンセサイザハンドル
 * @param modelId - 音声モデルID（16バイトのUUID）
 * @throws {VoicevoxError} アンロードに失敗した場合
 */
export function unloadVoiceModel(
	synthesizer: SynthesizerHandle,
	modelId: Uint8Array,
): void {
	const functions = getFunctions();

	const resultCode = functions.voicevox_synthesizer_unload_voice_model(
		synthesizer,
		modelId,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}
}

/**
 * GPUモードかどうかを判定
 *
 * @param synthesizer - シンセサイザハンドル
 * @returns GPUモードの場合true
 */
export function isGpuMode(synthesizer: SynthesizerHandle): boolean {
	const functions = getFunctions();
	return functions.voicevox_synthesizer_is_gpu_mode(synthesizer) as boolean;
}

/**
 * 指定した音声モデルがロードされているか判定
 *
 * @param synthesizer - シンセサイザハンドル
 * @param modelId - 音声モデルID（16バイトのUUID）
 * @returns ロードされている場合true
 */
export function isLoadedVoiceModel(
	synthesizer: SynthesizerHandle,
	modelId: Uint8Array,
): boolean {
	const functions = getFunctions();
	return functions.voicevox_synthesizer_is_loaded_voice_model(
		synthesizer,
		modelId,
	) as boolean;
}

/**
 * ロード中のモデルのメタ情報JSONを取得
 *
 * @param synthesizer - シンセサイザハンドル
 * @returns メタ情報のJSON文字列
 */
export function getSynthesizerMetasJson(synthesizer: SynthesizerHandle): string {
	const functions = getFunctions();
	const lib = loadLibrary();

	const jsonPtr = functions.voicevox_synthesizer_create_metas_json(synthesizer);
	const jsonStr = koffi.decode(jsonPtr, "string") as string;

	freeJson(lib, jsonPtr);

	return jsonStr;
}

/**
 * 日本語テキストからAudioQueryを生成
 *
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @returns AudioQuery
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export function createAudioQuery(
	synthesizer: SynthesizerHandle,
	text: string,
	styleId: number,
): AudioQuery {
	const functions = getFunctions();
	const lib = loadLibrary();

	const outJson = [null];
	const resultCode = functions.voicevox_synthesizer_create_audio_query(
		synthesizer,
		text,
		styleId,
		outJson,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}

	const jsonPtr = outJson[0];
	const jsonStr = koffi.decode(jsonPtr, "string") as string;

	freeJson(lib, jsonPtr);

	return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * AudioQueryから音声合成
 *
 * @param synthesizer - シンセサイザハンドル
 * @param audioQuery - AudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns WAVデータ
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export function synthesis(
	synthesizer: SynthesizerHandle,
	audioQuery: AudioQuery,
	styleId: number,
	options?: SynthesisOptions,
): Uint8Array {
	const functions = getFunctions();
	const lib = loadLibrary();

	const defaultOptions =
		functions.voicevox_make_default_synthesis_options() as {
			enable_interrogative_upspeak: boolean;
		};

	const synthesisOptions = {
		enable_interrogative_upspeak:
			options?.enableInterrogativeUpspeak ??
			defaultOptions.enable_interrogative_upspeak,
	};

	const audioQueryJson = JSON.stringify(audioQuery);
	const outLength = [0];
	const outWav = [null];

	const resultCode = functions.voicevox_synthesizer_synthesis(
		synthesizer,
		audioQueryJson,
		styleId,
		synthesisOptions,
		outLength,
		outWav,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}

	const wavPtr = outWav[0];
	const length = outLength[0] as number;

	// WAVデータをUint8Arrayにコピー
	const wavData = new Uint8Array(length);
	const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length)) as Uint8Array;
	wavData.set(srcBuffer);

	freeWav(lib, wavPtr);

	return wavData;
}

/**
 * テキストから直接音声合成 (TTS)
 *
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @param options - TTSオプション
 * @returns WAVデータ
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export function tts(
	synthesizer: SynthesizerHandle,
	text: string,
	styleId: number,
	options?: TtsOptions,
): Uint8Array {
	const functions = getFunctions();
	const lib = loadLibrary();

	const defaultOptions = functions.voicevox_make_default_tts_options() as {
		enable_interrogative_upspeak: boolean;
	};

	const ttsOptions = {
		enable_interrogative_upspeak:
			options?.enableInterrogativeUpspeak ??
			defaultOptions.enable_interrogative_upspeak,
	};

	const outLength = [0];
	const outWav = [null];

	const resultCode = functions.voicevox_synthesizer_tts(
		synthesizer,
		text,
		styleId,
		ttsOptions,
		outLength,
		outWav,
	) as number;

	if (resultCode !== VoicevoxResultCode.Ok) {
		const message = functions.voicevox_error_result_to_message(
			resultCode,
		) as string;
		throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
	}

	const wavPtr = outWav[0];
	const length = outLength[0] as number;

	// WAVデータをUint8Arrayにコピー
	const wavData = new Uint8Array(length);
	const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length)) as Uint8Array;
	wavData.set(srcBuffer);

	freeWav(lib, wavPtr);

	return wavData;
}
