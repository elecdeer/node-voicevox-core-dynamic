import { VoicevoxError } from "../errors/voicevox-error.js";
import type { VoicevoxCoreFunctions } from "../ffi/functions.js";
import {
  allocOutPointer,
  readOutPointer,
  packInitializeOptions,
  unpackInitializeOptions,
  NULL_POINTER,
} from "../ffi/native.js";
import { VoicevoxResultCode } from "../types/enums.js";
import type { OnnxruntimeHandle, OpenJtalkHandle, SynthesizerHandle } from "../types/handles.js";
import type { InitializeOptions } from "../types/options.js";

/**
 * バージョン情報を取得
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @returns バージョン文字列
 */

export function getVersion(functions: VoicevoxCoreFunctions): string {
  return functions.voicevox_get_version();
} /**
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
  const defaultOptions = unpackInitializeOptions(
    functions.voicevox_make_default_initialize_options(),
  );

  const packedOptions = packInitializeOptions(
    options?.accelerationMode ?? defaultOptions.accelerationMode,
    options?.cpuNumThreads ?? defaultOptions.cpuNumThreads,
  );

  const outSynthesizer = allocOutPointer();
  const resultCode = await functions.voicevox_synthesizer_new.async(
    onnxruntime,
    openJtalk,
    packedOptions,
    outSynthesizer,
  );

  if (resultCode !== VoicevoxResultCode.Ok) {
    const message = functions.voicevox_error_result_to_message(resultCode);
    throw new VoicevoxError(resultCode, message);
  }

  const handle = readOutPointer(outSynthesizer);
  if (handle === NULL_POINTER) {
    throw new Error("Failed to create synthesizer: null handle returned");
  }

  return handle as SynthesizerHandle;
} /**
 * シンセサイザを破棄する
 *
 * C APIは実行中の呼び出しの完了は待つが、Workerのキューで待機中の非同期呼び出し
 * （`.async`）は考慮しない。破棄後にそれらが実行されるとプロセスが異常終了するため、
 * このシンセサイザを使う非同期呼び出しがすべて完了してから呼ぶこと。
 *
 * @param functions - VOICEVOX CORE FFI関数
 * @param synthesizer - シンセサイザハンドル
 */

export function deleteSynthesizer(
  functions: VoicevoxCoreFunctions,
  synthesizer: SynthesizerHandle,
): void {
  functions.voicevox_synthesizer_delete(synthesizer);
} /**
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
