/**
 * 音声モデル関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { VoiceModelFileHandle } from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { freeJson } from "../utils/memory.js";
import koffi from "koffi";

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
  const outModel: [VoiceModelFileHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_voice_model_file_open,
    path,
    outModel,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode) as string;
    throw new VoicevoxError(resultCode, message);
  }

  const handle = outModel[0];
  if (handle == null) {
    throw new Error("Failed to open voice model file: null handle returned");
  }

  return handle;
}

/**
 * 音声モデルIDを取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param model - 音声モデルファイルハンドル
 * @returns 音声モデルID（16バイトのUUID）
 */
export function getVoiceModelId(
  functions: VoicevoxCoreFunctions,
  model: VoiceModelFileHandle,
): Uint8Array {
  const modelId = new Uint8Array(16);
  functions.voicevox_voice_model_file_id(model, modelId);

  return modelId;
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

  // void*から文字列を取得する
  // lenに-1を指定することで、null終端文字列として自動的に長さを検出
  const jsonStr = koffi.decode(jsonPtr, "char", -1) as string;

  // C側で確保されたメモリを解放
  freeJson(functions.lib, jsonPtr);

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
