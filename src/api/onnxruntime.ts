/**
 * ONNX Runtime関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { allocOutPointer, readOutPointer, readCString, NULL_POINTER } from "../ffi/native.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  LoadOnnxruntimeOptions,
  OnnxruntimeHandle,
  OutJsonStringHandle,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";

/**
 * ONNX Runtimeをロードして初期化する
 *
 * 一度成功したら以後は同じハンドルを返す（シングルトン）
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param options - ロードオプション
 * @returns Promise<ONNX Runtimeハンドル>
 * @throws {VoicevoxError} ロードに失敗した場合
 */
export async function loadOnnxruntime(
  functions: VoicevoxCoreFunctions,
  options?: LoadOnnxruntimeOptions,
): Promise<OnnxruntimeHandle> {
  const filename = options?.filename ?? functions.voicevox_make_default_load_onnxruntime_options();

  const outOnnxruntime = allocOutPointer();
  const resultCode = await functions.voicevox_onnxruntime_load_once.async(filename, outOnnxruntime);

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = readOutPointer(outOnnxruntime);
  if (handle === NULL_POINTER) {
    throw new Error("Failed to load ONNX Runtime: null handle returned");
  }

  return handle as OnnxruntimeHandle;
}

/**
 * 既にロード済みのONNX Runtimeを取得
 *
 * ロードされていない場合はnullを返す
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @returns ONNX Runtimeハンドル、またはnull
 */
export function getOnnxruntime(functions: VoicevoxCoreFunctions): OnnxruntimeHandle | null {
  const onnxruntime = functions.voicevox_onnxruntime_get();

  if (onnxruntime === NULL_POINTER) {
    return null;
  }

  return onnxruntime;
}

/**
 * サポートされているデバイス情報をJSONで取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param onnxruntime - ONNX Runtimeハンドル
 * @returns デバイス情報のJSON文字列
 * @throws {VoicevoxError} 情報取得に失敗した場合
 */
export function getOnnxruntimeSupportedDevicesJson(
  functions: VoicevoxCoreFunctions,
  onnxruntime: OnnxruntimeHandle,
): string {
  const outJson = allocOutPointer();
  const resultCode = functions.voicevox_onnxruntime_create_supported_devices_json(
    onnxruntime,
    outJson,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const jsonPtr = readOutPointer(outJson) as OutJsonStringHandle;
  if (jsonPtr === NULL_POINTER) {
    throw new Error("Failed to create JSON: null pointer returned");
  }

  const jsonStr = readCString(jsonPtr);
  functions.voicevox_string_free(jsonPtr);

  return jsonStr;
}
