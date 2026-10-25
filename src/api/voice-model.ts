/**
 * 音声モデル関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { allocOutPointer, readOutPointer, readCString, NULL_POINTER } from "../ffi/native.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  LoadVoiceModelOptions,
  SynthesizerHandle,
  VoiceModelFileHandle,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { uuidBytesToString, uuidStringToBytes } from "../utils/uuid.js";

/**
 * VVMファイルを開く
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param path - VVMファイルのパス
 * @returns Promise<音声モデルファイルハンドル>
 * @throws {VoicevoxError} ファイルを開けなかった場合
 */
export async function openVoiceModelFile(
  functions: VoicevoxCoreFunctions,
  path: string,
): Promise<VoiceModelFileHandle> {
  const outModel = allocOutPointer();
  const resultCode = await functions.voicevox_voice_model_file_open.async(path, outModel);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = readOutPointer(outModel);
  if (handle === NULL_POINTER) {
    throw new Error("Failed to open voice model file: null handle returned");
  }

  return handle as VoiceModelFileHandle;
}

/**
 * 音声モデルをロードする
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 * @param model - 音声モデルファイルハンドル
 * @param options - ロードオプション
 * @returns Promise<void>
 * @throws {VoicevoxError} ロードに失敗した場合
 */
export async function loadVoiceModel(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
  model: VoiceModelFileHandle,
  options?: LoadVoiceModelOptions,
): Promise<void> {
  const onExisting =
    options?.onExisting ?? functions.voicevox_make_default_load_voice_model_options();

  const resultCode = await functions.voicevox_synthesizer_load_voice_model.async(
    synthesizer,
    model,
    onExisting,
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
 * 音声モデルIDを取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param model - 音声モデルファイルハンドル
 * @returns 音声モデルID（UUID文字列）
 */
export function getVoiceModelId(
  functions: VoicevoxCoreFunctions,
  model: VoiceModelFileHandle,
): string {
  const modelId = new Uint8Array(16);
  functions.voicevox_voice_model_file_id(model, modelId);

  return uuidBytesToString(modelId);
}

/**
 * 音声モデルのメタ情報JSONを取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param model - 音声モデルファイルハンドル
 * @returns メタ情報のJSON文字列
 */
export function getVoiceModelMetasJson(
  functions: VoicevoxCoreFunctions,
  model: VoiceModelFileHandle,
): string {
  const jsonPtr = functions.voicevox_voice_model_file_create_metas_json(model);

  const jsonStr = readCString(jsonPtr);

  // C側で確保されたメモリを解放
  functions.voicevox_string_free(jsonPtr);

  return jsonStr;
}

/**
 * 音声モデルファイルを閉じる
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param model - 音声モデルファイルハンドル
 */
export function closeVoiceModelFile(
  functions: VoicevoxCoreFunctions,
  model: VoiceModelFileHandle,
): void {
  functions.voicevox_voice_model_file_delete(model);
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

  const jsonStr = readCString(jsonPtr);

  functions.voicevox_string_free(jsonPtr);

  return jsonStr;
}
