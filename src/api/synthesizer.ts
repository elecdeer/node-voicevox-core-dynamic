/**
 * シンセサイザ関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  OnnxruntimeHandle,
  OpenJtalkHandle,
  SynthesizerHandle,
  VoiceModelFileHandle,
  OutJsonStringHandle,
  OutWavDataHandle,
  InitializeOptions,
  SynthesisOptions,
  TtsOptions,
  AudioQuery,
  Score,
  FrameAudioQuery,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { uuidStringToBytes } from "../utils/uuid.js";
import koffi from "koffi";

/**
 * シンセサイザを構築する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param onnxruntime - ONNX Runtimeハンドル
 * @param openJtalk - OpenJTalkハンドル
 * @param options - 初期化オプション
 * @returns Promise<シンセサイザハンドル>
 * @throws {VoicevoxError} 構築に失敗した場合
 */
export async function createSynthesizer(
  functions: VoicevoxCoreFunctions,
  onnxruntime: OnnxruntimeHandle,
  openJtalk: OpenJtalkHandle,
  options?: InitializeOptions,
): Promise<SynthesizerHandle> {
  const defaultOptions = functions.voicevox_make_default_initialize_options();

  const initOptions = {
    acceleration_mode: options?.accelerationMode ?? defaultOptions.acceleration_mode,
    cpu_num_threads: options?.cpuNumThreads ?? defaultOptions.cpu_num_threads,
  };

  const outSynthesizer: [SynthesizerHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_new,
    onnxruntime,
    openJtalk,
    initOptions,
    outSynthesizer,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = outSynthesizer[0];
  if (handle == null) {
    throw new Error("Failed to create synthesizer: null handle returned");
  }

  return handle;
}

/**
 * シンセサイザを破棄する
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 */
export function deleteSynthesizer(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
): void {
  functions.voicevox_synthesizer_delete(synthesizer);
}

/**
 * 音声モデルをロードする
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param model - 音声モデルファイルハンドル
 * @returns Promise<void>
 * @throws {VoicevoxError} ロードに失敗した場合
 */
export async function loadVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  model: VoiceModelFileHandle,
): Promise<void> {
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_load_voice_model,
    synthesizer,
    model,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * 音声モデルをアンロードする
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param modelId - 音声モデルID（UUID文字列）
 * @throws {VoicevoxError} アンロードに失敗した場合
 */
export function unloadVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  modelId: string,
): void {
  const modelIdBytes = uuidStringToBytes(modelId);
  const resultCode = functions.voicevox_synthesizer_unload_voice_model(synthesizer, modelIdBytes);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }
}

/**
 * GPUモードかどうかを判定
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @returns GPUモードの場合true
 */
export function isGpuMode(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
): boolean {
  return functions.voicevox_synthesizer_is_gpu_mode(synthesizer);
}

/**
 * 指定した音声モデルがロードされているか判定
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param modelId - 音声モデルID（UUID文字列）
 * @returns ロードされている場合true
 */
export function isLoadedVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  modelId: string,
): boolean {
  const modelIdBytes = uuidStringToBytes(modelId);
  return functions.voicevox_synthesizer_is_loaded_voice_model(synthesizer, modelIdBytes);
}

/**
 * ロード中のモデルのメタ情報JSONを取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @returns メタ情報のJSON文字列
 */
export function getSynthesizerMetasJson(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
): string {
  const jsonPtr = functions.voicevox_synthesizer_create_metas_json(synthesizer);

  // void*から文字列を取得する
  // lenに-1を指定することで、null終端文字列として自動的に長さを検出
  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;

  functions.voicevox_json_free(jsonPtr);

  return jsonStr;
}

/**
 * 日本語テキストからAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAudioQuery(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
): Promise<AudioQuery> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_audio_query,
    synthesizer,
    text,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  // void*から文字列を取得する
  // lenに-1を指定することで、null終端文字列として自動的に長さを検出
  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;

  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * カナ（AquesTalk風記法）からAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAudioQueryFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
): Promise<AudioQuery> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_audio_query_from_kana,
    synthesizer,
    kana,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * テキストからアクセント句を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAccentPhrases(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_accent_phrases,
    synthesizer,
    text,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * カナ（AquesTalk風記法）からアクセント句を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @returns Promise<AccentPhrase[]>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAccentPhrasesFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
): Promise<AudioQuery["accent_phrases"]> {
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_accent_phrases_from_kana,
    synthesizer,
    kana,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery["accent_phrases"];
}

/**
 * アクセント句からAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param accentPhrases - アクセント句の配列
 * @returns Promise<AudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 */
