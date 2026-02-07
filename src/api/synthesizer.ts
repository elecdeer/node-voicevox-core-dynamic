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
  InitializeOptions,
  SynthesisOptions,
  TtsOptions,
  AudioQuery,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { freeJson, freeWav } from "../utils/memory.js";
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

  const outSynthesizer: [any] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_new,
    onnxruntime,
    openJtalk,
    initOptions,
    outSynthesizer,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
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
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }
}

/**
 * 音声モデルをアンロードする
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param modelId - 音声モデルID（16バイトのUUID）
 * @throws {VoicevoxError} アンロードに失敗した場合
 */
export function unloadVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  modelId: Uint8Array,
): void {
  const resultCode = functions.voicevox_synthesizer_unload_voice_model(synthesizer, modelId);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
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
 * @param modelId - 音声モデルID（16バイトのUUID）
 * @returns ロードされている場合true
 */
export function isLoadedVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  modelId: Uint8Array,
): boolean {
  return functions.voicevox_synthesizer_is_loaded_voice_model(synthesizer, modelId);
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

  freeJson(functions.lib, jsonPtr);

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
  const outJson: [any] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_synthesizer_create_audio_query,
    synthesizer,
    text,
    styleId,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const jsonPtr = outJson[0];

  // void*から文字列を取得する
  // lenに-1を指定することで、null終端文字列として自動的に長さを検出
  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;

  freeJson(functions.lib, jsonPtr);

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
  const outWav: [any] = [null];

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
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const wavPtr = outWav[0];
  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  freeWav(functions.lib, wavPtr);

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
  const outWav: [any] = [null];

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
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const wavPtr = outWav[0];
  const length = outLength[0];

  // WAVデータをUint8Arrayにコピー
  const wavData = new Uint8Array(length);
  const srcBuffer = koffi.decode(wavPtr, koffi.array("uint8", length));
  wavData.set(srcBuffer);

  freeWav(functions.lib, wavPtr);

  return wavData;
}
