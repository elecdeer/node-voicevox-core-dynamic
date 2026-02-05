/**
 * ONNX Runtime関連API
 */

import { loadLibrary } from "../ffi/library.js";
import { declareFunctions } from "../ffi/functions.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { LoadOnnxruntimeOptions, OnnxruntimeHandle } from "../types/index.js";
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
 * ONNX Runtimeをロードして初期化する
 *
 * 一度成功したら以後は同じハンドルを返す（シングルトン）
 *
 * @param options - ロードオプション
 * @returns ONNX Runtimeハンドル
 * @throws {VoicevoxError} ロードに失敗した場合
 */
export function loadOnnxruntime(options?: LoadOnnxruntimeOptions): OnnxruntimeHandle {
  const functions = getFunctions();

  const defaultOptions = functions.voicevox_make_default_load_onnxruntime_options() as {
    filename: string;
  };

  const loadOptions = {
    filename: options?.filename ?? defaultOptions.filename,
  };

  const outOnnxruntime = [null];
  const resultCode = functions.voicevox_onnxruntime_load_once(
    loadOptions,
    outOnnxruntime,
  ) as number;

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode) as string;
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
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
 * @returns ONNX Runtimeハンドル、またはnull
 */
export function getOnnxruntime(): OnnxruntimeHandle | null {
  const functions = getFunctions();
  const onnxruntime = functions.voicevox_onnxruntime_get();

  if (onnxruntime == null) {
    return null;
  }

  return onnxruntime as OnnxruntimeHandle;
}

/**
 * サポートされているデバイス情報をJSONで取得
 *
 * @param onnxruntime - ONNX Runtimeハンドル
 * @returns デバイス情報のJSON文字列
 * @throws {VoicevoxError} 情報取得に失敗した場合
 */
export function getOnnxruntimeSupportedDevicesJson(onnxruntime: OnnxruntimeHandle): string {
  const functions = getFunctions();
  const lib = loadLibrary();

  const outJson = [null];
  const resultCode = functions.voicevox_onnxruntime_create_supported_devices_json(
    onnxruntime,
    outJson,
  ) as number;

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode) as string;
    throw new VoicevoxError(resultCode as VoicevoxResultCode, message);
  }

  const jsonPtr = outJson[0];
  const jsonStr = koffi.decode(jsonPtr, "string") as string;

  freeJson(lib, jsonPtr);

  return jsonStr;
}

/**
 * バージョン情報を取得
 *
 * @returns バージョン文字列
 */
export function getVersion(): string {
  const functions = getFunctions();
  return functions.voicevox_get_version() as string;
}