export async function createAudioQueryFromAccentPhrases(
  functions: VoicevoxCoreFunctions,
  accentPhrases: AudioQuery["accent_phrases"],
): Promise<AudioQuery> {
  const accentPhrasesJson = JSON.stringify(accentPhrases);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_audio_query_create_from_accent_phrases,
    accentPhrasesJson,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as AudioQuery;
}

/**
 * AudioQueryから音声合成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param audioQuery - AudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function synthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  audioQuery: AudioQuery,
  styleId: number,
  options?: SynthesisOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_synthesis_options();

  const synthesisOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const audioQueryJson = JSON.stringify(audioQuery);
  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_synthesis,
    synthesizer,
    audioQueryJson,
    styleId,
    synthesisOptions,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = outWav[0];
  if (wavPtr == null) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  functions.voicevox_wav_free(wavPtr);

  return wavData;
}

/**
 * テキストから直接音声合成 (TTS)
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param text - 日本語テキスト
 * @param styleId - スタイルID
 * @param options - TTSオプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function tts(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  text: string,
  styleId: number,
  options?: TtsOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_tts_options();

  const ttsOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_tts,
    synthesizer,
    text,
    styleId,
    ttsOptions,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = outWav[0];
  if (wavPtr == null) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  functions.voicevox_wav_free(wavPtr);

  return wavData;
}

/**
 * カナ（AquesTalk風記法）から直接音声合成 (TTS)
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param kana - AquesTalk風記法のカナ
 * @param styleId - スタイルID
 * @param options - TTSオプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 */
export async function ttsFromKana(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  kana: string,
  styleId: number,
  options?: TtsOptions,
): Promise<Uint8Array> {
  const defaultOptions = functions.voicevox_make_default_tts_options();

  const ttsOptions = {
    enable_interrogative_upspeak:
      options?.enableInterrogativeUpspeak ?? defaultOptions.enable_interrogative_upspeak,
  };

  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_tts_from_kana,
    synthesizer,
    kana,
    styleId,
    ttsOptions,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = outWav[0];
  if (wavPtr == null) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  functions.voicevox_wav_free(wavPtr);

  return wavData;
}

/**
 * 楽譜からFrameAudioQueryを生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param styleId - スタイルID
 * @returns Promise<FrameAudioQuery>
 * @throws {VoicevoxError} 生成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameAudioQuery(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  styleId: number,
): Promise<FrameAudioQuery> {
  if (!functions.voicevox_synthesizer_create_sing_frame_audio_query) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_audio_query is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_audio_query,
    synthesizer,
    scoreJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as FrameAudioQuery;
}

/**
 * フレームごとの基本周波数を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @returns Promise<number[]> フレームごとの基本周波数
 * @throws {VoicevoxError} 生成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameF0(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  if (!functions.voicevox_synthesizer_create_sing_frame_f0) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_f0 is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_f0,
    synthesizer,
    scoreJson,
    frameAudioQueryJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as number[];
}

/**
 * フレームごとの音量を生成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param score - 楽譜
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @returns Promise<number[]> フレームごとの音量
 * @throws {VoicevoxError} 生成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function createSingFrameVolume(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  score: Score,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<number[]> {
  if (!functions.voicevox_synthesizer_create_sing_frame_volume) {
    throw new Error(
      "voicevox_synthesizer_create_sing_frame_volume is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const scoreJson = JSON.stringify(score);
  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_sing_frame_volume,
    synthesizer,
    scoreJson,
    frameAudioQueryJson,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = outJson[0];
  if (jsonPtr == null) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;
  functions.voicevox_json_free(jsonPtr);

  return JSON.parse(jsonStr) as number[];
}

/**
 * FrameAudioQueryから歌唱音声を合成
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param frameAudioQuery - FrameAudioQuery
 * @param styleId - スタイルID
 * @param options - 合成オプション
 * @returns Promise<WAVデータ>
 * @throws {VoicevoxError} 合成に失敗した場合
 * @throws {Error} 関数が利用できない場合（v0.16.4未満）
 */
export async function frameSynthesis(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  frameAudioQuery: FrameAudioQuery,
  styleId: number,
): Promise<Uint8Array> {
  if (!functions.voicevox_synthesizer_frame_synthesis) {
    throw new Error(
      "voicevox_synthesizer_frame_synthesis is not available. This function requires voicevox_core v0.16.4 or later.",
    );
  }

  const frameAudioQueryJson = JSON.stringify(frameAudioQuery);
  const outLength: [number] = [0];
  const outWav: [OutWavDataHandle | null] = [null];

  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_frame_synthesis,
    synthesizer,
    frameAudioQueryJson,
    styleId,
    outLength,
    outWav,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const wavPtr = outWav[0];
  if (wavPtr == null) {
    throw new Error("Failed to synthesize: null pointer returned");
  }

  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  functions.voicevox_wav_free(wavPtr);

  return wavData;
}
