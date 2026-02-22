import { VoicevoxError } from "../errors/voicevox-error.js";
import { promisifyKoffiAsync, type VoicevoxCoreFunctions } from "../ffi/functions.js";
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
} /**
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
