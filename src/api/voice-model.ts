/**
 * 音声モデル関連API
 */

import { loadLibrary } from "../ffi/library.js";
import { declareFunctions } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { VoiceModelFileHandle } from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import { freeJson } from "../utils/memory.js";
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
 * VVMファイルを開く
 *
 * @param path - VVMファイルのパス
 * @returns 音声モデルファイルハンドル
 * @throws {VoicevoxError} ファイルを開けなかった場合
 */
export function openVoiceModelFile(path: string): VoiceModelFileHandle {
  const functions = getFunctions();

  const outModel = [null];
  const resultCode = functions.voicevox_voice_model_file_open(path, outModel) as number;

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode) as string;
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const handle = outModel[0];
  if (handle == null) {
    throw new Error("Failed to open voice model file: null handle returned");
  }

  return handle as VoiceModelFileHandle;
}

/**
 * 音声モデルIDを取得
 *
 * @param model - 音声モデルファイルハンドル
 * @returns 音声モデルID（16バイトのUUID）
 */
export function getVoiceModelId(model: VoiceModelFileHandle): Uint8Array {
  const functions = getFunctions();

  const modelId = new Uint8Array(16);
  functions.voicevox_voice_model_file_id(model, modelId);

  return modelId;
}

/**
 * 音声モデルのメタ情報JSONを取得
 *
 * @param model - 音声モデルファイルハンドル
 * @returns メタ情報のJSON文字列
 */
export function getVoiceModelMetasJson(model: VoiceModelFileHandle): string {
  const functions = getFunctions();
  const lib = loadLibrary();

  const jsonPtr = functions.voicevox_voice_model_file_create_metas_json(model);
  const jsonStr = koffi.decode(jsonPtr, "string") as string;

  freeJson(lib, jsonPtr);

  return jsonStr;
}

/**
 * 音声モデルファイルを閉じる
 *
 * @param model - 音声モデルファイルハンドル
 */
export function closeVoiceModelFile(model: VoiceModelFileHandle): void {
  const functions = getFunctions();
  functions.voicevox_voice_model_file_delete(model);
}
