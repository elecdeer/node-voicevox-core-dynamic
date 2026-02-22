/**
 * ONNX Runtime関連API
 */

import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import { promisifyKoffiAsync } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type {
  LoadOnnxruntimeOptions,
  OnnxruntimeHandle,
  OutJsonStringHandle,
} from "../types/index.js";
import { VoicevoxError } from "../errors/voicevox-error.js";
import koffi from "koffi";

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
  const defaultOptions = functions.voicevox_make_default_load_onnxruntime_options();

  const loadOptions = {
    filename: options?.filename ?? defaultOptions.filename,
  };

  const outOnnxruntime: [OnnxruntimeHandle | null] = [null];
  const resultCode = await promisifyKoffiAsync(
    functions.voicevox_onnxruntime_load_once,
    loadOptions,
    outOnnxruntime,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = outOnnxruntime[0];
  if (handle == null) {
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

  if (onnxruntime == null) {
    return null;
  }

  return onnxruntime as OnnxruntimeHandle;
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
  const outJson: [OutJsonStringHandle | null] = [null];
  const resultCode = functions.voicevox_onnxruntime_create_supported_devices_json(
    onnxruntime,
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

  return jsonStr;
}

/**
 * バージョン情報を取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @returns バージョン文字列
 */
export function getVersion(functions: VoicevoxCoreFunctions): string {
  return functions.voicevox_get_version();
}
